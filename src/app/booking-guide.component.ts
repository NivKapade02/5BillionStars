import { Component } from '@angular/core';
import { BOOKING_TERMS, STAY_PRICING } from './stay-pricing';

@Component({
  selector: 'app-booking-guide', standalone: true,
  templateUrl: './booking-guide.component.html', styleUrl: './booking-guide.component.css'
})
export class BookingGuideComponent { readonly pricing = STAY_PRICING; readonly terms = BOOKING_TERMS; }
