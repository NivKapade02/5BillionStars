import { Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';

@Component({
  selector: 'app-hero-banner',
  standalone: true,
  templateUrl: './hero-banner.component.html',
  styleUrl: './hero-banner.component.css',
  host: { '[class.is-paused]': '!playing' }
})
export class HeroBannerComponent implements OnInit, OnDestroy {
  readonly slides = [
    { src: '/images/banner/gazebo.jpg', label: 'Lake-view gazebo' },
    { src: '/images/banner/sunset.jpg', label: 'Sunset over Pawana Lake' },
    { src: '/images/banner/garden.jpg', label: 'Lakeside tents and gardens' },
    { src: '/images/banner/lakeside-tent.jpg', label: 'Lakeside tent at dusk' },
    { src: '/images/banner/cottages-at-night.jpg', label: 'Illuminated cottages at night' }
  ];
  activeIndex = 0;
  previousIndex: number | null = null;
  playing = true;
  private readonly zone = inject(NgZone);
  private readonly motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private timer?: number;
  private readonly onMotionChange = (event: MediaQueryListEvent) => {
    if (event.matches) this.pause();
  };

  ngOnInit() {
    this.playing = !this.motionQuery.matches;
    this.motionQuery.addEventListener('change', this.onMotionChange);
    if (this.playing) this.startTimer();
  }

  ngOnDestroy() {
    this.stopTimer();
    this.motionQuery.removeEventListener('change', this.onMotionChange);
  }

  advance() {
    this.previousIndex = this.activeIndex;
    this.activeIndex = (this.activeIndex + 1) % this.slides.length;
  }

  select(index: number) {
    this.pause();
    if (index !== this.activeIndex) {
      this.previousIndex = this.activeIndex;
      this.activeIndex = index;
    }
  }

  pause() {
    this.playing = false;
    this.stopTimer();
  }

  togglePlayback() {
    if (this.playing) this.pause();
    else {
      this.playing = true;
      this.startTimer();
    }
  }

  private startTimer() {
    this.stopTimer();
    this.zone.runOutsideAngular(() => {
      this.timer = window.setInterval(() => {
        if (!document.hidden) this.zone.run(() => this.advance());
      }, 5000);
    });
  }

  private stopTimer() {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.timer = undefined;
  }
}
