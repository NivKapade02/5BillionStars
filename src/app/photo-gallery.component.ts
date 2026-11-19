import { Component, ElementRef, NgZone, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren, inject } from '@angular/core';
import { GALLERY_PHOTOS, GalleryCategory } from './gallery-photos';

@Component({
  selector: 'app-photo-gallery',
  standalone: true,
  templateUrl: './photo-gallery.component.html',
  styleUrls: ['./photo-gallery.component.css', './photo-gallery-motion.component.css']
})
export class PhotoGalleryComponent implements OnInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly motionQuery = typeof window === 'undefined' ? null : window.matchMedia('(prefers-reduced-motion: reduce)');
  playing = !this.motionQuery?.matches;
  videoPlaying = false;
  detailOpen = false;
  transitionVersion = 0;
  @ViewChild('galleryDetail') private galleryDetail?: ElementRef<HTMLDialogElement>;
  readonly scenes = [
    { title: 'A little closer to nature.', description: 'Slow down by Pawana Lake. Wander through garden paths, take in the hills and make time for a lakeview sunset.', explore: 'Garden paths, lake views and quiet corners around the campsite.', stay: 'Wake up to the lake in a cosy tent or cottage.', tone: 'lake' },
    { title: 'Evenings worth staying for.', description: 'Watch the sky change colour, gather beneath the lights and settle into an evening under the stars.', explore: 'Sunset seating, glowing gardens and evenings around the campfire.', stay: 'Make a night of it with an overnight lakeview stay.', tone: 'sunset' },
    { title: 'Better when shared.', description: 'Bring your favourite people for outdoor games, homemade meals and relaxed moments together.', explore: 'Room to play, time to unwind and moments with your group.', stay: 'Choose tents or cottages to suit your group.', tone: 'garden' }
  ];
  get scene() { return this.scenes[Math.floor(this.activeIndex / 4) % this.scenes.length]; }
  openDetail() {
    this.detailOpen = true;
    this.galleryDetail?.nativeElement.showModal();
  }
  closeDetail() { this.galleryDetail?.nativeElement.close(); }
  onDetailClosed() {
    this.detailOpen = false;
    this.videoPlaying = false;
    this.galleryDetail?.nativeElement.querySelector('video')?.pause();
  }
  private timer?: number;
  private readonly onMotionChange = (event: MediaQueryListEvent) => { if (event.matches) { this.playing = false; this.stopTimer(); } };

  ngOnInit() {
    if (!this.motionQuery) return;
    this.motionQuery.addEventListener('change', this.onMotionChange);
    if (this.playing) this.startTimer();
  }

  ngOnDestroy() {
    this.stopTimer();
    this.motionQuery?.removeEventListener('change', this.onMotionChange);
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
        if (!document.hidden && !this.videoPlaying && !this.detailOpen && !this.element.nativeElement.contains(document.activeElement)
          && bounds.bottom > 0 && bounds.top < window.innerHeight) this.zone.run(() => this.next());
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
  preview(offset: number) { return this.photos[(this.activeIndex + offset) % this.photos.length]; }

  show(index: number) {
    this.transitionVersion++;
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
  previousSet() { this.show(this.activeIndex - 5); }
  nextSet() { this.show(this.activeIndex + 5); }

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

