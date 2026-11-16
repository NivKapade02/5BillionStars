import { Injectable } from '@angular/core';
import { getFirebase } from './firebase-client';
import type { Timestamp, Unsubscribe } from 'firebase/firestore';
import type { UsageEvent } from './visitor-tracking.service';
export interface AdminActivity { id: string; action: string; reference: string; actor: string; createdAt: string; }
export type LiveStatus = 'connecting' | 'live' | 'cached' | 'error';
@Injectable({ providedIn: 'root' })
export class AdminActivityService {
  async listenUsage(next: (events: UsageEvent[], status: LiveStatus) => void, error: () => void): Promise<Unsubscribe> {
    const { db, firestoreSdk: sdk } = await getFirebase();
    const query = sdk.query(sdk.collection(db, 'usageEvents'), sdk.where('createdAt', '>=', sdk.Timestamp.fromMillis(Date.now() - 90 * 86400000)), sdk.orderBy('createdAt', 'desc'), sdk.limit(2000));
    return sdk.onSnapshot(query, { includeMetadataChanges: true }, snapshot => next(snapshot.docs.map(d => ({
      ...d.data(), id: d.id, createdAt: (d.data()['createdAt'] as Timestamp | null)?.toDate().toISOString() || new Date().toISOString()
    } as UsageEvent)), snapshot.metadata.fromCache ? 'cached' : 'live'), error);
  }
  async listenAudit(next: (events: AdminActivity[], status: LiveStatus) => void, error: () => void): Promise<Unsubscribe> {
    const { db, firestoreSdk: sdk } = await getFirebase();
    return sdk.onSnapshot(sdk.query(sdk.collection(db, 'adminActivity'), sdk.orderBy('createdAt', 'desc'), sdk.limit(100)), { includeMetadataChanges: true }, snapshot => next(snapshot.docs.map(d => ({
      ...d.data(), id: d.id, createdAt: (d.data()['createdAt'] as Timestamp | null)?.toDate().toISOString() || new Date().toISOString()
    } as AdminActivity)), snapshot.metadata.fromCache ? 'cached' : 'live'), error);
  }
}
