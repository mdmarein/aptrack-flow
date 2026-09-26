/**
 * i18n.js — Internacionalización ES / EN
 * Track-Flow · Tracking Param Audit
 *
 * window.__TRACKFLOW_LANG debe ser seteado por el inline <script> en
 * index.html antes de que este módulo se cargue, para que LANG se
 * resuelva correctamente.
 */

export const LANG = (typeof window !== 'undefined' ? window.__TRACKFLOW_LANG : null) || 'es';

const DICT = {
  es: {
    // ── Encabezado ────────────────────────────────────────────
    'header.tagline':        'Tracking Param Audit',
    'header.theme_to_light': 'Cambiar a modo claro',
    'header.theme_to_dark':  'Cambiar a modo oscuro',
    'header.lang_btn':       'EN',
    'header.lang_title':     'Switch to English',

    // ── Card A: configurar ──────────────────────────────────────
    'card.config':           'A — Configurar Auditoría',
    'card.progress':         'B — Progreso en vivo',
    'card.results':          'C — Resultados',

    'config.url_label':      'URL del sitio a auditar',
    'config.url_ph':         'https://ejemplo.com/landing',
    'config.url_hint':       'Se rastrean solo links internos del mismo dominio.',
    'config.param_label':    'Parámetro a testear',
    'config.value_label':    'Valor de prueba',
    'config.advanced':       'Opciones avanzadas',
    'config.max_urls':       'Máx. URLs a rastrear',
    'config.delay':          'Delay entre requests (ms)',
    'config.timeout':        'Timeout por request (ms)',
    'config.start_btn':      'Iniciar auditoría',

    // ── Card B: progreso ─────────────────────────────────────────
    'progress.visited':      'URLs visitadas',
    'progress.tested':       'Testeadas',
    'progress.survive':      'Sobreviven',
    'progress.lost':         'Perdidos',
    'progress.crawling':     'Rastreando…',
    'progress.testing':      'Testeando parámetro',
    'progress.done':         'Completado',
    'progress.cancel':       'Cancelar',

    // ── Log de progreso ───────────────────────────────────────────
    'log.crawling':          'rastreando',
    'log.error':             'error',
    'log.curl_fallback':     'vía curl (fallback)',
    'log.survives':          'sobrevive',
    'log.lost':              'perdido',

    // ── Card C: resultados ────────────────────────────────────────
    'results.retention':     (pct) => `${pct}% de retención`,
    'results.no_data':       'Sin datos',
    'results.new_audit':     'Nueva auditoría',
    'results.download_csv':  'Descargar CSV',

    'sum.tested':            'URLs testeadas',
    'sum.survive':           'Sobreviven',
    'sum.lost':              'Perdidos',
    'sum.redirect':          'Redirigen',
    'sum.warn':              'A verificar',
    'sum.retention':         'Retención',

    'filter.all':            'Todos',
    'filter.survive':        'Sobreviven',
    'filter.lost':           'Perdidos',
    'filter.redirect':       'Redirigen',
    'filter.warn':           'A verificar',
    'filter.errors':         'Errores',

    'table.status':          'Estado',
    'table.url_original':    'URL original (con parámetro)',
    'table.url_final':       'URL final',
    'table.redirects':       '¿Redirige?',
    'table.js_warn':         '¿Limpieza JS?',
    'table.http_status':     'Status',

    'badge.survive':         'Sobrevive',
    'badge.lost':            'Perdido',
    'badge.error':           'Error',
    'badge.yes':             'Sí',
    'badge.no':              'No',
    'badge.warn_title':      'El servidor entrega el parámetro, pero esta página lo borra de la URL con JavaScript (history.replaceState/pushState) apenas carga — un navegador real podría perderlo. Verificá manualmente.',
    'table.js_estimated':    (url) => `→ estimado tras limpieza JS: ${url}`,
    'table.js_estimated_title': 'Estimación heurística: asume que el script borra todo el query string. No se ejecutó el JS real — el sitio podría comportarse distinto.',
    'table.js_estimated_header': 'URL final estimada (post-JS)',

    'empty.no_filter':       'No hay resultados para este filtro.',

    // ── Validación del formulario ─────────────────────────────────
    'err.url_required':      'Ingresá la URL del sitio a auditar.',
    'err.url_invalid':       'La URL no es válida (debe incluir http:// o https://).',
    'err.param_required':    'Ingresá el nombre del parámetro a testear (ej. gclid).',
    'err.value_required':    'Ingresá un valor de prueba para el parámetro.',

    // ── Toasts ──────────────────────────────────────────────────
    'toast.connect_error':   'No se pudo conectar con el servidor.',
    'toast.start_error':     'Error al iniciar la auditoría.',
    'toast.connection_lost': 'Se cortó la conexión con el servidor.',
    'toast.fatal_error':     'Error inesperado durante la auditoría.',
    'toast.no_urls':         'No se pudo acceder a ninguna URL del sitio. Revisá el log de progreso.',
    'toast.lost_n':          (n) => `Auditoría completa: ${n} URL(s) perdieron el parámetro.`,
    'toast.lost_and_warn_n': (lost, warn) => `Auditoría completa: ${lost} URL(s) perdieron el parámetro · ${warn} a verificar manualmente (limpieza por JS).`,
    'toast.warn_n':          (n) => `Auditoría completa: ${n} URL(s) a verificar manualmente (posible limpieza de URL por JS).`,
    'toast.all_survive':     'Auditoría completa: el parámetro sobrevivió en todas las URLs.',
    'toast.no_results_dl':   'No hay resultados para descargar.',

    // ── Footer ────────────────────────────────────────────────────
    'footer.tagline':        'Auditoría de supervivencia de parámetros de tracking',
  },

  en: {
    // ── Header ────────────────────────────────────────────────
    'header.tagline':        'Tracking Param Audit',
    'header.theme_to_light': 'Switch to light mode',
    'header.theme_to_dark':  'Switch to dark mode',
    'header.lang_btn':       'ES',
    'header.lang_title':     'Cambiar a Español',

    // ── Card A: configure ──────────────────────────────────────
    'card.config':           'A — Configure Audit',
    'card.progress':         'B — Live progress',
    'card.results':          'C — Results',

    'config.url_label':      'Site URL to audit',
    'config.url_ph':         'https://example.com/landing',
    'config.url_hint':       'Only internal links on the same domain are crawled.',
    'config.param_label':    'Parameter to test',
    'config.value_label':    'Test value',
    'config.advanced':       'Advanced options',
    'config.max_urls':       'Max. URLs to crawl',
    'config.delay':          'Delay between requests (ms)',
    'config.timeout':        'Timeout per request (ms)',
    'config.start_btn':      'Start audit',

    // ── Card B: progress ─────────────────────────────────────────
    'progress.visited':      'URLs visited',
    'progress.tested':       'Tested',
    'progress.survive':      'Survive',
    'progress.lost':         'Lost',
    'progress.crawling':     'Crawling…',
    'progress.testing':      'Testing parameter',
    'progress.done':         'Done',
    'progress.cancel':       'Cancel',

    // ── Progress log ───────────────────────────────────────────
    'log.crawling':          'crawling',
    'log.error':             'error',
    'log.curl_fallback':     'via curl (fallback)',
    'log.survives':          'survives',
    'log.lost':              'lost',

    // ── Card C: results ────────────────────────────────────────────
    'results.retention':     (pct) => `${pct}% retention`,
    'results.no_data':       'No data',
    'results.new_audit':     'New audit',
    'results.download_csv':  'Download CSV',

    'sum.tested':            'URLs tested',
    'sum.survive':           'Survive',
    'sum.lost':              'Lost',
    'sum.redirect':          'Redirect',
    'sum.warn':              'To check',
    'sum.retention':         'Retention',

    'filter.all':            'All',
    'filter.survive':        'Survive',
    'filter.lost':           'Lost',
    'filter.redirect':       'Redirect',
    'filter.warn':           'To check',
    'filter.errors':         'Errors',

    'table.status':          'Status',
    'table.url_original':    'Original URL (with param)',
    'table.url_final':       'Final URL',
    'table.redirects':       'Redirects?',
    'table.js_warn':         'JS cleanup?',
    'table.http_status':     'HTTP',

    'badge.survive':         'Survives',
    'badge.lost':            'Lost',
    'badge.error':           'Error',
    'badge.yes':             'Yes',
    'badge.no':              'No',
    'badge.warn_title':      'The server delivers the parameter, but this page strips it from the URL with JavaScript (history.replaceState/pushState) right after loading — a real browser could lose it. Verify manually.',
    'table.js_estimated':    (url) => `→ estimated after JS cleanup: ${url}`,
    'table.js_estimated_title': 'Heuristic estimate: assumes the script strips the whole query string. The real JS was not executed — the site could behave differently.',
    'table.js_estimated_header': 'Estimated final URL (post-JS)',

    'empty.no_filter':       'No results for this filter.',

    // ── Form validation ─────────────────────────────────────────
    'err.url_required':      'Enter the site URL to audit.',
    'err.url_invalid':       'Invalid URL (must include http:// or https://).',
    'err.param_required':    'Enter the parameter name to test (e.g. gclid).',
    'err.value_required':    'Enter a test value for the parameter.',

    // ── Toasts ──────────────────────────────────────────────────
    'toast.connect_error':   'Could not connect to the server.',
    'toast.start_error':     'Error starting the audit.',
    'toast.connection_lost': 'Connection to the server was lost.',
    'toast.fatal_error':     'Unexpected error during the audit.',
    'toast.no_urls':         'Could not reach any URL on the site. Check the progress log.',
    'toast.lost_n':          (n) => `Audit complete: ${n} URL(s) lost the parameter.`,
    'toast.lost_and_warn_n': (lost, warn) => `Audit complete: ${lost} URL(s) lost the parameter · ${warn} to verify manually (possible JS cleanup).`,
    'toast.warn_n':          (n) => `Audit complete: ${n} URL(s) to verify manually (possible JS URL cleanup).`,
    'toast.all_survive':     'Audit complete: the parameter survived on every URL.',
    'toast.no_results_dl':   'No results to download.',

    // ── Footer ────────────────────────────────────────────────────
    'footer.tagline':        'Tracking parameter survival audit',
  },
};

/**
 * Obtiene la traducción de una clave. Si la traducción es una función,
 * la llama con los argumentos adicionales.
 * @param {string} key
 * @param {...any} args
 */
export function t(key, ...args) {
  const val = DICT[LANG]?.[key] ?? DICT.es?.[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

/**
 * Aplica traducciones a elementos del DOM marcados con data-i18n.
 * Llamar desde DOMContentLoaded en main.js.
 */
export function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val !== key) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const val = t(key);
    if (val !== key) el.placeholder = val;
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle;
    const val = t(key);
    if (val !== key) el.title = val;
  });
}
