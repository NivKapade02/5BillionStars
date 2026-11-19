import { after, before, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, Timestamp, serverTimestamp, deleteField, writeBatch } from 'firebase/firestore';

let env;
const id = '12345678-1234-4234-8234-123456789abc';
const adminUid = 'paQi4R2liKhkGCch2RbDNCDSXuA3';
const payload = () => ({
  reference: id, name: 'Website Guest', phone: '+919876543210',
  checkIn: '2099-01-01', checkOut: '2099-01-03', guests: 3, adults: 2,
  kids: 1, veg: 1, nonVeg: 2, stay: 'Tent Stay (2-3 people)', notes: 'Lake view',
  quote: { nights: 2, total: 5400, advance: 2160, balance: 3240 },
  createdAt: Timestamp.now(), decision: 'pending'
});
const booking = (context) => doc(context.firestore(), 'bookingRequests', id);
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-5bs', firestore: {
    host: '127.0.0.1', port: 8088, rules: await readFile('firestore.rules', 'utf8')
  } });
});
beforeEach(async () => { await env.clearFirestore(); });
after(async () => { await env?.cleanup(); });

test('guests can submit and repeat an identical request without reading it', async () => {
  const ref = booking(env.unauthenticatedContext());
  const data = payload();
  await assertSucceeds(setDoc(ref, data));
  await assertSucceeds(setDoc(ref, data));
  await assertFails(getDoc(ref));
  await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(), 'bookingRequests')));
  await assertFails(updateDoc(ref, { name: 'Changed guest' }));
  await assertFails(updateDoc(ref, { decision: 'confirmed', decisionAt: serverTimestamp() }));
  await assertFails(deleteDoc(ref));
});

test('accepts regular and event booking types while rejecting invalid types and guest changes', async () => {
  const db = env.unauthenticatedContext().firestore();
  for (const bookingType of ['regular', 'event']) {
    const reference = crypto.randomUUID();
    const ref = doc(db, 'bookingRequests', reference);
    await assertSucceeds(setDoc(ref, { ...payload(), reference, bookingType }));
    await assertFails(updateDoc(ref, { bookingType: bookingType === 'event' ? 'regular' : 'event' }));
  }
  for (const bookingType of ['other', '', true, 1, null]) {
    const reference = crypto.randomUUID();
    await assertFails(setDoc(doc(db, 'bookingRequests', reference), { ...payload(), reference, bookingType }));
  }
});

