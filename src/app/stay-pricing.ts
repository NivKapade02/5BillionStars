export const STAY_PRICING = {
  tent: { regular: 1199, offer: 999 },
  cottage: { regular: 1799, offer: 1599 }
} as const;

export const BOOKING_TERMS = { advancePercent: 40, networkHandlingRate: 1, childRate: 700, paymentNumber: '8624908808', contact: 'our team' } as const;

export const ADULT_NIGHT_TOTALS = {
  tent: STAY_PRICING.tent.offer + BOOKING_TERMS.networkHandlingRate,
  cottage: STAY_PRICING.cottage.offer + BOOKING_TERMS.networkHandlingRate
} as const;

