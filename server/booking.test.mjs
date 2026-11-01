import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { openStore, validateBooking, saveBooking, sendNext, validSignature, applyStatuses } from './booking.mjs';
const details = { name: 'Test Camper', phone: '+919876543210', checkIn: '2027-12-01', checkOut: '2027-12-02', guests: 2, notes: 'Vegetarian meals' };
const config = { WHATSAPP_ADMIN_NUMBER: '919999999999', WHATSAPP_TEMPLATE_NAME: 'camping_booking_admin', WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_ACCESS_TOKEN: 'test-only', WHATSAPP_GRAPH_VERSION: 'v-test' };
const store = () => openStore(':memory:');

test('validates calendar dates, stay order, phone and guest limits', () => {
  assert.deepEqual(validateBooking(details, '2027-01-01'), details);
  for (const change of [{ checkIn: '2027-02-30' }, { checkOut: details.checkIn }, { guests: 0 }, { guests: 1.5 }, { phone: '123' }, { name: '' }, { notes: 'x'.repeat(501) }]) {
    assert.throws(() => validateBooking({ ...details, ...change }, '2027-01-01'));
  }
  assert.throws(() => validateBooking(details, '2028-01-01'));
});

test('repeated submissions use one durable booking and reject changed payloads', () => {
  const db = store();
  try {
    const first = saveBooking(db, 'key', details);
    assert.equal(saveBooking(db, 'key', details).id, first.id);
    assert.throws(() => saveBooking(db, 'key', { ...details, guests: 3 }));
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM bookings').get().count, 1);
  } finally { db.close(); }
});

test('sends all booking details only to configured admin and records acceptance', async () => {
  const db = store();
  try {
    const row = saveBooking(db, 'key', details);
    let calls = 0;
    await sendNext(db, config, async (url, request) => {
      calls++;
      assert.equal(url, 'https://graph.facebook.com/v-test/123/messages');
      assert.equal(request.headers.Authorization, 'Bearer test-only');
      const body = JSON.parse(request.body);
      assert.equal(body.to, config.WHATSAPP_ADMIN_NUMBER);
      assert.deepEqual(body.template.components[0].parameters.map(p => p.text), [row.id, details.name, details.phone, details.checkIn, details.checkOut, '2', details.notes, row.created_at]);
      return { ok: true, json: async () => ({ messages: [{ id: 'wamid.test' }] }) };
    });
    await sendNext(db, config, () => { throw new Error('Must not send twice'); });
    assert.equal(calls, 1);
    assert.equal(db.prepare('SELECT status FROM bookings').get().status, 'accepted');
  } finally { db.close(); }
});

test('retries rate limits, retains permanent failures and avoids ambiguous duplicate sends', async () => {
  for (const [status, expected] of [[429, 'queued'], [400, 'failed'], [500, 'unknown']]) {
    const db = store();
    try {
      saveBooking(db, 'key', details);
      await sendNext(db, config, async () => ({ ok: false, status, json: async () => ({ error: { code: 123 } }) }));
      const row = db.prepare('SELECT * FROM bookings').get();
      assert.equal(row.status, expected);
      assert.equal(row.attempts, 1);
      assert.ok(row.next_attempt > Date.now());
    } finally { db.close(); }
  }
  const db = store();
  try {
    saveBooking(db, 'key', details);
    await sendNext(db, config, async () => { throw new Error('timeout'); });
    assert.equal(db.prepare('SELECT status FROM bookings').get().status, 'unknown');
  } finally { db.close(); }
});

test('authenticates exact webhook bytes', () => {
  const raw = Buffer.from('{"entry":[]}');
  const signature = 'sha256=' + createHmac('sha256', 'secret').update(raw).digest('hex');
  assert.equal(validSignature(raw, signature, 'secret'), true);
  assert.equal(validSignature(Buffer.from('{}'), signature, 'secret'), false);
  assert.equal(validSignature(raw, undefined, 'secret'), false);
  assert.equal(validSignature(raw, signature, ''), false);
});

