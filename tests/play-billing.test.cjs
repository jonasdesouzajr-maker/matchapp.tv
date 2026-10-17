const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { webcrypto } = require('node:crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const base = path.join(__dirname, '../supabase/functions/play-billing');
const load = name => import(pathToFileURL(path.join(base, name)).href);
const user = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const now = Date.UTC(2026, 9, 17, 12);
const token = 'fixture-purchase-token';
const iso = offset => new Date(now + offset).toISOString();
const config = {
  productId: 'matchapp_pro', basePlanIds: ['monthly'], offerIds: ['returning-3-months'],
  accountSecret: 'ab'.repeat(32), testUserIds: [], purchasesEnabled: true, qaEnabled: false,
  retentionEnabled: true, retentionOfferId: 'returning-3-months', retentionBasePlanId: 'monthly'
};

async function fixture(options = {}) {
  const policy = await load('play-policy.mjs');
  const hash = await policy.tokenHash(token);
  const accountId = await policy.obfuscatedAccountId(user, config.accountSecret);
  const purchase = {
    kind: 'androidpublisher#subscriptionPurchaseV2', startTime: iso(-3600_000),
    subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
    externalAccountIdentifiers: { obfuscatedExternalAccountId: accountId },
    lineItems: [{ productId: config.productId, expiryTime: iso(30 * 86_400_000), latestSuccessfulOrderId: 'GPA.fixture-order',
      offerDetails: { basePlanId: 'monthly' }, offerPhase: { basePrice: {} },
      autoRenewingPlan: { autoRenewEnabled: true, recurringPrice: { currencyCode: 'BRL', units: '9', nanos: 990000000 } } }]
  };
  if (options.purchase) options.purchase(purchase);
  const rows = new Map(options.rows || []), events = [];
  const state = options.state || { ok: true, entitlements: [], pro: { active: false, expiresAt: null }, adFree: false };
  let issuedOffer = options.issuedOffer === true, redeemedHash = null;
  const dependencies = {
    now: () => now,
    getState: async () => state,
    canStartPurchase: async () => true,
    bindAccount: async (owner, id) => { events.push(['bind', owner, id]); return { ok: true }; },
    accountUser: async id => options.unmapped ? null : id === accountId ? user : null,
    getRecord: async id => structuredClone(rows.get(id) || null),
    getSubscription: async () => { events.push(['read']); return structuredClone(purchase); },
    reserveOffer: async values => {
      events.push(['reserveOffer', values]);
      if (options.offerUnavailable) throw new Error('offer ledger unavailable');
      const eligible = options.offerEligible === true && redeemedHash === null;
      if (eligible) issuedOffer = true;
      return { ok: true, eligible, claimNonce: '00000000-0000-4000-8000-000000000003',
        issuedAt: now, expiresAt: now + 24 * 3_600_000 };
    },
    redeemOffer: async values => {
      events.push(['redeemOffer', values]);
      const redeemed = issuedOffer && (redeemedHash === null || redeemedHash === values.p_purchase_token_hash);
      if (redeemed) redeemedHash = values.p_purchase_token_hash;
      return { ok: true, redeemed };
    },
    upsert: async values => {
      events.push(['upsert', values]);
      if (options.persistenceFails) throw new Error('database unavailable');
      const old = rows.get(values.p_external_id);
      assert(!old || old.user_id === values.p_user_id);
      rows.set(values.p_external_id, { product_verified: true, ever_paid: old?.ever_paid === true || values.p_paid,
        ...Object.fromEntries(Object.entries(values).filter(([key]) => key !== 'p_replaces_external_id').map(([key, value]) => [key.slice(2), value])) });
      if (values.p_replaces_external_id && rows.has(values.p_replaces_external_id)) rows.get(values.p_replaces_external_id).status = 'superseded';
      return { ok: true, applied: true, active: values.p_paid && ['active', 'canceled'].includes(values.p_status) };
    },
    acknowledge: async () => { events.push(['ack']); purchase.acknowledgementState = 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'; }
  };
  return { policy, hash, accountId, purchase, rows, events, dependencies };
}
function stored(hash, owner = user, overrides = {}) {
  return { provider: 'play', external_id: hash, token_hash: hash, user_id: owner, product_id: config.productId,
    status: 'active', paid: true, ever_paid: true, product_verified: true, expires_at: iso(30 * 86_400_000), provider_event_at: iso(-3600_000), verified_at: iso(-1000), ...overrides };
}

test('configuration stays closed for missing/invalid identifiers and new sales default to off', async () => {
  const p = await load('play-policy.mjs');
  assert.equal(p.playConfiguration(() => ''), null);
  const values = { PLAY_PRO_PRODUCT_ID: config.productId, PLAY_PRO_BASE_PLAN_IDS: 'monthly', PLAY_BILLING_ACCOUNT_SECRET: config.accountSecret };
  const parsed = p.playConfiguration(name => values[name] || '');
  assert.equal(parsed.purchasesEnabled, false);
  assert.equal(parsed.qaEnabled, false);
  assert.equal(parsed.retentionEnabled, false);
  assert.deepEqual(parsed.offerIds, []);
  for (const bad of ['monthly,monthly', 'monthly,../bad', '']) {
    assert.equal(p.playConfiguration(name => name === 'PLAY_PRO_BASE_PLAN_IDS' ? bad : values[name] || ''), null);
  }
  assert.throws(() => p.requestBody({ action: 'verify', productId: config.productId, purchaseToken: token, userId: other }, config.productId));
  assert.throws(() => p.requestBody({ action: 'verify', productId: config.productId, purchaseToken: 'x\nsecret' }, config.productId));
  assert.deepEqual(p.requestBody({ action: 'retention_session', productId: config.productId, purchaseToken: token }, config.productId),
    { action: 'retention_session', productId: config.productId, purchaseToken: token });
  assert.throws(() => p.requestBody({ action: 'retention_session', productId: config.productId, purchaseToken: token, claimNonce: user }, config.productId));
  const configured = { ...values, PLAY_PRO_WINBACK_OFFER_IDS: config.offerIds[0], PLAY_RETENTION_ENABLED: 'true',
    PLAY_PRO_RETENTION_OFFER_ID: config.offerIds[0], PLAY_PRO_RETENTION_BASE_PLAN_ID: 'monthly' };
  assert.equal(p.playConfiguration(name => configured[name] || '').retentionEnabled, true);
  configured.PLAY_PRO_RETENTION_OFFER_ID = 'not-allowlisted';
  const unavailableOffer = p.playConfiguration(name => configured[name] || '');
  assert.equal(unavailableOffer.retentionEnabled, false);
  assert.equal(unavailableOffer.productId, config.productId);
  const qa = { ...values, PLAY_BILLING_QA_ENABLED: 'true', PLAY_BILLING_TEST_USER_IDS: user };
  assert.equal(p.playConfiguration(name => qa[name] || '').qaEnabled, true);
  assert.equal(p.playConfiguration(name => qa[name] || '').purchasesEnabled, false);
  qa.PLAY_BILLING_QA_ENABLED = 'TRUE';
  assert.equal(p.playConfiguration(name => qa[name] || '').qaEnabled, false);
  qa.PLAY_BILLING_TEST_USER_IDS = user + ',' + user;
  assert.equal(p.playConfiguration(name => qa[name] || ''), null);
});

test('QA sales require exact tester membership, effective private policy, catalog, RTDN and a bounded quote window', async () => {
  const p = await load('play-policy.mjs');
  const qa = { ...config, purchasesEnabled: false, qaEnabled: true, testUserIds: [user] };
  const settings = { ok: true, enabled: true, global_enabled: false, qa_active: true,
    qa_expires_at: iso(6 * 3_600_000), play_product_ids: [config.productId], policy_version: 'match-tokens-v1' };
  assert.equal(p.playSalesAllowed(user, qa, settings, now, true), true);
  const rejected = [
    [other, qa, settings, true],
    [user, { ...qa, qaEnabled: false }, settings, true],
    [user, { ...qa, testUserIds: [] }, settings, true],
    [user, { ...qa, purchasesEnabled: true, qaEnabled: false }, settings, true],
    [user, qa, settings, false],
    [user, qa, { ...settings, enabled: false }, true],
    [user, qa, { ...settings, global_enabled: null }, true],
    [user, qa, { ...settings, qa_active: false }, true],
    [user, qa, { ...settings, qa_active: 'true' }, true],
    [user, qa, { ...settings, play_product_ids: [] }, true],
    [user, qa, { ...settings, policy_version: 'unknown' }, true],
    [user, qa, { ...settings, qa_expires_at: null }, true],
    [user, qa, { ...settings, qa_expires_at: iso(-1) }, true],
    [user, qa, { ...settings, qa_expires_at: iso(600_000) }, true],
    [user, qa, { ...settings, qa_expires_at: iso(25 * 3_600_000) }, true]
  ];
  for (const [owner, cfg, policy, ready] of rejected) assert.equal(p.playSalesAllowed(owner, cfg, policy, now, ready), false);
  const publicPolicy = { ...settings, global_enabled: true, qa_active: false, qa_expires_at: null };
  assert.equal(p.playSalesAllowed(user, config, publicPolicy, now, true), true);
  assert.equal(p.playSalesAllowed(user, { ...config, purchasesEnabled: false }, publicPolicy, now, true), false);
  assert.equal(p.playSalesAllowed(null, config, publicPolicy, now, true), false);
});

test('cohort quote rejection leaves the ordinary bound restore session available', async () => {
  const p = await load('play-policy.mjs'), { createBillingSession } = await load('billing-core.mjs'), f = await fixture();
  const qa = { ...config, purchasesEnabled: false, qaEnabled: true, testUserIds: [user] };
  const settings = { ok: true, enabled: true, global_enabled: false, qa_active: true,
    qa_expires_at: iso(6 * 3_600_000), play_product_ids: [config.productId], policy_version: 'match-tokens-v1' };
  f.dependencies.canStartPurchase = async () => p.playSalesAllowed(user, qa, settings, now, true);
  // The endpoint permits an eligibility check for an exact environment tester;
  // the owned service policy remains the separate final sales authority.
  const prepared = await createBillingSession(user, { ...qa, purchasesEnabled: true }, f.dependencies);
  assert.equal(prepared.purchasesEnabled, true);
  assert(prepared.expiresAt < Date.parse(settings.qa_expires_at));
  settings.qa_active = false;
  const paused = await createBillingSession(user, { ...qa, purchasesEnabled: true }, f.dependencies);
  assert.equal(paused.ok, true);
  assert.equal(paused.purchasesEnabled, false);
  assert.equal(paused.userId, user);
  assert.equal(paused.productId, config.productId);
  assert.match(paused.obfuscatedAccountId, /^[a-f0-9]{64}$/);
  assert.deepEqual(paused.offerIds, []);
});

test('opaque account IDs bind package, account and server secret without exposing UUIDs', async () => {
  const p = await load('play-policy.mjs');
  const first = await p.obfuscatedAccountId(user, config.accountSecret);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert(!first.includes(user));
  assert.equal(await p.obfuscatedAccountId(user, config.accountSecret), first);
  assert.notEqual(await p.obfuscatedAccountId(other, config.accountSecret), first);
  assert.notEqual(await p.obfuscatedAccountId(user, 'cd'.repeat(32)), first);
});

test('sessions preserve restore readiness when new sales are paused and disclose only allowed offers', async () => {
  const { createBillingSession } = await load('billing-core.mjs'), f = await fixture();
  const session = await createBillingSession(user, { ...config, purchasesEnabled: false }, f.dependencies);
  assert.equal(session.purchasesEnabled, false);
  assert.equal(session.productId, config.productId);
  assert.deepEqual(session.basePlanIds, ['monthly']);
  assert.deepEqual(session.offerIds, []);
  assert.equal(session.expiresAt, now + 600_000);
  assert.equal(session.hasActiveEntitlement, false);
  assert.equal(f.events[0][0], 'bind');
  const lapsed = await fixture({ offerEligible: true, state: { ok: true, pro: { active: false, expiresAt: null }, entitlements: [
    stored('cc'.repeat(32), user, { status: 'expired', expires_at: iso(-1) })
  ] } });
  assert.deepEqual((await createBillingSession(user, config, lapsed.dependencies)).offerIds, config.offerIds);
});

test('new sales require verified eligibility while legacy billing failures leave restore sessions usable', async () => {
  const { createBillingSession } = await load('billing-core.mjs'), f = await fixture();
  assert.equal((await createBillingSession(user, config, f.dependencies)).purchasesEnabled, true);
  for (const check of [async () => false, async () => { throw new Error('legacy provider unavailable'); }]) {
    f.dependencies.canStartPurchase = check;
    const session = await createBillingSession(user, config, f.dependencies);
    assert.equal(session.ok, true);
    assert.equal(session.userId, user);
    assert.equal(session.purchasesEnabled, false);
  }
  f.dependencies.canStartPurchase = async () => { throw new Error('must not query a provider while sales are paused'); };
  assert.equal((await createBillingSession(user, { ...config, purchasesEnabled: false }, f.dependencies)).purchasesEnabled, false);
});

test('stored access and returning discounts require a server-verified product', async () => {
  const p = await load('play-policy.mjs'), f = await fixture();
  const unverified = stored(f.hash, user, { product_verified: false });
  assert.equal(p.activeStoredEntitlement(unverified, now), false);
  assert.equal(p.activeStoredEntitlement({ ...unverified, product_verified: true }, now), true);
  const history = { ...unverified, status: 'expired', expires_at: iso(-1) };
  const state = { ok: true, pro: { active: false }, entitlements: [history] };
  assert.equal(p.winbackEligible(state, now), false);
  history.product_verified = true;
  history.paid = false;
  assert.equal(p.winbackEligible(state, now), true);
});

test('a verified paid purchase is persisted before server acknowledgement and never exposes a raw token', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs'), f = await fixture();
  const result = await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies);
  assert.equal(result.entitled, true); assert.equal(result.acknowledged, true);
  assert.equal(result.userId, user); assert.equal(result.purchaseTokenHash, f.hash);
  assert.equal(result.entitlementExpiresAt, now + 30 * 86_400_000);
  assert(!JSON.stringify(result).includes(token));
  assert(f.events.findIndex(event => event[0] === 'upsert') < f.events.findIndex(event => event[0] === 'ack'));
  assert.equal(f.rows.get(f.hash).external_id, f.hash);
  assert(!JSON.stringify(f.rows.get(f.hash)).includes(token));
  await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies);
  assert.equal(f.rows.size, 1);
  assert.equal(f.events.filter(event => event[0] === 'ack').length, 1);
});

