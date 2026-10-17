import {
  PlayValidationError, activeStoredEntitlement, inspectSubscription, object,
  obfuscatedAccountId, timestamp, tokenHash, validHash, validPlanId, validPurchaseToken, validUserId, winbackEligible
} from './play-policy.mjs';

function billingState(value) {
  if (!object(value) || value.ok !== true || !Array.isArray(value.entitlements) || !object(value.pro) ||
      typeof value.pro.active !== 'boolean' || (value.pro.active && !Number.isSafeInteger(value.pro.expiresAt))) {
    throw new PlayValidationError('status_unavailable', 503);
  }
  return value;
}

function ownedRecord(value, hash) {
  if (value === null) return null;
  if (!object(value) || value.provider !== 'play' || value.external_id !== hash ||
      value.token_hash !== hash || !validUserId(value.user_id)) throw new PlayValidationError('verification_unavailable', 503);
  return value;
}

function configuredRetention(config) {
  return config.retentionEnabled === true && validPlanId(config.retentionOfferId) &&
    config.offerIds.includes(config.retentionOfferId) && validPlanId(config.retentionBasePlanId) &&
    config.basePlanIds.includes(config.retentionBasePlanId);
}

function validReservation(value, now) {
  return object(value) && value.ok === true && value.eligible === true && validUserId(value.claimNonce) &&
    Number.isSafeInteger(value.issuedAt) && value.issuedAt > 0 && value.issuedAt <= now + 300_000 &&
    Number.isSafeInteger(value.expiresAt) && value.expiresAt > now && value.expiresAt <= now + 25 * 3_600_000;
}

async function reserveOffer(userId, sourceHash, purpose, config, dependencies) {
  if (!configuredRetention(config) || !validHash(sourceHash)) return null;
  const reservation = await dependencies.reserveOffer({
    p_user_id: userId, p_product_id: config.productId, p_base_plan_id: config.retentionBasePlanId,
    p_offer_id: config.retentionOfferId, p_source_token_hash: sourceHash, p_purpose: purpose
  });
  return validReservation(reservation, dependencies.now()) ? reservation : null;
}

export async function createBillingSession(userId, config, dependencies) {
  if (!validUserId(userId)) throw new PlayValidationError('sign_in_required', 401);
  const now = dependencies.now();
  const state = billingState(await dependencies.getState(userId));
  if (state.pro.active && state.pro.expiresAt <= now) throw new PlayValidationError('status_unavailable', 503);
  const accountId = await obfuscatedAccountId(userId, config.accountSecret);
  const bound = await dependencies.bindAccount(userId, accountId);
  if (bound?.ok !== true) throw new PlayValidationError('account_binding_unavailable', 503);
  let purchasesEnabled = false;
  if (config.purchasesEnabled === true && !state.pro.active) {
    try {
      // Failures checking an existing recurring plan pause new sales only.
      // Receipt verification and restoration never depend on this extra provider read.
      purchasesEnabled = await dependencies.canStartPurchase(userId) === true;
    } catch (_) { purchasesEnabled = false; }
  }
  let offerIds = [];
  if (purchasesEnabled && configuredRetention(config) && winbackEligible(state, now)) {
    const source = state.entitlements.filter(row => object(row) && row.provider === 'play' &&
      row.user_id === userId && row.product_id === config.productId && row.product_verified === true &&
      (row.ever_paid === true || row.paid === true) && ['canceled', 'expired'].includes(row.status) &&
      timestamp(row.expires_at) !== null && timestamp(row.expires_at) <= now &&
      validHash(row.token_hash) && row.external_id === row.token_hash)
      .sort((a, b) => timestamp(b.expires_at) - timestamp(a.expires_at))[0];
    try {
      if (source && await reserveOffer(userId, source.token_hash, 'winback', config, dependencies)) {
        offerIds = [config.retentionOfferId];
      }
    } catch (_) { /* An unavailable discount never blocks the ordinary base plan or restoration. */ }
  }
  return {
    ok: true, userId, obfuscatedAccountId: accountId, expiresAt: now + 600_000,
    productId: config.productId, basePlanIds: config.basePlanIds,
    offerIds,
    hasActiveEntitlement: state.pro.active, purchasesEnabled
  };
}

