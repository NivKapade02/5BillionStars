import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SectionLinkDirective } from './section-link.directive';

@Component({ standalone: true, imports: [SectionLinkDirective], template: '<nav class="navbar"><a appSectionLink href="#test-destination">Go to section</a></nav><section id="test-destination">Destination</section>' })
class SectionLinkTestComponent {}

describe('Section menu navigation', () => {
  it('scrolls to the selected section below the fixed header without reloading', async () => {
    await TestBed.configureTestingModule({ imports: [SectionLinkTestComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SectionLinkTestComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    spyOn(root.querySelector('nav')!, 'getBoundingClientRect').and.returnValue({ bottom: 100 } as DOMRect);
    spyOn(root.querySelector('section')!, 'getBoundingClientRect').and.returnValue({ top: 800 } as DOMRect);
    spyOnProperty(window, 'scrollY', 'get').and.returnValue(0);
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    spyOn(window, 'requestAnimationFrame').and.callFake(callback => { callback(0); return 1; });
    const scroll = spyOn(window, 'scrollTo');
    const history = spyOn(window.history, 'replaceState');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    root.querySelector('a')!.dispatchEvent(click);
    expect(click.defaultPrevented).toBeTrue();
    expect((scroll as jasmine.Spy).calls.mostRecent().args[0]).toEqual({ top: 688, behavior: 'smooth' });
    expect(history.calls.mostRecent().args[2]).toContain('#test-destination');
  });
});
