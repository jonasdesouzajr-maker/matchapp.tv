'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const script = fs.readFileSync(path.join(__dirname, '..', 'patches', 'android-download-bubble-20261117.js'), 'utf8');
const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36';

function fixture({ userAgent = android, url = 'https://matchapp.tv/', dialog = false } = {}) {
  const html = '<!doctype html><html><head></head><body><button id="content">Explore</button>' +
    (dialog ? '<div id="dialog" role="dialog">Modal</div>' : '') + '</body></html>';
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: userAgent });
  const tasks = new Map();
  let now = 1700000000000;
  let sequence = 0;
  window.Date.now = () => now;
  window.setTimeout = (fn, delay = 0) => {
    const id = ++sequence;
    tasks.set(id, { at: now + Number(delay), fn });
    return id;
  };
  window.clearTimeout = (id) => tasks.delete(id);
  function advance(ms) {
    const until = now + ms;
    for (let limit = 0; limit < 2000; limit++) {
      const ready = [...tasks].filter(([, task]) => task.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!ready) { now = until; return; }
      now = ready[1].at;
      tasks.delete(ready[0]);
      ready[1].fn();
    }
    throw new Error('Prompt timer did not settle');
  }
  window.eval(script);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  const prompt = () => window.document.getElementById('ma-smart-play-prompt');
  const close = () => {
    const el = prompt();
    assert.ok(el, 'prompt should exist before closing');
    el.querySelector('.ma-spp-close').click();
    assert.equal(prompt(), null, 'close must remove the prompt');
  };
  const clickContent = (times = 1) => {
    for (let n = 0; n < times; n++) {
      window.document.getElementById('content').dispatchEvent(
        new window.MouseEvent('click', { bubbles: true, clientX: 250, clientY: 240 })
      );
    }
  };
  return { dom, window, advance, prompt, close, clickContent };
}

test('Android browser shows an accessible, dismissible official Google Play CTA', () => {
  const f = fixture();
  f.advance(10001);
  const p = f.prompt();
  assert.ok(p, 'engaged Android browser should see the prompt');
  assert.equal(p.getAttribute('aria-label'), 'Download the official MatchApp Ai Android app');
  assert.match(p.querySelector('.ma-spp-cta').href, /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.jonas\.papercup$/);
  assert.equal(p.querySelector('img').getAttribute('src'), '/assets/brand/matchapp-ai-icon-192.png');
  assert.equal(p.querySelector('.ma-spp-close').getAttribute('aria-label'), 'Close');
  f.close();
  f.dom.window.close();
});

test('Android engagement shows prompt, and dismissal respects cooldown and four-show cap', () => {
  const f = fixture();
  f.clickContent(7);
  f.advance(700);
  assert.ok(f.prompt());
  f.close();
  f.advance(4 * 60 * 1000 - 1);
  assert.equal(f.prompt(), null, 'do not reshow early');
  f.advance(1);
  assert.ok(f.prompt(), 'reshow after the first cooldown');
  f.close();
  f.advance(12 * 60 * 1000);
  assert.ok(f.prompt(), 'third show after second cooldown');
  f.close();
  f.advance(25 * 60 * 1000);
  assert.ok(f.prompt(), 'fourth show after third cooldown');
  f.close();
  f.advance(60 * 60 * 1000);
  assert.equal(f.prompt(), null, 'hard cap must prevent a fifth show');
  assert.equal(JSON.parse(f.window.sessionStorage.getItem('ma-smart-play-v1')).shows, 4);
  f.dom.window.close();
});

test('non-Android, native app shells and Kids pages never receive the Android promotion', () => {
  const cases = [
    { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' },
    { userAgent: android + ' MatchAppAiAndroid/79' },
    { userAgent: android + ' MatchAppTVAndroid/79' },
    { userAgent: android, url: 'https://matchapp.tv/kids/' },
    { userAgent: android, url: 'https://matchapp.tv/oauth/callback' },
  ];
  for (const options of cases) {
    const f = fixture(options);
    f.clickContent(7);
    f.advance(20000);
    assert.equal(f.prompt(), null, 'guard failed for ' + JSON.stringify(options));
    f.dom.window.close();
  }
});

test('open modal suppresses promotion until dialog has closed', () => {
  const f = fixture({ dialog: true });
  f.advance(11000);
  assert.equal(f.prompt(), null);
  f.window.document.getElementById('dialog').remove();
  f.advance(8100);
  assert.ok(f.prompt());
  f.close();
  f.dom.window.close();
});
