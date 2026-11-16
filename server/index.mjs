import { randomBytes, timingSafeEqual } from 'node:crypto';
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
const sessions = new Map();
const bookingStreams = new Map();
function notifyBookingsChanged() {
  for (const [res, token] of bookingStreams) {
    if (!(sessions.get(token) > Date.now())) { res.end(); continue; }
    res.write('event: bookings-changed\ndata: {}\n\n');
  }
}
const secureEqual = (a, b) => {
  const left = Buffer.from(String(a || '')), right = Buffer.from(String(b || ''));
  return left.length === right.length && timingSafeEqual(left, right);
};
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
    if (url.pathname === '/api/admin/login' && req.method === 'POST') {
      const ip = 'login:' + req.socket.remoteAddress;
      const limit = limits.get(ip) || { count: 0, until: Date.now() + 60000 };
      if (limit.until < Date.now()) { limit.count = 0; limit.until = Date.now() + 60000; }
      limits.set(ip, limit);
      if (++limit.count > 10) return json(res, 429, { error: 'Too many login attempts. Try again in a minute.' });
      if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) return json(res, 503, { error: 'Admin login is not configured on the server.' });
      const input = JSON.parse((await rawBody(req)).toString());
      if (!secureEqual(input.email, config.ADMIN_EMAIL) || !secureEqual(input.password, config.ADMIN_PASSWORD)) return json(res, 401, { error: 'Invalid admin credentials.' });
      const token = randomBytes(32).toString('hex');
      sessions.set(token, Date.now() + 8 * 60 * 60 * 1000);
      res.setHeader('Set-Cookie', `admin_session=${token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=28800${config.PUBLIC_ORIGIN?.startsWith('https:') ? '; Secure' : ''}`);
      return json(res, 200, { authenticated: true });
    }
    if (url.pathname.startsWith('/api/admin/')) {
      const token = /(?:^|;\s*)admin_session=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
      if (!token || !(sessions.get(token) > Date.now())) return json(res, 401, { error: 'Please sign in again.' });
      if (url.pathname === '/api/admin/bookings/events' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
        bookingStreams.set(res, token);
        res.write('event: bookings-changed\ndata: {}\n\n');
        const heartbeat = setInterval(() => {
          if (!(sessions.get(token) > Date.now())) return res.end();
          res.write(': keep-alive\n\n');
        }, 20000);
        heartbeat.unref();
        res.on('close', () => { clearInterval(heartbeat); bookingStreams.delete(res); });
        return;
      }
      if (url.pathname === '/api/admin/logout' && req.method === 'POST') {
        sessions.delete(token);
        for (const [stream, session] of bookingStreams) if (session === token) stream.end();
        res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0');
        return json(res, 200, { authenticated: false });
      }
      const decisionMatch = /^\/api\/admin\/bookings\/([a-f0-9-]{36})\/decision$/.exec(url.pathname);
      if (decisionMatch && req.method === 'PATCH') {
        if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'JSON required.' });
        const { decision } = JSON.parse((await rawBody(req)).toString());
        if (!['confirmed', 'not_confirmed'].includes(decision)) return json(res, 400, { error: 'Invalid booking decision.' });
        const row = db.prepare('SELECT * FROM bookings WHERE id=?').get(decisionMatch[1]);
        if (!row) return json(res, 404, { error: 'Booking not found.' });
        const booking = JSON.parse(row.details);
        if (decision === 'confirmed' && (!booking.quote || !Number.isFinite(booking.quote.total) || !Number.isFinite(booking.quote.advance))) return json(res, 400, { error: 'This booking needs a price quote before confirmation.' });
        const updatedAt = new Date().toISOString();
        db.prepare('INSERT INTO booking_decisions (booking_id, decision, updated_at) VALUES (?, ?, ?) ON CONFLICT(booking_id) DO UPDATE SET decision=excluded.decision, updated_at=excluded.updated_at').run(row.id, decision, updatedAt);
        let whatsappUrl = '';
        if (decision === 'confirmed') {
          const money = value => 'INR ' + value.toFixed(2);
          const message = [
            '5 BILLION STARS - Booking payment request',
            'Hello ' + booking.name + ',',
            'Our team has confirmed availability for your stay.',
            'Reference: ' + row.request_key,
            'Stay: ' + booking.stay,
            'Check-in: ' + booking.checkIn, 'Check-out: ' + booking.checkOut,
            'Guests: ' + booking.guests,
            'Total amount: ' + money(booking.quote.total),
            'Please pay either the 40% advance of ' + money(booking.quote.advance) + ' or the full amount of ' + money(booking.quote.total) + ' to confirm your booking.',
            'GPay / PhonePe: 8624908808',
            'If paying the advance, the remaining balance is ' + money(booking.quote.balance) + '.',
            'Please share your payment screenshot and booking reference in this chat.',
            'Your booking is confirmed after our team verifies your payment.',
            'Thank you for choosing 5 Billion Stars!'
          ].join('\n');
          whatsappUrl = 'https://wa.me/' + booking.phone.replace(/\D/g, '') + '?text=' + encodeURIComponent(message);
        }
        notifyBookingsChanged();
        return json(res, 200, { decision, decisionAt: updatedAt, whatsappUrl });
      }
      if (url.pathname === '/api/admin/bookings' && req.method === 'GET') {
        const rows = db.prepare('SELECT b.id, b.request_key, b.details, b.created_at, d.decision, d.updated_at AS decision_at FROM bookings b LEFT JOIN booking_decisions d ON d.booking_id=b.id ORDER BY b.created_at DESC LIMIT 1000').all();
        return json(res, 200, { bookings: rows.map(row => ({ id: row.id, reference: row.request_key, createdAt: row.created_at, decision: row.decision || 'pending', decisionAt: row.decision_at, ...JSON.parse(row.details) })) });
      }
    }
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
    if (['/api/bookings', '/api/booking-requests'].includes(url.pathname) && req.method === 'POST') {
      const manualRequest = url.pathname === '/api/booking-requests';
      if (!manualRequest && !ready()) return json(res, 503, { error: 'Booking notifications are not configured yet. Please contact the campsite.' });
      if (req.headers.origin) {
        const requestOrigin = new URL(req.headers.origin).origin;
        const configuredOrigin = config.PUBLIC_ORIGIN ? new URL(config.PUBLIC_ORIGIN.trim()).origin : null;
        const serverOrigin = new URL(`${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`).origin;
        if (requestOrigin !== serverOrigin && requestOrigin !== configuredOrigin) {
          return json(res, 403, { error: 'Origin not allowed. Open the site using its configured public URL.' });
        }
      }
      const ip = req.socket.remoteAddress;
      const limit = limits.get(ip) || { count: 0, until: Date.now() + 60000 };
      if (limit.until < Date.now()) { limit.count = 0; limit.until = Date.now() + 60000; }
      limits.set(ip, limit);
      if (++limit.count > 10) return json(res, 429, { error: 'Too many requests. Please wait a minute.' });
      const key = req.headers['idempotency-key'];
      if (typeof key !== 'string' || !/^[a-f0-9-]{36}$/i.test(key)) return json(res, 400, { error: 'Invalid submission key.' });
      if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'JSON required.' });
      let row;
      try {
        const input = JSON.parse((await rawBody(req)).toString());
        const details = validateBooking(input);
        if (manualRequest) {
          if (!['Tent Stay (2-3 people)', 'Cottage Stay (4-5 people)'].includes(input.stay)) throw new Error('Choose a valid stay.');
          for (const field of ['adults', 'kids', 'veg', 'nonVeg']) {
            if (!Number.isInteger(input[field]) || input[field] < 0 || input[field] > 50) throw new Error('Invalid guest or meal count.');
            details[field] = input[field];
          }
          if (!input.adults || input.adults + input.kids > input.guests || input.veg + input.nonVeg !== input.guests) throw new Error('Guest and meal counts do not match.');
          details.stay = input.stay;
          const nights = (Date.parse(details.checkOut) - Date.parse(details.checkIn)) / 86400000;
          const networkHandlingTotal = input.adults * nights;
          const total = (input.adults * (input.stay.startsWith('Tent') ? 999 : 1599) + input.kids * 700) * nights + networkHandlingTotal;
          details.quote = { nights, networkHandlingTotal, total, advance: Math.round(total * 40) / 100, balance: Math.round(total * 60) / 100 };
          details.source = 'WhatsApp booking request';
        }
        row = saveBooking(db, key, details);
        if (manualRequest) db.prepare("UPDATE bookings SET status='request' WHERE id=? AND status='queued'").run(row.id);
      }
      catch (error) { return json(res, 400, { error: error.message }); }
      notifyBookingsChanged();
      json(res, 201, { id: row.id, notificationStatus: row.status });
      if (!manualRequest) void dispatch(); return;
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
