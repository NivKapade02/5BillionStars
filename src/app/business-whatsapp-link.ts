/** Targets the Business app on Android without changing the recipient or message. */
export function businessWhatsAppLink(webUrl: string, userAgent: string): string {
  if (!/Android/i.test(userAgent)) return webUrl;
  const url = new URL(webUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'wa.me') return webUrl;
  const phone = url.pathname.slice(1);
  if (!/^[1-9][0-9]{7,14}$/.test(phone)) return webUrl;
  const text = encodeURIComponent(url.searchParams.get('text') || '');
  // If Business is not installed, offer its official listing rather than opening
  // a personal WhatsApp account automatically.
  const fallback = encodeURIComponent('https://play.google.com/store/apps/details?id=com.whatsapp.w4b');
  return `intent://send?phone=${phone}&text=${text}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=${fallback};end`;
}
