import { Component } from '@angular/core';

interface NearbyPlace {
  name: string;
  image: string;
  location: string;
  query: string;
  travelTime: string;
  trek?: boolean;
}

@Component({
  selector: 'app-nearby-places',
  standalone: true,
  templateUrl: './nearby-places.component.html',
  styleUrl: './nearby-places.component.css'
})
export class NearbyPlacesComponent {
  readonly places: NearbyPlace[] = [
    { name: 'Pawana Lake', image: 'pawanalake.webp', location: 'Pawana, Pune', query: 'Pawna Lake Maharashtra', travelTime: '5–15 min' },
    { name: 'Tikona Fort (Vitandgad)', image: 'tikona.webp', location: 'Tikonapeth tal, dist, Mulshi, Maharashtra 410406', query: 'Tikona Fort (Vitandgad)', travelTime: '5–15 min', trek: true },
    { name: 'Boating', image: 'saiboatingclub.avif', location: 'Sai Ganesh Boating Club, Hadshi', query: 'Sai Ganesh Boating Club Hadshi', travelTime: '10–15 min' },
    { name: 'Kayaking', image: 'pawanakayaking.jpg', location: 'Pawana Lake', query: 'Pawana Kayaking', travelTime: '10–15 min' },
    { name: 'Hadshi Adventure Park', image: 'hadashi_advanture.jpg', location: 'Hadshi, Mulshi', query: 'Hadshi Adventure Park', travelTime: '15–25 min' },
    { name: 'Tung Fort (Kathingad)', image: 'tungifort.webp', location: 'Tung, Maval', query: 'Tung Fort Maharashtra', travelTime: '60–90 min', trek: true },
    { name: 'Lohagad Fort', image: 'lohagad.webp', location: 'Lonavala, Pune', query: 'Lohagad Fort Maharashtra', travelTime: '45–60 min', trek: true },
    { name: 'Visapur Fort', image: 'visapurfort.webp', location: 'Maval, Pune', query: 'Visapur Fort Maharashtra', travelTime: '45–60 min', trek: true },
    { name: 'Morgiri Fort', image: 'morgirifort.webp', location: 'Maval, Pune', query: 'Morgiri Fort Maharashtra', travelTime: '30–45 min', trek: true },
    { name: 'Bedse Caves', image: 'bedsecave.webp', location: 'Bedse, Maval', query: 'Bedse Caves Maharashtra', travelTime: '35–50 min' },
    { name: 'Wagheshwar Temple', image: 'wagheshwar.webp', location: 'Pawana Lake, Maval', query: 'Wagheshwar Temple Pawna Lake', travelTime: '30–45 min' },
    { name: 'Sant Darshan Museum', image: 'Sant Musuem Dindi.webp', location: 'Hadshi, Mulshi', query: 'Sant Darshan Museum Hadshi', travelTime: '15–25 min' }
  ];

  imageUrl(file: string) { return '/assets/images/nearplaces/' + encodeURIComponent(file); }
  mapUrl(query: string) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query); }
  directionsUrl(query: string) {
    return 'https://www.google.com/maps/dir/?api=1&origin=18.634388%2C73.503226&destination=' + encodeURIComponent(query) + '&travelmode=driving';
  }
}
