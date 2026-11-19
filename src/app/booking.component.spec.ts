import { TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { BookingComponent } from './booking.component';
import { FirebaseBookingService } from './firebase-booking.service';
const validForm = { invalid: false } as NgForm;
const validBooking = {
  firstName:'Website', lastName:'Guest', phone:'9876543210',
  checkIn:'2099-01-01', checkOut:'2099-01-03', guests:3, adults:2, kids:1, veg:1, nonVeg:2, notes:'Lake view'
};
describe('WhatsApp booking requests saved before WhatsApp handoff', async () => {
  let component:BookingComponent;
  let store: jasmine.SpyObj<FirebaseBookingService>;
  beforeEach(() => { store = jasmine.createSpyObj<FirebaseBookingService>('FirebaseBookingService', ['save']); store.save.and.resolveTo(); component = new BookingComponent(store); component.stayPreference='Tent Stay (2-3 people)'; component.booking={...validBooking}; });
  it('prepares all guest details and per-night estimates while saving the request without claiming WhatsApp delivery', async () => {
    const fetcher=store.save;const open=spyOn(window,'open');const save=spyOn(Storage.prototype,'setItem');
    await component.submit(validForm);
    const url=new URL(component.whatsappUrl), message=url.searchParams.get('text')!;
    expect(url.pathname).toBe('/918624908808');expect(message).toContain('Guest WhatsApp: +919876543210');
    expect(message).not.toContain('Alternate mobile:');expect(message).toContain('Guests: 3');expect(message).toContain('Lake view');
    expect(message).toContain('Nights: 2');expect(message).toMatch(/TOTAL +INR 5400\.00/);
    expect(message).toContain('All meals and taxes included');
    expect(message.startsWith('```\n')).toBeTrue();expect(message.endsWith('\n```')).toBeTrue();
    expect(message).toMatch(/40% ADVANCE +INR 2160\.00/);
    expect(message).toMatch(/REMAINING BALANCE +INR 3240\.00/);
    expect(message).toContain('Payment status: NOT VERIFIED');
    expect(message).toContain('subject to team confirmation');expect(fetcher).toHaveBeenCalledWith(component.reference, jasmine.objectContaining({ name: 'Website Guest', phone: '+919876543210', adults: 2, kids: 1, guests: 3 }), jasmine.any(String));expect(open).not.toHaveBeenCalled();expect(save).not.toHaveBeenCalled();
  });
  it('keeps the form available when saving fails and reuses the reference for a retry', async () => {
    const fetcher = store.save;
    fetcher.and.rejectWith(new Error('Offline'));
    await component.submit(validForm);
    expect(component.whatsappUrl).toBe('');
    expect(component.error).toContain('Could not save');
    expect(component.submitting).toBeFalse();
    const reference = component.reference;
    fetcher.and.resolveTo();
    await component.submit(validForm);
    expect(component.reference).toBe(reference);
    expect(component.whatsappUrl).toContain('https://wa.me/');
  });

  it('defaults to regular and saves event selection in the record and WhatsApp request', async () => {
    expect(component.bookingType).toBe('regular');
    await component.submit(validForm);
    expect(component.savedBookingMessage).toContain('Booking type: Regular booking');
    expect(store.save.calls.mostRecent().args[1].bookingType).toBe('regular');
    const reference = component.reference;
    const total = component.quote!.total;
    component.bookingType = 'event';
    await component.submit(validForm);
    expect(component.reference).not.toBe(reference);
    expect(component.savedBookingMessage).toContain('Booking type: Event booking');
    expect(store.save.calls.mostRecent().args[1].bookingType).toBe('event');
    expect(component.quote!.total).toBe(total);
  });
  it('rejects past dates, invalid phones and inconsistent guest or meal counts', async () => {
    component.booking.checkIn='2000-01-01';await component.submit(validForm);expect(component.error).toContain('today');
    component.booking={...validBooking,phone:'123'};await component.submit(validForm);expect(component.error).toContain('mobile');
    component.booking={...validBooking,kids:2};await component.submit(validForm);expect(component.error).toContain('exceed');
    component.booking={...validBooking,nonVeg:0};await component.submit(validForm);expect(component.error).toContain('Veg');expect(component.whatsappUrl).toBe('');
  });
  it('keeps the reference for the same request and updates it for changed details', async () => {
    await component.submit(validForm);const reference=component.reference;await component.submit(validForm);expect(component.reference).toBe(reference);
    component.booking.notes='Changed';await component.submit(validForm);expect(component.reference).not.toBe(reference);
    component.startNewRequest('Cottage Stay (4-5 people)');expect(component.whatsappUrl).toBe('');expect(component.stayPreference).toContain('Cottage');
  });
  it('derives free under-five children from the member total without adding them to the price', async () => {
    component.booking={...validBooking,guests:4,nonVeg:3};await component.submit(validForm);
    expect(component.error).toBe('');expect(component.underFive).toBe(1);
    expect(component.savedBookingMessage).not.toContain('Children under 5');
    expect(component.quote?.total).toBe(5400);
  });
  it('uses Firebase storage and enables submission only when required fields are complete', async () => {
    const fetcher=store.save;await TestBed.configureTestingModule({imports:[BookingComponent],providers:[{provide:FirebaseBookingService,useValue:store}]}).compileComponents();
    const fixture=TestBed.createComponent(BookingComponent);fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
    const root=fixture.nativeElement as HTMLElement;
    const regularRadio = root.querySelector<HTMLInputElement>('input[name="bookingType"][value="regular"]')!;
    const eventRadio = root.querySelector<HTMLInputElement>('input[name="bookingType"][value="event"]')!;
    expect(regularRadio.type).toBe('radio');
    expect(regularRadio.checked).toBeTrue();
    expect(eventRadio.checked).toBeFalse();
    expect(root.querySelector('.event-examples')).toBeNull();
    expect(eventRadio.compareDocumentPosition(root.querySelector('[name="stayPreference"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    eventRadio.click(); fixture.detectChanges();
    expect(fixture.componentInstance.bookingType).toBe('event');
    expect(eventRadio.checked).toBeTrue();
    expect(regularRadio.checked).toBeFalse();
    expect(root.querySelector('.booking-type-group')?.textContent).toContain('31st December, Holi');
    regularRadio.click(); fixture.detectChanges();
    expect(root.querySelector('.event-examples')).toBeNull();
    expect(root.querySelectorAll('[name="guests"]').length).toBe(1);
    expect(root.querySelector('[name="phone"]')?.closest('.phone-row')).toBe(root.querySelector('[name="guests"]')?.closest('.phone-row'));
    expect(root.querySelector('[name="alternativePhone"]')).toBeNull();expect(root.querySelector('[name="underFive"]')).toBeNull();
    expect(root.textContent).toContain('Children under 5 years stay free.');
    const button=()=>fixture.nativeElement.querySelector('button.submit') as HTMLButtonElement;
    expect(button().disabled).toBeFalse();button().click();fixture.detectChanges();expect(root.querySelectorAll('.field-error').length).toBeGreaterThan(0);expect(fetcher).not.toHaveBeenCalled();fixture.componentInstance.booking={...validBooking};fixture.componentInstance.stayPreference=component.stayPreference;
    fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();expect(button().disabled).toBeFalse();
    button().click();await fixture.whenStable();fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('has not been sent yet');
    expect(fixture.nativeElement.querySelector('a.action').href).toContain('https://wa.me/918624908808');expect(fetcher).toHaveBeenCalled();fixture.destroy();
  });
});
