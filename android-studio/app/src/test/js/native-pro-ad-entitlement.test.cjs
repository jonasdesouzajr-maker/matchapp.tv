const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../main/java/com/jonas/papercup/MainActivity.kt'), 'utf8');
const begin = source.indexOf('function syncNativeAdEntitlement() {');
const end = source.indexOf('if (!window.__matchAppNativeAdEntitlementBound)', begin);
assert(begin >= 0 && end > begin, 'Native entitlement function must remain present');

function harness(options = {}) {
  const writes = [], queries = [], accounts = [];
  const window = {
    isUserLoggedIn: true,
    matchProfileState: { status: 'ready' },
    MatchAppNativeExperience: { setAdFree: value => writes.push(value), setNewsAccountContext: value => accounts.push(value) },
    ensureCompactMatchSession: async () => ({ data: { session: { user: { id: 'current-user' } } } }),
    supabaseClient: {
      from(table) {
        queries.push(table);
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: options.profile || {} }) }) }) };
      },
      rpc(name) {
        queries.push(name);
        return options.pro ? options.pro() : Promise.resolve({ data: { active: false, expiresAt: null, adFree: false } });
      }
    }
  };
  const context = vm.createContext({ window, Promise, Date, isFinite });
  vm.runInContext(source.slice(begin, end), context);
  return { window, writes, queries, accounts, sync: context.syncNativeAdEntitlement };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('signed-out banner behavior stays unchanged and unknown auth remains ad-free', async () => {
  const h = harness();
  h.window.isUserLoggedIn = false;
  h.window.matchProfileState.status = 'signedout';
  h.sync();
  assert.deepEqual(h.writes, [false]);
  h.window.matchProfileState.status = 'loading';
  h.sync();
  assert.deepEqual(h.writes, [false, true]);
  assert.deepEqual(h.queries, []);
  assert.deepEqual(h.accounts, ['guest']);
});

test('verified Pro and each existing ad-free entitlement suppress native ads', async () => {
  for (const profile of [{ is_vip: true }, { is_business: true }, { is_ad_free: true }]) {
    const h = harness({ profile }); h.sync(); await settle();
    assert.deepEqual(h.writes, [true, true]);
  }
  const h = harness({ pro: async () => ({ data: { active: true, expiresAt: Date.now() + 60_000, adFree: true } }) });
  h.sync(); await settle();
  assert.deepEqual(h.writes, [true, true]);
  assert.deepEqual(h.queries, ['profiles', 'pro_status']);
});

test('authenticated free accounts enable ads only after both authoritative reads succeed', async () => {
  const h = harness(); h.sync();
  assert.deepEqual(h.writes, [true]);
  await settle();
  assert.deepEqual(h.writes, [true, false]);
  for (const result of [
    { error: { message: 'offline' } }, { data: {} },
    { data: { active: 'false', expiresAt: null, adFree: false } },
    { data: { active: true, expiresAt: Date.now() - 1, adFree: true } },
    { data: { active: true, expiresAt: null, adFree: true } }
  ]) {
    const failed = harness({ pro: async () => result }); failed.sync(); await settle();
    assert.deepEqual(failed.writes, [true]);
  }
});

test('a late response from the previous auth generation cannot enable native ads', async () => {
  let resolveOld;
  const h = harness({ pro: () => new Promise(resolve => { resolveOld = resolve; }) });
  h.sync(); await settle();
  h.window.isUserLoggedIn = false;
  h.window.matchProfileState.status = 'loading';
  h.sync();
  resolveOld({ data: { active: false, expiresAt: null, adFree: false } });
  await settle();
  assert.deepEqual(h.writes, [true, true]);
  assert.deepEqual(h.accounts, []);
  assert(source.includes("document.addEventListener('matchapp:prostatus'"));
});

test('news account context is published only after the current authenticated reads succeed', async () => {
  const h = harness(); h.sync();
  assert.deepEqual(h.accounts, []);
  await settle();
  assert.deepEqual(h.accounts, ['current-user']);
  const failed = harness({ pro: async () => ({ error: { message: 'offline' } }) });
  failed.sync(); await settle();
  assert.deepEqual(failed.accounts, []);
  assert.deepEqual(failed.writes, [true]);
});
