'use strict';

const $ = (id) => document.getElementById(id);

// ════════════════════════════════════════════════════════════
//  TEMA CLARO / OSCURO
// ════════════════════════════════════════════════════════════
function initTheme() {
  const STORAGE_KEY = 'trackflow-theme';
  const btn = $('btn-theme');
  const sun = $('theme-icon-sun');
  const moon = $('theme-icon-moon');

  function apply(light) {
    document.body.classList.toggle('light', light);
    sun.style.display = light ? 'block' : 'none';
    moon.style.display = light ? 'none' : 'block';
    btn.title = light ? 'Cambiar a oscuro' : 'Cambiar a claro';
  }

  apply(localStorage.getItem(STORAGE_KEY) === 'light');

  btn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light');
    localStorage.setItem(STORAGE_KEY, isLight ? 'light' : 'dark');
    apply(isLight);
  });
}

// ════════════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════════════
let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  $('toast-msg').textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ════════════════════════════════════════════════════════════
//  OPCIONES AVANZADAS (collapse)
// ════════════════════════════════════════════════════════════
function initAdvToggle() {
  const toggle = $('adv-toggle');
  const body = $('adv-body');
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    body.classList.toggle('open');
  });
}

// ════════════════════════════════════════════════════════════
//  ESTADO DE LA AUDITORÍA
// ════════════════════════════════════════════════════════════
const state = {
  resultados: [],
  visitadas: 0,
  filtro: 'all',
  controller: null,
  urlAuditada: '',
};

function showCard(id, show) {
  $(id).classList.toggle('hidden', !show);
}

function setConfigError(msg) {
  const el = $('config-error');
  if (!msg) { el.classList.add('hidden'); el.textContent = ''; return; }
  el.textContent = msg;
  el.classList.remove('hidden');
}

function readForm() {
  return {
    url: $('f-url').value.trim(),
    paramNombre: $('f-param-nombre').value.trim(),
    paramValor: $('f-param-valor').value.trim(),
    maxUrls: Number($('f-max-urls').value) || 30,
    delayMs: Number($('f-delay').value) || 0,
    timeoutMs: Number($('f-timeout').value) || 8000,
  };
}

function validate(form) {
  if (!form.url) return 'Ingresá la URL del sitio a auditar.';
  try {
    const u = new URL(form.url);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
  } catch {
    return 'La URL no es válida (debe incluir http:// o https://).';
  }
  if (!form.paramNombre) return 'Ingresá el nombre del parámetro a testear (ej. gclid).';
  if (!form.paramValor) return 'Ingresá un valor de prueba para el parámetro.';
  return null;
}

