import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminBooking, FirebaseBookingService } from './firebase-booking.service';
@Component({ selector: 'app-admin-payment', standalone: true, imports: [CommonModule, FormsModule],
  styleUrl: './admin-booking-editor.component.css', template: `
  <section class="editor" aria-label="Record payment">
    <h3>Record payment for {{ booking.name }}</h3><p>{{ booking.reference }}</p>
    <p>Enter the total amount received after checking your payment account. This records your team's verification; no bank or WhatsApp verification is automatic.</p>
    <form #form="ngForm" (ngSubmit)="save()"><fieldset [disabled]="saving">
      <label>Total received (INR)<input type="number" name="amount" [(ngModel)]="amount" min="0" [max]="booking.quote?.total || 0" step="0.01" required></label>
      <label class="full">Verification note<input name="note" [(ngModel)]="note" maxlength="200" placeholder="Payment date or transaction reference"></label>
    </fieldset><p>Total: {{ booking.quote?.total | currency:'INR' }} / Remaining: {{ (booking.quote?.total || 0) - amount | currency:'INR' }}</p>
    <p *ngIf="error" role="alert">{{ error }}</p>
    <div class="actions"><button [disabled]="saving || form.invalid">{{ saving ? 'Saving...' : 'Save payment record' }}</button><button type="button" class="cancel" [disabled]="saving" (click)="cancelled.emit()">Cancel</button></div></form>
  </section>` })
export class AdminPaymentComponent implements OnChanges {
  @Input({ required: true }) booking!: AdminBooking;
  @Output() saved = new EventEmitter<void>(); @Output() cancelled = new EventEmitter<void>();
  amount = 0; note = ''; saving = false; error = '';
  constructor(private readonly store: FirebaseBookingService) {}
  ngOnChanges(): void { this.amount = this.booking.paidAmount || 0; this.note = this.booking.paymentNote || ''; }
  async save(): Promise<void> {
    if (this.saving) return;
    if (!Number.isFinite(this.amount) || this.amount < 0 || this.amount > (this.booking.quote?.total || 0)) { this.error = 'Received amount must be between zero and the booking total.'; return; }
    this.saving = true; this.error = '';
    try { await this.store.setPayment(this.booking.id, this.amount, this.note); this.saved.emit(); }
    catch (error) { this.error = error instanceof Error ? error.message : 'Could not save the payment record.'; }
    finally { this.saving = false; }
  }
}
