import { calculateBookingQuote } from './booking-quote';

describe('Booking amount calculation', () => {
  it('charges tent adults and children for each night and calculates 40% advance', () => {
    const quote = calculateBookingQuote('Tent Stay (2-3 people)', '2026-11-02', '2026-11-05', 30, 20)!;
    expect(quote.nights).toBe(3);
    expect(quote.adultTotal).toBe(89910);
    expect(quote.childTotal).toBe(42000);
    expect(quote.total).toBe(131910);
    expect(quote.advance).toBe(52764);
    expect(quote.balance).toBe(79146);
  });

  it('uses the cottage rate and preserves paise in the advance and balance', () => {
    const quote = calculateBookingQuote('Cottage Stay (4-5 people)', '2026-11-02', '2026-11-03', 1, 1)!;
    expect(quote.total).toBe(2199);
    expect(quote.advance).toBe(879.6);
    expect(quote.balance).toBe(1319.4);
  });

  it('does not produce an amount for incomplete or invalid details', () => {
    expect(calculateBookingQuote('', '2026-11-02', '2026-11-03', 2, 0)).toBeNull();
    expect(calculateBookingQuote('Tent Stay (2-3 people)', '2026-11-03', '2026-11-02', 2, 0)).toBeNull();
    expect(calculateBookingQuote('Tent Stay (2-3 people)', '2026-02-30', '2026-03-03', 2, 0)).toBeNull();
    expect(calculateBookingQuote('Tent Stay (2-3 people)', '2026-11-02', '2026-11-03', null, 0)).toBeNull();
  });
});
