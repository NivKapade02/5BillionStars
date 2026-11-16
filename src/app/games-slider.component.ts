import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { NgZone, Optional } from '@angular/core';
@Component({ selector: 'app-games-slider', standalone: true, templateUrl: './games-slider.component.html', styleUrl: './games-slider.component.css' })
export class GamesSliderComponent implements AfterViewInit, OnDestroy {
  constructor(@Optional() private readonly zone: NgZone | null = null) {}
  @ViewChild('viewport') private viewport?: ElementRef<HTMLDivElement>;
  private timer?: ReturnType<typeof setInterval>;
  autoplay = true;
  hovered = false;
  focused = false;
  readonly games = [
    { name: 'Cricket', file: 'cricket.webp?v=64816f06', type: 'Outdoor' },
    { name: 'Volleyball', file: 'volleyball.webp', type: 'Outdoor' },
    { name: 'Football', file: 'football.webp', type: 'Outdoor' },
    { name: 'Badminton', file: 'badminton.webp', type: 'Outdoor' },
    { name: 'Dart', file: 'dart.webp', type: 'Outdoor' },
    { name: 'Basketball', file: 'basketball.webp', type: 'Outdoor' },
    { name: 'Rope Pull', file: 'rope-pull.webp', type: 'Outdoor' },
    { name: 'Carrom', file: 'carrom.webp', type: 'Indoor' },
    { name: 'Chess', file: 'chess.webp', type: 'Indoor' },
    { name: 'Ludo', file: 'ludo.webp', type: 'Indoor' },
    { name: 'Cards', file: 'cards.webp', type: 'Indoor' },
    { name: 'UNO Cards', file: 'uno.webp', type: 'Indoor' },
    { name: 'Jenga', file: 'zenga.webp', type: 'Indoor' }
  ];
  ngAfterViewInit() {
    if (typeof window === 'undefined') return;
    this.autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = () => setInterval(() => {
      if (this.autoplay && !this.hovered && !this.focused && !document.hidden) {
        this.zone ? this.zone.run(() => this.slide(1)) : this.slide(1);
      }
    }, 4500);
    this.timer = this.zone ? this.zone.runOutsideAngular(start) : start();
  }
  ngOnDestroy() { clearInterval(this.timer); }
  slide(direction: number) {
    const viewport = this.viewport?.nativeElement;
    const card = viewport?.querySelector<HTMLElement>('.game-card');
    if (!viewport || !card) return;
    const gap = parseFloat(getComputedStyle(viewport).columnGap);
    const step = card.offsetWidth + gap;
    const count = Math.max(1, Math.round((viewport.clientWidth + gap) / step));
    const end = viewport.scrollWidth - viewport.clientWidth;
    if (end < 1) return;
    const left = direction > 0
      ? (viewport.scrollLeft >= end - 2 ? 0 : Math.min(end, viewport.scrollLeft + count * step))
      : (viewport.scrollLeft <= 2 ? end : Math.max(0, viewport.scrollLeft - count * step));
    viewport.scrollTo({ left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
}
