import { TestBed } from '@angular/core/testing';
import { PhotoGalleryComponent } from './photo-gallery.component';

describe('Photo gallery slider', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PhotoGalleryComponent] }).compileComponents();
  });

  it('navigates in both directions and wraps around while updating the displayed image', () => {
    const fixture = TestBed.createComponent(PhotoGalleryComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.next')!.click();
    fixture.detectChanges();
    expect(root.querySelector('img.main-photo')?.getAttribute('src')).toBe(component.photos[1].src);
    expect(root.querySelector('[role="status"]')?.textContent).toContain('2 / ' + component.photos.length);
    root.querySelector<HTMLButtonElement>('.previous')!.click();
    root.querySelector<HTMLButtonElement>('.previous')!.click();
    fixture.detectChanges();
    expect(component.activeIndex).toBe(component.photos.length - 1);
    root.querySelector<HTMLButtonElement>('.next')!.click();
    expect(component.activeIndex).toBe(0);
  });

  it('supports direct thumbnail selection and announces the chosen photo', () => {
    const fixture = TestBed.createComponent(PhotoGalleryComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelectorAll<HTMLButtonElement>('.thumbnail').item(8).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.activeIndex).toBe(8);
    expect(root.querySelector('.thumbnail.selected')?.getAttribute('aria-current')).toBe('true');
    expect(root.querySelector('img.main-photo')?.getAttribute('alt')).toBe(fixture.componentInstance.photos[8].alt);
  });

  it('supports arrow, Home and End keys without intercepting vertical page navigation', () => {
    const fixture = TestBed.createComponent(PhotoGalleryComponent);
    fixture.detectChanges();
    const stage = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.photo-stage')!;
    const key = (value: string) => { const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }); stage.dispatchEvent(event); return event; };
    expect(key('ArrowRight').defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.activeIndex).toBe(1);
    key('End');
    expect(fixture.componentInstance.activeIndex).toBe(fixture.componentInstance.photos.length - 1);
    key('Home');
    expect(fixture.componentInstance.activeIndex).toBe(0);
    expect(key('ArrowDown').defaultPrevented).toBeFalse();
  });

  it('responds to horizontal swipes and ignores vertical scrolling gestures', () => {
    const fixture = TestBed.createComponent(PhotoGalleryComponent);
    fixture.detectChanges();
    const stage = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.photo-stage')!;
    const touch = (type: string, x: number, y: number) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, type === 'touchstart' ? 'touches' : 'changedTouches', { value: [{ clientX: x, clientY: y }] });
      stage.dispatchEvent(event);
    };
    touch('touchstart', 200, 100); touch('touchend', 100, 105);
    expect(fixture.componentInstance.activeIndex).toBe(1);
    touch('touchstart', 100, 100); touch('touchend', 110, 220);
    expect(fixture.componentInstance.activeIndex).toBe(1);
    touch('touchstart', 100, 100); touch('touchend', 200, 105);
    expect(fixture.componentInstance.activeIndex).toBe(0);
  });

  it('filters 200 items into 180 photos and 20 videos and resets the selection', () => {
    const fixture = TestBed.createComponent(PhotoGalleryComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.allMedia.length).toBe(200);
    component.show(50);
    component.setFilter('video');
    fixture.detectChanges();
    expect(component.activeIndex).toBe(0);
    expect(component.photos.length).toBe(20);
    const video = (fixture.nativeElement as HTMLElement).querySelector('video')!;
    expect(video.controls).toBeTrue();
    expect(video.autoplay).toBeFalse();
    expect(video.preload).toBe('none');
    component.previous();
    expect(component.activeIndex).toBe(19);
    component.setFilter('photo');
    fixture.detectChanges();
    expect(component.photos.length).toBe(180);
    expect((fixture.nativeElement as HTMLElement).querySelector('video')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('img.main-photo')).not.toBeNull();
  });

  it('preserves native video keyboard controls', () => {
    const fixture = TestBed.createComponent(PhotoGalleryComponent);
    fixture.componentInstance.setFilter('video');
    fixture.detectChanges();
    const video = (fixture.nativeElement as HTMLElement).querySelector('video')!;
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    video.dispatchEvent(event);
    expect(event.defaultPrevented).toBeFalse();
    expect(fixture.componentInstance.activeIndex).toBe(0);
  });

  it('shows outdoor games, group moments and dancing photos and videos by activity', () => {
    const fixture = TestBed.createComponent(PhotoGalleryComponent);
    const component = fixture.componentInstance;
    component.setFilter('games');
    expect(component.photos.length).toBe(8);
    expect(component.photos.every(item => item.category === 'games')).toBeTrue();
    component.setFilter('dance');
    expect(component.photos.some(item => item.kind === 'photo')).toBeTrue();
    expect(component.photos.some(item => item.kind === 'video')).toBeTrue();
    component.setFilter('groups');
    expect(component.photos.length).toBeGreaterThan(0);
    expect(component.activeIndex).toBe(0);
  });

  it('loads a published video preview with valid duration and dimensions', async () => {
    const fixture = TestBed.createComponent(PhotoGalleryComponent);
    fixture.componentInstance.setFilter('video');
    fixture.detectChanges();
    const video = (fixture.nativeElement as HTMLElement).querySelector('video')!;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('The gallery video could not be loaded.'));
      video.load();
    });
    expect(video.duration).toBeGreaterThan(0);
    expect(video.duration).toBeLessThan(12.2);
    expect(video.videoWidth).toBeGreaterThan(0);
  });
});
