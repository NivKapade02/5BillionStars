import { Component, EventEmitter, Output } from '@angular/core';

import { BOOKING_TERMS, STAY_PRICING } from './stay-pricing';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-stay-options',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './stay-options.component.html',
  styleUrl: './stay-options.component.css'
})
export class StayOptionsComponent {
  readonly terms = BOOKING_TERMS;
  @Output() bookStay = new EventEmitter<string>();
  readonly amenityIcons = ['bi-house-door', 'bi-moon-stars', 'bi-layers', 'bi-grid', 'bi-heart', 'bi-stars'];
  readonly stays = [
    {
      name: 'Tent Stay', heading: 'Tent Stay', capacity: '2-3 people', preference: 'Tent Stay (2-3 people)',
      bathroomNote: '',
      price: STAY_PRICING.tent,
      image: 'images/stay-options/tent-lake-front.webp', alt: 'Open green tent with bedding overlooking Pawana Lake and the hills',
      tagline: 'A little adventure. A sky full of stars.',
      description: 'Slow down by the lake, settle into your cosy tent, and let the outdoors become your favourite escape.',
      amenities: ['Bed area', 'Blankets', 'Foam sheet', 'Bedsheet', 'Pillows', 'Bags area'],
      details: [
        { image: 'images/stay-options/tent-bed.webp', alt: 'Bedding and pillows inside the tent' },
        { image: 'images/stay-options/tent-stay.webp', alt: 'A tent overlooking Pawana Lake at sunset' },
        { image: 'images/stay-options/tent-view.webp', alt: 'Lake and hills viewed from inside a tent' }
      ]
    },
    {
      name: 'Cottage Stay', heading: 'A-frame Cottage Stay', capacity: '4-5 people', preference: 'Cottage Stay (4-5 people)',
      bathroomNote: 'Toilets beside the cottages; not attached inside.',
      price: STAY_PRICING.cottage,
      image: 'images/stay-options/cottage-stay.webp', alt: 'A-frame cottage exterior in daylight',
      tagline: 'Golden evenings. Cosy nights. Beautiful mornings.',
      description: 'Make room for togetherness in a charming A-frame cottage, with warm lights and space to unwind after sunset.',
      amenities: ['King-size bed area', 'Warm lights', 'Charging point', 'Mattress & bedsheet', 'Blanket & pillows', 'Triangle lights'],
      details: [
        { image: 'images/stay-options/cottage-night-row.webp', alt: 'Cottages glowing with warm triangle lights at night' },
        { image: 'images/stay-options/cottage-bed.webp', alt: 'Bedding and pillows inside a cottage' },
        { image: 'images/stay-options/cottage-sunset.webp', alt: 'Sunset viewed through a cottage doorway' }
      ]
    }
  ];
}

