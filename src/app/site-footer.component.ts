import { Component } from '@angular/core';
import { SectionLinkDirective } from './section-link.directive';

@Component({ selector: 'app-site-footer', standalone: true, imports: [SectionLinkDirective], templateUrl: './site-footer.component.html', styleUrl: './site-footer.component.css' })
export class SiteFooterComponent {}
