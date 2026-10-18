'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { bootNewsAccount } = require('../native-news-slot.js');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const main = read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
const nativeSync = main.match(/function syncNativeAdEntitlement\(\) \{[\s\S]*?(?=\/\/ Adult Android app has no Kids Mode)/)?.[0];
assert.ok(nativeSync, 'exercise the installed native entitlement implementation, not a replacement');
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.0/dist/umd/supabase.js';
const user = id => id === null ? null : { access_token: 'fixture-session-token', user: { id } };
const session = id => ({ data: { session: user(id) }, error: null });
const freeProfile = { data: { is_vip: false, is_business: false, is_ad_free: false }, error: null };
const freePro = { data: { active: false, adFree: false }, error: null };
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

function fixture(options = {}) {
  const events = new EventTarget(), d = new EventTarget(), timers = new Map(), scripts = [];
  let now = 0, serial = 0, callback = null, inCallback = false, currentUser = options.user === undefined ? A : options.user;
  const calls = { session: 0, profile: [], pro: [], create: [], unsubscribe: 0, native: [], notifications: [] };
  const controls = { sessionRead: null, profile: () => freeProfile, pro: () => freePro };
  const w = {
    document: d, location: { origin: options.origin || 'https://matchapp.tv', pathname: options.route || '/news/' },
    CustomEvent, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
    setTimeout(fn, ms) { const id = ++serial; timers.set(id, { fn, at: now + ms }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  w.top = options.iframe ? {} : w;
  d.documentElement = { dataset: options.kids ? { matchappMode: 'kids' } : {} };
  d.scripts = scripts;
  d.createElement = tag => { assert.equal(tag, 'script'); return new EventTarget(); };
  d.head = { appendChild(script) { scripts.push(script); } };
  const native = { account: options.nativeOwner === undefined ? A : options.nativeOwner, hasValue: options.hasValue !== false, adFree: false };
  w.MatchAppNativeNews = { postMessage() {} };
  w.MatchAppNativeExperience = {
    setAdFree(value) { assert.equal(typeof value, 'boolean'); calls.native.push(['adFree', value]); native.adFree = value; },
    setNewsAccountContext(value) {
      calls.native.push(['context', value]);
      const resolved = value === 'guest' || /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value) ? value : null;
      // Same-owner preservation/change reset is pinned by the native source contract below.
      if (resolved !== native.account) { native.account = resolved; native.hasValue = false; }
    }
  };
  const client = {
    auth: {
      getSession() {
        assert.equal(inCallback, false, 'never read while the SDK auth callback owns its session lock');
        calls.session++;
        return controls.sessionRead ? controls.sessionRead({ native: w.isUserLoggedIn === true, user: currentUser }) : Promise.resolve(session(currentUser));
      },
      onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() { calls.unsubscribe++; callback = null; } } } }; }
    },
    from(table) {
      assert.equal(table, 'profiles', 'no account creation, quota or other data calls');
      return { select(columns) {
        assert.equal(columns, 'is_vip,is_business,is_ad_free');
        return { eq(column, id) {
          assert.equal(column, 'id'); calls.profile.push(id);
          return { maybeSingle() { return Promise.resolve(controls.profile(id)); } };
        } };
      } };
    },
    rpc(name) { calls.pro.push(name); assert.equal(name, 'pro_status', 'no grant, purchase, wallet or welcome RPC'); return Promise.resolve(controls.pro()); }
  };
  if (options.client !== false) w.supabaseClient = client;
  for (const name of ['matchapp:authchange', 'matchapp:profilehydrated']) d.addEventListener(name, e => calls.notifications.push([name, e.detail]));
  if (options.newsBridge === false) delete w.MatchAppNativeNews;
  if (options.experience === false) delete w.MatchAppNativeExperience;
  if (options.contextBridge === false) delete w.MatchAppNativeExperience.setNewsAccountContext;
  if (options.appRuntime) w.ensureCompactMatchSession = () => Promise.resolve(session(currentUser));
  const bindNative = () => vm.runInNewContext(nativeSync, { window: w, document: d, setTimeout: w.setTimeout, Promise, Date, isFinite });
  if (options.bindNative !== false) bindNative();
  return {
    w, d, native, calls, controls, scripts, client, bindNative,
    boot: () => bootNewsAccount(w),
    emit(event, id) {
      currentUser = id;
      assert.equal(typeof callback, 'function');
      inCallback = true; try { callback(event, user(id)); } finally { inCallback = false; }
    },
    installSdk() { w.supabase = { createClient(...args) { calls.create.push(args); return client; } }; },
    async advance(ms = 0) {
      const end = now + ms;
      for (let count = 0; count < 250; count++) {
        await flush();
        const next = [...timers].filter(([, item]) => item.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next) { now = end; return; }
        timers.delete(next[0]); now = next[1].at; next[1].fn();
      }
      throw new Error('unexpected retry loop');
    },
    close() { w.MatchAppNativeNewsAccount?.dispose(); timers.clear(); }
  };
}
const contexts = f => f.calls.native.filter(call => call[0] === 'context').map(call => call[1]);
const authChanges = f => f.calls.notifications.filter(call => call[0] === 'matchapp:authchange');

