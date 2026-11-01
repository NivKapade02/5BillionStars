import { Directive, ElementRef, HostListener, inject } from '@angular/core';

@Directive({ selector: 'a[appSectionLink]', standalone: true })
export class SectionLinkDirective {
  private readonly element = inject(ElementRef<HTMLAnchorElement>);

  @HostListener('click', ['$event']) navigate(event: MouseEvent) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const fragment = this.element.nativeElement.getAttribute('href');
    if (!fragment?.startsWith('#')) return;
    const target = document.getElementById(fragment.slice(1));
    if (!target) return;
    event.preventDefault();
    // Wait for the mobile menu to close before measuring the fixed header.
    window.requestAnimationFrame(() => {
      const headerBottom = document.querySelector('.navbar')?.getBoundingClientRect().bottom ?? 0;
      const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - headerBottom - 12);
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + fragment);
      window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
  }
}