test('wrong account, product or offer cannot persist or acknowledge a purchase', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs');
  for (const change of [
    p => { p.externalAccountIdentifiers.obfuscatedExternalAccountId = 'cd'.repeat(32); },
    p => { p.lineItems[0].productId = 'another_product'; },
    p => { p.lineItems[0].offerDetails.offerId = 'unknown-offer'; }
  ]) {
    const f = await fixture({ purchase: change });
    await assert.rejects(verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies));
    assert(!f.events.some(event => ['upsert', 'ack'].includes(event[0])));
  }
});

test('an existing token can never move to another MatchApp account', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs'), f = await fixture();
  f.rows.set(f.hash, stored(f.hash, other));
  await assert.rejects(verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies), /purchase_account_mismatch/);
  assert.deepEqual(f.events, []);
});

test('pending, hold, pause, expired, trial and zero-price states never grant or acknowledge', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs');
  const cases = [
    p => { p.subscriptionState = 'SUBSCRIPTION_STATE_PENDING'; delete p.startTime; delete p.lineItems[0].expiryTime; },
    p => { p.subscriptionState = 'SUBSCRIPTION_STATE_ON_HOLD'; },
    p => { p.subscriptionState = 'SUBSCRIPTION_STATE_PAUSED'; },
    p => { p.subscriptionState = 'SUBSCRIPTION_STATE_EXPIRED'; p.lineItems[0].expiryTime = iso(-1); },
    p => { p.lineItems[0].offerPhase = { freeTrial: {} }; },
    p => { p.lineItems[0].autoRenewingPlan.recurringPrice = { currencyCode: 'BRL', units: '0', nanos: 0 }; }
  ];
  for (const change of cases) {
    const f = await fixture({ purchase: change });
    const result = await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies);
    assert.equal(result.entitled, false); assert.equal(result.acknowledged, false);
    assert(!f.events.some(event => event[0] === 'ack'));
  }
});

