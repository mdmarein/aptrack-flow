/**
 * link-auditor.js
 * -----------------------------------------------------------
 * Módulo backend puro (Node 18+, sin dependencias npm) para:
 *   1. Rastrear un sitio y extraer sus links internos (<a href>).
 *   2. Testear si un parámetro (ej. gclid) sobrevive los redirects,
 *      y si cada URL redirige o no.
 *
 * Pensado para importarse desde server.js y exponerse vía una ruta
 * HTTP propia (ej. POST /api/audit) que el frontend en public/js
 * consuma con fetch() normal.
 *
 * No usa cheerio/axios/jsdom — el fetch es el global nativo de Node
 * (undici por debajo) y el parseo de <a href="..."> es con regex,
 * suficiente porque solo necesitamos los atributos href, no el DOM.
 *
 * Fallback a curl del sistema: algunos WAFs bloquean por fingerprint
 * TLS (JA3) del stack OpenSSL que usa el fetch nativo de Node, aunque
 * los headers sean idénticos a los de un navegador real — mientras que
 * `curl` (que en macOS usa SecureTransport, el motor TLS del SO) pasa
 * sin problema. Cuando fetch nativo da un status típico de bloqueo
 * (403/406/429/451/503) o falla la conexión, se reintenta shelleando
 * al `curl` del sistema vía `child_process` — sigue sin ser una
 * dependencia npm. Esto no resuelve sitios que redirigen por
 * JavaScript (ej. `location.replace()`), porque ningún cliente HTTP
 * plano ejecuta JS — para eso haría falta un navegador headless.
 */

'use strict';

const { execFile } = require('child_process');

// ----------------------- CONFIG POR DEFECTO -----------------------

const DEFAULTS = {
  maxUrls: 30,
  timeoutMs: 8000,
  delayEntreRequestsMs: 300,
  // Deliberadamente NO impersona un navegador (nada de "Mozilla/5.0
  // ...Chrome..."). Varios WAFs (Imunify360, ModSecurity, etc.) bloquean
  // justamente el patrón "dice ser un browser pero no tiene el fingerprint
  // TLS/JS de uno" — un bot que se declara honestamente como tal suele
  // pasar sin problema, y es además la práctica ética esperada.
  userAgent: 'TrackFlowAuditor/1.0 (+tracking-param-audit-bot)',
  extensionesExcluidas: [
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.zip',
    '.css', '.js', '.webp', '.mp4', '.ico', '.woff', '.woff2',
  ],
  dominiosRedesSociales: [
    'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
    'linkedin.com', 'tiktok.com', 'youtube.com', 'wa.me', 'whatsapp.com',
  ],
};

// ----------------------- UTILIDADES -----------------------

// Extrae todos los valores de href="" o href='' de un bloque de HTML.
// No parsea el DOM completo — solo busca la forma más común del atributo.
// Cubre <a href="...">, no cubre casos exóticos (href armado por JS en
// runtime, que tampoco vería un parser DOM sin ejecutar el JS de la página).
function extraerHrefs(html) {
  const hrefs = [];
  const regex = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1] ?? match[2];
    if (href) hrefs.push(href);
  }
  return hrefs;
}

// Extrae la URL destino de un <meta http-equiv="refresh" content="N;url=...">.
// A diferencia de un redirect por JS (location.replace, etc.), este es un
// mecanismo HTML estándar y declarativo — no hace falta ejecutar JS para
// seguirlo, solo parsear el atributo, igual de válido que extraerHrefs.
function extraerMetaRefresh(html) {
  const regex = /<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["']?\s*\d+\s*;\s*url\s*=\s*['"]?([^'">\s]+)/i;
  const match = regex.exec(html);
  return match ? match[1].trim() : null;
}

function normalizarUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    u.hash = '';
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return null;
  }
}

function mismoDominio(urlStr, dominioBase) {
  try {
    const host = new URL(urlStr).hostname.replace(/^www\./, '');
    return host === dominioBase.replace(/^www\./, '');
  } catch {
    return false;
  }
}

