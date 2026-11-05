import {Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {BookingPolicyComponent} from './booking-policy.component';
@Component({standalone:true,imports:[RouterLink,BookingPolicyComponent],template:`<main style="max-width:800px;margin:auto;padding:32px;font-family:Arial,sans-serif"><h1>Booking terms & privacy</h1><p>Read these terms before accepting an approved quote and paying an advance.</p><app-booking-policy/><p><a routerLink="/">Back to campsite website</a> · <a href="tel:+918624908808">Call +91 8624908808</a></p></main>`})
export class PoliciesPageComponent {}