test('cancelled but unexpired paid subscriptions and Play grace keep access through verified expiry', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs');
  for (const state of ['SUBSCRIPTION_STATE_CANCELED', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD']) {
    const f = await fixture({ purchase: p => { p.subscriptionState = state; p.lineItems[0].autoRenewingPlan.autoRenewEnabled = false; } });
    const result = await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies);
    assert.equal(result.entitled, true);
    assert.equal(result.entitlementExpiresAt, now + 30 * 86_400_000);
  }
});

test('persistence failure cannot acknowledge an unfulfilled purchase', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs'), f = await fixture({ persistenceFails: true });
  await assert.rejects(verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies), /database unavailable/);
  assert(!f.events.some(event => event[0] === 'ack'));
});

test('RTDN can fulfill an issued account before native verification; unknown ownership remains retryable', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs'), f = await fixture();
  const result = await verifyPlayPurchase({ purchaseToken: token, providerEventTime: now - 1000, config }, f.dependencies);
  assert.equal(result.userId, user); assert.equal(result.entitled, true);
  const unknown = await fixture({ unmapped: true });
  await assert.rejects(verifyPlayPurchase({ purchaseToken: token, providerEventTime: now, config }, unknown.dependencies), /purchase_owner_pending/);
  assert(!unknown.events.some(event => event[0] === 'upsert'));
});

