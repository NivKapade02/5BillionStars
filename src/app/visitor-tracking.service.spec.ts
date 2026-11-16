import { NgZone } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { UsageEventWriter, VisitorTrackingService, detectClient } from './visitor-tracking.service';
describe('Optional browser activity tracking', () => {
  let tracking: VisitorTrackingService;
  let writer: jasmine.SpyObj<UsageEventWriter>;
  let routes: Subject<NavigationEnd>;
  let router: { url: string; navigated: boolean; events: Subject<NavigationEnd> };
  beforeEach(() => {
    localStorage.removeItem('5bs-usage-tracking'); localStorage.removeItem('5bs-visitor'); sessionStorage.removeItem('5bs-session');
    spyOnProperty(navigator, 'doNotTrack', 'get').and.returnValue(null);
    routes = new Subject(); router = { url: '/book?phone=secret', navigated: true, events: routes };
    writer = jasmine.createSpyObj<UsageEventWriter>('writer', ['write']); writer.write.and.resolveTo();
    tracking = new VisitorTrackingService(router as unknown as Router, new NgZone({ enableLongStackTrace: false }), writer);
  });
  afterEach(() => { tracking.ngOnDestroy(); localStorage.removeItem('5bs-usage-tracking'); localStorage.removeItem('5bs-visitor'); sessionStorage.removeItem('5bs-session'); });
  it('stores only the page path and suppresses the initial duplicate page-view event', () => {
    tracking.start(); routes.next(new NavigationEnd(1, router.url, router.url));
    const pages = writer.write.calls.allArgs().filter(args => args[0].kind === 'page_view');
    expect(pages.length).toBe(1); expect(pages[0][0].path).toBe('/book');
    expect(JSON.stringify(pages[0][0])).not.toContain('phone=secret');
  });
  it('does not track admin routes or write while tracking is off', () => {
    router.url = '/admin'; tracking.start(); tracking.record('whatsapp_click'); expect(writer.write).not.toHaveBeenCalled();
    router.url = '/'; tracking.setEnabled(false); tracking.record('page_view'); expect(writer.write).not.toHaveBeenCalled();
    expect(localStorage.getItem('5bs-visitor')).toBeNull();
  });
  it('keeps link navigation available when telemetry fails and attaches the booking reference', () => {
    writer.write.and.rejectWith(new Error('Offline')); tracking.start();
    const wrapper = document.createElement('div'); wrapper.dataset['bookingReference'] = '12345678-1234-4234-8234-123456789abc';
    const anchor = document.createElement('a'); anchor.href = 'https://wa.me/918624908808'; anchor.textContent = 'WhatsApp'; wrapper.append(anchor); document.body.append(wrapper);
    anchor.addEventListener('click', e => e.preventDefault()); anchor.click(); wrapper.remove();
    const click = writer.write.calls.allArgs().find(args => args[0].kind === 'whatsapp_click');
    expect(click?.[0].reference).toBe('12345678-1234-4234-8234-123456789abc');
  });
  it('does not count a reload within the same session as a returning session', () => {
    tracking.start(); const first = writer.write.calls.mostRecent().args[0]; tracking.ngOnDestroy();
    tracking = new VisitorTrackingService(router as unknown as Router, new NgZone({ enableLongStackTrace: false }), writer);
    tracking.start(); const reloaded = writer.write.calls.mostRecent().args[0];
    expect(reloaded.sessionId).toBe(first.sessionId); expect(reloaded.returning).toBeFalse();
  });
  it('detects mobile devices and Edge without confusing it with Chrome', () => {
    expect(detectClient('Android Mobi Chrome/120').device).toBe('Mobile');
    expect(detectClient('Windows Chrome/120 Edg/120').browser).toBe('Edge');
  });
});
