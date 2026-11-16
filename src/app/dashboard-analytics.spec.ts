import { indiaDate, bucketDate, safeCsvCell, visitorSessions } from './dashboard-analytics';
import { UsageEvent } from './visitor-tracking.service';
const event = (changes: Partial<UsageEvent> = {}): UsageEvent => ({ id: 'event', visitorId: 'visitor', sessionId: 'session', kind: 'page_view', path: '/', reference: '', device: 'Mobile', browser: 'Chrome', os: 'Android', timezone: 'Asia/Kolkata', language: 'en-IN', source: 'Direct', returning: false, elapsedSeconds: 0, createdAt: '2026-11-07T00:00:00Z', ...changes });
describe('Dashboard analytics from observed events', () => {
  it('groups events into sessions without counting heartbeats as page views', () => {
    const rows = visitorSessions([event({ kind: 'heartbeat', elapsedSeconds: 120, createdAt: '2026-11-07T00:02:00Z' }), event(), event({ id: 'click', kind: 'whatsapp_click', createdAt: '2026-11-07T00:01:00Z' })]);
    expect(rows.length).toBe(1); expect(rows[0].pagesViewed).toBe(1); expect(rows[0].whatsappClicks).toBe(1);
    expect(rows[0].elapsedSeconds).toBe(120); expect(rows[0].lastSeen).toBe('2026-11-07T00:02:00Z');
  });
  it('uses India calendar dates and Monday week buckets', () => {
    expect(indiaDate('2026-11-07T20:00:00Z')).toBe('2026-11-08');
    expect(bucketDate('2026-11-08T00:00:00Z', 'weekly')).toBe('2026-11-02');
    expect(bucketDate('2026-11-08T00:00:00Z', 'monthly')).toBe('2026-11');
  });
  it('escapes CSV quotes and disables spreadsheet formulas', () => {
    expect(safeCsvCell('=1+1')).toBe('"\'=1+1"');
    expect(safeCsvCell('Guest "One"')).toBe('"Guest ""One"""');
  });
});