test('Google-linked replacements preserve ownership and supersede only after the new payment succeeds', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs'), policy = await load('play-policy.mjs');
  const oldHash = await policy.tokenHash('fixture-old-token');
  const f = await fixture({ purchase: p => { p.linkedPurchaseToken = 'fixture-old-token'; }, rows: [[oldHash, stored(oldHash)]] });
  await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies);
  assert.equal(f.rows.get(oldHash).status, 'superseded');
  const pending = await fixture({ purchase: p => { p.linkedPurchaseToken = 'fixture-old-token'; p.subscriptionState = 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED'; }, rows: [[oldHash, stored(oldHash)]] });
  await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, pending.dependencies);
  assert.equal(pending.rows.get(oldHash).status, 'active');
  const mismatch = await fixture({ purchase: p => { p.linkedPurchaseToken = 'fixture-old-token'; }, rows: [[oldHash, stored(oldHash, other)]] });
  await assert.rejects(verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, mismatch.dependencies), /purchase_account_mismatch/);
});

test('legacy restore without an obfuscated ID requires existing authoritative ownership', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs'), f = await fixture({ purchase: p => { delete p.externalAccountIdentifiers; } });
  await assert.rejects(verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies), /purchase_account_mismatch/);
  f.rows.set(f.hash, stored(f.hash));
  assert.equal((await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies)).entitled, true);
});

