const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('Android page never points to the unpublished Play listing', () => {
  const html = read('android/index.html');
  assert.match(html, /Google Play — Coming Soon/);
  assert.doesNotMatch(html, /play\.google\.com\/store\/apps\/details\?id=tv\.matchapp\.app/);
});

test('legacy domain stays out of the canonical sitemap and redirects to .tv', () => {
  const sitemap = read('sitemap.xml');
  const redirects = read('_redirects');
  assert.doesNotMatch(sitemap, /https?:\/\/(?:www\.)?matchapp\.cc/i);
  assert.match(redirects, /https:\/\/matchapp\.tv\/:splat\s+301/);
});

test('VIP copy remediation stays tied to the established 10/day entitlement', () => {
  const deployFix = read('tools/apply-critical-hotfixes.js');
  const runtime = read('build-meta.js');
  const locale = read('i18n.js');
  assert.match(deployFix, /10<\/strong> included AI actions daily/);
  assert.match(runtime, /const vipDaily = 10/);
  assert.match(read('app.js'), /INCLUDED DAILY AI ACTIONS \(3 Guest, 5 Registered, 10 VIP, 50 Business\)/);

  // The localization layer runs after build-meta.js. Every supported pricing
  // locale must therefore carry the 10/day copy itself or it can restore an
  // obsolete "unlimited" claim after the page initially renders correctly.
  const titleClaims = [...locale.matchAll(/'pricing\.title':\s*'([^']+)'/g)].map(m=>m[1]);
  const subtitleClaims = [...locale.matchAll(/'pricing\.subtitle':\s*'([^']+)'/g)].map(m=>m[1]);
  const vipClaims = [...locale.matchAll(/'pricing\.vipm\.f1':\s*'([^']+)'/g)].map(m=>m[1]);
  assert.equal(titleClaims.length, 14);
  assert.equal(subtitleClaims.length, 14);
  assert.equal(vipClaims.length, 14);
  for (const claim of [...titleClaims, ...subtitleClaims, ...vipClaims]) {
    assert.doesNotMatch(claim, /unlimited|infinite|ilimitad|illimit|unbegrenz|sınırsız|неогранич|безлимит|غير محدود|असीमित|tanpa batas|無制限|무제한|无限/i);
  }
  assert.equal(vipClaims.every(claim => /10/.test(claim)), true);
});

test('Kids deploy hotfix removes only the general GTM container', () => {
  const deployFix = read('tools/apply-critical-hotfixes.js');
  assert.match(deployFix, /Kids Mode: remove only the general-site GTM container/);
  assert.match(deployFix, /GTM-M7J3NNBN/);
  assert.match(deployFix, /Kids Mode still contains Google Tag Manager/);
});

test('event status remains date-driven so expired events cannot stay LIVE NOW', () => {
  const source = read('global-events.js');
  assert.match(source, /now>end\?'ended':'live'/);
  assert.match(source, /setInterval\(render,60000\)/);
});

test('Great British Baking Show taxonomy regression stays fixed', () => {
  const html = read('moods/cozy-comfort-watch/index.html');
  const needle = '<h3>The Great British Baking Show';
  const start = html.indexOf(needle);
  assert.ok(start >= 0, 'Baking Show rendered entry is missing');
  const end = html.indexOf('</li>', start);
  assert.ok(end > start, 'Baking Show rendered list item is malformed');
  const card = html.slice(start, end);
  assert.match(card, /Netflix/);
  assert.match(card, /reality show/);
  assert.doesNotMatch(card, /Spotify/);
  assert.doesNotMatch(card, /podcast/i);
});