import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { openStore, validateBooking, saveBooking, sendNext, validSignature, applyStatuses } from './booking.mjs';

export function createBookingServer(config = process.env, options = {}) {
const required = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ADMIN_NUMBER', 'WHATSAPP_TEMPLATE_NAME', 'WHATSAPP_GRAPH_VERSION', 'WHATSAPP_VERIFY_TOKEN', 'META_APP_SECRET'];
const ready = () => required.every(key => config[key]);
const db = options.db || openStore(config.BOOKING_DB_PATH || './data/bookings.sqlite');
let busy = false;
async function dispatch() {
  if (busy || !ready()) return;
  busy = true;
  try { await sendNext(db, config, options.fetcher); } catch { console.error('Booking notification worker failed.'); } finally { busy = false; }
}
const worker = setInterval(dispatch, 1000);
worker.unref();
const limits = new Map();
const cleanup = setInterval(() => { for (const [key, value] of limits) if (value.until < Date.now()) limits.delete(key); }, 60000);
cleanup.unref();
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
async function rawBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 65536) throw new Error('Request too large.'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
const root = resolve('dist/5-billion-stars/browser');
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/health' && req.method === 'GET') return json(res, ready() ? 200 : 503, { configured: ready() });
    if (url.pathname === '/api/whatsapp/webhook') {
      if (req.method === 'GET') {
        if (config.WHATSAPP_VERIFY_TOKEN && url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === config.WHATSAPP_VERIFY_TOKEN) { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end(url.searchParams.get('hub.challenge')); }
        return json(res, 403, { error: 'Verification failed.' });
      }
      if (req.method === 'POST') {
        const raw = await rawBody(req);
        if (!validSignature(raw, req.headers['x-hub-signature-256'], config.META_APP_SECRET)) return json(res, 403, { error: 'Invalid signature.' });
        applyStatuses(db, JSON.parse(raw.toString()));
        return json(res, 200, { received: true });
      }
    }
    if (url.pathname === '/api/bookings' && req.method === 'POST') {
      if (!ready()) return json(res, 503, { error: 'Booking notifications are not configured yet. Please contact the campsite.' });
      if (config.PUBLIC_ORIGIN && req.headers.origin && req.headers.origin !== config.PUBLIC_ORIGIN) return json(res, 403, { error: 'Origin not allowed.' });
      const ip = req.socket.remoteAddress;
      const limit = limits.get(ip) || { count: 0, until: Date.now() + 60000 };
      if (limit.until < Date.now()) { limit.count = 0; limit.until = Date.now() + 60000; }
      limits.set(ip, limit);
      if (++limit.count > 10) return json(res, 429, { error: 'Too many requests. Please wait a minute.' });
      const key = req.headers['idempotency-key'];
      if (typeof key !== 'string' || !/^[a-f0-9-]{36}$/i.test(key)) return json(res, 400, { error: 'Invalid submission key.' });
      if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'JSON required.' });
      let row;
      try { row = saveBooking(db, key, validateBooking(JSON.parse((await rawBody(req)).toString()))); }
      catch (error) { return json(res, 400, { error: error.message }); }
      json(res, 201, { id: row.id, notificationStatus: row.status });
      void dispatch(); return;
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found.' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed.' });
    const pathname = decodeURIComponent(url.pathname);
    let file = resolve(root, '.' + pathname);
    if (!file.startsWith(root + '\\') && !file.startsWith(root + '/') && file !== root) return json(res, 404, { error: 'Not found.' });
    if (!extname(file)) file = resolve(root, 'index.html');
    try {
      const data = await readFile(file);
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.png': 'image/png' };
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(req.method === 'HEAD' ? undefined : data);
    } catch { json(res, 404, { error: 'Build the frontend first with npm run build.' }); }
  } catch { json(res, 400, { error: 'Invalid request.' }); }
});
server.once('close', () => { clearInterval(worker); clearInterval(cleanup); if (!options.db) db.close(); });
return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server = createBookingServer();
  server.listen(Number(process.env.PORT || 3000), () => console.log(`Booking server listening on port ${process.env.PORT || 3000}`));
}