/** A distinct, optional quote for an already owned, currently paid monthly Play subscription. */
export async function createRetentionSession(userId, purchaseToken, config, dependencies) {
  if (!validUserId(userId) || !validPurchaseToken(purchaseToken)) throw new PlayValidationError('invalid_request');
  if (!config.purchasesEnabled || !configuredRetention(config)) throw new PlayValidationError('retention_unavailable', 409);
  // The existing verifier remains the only ownership, payment, persistence and acknowledgement authority.
  const verified = await verifyPlayPurchase({ purchaseToken, expectedUserId: userId, config, includeSource: true }, dependencies);
  const now = dependencies.now();
  const source = verified.verifiedSource;
  if (!verified.entitled || !verified.acknowledged || !source || source.paid !== true ||
      !['active', 'canceled'].includes(source.status) || source.inGracePeriod || source.basePlanId !== config.retentionBasePlanId ||
      source.expiresAt <= now + 90_000) throw new PlayValidationError('retention_not_eligible', 409);
  const state = billingState(await dependencies.getState(userId));
  if (!state.pro.active || state.entitlements.some(row => object(row) && row.provider !== 'play' && activeStoredEntitlement(row, now))) {
    throw new PlayValidationError('retention_not_eligible', 409);
  }
  let allowed = false;
  try { allowed = await dependencies.canStartPurchase(userId) === true; } catch (_) { /* New offers fail closed. */ }
  if (!allowed) throw new PlayValidationError('retention_unavailable', 409);
  const reservation = await reserveOffer(userId, verified.purchaseTokenHash, 'retention', config, dependencies);
  if (!reservation) throw new PlayValidationError('retention_not_eligible', 409);
  const accountId = await obfuscatedAccountId(userId, config.accountSecret);
  if ((await dependencies.bindAccount(userId, accountId))?.ok !== true) {
    throw new PlayValidationError('account_binding_unavailable', 503);
  }
  return {
    ok: true, userId, obfuscatedAccountId: accountId, expiresAt: now + 600_000,
    productId: config.productId, basePlanIds: [config.retentionBasePlanId], offerIds: [config.retentionOfferId],
    hasActiveEntitlement: true, purchasesEnabled: true, purpose: 'retention',
    sourcePurchaseTokenHash: verified.purchaseTokenHash, sourceExpiresAt: source.expiresAt,
    offerClaimNonce: reservation.claimNonce
  };
}

/**
 * @param {{purchaseToken: string, expectedUserId?: string|null, providerEventTime?: number|null, includeSource?: boolean,
 *   config: NonNullable<ReturnType<typeof import('./play-policy.mjs').playConfiguration>>}} request
 */
