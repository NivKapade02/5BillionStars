import { BookingQuote } from './booking-quote';

export interface ReceiptImageDetails {
  quote: BookingQuote; name: string; stay: string; checkIn: string; checkOut: string;
  adults: number | null; kids: number | null; underFive: number; reference: string;
}

/** Render a portable receipt image without uploading guest details to another service. */
export async function createReceiptImage(details: ReceiptImageDetails): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1700;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Receipt image is unavailable.');
  context.scale(2, 2);
  const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  const q = details.quote;
  let y = 30;
  const text = (value: string, size = 14, bold = false, color = '#352619') => {
    context.font = `${bold ? '700' : '400'} ${size}px Arial, sans-serif`;
    context.fillStyle = color;
    // Wrap guest names and other long text inside the image boundaries.
    let line = '';
    for (const word of value.split(/\s+/)) {
      const candidate = line ? line + ' ' + word : word;
      if (context.measureText(candidate).width > 520 && line) {
        context.fillText(line, 40, y);
        y += size + 9;
        line = word;
      } else line = candidate;
    }
    context.fillText(line, 40, y);
    y += size + 12;
  };
  const row = (label: string, value: string, bold = false) => {
    context.font = `${bold ? '700' : '400'} 14px Arial, sans-serif`;
    context.fillStyle = '#352619';
    context.fillText(label, 40, y);
    context.textAlign = 'right';
    context.fillText(value, 560, y);
    context.textAlign = 'left';
    y += 20;
    context.strokeStyle = '#e5d4bd';
    context.beginPath(); context.moveTo(40, y); context.lineTo(560, y); context.stroke();
    y += 32;
  };
  context.fillStyle = '#fffdf9'; context.fillRect(0, 0, 600, 850);
  context.fillStyle = '#4a3222'; context.fillRect(0, 0, 600, 130);
  text('5 BILLION STARS', 12, true, '#ffffff');
  text('Booking payment summary', 24, true, '#ffffff');
  text('Estimate · Payment not verified', 12, false, '#f1d3ac');
  y = 165;
  text(details.name.trim() || 'Guest', 19, true);
  text(details.stay, 16);
  text(`${details.checkIn} → ${details.checkOut} · ${q.nights} night(s)`, 15);
  if (details.reference) text('Reference: ' + details.reference, 11);
  y += 14;
  row(`Adults: ${details.adults} × ${money(q.adultRate)} × ${q.nights} nights`, money(q.adultTotal));
  row(`Children 5–10: ${details.kids} × ${money(q.childRate)} × ${q.nights} nights`, money(q.childTotal));
  row(`Children under 5: ${details.underFive}`, 'Free');
  row('Total · meals & taxes included', money(q.total), true);
  context.fillStyle = '#bc6c25'; context.fillRect(28, y - 12, 544, 66);
  y += 26;
  text('40% advance to pay: ' + money(q.advance), 23, true, '#ffffff');
  y += 28;
  text('Remaining balance: ' + money(q.balance), 15, true);
  y += 8;
  text('Google Pay / PhonePe: 8624908808', 20, true);
  text('Confirm availability with our team before paying.', 13);
  text('Share your payment screenshot and booking reference on WhatsApp.', 13);
  text('Our team verifies payment and confirms your booking.', 13);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not create receipt image.')), 'image/png'));
  return new File([blob], `5-billion-stars-receipt-${details.reference || 'estimate'}.png`, { type: 'image/png' });
}
