# Performance, SEO and answer-engine audit

Local source/build audit: 16 November 2026. “AOE” was interpreted as AEO
(answer-engine optimization). Changes are prepared locally, not deployed.

## Findings and changes

| Finding | Implemented change |
| --- | --- |
| Admin dashboard and chart registration loaded with the public app | Lazy routes; chart providers moved into the dashboard; unused global PrimeNG theme providers removed |
| Booking form code downloaded before visitors opened it | Deferred booking component with a visible loading state |
| Initial page was an empty Angular shell | Homepage and policy page now pre-render at build time and hydrate in the browser |
| Browser globals and recurring timers prevented safe pre-rendering/hydration | Browser guards; carousel timers run outside Angular change detection |
| Optional public tracking loaded Auth and realtime Firestore | Write-only Firestore Lite client for usage events; full SDK remains available to booking and admin flows |
| All five large banner images loaded immediately | Only current and next image load initially; previous image stays available during transitions; first image is preloaded |
| Styles were discovered from links inside the homepage body | Styles now participate in the production CSS pipeline and critical-CSS processing |
| Missing descriptions, canonical URLs and sharing metadata | Route-specific titles, descriptions, canonicals, Open Graph and Twitter metadata |
| Search engines had limited campsite identity information | Campground JSON-LD using the existing business name, address, phone, coordinates and Instagram link; no unverified ratings or opening hours |
| Missing crawl files | Public robots.txt and sitemap.xml for the homepage and policies |
| Admin/request pages could inherit public search metadata | Route noindex metadata and Firebase X-Robots-Tag headers |
| Cache policy omitted some assets | Long caching for hashed bundles, daily caching for images/assets/video, revalidation for public HTML and request pages |

Firebase fallback now serves `index.csr.html` to client-only routes. The homepage
continues to use pre-rendered `index.html`, and `/policies` uses its own generated
HTML. This prevents the homepage hydration markup being reused for unrelated
booking/admin routes.

## Measured build results

- Initial JavaScript: approximately **942 KB → 343 KB**, a **64% reduction** in
  raw initial bundle size. This is the CLI's initial JavaScript group; homepage
  route chunks, optional features and tracking can load additional JavaScript.
- Production global CSS is approximately **289 KB raw** (estimated 33 KB
  compressed). Previously these styles loaded as separate uncounted files;
  comparing initial totals including CSS would not be like-for-like.
- Two public routes pre-render successfully. FAQ answers, stay information,
  restaurant, nearby places and contact details are present in homepage HTML
  without executing JavaScript.
- The earlier media optimization remains in place: **344 MB → 130 MB** across
  the media directories. This is total packaged media, not initial page weight.

## Validation

- Production build passed.
- 31 focused browser tests passed: route navigation, deferred booking,
  metadata transitions, carousels and optional tracking behavior.
- `npm run verify:seo` passed against the generated public HTML, structured data,
  metadata, hydration shell, crawl files and campsite video asset.
- A Chrome smoke test at 390 × 844 passed homepage hydration, mobile navigation,
  lazy booking dialog, direct booking route, policy metadata and admin noindex.
  No hydration or runtime console errors were observed. Optional analytics was
  opted out and the external map iframe was blocked during this local test.

## Remaining work and limits

The build still warns about CSS/component budgets, Firebase's Node-side CommonJS
dependencies in server compilation, and two legacy Bootstrap selectors skipped
by critical-CSS extraction. The complete stylesheet is still shipped. A future
CSS cleanup can remove unused Bootstrap/icon rules, with visual checks across
public, booking and admin screens.

No production Lighthouse score, field Core Web Vitals, Search Console indexing,
Google rich-result eligibility or AI-answer inclusion has been measured or
claimed. The local smoke test is functional validation, not a mobile network
performance benchmark. Hosting cache and noindex headers must also be checked
on the actual deployed Firebase site.

After deploying, submit `https://5billionstars.com/sitemap.xml` in Search Console,
inspect the two public URLs, and measure mobile LCP, INP and CLS on the real
hosting environment. Keep visible pricing, FAQ answers and campsite contact
details accurate when making future content changes.

Public reviews still load from the review feed in the browser; no review ratings
were added to structured data. There is no special AI schema or indexing promise.
Readable pre-rendered answers and accurate business identity support discovery.

References:

- [Angular rendering strategies](https://angular.dev/guide/ssr)
- [Angular deferred loading](https://angular.dev/best-practices/performance/defer)
- [Google guidance for generative AI search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
