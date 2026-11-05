import { Component } from '@angular/core';
@Component({selector:'app-booking-policy',standalone:true,template:`
<details class="policy"><summary>Cancellation, rescheduling & privacy terms</summary>
<p>Prices are per person per night. Meals and taxes are included. Check-in: 4:30 PM; checkout: 11 AM. Children under 5 stay free; ages 5–10 pay ₹700 per child per night.</p>
<p>Cancellation is measured in hours before 4:30 PM India time on the check-in date. Deductions apply to the advance paid:</p>
<ul><li>72 hours or more: 5% deduction.</li><li>48 to under 72 hours: 7% deduction.</li><li>24 to under 48 hours: 10% deduction.</li><li>Under 24 hours: no refund.</li></ul>
<p>Approved refunds are initiated within seven working days. One reschedule is allowed at least 72 hours before check-in, subject to availability and any price difference. Later changes follow cancellation rules. If the campsite cancels your stay, the advance is fully refundable.</p>
<p>Payment recipient: ASHWINI NIVRUTTEE KAPADE, UPI 8624908808&#64;hdfc, for 5 Billion Stars campsite bookings. Verify the recipient and amount in your UPI app.</p>
<p>This website prepares your request in your browser and does not save booking details or upload payment receipts. WhatsApp receives the information and payment screenshots you choose to send. Our team handles availability, payments, confirmation and your information through WhatsApp. Contact +91 8624908808 to request access, correction or deletion of information held by the team. Closing the form does not delete messages already sent in WhatsApp.</p>
<small>Policy version: {{ version }}. Review the final quote and terms with our team before making any payment.</small>
</details>`,styles:`.policy{padding:14px;border:1px solid #dbc6ac;border-radius:10px;color:#352619;background:#fffdf9;font:13px/1.7 Arial,sans-serif}summary{font-weight:700;cursor:pointer}p,li{font-size:13px;color:inherit}small{display:block;font-size:11px}summary:focus-visible{outline:2px solid #bc6c25}`})
export class BookingPolicyComponent { readonly version='2026-11-03-v1'; }
