const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('home first screen is one matcher with catalogs after the result', () => {
  const js = read('matchapp-ia.js');
  const css = read('matchapp-ia.css');
  const html = read('index.html');
  assert.match(js, /function presentFirstScreen/);
  assert.match(js, /Find something to watch/);
  assert.match(js, /function mountDock/);
  assert.match(js, /Also on MatchApp/);
  assert.doesNotMatch(js, /after\(hero,trending\);after\(trending,concierge\)/);
  assert.match(css, /#ma-first-screen/);
  assert.match(css, /#ma-dock/);
  assert.match(html, /first=20261002-1/);
});