test('license-test purchases require an explicitly allowed MatchApp test account', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs'), f = await fixture({ purchase: p => { p.testPurchase = {}; } });
  await assert.rejects(verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies), /test_purchase_not_allowed/);
  assert.equal((await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config: { ...config, testUserIds: [user] } }, f.dependencies)).entitled, true);
});

test('new QA receipts cannot persist or acknowledge a real purchase, including pending and unpaid stored rows', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs');
  const qa = { ...config, purchasesEnabled: false, qaEnabled: true, testUserIds: [user] };
  for (const kind of ['new', 'pending', 'unpaid-row', 'unverified-row']) {
    const f = await fixture();
    if (kind === 'pending') {
      f.purchase.subscriptionState = 'SUBSCRIPTION_STATE_PENDING';
      delete f.purchase.startTime; delete f.purchase.lineItems[0].expiryTime;
    }
    if (kind === 'unpaid-row') f.rows.set(f.hash, stored(f.hash, user, { paid: false, ever_paid: false, status: 'pending' }));
    if (kind === 'unverified-row') f.rows.set(f.hash, stored(f.hash, user, { product_verified: false }));
    await assert.rejects(verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config: qa }, f.dependencies), /test_purchase_required/);
    assert(!f.events.some(event => ['upsert', 'ack', 'redeemOffer'].includes(event[0])));
  }
});

test('authentic pending test receipts complete after QA closes without accepting a non-test transition', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs');
  const qa = { ...config, purchasesEnabled: false, qaEnabled: true, testUserIds: [user] };
  const f = await fixture({ purchase: p => {
    p.testPurchase = {}; p.subscriptionState = 'SUBSCRIPTION_STATE_PENDING';
    delete p.startTime; delete p.lineItems[0].expiryTime;
  } });
  f.dependencies.canStartPurchase = async () => { throw new Error('receipt fulfillment must not depend on cohort admission'); };
  assert.equal((await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config: qa }, f.dependencies)).entitled, false);
  assert.equal(f.rows.get(f.hash).paid, false);
  assert(!f.events.some(event => event[0] === 'ack'));
  f.purchase.subscriptionState = 'SUBSCRIPTION_STATE_ACTIVE'; f.purchase.startTime = iso(0);
  f.purchase.lineItems[0].expiryTime = iso(30 * 86_400_000); delete f.purchase.testPurchase;
  const paused = { ...qa, qaEnabled: false };
  await assert.rejects(verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config: paused }, f.dependencies), /test_purchase_required/);
  assert.equal(f.rows.get(f.hash).paid, false);
  f.purchase.testPurchase = {};
  const result = await verifyPlayPurchase({ purchaseToken: token, providerEventTime: now, config: paused }, f.dependencies);
  assert.equal(result.entitled, true); assert.equal(result.acknowledged, true);
  assert.equal(f.events.filter(event => event[0] === 'ack').length, 1);
});

