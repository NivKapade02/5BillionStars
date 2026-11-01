import { Component, Input, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { BOOKING_TERMS, STAY_PRICING } from './stay-pricing';

interface BookingConfig {
  whatsappNumber: string;
  googleSheetsWebAppUrl: string;
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.css',
  host: { '[class.embedded]': 'embedded' }
})
export class BookingComponent implements OnInit {
  readonly pricing = STAY_PRICING;
  readonly terms = BOOKING_TERMS;
  @Input() embedded = false;
  @Input() stayPreference = '';
  readonly today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  readonly memberCounts = Array.from({ length: 50 }, (_, index) => index + 1);
  readonly counts = Array.from({ length: 51 }, (_, index) => index);
  readonly countries = [
    { code: '+91', name: 'India', flag: 'in' }, { code: '+1', name: 'US / Canada', flag: 'us' },
    { code: '+44', name: 'UK', flag: 'gb' }, { code: '+971', name: 'UAE', flag: 'ae' },
    { code: '+61', name: 'Australia', flag: 'au' }, { code: '+65', name: 'Singapore', flag: 'sg' }
  ];
  whatsappCountry = '+91';
  alternateCountry = '+91';
  booking = {
    firstName: '', lastName: '', dob: '', phone: '', alternativePhone: '', email: '', checkIn: '', checkOut: '',
    guests: null as number | null, adults: null as number | null, kids: null as number | null, underFive: 0,
    veg: null as number | null, nonVeg: null as number | null, notes: ''
  };
  submitting = false;
  loading = true;
  available = false;
  error = '';
  reference = '';
  whatsappUrl = '';
  contactUrl = 'https://wa.me/918624908808';
  private config?: BookingConfig;
  private requestKey = '';
  private submittedDetails = '';

  countryForCode(code: string) {
    return this.countries.find(country => country.code === code) || this.countries[0];
  }

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

  openDatePicker(input: HTMLInputElement) {
    // Keep the browser's normal date input on browsers without showPicker support.
    try { input.showPicker?.(); } catch { input.focus(); }
  }

