import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { CAMPSITE_SEARCH_FAQS } from './campsite-search-faqs';

const origin = 'https://5billionstars.com';
const pages = {
  home: {
    title: 'Pawna (Pawana) Lake Camping & Cottages | 5 Billion Stars',
    description: 'Pawna Lake camping at a campsite overlooking Pawana Lake, the Sahyadri hills and sunset fort views. Tents, A-frame cottages and meals included.',
    path: '/', robots: 'index, follow, max-image-preview:large'
  },
  policies: {
    title: 'Booking Terms & Privacy | 5 Billion Stars Camping',
    description: 'Read the booking, cancellation, rescheduling and privacy terms for tent and cottage stays at 5 Billion Stars Camping & Agro Tourism.',
    path: '/policies', robots: 'index, follow'
  },
  book: {
    title: 'Request Your Stay | 5 Billion Stars Camping',
    description: 'Request tent or cottage availability at 5 Billion Stars Camping near Pawana Lake. Confirm your dates and final quote with our team.',
    path: '/book', robots: 'noindex, follow'
  },
  private: {
    title: 'Admin | 5 Billion Stars', description: 'Private campsite administration.',
    path: '/admin/login', robots: 'noindex, nofollow'
  }
} as const;

@Injectable()
export class SeoTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title, private readonly meta: Meta, @Inject(DOCUMENT) private readonly document: Document) { super(); }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let route = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const key = route.data['seo'] as keyof typeof pages;
    const page = pages[key] ?? pages.private;
    const url = origin + page.path;
    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ name: 'robots', content: page.robots });
    for (const [property, content] of Object.entries({
      'og:type': 'website', 'og:site_name': '5 Billion Stars Camping & Agro Tourism',
      'og:title': page.title, 'og:description': page.description, 'og:url': url,
      'og:image': origin + '/images/banner/gazebo.jpg', 'og:image:alt': 'Lake-view gazebo at 5 Billion Stars Camping',
      'og:locale': 'en_IN'
    })) this.meta.updateTag({ property, content });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.meta.updateTag({ name: 'twitter:image', content: origin + '/images/banner/gazebo.jpg' });
    let canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = this.document.createElement('link'); canonical.rel = 'canonical'; this.document.head.appendChild(canonical); }
    canonical.href = url;
    this.document.getElementById('campsite-schema')?.remove();
    this.document.getElementById('campsite-faq-schema')?.remove();
    if (key === 'home') {
      const script = this.document.createElement('script');
      script.id = 'campsite-schema';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Campground', '@id': origin + '/#campsite',
        name: '5 Billion Stars Camping & Agro Tourism', url: origin + '/',
        description: 'Pawna Lake camping at a campsite overlooking Pawana Lake, the Sahyadri mountains and sunset fort views near Tikona Fort in Pune district, Maharashtra. Tent and A-frame cottage stays with meals, games and evening activities.',
        checkinTime: '16:00:00+05:30', checkoutTime: '11:00:00+05:30',
        containedInPlace: { '@type': 'Place', name: 'Pawna Lake area', alternateName: 'Pawana Lake area', address: { '@type': 'PostalAddress', addressRegion: 'Maharashtra', addressCountry: 'IN' } },
        telephone: '+91-8624908808', email: '5billionstarsct@gmail.com',
        image: origin + '/images/banner/gazebo.jpg',
        address: { '@type': 'PostalAddress', streetAddress: 'Gevhande Vasahat, Paud–Lonavala Road, Near Old Reliance Tower', addressLocality: 'Pune', addressRegion: 'Maharashtra', postalCode: '410406', addressCountry: 'IN' },
        geo: { '@type': 'GeoCoordinates', latitude: 18.634388, longitude: 73.503226 },
        hasMap: 'https://www.google.com/maps?cid=733698960901473858',
        sameAs: ['https://www.instagram.com/5_billion_stars/']
      }).replaceAll('<', '\\u003c');
      this.document.head.appendChild(script);
      const faqScript = this.document.createElement('script');
      faqScript.id = 'campsite-faq-schema';
      faqScript.type = 'application/ld+json';
      faqScript.textContent = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'FAQPage', '@id': origin + '/#booking-guide',
        about: { '@id': origin + '/#campsite' },
        mainEntity: CAMPSITE_SEARCH_FAQS.map(faq => ({
          '@type': 'Question', name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer }
        }))
      }).replaceAll('<', '\\u003c');
      this.document.head.appendChild(faqScript);
    }
  }
}