test('only the configured admin can read and update decisions', async () => {
  await assertSucceeds(setDoc(booking(env.unauthenticatedContext()), payload()));
  const other = booking(env.authenticatedContext('another-user'));
  await assertFails(getDoc(other));
  await assertFails(updateDoc(other, { decision: 'confirmed', decisionAt: serverTimestamp() }));
  const ref = booking(env.authenticatedContext(adminUid));
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(getDocs(collection(env.authenticatedContext(adminUid).firestore(), 'bookingRequests')));
  await assertSucceeds(updateDoc(ref, { decision: 'confirmed', decisionAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { decision: 'not_confirmed', decisionAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { decision: 'paid', decisionAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { phone: '+919999999999' }));
  await assertSucceeds(deleteDoc(ref));
});

test('rejects invalid counts, identity fields, dates, timestamps, and forged prices', async () => {
  const ref = booking(env.unauthenticatedContext());
  for (const changes of [
    { guests: 0 }, { adults: 0 }, { adults: 2.5 }, { kids: 2 }, { nonVeg: 1 },
    { phone: '9876543210' }, { name: '' }, { notes: 'x'.repeat(201) },
    { stay: 'Unknown' }, { reference: 'another-id' }, { checkOut: '2099-01-01' },
    { checkIn: '2000-01-01' }, { checkIn: 'not-a-date' }, { checkIn: '2099-02-31', checkOut: '2099-03-05' },
    { createdAt: Timestamp.fromMillis(0) }, { createdAt: Timestamp.fromMillis(Date.now() + 3600000) },
    { decision: 'confirmed' }, { quote: { total: 1 } }, { quote: { nights: 2, total: 1, advance: 0.4, balance: 0.6 } }, { total: 1 }, { decisionAt: Timestamp.now() }
  ]) await assertFails(setDoc(ref, { ...payload(), ...changes }));
  const missing = payload(); delete missing.phone;
  await assertFails(setDoc(ref, missing));
});

test('denies access to collections outside bookingRequests', async () => {
  const db = env.authenticatedContext(adminUid).firestore();
  await assertFails(setDoc(doc(db, 'users', 'test'), { role: 'admin' }));
  await assertFails(getDoc(doc(db, 'users', 'test')));
});

test('admin can edit details with a validated quote and return confirmed bookings to pending', async () => {
  const data = payload();
  await assertSucceeds(setDoc(booking(env.unauthenticatedContext()), data));
  const ref = booking(env.authenticatedContext(adminUid));
  await assertSucceeds(updateDoc(ref, { decision: 'confirmed', decisionAt: serverTimestamp() }));
  const changes = { name: 'Edited Guest', guests: 4, adults: 3, kids: 1, veg: 2, nonVeg: 2,
    quote: { nights: 2, total: 7400, advance: 2960, balance: 4440 },
    decision: 'pending', decisionAt: deleteField(), updatedAt: serverTimestamp() };
  await assertFails(updateDoc(booking(env.unauthenticatedContext()), changes));
  await assertFails(updateDoc(booking(env.authenticatedContext('another-user')), changes));
  await assertSucceeds(updateDoc(ref, changes));
  const edited = (await assertSucceeds(getDoc(ref))).data();
  if (edited.name !== 'Edited Guest' || edited.decision !== 'pending' || edited.decisionAt !== undefined)
    throw new Error('Edited booking did not return to pending');
  await assertFails(updateDoc(ref, { ...changes, reference: 'changed-reference' }));
  await assertFails(updateDoc(ref, { ...changes, createdAt: Timestamp.now() }));
  await assertFails(updateDoc(ref, { ...changes, veg: 0 }));
  await assertFails(updateDoc(ref, { ...changes, quote: { nights: 2, total: 1, advance: 0.4, balance: 0.6 } }));
  await assertFails(deleteDoc(booking(env.authenticatedContext('another-user'))));
  await assertSucceeds(deleteDoc(ref));
});

const usage = () => ({ visitorId: id, sessionId: id, kind: 'page_view', path: '/', reference: '', device: 'Desktop', browser: 'Chrome', os: 'Windows', timezone: 'Asia/Kolkata', language: 'en-IN', source: 'Direct', returning: false, elapsedSeconds: 0, createdAt: serverTimestamp() });
test('guests can append validated usage events but only admin can read them', async () => {
  const guest = env.unauthenticatedContext().firestore();
  const ref = doc(guest, 'usageEvents', id);
  await assertSucceeds(setDoc(ref, usage()));
  await assertFails(getDoc(ref)); await assertFails(updateDoc(ref, { path: '/book' })); await assertFails(deleteDoc(ref));
  await assertSucceeds(getDoc(doc(env.authenticatedContext(adminUid).firestore(), 'usageEvents', id)));
  await assertFails(getDoc(doc(env.authenticatedContext('other').firestore(), 'usageEvents', id)));
});
test('usage validation rejects private fields, admin pages, forged times and oversized values', async () => {
  const db = env.unauthenticatedContext().firestore();
  for (const patch of [{ phone: '+919999999999' }, { path: '/admin' }, { path: '/?phone=secret' }, { source: 'x'.repeat(121) }, { elapsedSeconds: -1 }, { elapsedSeconds: 86401 }, { kind: 'fake' }, { visitorId: 'name@example.com' }, { createdAt: Timestamp.fromMillis(0) }])
    await assertFails(setDoc(doc(db, 'usageEvents', id), { ...usage(), ...patch }));
});
test('only admin can save validated lead follow-up and payment records', async () => {
  await assertSucceeds(setDoc(booking(env.unauthenticatedContext()), payload()));
  const ref = booking(env.authenticatedContext(adminUid));
  const followup = { leadStatus: 'Contacted', leadNotes: 'Discussed dates', leadUpdatedAt: serverTimestamp() };
  await assertFails(updateDoc(booking(env.unauthenticatedContext()), followup));
  await assertFails(updateDoc(booking(env.authenticatedContext('other')), followup));
  await assertSucceeds(updateDoc(ref, followup));
  await assertFails(updateDoc(ref, { ...followup, leadStatus: 'Invalid' }));
  await assertFails(updateDoc(ref, { ...followup, leadNotes: 'x'.repeat(501) }));
  const payment = { paidAmount: 2160, paymentNote: 'Checked account', paymentAt: serverTimestamp() };
  await assertFails(updateDoc(booking(env.unauthenticatedContext()), payment));
  await assertFails(updateDoc(booking(env.authenticatedContext('other')), payment));
  await assertSucceeds(updateDoc(ref, payment));
  await assertFails(updateDoc(ref, { ...payment, paidAmount: -1 }));
  await assertFails(updateDoc(ref, { ...payment, paidAmount: 5401 }));
  await assertFails(updateDoc(ref, { ...payment, paymentNote: 'x'.repeat(201) }));
});
test('admin audit history is private, append-only and rejects forged actors', async () => {
  const event = { action: 'booking_edited', reference: id, actor: adminUid, createdAt: serverTimestamp() };
  const ref = doc(env.authenticatedContext(adminUid).firestore(), 'adminActivity', 'audit');
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'adminActivity', 'audit'), event));
  await assertFails(setDoc(doc(env.authenticatedContext('other').firestore(), 'adminActivity', 'audit'), event));
  await assertFails(setDoc(ref, { ...event, actor: 'other' }));
  await assertSucceeds(setDoc(ref, event));
  await assertSucceeds(getDoc(ref));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'adminActivity', 'audit')));
  await assertFails(updateDoc(ref, { action: 'booking_deleted' })); await assertFails(deleteDoc(ref));
});
test('a rejected audit write rolls back the booking change in the same batch', async () => {
  await assertSucceeds(setDoc(booking(env.unauthenticatedContext()), payload()));
  const db = env.authenticatedContext(adminUid).firestore();
  const batch = writeBatch(db);
  batch.update(doc(db, 'bookingRequests', id), { leadStatus: 'Contacted', leadNotes: '', leadUpdatedAt: serverTimestamp() });
  batch.set(doc(db, 'adminActivity', 'invalid'), { action: 'lead_updated', reference: id, actor: 'wrong-actor', createdAt: serverTimestamp() });
  await assertFails(batch.commit());
  const saved = await getDoc(doc(db, 'bookingRequests', id));
  if (saved.data().leadStatus) throw new Error('Rejected batch changed the booking');
});
