import { TestBed } from '@angular/core/testing';
import { StayOptionsComponent } from './stay-options.component';

describe('Clear stay prices', () => {
  it('shows both per-person prices and keeps stay selection attached to the availability button', async () => {
    await TestBed.configureTestingModule({ imports: [StayOptionsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(StayOptionsComponent);
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.stay-card');
    expect(cards[0].querySelector('.stay-price')!.textContent).toContain('999');
    expect(cards[0].querySelector('s')!.textContent).toContain('1199');
    expect(cards[1].querySelector('.stay-price strong')!.textContent).toContain('1499');
    expect(cards[1].querySelector('s')!.textContent).toContain('1699');
    expect(cards[0].querySelector('.price-unit')!.textContent).toBe('per person');
    const select = spyOn(fixture.componentInstance.bookStay, 'emit');
    cards[1].querySelector<HTMLButtonElement>('button')!.click();
    expect(select).toHaveBeenCalledWith('Cottage Stay (4-5 people)');
  });

});
