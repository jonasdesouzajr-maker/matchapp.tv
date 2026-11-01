const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const loader = fs.readFileSync('patches/jonas-adult-page.js', 'utf8');
const patch = fs.readFileSync('patches/subtle-background-20261101.js', 'utf8');
const css = fs.readFileSync('patches/subtle-background-20261101.css', 'utf8');

test('adult Home, News and Android WebView apply subtle styles once after loading the shared script', () => {
  for (const [path, native] of [['/', false], ['/news/', false], ['/explore.html', true], ['/', true]]) {
    const dom = new JSDOM('<head></head><body><div class="poster-wall"><div class="poster-wall-grid"></div></div><div class="card"><a id="text">Read more</a><a id="art"><img src="/poster.jpg"></a><a id="vector"><svg></svg></a><a id="canvas"><canvas></canvas></a></div></body>', { url: 'https://matchapp.tv' + path, runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
    const w = dom.window;
    if (native) Object.defineProperty(w.navigator, 'userAgent', { value: 'MatchAppAiAndroid/68' });
    w.eval(loader);
    assert.equal(w.document.querySelectorAll('script[src*="subtle-background-20261101.js"]').length, 1);
    w.eval(patch);
    const link = w.document.querySelector('link#ma-subtle-bg-20261101');
    assert.ok(link, path + ': loaded script must not mistake its own script element for the stylesheet');
    assert.equal(w.document.documentElement.dataset.maSubtleActive, undefined);
    link.dispatchEvent(new w.Event('load'));
    assert.equal(w.document.documentElement.dataset.maSubtleActive, 'true');
    const style = w.document.createElement('style'); style.textContent = css; w.document.head.appendChild(style);
    assert.match(style.textContent, /opacity:\s*0?\.28\s*!important/);
    const flatten = rules => [...rules].flatMap(rule => rule.cssRules ? flatten(rule.cssRules) : [rule]);
    const anchorRule = flatten(style.sheet.cssRules).find(rule => rule.selectorText?.includes('.card'));
    assert.ok(anchorRule);
    assert.ok(w.document.querySelector('#text').matches(anchorRule.selectorText));
    for (const id of ['art', 'vector', 'canvas']) assert.ok(!w.document.querySelector('#' + id).matches(anchorRule.selectorText), id + ': media links keep their existing geometry');
    w.eval(loader); w.eval(patch);
    assert.equal(w.document.querySelectorAll('script[src*="subtle-background-20261101.js"]').length, 1);
    assert.equal(w.document.querySelectorAll('link#ma-subtle-bg-20261101').length, 1);
    dom.window.close();
  }
});

test('Kids and sensitive auth surfaces never load the visual patch even when the entrypoint is called directly', () => {
  for (const path of ['/kids/', '/private-voice/', '/oauth/callback.html', '/callback.html', '/confirm.html', '/android-studio/']) {
    const dom = new JSDOM('', { url: 'https://matchapp.tv' + path, runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
    dom.window.eval(loader); dom.window.eval(patch);
    assert.equal(dom.window.document.querySelectorAll('[id^="ma-subtle-bg-20261101"]').length, 0, path);
    dom.window.close();
  }
});

test('self-loading subtle styles use one canonical layered owner without changing poster geometry', () => {
  assert.match(patch, /link\.href='\/patches\/subtle-background-20261101\.css\?v=20261101-4'/);
  assert.doesNotMatch(patch, /textContent/);
  assert.match(css, /@layer ma-reference\.refinement\.subtle-background/);
  assert.doesNotMatch(css, /(?:font-size|font-weight|filter|transform|grid-template)\s*:|ad-slot|ad-client/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /border: 0 !important/);
});