export async function verifyPlayPurchase({ purchaseToken, expectedUserId = null, providerEventTime = null, includeSource = false, config }, dependencies) {
  if (!validPurchaseToken(purchaseToken) || (expectedUserId !== null && !validUserId(expectedUserId))) {
    throw new PlayValidationError('invalid_request');
  }
  const hash = await tokenHash(purchaseToken);
  const existing = ownedRecord(await dependencies.getRecord(hash), hash);
  if (existing && expectedUserId !== null && existing.user_id !== expectedUserId) {
    throw new PlayValidationError('purchase_account_mismatch', 409);
  }
  // Use the observation's start time for same-event concurrency; a late old fetch cannot win.
  const observedAt = dependencies.now();
  const purchase = await dependencies.getSubscription(purchaseToken);
  let candidate = inspectSubscription(purchase, config, dependencies.now());
  const linkedHash = candidate.linkedToken ? await tokenHash(candidate.linkedToken) : null;
  const expiredHash = candidate.expiredToken ? await tokenHash(candidate.expiredToken) : null;
  if (linkedHash === hash || expiredHash === hash) throw new PlayValidationError('invalid_purchase');
  const linked = linkedHash ? ownedRecord(await dependencies.getRecord(linkedHash), linkedHash) : null;
  const expired = expiredHash ? ownedRecord(await dependencies.getRecord(expiredHash), expiredHash) : null;
  const mappedUser = candidate.accountId ? await dependencies.accountUser(candidate.accountId) : null;
  if (mappedUser !== null && !validUserId(mappedUser)) throw new PlayValidationError('verification_unavailable', 503);
  const owners = [existing?.user_id, linked?.user_id, expired?.user_id, mappedUser].filter(Boolean);
  const uniqueOwners = [...new Set(owners)];
  if (uniqueOwners.length > 1 || (expectedUserId !== null && uniqueOwners.some(user => user !== expectedUserId))) {
    throw new PlayValidationError('purchase_account_mismatch', 409);
  }
  const userId = expectedUserId || uniqueOwners[0];
  if (!validUserId(userId)) throw new PlayValidationError('purchase_owner_pending', 503);
  if (candidate.accountId !== null) {
    const expectedAccount = await obfuscatedAccountId(userId, config.accountSecret);
    if (candidate.accountId !== expectedAccount && mappedUser !== userId) throw new PlayValidationError('purchase_account_mismatch', 409);
  } else if (!owners.includes(userId)) {
    // A receipt without an obfuscated ID needs an already verified token or Google-linked ownership record.
    throw new PlayValidationError('purchase_account_mismatch', 409);
  }
  const testUser = config.testUserIds.includes(userId);
  // A pending/trial row is not a historic paid subscription. Keep this decision
  // from the pre-verification record even after persistence and an ack requery.
  // Retain the explicit test-account list after QA preparation is paused so a
  // genuine pending test purchase can complete without accepting a non-test QA grant.
  const requiresTestPurchase = testUser && !(existing?.product_verified === true &&
    existing.product_id === config.productId && (existing.ever_paid === true || existing.paid === true));
  if (candidate.testPurchase && !testUser) throw new PlayValidationError('test_purchase_not_allowed', 403);
  if (requiresTestPurchase && !candidate.testPurchase) throw new PlayValidationError('test_purchase_required', 403);
  if (candidate.offerId !== null && candidate.paid && existing?.ever_paid !== true && existing?.paid !== true) {
    // A pending/trial row is not a redemption. The first verified paid observation must
    // atomically consume an issued intent; a retry for the same token is idempotent.
    const redemption = await dependencies.redeemOffer({
      p_user_id: userId, p_product_id: config.productId, p_base_plan_id: candidate.basePlanId,
      p_offer_id: candidate.offerId, p_purchase_token_hash: hash, p_linked_token_hash: linkedHash,
      p_purchase_started_at: new Date(candidate.startedAt).toISOString()
    });
    if (redemption?.ok !== true || redemption.redeemed !== true) throw new PlayValidationError('offer_not_eligible', 403);
  }

  const previousEvent = existing ? timestamp(existing.provider_event_at) : null;
  // API reads have no provider event timestamp. Preserve the last real event (or Google's
  // purchase start), and let verified_at order fresh reads of that same event.
  const eventAt = providerEventTime ?? previousEvent ?? candidate.startedAt ?? observedAt;
  if (!Number.isSafeInteger(eventAt) || eventAt <= 0 || eventAt > dependencies.now() + 300_000) {
    throw new PlayValidationError('invalid_notification');
  }
  const persist = async (snapshot, verificationAt) => {
    const saved = await dependencies.upsert({
      p_user_id: userId, p_provider: 'play', p_external_id: hash, p_product_id: config.productId,
      p_status: snapshot.status, p_paid: snapshot.paid,
      p_expires_at: snapshot.expiresAt === null ? null : new Date(snapshot.expiresAt).toISOString(),
      p_verified_at: new Date(verificationAt).toISOString(), p_provider_event_at: new Date(eventAt).toISOString(),
      p_customer_id: null, p_cancel_at_period_end: snapshot.cancelAtPeriodEnd,
      p_auto_renew: snapshot.autoRenew, p_token_hash: hash,
      // Only a completed, active replacement may supersede the prior entitlement.
      p_replaces_external_id: snapshot.active && linked ? linkedHash : null
    });
    if (saved?.ok !== true) throw new PlayValidationError('entitlement_persistence_unavailable', 503);
    const record = ownedRecord(await dependencies.getRecord(hash), hash);
    if (record === null || record.user_id !== userId) throw new PlayValidationError('entitlement_persistence_unavailable', 503);
    return record;
  };
  let stored = await persist(candidate, observedAt);
  let entitled = candidate.active && activeStoredEntitlement(stored, dependencies.now());
  let acknowledged = candidate.acknowledged;
  if (entitled && !acknowledged) {
    try {
      // Google's recommended order: verify, persist the entitlement, then acknowledge.
      await dependencies.acknowledge(config.productId, purchaseToken);
      acknowledged = true;
    } catch (_) {
      // A timed-out acknowledgement might already have succeeded. Read Play before retrying.
      const refreshedAt = Math.max(dependencies.now(), observedAt + 1);
      const refreshed = inspectSubscription(await dependencies.getSubscription(purchaseToken), config, dependencies.now());
      if (refreshed.accountId !== candidate.accountId || refreshed.productId !== candidate.productId) {
        throw new PlayValidationError('purchase_account_mismatch', 409);
      }
      if (refreshed.testPurchase && !testUser) throw new PlayValidationError('test_purchase_not_allowed', 403);
      if (requiresTestPurchase && !refreshed.testPurchase) throw new PlayValidationError('test_purchase_required', 403);
      // A purchase can expire or be revoked while acknowledgement is in flight.
      // Persist this newer Play observation before returning any entitlement.
      stored = await persist(refreshed, refreshedAt);
      candidate = refreshed;
      entitled = candidate.active && activeStoredEntitlement(stored, dependencies.now());
      acknowledged = candidate.acknowledged;
    }
  }
  const expiresAt = timestamp(stored.expires_at);
  return {
    ok: true, userId, productId: config.productId, purchaseTokenHash: hash,
    basePlanId: candidate.basePlanId, offerId: candidate.offerId, linkedPurchaseTokenHash: linkedHash,
    entitled, acknowledged,
    entitlementExpiresAt: entitled ? expiresAt : null,
    status: entitled ? acknowledged ? 'verified' : 'verification_pending' : candidate.status,
    ...(includeSource ? { verifiedSource: { basePlanId: candidate.basePlanId, status: candidate.status,
      paid: candidate.paid, expiresAt: candidate.expiresAt, inGracePeriod: candidate.inGracePeriod } } : {})
  };
}
