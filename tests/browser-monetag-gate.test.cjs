'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const gate = require('../browser-monetag-gate.js');

function reviewed() {
  return {
    flags: { browserMonetagEnabled: true, killSwitch: false },
    zone: { siteId: '3554856', zoneId: '12152170', format: 'in_page_push', placement: 'editorial-after-useful-content' },
    approvals: { writtenCreativeAndDestinationExclusions: true, siteAndZoneCoverageVerified: true,
      providerControlledPositionVerified: true, relevantTermsReviewed: true,
      commercialRightsForPageVerified: true, consentIntegrationReviewed: true },
    consent: { vendor: 'monetag', choice: 'accept', validatedForVendor: true, withdrawn: false, revocationAvailable: true },
    account: { entitlementsResolved: true, isAdFree: false },
    surface: { pathname: '/original-guide.html', kidsMode: false, nativeWebView: false,
      ordinaryBrowserVerified: true, originalContentRightsChecked: true },
    frequency: { pageShown: 0, sessionShown: 0, secondsSinceLast: 1800, providerCapVerified: true }
  };
}

test('default-off, kill switch and unverified ad-free state fail closed', () => {
  assert.equal(gate.assess({}).eligible, false);
  const c = reviewed(); delete c.flags.browserMonetagEnabled;
  assert.ok(gate.assess(c).reasons.includes('feature_flag_off'));
  c.flags.browserMonetagEnabled = true; c.flags.killSwitch = true;
  assert.ok(gate.assess(c).reasons.includes('kill_switch_on'));
  c.flags.killSwitch = false; delete c.account.entitlementsResolved;
  assert.ok(gate.assess(c).reasons.includes('entitlement_unverified'));
});

test('future reviewed eligible fixture is not an ad loader', () => {
  assert.equal(gate.assess(reviewed()).eligible, true);
  assert.equal(typeof gate.loadVendorScript, 'undefined');
  assert.equal(typeof gate.grantReward, 'undefined');
});

test('no ad without written creative and landing-page exclusions', () => {
  for (const key of ['writtenCreativeAndDestinationExclusions', 'siteAndZoneCoverageVerified', 'providerControlledPositionVerified', 'relevantTermsReviewed']) {
    const c = reviewed(); c.approvals[key] = false;
    assert.ok(gate.assess(c).reasons.includes('provider_approval_missing'), key);
  }
});

test('no ad on Kids, private, protected or native surfaces', () => {
  for (const pathname of ['/kids/', '/kids/index.html', '/profile', '/discover.html', '/contact.html', '/billing/', '/oauth/consent.html', '/match-together/', '/privacy.html', '/lumina-match/', '/jonas.html', '/%6Bids/']) {
    const c = reviewed(); c.surface.pathname = pathname;
    assert.ok(gate.assess(c).reasons.includes('protected_surface'), pathname);
  }
  for (const field of ['kidsMode', 'dialogOpen', 'matchInProgress', 'protectedView']) {
    const c = reviewed(); c.surface[field] = true;
    assert.ok(gate.assess(c).reasons.includes('protected_surface'), field);
  }
  for (const ua of ['MatchAppTVAndroid/1.1', 'Mozilla/5.0 (Linux; Android 15; wv)']) {
    const c = reviewed(); c.surface.userAgent = ua;
    assert.ok(gate.assess(c).reasons.includes('browser_context_unverified'), ua);
  }
  const c = reviewed(); delete c.surface.nativeWebView;
  assert.ok(gate.assess(c).reasons.includes('browser_context_unverified'));
});

test('no ads on refused/withdrawn/Google-only consent', () => {
  for (const patch of [
    {choice: 'reject'}, {choice: 'accept', validatedForVendor: false},
    {vendor: 'google'}, {withdrawn: true}, {revocationAvailable: false}
  ]) {
    const c = reviewed(); Object.assign(c.consent, patch);
    assert.ok(gate.assess(c).reasons.includes('monetag_consent_missing'), JSON.stringify(patch));
  }
});

test('reject unsupported zones, formats, rights claims and rapid repeated serving', () => {
  for (const patch of [{zoneId: '12151861'}, {format: 'multitag'}, {placement: 'match-before-result'}]) {
    const c = reviewed(); Object.assign(c.zone, patch);
    assert.equal(gate.assess(c).eligible, false, JSON.stringify(patch));
  }
  const rights = reviewed(); rights.approvals.commercialRightsForPageVerified = false;
  assert.ok(gate.assess(rights).reasons.includes('rights_clearance_missing'));
  const cap = reviewed(); cap.frequency.sessionShown = 2;
  assert.ok(gate.assess(cap).reasons.includes('frequency_cap_unverified'));
  cap.frequency.sessionShown = 0; cap.frequency.secondsSinceLast = 60;
  assert.ok(gate.assess(cap).reasons.includes('frequency_cap_unverified'));
  const refusal = reviewed(); refusal.account.isAdFree = true;
  assert.ok(gate.assess(refusal).reasons.includes('entitlement_unverified'));
});

test('analytics classification strips prompts, URLs, IDs and unverified impressions', () => {
  assert.equal(gate.sanitizedEvent({event:'ad_impression_verified', providerVerified:false}), null);
  assert.equal(gate.sanitizedEvent({event:'reward_completion_verified', providerVerified:true}), null);
  assert.deepEqual(gate.sanitizedEvent({event:'ad_provider_failure', placement:'editorial-after-useful-content',
    outcome:'error', userPrompt:'private', email:'secret@example.com', url:'https://example.com/private', revenue:400}),
    {event:'ad_provider_failure', placement:'editorial-after-useful-content', outcome:'error'});
});
