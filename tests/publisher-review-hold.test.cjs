'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function heldPage(html) {
  const dom = new JSDOM(html);
  try {
    const scripts = [...dom.window.document.scripts];
    const holds = scripts.filter(script => script.id === 'ma-publisher-review-hold');
    assert.equal(holds.length, 1);
    const [hold] = holds;
    assert.ok(!hold.hasAttribute('src') && !hold.hasAttribute('type'));
    const engine = scripts.find(script => script.src.startsWith('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?'));
    const manager = scripts.find(script => script.text.includes('googletagmanager.com/gtm.js'));
    assert.ok(engine && manager);
    assert.ok(scripts.indexOf(hold) < scripts.indexOf(manager));
    assert.ok(scripts.indexOf(hold) < scripts.indexOf(engine));

    const window = {};
    vm.runInNewContext(hold.text, {window});
    assert.equal(window.adsbygoogle.pauseAdRequests, 1);
    const queue = ['existing request'];
    window.adsbygoogle = queue;
    vm.runInNewContext(hold.text, {window});
    assert.equal(window.adsbygoogle, queue);
    assert.equal(queue[0], 'existing request');
    assert.equal(queue.pauseAdRequests, 1);
    assert.doesNotMatch(html, /pauseAdRequests\s*=\s*(?:0|false)\b/);
    return hold.text.trim().split('\n').map(line => line.trim()).join('\n');
  } finally { dom.window.close(); }
}

test('published Home and events archive pause Google ad requests before tag execution', () => {
  assert.equal(heldPage(read('index.html')), heldPage(read('events-archive.html')));
});

test('event generator preserves the publisher hold only for pages that carry the ad engine', () => {
  const source = read('tools/build-global-events.js');
  const definition = source.slice(source.indexOf('function consentDefaults()'), source.indexOf('function tracker()'));
  const defaults = vm.runInNewContext(definition + '\nconsentDefaults()');
  const inline = defaults.match(/<script id="ma-publisher-review-hold">([\s\S]*?)<\/script>/);
  assert.ok(inline);
  assert.equal(inline[1].trim(), heldPage(read('events-archive.html')));
  assert.match(source, /ads\?consentDefaults\(\):''/);
  assert.ok(!read('kids/index.html').includes('ma-publisher-review-hold'));
});