test('historic verified real subscriptions retain restore and acknowledgement reconciliation for a QA-listed owner', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs'), f = await fixture();
  f.rows.set(f.hash, stored(f.hash, user, { paid: false, ever_paid: true, status: 'past_due' }));
  f.dependencies.canStartPurchase = async () => { throw new Error('historical restoration must remain available'); };
  f.dependencies.acknowledge = async () => {
    f.events.push(['ack']);
    f.purchase.acknowledgementState = 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED';
    throw new Error('transport timed out after acknowledgement');
  };
  const result = await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user,
    config: { ...config, purchasesEnabled: false, qaEnabled: false, testUserIds: [user] } }, f.dependencies);
  assert.equal(result.entitled, true); assert.equal(result.acknowledged, true);
  assert.equal(result.userId, user);
  assert.equal(f.events.filter(event => event[0] === 'upsert').length, 2);
});

test('QA acknowledgement requery retains the pre-persistence test requirement', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs'), f = await fixture({ purchase: p => { p.testPurchase = {}; } });
  f.dependencies.acknowledge = async () => {
    f.events.push(['ack']); delete f.purchase.testPurchase;
    throw new Error('acknowledgement transport failed');
  };
  await assert.rejects(verifyPlayPurchase({ purchaseToken: token, expectedUserId: user,
    config: { ...config, purchasesEnabled: false, qaEnabled: true, testUserIds: [user] } }, f.dependencies), /test_purchase_required/);
  // The first snapshot was an authentic test purchase; the changed response
  // must not be persisted merely because that first observation created a row.
  assert.equal(f.events.filter(event => event[0] === 'upsert').length, 1);
  assert.equal(f.events.filter(event => event[0] === 'ack').length, 1);
});

test('a malformed Google test marker is never treated as a license-test purchase', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs');
  for (const marker of [null, true, 'true', []]) {
    const f = await fixture({ purchase: p => { p.testPurchase = marker; } });
    await assert.rejects(verifyPlayPurchase({ purchaseToken: token, expectedUserId: user,
      config: { ...config, testUserIds: [user] } }, f.dependencies), /invalid_purchase/);
    assert(!f.events.some(event => ['upsert', 'ack'].includes(event[0])));
  }
});

test('an acknowledgement timeout is reconciled through Play instead of a client Boolean', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs'), f = await fixture();
  f.dependencies.acknowledge = async () => { f.purchase.acknowledgementState = 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'; throw new Error('transport timed out'); };
  assert.equal((await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies)).acknowledged, true);
  const delayed = await fixture(); delayed.dependencies.acknowledge = async () => { throw new Error('offline'); };
  const result = await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, delayed.dependencies);
  assert.equal(result.acknowledged, false); assert.equal(result.status, 'verification_pending');
});

test('a purchase that expires during acknowledgement is reconciled before returning access', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs'), f = await fixture();
  f.dependencies.acknowledge = async () => {
    f.purchase.subscriptionState = 'SUBSCRIPTION_STATE_EXPIRED';
    f.purchase.lineItems[0].expiryTime = iso(-1);
    throw new Error('receipt changed during acknowledgement');
  };
  const result = await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies);
  assert.equal(result.entitled, false);
  assert.equal(result.entitlementExpiresAt, null);
  assert.equal(result.status, 'expired');
  assert.equal(f.rows.get(f.hash).status, 'expired');
  assert.equal(f.events.filter(event => event[0] === 'upsert').length, 2);
});

test('a new paid discounted receipt requires an issued one-time offer, not paid history alone', async () => {
  const { createBillingSession, verifyPlayPurchase } = await load('billing-core.mjs');
  const discounted = p => { p.lineItems[0].offerDetails.offerId = config.offerIds[0]; p.lineItems[0].offerPhase = { introductoryPrice: {} }; };
  const first = await fixture({ purchase: discounted });
  await assert.rejects(verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, first.dependencies), /offer_not_eligible/);
  const lapsed = await fixture({ purchase: discounted, offerEligible: true, state: { ok: true, pro: { active: false, expiresAt: null }, entitlements: [
    stored('cc'.repeat(32), user, { status: 'canceled', expires_at: iso(-86_400_000) })
  ] } });
  await assert.rejects(verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, lapsed.dependencies), /offer_not_eligible/);
  await createBillingSession(user, config, lapsed.dependencies);
  assert.equal((await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, lapsed.dependencies)).entitled, true);
});

