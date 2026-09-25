const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'home-approved.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'home-approved.css'), 'utf8');
const play = 'https://play.google.com/store/apps/details?id=com.jonas.papercup';
function mount(lang, ua) {
  const dom = new JSDOM('<!doctype html><html lang="' + lang + '"><head></head><body class="page-home"><div class="home-hero"><h1 class="home-h1">MatchApp</h1></div></body></html>', {
    url: 'https://matchapp.tv/', runScripts: 'outside-only'
  });
  if (ua) Object.defineProperty(dom.window.navigator, 'userAgent', { value: ua, configurable: true });
  dom.window.eval(source);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom;
}
test('adult web has separate PWA Install and official Play Store link', () => {
  const dom = mount('en', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36');
  const chip = dom.window.document.getElementById('ma-install-chip');
  assert.ok(chip);
  assert.ok(chip.querySelector('.ma-install-go'));
  const link = chip.querySelector('.ma-play-store');
  assert.equal(link.href, play);
  assert.equal(link.textContent, 'Get it on Google Play');
  assert.equal(link.hidden, false);
  assert.equal(link.getAttribute('target'), '_blank');
  dom.window.document.documentElement.lang = 'pt-BR';
  dom.window.document.dispatchEvent(new dom.window.Event('matchapp:langchange'));
  assert.equal(link.textContent, 'Baixar no Google Play');
  assert.match(link.getAttribute('aria-label'), /MatchApp iA/);
  dom.window.close();
});
test('native shell does not promote installing itself; Kids paths are untouched', () => {
  const dom = mount('en', 'MatchAppTVAndroid Android');
  assert.equal(dom.window.document.querySelector('.ma-play-store').hidden, true);
  dom.window.close();
  assert.match(source, /if \(kids\(\)\) \{/);
  assert.match(css, /\.ma-play-store\[hidden\]\{display:none!important\}/);
});
test('the new adult store link keeps the existing Chrome install flow', () => {
  assert.match(source, /window\.installMatchApp\(\)/);
  assert.match(source, /intent:\/\/details\?id=com\.jonas\.papercup/);
  assert.doesNotMatch(source, /com\.justteamup\.matchapp/);
});
