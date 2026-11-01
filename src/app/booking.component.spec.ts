import { NgForm } from '@angular/forms';
import { BookingComponent } from './booking.component';

const validForm = { invalid: false } as NgForm;
const config = { whatsappNumber: '918624908808', googleSheetsWebAppUrl: 'https://script.google.com/macros/s/test-deployment/exec' };

describe('Booking form WhatsApp and Sheets flow', () => {
  let component: BookingComponent;
  let fetchSpy: jasmine.Spy;
  let popup: { opener: unknown; closed: boolean; location: { replace: jasmine.Spy }; close: jasmine.Spy };

  beforeEach(async () => {
    component = new BookingComponent();
    fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify(config)));
    popup = { opener: {}, closed: false, location: { replace: jasmine.createSpy('replace') }, close: jasmine.createSpy('close') };
    spyOn(window, 'open').and.returnValue(popup as unknown as Window);
    await component.ngOnInit();
    component.stayPreference = 'Tent Stay (2-3 people)';
    component.booking = { ...component.booking, dob: '1995-05-15', alternativePhone: '+919876543211', email: 'guest@example.com', adults: 2, kids: 0, veg: 1, nonVeg: 1, firstName: 'Guest', lastName: '& Friends', phone: '+919876543210', checkIn: '2099-01-01', checkOut: '2099-01-03', guests: 2, notes: 'Food & arrival\nLate check-in' };
  });

  it('waits for a confirmed sheet save before opening the complete WhatsApp message', async () => {
    fetchSpy.and.callFake(async (_url: string, options: RequestInit) => {
      expect(popup.location.replace).not.toHaveBeenCalled();
      expect(options.headers).toEqual({ 'Content-Type': 'text/plain;charset=utf-8' });
      const payload = JSON.parse(options.body as string);
      expect(payload.name).toBe('Guest & Friends');
      expect(payload.stayPreference).toBe('Tent Stay (2-3 people)');
      expect(payload.notes).toContain('Stay: Tent Stay (2-3 people)');
      expect(payload.notes).toContain('Alternate mobile: +919876543211');
      expect(payload.notes).toContain('Email: guest@example.com');
      expect(payload.dob).toBe('1995-05-15');
      expect(payload.notes).toContain('DOB: 1995-05-15');
      expect(payload.notes).toContain('Adults: 2\nKids: 0\nVeg: 1\nNon-veg: 1');
      expect(payload.notes).toContain('Food & arrival\nLate check-in');
      return new Response(JSON.stringify({ ok: true, id: payload.id }));
    });
    await component.submit(validForm);
    expect(component.reference).toBeTruthy();
    const url = new URL(component.whatsappUrl);
    expect(url.pathname).toBe('/918624908808');
    const text = url.searchParams.get('text') || '';
    expect(text).toContain('Date of birth: 1995-05-15');
    expect(text).toContain('Stay: Tent Stay (2-3 people)');
    for (const detail of ['Guest & Friends', '+919876543210', '+919876543211', 'guest@example.com', '2099-01-01', '2099-01-03', 'Guests: 2', 'Adults (above 10 years): 2', 'Kids (5-10 years): 0', 'Veg meals: 1', 'Non-veg meals: 1', 'Food & arrival\nLate check-in', component.reference]) expect(text).toContain(detail);
    expect(popup.location.replace).toHaveBeenCalledWith(component.whatsappUrl);
    expect(popup.opener).toBeNull();
  });

  it('keeps the form on save failure and reuses the request reference on retry', async () => {
    const ids: string[] = [];
    fetchSpy.and.callFake(async (_url: string, options: RequestInit) => {
      ids.push(JSON.parse(options.body as string).id);
      throw new TypeError('Network error');
    });
    await component.submit(validForm);
    await component.submit(validForm);
    expect(component.reference).toBe('');
    expect(component.error).toBeTruthy();
    expect(popup.location.replace).not.toHaveBeenCalled();
    expect(popup.close).toHaveBeenCalled();
    expect(ids[0]).toBe(ids[1]);
  });

  it('does not treat an opaque or negative save response as success', async () => {
    fetchSpy.and.resolveTo(new Response(JSON.stringify({ ok: false })));
    await component.submit(validForm);
    expect(component.reference).toBe('');
    expect(component.whatsappUrl).toBe('');
    expect(popup.location.replace).not.toHaveBeenCalled();
  });

  it('provides a WhatsApp fallback link when popups are blocked', async () => {
    (window.open as jasmine.Spy).and.returnValue(null);
    fetchSpy.and.callFake(async (_url: string, options: RequestInit) => new Response(JSON.stringify({ ok: true, id: JSON.parse(options.body as string).id })));
    await component.submit(validForm);
    expect(component.reference).toBeTruthy();
    expect(component.whatsappUrl).toContain('https://wa.me/918624908808?text=');
  });

  it('blocks submission when the sheet is unconfigured or dates are invalid', async () => {
    component.booking.checkOut = component.booking.checkIn;
    await component.submit(validForm);
    expect(window.open).not.toHaveBeenCalled();
    fetchSpy.and.resolveTo(new Response(JSON.stringify({ ...config, googleSheetsWebAppUrl: '' })));
    await component.ngOnInit();
    expect(component.available).toBeFalse();
  });

  it('includes free children under five in the guest total, saved notes and WhatsApp request', async () => {
    component.booking.underFive = 1;
    component.booking.guests = 3;
    component.booking.veg = 2;
    fetchSpy.and.callFake(async (_url: string, options: RequestInit) => {
      const payload = JSON.parse(options.body as string);
      expect(payload.underFive).toBe(1);
      expect(payload.notes).toContain('Under 5: 1');
      return new Response(JSON.stringify({ ok: true, id: payload.id }));
    });
    await component.submit(validForm);
    expect(component.error).toBe('');
    expect(decodeURIComponent(component.whatsappUrl)).toContain('Children under 5 (free): 1');
    expect(decodeURIComponent(component.whatsappUrl)).toContain('40% advance');
  });

  it('rejects inconsistent member and meal counts before opening WhatsApp', async () => {
    component.booking.kids = 1;
    await component.submit(validForm);
    expect(component.error).toContain('Adults, kids aged 5–10 and children under 5');
    component.booking.kids = 0;
    component.booking.nonVeg = 0;
    await component.submit(validForm);
    expect(component.error).toContain('Veg and non-veg');
    expect(window.open).not.toHaveBeenCalled();
  });

  it('blocks past dates and clears checkout when the new check-in makes it invalid', async () => {
    component.booking.checkIn = '2000-01-01';
    expect(component.minimumCheckOut).toBe(component.today);
    await component.submit(validForm);
    expect(component.error).toContain('today or later');
    expect(window.open).not.toHaveBeenCalled();
    component.booking.checkOut = '2099-01-03';
    component.setCheckIn('2099-01-03');
    expect(component.minimumCheckOut).toBe('2099-01-04');
    expect(component.booking.checkOut).toBe('');
    component.setCheckIn('2099-12-31');
    expect(component.minimumCheckOut).toBe('2100-01-01');
  });

  it('rejects future or invalid dates of birth before saving or opening WhatsApp', async () => {
    for (const dob of ['', '2099-01-01', '1995-02-30', 'invalid']) {
      component.booking.dob = dob;
      await component.submit(validForm);
      expect(component.error).toContain('Date of birth');
    }
    expect(window.open).not.toHaveBeenCalled();
    expect(fetchSpy.calls.count()).toBe(1);
  });

  it('requires a valid email before saving or opening WhatsApp', async () => {
    for (const email of ['', '   ', 'invalid']) {
      component.booking.email = email;
      await component.submit(validForm);
      expect(component.error).toContain('valid email');
    }
    expect(window.open).not.toHaveBeenCalled();
    expect(fetchSpy.calls.count()).toBe(1);
  });

  it('requires both name fields before saving or opening WhatsApp', async () => {
    component.booking.lastName = '   ';
    await component.submit(validForm);
    expect(component.error).toContain('first name and last name');
    expect(window.open).not.toHaveBeenCalled();
    expect(fetchSpy.calls.count()).toBe(1);
  });

  it('normalizes both country codes and preserves the complete details within the deployed sheet limit', async () => {
    component.booking.phone = '9876543210';
    component.booking.alternativePhone = '9876543211';
    component.booking.email = 'a'.repeat(88) + '@example.com';
    component.booking.notes = 'n'.repeat(200);
    fetchSpy.and.callFake(async (_url: string, options: RequestInit) => {
      const payload = JSON.parse(options.body as string);
      expect(payload.phone).toBe('+919876543210');
      expect(payload.alternativePhone).toBe('+919876543211');
      expect(payload.notes.length).toBeLessThanOrEqual(500);
      expect(payload.notes).toContain(component.booking.email);
      expect(payload.notes).toContain('n'.repeat(200));
      return new Response(JSON.stringify({ ok: true, id: payload.id }));
    });
    await component.submit(validForm);
    expect(component.reference).toBeTruthy();
  });
});
