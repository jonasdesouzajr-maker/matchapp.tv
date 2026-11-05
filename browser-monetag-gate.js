/*
 * MatchApp Ai browser-only Monetag readiness gate, 2026-11-05.
 * PREPARATION ONLY. Not referenced by an HTML page and NEVER injects ad/vendor code.
 * Approval inputs are supplied by a future reviewed integration; they do not
 * themselves establish any legal compliance, safe inventory or valid consent.
 */
(function (root, makeGate) {
  'use strict';
  var gate = makeGate();
  if (typeof module === 'object' && module.exports) module.exports = gate;
  else if (root) Object.defineProperty(root, 'MatchAppMonetagGate', {value: gate});
})(typeof window === 'object' ? window : null, function () {
  'use strict';
  var SITE_ID = '3554856';
  var EXISTING_ZONE = '12152170';
  var PLACEMENTS = Object.freeze(['editorial-after-useful-content', 'editorial-long-page-second']);
  var EVENTS = Object.freeze([
    'ad_request_attempt', 'ad_provider_failure', 'ad_fill_verified',
    'ad_impression_verified', 'match_result_completed', 'match_result_abandoned',
    'reward_start', 'reward_completion_verified'
  ]);
  var PROTECTED = /(?:^|\/)(?:kids|account|accounts|auth|login|signup|register|profile|settings|billing|checkout|purchase|payment|pricing|support|contact|chat|jonas|ask-ai|discover|oauth|callback|friends|match-together|privacy|privacidade|cookies|terms|copyright|founder|lumina-match)(?:\/|\.|$)/i;
  var NATIVE_UA = /MatchAppTVAndroid|MatchAppKidsAndroid|\bwv\b|;\s*wv\)/i;

  function pathFrom(value) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/invalid';
    var decoded;
    try { decoded = decodeURIComponent(value.split(/[?#]/, 1)[0]); } catch (_) { return '/invalid'; }
    decoded = decoded.replace(/\/{2,}/g, '/').toLowerCase();
    return /(?:^|\/)\.\.(?:\/|$)/.test(decoded) ? '/invalid' : decoded;
  }
  function deny(why, reason) { if (!why.includes(reason)) why.push(reason); }
  function assess(input) {
    input = input || {};
    var flags = input.flags || {};
    var account = input.account || {};
    var consent = input.consent || {};
    var zone = input.zone || {};
    var approvals = input.approvals || {};
    var surface = input.surface || {};
    var frequency = input.frequency || {};
    var why = [];
    var path = pathFrom(surface.pathname);

    // Default: OFF. No script loader or provider URL exists in this module.
    if (flags.browserMonetagEnabled !== true) deny(why, 'feature_flag_off');
    if (flags.killSwitch !== false) deny(why, 'kill_switch_on');
    if (String(zone.siteId || '') !== SITE_ID || String(zone.zoneId || '') !== EXISTING_ZONE) deny(why, 'unverified_zone');
    if (zone.format !== 'in_page_push' || !PLACEMENTS.includes(zone.placement)) deny(why, 'unsupported_placement');
    if (approvals.writtenCreativeAndDestinationExclusions !== true ||
        approvals.siteAndZoneCoverageVerified !== true ||
        approvals.providerControlledPositionVerified !== true ||
        approvals.relevantTermsReviewed !== true) deny(why, 'provider_approval_missing');
    if (approvals.commercialRightsForPageVerified !== true) deny(why, 'rights_clearance_missing');
    if (approvals.consentIntegrationReviewed !== true) deny(why, 'consent_integration_unverified');

    // Global conservative rule: explicitly validated vendor consent everywhere.
    // The prior Google CMP/Consent Mode defaults are NOT Monetag consent.
    if (consent.vendor !== 'monetag' || consent.choice !== 'accept' ||
        consent.validatedForVendor !== true || consent.withdrawn === true ||
        consent.revocationAvailable !== true) deny(why, 'monetag_consent_missing');

    if (path === '/invalid' || PROTECTED.test(path) || surface.kidsMode === true ||
        surface.protectedView === true || surface.dialogOpen === true ||
        surface.matchInProgress === true) deny(why, 'protected_surface');
    if (NATIVE_UA.test(String(surface.userAgent || '')) || surface.nativeWebView !== false ||
        surface.ordinaryBrowserVerified !== true) deny(why, 'browser_context_unverified');
    if (account.entitlementsResolved !== true || account.isAdFree !== false) deny(why, 'entitlement_unverified');
    if (surface.originalContentRightsChecked !== true) deny(why, 'content_rights_unverified');

    // Candidate caps only; provider must separately confirm it can enforce them.
    if (frequency.pageShown !== 0 ||
        !Number.isFinite(frequency.sessionShown) || frequency.sessionShown >= 2 || frequency.sessionShown < 0 ||
        !Number.isFinite(frequency.secondsSinceLast) || frequency.secondsSinceLast < 720 ||
        frequency.providerCapVerified !== true) deny(why, 'frequency_cap_unverified');
    return Object.freeze({eligible: why.length === 0, reasons: Object.freeze(why), path: path});
  }

  // Strictly aggregate event *classification*, not a network logger. Do not send
  // URLs, prompts, identity, revenue, or an ad "impression" inferred from a click.
  function sanitizedEvent(input) {
    if (!input || !EVENTS.includes(input.event)) return null;
    if (['ad_fill_verified', 'ad_impression_verified', 'reward_completion_verified'].includes(input.event)
        && input.providerVerified !== true) return null;
    if (input.event === 'reward_completion_verified' && input.serverCreditVerified !== true) return null;
    var placement = PLACEMENTS.includes(input.placement) ? input.placement : 'none';
    var outcome = ['ok', 'blocked', 'no_fill', 'error', 'timeout', 'cancelled'].includes(input.outcome)
      ? input.outcome : 'unspecified';
    return Object.freeze({event: input.event, placement: placement, outcome: outcome});
  }
  return Object.freeze({
    siteId: SITE_ID,
    existingZoneId: EXISTING_ZONE,
    placements: PLACEMENTS,
    assess: assess,
    sanitizedEvent: sanitizedEvent
  });
});
