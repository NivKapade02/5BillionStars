import { Component, Input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { BookingQuote } from './booking-quote';
import { createReceiptImage } from './receipt-image';

@Component({
  selector: 'app-booking-receipt', standalone: true, imports: [CurrencyPipe],
  template: `
    <details class="receipt-breakdown" [open]="!reference"><summary>{{ reference ? 'View booking & price breakdown' : 'Your booking estimate' }}</summary>
    <section aria-label="Booking payment estimate" class="receipt">
      <header><span>5 BILLION STARS</span><h3>Booking payment summary</h3><small>Estimate · Payment not verified</small></header>
      @if (reference) { <p class="reference">Reference: {{ reference }}</p> }
      <p><strong>{{ name }}</strong><br>{{ stay }}<br>{{ checkIn }} → {{ checkOut }} · {{ quote.nights }} night(s)</p>
      <dl>
        <div><dt>Adults · {{ adults }} × {{ quote.adultRate | currency:'INR' }} × {{ quote.nights }} nights</dt><dd>{{ quote.adultTotal | currency:'INR' }}</dd></div>
        <div><dt>Children 5–10 · {{ kids }} × {{ quote.childRate | currency:'INR' }} × {{ quote.nights }} nights</dt><dd>{{ quote.childTotal | currency:'INR' }}</dd></div>
        <div><dt>Children under 5 · {{ underFive }}</dt><dd>Free</dd></div>
        <div class="total"><dt>Total · meals & taxes included</dt><dd>{{ quote.total | currency:'INR' }}</dd></div>
      </dl>
      <div class="advance"><span>40% advance to pay</span><strong>{{ quote.advance | currency:'INR' }}</strong></div>
      <p class="balance">Remaining balance: <strong>{{ quote.balance | currency:'INR' }}</strong></p>

    </section>
    </details>
  `,
  styles: `
    .receipt-breakdown{margin-top:16px}.receipt-breakdown>summary{padding:12px;color:#854313;font-weight:700;cursor:pointer}.receipt-breakdown>summary:focus-visible{outline:3px solid #bc6c25}
    .receipt-actions{padding:0 20px 20px}.receipt-actions button{width:100%;border:0;font:700 13px Arial,sans-serif;cursor:pointer}.download{padding:10px;margin-top:8px;background:#f7eee1;color:#854313;border-radius:8px}.receipt-actions small{display:block;font-size:11px;margin-top:8px}.receipt-actions p{font-size:12px}.receipt-chat{display:block;margin-top:10px;color:#15713e;font-weight:700}.receipt-actions button:disabled{opacity:.6;cursor:wait}.receipt-actions button:focus-visible{outline:3px solid #bc6c25;outline-offset:3px}
    :host{display:block;margin:24px 0;font:13px/1.6 Arial,sans-serif;color:#352619}.receipt{border:1px solid #e5d4bd;border-radius:16px;overflow:hidden;background:#fffdf9}header{background:#4a3222;color:white;padding:20px}header span{letter-spacing:2px;font-size:11px}h3{font:700 20px/1.4 Arial,sans-serif;margin:5px 0;color:white}header small{color:#f1d3ac}.receipt>p,dl{margin:16px 20px}.reference{overflow-wrap:anywhere;font-size:11px;color:#75624f}dl>div{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px dashed #e5d4bd}dt{font-weight:400}dd{margin:0;font-weight:700;white-space:nowrap}.total{font-size:14px}.total dt{font-weight:700}.advance{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px 20px;padding:16px;background:#bc6c25;border-radius:10px;color:white}.advance strong{font-size:24px;white-space:nowrap}.balance{font-size:12px}.payment{padding:20px;background:#f7eee1}.payment>a:not(.share){display:block;color:#854313;font-size:25px;font-weight:800;text-decoration:none}.payment p{margin:10px 0}.share{display:block;padding:12px;background:#158243;border-radius:8px;color:white;text-align:center;font-weight:700;text-decoration:none}.payment small{display:block;margin-top:10px;font-size:11px}a:focus-visible{outline:3px solid #bc6c25;outline-offset:3px}@media(max-width:380px){.advance{align-items:flex-start;flex-direction:column}dl>div{gap:8px}.receipt>p,dl{margin:12px}.advance{margin:12px}}
  `
})
export class BookingReceiptComponent {
  sharing = false;
  shareStatus = '';
  @Input({ required: true }) quote!: BookingQuote;
  @Input() name = '';
  @Input() stay = '';
  @Input() checkIn = '';
  @Input() checkOut = '';
  @Input() adults: number | null = null;
  @Input() kids: number | null = null;
  @Input() underFive = 0;
  @Input() reference = '';
  @Input() bookingMessage = '';
  @Input() guestPhone = '';

  private async receiptFile() {
    return createReceiptImage({ quote: this.quote, name: this.name, stay: this.stay, checkIn: this.checkIn, checkOut: this.checkOut, adults: this.adults, kids: this.kids, underFive: this.underFive, reference: this.reference });
  }

  private downloadFile(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async shareReceipt() {
    if (this.sharing) return;
    this.sharing = true;
    this.shareStatus = '';
    try {
      const file = await this.receiptFile();
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: '5 Billion Stars booking payment summary', text: `Booking payment estimate${this.reference ? ' · ' + this.reference : ''}. Payment not verified.` });
      } else {
        this.downloadFile(file);
        this.shareStatus = 'Receipt downloaded. Open the campsite WhatsApp chat below and attach this image before tapping Send.';
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) this.shareStatus = 'Sharing is unavailable. Use Download receipt image, then attach it in WhatsApp.';
    } finally { this.sharing = false; }
  }

  async downloadReceipt() {
    if (this.sharing) return;
    this.sharing = true;
    this.shareStatus = '';
    try {
      this.downloadFile(await this.receiptFile());
      this.shareStatus = 'Receipt downloaded. Attach it in WhatsApp to share with the campsite.';
    } catch { this.shareStatus = 'Could not create the receipt image. Please try again.'; }
    finally { this.sharing = false; }
  }
  get receiptChatUrl() {
    return 'https://wa.me/918624908808?text=' + encodeURIComponent(`Booking payment summary for ${this.name}\nReference: ${this.reference || 'Estimate - not submitted'}\nTotal: INR ${this.quote.total.toFixed(2)}\n40% advance: INR ${this.quote.advance.toFixed(2)}\nPayment not verified. I will attach the receipt image.`);
  }

  get shareUrl() {
    return 'https://wa.me/918624908808?text=' + encodeURIComponent(`Payment screenshot for 5 Billion Stars\nName: ${this.name}\nBooking reference: ${this.reference || 'Please submit the booking form first'}\n40% advance: INR ${this.quote.advance.toFixed(2)}\nI will attach my payment screenshot for your verification.`);
  }
}
