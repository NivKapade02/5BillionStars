import { businessWhatsAppLink } from './business-whatsapp-link';

describe('Admin WhatsApp Business handoff', () => {
  const message = 'Hello Guest,\nYour stay: ₹999/- & details #1; please confirm.';
  const webUrl = 'https://wa.me/919876543210?text=' + encodeURIComponent(message);

  it('targets the Android Business package and preserves the customer and message', () => {
    const link = businessWhatsAppLink(webUrl, 'Mozilla/5.0 (Linux; Android 14) Chrome/131');
    expect(link).toContain('package=com.whatsapp.w4b;');
    const query = new URLSearchParams(link.split('?')[1].split('#Intent;')[0]);
    expect(query.get('phone')).toBe('919876543210');
    expect(query.get('text')).toBe(message);
  });

  it('offers the official Business app if it is missing instead of a personal-account fallback', () => {
    const link = businessWhatsAppLink(webUrl, 'Android');
    const fallback = decodeURIComponent(link.split('S.browser_fallback_url=')[1].split(';end')[0]);
    expect(fallback).toBe('https://play.google.com/store/apps/details?id=com.whatsapp.w4b');
  });

  it('keeps normal links on desktop and iPhone', () => {
    for (const agent of ['Windows Chrome', 'iPhone Safari']) expect(businessWhatsAppLink(webUrl, agent)).toBe(webUrl);
  });

  it('does not turn unrelated or invalid-recipient links into app intents', () => {
    for (const link of ['https://example.com/919876543210', 'https://wa.me/invalid']) expect(businessWhatsAppLink(link, 'Android')).toBe(link);
  });
});
