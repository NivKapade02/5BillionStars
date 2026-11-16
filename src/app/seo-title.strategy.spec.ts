import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot } from '@angular/router';
import { SeoTitleStrategy } from './seo-title.strategy';

describe('Public page search metadata', () => {
  let page: Document;
  let strategy: SeoTitleStrategy;
  const route = (seo: string) => ({ root: { firstChild: { data: { seo }, firstChild: null } } }) as unknown as RouterStateSnapshot;

  beforeEach(() => {
    page = document.implementation.createHTMLDocument('');
    strategy = new SeoTitleStrategy(new Title(page), new Meta(page), page);
  });

  it('publishes a canonical homepage and valid campsite identity', () => {
    strategy.updateTitle(route('home'));
    expect(page.title).toContain('Pawana Lake Camping');
    expect(page.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://5billionstars.com/');
    expect(page.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('index, follow');
    const schema = JSON.parse(page.getElementById('campsite-schema')!.textContent!);
    expect(schema['@type']).toBe('Campground');
    expect(schema.telephone).toBe('+91-8624908808');
    expect(schema.aggregateRating).toBeUndefined();
  });

  it('replaces route metadata without retaining homepage markup or duplicating canonicals', () => {
    strategy.updateTitle(route('home'));
    strategy.updateTitle(route('policies'));
    expect(page.title).toContain('Booking Terms');
    expect(page.getElementById('campsite-schema')).toBeNull();
    expect(page.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(page.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://5billionstars.com/policies');
    strategy.updateTitle(route('home'));
    expect(page.querySelectorAll('#campsite-schema').length).toBe(1);
  });

  it('keeps admin and booking request pages out of search results', () => {
    for (const key of ['book', 'private']) {
      strategy.updateTitle(route(key));
      expect(page.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
      expect(page.getElementById('campsite-schema')).toBeNull();
    }
  });
});