test('native account comparison preserves only the same owner, and unknown entitlement remains ad-free', () => {
  const source = read('android-studio/app/src/main/java/com/jonas/papercup/NativeNewsBridge.kt');
  assert.match(source, /if \(resolved == accountContext\) return\s+accountContext = resolved\s+hasValue = false/);
  assert.match(source, /accountContext != null && hasValue/);
  assert.match(nativeSync, /if \(window\.isUserLoggedIn !== true\)[\s\S]*?bridge\.setAdFree\(true\)/);
  assert.match(nativeSync, /document\.addEventListener\('matchapp:authchange'[\s\S]*?setNewsAccountContext\(''\)/);
});

test('bootstrap denies inherited free entitlement before the new document native listeners exist', async () => {
  const f = fixture({ client: false, bindNative: false });
  try {
    assert.equal(f.native.adFree, false);
    f.boot();
    assert.equal(f.native.adFree, true, 'denial reaches the bridge synchronously, before any SDK read or native timer');
    assert.equal(f.native.hasValue, true, 'temporary denial does not erase the genuine prior result');
    assert.deepEqual(contexts(f), []);
    f.installSdk(); f.scripts[0].dispatchEvent(new Event('load')); await f.advance();
    assert.equal(f.w.isUserLoggedIn, true);
    assert.equal(f.native.adFree, true, 'successful session projection never enables ads itself');
    assert.deepEqual(f.calls.profile, []);
    f.bindNative(); await f.advance(450);
    assert.deepEqual(f.calls.profile, [A]);
    assert.deepEqual(f.calls.pro, ['pro_status']);
    assert.deepEqual(contexts(f), [A]);
    assert.equal(f.native.hasValue, true);
    assert.equal(f.native.adFree, false, 'only the later authoritative native sync enables a verified free account');
    const slot = read('native-news-slot.js');
    assert.ok(slot.indexOf("const newsAccount = surface === 'news' ? bootNewsAccount(w)") < slot.indexOf('w.MatchAppNativeNewsSlot = controller; hello();'), 'bootstrap denial precedes the first News hello');
  } finally { f.close(); }
});

test('same-account News hydration preserves genuine native value and lets native verify both current entitlements', async () => {
  const f = fixture();
  try {
    const controller = f.boot();
    assert.equal(f.boot(), controller);
    assert.equal(f.w.isUserLoggedIn, false);
    assert.equal(f.w.matchProfileState.status, 'loading');
    assert.deepEqual(contexts(f), [], 'initial bootstrap never publishes an empty account');
    await f.advance();
    assert.equal(f.w.isUserLoggedIn, true);
    assert.equal(f.w.matchProfileState.userId, A);
    assert.equal(f.w.matchProfileState.status, 'loading', 'session publication does not claim full profile hydration');
    assert.deepEqual(contexts(f), [A]);
    assert.equal(f.native.hasValue, true);
    assert.equal(f.native.adFree, false);
    assert.equal(authChanges(f).length, 0);
    assert.deepEqual(f.calls.profile, [A]);
    assert.deepEqual(f.calls.pro, ['pro_status']);
    assert.deepEqual(f.calls.create, [], 'reuse the shared client');
    assert.ok(f.calls.native.findIndex(call => call[0] === 'adFree' && call[1]) < f.calls.native.findIndex(call => call[0] === 'adFree' && !call[1]));
  } finally { f.close(); }
});

test('initial different-account and signed-out hydration reach native comparison and clear prior-owner value', async () => {
  for (const id of [B, null]) {
    const f = fixture({ user: id });
    try {
      f.boot(); await f.advance();
      assert.deepEqual(contexts(f), [id || 'guest']);
      assert.equal(f.native.hasValue, false);
      assert.equal(f.native.adFree, false);
      assert.equal(authChanges(f).length, 0, 'resolved initial identity goes through native comparison, without a preliminary empty context');
      if (id === null) {
        assert.equal(f.w.matchProfileState.status, 'signedout');
        assert.equal(f.w.isUserLoggedIn, false);
        assert.deepEqual(f.calls.profile, []);
        assert.deepEqual(f.calls.pro, []);
      }
    } finally { f.close(); }
  }
});

test('same-owner token refresh preserves value, while every later real owner or sign-out transition resets it', async () => {
  const f = fixture();
  try {
    f.boot(); await f.advance();
    f.emit('TOKEN_REFRESHED', A); await f.advance();
    assert.equal(authChanges(f).length, 0);
    assert.equal(f.native.hasValue, true);
    f.emit('SIGNED_IN', B);
    assert.equal(f.native.hasValue, false, 'authchange resets synchronously before the next session read');
    assert.equal(contexts(f).at(-1), '');
    await f.advance();
    assert.equal(f.native.account, B);
    assert.equal(authChanges(f).length, 1);
    f.emit('SIGNED_OUT', null); await f.advance();
    assert.equal(f.native.account, 'guest');
    assert.equal(f.native.hasValue, false);
    assert.equal(authChanges(f).length, 2);
  } finally { f.close(); }
});

test('explicit logout during failed initial hydration cannot preserve proof on a later same-owner login', async () => {
  const f = fixture(), initial = deferred();
  try {
    let reads = 0;
    f.controls.sessionRead = () => ++reads === 1 ? initial.promise : Promise.resolve({ error: { message: 'offline' } });
    f.boot(); await f.advance();
    f.emit('SIGNED_OUT', null);
    assert.equal(authChanges(f).length, 1);
    assert.equal(f.native.hasValue, false);
    await f.advance();
    assert.equal(f.w.matchProfileState.status, 'error');
    f.controls.sessionRead = () => Promise.resolve(session(A));
    f.emit('SIGNED_IN', A); await f.advance();
    initial.resolve(session(A)); await f.advance();
    assert.equal(f.native.account, A);
    assert.equal(f.native.hasValue, false);
    assert.equal(f.native.adFree, false);
  } finally { f.close(); }
});

test('SDK owner changes while hydration fails reset proof even when the final owner returns to the original account', async () => {
  const f = fixture(), initial = deferred();
  try {
    f.controls.sessionRead = () => initial.promise;
    f.boot(); await f.advance();
    f.emit('INITIAL_SESSION', A); await f.advance();
    f.controls.sessionRead = () => Promise.resolve({ error: { message: 'offline' } });
    f.emit('SIGNED_IN', B); await f.advance();
    assert.equal(f.w.matchProfileState.status, 'error');
    assert.equal(f.native.hasValue, false);
    assert.equal(authChanges(f).length, 1);
    f.controls.sessionRead = () => Promise.resolve(session(A));
    f.emit('SIGNED_IN', A); await f.advance();
    initial.resolve(session(A)); await f.advance();
    assert.equal(f.native.account, A);
    assert.equal(f.native.hasValue, false);
    assert.equal(authChanges(f).length, 2);
  } finally { f.close(); }
});

test('stale initial session and old native profile/Pro replies cannot restore an earlier owner', async () => {
  const f = fixture(), oldSession = deferred();
  try {
    let first = true;
    f.controls.sessionRead = ({ user: id }) => { if (first) { first = false; return oldSession.promise; } return Promise.resolve(session(id)); };
    f.boot(); await f.advance();
    f.emit('SIGNED_IN', B); await f.advance();
    oldSession.resolve(session(A)); await f.advance();
    assert.equal(f.w.matchProfileState.userId, B);
    assert.deepEqual(contexts(f), [B]);
    assert.equal(f.native.hasValue, false);
  } finally { f.close(); }
  const g = fixture(), oldProfile = deferred(), oldPro = deferred();
  try {
    g.controls.profile = id => id === A ? oldProfile.promise : freeProfile;
    g.controls.pro = () => g.w.matchProfileState.userId === A ? oldPro.promise : freePro;
    g.boot(); await g.advance();
    assert.equal(g.native.adFree, true);
    g.emit('SIGNED_IN', B); await g.advance();
    oldProfile.resolve(freeProfile); oldPro.resolve(freePro); await g.advance();
    assert.equal(g.native.account, B);
    assert.equal(g.native.hasValue, false);
    assert.ok(!contexts(g).includes(A));
  } finally { g.close(); }
});

test('unavailable, malformed and timed-out sessions remain unknown and ad-free, never guests', async () => {
  const badResults = [
    undefined, { error: { message: 'offline' } }, { data: {} }, { data: { session: {} } },
    { data: { session: { user: { id: A } } } }, { data: { session: { user: { id: A }, access_token: '' } } },
    { data: { session: user('not-a-user-uuid') } }, { data: { session: null }, error: { message: 'not confirmed' } }
  ];
  for (const result of badResults) {
    const f = fixture();
    try {
      f.controls.sessionRead = () => Promise.resolve(result);
      f.boot(); await f.advance();
      assert.equal(f.w.isUserLoggedIn, false);
      assert.equal(f.w.matchProfileState.status, 'error');
      assert.equal(f.native.adFree, true);
      assert.deepEqual(contexts(f), []);
      assert.deepEqual(f.calls.profile, []);
      assert.equal(authChanges(f).length, 0);
    } finally { f.close(); }
  }
  const f = fixture(), pending = deferred();
  try {
    f.controls.sessionRead = () => pending.promise;
    f.boot(); await f.advance();
    assert.equal(f.w.matchProfileState.status, 'loading');
    assert.equal(f.native.adFree, true);
    await f.advance(8000);
    assert.equal(f.w.matchProfileState.status, 'error');
    pending.resolve(session(A)); await f.advance();
    assert.equal(f.w.isUserLoggedIn, false, 'a timed-out read cannot later enable identity');
    assert.deepEqual(contexts(f), []);
  } finally { f.close(); }
});

test('transient failures retain the last resolved owner only for later identity comparison', async () => {
  const f = fixture();
  try {
    f.boot(); await f.advance();
    f.controls.sessionRead = () => Promise.reject(new Error('offline'));
    f.emit('TOKEN_REFRESHED', A); await f.advance();
    assert.equal(f.native.adFree, true);
    assert.equal(f.native.hasValue, true, 'temporary denial does not erase an existing genuine result');
    assert.equal(authChanges(f).length, 0);
    assert.ok(!contexts(f).includes('guest'));
    f.controls.sessionRead = null;
    f.emit('SIGNED_IN', B); await f.advance();
    assert.equal(authChanges(f).length, 1);
    assert.equal(f.native.account, B);
    assert.equal(f.native.hasValue, false);
  } finally { f.close(); }
});

test('VIP, business, profile ad-free and Pro protections still win; pending/errors cannot enable ads', async () => {
  const scenarios = [
    { profile: { data: { ...freeProfile.data, is_vip: true } } },
    { profile: { data: { ...freeProfile.data, is_business: true } } },
    { profile: { data: { ...freeProfile.data, is_ad_free: true } } },
    { pro: { data: { active: true, adFree: true, expiresAt: Date.now() + 86400000 } } },
    { pro: { data: { active: false, adFree: true } } },
    { profile: { data: null, error: null } },
    { profile: { error: { message: 'unavailable' } } },
    { pro: { error: { message: 'unavailable' } } },
    { pro: { data: { active: 'false', adFree: false } } },
    { pro: { data: { active: true, adFree: true, expiresAt: 1 } } },
    { profile: new Promise(() => {}) }
  ];
  for (const scenario of scenarios) {
    const f = fixture({ user: B });
    try {
      if (scenario.profile) f.controls.profile = () => scenario.profile;
      if (scenario.pro) f.controls.pro = () => scenario.pro;
      f.boot(); await f.advance();
      assert.equal(f.native.adFree, true);
      assert.ok(!f.calls.native.some(call => call[0] === 'adFree' && call[1] === false));
      if (contexts(f).length) assert.equal(f.native.hasValue, false, 'even an ad-free new owner resets the previous proof');
    } finally { f.close(); }
  }
});

test('only native standalone News loads the pinned shared client; SDK failure stays unknown without polling', async () => {
  const app = read('app.js');
  const f = fixture({ client: false });
  try {
    f.boot(); f.boot();
    assert.equal(f.scripts.length, 1);
    assert.equal(f.scripts[0].src, SDK);
    assert.equal(f.calls.create.length, 0);
    f.installSdk(); f.scripts[0].dispatchEvent(new Event('load')); await f.advance();
    assert.equal(f.calls.create.length, 1);
    assert.equal(f.calls.create[0][0], app.match(/const SUPABASE_URL = '([^']+)'/)[1]);
    assert.equal(f.calls.create[0][1], app.match(/const SUPABASE_ANON_KEY = '([^']+)'/)[1]);
    assert.deepEqual(f.calls.create[0][2], { auth: { detectSessionInUrl: false } }, 'no custom storage, login, callback or refresh engine');
    assert.equal(f.w.supabaseClient, f.client);
    assert.equal(f.native.hasValue, true);
  } finally { f.close(); }
  const g = fixture({ client: false });
  try {
    g.boot(); await g.advance(8000);
    assert.equal(g.w.matchProfileState.status, 'error');
    assert.equal(g.native.adFree, true);
    assert.equal(g.scripts.length, 1);
    g.installSdk(); g.scripts[0].dispatchEvent(new Event('load')); await g.advance();
    assert.deepEqual(g.calls.create, [], 'late SDK load does not automatically restart a failed bootstrap');
    assert.deepEqual(contexts(g), []);
    g.w.dispatchEvent(new Event('pageshow')); await g.advance();
    assert.equal(g.calls.create.length, 1, 'page restoration can use an already loaded SDK');
    assert.equal(g.scripts.length, 1, 'recovery never appends another SDK request');
    assert.equal(g.native.account, A);
  } finally { g.close(); }
});

test('public web, Home, ebook, Kids, subframes, other origins and existing app account runtime are untouched', async () => {
  for (const options of [
    { newsBridge: false }, { experience: false }, { contextBridge: false }, { route: '/' },
    { route: '/ebooks/' }, { route: '/kids/' }, { kids: true }, { route: '/news/articles/a/' },
    { origin: 'https://www.matchapp.tv' }, { origin: 'http://matchapp.tv' }, { iframe: true }, { appRuntime: true }
  ]) {
    const f = fixture({ ...options, client: false });
    try {
      assert.equal(f.boot(), null);
      assert.equal(f.w.MatchAppNativeNewsAccount, undefined);
      assert.equal(f.w.isUserLoggedIn, undefined);
      assert.equal(f.w.matchProfileState, undefined);
      assert.deepEqual(f.scripts, []);
      assert.equal(f.calls.session, 0);
      assert.deepEqual(f.calls.notifications, []);
    } finally { f.close(); }
  }
});

test('page restoration rechecks identity and explicit disposal releases subscription and pending publication', async () => {
  const f = fixture(), pending = deferred();
  try {
    const controller = f.boot(); await f.advance();
    f.controls.sessionRead = () => Promise.resolve(session(B));
    f.w.dispatchEvent(new Event('pageshow')); await f.advance();
    assert.equal(f.native.account, B);
    assert.equal(f.native.hasValue, false);
    assert.equal(authChanges(f).length, 1);
    f.controls.sessionRead = () => pending.promise;
    f.w.dispatchEvent(new Event('pageshow')); await f.advance();
    controller.dispose();
    const before = f.calls.notifications.length, reads = f.calls.session;
    pending.resolve(session(A)); f.w.dispatchEvent(new Event('pageshow')); await f.advance(10000);
    assert.equal(f.calls.notifications.length, before);
    assert.equal(f.calls.session, reads);
    assert.equal(f.calls.unsubscribe, 1);
    assert.match(read('native-news-slot.js'), /newsAccount\?\.dispose\(\)/, 'slot disposal releases its session publisher');
  } finally { f.close(); }
});

