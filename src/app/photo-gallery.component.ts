import { Component, ElementRef, NgZone, OnDestroy, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { GALLERY_PHOTOS, GalleryCategory } from './gallery-photos';

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  templateUrl: './photo-gallery.component.html',
  styleUrl: './photo-gallery.component.css'
})
export class PhotoGalleryComponent implements OnInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  playing = !this.motionQuery.matches;
  videoPlaying = false;
  private timer?: number;
  private readonly onMotionChange = (event: MediaQueryListEvent) => { if (event.matches) { this.playing = false; this.stopTimer(); } };

  ngOnInit() {
    this.motionQuery.addEventListener('change', this.onMotionChange);
    if (this.playing) this.startTimer();
  }

  ngOnDestroy() {
    this.stopTimer();
    this.motionQuery.removeEventListener('change', this.onMotionChange);
  }

  togglePlayback() {
    this.playing = !this.playing;
    if (this.playing) this.startTimer(); else this.stopTimer();
  }

  private startTimer() {
    this.stopTimer();
    this.zone.runOutsideAngular(() => {
      this.timer = window.setInterval(() => {
        const bounds = this.element.nativeElement.getBoundingClientRect();
        if (!document.hidden && !this.videoPlaying && bounds.bottom > 0 && bounds.top < window.innerHeight) this.zone.run(() => this.next());
      }, 5000);
    });
  }

  private stopTimer() {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.timer = undefined;
  }
  readonly allMedia = GALLERY_PHOTOS;
  filter: 'all' | 'photo' | 'video' | GalleryCategory = 'all';
  get photos() { return this.filter === 'all' ? this.allMedia : this.allMedia.filter(item => item.kind === this.filter || item.category === this.filter); }
  setFilter(filter: 'all' | 'photo' | 'video' | GalleryCategory) { this.filter = filter; this.show(0); }
  get photoCount() { return this.allMedia.filter(item => item.kind !== 'video').length; }
  get videoCount() { return this.allMedia.filter(item => item.kind === 'video').length; }
  activeIndex = 0;
  @ViewChildren('thumbnail') thumbnails!: QueryList<ElementRef<HTMLButtonElement>>;
  private touchStart?: { x: number; y: number };

  get activePhoto() { return this.photos[this.activeIndex]; }

  show(index: number) {
    this.videoPlaying = false;
    this.activeIndex = ((index % this.photos.length) + this.photos.length) % this.photos.length;
    queueMicrotask(() => {
      const thumbnail = this.thumbnails?.get(this.activeIndex)?.nativeElement;
      const rail = thumbnail?.parentElement;
      if (thumbnail && rail) rail.scrollTo({ left: thumbnail.offsetLeft - (rail.clientWidth - thumbnail.clientWidth) / 2, behavior: 'auto' });
    });
  }

  previous() { this.show(this.activeIndex - 1); }
  next() { this.show(this.activeIndex + 1); }

  onKeydown(event: KeyboardEvent) {
    if ((event.target as HTMLElement)?.tagName === 'VIDEO') return;
    switch (event.key) {
      case 'ArrowLeft': this.previous(); break;
      case 'ArrowRight': this.next(); break;
      case 'Home': this.show(0); break;
      case 'End': this.show(this.photos.length - 1); break;
      default: return;
    }
    event.preventDefault();
  }

  onTouchStart(event: TouchEvent) {
    if ((event.target as HTMLElement)?.tagName === 'VIDEO') { this.touchStart = undefined; return; }
    const touch = event.touches[0];
    this.touchStart = touch ? { x: touch.clientX, y: touch.clientY } : undefined;
  }

  onTouchEnd(event: TouchEvent) {
    const touch = event.changedTouches[0];
    const start = this.touchStart;
    this.touchStart = undefined;
    if (!touch || !start) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) dx < 0 ? this.next() : this.previous();
  }
}

