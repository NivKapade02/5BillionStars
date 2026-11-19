import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { NgZone, Optional } from '@angular/core';
import reviewSnapshot from '../../public/google-reviews.json';
interface GuestReview { author: string; rating: 4 | 5; text: string; dateLabel?: string; }

@Component({
  selector: 'app-google-reviews',
  standalone: true,
  templateUrl: './google-reviews.component.html',
  styleUrl: './google-reviews.component.css'
})
export class GoogleReviewsComponent implements OnInit, OnDestroy {
  constructor(@Optional() private readonly zone: NgZone | null = null) {}
  @ViewChild('reviewsViewport') private reviewsViewport?: ElementRef<HTMLDivElement>;
  private slideTimer?: ReturnType<typeof setInterval>;
  autoplay = true;
  pointerPaused = false;
  focusPaused = false;
  readonly mapsUrl = 'https://www.google.com/maps?cid=' + BigInt('0xa2e9f51509b0642').toString();
  reviews: GuestReview[] = this.reviewCards(reviewSnapshot.reviews);
  rating: number | null = null;
  totalReviews: number | null = null;
  verifiedAt = '';
  readonly expanded = new Set<GuestReview>();

  async ngOnInit() {
    if (typeof window === 'undefined') return;
    clearInterval(this.slideTimer);
    this.autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = () => setInterval(() => {
      if (this.autoplay && !this.pointerPaused && !this.focusPaused && !this.expanded.size && !document.hidden) {
        this.zone ? this.zone.run(() => this.slideReviews(1)) : this.slideReviews(1);
      }
    }, 5000);
    this.slideTimer = this.zone ? this.zone.runOutsideAngular(start) : start();
    try {
      const response = await fetch('/google-reviews.json', { cache: 'no-cache' });
      if (!response.ok) return;
      const data = await response.json();
      if (!data || !Array.isArray(data.reviews)) return;
      this.reviews = this.reviewCards(data.reviews);
      const verified = typeof data.verifiedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.verifiedAt) && Number.isFinite(Date.parse(data.verifiedAt)) && new Date(data.verifiedAt).toISOString().slice(0,10) === data.verifiedAt && data.verifiedAt <= new Date().toISOString().slice(0,10);
      if (verified && typeof data.rating === 'number' && data.rating >= 1 && data.rating <= 5 && Number.isInteger(data.totalReviews) && data.totalReviews > 0) {
        this.verifiedAt = data.verifiedAt;
        this.rating = data.rating;
        this.totalReviews = data.totalReviews;
      }
    } catch { /* Keep the supplied customer cards visible when refreshing fails. */ }
  }

  private reviewCards(reviews: unknown): GuestReview[] {
    if (!Array.isArray(reviews)) return [];
    return reviews.filter((review: Partial<GuestReview> | null) => review &&
      (review.rating === 4 || review.rating === 5) &&
      typeof review.author === 'string' && review.author.trim().length > 0 &&
      typeof review.text === 'string' && review.text.trim().length > 0
    ).slice(0, 8).map((review: GuestReview) => ({ author: review.author.trim(), rating: review.rating, text: review.text.trim(), dateLabel: typeof review.dateLabel === 'string' ? review.dateLabel : undefined }));
  }

  ngOnDestroy() { clearInterval(this.slideTimer); }

  slideReviews(direction: number) {
    const viewport = this.reviewsViewport?.nativeElement;
    const card = viewport?.querySelector<HTMLElement>('.review-card');
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

  stars(rating: number) { return '★'.repeat(rating) + '☆'.repeat(5 - rating); }
  excerpt(review: GuestReview) { return this.expanded.has(review) || review.text.length <= 220 ? review.text : review.text.slice(0, 220) + '…'; }
  toggle(review: GuestReview) { this.expanded.has(review) ? this.expanded.delete(review) : this.expanded.add(review); }
}