  async ngOnInit() {
    this.loading = true;
    this.available = false;
    this.config = undefined;
    try {
      const response = await fetch('/booking-config.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Configuration unavailable');
      const config: BookingConfig = await response.json();
      if (!/^[1-9][0-9]{7,14}$/.test(config.whatsappNumber)) throw new Error('Invalid number');
      this.contactUrl = `https://wa.me/${config.whatsappNumber}`;
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.googleSheetsWebAppUrl)) throw new Error('Sheet not configured');
      this.config = config;
      this.available = true;
    } catch {
      this.error = 'Online booking is temporarily unavailable. Please contact the campsite on WhatsApp.';
    } finally {
      this.loading = false;
    }
  }

  async submit(form: NgForm) {
    if (this.submitting || form.invalid || !this.config) return;
    this.error = '';
    if (this.booking.checkIn < this.today || this.booking.checkOut <= this.booking.checkIn) {
      this.error = 'Choose check-in today or later, and check-out after check-in.';
      return;
    }
    if (!Number.isInteger(this.booking.guests) || typeof this.booking.guests !== 'number' || this.booking.guests < 1 || this.booking.guests > 50) {
      this.error = 'Choose a whole number of guests between 1 and 50.';
      return;
    }
    const b = this.booking;
    if (!b.firstName.trim() || !b.lastName.trim() || b.firstName.length > 49 || b.lastName.length > 50) {
      this.error = 'Enter your first name and last name.';
      return;
    }
    const name = b.firstName.trim() + ' ' + b.lastName.trim();
    if (!b.dob) {
      this.error = 'Date of birth is required.';
      return;
    }
    if (b.dob) {
      const date = new Date(b.dob);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.dob) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== b.dob || b.dob > this.today) {
        this.error = 'Date of birth must be a valid date today or earlier.';
        return;
      }
    }
    const phone = this.phoneWithCountry(b.phone, this.whatsappCountry);
    const alternativePhone = this.phoneWithCountry(b.alternativePhone, this.alternateCountry);
    if (!/^\+[1-9][0-9]{7,14}$/.test(phone) || !/^\+[1-9][0-9]{7,14}$/.test(alternativePhone)) {
      this.error = 'Enter valid WhatsApp and alternate mobile numbers with country codes.';
      return;
    }
    const breakdown = [b.adults, b.kids, b.underFive, b.veg, b.nonVeg];
    if (breakdown.some(count => typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > 50) || !b.adults) {
      this.error = 'Select adult, kid, veg and non-veg counts. At least one adult is required.';
      return;
    }
    if (Number(b.adults) + Number(b.kids) + b.underFive !== b.guests) {
      this.error = 'Adults, kids aged 5–10 and children under 5 must add up to the number of members.';
      return;
    }
    if (Number(b.veg) + Number(b.nonVeg) !== b.guests) {
      this.error = 'Veg and non-veg counts must add up to the number of members.';
      return;
    }
    if (b.email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim()) || b.notes.length > 200) {
      this.error = 'Enter a valid email address and keep comments within 200 characters.';
      return;
    }
    // Keep all new fields in the deployed sheet's existing notes column as well.
    const sheetNotes = [
      'Alternate mobile: ' + alternativePhone, 'Email: ' + (b.email.trim() || 'Not provided'),
      'DOB: ' + (b.dob || 'Not provided'),
      'Stay: ' + (this.stayPreference || 'Not specified'),
      'Adults: ' + b.adults, 'Kids: ' + b.kids, 'Veg: ' + b.veg, 'Non-veg: ' + b.nonVeg,
      'Under 5: ' + b.underFive,
      'Comments: ' + (b.notes.trim() || 'None')
    ].join('\n');
    const payload = { ...b, name, stayPreference: this.stayPreference, phone, alternativePhone, email: b.email.trim(), notes: sheetNotes };
    const details = JSON.stringify(payload);
    if (!this.requestKey || details !== this.submittedDetails) {
      this.requestKey = crypto.randomUUID();
      this.submittedDetails = details;
    }
    // Reserve the tab during the user's click so mobile popup blockers allow it.
    const whatsappTab = window.open('about:blank', '_blank');
    if (whatsappTab) whatsappTab.opener = null;
    this.submitting = true;
    try {
      const response = await fetch(this.config.googleSheetsWebAppUrl, {
        method: 'POST',
        // A simple text request avoids an unsupported Apps Script OPTIONS preflight.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        credentials: 'omit',
        redirect: 'follow',
        body: JSON.stringify({ ...payload, id: this.requestKey }),
        signal: AbortSignal.timeout(30000)
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true || result.id !== this.requestKey) {
        throw new Error('We could not confirm that your booking was saved. Please retry or contact the campsite.');
      }
      this.reference = result.id;
      const message = [
        '*5 Billion Stars - Booking request*',
        `Reference: ${this.reference}`,
        `Name: ${name}`,
        `Stay: ${this.stayPreference || 'Not specified'}`,
        `Date of birth: ${b.dob || 'Not provided'}`,
        `Guest WhatsApp: ${phone}`,
        `Alternate mobile: ${alternativePhone}`,
        `Email: ${b.email.trim() || 'Not provided'}`,
        `Check-in: ${b.checkIn}`,
        `Check-out: ${b.checkOut}`,
        `Guests: ${b.guests}`,
        `Adults (above 10 years): ${b.adults}`,
        `Kids (5-10 years): ${b.kids}`,
        `Children under 5 (free): ${b.underFive}`,
        `Veg meals: ${b.veg}`,
        `Non-veg meals: ${b.nonVeg}`,
        `Special requests: ${b.notes.trim() || 'None'}`,
        'Please confirm availability and the total including meals and taxes. I understand a 40% advance is required after availability is agreed; our team confirms the booking.'
      ].join('\n');
      this.whatsappUrl = `https://wa.me/${this.config.whatsappNumber}?text=${encodeURIComponent(message)}`;
      if (whatsappTab && !whatsappTab.closed) whatsappTab.location.replace(this.whatsappUrl);
    } catch (error) {
      whatsappTab?.close();
      this.error = error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'TypeError'
        ? error.message : 'We could not confirm your booking was saved. Please retry; the same request will not create another row.';
    } finally {
      this.submitting = false;
    }
  }
  private phoneWithCountry(value: string, country: string) {
    const digits = value.replace(/[\s()-]/g, '');
    return digits.startsWith('+') ? digits : country + digits;
  }
}

