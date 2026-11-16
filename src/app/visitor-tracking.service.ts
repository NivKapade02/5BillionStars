import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { getUsageFirebase } from './firebase-client';

export type TrackingKind = 'page_view' | 'booking_open' | 'booking_submitted' | 'whatsapp_click' | 'phone_click' | 'heartbeat';
export interface UsageEvent {
  id: string; visitorId: string; sessionId: string; kind: TrackingKind; path: string;
  reference: string; device: string; browser: string; os: string; timezone: string;
  language: string; source: string; returning: boolean; elapsedSeconds: number; createdAt: string;
}
interface Session { id: string; started: number; last: number; returning: boolean; }
export function detectClient(userAgent: string) {
  return {
    device: /iPad|Tablet|Android(?!.*Mobi)/i.test(userAgent) ? 'Tablet' : /Mobi|Android/i.test(userAgent) ? 'Mobile' : 'Desktop',
    browser: /Edg\/|EdgA\/|EdgiOS\//.test(userAgent) ? 'Edge' : /Firefox\/|FxiOS\//.test(userAgent) ? 'Firefox' : /Chrome\/|CriOS\//.test(userAgent) ? 'Chrome' : /Safari\//.test(userAgent) ? 'Safari' : 'Other',
    os: /Android/.test(userAgent) ? 'Android' : /iPhone|iPad/.test(userAgent) ? 'iOS' : /Windows/.test(userAgent) ? 'Windows' : /Mac/.test(userAgent) ? 'macOS' : /Linux/.test(userAgent) ? 'Linux' : 'Other'
  };
}

@Injectable({ providedIn: 'root' })
export class UsageEventWriter {
  async write(details: Omit<UsageEvent, 'id' | 'createdAt'>, allowed: () => boolean): Promise<void> {
    if (!allowed()) return;
    const { db, firestoreSdk: sdk } = await getUsageFirebase();
    if (!allowed()) return;
    await sdk.setDoc(sdk.doc(db, 'usageEvents', crypto.randomUUID()), { ...details, createdAt: sdk.serverTimestamp() });
  }
}

@Injectable({ providedIn: 'root' })
export class VisitorTrackingService implements OnDestroy {
  private running = false;
  private routeSubscription?: Subscription;
  private heartbeat?: ReturnType<typeof setInterval>;
  private visitorId = '';
  private returning = false;
  private session?: Session;
  private lastClick = 0;
  private source = 'Direct';
  private lastPage = '';
  private lastPageAt = 0;
  constructor(private readonly router: Router, private readonly zone: NgZone, private readonly writer: UsageEventWriter) {}
  get browserDisabled(): boolean { return typeof window === 'undefined' || navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true; }
  get enabled(): boolean {
    if (this.browserDisabled) return false;
    try { return localStorage.getItem('5bs-usage-tracking') !== 'off'; } catch { return false; }
  }
  setEnabled(value: boolean): void {
    try { localStorage.setItem('5bs-usage-tracking', value ? 'on' : 'off'); } catch { return; }
    if (!value) {
      try { localStorage.removeItem('5bs-visitor'); sessionStorage.removeItem('5bs-session'); } catch { /* Storage may be unavailable. */ }
      this.visitorId = ''; this.session = undefined; this.lastPage = ''; this.lastPageAt = 0;
    } else this.record('page_view');
  }
  start(): void {
    if (this.running || typeof window === 'undefined') return;
    this.running = true;
    try { this.source = document.referrer ? new URL(document.referrer).hostname.slice(0, 120) : 'Direct'; } catch { this.source = 'Direct'; }
    this.routeSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) this.record('page_view');
    });
    document.addEventListener('click', this.onClick, true);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.zone.runOutsideAngular(() => {
      this.heartbeat = setInterval(() => { if (!document.hidden) this.record('heartbeat'); }, 120000);
    });
    if (this.router.navigated) this.record('page_view');
  }
  private readonly onVisibility = () => { if (!document.hidden) this.record('heartbeat'); };
  private readonly onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const link = target?.closest<HTMLAnchorElement>('a[href]');
    if (!link || Date.now() - this.lastClick < 1000) return;
    const kind = /^(https:\/\/wa\.me\/|https:\/\/api\.whatsapp\.com\/)/.test(link.href) ? 'whatsapp_click' : link.href.startsWith('tel:') ? 'phone_click' : null;
    if (!kind) return;
    this.lastClick = Date.now();
    this.record(kind, link.closest<HTMLElement>('[data-booking-reference]')?.dataset['bookingReference'] || '');
  };
  record(kind: TrackingKind, reference = ''): void {
    if (!this.running || !this.enabled || this.router.url.startsWith('/admin')) return;
    // No query strings, names, phone numbers, message contents, IPs or coordinates.
    const path = this.router.url.split(/[?#]/)[0];
    if (!['/', '/book', '/policies'].includes(path)) return;
    const now = Date.now();
    if (kind === 'page_view') {
      if (path === this.lastPage && now - this.lastPageAt < 1000) return;
      this.lastPage = path; this.lastPageAt = now;
    }
    try {
      if (!this.visitorId) {
        const previous = localStorage.getItem('5bs-visitor');
        this.returning = !!previous && /^[a-f0-9-]{36}$/.test(previous);
        this.visitorId = previous && /^[a-f0-9-]{36}$/.test(previous) ? previous : crypto.randomUUID();
        localStorage.setItem('5bs-visitor', this.visitorId);
        try { this.session = JSON.parse(sessionStorage.getItem('5bs-session') || 'null'); } catch { this.session = undefined; }
      }
      if (!this.session || !/^[a-f0-9-]{36}$/.test(this.session.id) || !Number.isFinite(this.session.started) || !Number.isFinite(this.session.last) || now - this.session.last > 1800000 || now - this.session.started > 86400000) {
        this.session = { id: crypto.randomUUID(), started: now, last: now, returning: this.returning || !!this.session };
      }
      this.returning = this.session.returning === true;
      this.session.last = now;
      sessionStorage.setItem('5bs-session', JSON.stringify(this.session));
    } catch { return; }
    const details = { visitorId: this.visitorId, sessionId: this.session.id, kind, path,
      reference: /^[a-f0-9-]{36}$/.test(reference) ? reference : '',
      ...detectClient(navigator.userAgent), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 64),
      language: navigator.language.slice(0, 35), source: this.source, returning: this.returning,
      elapsedSeconds: Math.min(86400, Math.max(0, Math.floor((now - this.session.started) / 1000))) };
    void this.writer.write(details, () => this.enabled && !this.router.url.startsWith('/admin'))
      .catch(() => { /* Optional telemetry must never prevent a booking or navigation. */ });
  }
  ngOnDestroy(): void {
    if (typeof window === 'undefined') return;
    this.running = false;
    this.routeSubscription?.unsubscribe();
    if (this.heartbeat) clearInterval(this.heartbeat);
    document.removeEventListener('click', this.onClick, true);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
