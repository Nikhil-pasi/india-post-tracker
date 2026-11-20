const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 4175;
const HOST = process.env.HOST || '0.0.0.0';
const TRACK_URL = 'https://www.speedindiapost.com/api/track';
const cache = new Map();

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2048) throw new Error('Request is too large.');
  }
  return JSON.parse(body || '{}');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/track' && req.method === 'POST') {
    try {
      const { id: rawId } = await readJson(req);
      const id = String(rawId || '').trim().toUpperCase();
      if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(id)) return send(res, 400, { success: false, error: 'Enter a valid 13-character India Post consignment number.' });

      const cached = cache.get(id);
      if (cached && cached.until > Date.now()) return send(res, 200, cached.data);

      const upstream = await fetch(TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id }),
        signal: AbortSignal.timeout(25000),
      });
      const data = await upstream.json();
      if (!upstream.ok) return send(res, 502, { success: false, error: data.error || 'The tracking service is temporarily unavailable.' });
      if (data.success) cache.set(id, { data, until: Date.now() + 30000 });
      return send(res, 200, data);
    } catch (error) {
      const timeout = error.name === 'TimeoutError';
      return send(res, timeout ? 504 : 502, { success: false, error: timeout ? 'The carrier lookup took too long. Please try again.' : 'Could not reach the tracking service. Please try again.' });
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.resolve(ROOT, `.${requested}`);
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'Not found.', 'text/plain; charset=utf-8');
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => console.log(`India Post tracker ready at http://127.0.0.1:${PORT}`));
