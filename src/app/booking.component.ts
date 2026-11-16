import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { BOOKING_TERMS, STAY_PRICING } from './stay-pricing';
import { calculateBookingQuote } from './booking-quote';
import { FirebaseBookingService } from './firebase-booking.service';
import { BookingReceiptComponent } from './booking-receipt.component';

@Component({
  selector: 'app-booking', standalone: true,
  imports: [FormsModule, BookingReceiptComponent],
  templateUrl: './booking.component.html', styleUrl: './booking.component.css',
  host: { '[class.embedded]': 'embedded' }
})
export class BookingComponent {
  constructor(private readonly bookingStore: FirebaseBookingService) {}
  private submissionCreatedAt = '';
  readonly pricing = STAY_PRICING;
  readonly terms = BOOKING_TERMS;
  @ViewChild('paymentHeading') paymentHeading?: ElementRef<HTMLHeadingElement>;
  @Input() embedded = false;
  @Input() stayPreference = '';
  readonly stayOptions = [
    { value: 'Tent Stay (2-3 people)', label: 'Tent Stay · 2–3 people · ₹999/person/night' },
    { value: 'Cottage Stay (4-5 people)', label: 'Cottage Stay · 4–5 people · ₹1599/person/night' }
  ];
  readonly today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  readonly memberCounts = Array.from({ length: 50 }, (_, index) => index + 1);
  readonly counts = Array.from({ length: 51 }, (_, index) => index);
  readonly countries = [
    { code: '+91', name: 'India', flag: 'in' }, { code: '+1', name: 'US / Canada', flag: 'us' },
    { code: '+44', name: 'UK', flag: 'gb' }, { code: '+971', name: 'UAE', flag: 'ae' },
    { code: '+61', name: 'Australia', flag: 'au' }, { code: '+65', name: 'Singapore', flag: 'sg' }
  ];
  whatsappCountry = '+91';
  booking = {
    firstName: '', lastName: '', phone: '', checkIn: '', checkOut: '',
    guests: null as number | null, adults: null as number | null, kids: null as number | null,
    veg: null as number | null, nonVeg: null as number | null, notes: ''
  };
  submitting = false;
  error = '';
  reference = '';
  whatsappUrl = '';
  readonly contactUrl = 'https://wa.me/918624908808';
  private submittedDetails = '';

