const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const links=require('../tools/prepare-android-app-links.cjs');
const EXAMPLE='AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99';
test('assetlinks generator uses adult Play package and rejects incomplete certificates',()=>{
 assert.equal(links.PACKAGE,'com.jonas.papercup');
 assert.throws(()=>links.buildAssetLinks('REPLACE_WITH_PLAY_APP_SIGNING_SHA256'));
 assert.throws(()=>links.buildAssetLinks('66:EB:B2'));
 const doc=JSON.parse(links.buildAssetLinks(EXAMPLE));
 assert.equal(doc[0].target.package_name,links.PACKAGE);
 assert.deepEqual(doc[0].relation,['delegate_permission/common.handle_all_urls']);
 assert.equal(doc[0].target.sha256_cert_fingerprints[0],EXAMPLE);
});
test('adult Android currently routes canonical matching, pricing and profile links',()=>{
 const manifest=read('android-studio/app/src/main/AndroidManifest.xml');
 const activity=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 assert.match(manifest,/android:autoVerify="true"/);
 assert.match(manifest,/android:scheme="https" android:host="matchapp\.tv"/);
 assert.match(activity,/return data\.buildUpon\(\)\.scheme\("https"\)\.build\(\)\.toString\(\)/);
 assert.match(activity,/isKidsUri\(data\)/);
});
test('successful server-verified profile registration queues GTM conversion with no user PII',()=>{
 const js=read('registration-upgrade.js');
 assert.match(js,/sb\.rpc\('complete_registration'/);
 assert.match(js,/if \(error \|\| !response\?\.profile_locked \|\| !response\?\.registration_completed\)/);
 assert.match(js,/existing\?\.profile_locked && existing\?\.registration_completed_at/);
 assert.match(js,/if \(saved\.full_name !== name/);
 assert.match(js,/event:'registration_completed'/);
 assert.ok(js.indexOf("event:'registration_completed'")>js.indexOf("if (saved.full_name !== name"),
   'Only emit conversion after verifying the server-backed identity');
 assert.doesNotMatch(js,/dataLayer\.push\(\{event:'registration_completed'[^\n]*(?:email|user_id|name):/);
});
test('Stripe conversion is emitted only after backend confirms delivered and deduplicated per session',()=>{
 const js=read('purchase.js');
 assert.match(js,/if\(!error&&data\?\.delivered===true\)\{const plan=/);
 assert.match(js,/recordVerifiedPurchase\(sessionId,plan,data\)/);
 assert.match(js,/sessionStorage\.getItem\(key\)==='1'/);
 assert.match(js,/event:'purchase_verified'/);
 assert.doesNotMatch(js,/payload\.value=/);
});
test('production assetlinks is either pending verified fingerprint or matches adult app',t=>{
 const doc=JSON.parse(read('.well-known/assetlinks.json'));
 if(doc?.[0]?.target?.sha256_cert_fingerprints?.[0]==='REPLACE_WITH_PLAY_APP_SIGNING_SHA256'){
  t.diagnostic('PENDING: real Play app-signing SHA-256 has not been provided; production deep-link verification is NOT complete.');
  t.skip('Production assetlinks is an unfinished template; do not treat this as verified.');
  return;
 }
 // The currently hosted file targets a retired package. Fail until fixed.
 assert.equal(doc[0].target.package_name,links.PACKAGE,'Fix stale app package in production assetlinks.json');
 links.normalizeFingerprint(doc[0].target.sha256_cert_fingerprints[0]);
});
