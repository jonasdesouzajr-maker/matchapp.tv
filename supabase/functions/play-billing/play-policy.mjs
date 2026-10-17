// Pure validation shared by the Play endpoint and executable Node regression tests.
export const PLAY_PACKAGE = 'com.jonas.papercup';
export const validUserId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
export const validHash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
export const validProductId = value => typeof value === 'string' && /^[a-z][a-z0-9._]{0,149}$/.test(value);
export const validPlanId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,62}$/.test(value);
export const validPurchaseToken = value => typeof value === 'string' && /^[\x21-\x7e]{1,4096}$/.test(value);
export const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export class PlayValidationError extends Error {
  constructor(code, status = 400) { super(code); this.name = 'PlayValidationError'; this.code = code; this.status = status; }
}

function identifiers(raw, validate, min, max) {
  const values = raw ? raw.split(',').map(value => value.trim()) : [];
  if (values.length < min || values.length > max || values.some(value => !validate(value)) || new Set(values).size !== values.length) return null;
  return values;
}

export function playConfiguration(env) {
  const productId = env('PLAY_PRO_PRODUCT_ID') || '';
  const basePlanIds = identifiers(env('PLAY_PRO_BASE_PLAN_IDS') || '', validPlanId, 1, 8);
  // Keep previously issued offer IDs allowlisted for receipt reconciliation, even when sales pause.
  const offerIds = identifiers(env('PLAY_PRO_WINBACK_OFFER_IDS') || '', validPlanId, 0, 32);
  const testUserIds = identifiers(env('PLAY_BILLING_TEST_USER_IDS') || '', validUserId, 0, 20);
  const accountSecret = env('PLAY_BILLING_ACCOUNT_SECRET') || '';
  if (!validProductId(productId) || !basePlanIds || !offerIds || !testUserIds || !validHash(accountSecret)) return null;
  const retentionOfferId = env('PLAY_PRO_RETENTION_OFFER_ID') || '';
  const retentionBasePlanId = env('PLAY_PRO_RETENTION_BASE_PLAN_ID') || '';
  const retentionConfigured = validPlanId(retentionOfferId) && offerIds.includes(retentionOfferId) &&
    validPlanId(retentionBasePlanId) && basePlanIds.includes(retentionBasePlanId);
  return { productId, basePlanIds, offerIds, testUserIds, accountSecret,
    purchasesEnabled: env('PLAY_BILLING_ENABLED') === 'true',
    qaEnabled: env('PLAY_BILLING_QA_ENABLED') === 'true',
    retentionOfferId: retentionConfigured ? retentionOfferId : null,
    retentionBasePlanId: retentionConfigured ? retentionBasePlanId : null,
    retentionEnabled: retentionConfigured && env('PLAY_RETENTION_ENABLED') === 'true' };
}

export function requestBody(value, productId) {
  if (!object(value)) throw new PlayValidationError('invalid_request');
  const keys = Object.keys(value);
  if (value.action === 'session' && keys.length === 1) return { action: 'session' };
  if (['verify', 'retention_session'].includes(value.action) && keys.length === 3 && keys.every(key => ['action', 'productId', 'purchaseToken'].includes(key)) &&
      value.productId === productId && validPurchaseToken(value.purchaseToken)) {
    return { action: value.action, productId, purchaseToken: value.purchaseToken };
  }
  throw new PlayValidationError('invalid_request');
}

