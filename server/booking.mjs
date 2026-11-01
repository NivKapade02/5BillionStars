import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function validateBooking(input, today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) {
  if (!input || typeof input !== 'object') throw new Error('Booking details are required.');
  const result = {};
  for (const [key, max] of [['name', 100], ['phone', 20], ['checkIn', 10], ['checkOut', 10], ['notes', 500]]) {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.length > max) throw new Error(`Invalid ${key}.`);
    result[key] = value.trim();
  }
  if (result.name.length < 2 || !/^\+?[1-9]\d{7,14}$/.test(result.phone)) throw new Error('Enter a name and phone number with country code.');
  for (const key of ['checkIn', 'checkOut']) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result[key]) || !Number.isFinite(Date.parse(result[key])) || new Date(result[key]).toISOString().slice(0, 10) !== result[key]) throw new Error('Enter valid stay dates.');
  }
  if (result.checkIn < today || result.checkOut <= result.checkIn) throw new Error('Check-in must be today or later and check-out must be after check-in.');
  result.guests = input.guests;
  if (!Number.isInteger(result.guests) || result.guests < 1 || result.guests > 50) throw new Error('Guests must be between 1 and 50.');
  return result;
}

export function openStore(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, details TEXT NOT NULL,
    created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', message_id TEXT,
    attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0,
    last_error TEXT, status_time INTEGER NOT NULL DEFAULT 0
  );`);
  // A terminated request may have reached Meta. Keep it for manual reconciliation.
  db.prepare("UPDATE bookings SET status='unknown', last_error='Server restarted during send; reconcile before retrying' WHERE status='sending'").run();
  return db;
}

export function saveBooking(db, key, details) {
  const previous = db.prepare('SELECT * FROM bookings WHERE request_key=?').get(key);
  if (previous) {
    if (previous.details !== JSON.stringify(details)) throw new Error('This submission key belongs to another booking.');
    return previous;
  }
  const id = randomUUID();
  db.prepare('INSERT INTO bookings (id, request_key, details, created_at) VALUES (?, ?, ?, ?)').run(id, key, JSON.stringify(details), new Date().toISOString());
  return db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
}

export function templatePayload(row, config) {
  const b = JSON.parse(row.details);
  return { messaging_product: 'whatsapp', to: config.WHATSAPP_ADMIN_NUMBER, type: 'template', template: {
    name: config.WHATSAPP_TEMPLATE_NAME, language: { code: config.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US' },
    components: [{ type: 'body', parameters: [row.id, b.name, b.phone, b.checkIn, b.checkOut, String(b.guests), b.notes || 'None', row.created_at].map(text => ({ type: 'text', text: text.replace(/\s+/g, ' ') })) }]
  } };
}

export async function sendNext(db, config, fetcher = fetch) {
  const row = db.prepare("SELECT * FROM bookings WHERE status='queued' AND next_attempt<=? ORDER BY created_at LIMIT 1").get(Date.now());
  if (!row) return;
  db.prepare("UPDATE bookings SET status='sending', attempts=attempts+1 WHERE id=?").run(row.id);
  try {
    const response = await fetcher(`https://graph.facebook.com/${config.WHATSAPP_GRAPH_VERSION}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(templatePayload(row, config)), signal: AbortSignal.timeout(15000)
    });
    const body = await response.json();
    if (response.ok && body.messages?.[0]?.id) {
      db.prepare("UPDATE bookings SET message_id=?, status='accepted', last_error=NULL WHERE id=?").run(body.messages[0].id, row.id);
    } else {
      // Only explicit rate-limit rejections are safe to retry automatically.
      const retry = response.status === 429 && row.attempts < 4;
      db.prepare('UPDATE bookings SET status=?, next_attempt=?, last_error=? WHERE id=?').run(retry ? 'queued' : response.ok || response.status >= 500 ? 'unknown' : 'failed', Date.now() + 30000 * 2 ** row.attempts, `Meta HTTP ${response.status}; code ${body.error?.code ?? 'unknown'}`, row.id);
    }
  } catch {
    db.prepare("UPDATE bookings SET status='unknown', last_error='Send outcome unknown; reconcile in Meta before retrying' WHERE id=?").run(row.id);
  }
}

export function validSignature(raw, signature, secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature || '')) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function applyStatuses(db, event) {
  for (const entry of event.entry || []) for (const change of entry.changes || []) for (const status of change.value?.statuses || []) {
    if (!['sent', 'delivered', 'read', 'failed'].includes(status.status)) continue;
    const row = db.prepare('SELECT * FROM bookings WHERE message_id=?').get(status.id);
    if (!row) continue;
    const timestamp = Number(status.timestamp);
    const ranks = { accepted: 0, sent: 1, delivered: 2, read: 3, failed: 4 };
    if (!Number.isFinite(timestamp) || timestamp < row.status_time || (row.status !== 'failed' && status.status !== 'failed' && ranks[status.status] < ranks[row.status])) continue;
    if (row.status === 'read' || (status.status === 'failed' && row.status === 'delivered')) continue;
    db.prepare('UPDATE bookings SET status=?, status_time=?, last_error=? WHERE id=?').run(status.status, timestamp, status.errors?.[0]?.code ? `Meta delivery code ${status.errors[0].code}` : null, row.id);
  }
}
