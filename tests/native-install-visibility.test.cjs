'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.MATCHAPP_NATIVE_VISIBILITY_ROOT || path.join(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n');
const install = read('install.js');
const nativeUA = 'Mozilla/5.0 (Linux; Android 14; SM-X200) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36 MatchAppTVAndroid/1.1.55 MatchAppAiAndroid/1.1.55';
const androidUA = 'Mozilla/5.0 (Linux; Android 14; SM-X200) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36';

// Exercise the unchanged, actual install-state owner without loading any
// network, service-worker, permission, or native/purchase transport.
const functionNames = ['secureInstallContext', 'platformInfo', 'installButtons', 'showInstallButtons', 'hideInstallButtons', 'initInstall'];
const declarations = functionNames.map((name) => {
  const matches = install.match(new RegExp(`^function ${name}\\(\\) \\{[\\s\\S]*?^\\}`, 'gm'));
  assert.equal(matches?.length, 1, `exactly one actual ${name} declaration`);
  return matches[0];
}).join('\n');

function runInstall(options = {}) {
  const buttons = [0, 1].map(() => ({ style: { display: options.initialDisplay ?? 'inline-flex' } }));
  const identities = buttons.slice();
  const scheduled = [];
  const navigator = {
    userAgent: options.ua || androidUA,
    maxTouchPoints: options.maxTouchPoints ?? 5,
    standalone: options.iosStandalone === true,
  };
  const context = {
    navigator,
    window: {
      navigator, isSecureContext: options.secure !== false,
      matchMedia: (query) => { assert.equal(query, '(display-mode: standalone)'); return { matches: options.standalone === true }; },
      matchAppInstallState: { isInstalled: () => options.installed === true },
    },
    location: { hostname: options.hostname || 'matchapp.tv', protocol: options.protocol || 'https:' },
    document: { querySelectorAll: (selector) => { assert.equal(selector, '.install-btn'); return buttons; } },
    MATCHAPP_KIDS_INSTALL: false,
    maybeShowInstallHint: () => { throw new Error('Presentation timer must not execute in this fixture.'); },
    setTimeout: (fn, delay) => { scheduled.push({ fn, delay }); return scheduled.length; },
  };
  vm.runInNewContext(`${declarations}\ninitInstall();`, context, { timeout: 1000 });
  assert.equal(buttons[0], identities[0]);
  assert.equal(buttons[1], identities[1]);
  return { displays: buttons.map((button) => button.style.display), scheduled };
}

test('adult header install guards respect runtime state in the existing winning layer', () => {
  const css = read('patches/adult-screen-fit-20261015.css');
  const start = css.indexOf('/* install-visibility-state-20261018 */');
  const end = css.indexOf('/* Authentication owns visibility.');
  assert.ok(start >= 0 && end > start, 'install guard precedes the existing auth and shared-layout guards');
  const guard = css.slice(start, end);
  assert.equal((guard.match(/@layer ma-screen-fit\s*\{/g) || []).length, 1);
  assert.match(guard, /html body:not\(\.page-kids\):not\(\.kids-body\) \.app-header\s+\.install-btn:is\(\[hidden\],\[style\*="display: none"\],\[style\*="display:none"\]\)\s*\{\s*display:none!important;\s*\}/);
  assert.match(guard, /html\.matchapp-ai-android body:not\(\.page-kids\):not\(\.kids-body\) \.app-header\s+:is\(\.install-btn,\.install-wrap\)\s*\{\s*display:none!important;\s*\}/);
  assert.equal((guard.match(/display:none!important;/g) || []).length, 2);
  assert.doesNotMatch(guard, /(?:height|width|padding|margin|opacity|visibility|pointer-events|position)\s*:/);
  assert.doesNotMatch(guard, /#nav-|#profile-link|adsbygoogle|ad-slot|wallet|reward/);
});

test('actual native marker is added only for the verified native user-agent', () => {
  const source = read('android-early-ui-20261011.js');
  for (const [ua, expected] of [[nativeUA, true], [androidUA, false]]) {
    const classes = new Set();
    const styles = [];
    const document = {
      documentElement: { classList: { add: (...names) => names.forEach((name) => classes.add(name)) } },
      createElement: (tag) => { assert.equal(tag, 'style'); return {}; },
      head: { appendChild: (style) => styles.push(style) },
    };
    vm.runInNewContext(source, { navigator: { userAgent: ua }, document }, { timeout: 1000 });
    assert.equal(classes.has('matchapp-ai-android'), expected);
    assert.equal(styles.length, expected ? 1 : 0);
  }
});

test('actual install owner hides all current native-shell user-agent variants', () => {
  for (const ua of [nativeUA, `${androidUA} MatchAppTVAndroid/1.1.54`, `${androidUA} MatchAppAiAndroid/1.1.55`, `${androidUA} MatchAppAiKidsAndroid/1.1.55`]) {
    const result = runInstall({ ua });
    assert.deepEqual(result.displays, ['none', 'none']);
    assert.equal(result.scheduled.length, 0);
  }
});

test('ordinary Android browser install remains available on phone and tablet', () => {
  for (const ua of [androidUA, androidUA.replace('Android 14;', 'Android 14; Mobile;')]) {
    const result = runInstall({ ua, initialDisplay: 'none' });
    assert.deepEqual(result.displays, ['inline-flex', 'inline-flex']);
    assert.deepEqual(result.scheduled.map((entry) => entry.delay), [900]);
  }
});

test('standalone and remembered installed browser states remain hidden', () => {
  for (const options of [{ standalone: true }, { iosStandalone: true }, { installed: true }]) {
    const result = runInstall(options);
    assert.deepEqual(result.displays, ['none', 'none']);
    assert.equal(result.scheduled.length, 0);
  }
});

test('untrusted or insecure origins remain hidden', () => {
  for (const options of [{ secure: false }, { protocol: 'http:' }, { hostname: 'notmatchapp.tv' }, { hostname: 'matchapp.tv.example.com' }]) {
    const result = runInstall(options);
    assert.deepEqual(result.displays, ['none', 'none']);
    assert.equal(result.scheduled.length, 0);
  }
});

test('ordinary iOS browser keeps its supported manual install action', () => {
  const result = runInstall({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1', initialDisplay: 'none' });
  assert.deepEqual(result.displays, ['inline-flex', 'inline-flex']);
  assert.deepEqual(result.scheduled.map((entry) => entry.delay), [1200]);
});

test('ordinary desktop browser preserves authored hidden state while no install event is available', () => {
  const result = runInstall({ ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', maxTouchPoints: 0, initialDisplay: 'none' });
  assert.deepEqual(result.displays, ['none', 'none']);
  assert.equal(result.scheduled.length, 0);
});