test('discount failures and disabled retention preserve ordinary full-price purchase and restore sessions', async () => {
  const { createBillingSession, verifyPlayPurchase } = await load('billing-core.mjs');
  const state = { ok: true, pro: { active: false, expiresAt: null }, entitlements: [
    stored('cc'.repeat(32), user, { status: 'expired', expires_at: iso(-86_400_000) })
  ] };
  for (const options of [{ offerUnavailable: true }, { offerEligible: false }]) {
    const f = await fixture({ ...options, state });
    const session = await createBillingSession(user, config, f.dependencies);
    assert.equal(session.purchasesEnabled, true);
    assert.deepEqual(session.offerIds, []);
    assert.equal((await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies)).entitled, true);
  }
  const disabled = await fixture({ state, offerEligible: true });
  const session = await createBillingSession(user, { ...config, retentionEnabled: false }, disabled.dependencies);
  assert.equal(session.purchasesEnabled, true);
  assert.deepEqual(session.offerIds, []);
  assert(!disabled.events.some(event => event[0] === 'reserveOffer'));
});

test('retention quotes require a fresh owned paid source and return only its verified renewal boundary', async () => {
  const { createRetentionSession } = await load('billing-core.mjs');
  const policy = await load('play-policy.mjs'), sourceHash = await policy.tokenHash(token);
  for (const canceled of [false, true]) {
    const source = stored(sourceHash);
    const f = await fixture({ offerEligible: true, state: { ok: true,
      pro: { active: true, expiresAt: now + 30 * 86_400_000 }, entitlements: [source] },
      purchase: p => {
        if (canceled) {
          p.subscriptionState = 'SUBSCRIPTION_STATE_CANCELED';
          p.lineItems[0].autoRenewingPlan.autoRenewEnabled = false;
        }
      }
    });
    const session = await createRetentionSession(user, token, config, f.dependencies);
    assert.equal(session.purpose, 'retention');
    assert.equal(session.purchasesEnabled, true);
    assert.equal(session.hasActiveEntitlement, true);
    assert.equal(session.sourceExpiresAt, now + 30 * 86_400_000);
    assert.equal(session.sourcePurchaseTokenHash, sourceHash);
    assert.deepEqual(session.basePlanIds, ['monthly']);
    assert.deepEqual(session.offerIds, [config.retentionOfferId]);
    assert.match(session.offerClaimNonce, /^[0-9a-f-]{36}$/);
    assert(!JSON.stringify(session).includes(token));
    assert(f.events.some(event => event[0] === 'read'));
    const reservation = f.events.find(event => event[0] === 'reserveOffer')[1];
    assert.equal(reservation.p_source_token_hash, sourceHash);
    assert.equal(reservation.p_purpose, 'retention');
    assert(f.events.findIndex(event => event[0] === 'upsert') < f.events.findIndex(event => event[0] === 'reserveOffer'));
  }
});

test('retention refuses trials, pending payments, grace-period dates, expiry and a different base plan', async () => {
  const { createRetentionSession } = await load('billing-core.mjs');
  const changes = [
    p => { p.lineItems[0].offerPhase = { freeTrial: {} }; },
    p => { p.subscriptionState = 'SUBSCRIPTION_STATE_PENDING'; delete p.startTime; delete p.lineItems[0].expiryTime; },
    p => { p.subscriptionState = 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'; },
    p => { p.subscriptionState = 'SUBSCRIPTION_STATE_EXPIRED'; p.lineItems[0].expiryTime = iso(-1); },
    p => { p.lineItems[0].expiryTime = iso(30_000); },
    p => { p.lineItems[0].offerDetails.basePlanId = 'annual'; }
  ];
  for (const change of changes) {
    const f = await fixture({ offerEligible: true, purchase: change,
      state: { ok: true, pro: { active: true, expiresAt: now + 30 * 86_400_000 }, entitlements: [] } });
    await assert.rejects(createRetentionSession(user, token, { ...config, basePlanIds: ['monthly', 'annual'] }, f.dependencies), /retention_not_eligible/);
    assert(!f.events.some(event => event[0] === 'reserveOffer'));
  }
});

test('retention sales gates cannot grant a second provider or weaken verified account ownership', async () => {
  const { createRetentionSession } = await load('billing-core.mjs');
  for (const override of [{ purchasesEnabled: false }, { retentionEnabled: false }, { retentionOfferId: null }]) {
    const off = await fixture({ offerEligible: true });
    await assert.rejects(createRetentionSession(user, token, { ...config, ...override }, off.dependencies), /retention_unavailable/);
    assert.deepEqual(off.events, []);
  }
  const mismatch = await fixture({ offerEligible: true });
  await assert.rejects(createRetentionSession(other, token, config, mismatch.dependencies), /purchase_account_mismatch/);
  assert(!mismatch.events.some(event => ['reserveOffer', 'upsert'].includes(event[0])));
  const secondProvider = await fixture({ offerEligible: true, state: { ok: true,
    pro: { active: true, expiresAt: now + 30 * 86_400_000 }, entitlements: [stored('cc'.repeat(32), user, { provider: 'stripe' })] } });
  await assert.rejects(createRetentionSession(user, token, config, secondProvider.dependencies), /retention_not_eligible/);
  assert(!secondProvider.events.some(event => event[0] === 'reserveOffer'));
  const legacyUnavailable = await fixture({ offerEligible: true, state: { ok: true,
    pro: { active: true, expiresAt: now + 30 * 86_400_000 }, entitlements: [] } });
  legacyUnavailable.dependencies.canStartPurchase = async () => { throw new Error('provider unavailable'); };
  await assert.rejects(createRetentionSession(user, token, config, legacyUnavailable.dependencies), /retention_unavailable/);
  assert.equal(legacyUnavailable.rows.get(legacyUnavailable.hash).paid, true);
  assert(!legacyUnavailable.events.some(event => event[0] === 'reserveOffer'));
});

test('a pending discounted token must still redeem its issued offer on the first paid observation', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs');
  const f = await fixture({ purchase: p => {
    p.lineItems[0].offerDetails.offerId = config.offerIds[0];
    p.subscriptionState = 'SUBSCRIPTION_STATE_PENDING';
    delete p.startTime; delete p.lineItems[0].expiryTime;
  } });
  assert.equal((await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies)).entitled, false);
  assert(!f.events.some(event => event[0] === 'redeemOffer'));
  f.purchase.subscriptionState = 'SUBSCRIPTION_STATE_ACTIVE';
  f.purchase.startTime = iso(0);
  f.purchase.lineItems[0].expiryTime = iso(30 * 86_400_000);
  await assert.rejects(verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config }, f.dependencies), /offer_not_eligible/);
  assert.equal(f.rows.get(f.hash).paid, false);
  assert(!f.events.some(event => event[0] === 'ack'));
});

