import { ElementRef } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { RestaurantComponent } from './restaurant.component';

describe('Restaurant menu carousel', () => {
  let component: RestaurantComponent;
  let viewport: HTMLDivElement;
  let scrollTo: jasmine.Spy;

  beforeEach(() => {
    component = new RestaurantComponent();
    viewport = document.createElement('div');
    viewport.style.columnGap = '24px';
    const card = document.createElement('article');
    card.className = 'food-card';
    Object.defineProperty(card, 'offsetWidth', { value: 320 });
    spyOn(card, 'getBoundingClientRect').and.returnValue({ width: 320 } as DOMRect);
    viewport.appendChild(card);
    document.body.appendChild(viewport);
    Object.defineProperty(viewport, 'clientWidth', { value: 1008, configurable: true });
    Object.defineProperty(viewport, 'scrollWidth', { value: 2040, configurable: true });
    Object.defineProperty(viewport, 'scrollLeft', { value: 0, writable: true });
    scrollTo = spyOn(viewport, 'scrollTo');
    Object.assign(component, { menuViewport: new ElementRef(viewport) });
  });

  afterEach(() => { component.ngOnDestroy(); viewport.remove(); });

  it('advances by three cards and wraps at the end', () => {
    component.slideMenu(1);
    expect(scrollTo).toHaveBeenCalledWith(jasmine.objectContaining({ left: 1032 }));
    viewport.scrollLeft = 1032;
    component.slideMenu(1);
    expect(scrollTo).toHaveBeenCalledWith(jasmine.objectContaining({ left: 0 }));
    viewport.scrollLeft = 0;
    component.slideMenu(-1);
    expect(scrollTo).toHaveBeenCalledWith(jasmine.objectContaining({ left: 1032 }));
  });

  it('resets the carousel when filtering dishes', () => {
    component.firstVisibleIndex = 6;
    component.selectCategory('Drinks');
    expect(component.filteredMenu.every(item => item.category === 'Drinks')).toBeTrue();
    expect(component.firstVisibleIndex).toBe(0);
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'instant' });
  });

  it('moves both mobile arrows by one card and wraps in both directions', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const card = viewport.querySelector<HTMLElement>('.food-card')!;
    (card.getBoundingClientRect as jasmine.Spy).and.returnValue({ width: 343.5 } as DOMRect);
    viewport.style.columnGap = '18px';
    Object.defineProperty(viewport, 'clientWidth', { value: 344 });
    Object.defineProperty(viewport, 'scrollWidth', { value: 1067 });

    component.slideMenu(1);
    expect(scrollTo).toHaveBeenCalledWith({ left: 361.5, behavior: 'instant' });
    viewport.scrollLeft = 361.5;
    component.slideMenu(-1);
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'instant' });
    viewport.scrollLeft = 0;
    component.slideMenu(-1);
    expect(scrollTo).toHaveBeenCalledWith({ left: 723, behavior: 'instant' });
    viewport.scrollLeft = 723;
    component.slideMenu(1);
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'instant' });
    component.updateSlidePosition();
    expect(component.visibleCount).toBe(1);
    expect(component.firstVisibleIndex).toBe(2);
  });

  it('handles a browser reporting the gap as normal', () => {
    viewport.style.columnGap = 'normal';
    component.slideMenu(1);
    expect(scrollTo).toHaveBeenCalledWith(jasmine.objectContaining({ left: 960 }));
  });

  it('tracks the visible range after scrolling', () => {
    viewport.scrollLeft = 1032;
    component.updateSlidePosition();
    expect(component.visibleCount).toBe(3);
    expect(component.firstVisibleIndex).toBe(3);
    expect(component.lastVisibleIndex).toBe(6);
  });

  it('pauses on interaction and clears its timer on destruction', fakeAsync(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    spyOnProperty(document, 'hidden', 'get').and.returnValue(false);
    const slide = spyOn(component, 'slideMenu');
    component.ngAfterViewInit();
    tick(4500);
    expect(slide).toHaveBeenCalledTimes(1);
    component.pointerPaused = true;
    tick(4500);
    expect(slide).toHaveBeenCalledTimes(1);
    component.pointerPaused = false;
    component.focusPaused = true;
    tick(4500);
    expect(slide).toHaveBeenCalledTimes(1);
    component.ngOnDestroy();
    tick(4500);
    expect(slide).toHaveBeenCalledTimes(1);
  }));
});
