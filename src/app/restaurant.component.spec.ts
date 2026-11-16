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
    viewport.appendChild(card);
    document.body.appendChild(viewport);
    Object.defineProperty(viewport, 'clientWidth', { value: 1008 });
    Object.defineProperty(viewport, 'scrollWidth', { value: 2040 });
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