  countryForCode(code: string) { return this.countries.find(country => country.code === code) || this.countries[0]; }
  get normalizedGuestPhone() { return this.phoneWithCountry(this.booking.phone, this.whatsappCountry); }
  get underFive() { return Math.max(0, Number(this.booking.guests) - Number(this.booking.adults) - Number(this.booking.kids)); }
  get savedBookingMessage() { return this.whatsappUrl ? new URL(this.whatsappUrl).searchParams.get('text') || '' : ''; }
  get quote() { const b = this.booking; return calculateBookingQuote(this.stayPreference, b.checkIn, b.checkOut, b.adults, b.kids); }
  get minimumCheckOut() {
    if (!this.booking.checkIn || this.booking.checkIn < this.today) return this.today;
    const date = new Date(this.booking.checkIn + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime())) return this.today;
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
  }
  setCheckIn(value: string) {
    this.booking.checkIn = value;
    this.booking.checkOut = value && value >= this.today ? this.minimumCheckOut : '';
  }
  get adultCounts() { return this.memberCounts.filter(count => count <= (this.booking.guests ?? 0)); }
  get guestCounts() { return this.counts.filter(count => count <= (this.booking.guests ?? 0)); }
  setGuests(value: number | null) {
    this.booking.guests = value;
    this.setAdults(this.booking.adults);
    this.setVeg(this.booking.veg);
  }
  setAdults(value: number | null) {
    const members = this.booking.guests;
    this.booking.adults = value === null || members === null ? value : Math.min(value, members);
    this.booking.kids = members === null || this.booking.adults === null ? null : members - this.booking.adults;
  }
  setMobileNumber(input: HTMLInputElement) {
    const digits = input.value.replace(/[^0-9]/g, '').slice(0, 10);
    input.value = digits;
    this.booking.phone = digits;
  }
  setVeg(value: number | null) {
    const members = this.booking.guests;
    this.booking.veg = value === null || members === null ? value : Math.min(value, members);
    this.booking.nonVeg = members === null || this.booking.veg === null ? null : members - this.booking.veg;
  }
  openDatePicker(input: HTMLInputElement) { try { input.showPicker?.(); } catch { input.focus(); } }
  get fieldErrors(): Record<string, string> {
    const b = this.booking;
    const errors: Record<string, string> = {};
    const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    if (!this.stayOptions.some(stay => stay.value === this.stayPreference)) errors['stayPreference'] = 'Choose Tent Stay or Cottage Stay.';
    for (const [field, label, limit] of [['firstName', 'first name', 49], ['lastName', 'last name', 50]] as const) {
      const value = b[field].trim();
      if (!value) errors[field] = 'Enter your ' + label + '.';
      else if (value.length > limit) errors[field] = 'Keep your ' + label + ' within ' + limit + ' characters.';
      else if (!/^[\p{L}\p{M} .'?-]+$/u.test(value) || !/\p{L}/u.test(value)) errors[field] = 'Use letters, spaces, apostrophes or hyphens for your ' + label + '.';
    }
    if (!this.countries.some(country => country.code === this.whatsappCountry)) errors['whatsappCountry'] = 'Choose a valid country code.';
    if (!b.phone.trim()) errors['phone'] = 'Enter your WhatsApp mobile number.';
    else if (!/^[0-9]{10}$/.test(b.phone) || !/^\+[1-9][0-9]{7,14}$/.test(this.normalizedGuestPhone)) errors['phone'] = 'Enter a valid 10-digit WhatsApp mobile number without the country code.';
    if (!Number.isInteger(b.guests) || b.guests === null || b.guests < 1 || b.guests > 50) errors['guests'] = 'Choose a whole number of guests between 1 and 50.';
    if (!validDate(b.checkIn)) errors['checkIn'] = 'Choose a valid check-in date.';
    else if (b.checkIn < this.today) errors['checkIn'] = 'Choose check-in today or later.';
    if (!validDate(b.checkOut)) errors['checkOut'] = 'Choose a valid check-out date.';
    else if (validDate(b.checkIn) && b.checkOut <= b.checkIn) errors['checkOut'] = 'Check-out must be after check-in.';
    for (const [field, label, minimum] of [['adults', 'adult', 1], ['kids', 'kid', 0], ['veg', 'Veg', 0], ['nonVeg', 'non-veg', 0]] as const) {
      const count = b[field];
      if (count === null || !Number.isInteger(count) || count < minimum || count > 50) errors[field] = 'Select a ' + label + ' count between ' + minimum + ' and 50.';
      else if (b.guests !== null && count > b.guests) errors[field] = 'The ' + label + ' count cannot exceed the number of members.';
    }
    if (b.guests !== null && b.adults !== null && b.kids !== null && b.adults + b.kids > b.guests) errors['kids'] = 'Adult and kid counts cannot exceed the number of members.';
    if (b.guests !== null && b.veg !== null && b.nonVeg !== null && b.veg + b.nonVeg !== b.guests) {
      errors['veg'] = errors['nonVeg'] = 'Veg and non-veg counts must add up to the number of members.';
    }
    if (b.notes.length > 200) errors['notes'] = 'Keep comments within 200 characters.';
    return errors;
  }
  get validationError(): string { return Object.values(this.fieldErrors)[0] || ''; }
  fieldError(field: string, form: NgForm): string {
    return form.submitted || form.controls[field]?.touched ? this.fieldErrors[field] || '' : '';
  }
  async submit(form: NgForm) {
    if (this.submitting || form.invalid) return;
    this.error = this.validationError;
    if (this.error) return;
    const b = this.booking, q = this.quote!;
    const details = JSON.stringify({ ...b, stay: this.stayPreference, whatsappCountry: this.whatsappCountry });
    if (!this.reference || details !== this.submittedDetails) {
      this.reference = crypto.randomUUID();
      this.submissionCreatedAt = new Date().toISOString();
    }
    this.submittedDetails = details;
    const money = (amount: number) => 'INR ' + amount.toFixed(2);
    const width = 38;
    const divider = '-'.repeat(width);
    const center = (value: string) => ' '.repeat(Math.max(0, Math.floor((width - value.length) / 2))) + value;
    const amountRow = (label: string, amount: number) => {
      const value = money(amount);
      return label + ' '.repeat(Math.max(4, width - label.length - value.length)) + value;
    };
    // Keep user-entered text from closing WhatsApp's monospace receipt block.
    const plainText = (value: string) => value.trim().replace(/`/g, "'").replace(/[\r\n]+/g, ' ');
    const issuedAt = new Date();
    const date = issuedAt.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
    const time = issuedAt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    const message = [
      '```',
      center('5 BILLION STARS'),
      center('Camping & Agro Tourism'),
      center('+91 8624908808'),
      '', center('BOOKING REQUEST'), center('Estimate - not confirmed'), divider,
      'DATE: ' + date, 'TIME: ' + time + ' IST',
      'Request reference:', this.reference, divider,
      'Name: ' + plainText(b.firstName) + ' ' + plainText(b.lastName),
      'Guest WhatsApp: ' + this.normalizedGuestPhone,
      'Stay: ' + this.stayPreference,
      'Check-in: ' + b.checkIn, 'Check-out: ' + b.checkOut,
      'Nights: ' + q.nights, 'Guests: ' + b.guests,
      'Adults (above 10): ' + b.adults,
      ...(Number(b.kids) > 0 ? ['Kids (5-10): ' + b.kids] : []),
      'Veg meals: ' + b.veg, 'Non-veg meals: ' + b.nonVeg, divider,
      'ADULT STAY',
      b.adults + ' x ' + money(q.adultRate) + ' x ' + q.nights + ' night(s)',
      amountRow('Adults', q.adultTotal),
      ...(Number(b.kids) > 0 ? [
        'CHILD STAY (5-10 YEARS)',
        b.kids + ' x ' + money(q.childRate) + ' x ' + q.nights + ' night(s)',
        amountRow('Children', q.childTotal)
      ] : []),
      divider,
      'Network handling: INR 1/adult/night',
      amountRow('Network handling', q.networkHandlingTotal),
      divider,
      amountRow('TOTAL', q.total),
      'All meals and taxes included', divider,
      amountRow('40% ADVANCE', q.advance),
      amountRow('REMAINING BALANCE', q.balance), divider,
      'Special requests:', plainText(b.notes) || 'None', divider,
      'Price estimate - subject to team confirmation.',
      'Advance due only after availability is agreed.',
      'Payment status: NOT VERIFIED',
      'Please confirm availability, the final total and booking terms before I pay. Our team confirms the booking after verifying payment.',
      '', center('THANK YOU FOR CHOOSING'), center('5 BILLION STARS!'),
      '```'
    ].join('\n');
    this.submitting = true;
    try {
      await this.bookingStore.save(this.reference, {
        name: b.firstName.trim() + ' ' + b.lastName.trim(), phone: this.normalizedGuestPhone,
        checkIn: b.checkIn, checkOut: b.checkOut, guests: b.guests!, adults: b.adults!, kids: b.kids!,
        veg: b.veg!, nonVeg: b.nonVeg!, stay: this.stayPreference, notes: b.notes.trim()
      }, this.submissionCreatedAt);
      this.whatsappUrl = this.contactUrl + '?text=' + encodeURIComponent(message);
    } catch {
      this.error = 'Could not save your request. Please try again or contact the campsite on WhatsApp.';
      return;
    } finally { this.submitting = false; }
    setTimeout(() => this.paymentHeading?.nativeElement.focus(), 0);
  }
  startNewRequest(stay?: string) {
    this.reference = ''; this.whatsappUrl = ''; this.submittedDetails = ''; this.error = '';
    if (stay) this.stayPreference = stay;
  }
  private phoneWithCountry(value: string, country: string) {
    const digits = value.replace(/[\s()-]/g, '');
    return digits.startsWith('+') ? digits : country + digits;
  }
}
