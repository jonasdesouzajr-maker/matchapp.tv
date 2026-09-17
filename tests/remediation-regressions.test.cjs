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
  assert.match(deployFix, /10<\/strong> AI Matches Daily/);
  assert.match(runtime, /const vipDaily = 10/);
  assert.match(read('app.js'), /THE LIMIT LOGIC \(3 Free, 5 Registered, 10 VIP\)/);
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
  const start = html.indexOf('The Great British Baking Show');
  assert.ok(start >= 0, 'Baking Show entry is missing');
  const window = html.slice(start, start + 1800);
  assert.match(window, /Netflix/);
  assert.match(window, /reality show/);
  assert.doesNotMatch(window, /Spotify/);
  assert.doesNotMatch(window, /podcast/i);
});
