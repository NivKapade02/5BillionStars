import { Injectable } from '@angular/core';
import { calculateBookingQuote } from './booking-quote';
import { VisitorTrackingService } from './visitor-tracking.service';
import type { LiveStatus } from './admin-activity.service';
import { getFirebase } from './firebase-client';
import type { Timestamp, Unsubscribe, UpdateData, DocumentData } from 'firebase/firestore';

export interface BookingRequest {
  name: string; phone: string; checkIn: string; checkOut: string;
  guests: number; adults: number; kids: number; veg: number; nonVeg: number;
  stay: string; notes: string;
}
export interface AdminBooking extends BookingRequest {
  id: string; reference: string; createdAt: string;
  decision: 'pending' | 'confirmed' | 'not_confirmed'; decisionAt?: string;
  leadStatus?: 'Pending' | 'Contacted' | 'Approved' | 'Closed'; leadNotes?: string; leadUpdatedAt?: string;
  paidAmount?: number; paymentNote?: string; paymentAt?: string; updatedAt?: string;
  quote?: { total: number; advance: number; balance: number };
}

@Injectable({ providedIn: 'root' })
export class FirebaseBookingService {
  constructor(private readonly tracking: VisitorTrackingService) {}
  async save(reference: string, details: BookingRequest, createdAt: string): Promise<void> {
    const quote = calculateBookingQuote(details.stay, details.checkIn, details.checkOut, details.adults, details.kids);
    if (!quote) throw new Error('Invalid booking estimate.');
    const { nights, total, advance, balance } = quote;
    const { db, firestoreSdk: sdk } = await getFirebase();
    // Exact retries preserve the document, without granting guests read access.
    await sdk.setDoc(sdk.doc(db, 'bookingRequests', reference), {
      ...details, reference, quote: { nights, total, advance, balance }, createdAt: sdk.Timestamp.fromDate(new Date(createdAt)), decision: 'pending'
    });
    this.tracking.record('booking_submitted', reference);
  }

  async subscribe(next: (bookings: AdminBooking[]) => void, error: (error: Error) => void, status?: (status: LiveStatus) => void): Promise<Unsubscribe> {
    const { db, firestoreSdk: sdk } = await getFirebase();
    const query = sdk.query(sdk.collection(db, 'bookingRequests'), sdk.orderBy('createdAt', 'desc'), sdk.limit(1000));
    return sdk.onSnapshot(query, { includeMetadataChanges: true }, snapshot => {
      status?.(snapshot.metadata.fromCache ? 'cached' : 'live');
      next(snapshot.docs.map(document => {
      const data = document.data();
      const details = data as BookingRequest;
      // Estimates are validated by Security Rules when requests are created or edited.
      return {
        ...details, id: document.id, reference: document.id,
        createdAt: (data['createdAt'] as Timestamp).toDate().toISOString(),
        decision: data['decision'] as AdminBooking['decision'],
        updatedAt: (data['updatedAt'] as Timestamp | undefined)?.toDate().toISOString(),
        leadStatus: (data['leadStatus'] as AdminBooking['leadStatus']) || 'Pending', leadNotes: (data['leadNotes'] as string) || '',
        paidAmount: (data['paidAmount'] as number) || 0, paymentNote: (data['paymentNote'] as string) || '',
        paymentAt: (data['paymentAt'] as Timestamp | undefined)?.toDate().toISOString(),
        decisionAt: (data['decisionAt'] as Timestamp | undefined)?.toDate().toISOString(),
        quote: data['quote'] as AdminBooking['quote']
      };
    }));
    }, error);
  }

  async update(id: string, details: BookingRequest): Promise<void> {
    const error = bookingValidationError(details);
    if (error) throw new Error(error);
    const quote = calculateBookingQuote(details.stay, details.checkIn, details.checkOut, details.adults, details.kids)!;
    const { nights, total, advance, balance } = quote;
    const { db, firestoreSdk: sdk } = await getFirebase();
    await this.mutate(id, 'booking_edited', {
      ...details, quote: { nights, total, advance, balance }, decision: 'pending',
      decisionAt: sdk.deleteField(), updatedAt: sdk.serverTimestamp()
    });
  }

  async delete(id: string): Promise<void> {
    await this.mutate(id, 'booking_deleted');
  }

  async setDecision(id: string, decision: 'confirmed' | 'not_confirmed'): Promise<void> {
    const { db, firestoreSdk: sdk } = await getFirebase();
    await this.mutate(id, decision === 'confirmed' ? 'decision_confirmed' : 'decision_declined', { decision, decisionAt: sdk.serverTimestamp() });
  }
  async setFollowUp(id: string, status: NonNullable<AdminBooking['leadStatus']>, notes: string): Promise<void> {
    if (!['Pending', 'Contacted', 'Approved', 'Closed'].includes(status) || notes.length > 500) throw new Error('Invalid follow-up details.');
    const { firestoreSdk: sdk } = await getFirebase();
    await this.mutate(id, 'lead_updated', { leadStatus: status, leadNotes: notes.trim(), leadUpdatedAt: sdk.serverTimestamp() });
  }
  async setPayment(id: string, amount: number, note: string): Promise<void> {
    if (!Number.isFinite(amount) || amount < 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001 || note.length > 200) throw new Error('Enter a valid payment amount and note.');
    const { firestoreSdk: sdk } = await getFirebase();
    await this.mutate(id, 'payment_recorded', { paidAmount: amount, paymentNote: note.trim(), paymentAt: sdk.serverTimestamp() });
  }
  private async mutate(id: string, action: string, changes?: UpdateData<DocumentData>): Promise<void> {
    const { db, auth, firestoreSdk: sdk } = await getFirebase();
    if (!auth.currentUser) throw new Error('Please sign in again.');
    const actor = auth.currentUser.uid;
    const ref = sdk.doc(db, 'bookingRequests', id);
    const audit = sdk.doc(sdk.collection(db, 'adminActivity'));
    await sdk.runTransaction(db, async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists()) throw new Error('This booking no longer exists.');
      const current = snapshot.data();
      const paid = changes?.['paidAmount'] ?? current['paidAmount'] ?? 0;
      const quote = (changes?.['quote'] ?? current['quote']) as { total: number } | undefined;
      if (changes && (!quote || Number(paid) > quote.total)) throw new Error('Recorded payment cannot exceed the booking total.');
      if (changes) tx.update(ref, changes);
      else tx.delete(ref);
      tx.set(audit, { action, reference: id, actor, createdAt: sdk.serverTimestamp() });
    });
  }

}

export function bookingValidationError(d: BookingRequest): string {
  if (d.name.trim().length < 3 || d.name.trim().length > 100) return 'Enter a guest name between 3 and 100 characters.';
  if (!/^\+[1-9][0-9]{7,14}$/.test(d.phone)) return 'Enter the WhatsApp number with its country code, for example +919876543210.';
  if (![d.guests, d.adults, d.kids, d.veg, d.nonVeg].every(n => Number.isInteger(n) && n >= 0 && n <= 50)
    || d.guests < 1 || d.adults < 1 || d.adults + d.kids > d.guests || d.veg + d.nonVeg !== d.guests)
    return 'Check guest counts. Adults and kids cannot exceed members, and meal counts must equal members.';
  if (!calculateBookingQuote(d.stay, d.checkIn, d.checkOut, d.adults, d.kids)) return 'Choose a valid stay and check-out after check-in.';
  if (d.notes.length > 200) return 'Keep comments within 200 characters.';
  return '';
}
