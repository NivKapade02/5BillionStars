import { TestBed } from '@angular/core/testing';
import { HeroBannerComponent } from './hero-banner.component';

describe('Homepage banner slideshow', () => {
  let callback: () => void;
  let motion: { matches: boolean; addEventListener: jasmine.Spy; removeEventListener: jasmine.Spy };

  beforeEach(async () => {
    callback = () => {};
    motion = { matches: false, addEventListener: jasmine.createSpy('addEventListener'), removeEventListener: jasmine.createSpy('removeEventListener') };
    spyOn(window, 'matchMedia').and.returnValue(motion as unknown as MediaQueryList);
    spyOn(window, 'setInterval').and.callFake((handler: TimerHandler) => { callback = handler as () => void; return 71; });
    spyOn(window, 'clearInterval');
    spyOnProperty(document, 'hidden', 'get').and.returnValue(false);
    await TestBed.configureTestingModule({ imports: [HeroBannerComponent] }).compileComponents();
  });

  it('rotates photos every five seconds and loops to the beginning', () => {
    const fixture = TestBed.createComponent(HeroBannerComponent);
    fixture.detectChanges();
    expect((window.setInterval as jasmine.Spy).calls.mostRecent().args[1]).toBe(5000);
    callback(); fixture.detectChanges();
    expect(fixture.componentInstance.activeIndex).toBe(1);
    expect(fixture.componentInstance.previousIndex).toBe(0);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.banner-frame.active').length).toBe(1);
    for (let index = 1; index < fixture.componentInstance.slides.length; index++) callback();
    expect(fixture.componentInstance.activeIndex).toBe(0);
  });

  it('supports pause, resume and manual photo selection', () => {
    const fixture = TestBed.createComponent(HeroBannerComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.playback')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.playing).toBeFalse();
    expect(window.clearInterval).toHaveBeenCalledWith(71);
    expect(root.querySelector('.playback')?.getAttribute('aria-label')).toBe('Play banner slideshow');
    root.querySelector<HTMLButtonElement>('.playback')!.click();
    expect(fixture.componentInstance.playing).toBeTrue();
    root.querySelectorAll<HTMLButtonElement>('.banner-dot').item(2).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.activeIndex).toBe(2);
    expect(fixture.componentInstance.playing).toBeFalse();
    expect(root.querySelectorAll('.banner-dot.selected').length).toBe(1);
  });

  it('starts paused for visitors who request reduced motion', () => {
    motion.matches = true;
    const fixture = TestBed.createComponent(HeroBannerComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.playing).toBeFalse();
    expect(window.setInterval).not.toHaveBeenCalled();
  });

  it('does not advance hidden tabs and cleans up timers and media listeners', () => {
    const fixture = TestBed.createComponent(HeroBannerComponent);
    fixture.detectChanges();
    (Object.getOwnPropertyDescriptor(document, 'hidden')!.get as jasmine.Spy).and.returnValue(true);
    callback();
    expect(fixture.componentInstance.activeIndex).toBe(0);
    fixture.destroy();
    expect(window.clearInterval).toHaveBeenCalledWith(71);
    expect(motion.removeEventListener).toHaveBeenCalledWith('change', motion.addEventListener.calls.first().args[1]);
  });
});
