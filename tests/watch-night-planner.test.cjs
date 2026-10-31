const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');

const script = readFileSync(join(__dirname, '../watch-night/planner.js'), 'utf8');
const templates = {
  invalid: 'invalid', sameTime: 'same time', bufferTooLong: 'buffer too long',
  filmFits: 'fits {minutes} {finish} {remaining}', filmOver: 'over {over} {finish}',
  episodes: 'episodes {count} {finish} {remaining}', noneFit: 'none {over}',
  nextDay: 'next day', shared: 'shared', copied: 'copied', copyManually: 'copy manually'
};
function browser({ hash = '', language = 'en-GB', nav = {}, authoredCopy = false } = {}) {
  const route = language === 'pt-BR' ? 'pt-br/noite-de-filme' : 'watch-night';
  const html = readFileSync(join(__dirname, '..', route, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only', url: `https://matchapp.tv/${route}/?utm_source=campaign${hash}`
  });
  const { window } = dom;
  Object.assign(window.navigator, nav);
  if (!authoredCopy) {
    window.document.documentElement.lang = language;
    window.document.getElementById('planner-strings').textContent = JSON.stringify(templates);
  }
  window.eval(script);
  const doc = window.document;
  const id = name => doc.getElementById(name);
  const form = id('watch-plan');
  return {
    window, id, value: () => id('plan-result').textContent,
    update(values) {
      for (const [name, value] of Object.entries(values)) form.elements.namedItem(name).value = value;
      form.dispatchEvent(new window.Event('input'));
    },
    async share() { id('share-plan').click(); await new Promise(resolve => setImmediate(resolve)); }
  };
}

test('watch planner calculates a once-only break, a film finish and an overrun across midnight', () => {
  const page = browser();
  assert.equal(page.value(), 'fits 140 21:45 45');
  page.update({ start: '23:00', end: '00:45' });
  assert.equal(page.value(), 'fits 95 00:45 next day 0');
  page.update({ end: '00:40' });
  assert.equal(page.value(), 'over 5 00:45 next day');
  assert.equal(page.window.location.hash, '');
});

test('whole episodes fit exactly, leave a real remainder, or cannot fit at all', () => {
  const page = browser();
  page.update({ mode: 'episodes', runtime: '45' });
  assert.equal(page.value(), 'episodes 3 22:25 5');
  page.update({ end: '22:25' });
  assert.equal(page.value(), 'episodes 3 22:25 0');
  page.update({ end: '20:25' });
  assert.equal(page.value(), 'none 30');
});

test('invalid clocks, out-of-range values, ambiguous windows and impossible buffers cannot be shared', () => {
  const page = browser();
  for (const [changes, message] of [
    [{ start: '' }, 'invalid'], [{ start: '22:30' }, 'same time'],
    [{ start: '22:29', buffer: '2' }, 'buffer too long'],
    [{ start: '20:00', buffer: '-1' }, 'invalid'], [{ buffer: '241' }, 'invalid'],
    [{ buffer: '0', runtime: '0' }, 'invalid'], [{ runtime: '601' }, 'invalid'],
    [{ runtime: '9.5' }, 'invalid']
  ]) {
    page.update(changes);
    assert.equal(page.value(), message);
    assert.equal(page.id('share-plan').disabled, true);
  }
  page.update({ start: '15:00', end: '10:00', buffer: '240', runtime: '600' });
  assert.equal(page.id('share-plan').disabled, false);
});

test('numeric share fragments round-trip independently of marketing params and untouched browser history', async () => {
  let href;
  const page = browser({ nav: { clipboard: { writeText: async value => { href = value; } } } });
  page.update({ mode: 'episodes', start: '23:00', end: '00:45', runtime: '45' });
  assert.equal(href, undefined);
  await page.share();
  assert.equal(href, 'https://matchapp.tv/watch-night/#p=1380.45.10.45.1');
  assert.equal(page.id('share-status').textContent, 'copied');
  assert.equal(page.window.location.hash, '');
  assert.equal(browser({ hash: new URL(href).hash }).value(), page.value());
  for (const hash of ['#p=1440.45.0.95.1', '#p=0.0.0.95.1', '#p=100.101.9.95.1',
    '#p=0.100.0.0.1', '#p=30.40.0.20.2', '#p=3.4.0.20.0&name=Alex', '#arbitrary']) {
    assert.equal(browser({ hash }).value(), 'fits 140 21:45 45');
  }
});

test('native share cancellation is respected and clipboard failure leaves a selectable link', async () => {
  let copied = false;
  const cancelled = browser({ nav: {
    share: async () => { throw Object.assign(new Error('cancelled'), { name: 'AbortError' }); },
    clipboard: { writeText: async () => { copied = true; } }
  } });
  await cancelled.share();
  assert.equal(copied, false);
  assert.equal(cancelled.id('share-url').hidden, true);
  assert.equal(cancelled.id('share-status').textContent, '');
  const denied = browser({ nav: { clipboard: { writeText: async () => { throw new Error('denied'); } } } });
  await denied.share();
  assert.equal(denied.id('share-url').hidden, false);
  assert.equal(denied.id('share-url').value, 'https://matchapp.tv/watch-night/#p=1200.1350.10.95.0');
  assert.equal(denied.id('share-status').textContent, 'copy manually');
});

test('clock rendering follows the authored document language', () => {
  assert.match(browser({ language: 'en-US' }).value(), /9:45\sPM/);
  assert.match(browser({ language: 'pt-BR' }).value(), /21:45/);
});

test('switching language carries only the validated plan and preserves unsent edits', () => {
  const page = browser({ hash: '#p=1380.45.10.45.1' });
  const link = page.id('planner-language');
  assert.equal(link.href, 'https://matchapp.tv/pt-br/noite-de-filme/#p=1380.45.10.45.1');
  page.update({ runtime: '50' });
  assert.equal(link.hash, '#p=1380.45.10.50.1');
  assert.equal(browser({ language: 'pt-BR', hash: link.hash }).value().includes('1'), true);
  page.update({ runtime: '' });
  assert.equal(link.hash, '');
  const malformed = browser({ hash: '#p=30.40.0.20.0&name=Alex' });
  assert.equal(malformed.id('planner-language').hash, '#p=1200.1350.10.95.0');
});

test('published English and pt-BR markup boots, computes and shares in its original language', async () => {
  for (const [language, slug] of [['en-US', 'watch-night'], ['pt-BR', 'pt-br/noite-de-filme']]) {
    const page = browser({ language, authoredCopy: true });
    assert.ok(page.window.document.querySelector('script[defer][src="/watch-night/planner.js"]'));
    assert.equal(page.window.document.documentElement.lang.slice(0, 2), language.slice(0, 2));
    assert.match(page.value(), /140/);
    page.update({ mode: 'episodes', runtime: '45' });
    assert.match(page.value(), /3/);
    assert.doesNotMatch(page.value(), /\{\w+\}/);
    await page.share();
    assert.equal(page.id('share-url').value, `https://matchapp.tv/${slug}/#p=1200.1350.10.45.1`);
  }
});
