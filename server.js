/**
 * Track-Flow · Tracking Param Audit · Servidor HTTP local — sin dependencias npm
 * Requiere: Node.js >= 18
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { exec } = require('child_process');
const { auditarSitio } = require('./lib/link-auditor');

const PORT = process.env.PORT || 3300;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy(new Error('payload_too_large'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

function json(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

// ── Ruta de auditoría: streaming NDJSON (una línea JSON por evento) ──
// Se eligió streaming sobre fetch (POST) en vez de EventSource (que solo
// soporta GET) para poder mandar la config de la auditoría en el body.
async function handleAudit(req, res) {
  let body;
  try {
    body = await parseBody(req);
  } catch (e) {
    return json(res, 400, { error: e.message });
  }

  const { url: urlInicio, paramNombre, paramValor, maxUrls, delayMs, timeoutMs } = body;

  if (!urlInicio || !paramNombre || !paramValor) {
    return json(res, 400, { error: 'Faltan campos: url, paramNombre, paramValor' });
  }

  let urlValida;
  try {
    urlValida = new URL(urlInicio);
    if (!['http:', 'https:'].includes(urlValida.protocol)) throw new Error();
  } catch {
    return json(res, 400, { error: 'URL inválida' });
  }

  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store',
    'Transfer-Encoding': 'chunked',
  });

  const enviar = (evento) => {
    res.write(JSON.stringify(evento) + '\n');
  };

  const opciones = {};
  if (maxUrls) opciones.maxUrls = Math.min(Math.max(Number(maxUrls) || 30, 1), 200);
  if (delayMs != null) opciones.delayEntreRequestsMs = Math.max(Number(delayMs) || 0, 0);
  if (timeoutMs) opciones.timeoutMs = Math.max(Number(timeoutMs) || 8000, 1000);

  try {
    const resultado = await auditarSitio(
      urlValida.toString(),
      { nombre: paramNombre, valor: paramValor },
      opciones,
      enviar
    );
    enviar({ tipo: 'final', ...resultado });
  } catch (err) {
    enviar({ tipo: 'error_fatal', error: err.message });
  } finally {
    res.end();
  }
}

const API = {
  'POST /api/audit': handleAudit,
};

// ── Servidor ─────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const route = `${method} ${pathname}`;
  if (API[route]) { API[route](req, res); return; }

  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err) {
      res.writeHead(404); res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Content-Length': stat.size,
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  const addr = `http://localhost:${PORT}`;
  console.log(`\n  Track-Flow · Tracking Param Audit`);
  console.log(`  ───────────────────────────────────────`);
  console.log(`  Servidor: ${addr}\n`);
  const cmd = process.platform === 'darwin' ? `open ${addr}`
    : process.platform === 'win32' ? `start ${addr}`
    : `xdg-open ${addr}`;
  exec(cmd, (err) => { if (err) console.log(`  (Abrí ${addr} manualmente)\n`); });
});