// ════════════════════════════════════════════════════════════
//  LOG DE PROGRESO
// ════════════════════════════════════════════════════════════
function addLogRow(cls, url, meta) {
  const log = $('log');
  const row = document.createElement('div');
  row.className = `log-row ${cls}`;
  row.innerHTML = `<span class="log-dot"></span><span class="log-url mono">${escapeHtml(url || '')}</span><span class="log-meta">${escapeHtml(meta || '')}</span>`;
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ════════════════════════════════════════════════════════════
//  EJECUTAR AUDITORÍA (streaming NDJSON)
// ════════════════════════════════════════════════════════════
async function runAudit(form) {
  state.resultados = [];
  state.visitadas = 0;
  state.controller = new AbortController();
  state.urlAuditada = form.url;

  $('log').innerHTML = '';
  $('prog-visitadas').textContent = '0';
  $('prog-testeadas').textContent = '0';
  $('prog-ok').textContent = '0';
  $('prog-lost').textContent = '0';
  $('pbar').classList.add('indet');
  $('progress-status').textContent = 'Rastreando…';

  showCard('c-progress', true);
  showCard('c-results', false);

  let res;
  try {
    res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
      signal: state.controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') return;
    toast('No se pudo conectar con el servidor.');
    showCard('c-progress', false);
    return;
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setConfigError(data.error || 'Error al iniciar la auditoría.');
    showCard('c-progress', false);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lineas = buffer.split('\n');
      buffer = lineas.pop();
      for (const linea of lineas) {
        if (!linea.trim()) continue;
        try { handleEvent(JSON.parse(linea)); }
        catch { /* línea corrupta, ignorar */ }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') toast('Se cortó la conexión con el servidor.');
  }
}

function handleEvent(evt) {
  switch (evt.tipo) {
    case 'sitemap':
      addLogRow(evt.esIndice ? '' : 'ok', evt.url, evt.esIndice ? 'índice de sitemaps' : `${evt.encontradas} URL(s)`);
      break;
    case 'sitemap_error':
      addLogRow('', evt.url, evt.error || 'sin sitemap');
      break;
    case 'fuente':
      $('progress-status').textContent = evt.fuente === 'sitemap'
        ? `Rastreando… (sitemap, ${evt.total} URLs)`
        : `Rastreando… (sin sitemap, siguiendo links, ${evt.total} URLs)`;
      break;
    case 'crawl':
      state.visitadas = evt.visitadas;
      $('prog-visitadas').textContent = evt.visitadas;
      addLogRow('', evt.url, 'rastreando');
      break;
    case 'error_crawl':
      addLogRow('warn', evt.url, evt.error || 'error');
      break;
    case 'test': {
      state.resultados.push(evt);
      $('prog-testeadas').textContent = state.resultados.length;
      const ok = state.resultados.filter((r) => r.sobrevive).length;
      $('prog-ok').textContent = ok;
      $('prog-lost').textContent = state.resultados.length - ok;
      addLogRow(evt.sobrevive ? 'ok' : 'err', evt.original, evt.sobrevive ? 'sobrevive' : 'perdido');
      break;
    }
    case 'error_test': {
      state.resultados.push({ ...evt, sobrevive: false, esError: true });
      $('prog-testeadas').textContent = state.resultados.length;
      $('prog-lost').textContent = state.resultados.filter((r) => !r.sobrevive).length;
      addLogRow('warn', evt.original, evt.error || 'error');
      break;
    }
    case 'final':
      $('pbar').classList.remove('indet');
      $('pbar').style.width = '100%';
      $('progress-status').textContent = 'Completado';
      renderResults(evt);
      break;
    case 'error_fatal':
      setConfigError(evt.error || 'Error inesperado durante la auditoría.');
      showCard('c-progress', false);
      break;
  }
}

// ════════════════════════════════════════════════════════════
//  RESULTADOS
// ════════════════════════════════════════════════════════════
function renderResults(final) {
  showCard('c-results', true);

  const total = final.totalUrls;
  const ok = final.sobreviven;
  const lost = final.perdidos;
  const redir = final.redirigidos ?? state.resultados.filter((r) => r.redirigida).length;
  const pct = total ? Math.round((ok / total) * 100) : 0;
  const fuenteLbl = final.fuente === 'sitemap' ? 'vía sitemap' : 'vía rastreo de links';

  $('results-status').textContent = total ? `${pct}% de retención · ${fuenteLbl}` : 'Sin datos';
  $('sum-box').innerHTML = `
    <div class="sum-item"><span class="sum-n">${total}</span><span class="sum-l">URLs testeadas</span></div>
    <div class="sum-item"><span class="sum-n acc">${ok}</span><span class="sum-l">Sobreviven</span></div>
    <div class="sum-item"><span class="sum-n redc">${lost}</span><span class="sum-l">Perdidos</span></div>
    <div class="sum-item"><span class="sum-n dim">${redir}</span><span class="sum-l">Redirigen</span></div>
    <div class="sum-item"><span class="sum-n dim">${pct}%</span><span class="sum-l">Retención</span></div>
  `;

  state.filtro = 'all';
  document.querySelectorAll('.fb').forEach((b) => b.classList.toggle('on', b.dataset.filter === 'all'));
  renderTable();

  if (!total) toast('No se pudo acceder a ninguna URL del sitio. Revisá el log de progreso.');
  else if (lost > 0) toast(`Auditoría completa: ${lost} URL(s) perdieron el parámetro.`);
  else toast('Auditoría completa: el parámetro sobrevivió en todas las URLs.');
}

function renderTable() {
  const body = $('results-body');
  const rows = state.resultados.filter((r) => {
    if (state.filtro === 'ok') return r.sobrevive && !r.esError;
    if (state.filtro === 'lost') return !r.sobrevive && !r.esError;
    if (state.filtro === 'err') return !!r.esError;
    if (state.filtro === 'redir') return r.redirigida === true;
    return true;
  });

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="5"><div class="empty"><div class="empty-ico">◌</div><div class="empty-msg">No hay resultados para este filtro.</div></div></td></tr>`;
    return;
  }

  body.innerHTML = rows.map((r) => {
    const badge = r.esError
      ? '<span class="badge badge-err">Error</span>'
      : r.sobrevive
        ? '<span class="badge badge-ok">Sobrevive</span>'
        : '<span class="badge badge-lost">Perdido</span>';
    const redirBadge = r.redirigida === true
      ? '<span class="badge badge-lost">Sí</span>'
      : r.redirigida === false
        ? '<span class="badge badge-ok">No</span>'
        : '<span class="t-dim">—</span>';
    return `
      <tr>
        <td>${badge}</td>
        <td class="mono t-url" title="${escapeHtml(r.original)}">${escapeHtml(r.original)}</td>
        <td class="mono t-url" title="${escapeHtml(r.final || '')}">${escapeHtml(r.final || r.error || '—')}</td>
        <td>${redirBadge}</td>
        <td class="mono">${r.status ?? '—'}</td>
      </tr>
    `;
  }).join('');
}

// ════════════════════════════════════════════════════════════
//  EXPORTAR CSV
// ════════════════════════════════════════════════════════════
function csvEscape(valor) {
  const s = String(valor ?? '');
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function resultadosACsv(resultados) {
  const encabezado = ['Estado', 'URL original (con parámetro)', 'URL final', '¿Redirige?', 'Status'];
  const filas = resultados.map((r) => {
    const estado = r.esError ? 'Error' : r.sobrevive ? 'Sobrevive' : 'Perdido';
    const redirige = r.redirigida === true ? 'Si' : r.redirigida === false ? 'No' : '';
    return [estado, r.original, r.final || r.error || '', redirige, r.status ?? ''].map(csvEscape).join(',');
  });
  return [encabezado.join(','), ...filas].join('\r\n');
}

function nombreArchivoCsv() {
  let host = 'auditoria';
  try { host = new URL(state.urlAuditada).hostname || host; } catch { /* usar default */ }
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const fecha = `${yy}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const hora = `${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `${host}_${fecha}-${hora}.csv`;
}

function descargarCsv() {
  if (!state.resultados.length) { toast('No hay resultados para descargar.'); return; }
  const csv = '﻿' + resultadosACsv(state.resultados); // BOM: acentos correctos al abrir en Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivoCsv();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function initFilters() {
  document.querySelectorAll('.fb').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fb').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      state.filtro = btn.dataset.filter;
      renderTable();
    });
  });
}

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
function initForm() {
  $('btn-start').addEventListener('click', () => {
    setConfigError(null);
    const form = readForm();
    const err = validate(form);
    if (err) { setConfigError(err); return; }
    runAudit(form);
  });

  $('btn-cancel').addEventListener('click', () => {
    state.controller?.abort();
    showCard('c-progress', false);
  });

  $('btn-new-audit').addEventListener('click', () => {
    showCard('c-results', false);
    showCard('c-progress', false);
  });

  $('btn-download-csv').addEventListener('click', descargarCsv);
}

initTheme();
initAdvToggle();
initFilters();
initForm();
