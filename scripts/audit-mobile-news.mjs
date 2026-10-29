import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const pages = ['news.html', 'en/news.html', 'ru/news.html'];
const script = readFileSync(join(root, 'assets/script.js'), 'utf8');
const css = readFileSync(join(root, 'assets/style.css'), 'utf8');

assert.match(script, /function initRLSMobileNews\(/, 'mobile news initializer is missing');
assert.match(script, /document\.querySelectorAll\('\.news-list article\.news-card'\)/, 'news behavior must target every news card');
assert.match(script, /mobile-news-original/, 'news script must preserve original desktop markup');
assert.match(script, /mobile-news-details/, 'news script must create collapsible details');
assert.match(script, /window\.addEventListener\('resize',apply/, 'news behavior must respond to viewport changes');
assert.match(css, /\.mobile-news-summary/, 'mobile headline styles are missing');
assert.match(css, /@media\(max-width:600px\)/, 'mobile-only styles are missing');

for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  assert.match(html, /class="container news-list"/, page + ': news list container missing');
  assert.match(html, /assets\/script\.js\?v=\d{8}[\w-]*/, page + ': script cache version missing');
  const cards = [...html.matchAll(/<article class="news-card[^"]*"/g)];
  assert.ok(cards.length > 0, page + ': no news cards found');
  for (const match of cards) {
    const start = match.index;
    const end = html.indexOf('</article>', start);
    assert.ok(end > start, page + ': unclosed news card');
    assert.match(html.slice(start, end), /<h2\b/, page + ': every news card needs a heading for its mobile summary');
  }
}
console.log('Mobile news audit passed: all language pages, card headings, collapsible behavior, desktop restoration, and responsive styles are present.');
