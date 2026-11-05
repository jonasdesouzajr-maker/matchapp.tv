'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const skip = new Set(['.git', '.github', 'node_modules', 'docs', 'tests',
  'android-studio', 'android', 'artifacts', 'reports', '.vercel']);
const webSource = /\.(?:html?|(?:c|m)?js|css|txt|json|xml|webmanifest)$/i;
const retired = ['mone', 'tag'].join('');
const prohibited = [
  new RegExp(retired, 'i'),
  /propellerads/i,
  /ef747ef29f80a7d061b0ad928a85e49b/i,
  /\b12152170\b/,
  /\b12151861\b/
];

function* publishedSources(dir = root) {
  for (const item of fs.readdirSync(dir, {withFileTypes: true})) {
    const current = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!skip.has(item.name)) yield* publishedSources(current);
    } else if (item.isFile() && webSource.test(item.name)) {
      yield current;
    }
  }
}

test('retired ad network has no verification or loading code in published browser sources', () => {
  let checked = 0;
  for (const file of publishedSources()) {
    const source = fs.readFileSync(file, 'utf8');
    for (const pattern of prohibited) {
      assert.doesNotMatch(source, pattern, path.relative(root, file) + ' retains retired ad inventory');
    }
    checked++;
  }
  assert.ok(checked >= 100, 'Expected full website source tree to be checked');
  assert.equal(fs.existsSync(path.join(root, 'browser-monetag-gate.js')), false,
    'No inactive provider integration may remain on main');
});

test('home keeps existing Google AdSense authorization and its own app service worker', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sellers = fs.readFileSync(path.join(root, 'ads.txt'), 'utf8');
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(html, /ca-pub-9541435081010948/);
  assert.match(sellers, /ca-pub-9541435081010948/);
  assert.match(worker, /MatchApp/);
  assert.match(html, /pauseAdRequests/);
});
