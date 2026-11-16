import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminBooking, BookingRequest, FirebaseBookingService, bookingValidationError } from './firebase-booking.service';
import { calculateBookingQuote } from './booking-quote';

@Component({
  selector: 'app-admin-booking-editor', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './admin-booking-editor.component.html', styleUrl: './admin-booking-editor.component.css'
})
export class AdminBookingEditorComponent implements OnChanges, AfterViewInit {
  @ViewChild('title') title?: ElementRef<HTMLHeadingElement>;
  ngAfterViewInit(): void { this.title?.nativeElement.focus(); }
  @Input({ required: true }) booking!: AdminBooking;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  draft!: BookingRequest;
  saving = false;
  error = '';
  constructor(private readonly store: FirebaseBookingService) {}
  ngOnChanges(): void {
    const b = this.booking;
    this.draft = { name: b.name, phone: b.phone, stay: b.stay, checkIn: b.checkIn, checkOut: b.checkOut,
      guests: b.guests, adults: b.adults, kids: b.kids, veg: b.veg, nonVeg: b.nonVeg, notes: b.notes };
    this.error = '';
  }
  get quote() { const d = this.draft; return calculateBookingQuote(d.stay, d.checkIn, d.checkOut, d.adults, d.kids); }
  async save(): Promise<void> {
    if (this.saving) return;
    const details = { ...this.draft, name: this.draft.name.trim(), phone: this.draft.phone.trim(), notes: this.draft.notes.trim() };
    this.error = bookingValidationError(details);
    if (this.error) return;
    this.saving = true;
    try { await this.store.update(this.booking.id, details); this.saved.emit(); }
    catch { this.error = 'Could not save changes. Check your connection and admin permissions, then try again.'; }
    finally { this.saving = false; }
  }
}
