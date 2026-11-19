import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist/5-billion-stars/browser');
const home = await fs.readFile(path.join(output, 'index.html'), 'utf8');
const policies = await fs.readFile(path.join(output, 'policies/index.html'), 'utf8');
const shell = await fs.readFile(path.join(output, 'index.csr.html'), 'utf8');
for (const [html, canonical] of [[home, 'https://5billionstars.com/'], [policies, 'https://5billionstars.com/policies']]) {
  assert.ok(html.includes(`rel="canonical" href="${canonical}"`), 'Correct public canonical');
  assert.match(html, /name="description" content="[^"]{40,}"/, 'Page description');
  assert.match(html, /property="og:title"/, 'Social sharing metadata');
  assert.match(html, /ngh=/, 'Angular hydration annotations');
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, 'One primary heading');
}
for (const section of ['stays', 'section_2', 'section_3', 'section_33', 'section_4', 'nearby-places', 'booking-guide', 'section_5']) {
  assert.ok(home.includes(`id="${section}"`), `Pre-rendered section: ${section}`);
}
assert.match(home, /When do we arrive and leave\?/, 'FAQ answers in initial HTML');
assert.match(home, /checkout at 11:00 AM/, 'Visible factual answer');
const script = home.match(/<script[^>]*id="campsite-schema"[^>]*>([\s\S]*?)<\/script>/);
assert.ok(script, 'Campsite JSON-LD');
const schema = JSON.parse(script[1]);
assert.equal(schema['@type'], 'Campground');
assert.equal(schema.telephone, '+91-8624908808');
assert.match(home, /<title>Pawna \(Pawana\) Lake Camping/, 'Both lake spellings in title');
assert.match(home, /<h1[^>]*>[\s\S]*?Pawana Lake View Camping[\s\S]*?<\/h1>/, 'Accurate setting in visible main heading');
assert.match(schema.description, /Pawna Lake/);
assert.match(schema.description, /Pawana Lake/);
const faqScript = home.match(/<script[^>]*id="campsite-faq-schema"[^>]*>([\s\S]*?)<\/script>/);
assert.ok(faqScript, 'Answer markup in initial HTML');
const faqSchema = JSON.parse(faqScript[1]);
assert.equal(faqSchema['@type'], 'FAQPage');
assert.equal(faqSchema.mainEntity.length, 4);
const visibleAnswers = home.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  .replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
for (const question of faqSchema.mainEntity) {
  assert.ok(visibleAnswers.includes(question.name), 'Schema question also appears in visible content');
  assert.ok(visibleAnswers.includes(question.acceptedAnswer.text), 'Schema answer also appears in visible content');
}
assert.ok(!policies.includes('id="campsite-faq-schema"'), 'No homepage FAQs on policy route');
assert.ok(!policies.includes('id="campsite-schema"'), 'No unrelated business markup on policy page');
assert.ok(!shell.includes('id="section_1"'), 'Client routes receive an empty hydration shell');
for (const file of ['robots.txt', 'sitemap.xml', 'video/Website Carsuole.mp4']) await fs.access(path.join(output, file));
console.log('SEO checks passed: pre-rendered public content, metadata, JSON-LD, hydration shell and crawl files.');
