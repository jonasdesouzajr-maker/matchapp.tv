/* Launcher lifecycle checks. jsdom does not establish rendered geometry or
 * real browser focus containment; those are verified separately in a browser. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');

const launcher = fs.readFileSync(path.join(__dirname, '../lumina-match/launcher.js'), 'utf8');
// Control only module delivery in the evaluated copy. Production code remains
// unchanged, and every launch, close, language, retry and cleanup handler runs.
const imports = launcher.match(/await import\([^;\n]+\)/g) || [];
assert.equal(imports.length, 1, 'The harness must replace exactly one game import');
const controlledLauncher = launcher.replace(/await import\(([^;\n]+)\)/, 'await window.__loadModule($1)');
const settle = () => new Promise(resolve => setImmediate(resolve));

function fixture(t, options = {}) {
  const dom = new JSDOM('<!doctype html><html lang="en"><body class="page-home"><main>' +
    (options.withoutHero ? '' : '<header class="home-hero"><h1>What should I watch?</h1></header>') +
    '<div id="trending-rail">Existing title rail</div><button id="existing-control">Existing action</button>' +
    '</main></body></html>', {url: 'https://matchapp.tv/', runScripts: 'outside-only'});
  t.after(() => dom.window.close());
  const {window} = dom;
  const {document} = window;
  // Native-dialog state stand-in only: no claims about CSS or modal rendering.
  window.HTMLDialogElement.prototype.showModal = function() { this.open = true; };
  window.HTMLDialogElement.prototype.close = function() {
    this.open = false;
    this.dispatchEvent(new window.Event('close'));
  };
  if (options.userAgent) Object.defineProperty(window.navigator, 'userAgent', {value: options.userAgent});
  if (options.nativeClass) document.documentElement.classList.add('matchapp-android');
  if (options.bridge) window[options.bridge] = {};
  const errors = [];
  window.console.error = (...args) => errors.push(args);
  const requests = [];
  window.__loadModule = url => {
    requests.push(url);
    return options.loader ? options.loader(url) : Promise.resolve({mountGame: () => () => {}});
  };
  window.eval(controlledLauncher);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return {window, document, errors, requests, trigger: document.getElementById('lm-launch')};
}

test('Lumina launcher is inserted once between the existing Home hero and title rail, with no eager game load', t => {
  const {window, document, requests, trigger} = fixture(t);
  const hero = document.querySelector('.home-hero');
  const rail = document.getElementById('trending-rail');
  const existingAction = document.getElementById('existing-control');
  assert.ok(trigger);
  assert.equal(hero.nextElementSibling.id, 'lm-launch-grid');
  assert.equal(rail.previousElementSibling.id, 'lm-launch-grid');
  assert.equal(trigger.textContent, 'Play Lumina Match');
  assert.equal(trigger.getAttribute('aria-haspopup'), 'dialog');
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(document.querySelector('#lm-dialog'), null);
  assert.equal(requests.length, 0);
  window.eval(controlledLauncher);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  assert.equal(document.querySelectorAll('#lm-launch').length, 1);
  assert.equal(document.getElementById('trending-rail'), rail);
  assert.equal(document.getElementById('existing-control'), existingAction);
  assert.equal(hero.textContent, 'What should I watch?');
});

test('Lumina launcher is absent without the adult Home hero', t => {
  const {document, requests} = fixture(t, {withoutHero: true});
  assert.equal(document.querySelector('#lm-launch'), null);
  assert.equal(requests.length, 0);
});

test('Lumina browser launcher stays absent from native Android shells', async t => {
  const environments = [
    {name: 'MatchAppTVAndroid', userAgent: 'MatchAppTVAndroid/1.1.60'},
    {name: 'MatchAppAiAndroid', userAgent: 'MatchAppAiAndroid/1.1.60'},
    {name: 'Kids Android', userAgent: 'MatchAppAiKidsAndroid/1.0'},
    {name: 'Android WebView', userAgent: 'Mozilla/5.0 (Linux; Android 16; wv) AppleWebKit/537.36'},
    {name: 'native document marker', nativeClass: true},
    {name: 'MatchAppAndroid bridge', bridge: 'MatchAppAndroid'},
    {name: 'MatchAppNativeBridge bridge', bridge: 'MatchAppNativeBridge'},
    {name: 'AndroidBridge bridge', bridge: 'AndroidBridge'}
  ];
  for (const environment of environments) await t.test(environment.name, inner => {
    const {document, requests} = fixture(inner, environment);
    assert.equal(document.querySelector('#lm-launch'), null);
    assert.equal(document.querySelector('#lm-dialog'), null);
    assert.equal(requests.length, 0);
  });
});

test('Lumina launcher and open modal follow the canonical selected-language event', async t => {
  const {window, document, trigger} = fixture(t);
  // Keep html[lang] unchanged here: the canonical event itself must update UI.
  window.MATCH_LANG = 'pt-BR';
  document.dispatchEvent(new window.CustomEvent('matchapp:langchange', {detail: {lang: 'pt-BR'}}));
  assert.equal(trigger.textContent, 'Jogar Lumina Match');
  assert.equal(trigger.getAttribute('aria-label'), 'Jogar Lumina Match');
  trigger.click();
  await settle();
  assert.equal(document.querySelector('#lm-close').getAttribute('aria-label'), 'Fechar jogo');
  assert.equal(document.querySelector('#lm-description').textContent, 'Um jogo da memória no MatchApp Ai');
  window.MATCH_LANG = 'ar';
  document.dispatchEvent(new window.CustomEvent('matchapp:langchange', {detail: {lang: 'ar'}}));
  assert.equal(trigger.textContent, 'العب Lumina Match');
  assert.equal(document.querySelector('#lm-dialog').dir, 'rtl');
  assert.equal(document.querySelector('#lm-close').getAttribute('aria-label'), 'إغلاق اللعبة');
  window.MATCH_LANG = 'en';
  document.dispatchEvent(new window.Event('matchapp:langchange'));
  assert.equal(document.querySelector('#lm-dialog').dir, 'ltr');
  assert.equal(document.querySelector('#lm-close').getAttribute('aria-label'), 'Close game');
  document.querySelector('#lm-close').click();
});

test('closing Lumina disposes the game and restores the prior focus and overflow priority', async t => {
  let disposed = 0;
  const {document, trigger} = fixture(t, {loader: async () => ({mountGame: () => () => { disposed++; }})});
  document.body.style.setProperty('overflow', 'auto', 'important');
  document.body.style.color = 'red';
  const existing = document.getElementById('existing-control');
  existing.focus();
  trigger.click();
  await settle();
  assert.ok(document.querySelector('#lm-dialog').open);
  assert.equal(document.activeElement.id, 'lm-close');
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.ok(document.body.classList.contains('lm-game-open'));
  document.querySelector('#lm-close').click();
  assert.equal(disposed, 1);
  assert.equal(document.querySelector('#lm-dialog'), null);
  assert.equal(document.activeElement, existing);
  assert.equal(document.body.style.overflow, 'auto');
  assert.equal(document.body.style.getPropertyPriority('overflow'), 'important');
  assert.equal(document.body.style.color, 'red');
  assert.equal(document.body.classList.contains('lm-game-open'), false);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
});

function addAccountUI(window) {
  const modal = window.document.createElement('div'); modal.id = 'main-auth-modal'; modal.style.display = 'none';
  modal.innerHTML = '<input id="reg-email" type="email"><button id="auth-cancel">Close</button>';
  window.document.body.appendChild(modal);
  window.openAuthModal = () => { modal.style.display = 'flex'; };
  window.switchAuthTab = tab => { modal.dataset.tab = tab; };
  window.closeAuthModal = () => { modal.style.display = 'none'; };
  modal.querySelector('button').addEventListener('click', window.closeAuthModal);
  return modal;
}

test('Create account keeps the current game in memory behind the existing signup UI, then restores the same frame after verified registration', async t => {
  let options, disposed = 0;
  const f = fixture(t, { loader: async () => ({ mountGame(stage, supplied) {
    options = supplied; stage.textContent = 'Current game'; return () => { disposed++; };
  } }) });
  const auth = addAccountUI(f.window);
  f.document.body.style.setProperty('overflow', 'auto', 'important');
  f.trigger.click(); await settle();
  const game = f.document.querySelector('#lm-dialog'), stage = f.document.querySelector('#lm-stage');
  options.register(); await settle();
  assert.equal(game.isConnected, true); assert.equal(game.open, false); assert.equal(disposed, 0);
  assert.equal(auth.style.display, 'flex'); assert.equal(auth.dataset.tab, 'signup');
  assert.equal(f.document.activeElement.id, 'reg-email');
  assert.equal(f.document.body.classList.contains('lm-game-open'), false);
  assert.equal(f.document.body.style.overflow, 'auto');
  options.onRegistered(); await settle();
  assert.equal(auth.style.display, 'none'); assert.equal(game.open, true);
  assert.equal(f.document.querySelector('#lm-stage'), stage); assert.equal(stage.textContent, 'Current game');
  assert.equal(disposed, 0); assert.equal(f.document.body.classList.contains('lm-game-open'), true);
  assert.equal(f.document.activeElement.id, 'lm-close');
  f.document.querySelector('#lm-close').click(); assert.equal(disposed, 1);
  assert.equal(f.document.body.style.getPropertyPriority('overflow'), 'important');
});

test('canceling account creation returns to MatchApp, clears the game, and stale registration callbacks cannot reopen a later game', async t => {
  const mounted = []; let disposed = 0;
  const f = fixture(t, { loader: async () => ({ mountGame(stage, options) {
    mounted.push(options); return () => { disposed++; };
  } }) });
  const auth = addAccountUI(f.window);
  f.trigger.focus(); f.trigger.click(); await settle(); mounted[0].register(); await settle();
  auth.querySelector('button').click(); await settle();
  assert.equal(f.document.querySelector('#lm-dialog'), null); assert.equal(disposed, 1);
  assert.equal(f.document.activeElement, f.trigger); assert.equal(f.document.body.style.overflow, '');
  mounted[0].onRegistered(); assert.equal(f.document.querySelector('#lm-dialog'), null);
  f.trigger.click(); await settle(); mounted[1].register(); await settle();
  mounted[0].onRegistered(); assert.equal(f.document.querySelector('#lm-dialog').open, false);
  assert.equal(auth.style.display, 'flex');
  auth.querySelector('button').click(); await settle(); assert.equal(disposed, 2);
});

test('successful auth can close its UI before account progress loads without discarding the staged game', async t => {
  let options, disposed = 0;
  const f = fixture(t, { loader: async () => ({ mountGame(stage, supplied) {
    options = supplied; stage.textContent = 'Pending account game'; return () => { disposed++; };
  } }) });
  const auth = addAccountUI(f.window);
  f.window.supabaseClient = { auth: { getSession: async () => ({ data: { session: { user: { id:'registered-player', is_anonymous:false } } } }) } };
  f.trigger.click(); await settle(); const game = f.document.querySelector('#lm-dialog');
  options.register(); await settle();
  assert.ok(game.hasAttribute('data-lumina-registration'));
  // Existing password and passkey handlers hide Auth before the progress RPC.
  f.document.dispatchEvent(new f.window.CustomEvent('matchapp:authchange', { detail: { signedIn:true } }));
  auth.style.display = 'none'; await settle();
  assert.equal(disposed, 0); assert.equal(f.document.querySelector('#lm-dialog'), game);
  assert.equal(game.open, true); assert.equal(f.document.activeElement.id, 'lm-close');
  options.onRegistered(); await settle(); assert.equal(disposed, 0); assert.equal(game.open, true);
  f.document.querySelector('#lm-close').click(); assert.equal(disposed, 1);
});

test('Escape and dialog cancellation both close Lumina without leaving a scroll lock', async t => {
  const {window, document, trigger} = fixture(t);
  trigger.focus();
  trigger.click();
  await settle();
  const escape = new window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});
  document.getElementById('lm-close').dispatchEvent(escape);
  assert.ok(escape.defaultPrevented);
  assert.equal(document.querySelector('#lm-dialog'), null);
  assert.equal(document.activeElement, trigger);
  assert.equal(document.body.style.overflow, '');
  trigger.click();
  await settle();
  const cancel = new window.Event('cancel', {cancelable: true});
  document.querySelector('#lm-dialog').dispatchEvent(cancel);
  assert.ok(cancel.defaultPrevented);
  assert.equal(document.querySelector('#lm-dialog'), null);
  assert.equal(document.body.classList.contains('lm-game-open'), false);
});

test('closing and reopening during a pending import mounts only the current game instance', async t => {
  const pending = [];
  const mounted = [];
  let disposed = 0;
  const {document, trigger} = fixture(t, {loader: () => new Promise(resolve => pending.push(resolve))});
  trigger.click();
  const first = document.getElementById('lm-stage');
  document.querySelector('#lm-close').click();
  trigger.click();
  const second = document.getElementById('lm-stage');
  assert.notEqual(first, second);
  assert.equal(pending.length, 2);
  const module = {mountGame(stage) { mounted.push(stage); return () => { disposed++; }; }};
  pending[0](module);
  await settle();
  assert.equal(mounted.length, 0, 'A stale module resolution must not mount into the reopened dialog');
  pending[1](module);
  await settle();
  assert.deepEqual(mounted, [second]);
  document.querySelector('#lm-close').click();
  assert.equal(disposed, 1);
});

test('a game load that resolves after close does not recreate an overlay', async t => {
  let resolve;
  let mounts = 0;
  const {document, trigger} = fixture(t, {loader: () => new Promise(done => { resolve = done; })});
  trigger.click();
  document.querySelector('#lm-close').click();
  resolve({mountGame() { mounts++; return () => {}; }});
  await settle();
  assert.equal(mounts, 0);
  assert.equal(document.querySelector('#lm-dialog'), null);
  assert.equal(document.body.classList.contains('lm-game-open'), false);
});

test('failed imports show localized retry and recover inside the same closable dialog', async t => {
  let attempts = 0;
  let cleanup = 0;
  const {window, document, trigger, requests, errors} = fixture(t, {loader: async () => {
    if (++attempts === 1) throw new Error('Simulated unavailable module');
    return {mountGame(stage) { stage.textContent = 'Game loaded'; return () => { cleanup++; }; }};
  }});
  window.MATCH_LANG = 'pt-BR';
  document.dispatchEvent(new window.Event('matchapp:langchange'));
  trigger.click();
  const dialog = document.getElementById('lm-dialog');
  await settle();
  assert.equal(errors.length, 1);
  assert.match(document.querySelector('.lm-error-copy').textContent, /Não foi possível carregar/);
  assert.equal(document.querySelector('.lm-error-copy').getAttribute('role'), 'alert');
  assert.equal(document.querySelector('.lm-retry').textContent, 'Tentar novamente');
  assert.equal(document.getElementById('lm-close').getAttribute('aria-label'), 'Fechar jogo');
  document.querySelector('.lm-retry').click();
  await settle();
  assert.equal(attempts, 2);
  assert.equal(document.getElementById('lm-dialog'), dialog);
  assert.equal(document.querySelector('.lm-error'), null);
  assert.equal(document.querySelector('#lm-stage').textContent, 'Game loaded');
  assert.notEqual(requests[0], requests[1], 'Retry must not reuse a cached failed module request');
  document.getElementById('lm-close').click();
  assert.equal(cleanup, 1);
});

test('frame failure disposes its instance and its stale callback cannot affect a new opening', async t => {
  const callbacks = [];
  let cleanup = 0;
  const {document, trigger} = fixture(t, {loader: async () => ({mountGame(stage, options) {
    stage.textContent = 'Game instance';
    callbacks.push(options.onError);
    return () => { cleanup++; };
  }})});
  trigger.click();
  await settle();
  callbacks[0](new Error('Frame unavailable'));
  assert.equal(cleanup, 1);
  assert.ok(document.querySelector('.lm-retry'));
  document.querySelector('#lm-close').click();
  trigger.click();
  await settle();
  callbacks[0](new Error('Late old frame error'));
  assert.equal(document.querySelector('.lm-error'), null);
  assert.equal(document.querySelector('#lm-stage').textContent, 'Game instance');
  document.querySelector('#lm-close').click();
  assert.equal(cleanup, 2);
});