function esRedSocialOArchivo(urlStr, config) {
  let u;
  try {
    u = new URL(urlStr);
  } catch {
    return true;
  }
  if (!['http:', 'https:'].includes(u.protocol)) return true;
  const host = u.hostname.replace(/^www\./, '');
  if (config.dominiosRedesSociales.some((d) => host === d || host.endsWith(`.${d}`))) return true;
  const path = u.pathname.toLowerCase();
  if (config.extensionesExcluidas.some((ext) => path.endsWith(ext))) return true;
  return false;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Compara origin+pathname (ignorando query/hash) entre la URL pedida y la
// final, para saber si hubo redirect real más allá del parámetro que
// nosotros mismos agregamos para el test.
function huboRedirect(urlPedida, urlFinal) {
  try {
    const a = new URL(urlPedida);
    const b = new URL(urlFinal);
    const norm = (u) => u.origin + u.pathname.replace(/\/$/, '');
    return norm(a) !== norm(b);
  } catch {
    return null;
  }
}

// fetch con timeout manual (fetch nativo no tiene timeout propio)
async function fetchConTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// Status típicos de bloqueo de WAF/anti-bot — no errores reales del sitio,
// así que ante estos vale la pena reintentar con otro cliente HTTP antes
// de darlos por perdidos.
const STATUS_BLOQUEO = new Set([403, 406, 429, 451, 503]);

// Ejecuta `curl` del sistema y normaliza su salida al mismo shape que
// necesitamos de una Response de fetch. `-w` con un marcador único al
// final del stdout permite leer status/URL final/content-type sin parsear
// headers de cada hop del redirect (curl -L solo deja en stdout el body
// de la respuesta final, que es justo lo que queremos).
const MARCADOR_CURL = '\u0001__TRACKFLOW_CURL_META__\u0001';

function ejecutarCurl(url, config) {
  return new Promise((resolve, reject) => {
    const args = [
      '-s', '-L', '--compressed',
      '--max-time', String(Math.max(1, Math.ceil(config.timeoutMs / 1000))),
      '--max-redirs', '15',
      '-H', `User-Agent: ${config.userAgent}`,
      '-w', MARCADOR_CURL + '%{http_code}\u0001%{url_effective}\u0001%{content_type}',
      url,
    ];
    execFile(
      'curl',
      args,
      { maxBuffer: 20 * 1024 * 1024, timeout: config.timeoutMs + 5000, encoding: 'buffer', windowsHide: true },
      (err, stdoutBuf, stderrBuf) => {
        if (err) return reject(new Error((stderrBuf && stderrBuf.toString().trim()) || err.message));
        const marcadorBuf = Buffer.from(MARCADOR_CURL, 'utf8');
        const idx = stdoutBuf.lastIndexOf(marcadorBuf);
        if (idx === -1) return reject(new Error('curl: no se pudo interpretar la respuesta'));
        const cuerpo = stdoutBuf.subarray(0, idx);
        const [statusStr, urlEfectiva, contentType] = stdoutBuf
          .subarray(idx + marcadorBuf.length)
          .toString('utf8')
          .split('\u0001');
        const status = Number(statusStr) || 0;
        resolve({
          ok: status >= 200 && status < 400,
          status,
          url: urlEfectiva || url,
          contentType: contentType || '',
          cuerpo,
        });
      }
    );
  });
}

function envolverRespuestaNativa(res) {
  return {
    ok: res.ok,
    status: res.status,
    url: res.url,
    contentType: res.headers.get('content-type') || '',
    viaFallback: false,
    texto: () => res.text(),
    buffer: async () => Buffer.from(await res.arrayBuffer()),
  };
}

// GET con fallback a curl. Primero fetch nativo (rápido, sin overhead de
// proceso); si la respuesta tiene un status de bloqueo típico de WAF, o
// la conexión falla, reintenta con el curl del sistema. Si curl tampoco
// está disponible (o también falla), se queda con el resultado original.
async function httpGet(url, config) {
  let nativo = null;
  let errorNativo = null;
  try {
    nativo = await fetchConTimeout(url, { headers: { 'User-Agent': config.userAgent } }, config.timeoutMs);
  } catch (err) {
    errorNativo = err;
  }

  const pareceBloqueado = nativo && STATUS_BLOQUEO.has(nativo.status);
  if (!errorNativo && !pareceBloqueado) return envolverRespuestaNativa(nativo);

  try {
    const res = await ejecutarCurl(url, config);
    return {
      ok: res.ok,
      status: res.status,
      url: res.url,
      contentType: res.contentType,
      viaFallback: true,
      texto: async () => res.cuerpo.toString('utf8'),
      buffer: async () => res.cuerpo,
    };
  } catch (errCurl) {
    if (errorNativo) throw errorNativo;
    return envolverRespuestaNativa(nativo); // curl no disponible/falló: nos quedamos con la respuesta original
  }
}

// ----------------------- CRAWLER -----------------------

async function obtenerUrlsSitio(urlInicio, config, onProgress) {
  const dominioBase = new URL(urlInicio).hostname.replace(/^www\./, '');
  const visitadas = new Set();
  const porVisitar = [normalizarUrl(urlInicio)];
  const urlsEncontradas = [];

  while (porVisitar.length > 0 && visitadas.size < config.maxUrls) {
    const urlActual = porVisitar.shift();
    if (!urlActual || visitadas.has(urlActual)) continue;

    visitadas.add(urlActual);
    onProgress?.({ tipo: 'crawl', url: urlActual, visitadas: visitadas.size });

    try {
      const res = await httpGet(urlActual, config);
      if (!res.ok) {
        onProgress?.({ tipo: 'error_crawl', url: urlActual, error: `HTTP ${res.status}` });
        continue;
      }
      if (res.viaFallback) onProgress?.({ tipo: 'fallback_curl', url: urlActual });

      urlsEncontradas.push(urlActual);

      const contentType = res.contentType || '';
      if (!contentType.includes('text/html')) continue;

      const html = await res.texto();
      const hrefs = extraerHrefs(html);
      const metaTarget = extraerMetaRefresh(html);
      const candidatos = metaTarget ? [...hrefs, metaTarget] : hrefs;

      for (const href of candidatos) {
        let urlCompleta;
        try {
          urlCompleta = new URL(href, urlActual).toString();
        } catch {
          continue;
        }

        if (esRedSocialOArchivo(urlCompleta, config)) continue;
        if (!mismoDominio(urlCompleta, dominioBase)) continue;

        const urlLimpia = normalizarUrl(urlCompleta);
        if (urlLimpia && !visitadas.has(urlLimpia) && !porVisitar.includes(urlLimpia)) {
          porVisitar.push(urlLimpia);
        }
      }
    } catch (err) {
      onProgress?.({ tipo: 'error_crawl', url: urlActual, error: err.message });
    }

    await sleep(config.delayEntreRequestsMs);
  }

  return urlsEncontradas;
}

// ----------------------- TEST DE PARÁMETRO -----------------------

const MAX_SALTOS_META_REFRESH = 5;

// httpGet sigue redirects HTTP (301/302/...) automáticamente, pero un
// <meta http-equiv="refresh"> es un redirect a nivel de contenido HTML, no
// de protocolo — fetch/curl no lo siguen solos. Acá se seguye manualmente,
// salto por salto, hasta encontrar una respuesta sin meta-refresh (o hasta
// el límite de saltos, para no entrar en loop con sitios mal configurados).
async function seguirMetaRefresh(urlInicial, config) {
  let urlActual = urlInicial;
  let res;
  for (let i = 0; i <= MAX_SALTOS_META_REFRESH; i++) {
    res = await httpGet(urlActual, config);
    if (!res.ok) return { res, html: null };
    const contentType = res.contentType || '';
    if (!contentType.includes('text/html')) return { res, html: null };

    const html = await res.texto();
    const destino = extraerMetaRefresh(html);
    if (!destino) return { res, html };

    let siguiente;
    try {
      siguiente = new URL(destino, res.url).toString();
    } catch {
      return { res, html };
    }
    if (siguiente === res.url) return { res, html }; // evitar loop infinito (refresh a sí misma)
    urlActual = siguiente;
  }
  return { res, html: null };
}

// Heurística (no 100% infalible) para detectar páginas que reescriben la
// URL con JavaScript después de cargar (típicamente para "limpiar" query
// params de la barra de direcciones). Esto pasa enteramente en el navegador
// del usuario, sin ningún request HTTP adicional — ningún cliente HTTP
// puro (fetch, curl) puede verlo. Cuando se detecta este patrón en una URL
// que el chequeo HTTP marcó como "sobrevive", se avisa igual: el servidor
// entregó el parámetro, pero un navegador real podría perderlo al cargar.
function detectarLimpiezaUrlJs(html) {
  return /history\s*\.\s*(replaceState|pushState)\s*\(/i.test(html);
}

// Estimación de a dónde termina la URL después de que corra ese JS. No
// ejecutamos el script (no hay motor JS acá) — asumimos el comportamiento
// más común de este tipo de código: borrar el query string completo,
// dejando origin+pathname. Es una heurística sobre una heurística: puede
// no coincidir si el sitio hace algo distinto (conservar algún parámetro,
// agregar otro, etc.).
function estimarUrlTrasLimpiezaJs(urlFinal) {
  try {
    const u = new URL(urlFinal);
    u.search = '';
    return u.toString();
  } catch {
    return null;
  }
}

async function probarRedirecciones(urls, parametroTest, config, onProgress) {
  const { nombre, valor } = parametroTest;
  const resultados = [];

  for (const urlStr of urls) {
    let urlConParam;
    try {
      const u = new URL(urlStr);
      u.searchParams.set(nombre, valor);
      urlConParam = u.toString();
    } catch {
      continue;
    }

    try {
      const configTest = { ...config, timeoutMs: config.timeoutMs * 1.5 };
      const { res, html } = await seguirMetaRefresh(urlConParam, configTest);
      const finalUrl = res.url; // ya resuelto post-redirects HTTP y meta-refresh
      const finalParsed = new URL(finalUrl);
      const sobrevive = finalParsed.searchParams.get(nombre)?.toLowerCase() === valor.toLowerCase();
      const redirigida = huboRedirect(urlStr, finalUrl);
      // Solo importa avisar si el chequeo HTTP dice "sobrevive" — si ya está
      // perdido, el aviso de limpieza JS no agrega información nueva.
      const posibleLimpiezaJs = sobrevive && !!html && detectarLimpiezaUrlJs(html);
      const finalEstimadoTrasJs = posibleLimpiezaJs ? estimarUrlTrasLimpiezaJs(finalUrl) : null;

      const resultado = {
        original: urlConParam, final: finalUrl, sobrevive, redirigida,
        status: res.status, viaFallback: res.viaFallback, posibleLimpiezaJs, finalEstimadoTrasJs,
      };
      resultados.push(resultado);
      onProgress?.({ tipo: 'test', ...resultado });
    } catch (err) {
      const resultado = { original: urlConParam, final: null, sobrevive: false, error: err.message };
      resultados.push(resultado);
      onProgress?.({ tipo: 'error_test', ...resultado });
    }

    await sleep(config.delayEntreRequestsMs);
  }

  return resultados;
}

// ----------------------- API PÚBLICA DEL MÓDULO -----------------------

/**
 * Corre auditoría completa: rastrea el sitio (links internos, partiendo
 * de la URL inicial) y testea el parámetro (y si hay redirect) en cada
 * URL encontrada.
 *
 * @param {string} urlInicio
 * @param {{nombre: string, valor: string}} parametroTest
 * @param {object} [opciones] - overrides parciales de DEFAULTS
 * @param {(evento: object) => void} [onProgress] - callback opcional,
 *        útil para stream de progreso hacia el frontend (ej. vía SSE
 *        o WebSocket, coherente con "sin dependencias").
 */
async function auditarSitio(urlInicio, parametroTest, opciones = {}, onProgress) {
  const config = { ...DEFAULTS, ...opciones };

  const urls = await obtenerUrlsSitio(urlInicio, config, onProgress);
  onProgress?.({ tipo: 'fuente', total: urls.length });

  const resultados = await probarRedirecciones(urls, parametroTest, config, onProgress);

  // "Perdido efectivo": no sobrevive a nivel HTTP, O hubo un redirect real,
  // O se detectó limpieza de URL por JS — en los tres casos el parámetro
  // no llega intacto a donde lo necesita el sistema de tracking, aunque el
  // chequeo HTTP puro diga "sobrevive" (caso redirect-que-igual-lo-conserva-
  // pero-cambia-de-página, o limpieza client-side después de cargar).
  const esPerdidoEfectivo = (r) => !r.sobrevive || r.redirigida === true || r.posibleLimpiezaJs === true;
  const perdidos = resultados.filter(esPerdidoEfectivo);
  const redirigidos = resultados.filter((r) => r.redirigida === true);
  const advertencias = resultados.filter((r) => r.posibleLimpiezaJs === true);
  return {
    totalUrls: resultados.length,
    sobreviven: resultados.length - perdidos.length,
    perdidos: perdidos.length,
    redirigidos: redirigidos.length,
    advertencias: advertencias.length,
    resultados,
  };
}

module.exports = { auditarSitio, extraerHrefs, normalizarUrl };
