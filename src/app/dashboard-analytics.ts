import type { UsageEvent } from './visitor-tracking.service';
export interface VisitorSession {
  sessionId: string; visitorId: string; firstSeen: string; lastSeen: string; date: string;
  device: string; browser: string; os: string; timezone: string; language: string; source: string;
  returning: boolean; pagesViewed: number; paths: string[]; whatsappClicks: number; elapsedSeconds: number;
}
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
export function indiaDate(value: string | number): string {
  return dayFormatter.format(new Date(value));
}
export function visitorSessions(events: UsageEvent[]): VisitorSession[] {
  const sessions = new Map<string, VisitorSession>();
  for (const e of [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    let s = sessions.get(e.sessionId);
    if (!s) {
      s = { sessionId: e.sessionId, visitorId: e.visitorId, firstSeen: e.createdAt, lastSeen: e.createdAt,
        date: indiaDate(e.createdAt), device: e.device, browser: e.browser, os: e.os, timezone: e.timezone,
        language: e.language, source: e.source, returning: e.returning, pagesViewed: 0, paths: [], whatsappClicks: 0, elapsedSeconds: 0 };
      sessions.set(e.sessionId, s);
    }
    s.lastSeen = e.createdAt;
    s.returning ||= e.returning;
    s.pagesViewed += e.kind === 'page_view' ? 1 : 0;
    s.whatsappClicks += e.kind === 'whatsapp_click' ? 1 : 0;
    s.elapsedSeconds = Math.max(s.elapsedSeconds, e.elapsedSeconds);
    if (!s.paths.includes(e.path)) s.paths.push(e.path);
  }
  return [...sessions.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}
export function bucketDate(value: string, interval: 'daily' | 'weekly' | 'monthly'): string {
  const day = indiaDate(value);
  if (interval === 'monthly') return day.slice(0, 7);
  if (interval === 'daily') return day;
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}
export function safeCsvCell(value: unknown): string {
  const text = String(value ?? '');
  return '"' + (/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"';
}
