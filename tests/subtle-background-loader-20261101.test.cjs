const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const loader = fs.readFileSync('patches/jonas-adult-page.js', 'utf8');
const patch = fs.readFileSync('patches/subtle-background-20261101.js', 'utf8');

test('adult Home, News and Android WebView apply subtle styles once after loading the shared script', () => {
  for (const [path, native] of [['/', false], ['/news/', false], ['/explore.html', true], ['/', true]]) {
    const dom = new JSDOM('<head></head><body><div class="poster-wall"><div class="poster-wall-grid"></div></div><div class="card"><a id="text">Read more</a><a id="art"><img src="/poster.jpg"></a></div></body>', { url: 'https://matchapp.tv' + path, runScripts: 'outside-only' });
    const w = dom.window;
    if (native) Object.defineProperty(w.navigator, 'userAgent', { value: 'MatchAppAiAndroid/68' });
    w.eval(loader);
    assert.equal(w.document.querySelectorAll('script[src*="subtle-background-20261101.js"]').length, 1);
    w.eval(patch);
    const style = w.document.querySelector('style#ma-subtle-bg-20261101');
    assert.ok(style, path + ': loaded script must not mistake its own script element for an applied style');
    assert.match(style.textContent, /opacity:\.28!important/);
    const anchorRule = [...style.sheet.cssRules].find(rule => rule.selectorText?.includes('.card'));
    assert.ok(w.document.querySelector('#text').matches(anchorRule.selectorText));
    assert.ok(!w.document.querySelector('#art').matches(anchorRule.selectorText), 'poster image links keep their existing geometry');
    w.eval(loader); w.eval(patch);
    assert.equal(w.document.querySelectorAll('script[src*="subtle-background-20261101.js"]').length, 1);
    assert.equal(w.document.querySelectorAll('style#ma-subtle-bg-20261101').length, 1);
    dom.window.close();
  }
});

test('Kids and sensitive auth surfaces never load the visual patch even when the entrypoint is called directly', () => {
  for (const path of ['/kids/', '/private-voice/', '/oauth/callback.html', '/callback.html', '/confirm.html']) {
    const dom = new JSDOM('', { url: 'https://matchapp.tv' + path, runScripts: 'outside-only' });
    dom.window.eval(loader); dom.window.eval(patch);
    assert.equal(dom.window.document.querySelectorAll('[id^="ma-subtle-bg-20261101"]').length, 0, path);
    dom.window.close();
  }
});
