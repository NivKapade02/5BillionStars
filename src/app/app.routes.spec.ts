import { TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { HomeComponent } from './home.component';
import { BookingComponent } from './booking.component';

describe('Camping website and booking dialog', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    spyOn(window, 'fetch').and.callFake(async (_url: RequestInfo | URL, options?: RequestInit) => {
      return new Response(JSON.stringify({ whatsappNumber: '918624908808' }));
    });
  });

  it('links each header and footer menu item to an existing homepage section', async () => {
    const harness = await RouterTestingHarness.create('/');
    const root = harness.routeNativeElement!;
    const links = root.querySelectorAll<HTMLAnchorElement>('nav a[href^="#"]');
    expect(links.length).toBeGreaterThanOrEqual(9);
    for (const link of Array.from(links)) {
      expect(root.querySelector(link.getAttribute('href')!)).withContext(link.textContent || '').not.toBeNull();
    }
    const menu = root.querySelector('.navbar-nav')!;
    expect(menu.querySelector('a[href="#section_33"]')?.textContent).toBe('Restaurant');
    expect(menu.querySelector('a[href="#booking-guide"]')?.textContent).toBe('FAQs');
    expect(menu.querySelector('a[href="#google-reviews"]')?.textContent).toBe('Reviews');
  });

  it('opens and closes booking on the homepage without navigating away', async () => {
    const harness = await RouterTestingHarness.create('/');
    const home = harness.routeNativeElement!;
    expect(home.querySelector('h1')?.textContent).toContain('5 Billion Stars');
    for (const section of ['section_1', 'section_2', 'section_3', 'section_4', 'section_5']) expect(home.querySelector('#' + section)).not.toBeNull();
    expect(home.querySelector('app-booking')).toBeNull();
    const bookingButtons = home.querySelectorAll<HTMLButtonElement>('button.custom-btn, button.booking-float');
    expect(bookingButtons.length).toBe(3);
    bookingButtons[0].click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/');
    const dialog = home.querySelector('dialog')!;
    expect(dialog.open).toBeTrue();
    expect(dialog.querySelector('input[name="phone"]')?.closest('label')?.textContent).toContain('Your WhatsApp number');
    expect(dialog.querySelector('.booking-banner')).not.toBeNull();
    const firstName = dialog.querySelector<HTMLInputElement>('[name="firstName"]')!;
    const lastName = dialog.querySelector<HTMLInputElement>('[name="lastName"]')!;
    expect(firstName.required && lastName.required).toBeTrue();
    expect(firstName.closest('.date-row')).toBe(lastName.closest('.date-row'));
    expect(dialog.querySelector('[name="phone"]')?.closest('.phone-row')).toBe(dialog.querySelector('[name="guests"]')?.closest('.phone-row'));
    expect(dialog.querySelector('[name="alternativePhone"]')).toBeNull();
    expect(dialog.querySelector('[name="underFive"]')).toBeNull();
    expect(dialog.querySelector('[name="dob"]')).toBeNull();
    expect(dialog.querySelector('[name="email"]')).toBeNull();
    const flags = dialog.querySelectorAll<HTMLImageElement>('.country-flag');
    expect(flags.length).toBe(1);
    expect(flags[0].getAttribute('src')).toBe('/flags/in.svg');
    const component = harness.routeDebugElement!.componentInstance as HomeComponent;
    component.bookingForm!.whatsappCountry = '+44';
    harness.detectChanges();
    expect(flags[0].getAttribute('src')).toBe('/flags/gb.svg');
    expect(home.querySelector('.booking-close')?.textContent?.trim()).toBe('\u00d7');
    expect(getComputedStyle(home.querySelector('.booking-close')!).borderTopStyle).toBe('none');
    expect(getComputedStyle(dialog).scrollbarWidth).toBe('none');
    const dateInputs = dialog.querySelectorAll<HTMLInputElement>('.stay-dates input[type="date"]');
    expect(dateInputs.length).toBe(2);
    for (const input of Array.from(dateInputs)) {
      expect(input.min).toBe(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
      input.value = '2000-01-01';
      expect(input.validity.rangeUnderflow).toBeTrue();
    }
    for (const field of ['guests', 'adults', 'kids', 'veg', 'nonVeg', 'notes']) {
      expect(dialog.querySelector(`[name="${field}"]`)).not.toBeNull();
    }
    expect(dialog.querySelector('.intro')).toBeNull();
    home.querySelector<HTMLButtonElement>('.booking-close')!.click();
    harness.detectChanges();
    expect(dialog.open).toBeFalse();
    expect(home.querySelector('#section_1')).not.toBeNull();
  });

  it('includes the visitor WhatsApp number without saving to a backend', async () => {

    const replace = jasmine.createSpy('replace');
    spyOn(window, 'open').and.returnValue({ opener: null, closed: false, location: { replace }, close: () => {} } as unknown as Window);
    const harness = await RouterTestingHarness.create('/');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('button.custom-btn')!.click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    const home = harness.routeDebugElement!.componentInstance as HomeComponent;
    const form = home.bookingForm!;
    form.stayPreference = 'Tent Stay (2-3 people)';
    form.booking = { ...form.booking, adults: 2, kids: 0, veg: 1, nonVeg: 1, firstName: 'Website', lastName: 'Guest', phone: '+919876543210', checkIn: '2099-01-01', checkOut: '2099-01-02', guests: 2, notes: 'Test request' };
    await form.submit({ invalid: false } as NgForm);
    const url = new URL(form.whatsappUrl);
    expect(url.pathname).toBe('/918624908808');
    expect(url.searchParams.get('text')?.replace(/ +/g, ' ')).toContain('Guest WhatsApp: +919876543210');
    expect(window.open).not.toHaveBeenCalled();
    const posts = (window.fetch as jasmine.Spy).calls.allArgs().filter(args => args[1]?.method === 'POST');
    expect(posts.length).toBe(0);
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('keeps existing direct booking links working', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/book', BookingComponent);
    expect(harness.routeNativeElement?.querySelector('#section_1')).toBeNull();
    await harness.navigateByUrl('/', HomeComponent);
    expect(harness.routeNativeElement?.querySelector('#section_1')).not.toBeNull();
  });

  it('removes admin access and redirects old status links to the booking form', async () => {
    const harness = await RouterTestingHarness.create('/admin');
    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.querySelector('a[href="/admin"]')).toBeNull();
    await harness.navigateByUrl('/booking/old-reference', BookingComponent);
    expect(TestBed.inject(Router).url).toBe('/book');
    expect(harness.routeNativeElement?.textContent).not.toContain('Team sign-in');
  });

  it('starts the explicitly selected stay after the dropdown changed an earlier request',async()=>{
    const harness=await RouterTestingHarness.create('/');
    const home=harness.routeDebugElement!.componentInstance as HomeComponent;
    home.openBooking('Tent Stay (2-3 people)');harness.detectChanges();
    const form=home.bookingForm!;
    form.stayPreference='Cottage Stay (4-5 people)';form.whatsappUrl='https://wa.me/918624908808?text=earlier';
    home.openBooking('Tent Stay (2-3 people)');harness.detectChanges();
    expect(form.whatsappUrl).toBe('');expect(form.stayPreference).toBe('Tent Stay (2-3 people)');
  });

  it('opens each stay option in the booking dialog and clears an earlier submission when switching stays', async () => {
    const harness = await RouterTestingHarness.create('/');
    const home = harness.routeDebugElement!.componentInstance as HomeComponent;
    const cards = harness.routeNativeElement!.querySelectorAll<HTMLElement>('#stays .stay-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('2-3 people');
    expect(cards[1].textContent).toContain('4-5 people');
    cards[0].querySelector<HTMLButtonElement>('.stay-book')!.click();
    harness.detectChanges();
    expect(home.bookingDialog.nativeElement.open).toBeTrue();
    expect(home.bookingForm!.stayPreference).toBe('Tent Stay (2-3 people)');
    home.bookingForm!.reference = 'earlier-tent-request';
    home.bookingForm!.whatsappUrl = 'https://wa.me/918624908808?text=old';
    home.closeBooking();
    cards[1].querySelector<HTMLButtonElement>('.stay-book')!.click();
    harness.detectChanges();
    expect(home.bookingForm!.stayPreference).toBe('Cottage Stay (4-5 people)');
    expect(home.bookingForm!.reference).toBe('');
    expect(home.bookingForm!.whatsappUrl).toBe('');
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('supports the mobile navigation toggle without legacy Bootstrap scripts', async () => {
    const harness = await RouterTestingHarness.create('/');
    const toggle = harness.routeNativeElement!.querySelector<HTMLButtonElement>('.navbar-toggler')!;
    toggle.click();
    harness.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(harness.routeNativeElement?.querySelector('#navbarNav')?.classList.contains('show')).toBeTrue();
    toggle.click();
    harness.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});