test('issued paid replacement receipts reconcile while sales are paused and bind the actual linked token', async () => {
  const { verifyPlayPurchase } = await load('billing-core.mjs');
  const policy = await load('play-policy.mjs'), oldHash = await policy.tokenHash('old-owned-token');
  const f = await fixture({ issuedOffer: true, rows: [[oldHash, stored(oldHash)]], purchase: p => {
    p.linkedPurchaseToken = 'old-owned-token';
    p.lineItems[0].offerDetails.offerId = config.offerIds[0];
    p.lineItems[0].offerPhase = { prorationPeriod: { originalOfferPhaseType: 'BASE' } };
  } });
  const paused = { ...config, purchasesEnabled: false, retentionEnabled: false };
  const result = await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config: paused }, f.dependencies);
  assert.equal(result.entitled, true);
  assert.equal(result.offerId, config.offerIds[0]);
  assert.equal(result.linkedPurchaseTokenHash, oldHash);
  assert.equal(f.rows.get(oldHash).status, 'superseded');
  assert.equal(f.events.find(event => event[0] === 'redeemOffer')[1].p_linked_token_hash, oldHash);
  const redemptionCount = f.events.filter(event => event[0] === 'redeemOffer').length;
  assert.equal((await verifyPlayPurchase({ purchaseToken: token, expectedUserId: user, config: paused }, f.dependencies)).entitled, true);
  assert.equal(f.events.filter(event => event[0] === 'redeemOffer').length, redemptionCount);
});

test('RTDN envelopes bind package and subscription and reject mixed or oversized payloads', async () => {
  const p = await load('play-policy.mjs'), subscription = 'projects/example-project/subscriptions/play-rtdn';
  const notice = { version: '1.0', packageName: p.PLAY_PACKAGE, eventTimeMillis: String(now), subscriptionNotification: { version: '1.0', notificationType: 2, purchaseToken: token } };
  const envelope = data => ({ subscription, message: { messageId: '123456789', data: Buffer.from(JSON.stringify(data)).toString('base64') } });
  assert.equal(p.rtdnEnvelope(envelope(notice), subscription, now).purchaseToken, token);
  for (const bad of [{ ...notice, packageName: 'tv.matchapp.kids' }, { ...notice, eventTimeMillis: String(now + 600_000) }, { ...notice, testNotification: {} }]) {
    assert.throws(() => p.rtdnEnvelope(envelope(bad), subscription, now));
  }
  assert.throws(() => p.rtdnEnvelope(envelope(notice), 'projects/other/subscriptions/other', now));
  assert.throws(() => p.rtdnEnvelope({ subscription, message: { messageId: '1', data: 'A'.repeat(24_001) } }, subscription, now));
});
