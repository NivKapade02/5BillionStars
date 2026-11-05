import { TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { BookingComponent } from './booking.component';
const validForm = { invalid: false } as NgForm;
const validBooking = {
  firstName:'Website', lastName:'Guest', phone:'9876543210',
  checkIn:'2099-01-01', checkOut:'2099-01-03', guests:3, adults:2, kids:1, veg:1, nonVeg:2, notes:'Lake view'
};
describe('WhatsApp booking requests without a backend', () => {
  let component:BookingComponent;
  beforeEach(() => { component = new BookingComponent(); component.stayPreference='Tent Stay (2-3 people)'; component.booking={...validBooking}; });
  it('prepares all guest details and per-night estimates without fetching, storing or claiming delivery', () => {
    const fetcher=spyOn(window,'fetch');const open=spyOn(window,'open');const save=spyOn(Storage.prototype,'setItem');
    component.submit(validForm);
    const url=new URL(component.whatsappUrl), message=url.searchParams.get('text')!;
    expect(url.pathname).toBe('/918624908808');expect(message).toContain('Guest WhatsApp: +919876543210');
    expect(message).not.toContain('Alternate mobile:');expect(message).toContain('Guests: 3');expect(message).toContain('Lake view');
    expect(message).toContain('Nights: 2');expect(message).toContain('Total including meals and taxes: INR 5396.00');
    expect(message).toContain('40% advance after availability is agreed: INR 2158.40');
    expect(message).toContain('subject to team confirmation');expect(fetcher).not.toHaveBeenCalled();expect(open).not.toHaveBeenCalled();expect(save).not.toHaveBeenCalled();
  });
  it('rejects past dates, invalid phones and inconsistent guest or meal counts', () => {
    component.booking.checkIn='2000-01-01';component.submit(validForm);expect(component.error).toContain('today');
    component.booking={...validBooking,phone:'123'};component.submit(validForm);expect(component.error).toContain('mobile');
    component.booking={...validBooking,kids:2};component.submit(validForm);expect(component.error).toContain('exceed');
    component.booking={...validBooking,nonVeg:0};component.submit(validForm);expect(component.error).toContain('Veg');expect(component.whatsappUrl).toBe('');
  });
  it('keeps the reference for the same request and updates it for changed details', () => {
    component.submit(validForm);const reference=component.reference;component.submit(validForm);expect(component.reference).toBe(reference);
    component.booking.notes='Changed';component.submit(validForm);expect(component.reference).not.toBe(reference);
    component.startNewRequest('Cottage Stay (4-5 people)');expect(component.whatsappUrl).toBe('');expect(component.stayPreference).toContain('Cottage');
  });
  it('derives free under-five children from the member total without adding them to the price', () => {
    component.booking={...validBooking,guests:4,nonVeg:3};component.submit(validForm);
    expect(component.error).toBe('');expect(component.underFive).toBe(1);
    expect(component.savedBookingMessage).toContain('Children under 5 (free): 1');
    expect(component.quote?.total).toBe(5396);
  });
  it('works without Google setup and enables submission only when required fields are complete', async () => {
    const fetcher=spyOn(window,'fetch');await TestBed.configureTestingModule({imports:[BookingComponent]}).compileComponents();
    const fixture=TestBed.createComponent(BookingComponent);fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
    const root=fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('[name="guests"]').length).toBe(1);
    expect(root.querySelector('[name="phone"]')?.closest('.phone-row')).toBe(root.querySelector('[name="guests"]')?.closest('.phone-row'));
    expect(root.querySelector('[name="alternativePhone"]')).toBeNull();expect(root.querySelector('[name="underFive"]')).toBeNull();
    expect(root.textContent).toContain('Children under 5 years stay free.');
    const button=()=>fixture.nativeElement.querySelector('button.submit') as HTMLButtonElement;
    expect(button().disabled).toBeTrue();fixture.componentInstance.booking={...validBooking};fixture.componentInstance.stayPreference=component.stayPreference;
    fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();expect(button().disabled).toBeFalse();
    button().click();fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('has not been sent yet');
    expect(fixture.nativeElement.querySelector('a.action').href).toContain('https://wa.me/918624908808');expect(fetcher).not.toHaveBeenCalled();fixture.destroy();
  });
});
