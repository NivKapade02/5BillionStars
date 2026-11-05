import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { BOOKING_TERMS, STAY_PRICING } from './stay-pricing';
import { calculateBookingQuote } from './booking-quote';
import { BookingReceiptComponent } from './booking-receipt.component';

@Component({
  selector: 'app-booking', standalone: true,
  imports: [FormsModule, BookingReceiptComponent],
  templateUrl: './booking.component.html', styleUrl: './booking.component.css',
  host: { '[class.embedded]': 'embedded' }
})
export class BookingComponent {
  readonly pricing = STAY_PRICING;
  readonly terms = BOOKING_TERMS;
  @ViewChild('paymentHeading') paymentHeading?: ElementRef<HTMLHeadingElement>;
  @Input() embedded = false;
  @Input() stayPreference = '';
  readonly stayOptions = [
    { value: 'Tent Stay (2-3 people)', label: 'Tent Stay · 2–3 people · ₹999/person/night' },
    { value: 'Cottage Stay (4-5 people)', label: 'Cottage Stay · 4–5 people · ₹1499/person/night' }
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
    if (this.booking.checkOut && this.booking.checkOut < this.minimumCheckOut) this.booking.checkOut = '';
  }
  openDatePicker(input: HTMLInputElement) { try { input.showPicker?.(); } catch { input.focus(); } }
  get validationError(): string {
    const b = this.booking;
    if (!this.stayOptions.some(stay => stay.value === this.stayPreference)) return 'Choose Tent Stay or Cottage Stay.';
    if (!b.checkIn || !b.checkOut || b.checkIn < this.today || b.checkOut <= b.checkIn) return 'Choose check-in today or later, and check-out after check-in.';
    if (!Number.isInteger(b.guests) || typeof b.guests !== 'number' || b.guests < 1 || b.guests > 50) return 'Choose a whole number of guests between 1 and 50.';
    if (!b.firstName.trim() || !b.lastName.trim() || b.firstName.length > 49 || b.lastName.length > 50) return 'Enter your first name and last name.';
    if (!/^\+[1-9][0-9]{7,14}$/.test(this.normalizedGuestPhone)) return 'Enter a valid WhatsApp mobile number with country code.';
    if (!this.quote) return 'Choose valid stay dates and guest counts to calculate the amount.';
    if ([b.adults, b.kids, b.veg, b.nonVeg].some(count => typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > 50) || !b.adults) return 'Select adult, kid, veg and non-veg counts. At least one adult is required.';
    if (Number(b.adults) + Number(b.kids) > b.guests) return 'Adult and kid counts cannot exceed the number of members.';
    if (Number(b.veg) + Number(b.nonVeg) !== b.guests) return 'Veg and non-veg counts must add up to the number of members.';
    if (b.notes.length > 200) return 'Keep comments within 200 characters.';
    return '';
  }
  submit(form: NgForm) {
    if (this.submitting || form.invalid) return;
    this.error = this.validationError;
    if (this.error) return;
    const b = this.booking, q = this.quote!;
    const details = JSON.stringify({ ...b, stay: this.stayPreference, whatsappCountry: this.whatsappCountry });
    if (!this.reference || details !== this.submittedDetails) this.reference = crypto.randomUUID();
    this.submittedDetails = details;
    const money = (amount: number) => 'INR ' + amount.toFixed(2);
    const message = [
      '*5 Billion Stars - Booking request*', 'Request reference: ' + this.reference,
      '', '*Guest details*', 'Name: ' + b.firstName.trim() + ' ' + b.lastName.trim(),
      'Guest WhatsApp: ' + this.normalizedGuestPhone,
      '', '*Stay details*', 'Stay: ' + this.stayPreference, 'Check-in: ' + b.checkIn, 'Check-out: ' + b.checkOut,
      'Nights: ' + q.nights, 'Guests: ' + b.guests, 'Adults (above 10): ' + b.adults,
      'Kids (5-10): ' + b.kids, 'Children under 5 (free): ' + this.underFive,
      'Veg meals: ' + b.veg, 'Non-veg meals: ' + b.nonVeg, 'Special requests: ' + (b.notes.trim() || 'None'),
      '', '*Price estimate - subject to team confirmation*',
      'Adults: ' + b.adults + ' x ' + money(q.adultRate) + ' x ' + q.nights + ' night(s) = ' + money(q.adultTotal),
      'Children 5-10: ' + b.kids + ' x ' + money(q.childRate) + ' x ' + q.nights + ' night(s) = ' + money(q.childTotal),
      'Total including meals and taxes: ' + money(q.total),
      '40% advance after availability is agreed: ' + money(q.advance), 'Remaining balance: ' + money(q.balance),
      '', 'Please confirm availability, the final total and booking terms before I pay. Our team confirms the booking after verifying payment.'
    ].join('\n');
    this.whatsappUrl = this.contactUrl + '?text=' + encodeURIComponent(message);
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
