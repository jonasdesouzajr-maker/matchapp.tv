const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const catalog = require('../cooking/catalog.js');

test('adult cooking directory returns exact reviewed entries and honest fallback', () => {
  assert.equal(catalog.find('bibimbap').items[0].id, 'bibimbap');
  assert.equal(catalog.find('omelete').items[0].channelId, 'panelinha');
  assert(catalog.isCooking('Receitas da Rita Lobo'));
  assert(!catalog.isCooking('Recommend a funny movie'));
  for (const q of ['unlisted dish xyz', 'vegan nut-free birthday cake']) {
    const result = catalog.find(q);
    assert(result.fallback);
    assert(result.items.length);
    assert(result.items.every(item => item.channel && /^https:\/\//.test(item.channel)));
  }
  for (const recipe of catalog.recipes) {
    assert(catalog.channels.some(channel => channel.id === recipe.channelId));
    assert.match(recipe.url, /^https:\/\//);
    if (recipe.video) assert.match(recipe.video, /^[\w-]{11}$/);
  }
});

test('adult cooking page keeps source identity, defers video and escapes search content', () => {
  const html = fs.readFileSync('cooking/index.html', 'utf8');
  const dom = new JSDOM(html, {
    url: 'https://matchapp.tv/cooking/',
    runScripts: 'outside-only'
  });
  const { window } = dom;
  window.eval(fs.readFileSync('cooking/catalog.js', 'utf8'));
  window.eval(fs.readFileSync('cooking/cooking.js', 'utf8'));
  assert.equal(window.document.querySelectorAll('iframe').length, 0);
  assert.equal(window.document.querySelectorAll('#cooking-results article').length, 5);
  window.document.querySelector('#cooking-results button').click();
  assert.equal(window.document.querySelectorAll('iframe').length, 1);
  window.document.getElementById('cooking-query').value = '<script>unknown dish</script>';
  window.document.getElementById('cooking-form').dispatchEvent(
    new window.Event('submit', { cancelable: true })
  );
  assert.equal(window.document.querySelectorAll('#cooking-results script').length, 0);
  assert.match(window.document.getElementById('cooking-status').textContent, /not exact recipe matches/);
  assert.match(html, /rel="canonical" href="https:\/\/matchapp\.tv\/cooking\//);
  assert(!/adsbygoogle|kidsapp|gemini-proxy/.test(html));
  dom.window.close();
});

test('cooking route is indexed in both current sitemap and generator', () => {
  const xml = fs.readFileSync('sitemap.xml', 'utf8');
  const generator = fs.readFileSync('tools/update-sitemap.js', 'utf8');
  assert(xml.includes('<loc>https://matchapp.tv/cooking/</loc>'));
  assert(generator.includes('${SITE}/cooking/'));
});
