import { BOOKING_TERMS, STAY_PRICING } from './stay-pricing';

export interface BookingQuote {
  nights: number; adultRate: number; childRate: number;
  adultTotal: number; childTotal: number; total: number; advance: number; balance: number;
}

export function calculateBookingQuote(stay: string, checkIn: string, checkOut: string, adults: number | null, kids: number | null): BookingQuote | null {
  const rate = stay === 'Tent Stay (2-3 people)' ? STAY_PRICING.tent.offer : stay === 'Cottage Stay (4-5 people)' ? STAY_PRICING.cottage.offer : 0;
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!rate || !validDate(checkIn) || !validDate(checkOut) || adults === null || kids === null || !Number.isInteger(adults) || !Number.isInteger(kids) || adults < 1 || kids < 0 || adults + kids > 50) return null;
  const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000;
  if (nights < 1) return null;
  const adultTotal = adults * rate * nights;
  const childTotal = kids * BOOKING_TERMS.childRate * nights;
  const total = adultTotal + childTotal;
  const advance = Math.round(total * BOOKING_TERMS.advancePercent) / 100;
  return { nights, adultRate: rate, childRate: BOOKING_TERMS.childRate, adultTotal, childTotal, total, advance, balance: Math.round((total - advance) * 100) / 100 };
}