test('delivery webhooks update matching bookings and ignore older or regressive events', () => {
  const db = store();
  try {
    const row = saveBooking(db, 'key', details);
    db.prepare("UPDATE bookings SET message_id='wamid.test', status='accepted' WHERE id=?").run(row.id);
    const event = (status, timestamp) => ({ entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.test', status, timestamp }] } }] }] });
    applyStatuses(db, event('delivered', '100'));
    applyStatuses(db, event('sent', '101'));
    assert.equal(db.prepare('SELECT status FROM bookings').get().status, 'delivered');
    applyStatuses(db, event('read', '102'));
    applyStatuses(db, event('delivered', '100'));
    assert.equal(db.prepare('SELECT status FROM bookings').get().status, 'read');
  } finally { db.close(); }
});

test('bookings survive reopening and interrupted sends require reconciliation', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const folder = mkdtempSync(join(tmpdir(), 'camping-booking-test-'));
  const path = join(folder, 'test.sqlite');
  let db;
  try {
    db = openStore(path);
    const row = saveBooking(db, 'key', details);
    db.prepare("UPDATE bookings SET status='sending' WHERE id=?").run(row.id);
    db.close();
    db = openStore(path);
    assert.equal(db.prepare('SELECT id FROM bookings').get().id, row.id);
    assert.equal(db.prepare('SELECT status FROM bookings').get().status, 'unknown');
    assert.equal(saveBooking(db, 'key', details).id, row.id);
  } finally {
    db?.close();
    rmSync(folder, { recursive: true });
  }
});

test('HTTP booking submission reaches admin API and signed delivery callback updates saved booking', async () => {
  const { createBookingServer } = await import('./index.mjs');
  const { once } = await import('node:events');
  const { randomUUID } = await import('node:crypto');
  const db = store();
  const requests = [];
  const server = createBookingServer({ ...config, WHATSAPP_VERIFY_TOKEN: 'test-verify', META_APP_SECRET: 'test-secret', PUBLIC_ORIGIN: 'https://camp.example' }, {
    db,
    fetcher: async (url, request) => {
      requests.push({ url, body: JSON.parse(request.body) });
      return { ok: true, json: async () => ({ messages: [{ id: 'wamid.http-test' }] }) };
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const payload = { ...details, checkIn: '2099-01-01', checkOut: '2099-01-03' };
    const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID(), Origin: 'https://camp.example' };
    const response = await fetch(base + '/api/bookings', { method: 'POST', headers, body: JSON.stringify(payload) });
    assert.equal(response.status, 201);
    const saved = await response.json();
    for (let n = 0; n < 100 && db.prepare('SELECT status FROM bookings').get().status !== 'accepted'; n++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].body.to, config.WHATSAPP_ADMIN_NUMBER);
    assert.equal(requests[0].body.template.components[0].parameters[1].text, payload.name);
    assert.equal(db.prepare('SELECT status FROM bookings').get().status, 'accepted');
    const retry = await fetch(base + '/api/bookings', { method: 'POST', headers, body: JSON.stringify(payload) });
    assert.equal((await retry.json()).id, saved.id);
    assert.equal(requests.length, 1);
    const challenge = await fetch(base + '/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test-verify&hub.challenge=challenge-123');
    assert.equal(challenge.status, 200);
    assert.equal(await challenge.text(), 'challenge-123');
    const body = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.http-test', status: 'delivered', timestamp: '12345' }] } }] }] });
    const unsigned = await fetch(base + '/api/whatsapp/webhook', { method: 'POST', body });
    assert.equal(unsigned.status, 403);
    assert.equal(db.prepare('SELECT status FROM bookings').get().status, 'accepted');
    const signature = 'sha256=' + createHmac('sha256', 'test-secret').update(body).digest('hex');
    const delivered = await fetch(base + '/api/whatsapp/webhook', { method: 'POST', headers: { 'x-hub-signature-256': signature }, body });
    assert.equal(delivered.status, 200);
    assert.equal(db.prepare('SELECT status FROM bookings').get().status, 'delivered');
    const forbidden = await fetch(base + '/api/bookings', { method: 'POST', headers: { ...headers, Origin: 'https://elsewhere.example' }, body: JSON.stringify(payload) });
    assert.equal(forbidden.status, 403);
    const invalid = await fetch(base + '/api/bookings', { method: 'POST', headers: { ...headers, 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ ...payload, guests: 0 }) });
    assert.equal(invalid.status, 400);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM bookings').get().count, 1);
    const privateRecords = await fetch(base + '/api/bookings');
    assert.equal(privateRecords.status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
});
