import { AdminDashboardComponent } from './admin-dashboard.component';
import { FirebaseBookingService, AdminBooking } from './firebase-booking.service';
import { AdminActivityService } from './admin-activity.service';
import { AdminAuthService } from './admin-auth.service';

describe('Firestore admin booking updates', () => {
  let store: jasmine.SpyObj<FirebaseBookingService>;
  let component: AdminDashboardComponent;
  let activity: jasmine.SpyObj<AdminActivityService>;
  const booking = (): AdminBooking => ({ id: 'request-id', reference: 'request-id', createdAt: '2026-11-07T00:00:00Z',
    name: 'Website Guest', phone: '+919876543210', stay: 'Tent Stay (2-3 people)', checkIn: '2099-01-01', checkOut: '2099-01-03',
    guests: 2, adults: 2, kids: 0, veg: 1, nonVeg: 1, notes: '', decision: 'pending' });
  beforeEach(() => {
    store = jasmine.createSpyObj<FirebaseBookingService>('store', ['subscribe', 'setDecision', 'delete', 'setFollowUp']);
    activity = jasmine.createSpyObj<AdminActivityService>('activity', ['listenUsage', 'listenAudit']);
    component = new AdminDashboardComponent(store, {} as AdminAuthService, activity);
  });
  it('updates the table from live snapshots and unsubscribes on destruction', async () => {
    const unsubscribe = jasmine.createSpy('unsubscribe');
    let notify!: (bookings: AdminBooking[]) => void;
    store.subscribe.and.callFake(async next => { notify = next; return unsubscribe; });
    await component.loadBookings();
    notify([booking()]);
    expect(component.bookings[0].name).toBe('Website Guest');
    expect(component.bookingsLoading).toBeFalse();
    notify([{ ...booking(), decision: 'confirmed' }]);
    expect(component.bookings[0].decision).toBe('confirmed');
    component.ngOnDestroy();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
  it('preserves the decision on failure and lets the admin retry', async () => {
    const request = booking();
    store.setDecision.and.rejectWith(new Error('Offline'));
    await component.setBookingDecision(request, 'confirmed');
    expect(request.decision).toBe('pending');
    expect(component.bookingsError).toBe('Offline');
    expect(component.savingDecisions.size).toBe(0);
    store.setDecision.and.resolveTo();
    await component.setBookingDecision(request, 'confirmed');
    expect(request.decision).toBe('confirmed');
    expect(component.bookingsError).toBe('');
  });
  it('requires confirmation before deleting and preserves the row on failure', async () => {
    const request = booking();
    component.bookings = [request];
    const confirm = spyOn(window, 'confirm').and.returnValue(false);
    await component.deleteBooking(request);
    expect(store.delete).not.toHaveBeenCalled();
    confirm.and.returnValue(true);
    store.delete.and.rejectWith(new Error('Offline'));
    await component.deleteBooking(request);
    expect(component.bookings).toEqual([request]);
    expect(component.bookingsError).toContain('Could not delete');
    expect(component.deletingBookings.size).toBe(0);
    store.delete.and.resolveTo();
    await component.deleteBooking(request);
    expect(store.delete).toHaveBeenCalledWith(request.id);
    expect(component.bookingsError).toBe('');
  });
  it('uses live bookings as leads, applies dates, and persists follow-up status', async () => {
    const request = booking(); component.now = Date.parse('2026-11-07T12:00:00Z');
    component.bookings = [request, { ...request, id: 'old', createdAt: '2025-01-01T00:00:00Z' }];
    component.applyFilters(); expect(component.filteredLeads.length).toBe(1);
    component.draftLead(request); component.leadDrafts[request.id].status = 'Contacted';
    store.setFollowUp.and.resolveTo(); await component.saveLead(request);
    expect(store.setFollowUp).toHaveBeenCalledWith(request.id, 'Contacted', '');
    expect(component.leadDrafts[request.id]).toBeUndefined();
  });
  it('does not invent visitors or returning sessions when no events exist', () => {
    component.applyFilters();
    expect(component.stats.find(s => s.label === 'Returning browsers')?.value).toBe('0');
    expect(component.visitorTrendChartData.datasets[0].data.every(n => n === 0)).toBeTrue();
  });
  it('closes stale activity subscriptions when refreshes overlap', async () => {
    const pending: Array<(stop: () => void) => void> = [];
    activity.listenUsage.and.callFake(() => new Promise(resolve => pending.push(resolve)));
    activity.listenAudit.and.callFake(() => new Promise(resolve => pending.push(resolve)));
    const old = component.loadActivity(); const latest = component.loadActivity();
    const stops = pending.map(() => jasmine.createSpy('unsubscribe'));
    pending.forEach((finish, i) => finish(stops[i]));
    await Promise.all([old, latest]);
    expect(stops[0]).toHaveBeenCalled(); expect(stops[1]).toHaveBeenCalled();
    expect(stops[2]).not.toHaveBeenCalled(); component.ngOnDestroy();
    expect(stops[2]).toHaveBeenCalled(); expect(stops[3]).toHaveBeenCalled();
  });
  it('closes a subscription that finishes starting after navigation away', async () => {
    let finish!: (unsubscribe: () => void) => void;
    const unsubscribe = jasmine.createSpy('unsubscribe');
    store.subscribe.and.returnValue(new Promise(resolve => { finish = resolve; }));
    const loading = component.loadBookings();
    component.ngOnDestroy();
    finish(unsubscribe);
    await loading;
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
