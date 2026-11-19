import { afterNextRender, Component, DestroyRef, ElementRef, inject, NgZone, ViewChild } from '@angular/core';

interface NearbyPlace {
  name: string;
  image: string;
  location: string;
  query: string;
  travelTime: string;
  trek?: boolean;
  externalActivity?: boolean;
}

@Component({
  selector: 'app-nearby-places',
  standalone: true,
  templateUrl: './nearby-places.component.html',
  styleUrl: './nearby-places.component.css'
})
export class NearbyPlacesComponent {
  @ViewChild('stargazingSlides') private stargazingSlides?: ElementRef<HTMLElement>;
  @ViewChild('nearbySlides') private nearbySlides?: ElementRef<HTMLElement>;
  autoplayPaused = false;
  nearbyAutoplayPaused = false;
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.autoplayPaused = reducedMotion.matches;
      this.nearbyAutoplayPaused = reducedMotion.matches;
      this.zone.runOutsideAngular(() => {
        const timer = window.setInterval(() => {
          if (reducedMotion.matches || document.hidden) return;
          const sliders = [
            { element: this.stargazingSlides?.nativeElement, paused: this.autoplayPaused, region: '.stargazing-slider', pauseOnHover: true },
            { element: this.nearbySlides?.nativeElement, paused: this.nearbyAutoplayPaused, region: '.nearby-shell', pauseOnHover: false }
          ];
          for (const { element: slider, paused, region: selector, pauseOnHover } of sliders) {
            const region = slider?.closest(selector);
            if (!slider || !region || paused || (pauseOnHover && region.matches(':hover'))
              || slider.contains(document.activeElement)) continue;
            const bounds = slider.getBoundingClientRect();
            if (bounds.bottom > 0 && bounds.top < window.innerHeight) this.slideCards(slider, 1);
          }
        }, 4500);
        this.destroyRef.onDestroy(() => window.clearInterval(timer));
      });
    });
  }

  readonly stargazingTargets = [
    { name: 'Jupiter', category: 'Planets', image: 'jupiter.webp', description: 'Explore Jupiter and its moons through the telescope.' },
    { name: 'Saturn', category: 'Planets', image: 'saturn.webp', description: "Discover Saturn and its remarkable ring system." },
    { name: 'Venus', category: 'Planets', image: 'venus.webp', description: 'Look for the crescent phases of our bright planetary neighbour.' },
    { name: 'Pleiades (M45)', category: 'Deep-Sky Objects', image: 'plediam45.webp', description: 'Discover the bright stars of the Pleiades star cluster.' },
    { name: 'Orion Nebula (M42)', category: 'Deep-Sky Objects', image: 'm42.webp', description: 'Explore the Orion Nebula, a vast cloud of gas and dust where stars form.' },
    { name: 'Andromeda Galaxy (M31)', category: 'Deep-Sky Objects', image: 'andromeda.webp', description: 'Look beyond the Milky Way toward the distant Andromeda Galaxy.' },
    { name: 'Daytime Terrestrial Targets', category: 'Daytime Viewing', image: 'birds.webp', description: 'Birds, distant mountain ranges, ships, and wildlife during daylight hours.' },
    { name: 'Sahyadri Mountains', category: 'Daytime Viewing', image: 'sahyadri.webp', description: 'Explore the ridgelines and mountain scenery of the Sahyadri range during daylight hours.' },
    { name: 'Tikona Fort', category: 'Daytime Viewing', image: 'tikona.webp', description: 'Take a closer look at Tikona Fort and the surrounding hills during daylight hours.' }
  ];

  slideCards(slider: HTMLElement, direction: number): void {
    const lastSlide = slider.scrollWidth - slider.clientWidth;
    const atEnd = slider.scrollLeft >= lastSlide - 2;
    const atStart = slider.scrollLeft <= 2;
    const card = slider.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + (parseFloat(getComputedStyle(slider).columnGap) || 0) : slider.clientWidth;
    const left = direction > 0 && atEnd ? 0
      : direction < 0 && atStart ? lastSlide
      : slider.scrollLeft + direction * step;
    slider.scrollTo({ left });
  }

  readonly places: NearbyPlace[] = [
    { name: 'Pawana Lake', image: 'pawanalake.webp', location: 'Pawana, Pune', query: 'Pawna Lake Maharashtra', travelTime: '5–15 min' },
    { name: 'Tikona Fort (Vitandgad)', image: 'tikona.webp', location: 'Tikonapeth , Pune', query: 'Tikona Fort (Vitandgad)', travelTime: '5–15 min', trek: true },
    { name: 'Boating', image: 'saiboatingclub.avif', location: 'Sai Ganesh Boating Club, Hadshi', query: 'Sai Ganesh Boating Club Hadshi', travelTime: '10–15 min', externalActivity: true },
    { name: 'Kayaking', image: 'pawanakayaking.jpg', location: 'Pawana Lake', query: 'Pawana Kayaking', travelTime: '10–15 min', externalActivity: true },
    { name: 'Hadshi Adventure Park', image: 'hadashi_advanture.jpg', location: 'Hadshi, Mulshi', query: 'Hadshi Adventure Park', travelTime: '15–25 min',externalActivity: true },
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
