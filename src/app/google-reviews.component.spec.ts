import { TestBed } from '@angular/core/testing';
import { GoogleReviewsComponent } from './google-reviews.component';

describe('Google guest reviews', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GoogleReviewsComponent] }).compileComponents();
  });

  it('shows only supplied 4- and 5-star reviews without calculating an overall rating', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({ reviews: [
      { author: 'Test reviewer A', rating: 5, text: 'Review fixture A.' },
      { author: 'Test reviewer B', rating: 4, text: 'Review fixture B.' },
      { author: 'Test reviewer C', rating: 2, text: 'Review fixture C.' },
      { author: '', rating: 5, text: 'Invalid fixture.' }
    ] })));
    const fixture = TestBed.createComponent(GoogleReviewsComponent);
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();
    expect(fixture.componentInstance.reviews.length).toBe(2);
    expect(fixture.componentInstance.rating).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.review-card').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.selection-note').textContent).toContain('Featured 4- and 5-star');
  });

  it('keeps Google links available without showing fictional reviews when loading fails', async () => {
    spyOn(window, 'fetch').and.rejectWith(new Error('Offline'));
    const fixture = TestBed.createComponent(GoogleReviewsComponent);
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.google-invitation')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.review-card').length).toBe(0);
    const link = fixture.nativeElement.querySelector('.review-button') as HTMLAnchorElement;
    expect(link.href).toContain('google.com/maps?cid=');
  });

  it('hides aggregate rating/count when the verification date has not been supplied',async()=>{
    spyOn(window,'fetch').and.callFake(async()=>new Response(JSON.stringify({rating:4.8,totalReviews:138,verifiedAt:null,reviews:[]})));
    const fixture=TestBed.createComponent(GoogleReviewsComponent);await fixture.componentInstance.ngOnInit();fixture.detectChanges();
    expect(fixture.componentInstance.rating).toBeNull();expect(fixture.nativeElement.querySelector('.rating-summary')).toBeNull();
  });

  it('expands long reviews and displays only an explicitly supplied overall rating', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({ rating: 4.2, totalReviews: 10, verifiedAt:'2026-01-01', reviews: [
      { author: 'Test reviewer', rating: 4, text: 'A long review fixture. '.repeat(20) }
    ] })));
    const fixture = TestBed.createComponent(GoogleReviewsComponent);
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.read-more') as HTMLButtonElement;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click(); fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.rating-summary').textContent).toContain('4.2');
    expect(fixture.nativeElement.querySelector('.rating-summary').textContent).toContain('rating of 10 reviews');
  });
});
