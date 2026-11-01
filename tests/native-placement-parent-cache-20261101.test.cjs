'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const root = path.join(__dirname, '..');

test('a warm Explore parent cache cannot retain the pre-account-readiness child URL', async () => {
  const page = new JSDOM(fs.readFileSync(path.join(root, 'explore.html'), 'utf8'));
  const current = page.window.document.querySelector('script[src^="/patches/jonas-adult-page.js"]').src;
  page.window.close();
  const fresh = new URL(current, 'https://matchapp.tv'), stale = new URL(fresh);
  assert.equal(fresh.searchParams.get('account'), '20261101-2');
  assert.equal(fresh.searchParams.get('subtle'), '20261101-4');
  stale.searchParams.delete('account');
  const requests = [];
  class WarmCache extends ResourceLoader {
    fetch(url) {
      requests.push(url);
      if (url === stale.href) return Promise.resolve(Buffer.from('window.oldAccountParent = true;'));
      if (url === fresh.href) return Promise.resolve(fs.readFileSync(path.join(root, 'patches/jonas-adult-page.js')));
      if (new URL(url).pathname === '/jonas/android-ambient-assistant-20261011.js') {
        assert.equal(new URL(url).searchParams.get('account'), '20261101-2');
        return Promise.resolve(Buffer.from('window.currentAccountChild = true;'));
      }
      return Promise.resolve(Buffer.from(''));
    }
  }
  const dom = new JSDOM('<!doctype html><html><head><script defer src="' + fresh.href.replaceAll('&', '&amp;') + '"></script></head><body></body></html>', {
    url: 'https://matchapp.tv/explore.html', runScripts: 'dangerously', resources: new WarmCache(), virtualConsole: new VirtualConsole()
  });
  try {
    await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
    assert.equal(dom.window.oldAccountParent, undefined);
    assert.equal(dom.window.currentAccountChild, true);
    assert.ok(requests.includes(fresh.href));
    assert.ok(!requests.includes(stale.href));
  } finally { dom.window.close(); }
});

test('future adult pages refresh parent account readiness and preserve existing cache parameters', () => {
  const { versionReferenceRuntimeAssets } = require('../tools/finalize-brand.js');
  const before = '<script src="/patches/jonas-adult-page.js?custom=keep&amp;subtle=20261101-4"></script>';
  const after = versionReferenceRuntimeAssets(before), dom = new JSDOM(after);
  try {
    const pins = new URL(dom.window.document.querySelector('script').getAttribute('src'), 'https://matchapp.tv').searchParams;
    assert.deepEqual(pins.getAll('account'), ['20261101-2']);
    assert.equal(pins.get('custom'), 'keep');
    assert.equal(pins.get('subtle'), '20261101-4');
    assert.equal(versionReferenceRuntimeAssets(after), after);
  } finally { dom.window.close(); }
});
