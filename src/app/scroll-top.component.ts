import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-scroll-top', standalone: true,
  template: `@if (visible) { <button type="button" (click)="scrollToTop()" aria-label="Scroll to top" title="Back to top"><i class="bi-arrow-up" aria-hidden="true"></i></button> }`,
  styles: [`button{position:fixed;left:max(20px,env(safe-area-inset-left));bottom:max(20px,env(safe-area-inset-bottom));z-index:1000;display:grid;place-items:center;width:46px;height:46px;border:1px solid #ffffff80;border-radius:50%;background:#bc6c25;color:white;box-shadow:0 4px 14px #0003;font-size:24px;cursor:pointer}button:hover{background:#99531a}button:focus-visible{outline:3px solid #dda15e;outline-offset:4px}`]
})
export class ScrollTopComponent {
  visible = window.scrollY > 400;
  @HostListener('window:scroll') onScroll() { this.visible = window.scrollY > 400; }
  scrollToTop() { window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }
}