export async function tokenHash(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function obfuscatedAccountId(userId, secret) {
  if (!validUserId(userId) || !validHash(secret)) throw new PlayValidationError('configuration_unavailable', 503);
  const bytes = Uint8Array.from(secret.match(/.{2}/g), byte => Number.parseInt(byte, 16));
  const key = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const hash = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${PLAY_PACKAGE}:${userId}`));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function timestamp(value) {
  if (typeof value !== 'string' || value.length > 40 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

/** Only service-read account policy can admit a public or license-test quote. */
export function playSalesAllowed(userId, config, settings, now, rtdnReady) {
  if (!validUserId(userId) || !Number.isSafeInteger(now) || rtdnReady !== true ||
      !object(settings) || settings.ok !== true || settings.policy_version !== 'match-tokens-v1' ||
      settings.enabled !== true || typeof settings.global_enabled !== 'boolean' ||
      typeof settings.qa_active !== 'boolean' || !Array.isArray(settings.play_product_ids) ||
      !settings.play_product_ids.includes(config.productId)) return false;
  if (config.purchasesEnabled === true && settings.global_enabled === true) return true;
  const expiry = timestamp(settings.qa_expires_at);
  // The unchanged native session lasts ten minutes. Do not issue a QA session
  // unless that entire lifetime fits inside the server-authorized cohort window.
  return config.qaEnabled === true && config.testUserIds.includes(userId) && settings.qa_active === true &&
    expiry !== null && expiry > now + 600_000 && expiry <= now + 24 * 3_600_000;
}

export function activeStoredEntitlement(record, now) {
  return object(record) && record.product_verified === true && record.paid === true && ['active', 'canceled'].includes(record.status) &&
    timestamp(record.expires_at) !== null && timestamp(record.expires_at) > now;
}

export function winbackEligible(state, now) {
  if (!object(state) || state.ok !== true || !object(state.pro) || typeof state.pro.active !== 'boolean' ||
      state.pro.active || !Array.isArray(state.entitlements)) return false;
  return state.entitlements.some(row => object(row) && row.provider === 'play' && row.product_verified === true &&
    (row.ever_paid === true || row.paid === true) &&
    ['canceled', 'expired'].includes(row.status) && timestamp(row.expires_at) !== null && timestamp(row.expires_at) <= now);
}

function positivePrice(price) {
  if (!object(price) || !/^[A-Z]{3}$/.test(price.currencyCode || '')) return false;
  const units = price.units ?? '0', nanos = price.nanos ?? 0;
  return /^(0|[1-9]\d{0,11})$/.test(String(units)) && Number.isInteger(nanos) && nanos >= 0 && nanos < 1_000_000_000 &&
    (BigInt(units) > 0n || nanos > 0);
}

export function inspectSubscription(purchase, config, now) {
  if (!object(purchase) || purchase.kind !== 'androidpublisher#subscriptionPurchaseV2' ||
      !Array.isArray(purchase.lineItems) || purchase.lineItems.length !== 1) throw new PlayValidationError('unsupported_purchase');
  if (own(purchase, 'testPurchase') && !object(purchase.testPurchase)) throw new PlayValidationError('invalid_purchase');
  const line = purchase.lineItems[0];
  if (!object(line) || line.productId !== config.productId) throw new PlayValidationError('unsupported_product');
  const plan = line.offerDetails;
  if (!object(plan) || !config.basePlanIds.includes(plan.basePlanId) ||
      (plan.offerId != null && !config.offerIds.includes(plan.offerId))) throw new PlayValidationError('unsupported_offer');
  if (!object(line.autoRenewingPlan) || own(line, 'prepaidPlan') || own(line.autoRenewingPlan, 'installmentDetails')) {
    throw new PlayValidationError('unsupported_plan');
  }
  if (line.autoRenewingPlan.autoRenewEnabled != null && typeof line.autoRenewingPlan.autoRenewEnabled !== 'boolean') {
    throw new PlayValidationError('invalid_purchase');
  }
  const states = {
    SUBSCRIPTION_STATE_ACTIVE: 'active', SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'active',
    SUBSCRIPTION_STATE_CANCELED: 'canceled', SUBSCRIPTION_STATE_ON_HOLD: 'past_due',
    SUBSCRIPTION_STATE_PAUSED: 'paused', SUBSCRIPTION_STATE_EXPIRED: 'expired',
    SUBSCRIPTION_STATE_PENDING: 'pending', SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: 'pending'
  };
  const status = states[purchase.subscriptionState];
  if (!status) throw new PlayValidationError('unsupported_state');
  const expiresAt = timestamp(line.expiryTime);
  const startedAt = timestamp(purchase.startTime);
  if ((status !== 'pending' && (expiresAt === null || startedAt === null)) ||
      (expiresAt !== null && expiresAt > now + 2 * 366 * 86_400_000) ||
      (startedAt !== null && startedAt > now + 300_000)) throw new PlayValidationError('invalid_expiry');
  if (!['ACKNOWLEDGEMENT_STATE_PENDING', 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'].includes(purchase.acknowledgementState)) {
    throw new PlayValidationError('invalid_acknowledgement');
  }
  const accountId = purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? null;
  if (accountId !== null && !validHash(accountId)) throw new PlayValidationError('purchase_account_mismatch', 409);
  const linkedToken = purchase.linkedPurchaseToken ?? null;
  const expiredToken = purchase.outOfAppPurchaseContext?.expiredPurchaseToken ?? null;
  if ((linkedToken !== null && !validPurchaseToken(linkedToken)) || (expiredToken !== null && !validPurchaseToken(expiredToken))) {
    throw new PlayValidationError('invalid_purchase');
  }
  const trial = object(line.offerPhase) && (own(line.offerPhase, 'freeTrial') ||
    line.offerPhase.prorationPeriod?.originalOfferPhaseType === 'FREE_TRIAL');
  const successfulOrder = typeof line.latestSuccessfulOrderId === 'string' && /^[\x21-\x7e]{1,256}$/.test(line.latestSuccessfulOrderId);
  const paid = status !== 'pending' && !trial && successfulOrder && !own(line, 'signupPromotion') &&
    positivePrice(line.autoRenewingPlan.recurringPrice);
  const effectiveStatus = trial ? 'trialing' : status;
  const active = paid && ['active', 'canceled'].includes(effectiveStatus) && expiresAt > now;
  return {
    productId: line.productId, basePlanId: plan.basePlanId, offerId: plan.offerId ?? null,
    status: effectiveStatus, paid, active, expiresAt, startedAt, accountId, linkedToken, expiredToken,
    inGracePeriod: purchase.subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
    autoRenew: line.autoRenewingPlan.autoRenewEnabled === true,
    cancelAtPeriodEnd: status === 'canceled' || line.autoRenewingPlan.autoRenewEnabled === false,
    acknowledged: purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    testPurchase: own(purchase, 'testPurchase')
  };
}

export function rtdnEnvelope(body, subscription, now) {
  if (!object(body) || body.subscription !== subscription || !object(body.message) ||
      typeof body.message.messageId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(body.message.messageId) ||
      typeof body.message.data !== 'string' || body.message.data.length > 24_000 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(body.message.data)) throw new PlayValidationError('invalid_notification');
  let notice;
  try {
    const raw = atob(body.message.data);
    if (raw.length > 16_384) throw new Error('too_large');
    notice = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(raw, value => value.charCodeAt(0))));
  } catch (_) { throw new PlayValidationError('invalid_notification'); }
  if (!object(notice) || notice.packageName !== PLAY_PACKAGE || !/^\d{1,16}$/.test(String(notice.eventTimeMillis))) {
    throw new PlayValidationError('invalid_notification');
  }
  const eventTime = Number(notice.eventTimeMillis);
  if (!Number.isSafeInteger(eventTime) || eventTime <= 0 || eventTime > now + 300_000) throw new PlayValidationError('invalid_notification');
  const variants = ['subscriptionNotification', 'voidedPurchaseNotification', 'oneTimeProductNotification', 'pendingRefundReviewNotification', 'testNotification'];
  const present = variants.filter(key => own(notice, key));
  if (present.length !== 1 || !object(notice[present[0]])) throw new PlayValidationError('invalid_notification');
  const kind = present[0];
  if (kind === 'testNotification') return { kind: 'test', eventTime, messageId: body.message.messageId };
  if (kind === 'oneTimeProductNotification' || kind === 'pendingRefundReviewNotification') return { kind: 'ignored', eventTime, messageId: body.message.messageId };
  const payload = notice[kind];
  if (!validPurchaseToken(payload.purchaseToken)) throw new PlayValidationError('invalid_notification');
  if (kind === 'voidedPurchaseNotification' && payload.productType !== 1) return { kind: 'ignored', eventTime, messageId: body.message.messageId };
  if (kind === 'subscriptionNotification' && (!Number.isSafeInteger(payload.notificationType) || payload.notificationType <= 0)) {
    throw new PlayValidationError('invalid_notification');
  }
  return { kind: 'subscription', eventTime, purchaseToken: payload.purchaseToken, messageId: body.message.messageId };
}
