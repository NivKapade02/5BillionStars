import { BookingReceiptComponent } from './booking-receipt.component';
import { calculateBookingQuote } from './booking-quote';
import { createReceiptImage } from './receipt-image';

describe('Receipt image sharing', () => {
  const quote = calculateBookingQuote('Cottage Stay (4-5 people)', '2026-11-02', '2026-11-03', 2, 0)!;
  const details = { quote, name: 'Guest Family', stay: 'Cottage Stay (4-5 people)', checkIn: '2026-11-02', checkOut: '2026-11-03', adults: 2, kids: 0, underFive: 1, reference: 'test-booking' };
  let shareDescriptor: PropertyDescriptor | undefined;
  let canShareDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    shareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'share');
    canShareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'canShare');
  });

  afterEach(() => {
    if (shareDescriptor) Object.defineProperty(navigator, 'share', shareDescriptor);
    else delete (navigator as unknown as Record<string, unknown>)['share'];
    if (canShareDescriptor) Object.defineProperty(navigator, 'canShare', canShareDescriptor);
    else delete (navigator as unknown as Record<string, unknown>)['canShare'];
  });

  it('creates a decodable PNG image ready to attach in WhatsApp', async () => {
    const file = await createReceiptImage(details);
    expect(file.type).toBe('image/png');
    expect(file.name).toContain('test-booking');
    expect(file.size).toBeGreaterThan(1000);
    const bitmap = await createImageBitmap(file);
    expect(bitmap.width).toBe(1200);
    expect(bitmap.height).toBe(1700);
    bitmap.close();
  });

  it('passes the receipt image to the native share menu when supported', async () => {
    const share = jasmine.createSpy('share').and.resolveTo();
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    const component = Object.assign(new BookingReceiptComponent(), details);
    await component.shareReceipt();
    expect(share).toHaveBeenCalled();
    expect(share.calls.mostRecent().args[0].files[0].type).toBe('image/png');
    expect(component.sharing).toBeFalse();
    expect(component.shareStatus).toBe('');
  });

  it('downloads an image when file sharing is unsupported', async () => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    const component = Object.assign(new BookingReceiptComponent(), details);
    await component.shareReceipt();
    expect(click).toHaveBeenCalled();
    expect(component.shareStatus).toContain('Receipt downloaded');
    expect(component.receiptChatUrl).toContain('wa.me/918624908808');
  });
});
