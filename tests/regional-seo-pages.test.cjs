const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const regions = [
  ['au','en-AU'], ['br','pt-BR'], ['us','en-US'],
  ['uk','en-GB'], ['ca','en-CA'], ['jp','ja-JP']
];

test('regional landing pages have canonical and reciprocal hreflang cluster', () => {
  for (const [code, lang] of regions) {
    const html = fs.readFileSync(path.join(root, code, 'index.html'), 'utf8');
    assert.match(html, new RegExp('<html lang="' + lang.replace('-','\\-') + '">'));
    assert.ok(html.includes('<link rel="canonical" href="https://matchapp.tv/' + code + '/">'));
    assert.ok(html.includes('hreflang="x-default" href="https://matchapp.tv/guides/worldwide-entertainment-discovery/"'));
    for (const [peer, peerLang] of regions) {
      assert.ok(html.includes('hreflang="' + peerLang + '" href="https://matchapp.tv/' + peer + '/"'));
    }
    assert.ok(html.includes('application/ld+json'));
    assert.ok(html.includes('name="robots" content="index,follow,max-image-preview:large"'));
  }
});

test('regional routes persist in sitemap generator and current sitemap', () => {
  const generator = fs.readFileSync(path.join(root, 'tools', 'update-sitemap.js'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const [code] of regions) {
    assert.ok(generator.includes("\\${SITE}/" + code + "/"));
    assert.ok(sitemap.includes('<loc>https://matchapp.tv/' + code + '/</loc>'));
  }
});
