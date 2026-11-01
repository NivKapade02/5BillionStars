import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const source = readFileSync(new URL('./Code.gs', import.meta.url), 'utf8');
const booking = { id: '347836f8-315a-4df8-a40b-50a24a6c1000', name: 'Test Camper', phone: '+919876543210', checkIn: '2099-01-01', checkOut: '2099-01-03', guests: 2, notes: 'Vegetarian meals' };
function environment() {
  const rows = [];
  const properties = new Map();
  let locked = false;
  const sheet = {
    getLastRow: () => rows.length,
    appendRow: row => rows.push(Array.from(row)),
    setFrozenRows: () => {},
    getRange: (row, col) => ({
      getValue: () => rows[row - 1][col - 1],
      createTextFinder: id => ({ matchEntireCell: () => ({ findNext: () => {
        const index = rows.findIndex((value, i) => i > 0 && value[0] === id);
        return index < 0 ? null : { getRow: () => index + 1 };
      } }) })
    })
  };
  const spreadsheet = { getId: () => 'test-sheet', getUrl: () => 'https://docs.google.com/spreadsheets/d/test-sheet', getSheetByName: () => sheet };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties.get(key), setProperty: (key, value) => properties.set(key, value) }) },
    SpreadsheetApp: { openById: () => spreadsheet, getActiveSpreadsheet: () => spreadsheet, flush: () => {} },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => { locked = true; return true; }, hasLock: () => locked, releaseLock: () => { locked = false; } }) },
    Utilities: { formatDate: () => '2026-11-01', DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (_, text) => createHash('sha256').update(text).digest(), base64Encode: bytes => Buffer.from(bytes).toString('base64') },
    Logger: { log: () => {} }
  });
  vm.runInContext(source, context);
  return { context, rows, properties, locked: () => locked, submit: input => context.doPost({ postData: { contents: JSON.stringify(input) } }) };
}

test('sheet setup creates headers and saves all booking details', () => {
  const env = environment();
  env.context.setupBookingSheet();
  const result = env.submit(booking);
  assert.equal(result.ok, true);
  assert.equal(result.id, booking.id);
  assert.equal(env.rows.length, 2);
  assert.deepEqual(env.rows[1].slice(2, 8), [booking.name, "'" + booking.phone, booking.checkIn, booking.checkOut, 2, booking.notes]);
  assert.equal(env.locked(), false);
});

test('retries are idempotent and same reference cannot replace different details', () => {
  const env = environment();
  env.context.setupBookingSheet();
  assert.equal(env.submit(booking).ok, true);
  assert.equal(env.submit(booking).ok, true);
  assert.equal(env.submit({ ...booking, guests: 3 }).ok, false);
  assert.equal(env.rows.length, 2);
  assert.equal(env.locked(), false);
});

test('invalid dates, phones, counts and large inputs do not add sheet rows', () => {
  const env = environment();
  env.context.setupBookingSheet();
  for (const change of [{ checkIn: '2099-02-30' }, { checkOut: booking.checkIn }, { checkIn: '2020-01-01' }, { guests: 0 }, { guests: 1.5 }, { name: '' }, { phone: '123' }, { notes: 'x'.repeat(501) }, { id: 'invalid' }]) {
    assert.equal(env.submit({ ...booking, ...change }).ok, false);
  }
  assert.equal(env.context.doPost({ postData: { contents: 'x'.repeat(10001) } }).ok, false);
  assert.equal(env.context.doPost({ postData: { contents: 'not json' } }).ok, false);
  assert.equal(env.rows.length, 1);
});

test('sheet formulas remain literal user text and unconfigured deployments fail visibly', () => {
  const env = environment();
  assert.equal(env.submit(booking).ok, false);
  env.context.setupBookingSheet();
  assert.equal(env.submit({ ...booking, name: '=IMPORTXML("url")', notes: '@formula' }).ok, true);
  assert.equal(env.rows[1][2], '\'=IMPORTXML("url")');
  assert.equal(env.rows[1][7], "'@formula");
  assert.equal(env.context.doGet().configured, true);
});
