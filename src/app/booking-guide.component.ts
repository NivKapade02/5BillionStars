import { Component } from '@angular/core';
import { ADULT_NIGHT_TOTALS, BOOKING_TERMS, STAY_PRICING } from './stay-pricing';
import { CAMPSITE_SEARCH_FAQS } from './campsite-search-faqs';

@Component({
  selector: 'app-booking-guide', standalone: true,
  templateUrl: './booking-guide.component.html', styleUrl: './booking-guide.component.css'
})
export class BookingGuideComponent { readonly pricing = STAY_PRICING; readonly terms = BOOKING_TERMS; readonly adultTotals = ADULT_NIGHT_TOTALS; readonly searchFaqs = CAMPSITE_SEARCH_FAQS; }
