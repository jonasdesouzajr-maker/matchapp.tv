'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const nativePath = 'android-studio/app/src/main/java/com/jonas/papercup/';

test('native ad diagnostics expose request and denial state without account or claim material', () => {
  const news = read(nativePath + 'NativeNewsBridge.kt');
  const rewarded = read(nativePath + 'NativeRewardedBridge.kt');
  for (const [name, source] of [['native', news], ['rewarded', rewarded]]) {
    assert.ok(source.includes(`"${name} requestAd debug=\${BuildConfig.DEBUG}"`));
    assert.ok(source.includes(`"${name} state=$status reason=$reason"`));
    for (const log of source.matchAll(/android\.util\.Log\.[iew]\([^\n]+/g)) {
      assert.doesNotMatch(log[0], /accountContext|valueAccount|accessToken|nonce|requestId|\.url|userId|adUnitId|\.message/);
    }
  }
  assert.match(news, /if \(!eligible\(value\) \|\| loadAttempted\) return/);
  for (const reason of ['account_unknown', 'first_value_required', 'activity_not_foreground', 'webview_not_visible', 'consent_or_entitlement']) {
    assert.ok(news.includes('"' + reason + '"'), reason);
  }
  assert.match(rewarded, /Only SSV can grant the three tokens/);
  assert.match(rewarded, /\.put\("serverVerified", false\)/);
});

test('debug native news and rewarded requests retain Google sample units', () => {
  const gradle = read('android-studio/app/build.gradle.kts');
  const debug = gradle.split('debug {')[1].split('\n        }')[0];
  assert.ok(debug.includes('ca-app-pub-3940256099942544/2247696110'));
  assert.ok(debug.includes('ca-app-pub-3940256099942544/5224354917'));
  assert.doesNotMatch(debug, /ca-app-pub-9541435081010948/);
});
