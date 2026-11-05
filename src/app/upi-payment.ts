export const PAYMENT_PAYEE = { upiId: '8624908808@hdfc', name: 'ASHWINI NIVRUTTEE KAPADE' } as const;
export function buildUpiPaymentUrl(amount: number, reference: string): string {
  if (!Number.isFinite(amount) || amount <= 0 || !reference.trim()) throw new Error('Save the booking before making payment.');
  return 'upi://pay?' + new URLSearchParams({ pa: PAYMENT_PAYEE.upiId, pn: PAYMENT_PAYEE.name, am: amount.toFixed(2), cu: 'INR', tr: reference, tn: '5 Billion Stars booking advance' }).toString();
}
