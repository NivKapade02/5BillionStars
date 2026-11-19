import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import type { ChartConfiguration } from 'chart.js';
import type { Unsubscribe } from 'firebase/firestore';
import { AdminBookingEditorComponent } from './admin-booking-editor.component';
import { AdminPaymentComponent } from './admin-payment.component';
import { AdminAuthService } from './admin-auth.service';
import { FirebaseBookingService, AdminBooking } from './firebase-booking.service';
import { AdminActivityService, AdminActivity, LiveStatus } from './admin-activity.service';
import type { UsageEvent } from './visitor-tracking.service';
import { bucketDate, indiaDate, safeCsvCell, visitorSessions, VisitorSession } from './dashboard-analytics';
import { businessWhatsAppLink } from './business-whatsapp-link';

@Component({ selector: 'app-admin-dashboard', standalone: true,
  providers: [provideCharts(withDefaultRegisterables())],
  imports: [CommonModule, FormsModule, BaseChartDirective, AdminBookingEditorComponent, AdminPaymentComponent],
  templateUrl: './admin-dashboard.component.html', styleUrl: './admin-dashboard.component.css' })
export class AdminDashboardComponent implements OnInit, OnDestroy {
  constructor(private readonly bookingStore: FirebaseBookingService, readonly authService: AdminAuthService,
    private readonly activityStore: AdminActivityService) {}
  bookings: AdminBooking[] = [];
  events: UsageEvent[] = [];
  audit: AdminActivity[] = [];
  visitors: VisitorSession[] = [];
  filteredVisitors: VisitorSession[] = [];
  filteredBookings: AdminBooking[] = [];
  filteredLeads: AdminBooking[] = [];
  filteredEvents: UsageEvent[] = [];
  private bookingsSubscription?: Unsubscribe;
  private extraSubscriptions: Unsubscribe[] = [];
  private destroyed = false;
  private activityGeneration = 0;
  private bookingGeneration = 0;
  private clock?: ReturnType<typeof setInterval>;
  now = Date.now();
  lastSync = '';
  bookingsError = '';
  activityError = '';
  bookingsLoading = false;
  bookingStatus: LiveStatus = 'connecting';
  usageStatus: LiveStatus = 'connecting';
  auditStatus: LiveStatus = 'connecting';
  paymentBooking: AdminBooking | null = null;
  theme: 'dark' | 'light' = 'dark';
  selectedView = 'overview';
  readonly views = [ ['overview', 'Overview'], ['bookings', 'Booking Requests'], ['visitors', 'Visitors'], ['leads', 'Leads'], ['geo', 'Time zones'], ['activity', 'Activity'], ['settings', 'Settings'] ];
  readonly intervals: Array<'daily' | 'weekly' | 'monthly'> = ['daily', 'weekly', 'monthly'];
  interval: 'daily' | 'weekly' | 'monthly' = 'daily';
  filters = { dateRange: '30d', timezone: 'All', device: 'All', source: 'All', leadStatus: 'All', whatsappStatus: 'All', decision: 'All', search: '' };
  bookingPage = 1; visitorPage = 1; leadPage = 1; eventPage = 1;
  readonly pageSize = 20;
  leadDrafts: Record<string, { status: NonNullable<AdminBooking['leadStatus']>; notes: string }> = {};
  savingLeads = new Set<string>();
  settingsMessage = '';
  resettingPassword = false;
  stats: Array<{ label: string; value: string; detail: string; accent: string }> = [];
  notifications: Array<{ title: string; message: string; time: string }> = [];
  timezoneRows: Array<{ name: string; sessions: number; returning: number; clicks: number }> = [];
  visitorTrendChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  leadTrendChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  deviceChartData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [] };
  locationChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  get viewTitle(): string { return this.views.find(view => view[0] === this.selectedView)?.[1] || 'Dashboard'; }
  get timezones(): string[] { return [...new Set(this.events.map(e => e.timezone))].sort(); }
  get sources(): string[] { return [...new Set(this.events.map(e => e.source))].sort(); }
  get statusLabel(): string {
    const statuses = [this.bookingStatus, this.usageStatus, this.auditStatus];
    return statuses.includes('error') ? 'Connection needs attention' : statuses.includes('connecting') ? 'Connecting...' : statuses.includes('cached') ? 'Showing cached data / reconnecting' : 'Live updates connected';
  }
  editingBooking: AdminBooking | null = null;
  deletingBookings = new Set<string>();
  editBooking(booking: AdminBooking): void { this.editingBooking = { ...booking }; }
  async deleteBooking(booking: AdminBooking): Promise<void> {
    if (this.deletingBookings.has(booking.id) || this.savingDecisions.has(booking.id)) return;
    if (!window.confirm('Delete booking ' + booking.reference + ' for ' + booking.name + '? This cannot be undone.')) return;
    this.deletingBookings.add(booking.id);
    this.bookingsError = '';
    try {
      await this.bookingStore.delete(booking.id);
      if (this.editingBooking?.id === booking.id) this.editingBooking = null;
      if (this.paymentBooking?.id === booking.id) this.paymentBooking = null;
    } catch { this.bookingsError = 'Could not delete this booking. Check your connection and admin permissions, then retry.'; }
    finally { this.deletingBookings.delete(booking.id); }
  }

  savingDecisions = new Set<string>();
  async setBookingDecision(booking: (typeof this.bookings)[number], decision: 'confirmed' | 'not_confirmed'): Promise<void> {
    if (this.savingDecisions.has(booking.id)) return;
    this.savingDecisions.add(booking.id);
    this.bookingsError = '';
    try {
      await this.bookingStore.setDecision(booking.id, decision);
      booking.decision = decision;
    } catch (error) { this.bookingsError = error instanceof Error ? error.message : 'Could not save the booking decision.'; }
    finally { this.savingDecisions.delete(booking.id); }
  }
  paymentRequestUrl(booking: (typeof this.bookings)[number]): string {
    if (!booking.quote) return '';
    const remaining = Math.max(0, booking.quote.total - (booking.paidAmount || 0));
    const money = (value: number) => 'INR ' + value.toFixed(2);
    const message = `5 BILLION STARS - Booking payment request
Hello ${booking.name}, availability is confirmed for ${booking.stay}.
Reference: ${booking.reference}
Check-in: ${booking.checkIn} | Check-out: ${booking.checkOut}
Total: ${money(booking.quote.total)}. Recorded received: ${money(booking.paidAmount || 0)}. Remaining due: ${money(remaining)}.
For a new booking, the 40% advance is ${money(booking.quote.advance)}; please confirm the amount due with our team before paying.
GPay / PhonePe: 8624908808
Estimated balance after the 40% advance: ${money(booking.quote.balance)}
Share your payment screenshot and reference here. Booking is confirmed after our team verifies payment.`;
    return 'https://wa.me/' + booking.phone.replace(/\D/g, '') + '?text=' + encodeURIComponent(message);
  }

  openCustomerWhatsApp(event: MouseEvent, webUrl: string): void {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !webUrl) return;
    const target = businessWhatsAppLink(webUrl, navigator.userAgent);
    if (target === webUrl) return;
    // Keep the app launch synchronous with the tap so Android allows it.
    event.preventDefault();
    window.location.assign(target);
  }


  async loadBookings(): Promise<void> {
    if (this.bookingsLoading) return;
    const generation = ++this.bookingGeneration;
    this.bookingsLoading = true;
    this.bookingStatus = 'connecting';
    this.bookingsSubscription?.();
    this.bookingsError = '';
    try {
      const unsubscribe = await this.bookingStore.subscribe(bookings => {
        if (this.destroyed || generation !== this.bookingGeneration) return;
        this.bookings = bookings; this.bookingsLoading = false; this.bookingsError = '';
        this.lastSync = new Date().toISOString(); this.applyFilters(false);
      }, () => {
        this.bookingsLoading = false; this.bookingStatus = 'error';
        this.bookingsError = 'Could not load bookings. Check your connection, admin login and deployed Firestore rules.';
      }, status => { if (generation === this.bookingGeneration) this.bookingStatus = status; });
      if (this.destroyed || generation !== this.bookingGeneration) unsubscribe(); else this.bookingsSubscription = unsubscribe;
    } catch {
      this.bookingsLoading = false; this.bookingStatus = 'error';
      this.bookingsError = 'Could not connect to Firebase. Try Refresh after checking your connection.';
    }
  }
  async loadActivity(): Promise<void> {
    const generation = ++this.activityGeneration;
    this.extraSubscriptions.forEach(stop => stop()); this.extraSubscriptions = [];
    this.usageStatus = 'connecting'; this.auditStatus = 'connecting'; this.activityError = '';
    const listen = async (kind: 'usage' | 'audit') => {
      try {
        const error = () => {
          if (this.destroyed || generation !== this.activityGeneration) return;
          if (kind === 'usage') this.usageStatus = 'error'; else this.auditStatus = 'error';
          this.activityError = 'Some activity could not be loaded. Check the deployed Firestore rules, connection and Spark usage quota.';
        };
        const stop = kind === 'usage'
          ? await this.activityStore.listenUsage((events, status) => { if (this.destroyed || generation !== this.activityGeneration) return; this.events = events; this.usageStatus = status; this.lastSync = new Date().toISOString(); this.applyFilters(false); }, error)
          : await this.activityStore.listenAudit((events, status) => { if (this.destroyed || generation !== this.activityGeneration) return; this.audit = events; this.auditStatus = status; this.lastSync = new Date().toISOString(); this.applyFilters(false); }, error);
        if (this.destroyed || generation !== this.activityGeneration) stop(); else this.extraSubscriptions.push(stop);
      } catch { if (this.destroyed || generation !== this.activityGeneration) return; if (kind === 'usage') this.usageStatus = 'error'; else this.auditStatus = 'error'; this.activityError = 'Could not connect to live activity. Try Refresh.'; }
    };
    await Promise.all([listen('usage'), listen('audit')]);
  }
  ngOnInit(): void {
    try {
      const saved = localStorage.getItem('5bs-admin-theme');
      this.theme = saved === 'light' || saved === 'dark' ? saved : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    } catch { /* Keep the default if storage is unavailable. */ }
    void this.loadBookings(); void this.loadActivity(); this.applyFilters();
    this.clock = setInterval(() => { this.now = Date.now(); this.applyFilters(false); }, 30000);
  }
  ngOnDestroy(): void {
    this.destroyed = true; this.bookingsSubscription?.(); this.extraSubscriptions.forEach(stop => stop());
    if (this.clock) clearInterval(this.clock);
  }
  toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('5bs-admin-theme', this.theme); } catch { /* Storage is optional. */ }
  }
  setIntervalView(value: 'daily' | 'weekly' | 'monthly'): void { this.interval = value; this.applyFilters(false); }
  pages(count: number): number { return Math.max(1, Math.ceil(count / this.pageSize)); }
  page<T>(rows: T[], page: number): T[] { return rows.slice((page - 1) * this.pageSize, page * this.pageSize); }
  duration(seconds: number): string { return Math.floor(seconds / 60) + 'm ' + seconds % 60 + 's'; }
  recent(visitor: VisitorSession): boolean { return Date.parse(visitor.lastSeen) > this.now - 180000; }
  draftLead(booking: AdminBooking): void { this.leadDrafts[booking.id] ??= { status: booking.leadStatus || 'Pending', notes: booking.leadNotes || '' }; }
  cancelLead(id: string): void { delete this.leadDrafts[id]; }
  async saveLead(booking: AdminBooking): Promise<void> {
    if (this.savingLeads.has(booking.id)) return;
    const draft = this.leadDrafts[booking.id]; if (!draft) return;
    this.savingLeads.add(booking.id); this.bookingsError = '';
    try { await this.bookingStore.setFollowUp(booking.id, draft.status, draft.notes); delete this.leadDrafts[booking.id]; }
    catch { this.bookingsError = 'Could not save lead follow-up. Your edits are available to retry.'; }
    finally { this.savingLeads.delete(booking.id); }
  }
  whatsappClicked(id: string): boolean { return this.events.some(e => e.reference === id && e.kind === 'whatsapp_click'); }
  applyFilters(resetPages = true): void {
    if (resetPages) this.bookingPage = this.visitorPage = this.leadPage = this.eventPage = 1;
    const cutoff = this.now - Number.parseInt(this.filters.dateRange, 10) * 86400000;
    const matches = (value: string) => value.toLowerCase().includes(this.filters.search.trim().toLowerCase());
    this.filteredEvents = this.events.filter(e => Date.parse(e.createdAt) >= cutoff
      && (this.filters.timezone === 'All' || e.timezone === this.filters.timezone)
      && (this.filters.device === 'All' || e.device === this.filters.device)
      && (this.filters.source === 'All' || e.source === this.filters.source)
      && matches([e.sessionId, e.visitorId, e.reference, e.path, e.timezone, e.browser, e.source].join(' ')));
    this.visitors = visitorSessions(this.filteredEvents);
    this.filteredVisitors = this.visitors.filter(v => matches([v.visitorId, v.sessionId, v.paths.join(' '), v.browser, v.source, v.timezone].join(' ')));
    this.filteredBookings = this.bookings.filter(b => Date.parse(b.createdAt) >= cutoff
      && (this.filters.decision === 'All' || b.decision === this.filters.decision)
      && matches([b.reference, b.name, b.phone, b.stay, b.notes].join(' ')));
    this.filteredLeads = this.filteredBookings.filter(b => (this.filters.leadStatus === 'All' || (b.leadStatus || 'Pending') === this.filters.leadStatus)
      && (this.filters.whatsappStatus === 'All' || this.whatsappClicked(b.id) === (this.filters.whatsappStatus === 'Clicked')));
    this.bookingPage = Math.min(this.bookingPage, this.pages(this.filteredBookings.length));
    this.visitorPage = Math.min(this.visitorPage, this.pages(this.filteredVisitors.length));
    this.leadPage = Math.min(this.leadPage, this.pages(this.filteredLeads.length));
    this.eventPage = Math.min(this.eventPage, this.pages(this.filteredEvents.length));
    this.rebuildSummary();
  }
  private rebuildSummary(): void {
    const sessions = this.filteredVisitors;
    const sessionIds = new Set(sessions.map(s => s.sessionId));
    const clicks = this.filteredEvents.filter(e => e.kind === 'whatsapp_click' && sessionIds.has(e.sessionId));
    const clickSessions = new Set(clicks.map(e => e.sessionId));
    const paid = this.filteredBookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    this.stats = [
      { label: 'Observed sessions', value: String(sessions.length), detail: 'Recorded browser sessions in range', accent: 'blue' },
      { label: 'Recent sessions', value: String(sessions.filter(v => this.recent(v)).length), detail: 'Activity within the last 3 minutes', accent: 'green' },
      { label: 'Unique browsers', value: String(new Set(sessions.map(s => s.visitorId)).size), detail: 'Random browser IDs, not people', accent: 'purple' },
      { label: "Today's sessions", value: String(sessions.filter(s => s.date === indiaDate(this.now)).length), detail: 'India time, within loaded range', accent: 'green' },
      { label: 'Booking requests', value: String(this.filteredBookings.length), detail: this.filteredBookings.filter(b => b.decision === 'pending').length + ' awaiting availability review', accent: 'amber' },
      { label: 'WhatsApp clicks', value: String(clicks.length), detail: 'Link opens; delivery is not verified', accent: 'cyan' },
      { label: 'WhatsApp click-through', value: (sessions.length ? clickSessions.size / sessions.length * 100 : 0).toFixed(1) + '%', detail: 'Observed sessions with a WhatsApp click', accent: 'pink' },
      { label: 'Returning browsers', value: String(new Set(sessions.filter(s => s.returning).map(s => s.visitorId)).size), detail: 'Based on a browser-saved identifier', accent: 'violet' },
      { label: 'Recorded received', value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paid), detail: 'Payments entered by your admin', accent: 'orange' }
    ];
    const groups = new Map<string, { name: string; sessions: number; returning: number; clicks: number }>();
    sessions.forEach(s => { const row = groups.get(s.timezone) || { name: s.timezone, sessions: 0, returning: 0, clicks: 0 }; row.sessions++; row.returning += Number(s.returning); row.clicks += s.whatsappClicks; groups.set(s.timezone, row); });
    this.timezoneRows = [...groups.values()].sort((a, b) => b.sessions - a.sessions);
    const labels = new Set<string>();
    const days = Number.parseInt(this.filters.dateRange, 10);
    for (let i = days - 1; i >= 0; i--) labels.add(bucketDate(new Date(this.now - i * 86400000).toISOString(), this.interval));
    const buckets = [...labels].sort();
    const series = (dates: string[]) => { const counts = new Map<string, number>(); dates.forEach(date => { const bucket = bucketDate(date, this.interval); counts.set(bucket, (counts.get(bucket) || 0) + 1); }); return buckets.map(day => counts.get(day) || 0); };
    this.visitorTrendChartData = { labels: buckets, datasets: [{ label: 'Observed sessions', data: series(sessions.map(s => s.firstSeen)), borderColor: '#80b7c4', backgroundColor: 'rgba(128,183,196,.15)', fill: true, tension: .3 }] };
    this.leadTrendChartData = { labels: buckets, datasets: [{ label: 'Booking requests', data: series(this.filteredBookings.map(b => b.createdAt)), backgroundColor: '#a5dbaf' }] };
    this.deviceChartData = { labels: ['Mobile', 'Desktop', 'Tablet'], datasets: [{ data: ['Mobile', 'Desktop', 'Tablet'].map(d => sessions.filter(s => s.device === d).length), backgroundColor: ['#a5dbaf', '#80b7c4', '#d5ae6c'] }] };
    this.locationChartData = { labels: this.timezoneRows.slice(0, 8).map(r => r.name), datasets: [{ label: 'Sessions by browser time zone', data: this.timezoneRows.slice(0, 8).map(r => r.sessions), backgroundColor: '#a6a5d0' }] };
    this.notifications = [
      ...this.bookings.map(b => ({ title: 'Booking request saved', message: b.name + ' / ' + b.reference, time: b.createdAt })),
      ...this.audit.map(a => ({ title: this.actionLabel(a.action), message: a.reference, time: a.createdAt })),
      ...this.events.filter(e => ['whatsapp_click', 'booking_open', 'phone_click'].includes(e.kind)).map(e => ({ title: this.actionLabel(e.kind), message: e.path + (e.reference ? ' / ' + e.reference : ''), time: e.createdAt }))
    ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6);
  }
  actionLabel(action: string): string {
    return ({ page_view: 'Page viewed', booking_open: 'Booking form opened', booking_submitted: 'Booking form submitted', whatsapp_click: 'WhatsApp link clicked', phone_click: 'Phone link clicked', heartbeat: 'Visible session activity', booking_edited: 'Booking edited', booking_deleted: 'Booking deleted', decision_confirmed: 'Availability approved', decision_declined: 'Availability declined', lead_updated: 'Lead follow-up saved', payment_recorded: 'Payment record updated' } as Record<string, string>)[action] || action;
  }
  async resetPassword(): Promise<void> {
    if (this.resettingPassword) return;
    this.resettingPassword = true; this.settingsMessage = '';
    try { await this.authService.sendPasswordReset(); this.settingsMessage = 'Password reset email sent to your admin email address.'; }
    catch { this.settingsMessage = 'Could not send the reset email. Check your connection and sign in again.'; }
    finally { this.resettingPassword = false; }
  }
  exportVisitorsCsv(): void { this.exportCsv(this.filteredVisitors.map(s => ({ Session: s.sessionId, Visitor: s.visitorId, First: s.firstSeen, Last: s.lastSeen, Pages: s.pagesViewed, Paths: s.paths.join(' / '), Device: s.device, Browser: s.browser, OS: s.os, Timezone: s.timezone, Language: s.language, Source: s.source, Returning: s.returning, 'WhatsApp clicks': s.whatsappClicks, 'Observed seconds': s.elapsedSeconds })), 'visitors'); }
  exportLeadsCsv(): void { this.exportCsv(this.filteredLeads.map(b => ({ Reference: b.reference, Name: b.name, Phone: b.phone, Stay: b.stay, Submitted: b.createdAt, Status: b.leadStatus || 'Pending', Notes: b.leadNotes || '', 'WhatsApp clicked': this.whatsappClicked(b.id) })), 'leads'); }
  exportBookingsCsv(): void { this.exportCsv(this.filteredBookings.map(b => ({ Reference: b.reference, Submitted: b.createdAt, Name: b.name, Phone: b.phone, Stay: b.stay, 'Check-in': b.checkIn, 'Check-out': b.checkOut, Members: b.guests, Adults: b.adults, Kids: b.kids, Veg: b.veg, 'Non-veg': b.nonVeg, Quote: b.quote?.total || 0, Advance: b.quote?.advance || 0, Received: b.paidAmount || 0, Due: (b.quote?.total || 0) - (b.paidAmount || 0), Decision: b.decision, Comments: b.notes })), 'bookings'); }
  exportActivityCsv(): void { this.exportCsv(this.filteredEvents.map(e => ({ Time: e.createdAt, Action: e.kind, Session: e.sessionId, Visitor: e.visitorId, Path: e.path, Reference: e.reference, Timezone: e.timezone, Device: e.device, Browser: e.browser, OS: e.os, Source: e.source })), 'activity'); }
  exportCsv(rows: Record<string, string | number | boolean>[], name: string): void {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = '\uFEFF' + [headers.map(safeCsvCell).join(','), ...rows.map(row => headers.map(key => safeCsvCell(row[key])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = name + '.csv'; link.click(); URL.revokeObjectURL(url);
  }
  exportPdfReport(): void { window.print(); }
}
