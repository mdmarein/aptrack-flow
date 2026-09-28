# CLAUDE.md — APTrack Flow

## Identidad

Herramienta local que audita si los parámetros de tracking de campañas
(`gclid`, `utm_*`, `fbclid`, etc.) sobreviven la navegación y los redirects
dentro de un sitio web. Rastreo de links, test de supervivencia del parámetro
y detección de borrado por JavaScript. **Respondé siempre en español con convenciones argentinas (voseo).**

Contexto del ecosistema: [dev/CLAUDE.md](../CLAUDE.md)

---

## Cómo correr

```bash
node server.js          # producción — abre browser automático en http://localhost:3300
node --watch server.js  # dev — hot-reload del server (alias: npm start)
```

- Sin dependencias npm. Node.js v18+ requerido (usa `fetch` global nativo).
- Escucha en `0.0.0.0:3300`. `PORT` configurable por env var.
- El server abre el browser automáticamente al iniciar (excepto en modo `--watch`).

---

## Arquitectura

```
aptrack-flow/
├── server.js              Entry point — HTTP puro + ruta de auditoría
├── lib/
│   └── link-auditor.js    Motor de rastreo y test de parámetro (CommonJS)
├── public/
│   ├── index.html         UI completa (formulario + progreso + resultados)
│   ├── css/styles.css     Design tokens compartidos con DataB Flow
│   ├── img/               Favicons + logo.webp
│   └── js/
│       ├── main.js        Entry point del frontend (ES module)
│       └── modules/
│           └── i18n.js    Diccionario ES/EN
└── tools/
    ├── make-mac-app.sh    Genera APTrack Flow.app (Mac)
    └── make-win-shortcut.bat
```

---

## Backend — server.js

HTTP puro, CommonJS (`require`). Payload máximo: 1 MB.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/audit` | Lanza la auditoría — responde con **streaming NDJSON** (una línea JSON por evento de progreso) |
| `GET` | `/api/health` | Health check: `{ ok: true, ts, port }` |
| `GET` | `/*` | Sirve estáticos desde `public/` — sin fallback a `index.html`, 404 si no existe |

### POST /api/audit — body y eventos

**Body (JSON):**
```json
{
  "url": "https://ejemplo.com",
  "paramNombre": "gclid",
  "paramValor": "test123",
  "maxUrls": 30,
  "delayMs": 300,
  "timeoutMs": 8000
}
```

**Eventos NDJSON emitidos:**
```js
{ tipo: 'rastreando', url }                              // link interno encontrado
{ tipo: 'testeando',  url }                              // empezando a testear esa URL
{ tipo: 'resultado',  url, urlFinal, sobrevive, redirige, limpiezaJs, httpStatus, nota }
{ tipo: 'error',      url, error }                       // error de red en esa URL
{ tipo: 'curl_fallback', url }                           // reintentando con curl
{ tipo: 'final', urlsVisitadas, urlsTesteadas, sobreviven, perdidos, redirigen, warnings }
{ tipo: 'error_fatal', error }                           // fallo crítico no recuperable
```

**Por qué NDJSON sobre `POST` y no `EventSource`:** `EventSource` solo soporta `GET`, lo que impide mandar la config de la auditoría en el body. Se optó por `fetch()` con `ReadableStream` en el cliente.

---

## Motor de auditoría — lib/link-auditor.js

CommonJS puro, sin dependencias npm. Exporta `auditarSitio(url, param, opciones, onEvento)`.

### Flujo

```
URL inicial → extraer links internos (<a href> + <meta http-equiv="refresh">)
    → filtrar (mismo dominio, sin extensiones multimedia, sin redes sociales)
    → por cada URL: agregar parámetro + seguir redirects con fetch nativo
    → detectar si el parámetro sobrevive en response.url (URL final)
    → detectar borrado por JS (heurística: busca history.replaceState/pushState en el HTML)
    → si fetch falla o devuelve 403/406/429/451/503: reintentar con curl del sistema
    → emitir evento por cada paso → resultado final
```

### Decisiones técnicas clave

**Crawling server-side (no client-side):**
El `fetch` a sitios de terceros corre en `server.js`, no en el browser. Un tab del browser no puede hacer `fetch` a un dominio ajeno por CORS (la mayoría de landing pages de campañas no tienen headers permisivos). El frontend solo consume `/api/audit` en `localhost`.

**Regex sobre DOMParser:**
Extrae `<a href>` con regex sobre el HTML crudo — sin árbol DOM, sin cheerio/jsdom. Suficiente para el caso de uso (solo necesitamos los `href`) y mantiene zero deps.

**Seguimiento de `<meta http-equiv="refresh">`:**
A diferencia de `location.replace()` (JS), este es un mecanismo HTML declarativo — se puede parsear con regex igual que los `href`. Se sigue automáticamente.

**User-Agent honesto (no impersona navegador):**
Varios WAFs bloquean el patrón "dice ser un browser pero no tiene el fingerprint TLS/JS de uno". Declararse como bot de auditoría suele pasar sin problemas y es la práctica ética esperada.

**Fallback a curl del sistema:**
Cuando fetch nativo devuelve 403/406/429/451/503 (típico de WAFs que bloquean por fingerprint TLS de OpenSSL/undici), reintenta con `curl` del sistema vía `child_process.execFile`. En macOS, `curl` usa SecureTransport (TLS del SO), que tiene distinto fingerprint JA3 y suele pasar. No es una dependencia npm — es una herramienta del sistema.

**No ejecuta JavaScript:**
APTrack Flow detecta borrado de parámetros por JS solo por heurística (busca `history.replaceState`/`pushState` en el HTML fuente). No puede confirmar si el JS realmente se ejecuta — para eso haría falta un navegador headless (fuera del scope zero-deps).

### Opciones

```js
{
  maxUrls: 30,              // máximo de URLs a rastrear (1–200)
  timeoutMs: 8000,          // timeout por request
  delayEntreRequestsMs: 300 // throttle entre requests (scraping ético)
}
```

---

## Frontend — public/js/

### main.js

ES module. Maneja toda la UI:
- Formulario de configuración (URL, parámetro, opciones avanzadas)
- Consumo del streaming NDJSON de `/api/audit` con `fetch()` + `ReadableStream`
- Renderizado del log en vivo (card B)
- Renderizado de resultados y tabla filtrable (card C)
- Export a CSV via Blob URL

### modules/i18n.js

Mismo patrón que DataB Flow: `LANG` se resuelve desde `window.__APTRACKFLOW_LANG` (seteado por inline script en `<head>`) antes de que cargue el módulo. Exporta `t(key)` y `applyI18n()`.

**localStorage keys:**
- `aptrackflow-lang` — idioma (`'es'` | `'en'`)
- `aptrackflow-theme` — tema (`'light'` | `'dark'` / ausente = dark)

---

## Convenciones de código

- **Backend**: CommonJS, Node 18+, sin `document`/DOM
- **Frontend**: ES modules, sin `require`
- `t('clave')` para todos los strings visibles al usuario
- Eventos del stream: siempre objeto `{ tipo, ...datos }` — el frontend filtra por `tipo`
- El server **no importa** nada del frontend y viceversa — la única interfaz es la API HTTP

---

## Testing manual

No hay test suite automatizada. Para verificar un cambio:

1. `node server.js` (o `node --watch server.js`)
2. Abrir `http://localhost:3300` en Chrome
3. Ingresar una URL real con parámetros de tracking conocidos
4. Verificar que el log en vivo muestre rastreo y test correctamente
5. Revisar la tabla de resultados y el export CSV
6. Cambiar idioma y tema — verificar que persistan al recargar
