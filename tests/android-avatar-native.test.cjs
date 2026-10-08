'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app='android-studio/app/src/main/';
const html=read(app+'assets/avatar-ai/index.html');
const activity=read(app+'java/com/jonas/papercup/VoiceAvatarActivity.kt');
const main=read(app+'java/com/jonas/papercup/MainActivity.kt');
const manifest=read(app+'AndroidManifest.xml');

test('Android-only avatar is bundled with a real Jonas photo and no remote animation provider',()=>{
 assert.ok(fs.statSync(path.join(root,app,'assets/avatar-ai/jonas.jpg')).size>20000);
 assert.match(html,/<canvas id="face"/);
 assert.match(html,/img\.src="jonas\.jpg"/);
 assert.doesNotMatch(html,/<script[^>]+src=/i);
 assert.doesNotMatch(html,/heygen\.ai|liveavatar\.com|elevenlabs/i);
 assert.match(html,/mouth/);assert.match(html,/blink/);assert.match(html,/breath/);
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
 assert.equal(scripts.length,1);
 assert.doesNotThrow(()=>new vm.Script(scripts[0][1],{filename:'voice-avatar-index.js'}));
});
test('Android asset origin, backend JWT, microphone permission and call stop are protected',()=>{
 assert.match(manifest,/android\.permission\.RECORD_AUDIO/);
 assert.match(manifest,/<activity\s+android:name="\.VoiceAvatarActivity"\s+android:exported="false"/);
 assert.match(activity,/WebViewAssetLoader\.Builder/);
 assert.match(activity,/https:\/\/appassets\.androidplatform\.net\/assets\/avatar-ai\/index\.html/);
 assert.match(activity,/settings\.allowFileAccess = false/);
 assert.match(activity,/Manifest\.permission\.RECORD_AUDIO/);
 assert.match(activity,/PermissionRequest\.RESOURCE_AUDIO_CAPTURE/);
 assert.match(activity,/override fun onStop\(\)/);
 assert.match(html,/getUserMedia/);assert.match(html,/pc\.close/);
 assert.match(html,/Authorization":"Bearer "\+jwt/);
 assert.match(html,/functions\/v1\/private-voice-call/);
});
test('Native launcher does not modify browser, Kids or checkout and stays owner-gated',()=>{
 assert.match(main,/openVoiceAvatar\(\)/);
 assert.match(main,/matchapp-android-avatar-launcher/);
 assert.match(main,/MatchAppNativeExperience\.openVoiceAvatar/);
 assert.match(main,/localStorage\.getItem\(keys\[i\]\)/);
 assert.match(main,/VoiceAvatarActivity\.EXTRA_TOKEN/);
 assert.match(main,/if\(s&&s\.user&&s\.user\.id&&s\.access_token\)/);
 assert.match(main,/setupNativeVoiceAvatarLauncher/);
 assert.doesNotMatch(main,/if\(!owner\) return;/);
 assert.ok(!fs.existsSync(path.join(root,'avatar-ai')));
});
test('Audio motion uses local amplitudes, is explicitly not phoneme accurate, and honours reduced motion',()=>{
 assert.match(html,/getByteTimeDomainData/);
 assert.match(html,/speaking/);
 assert.match(html,/prefers-reduced-motion:reduce/);
 assert.match(html,/not phoneme-accurate lip-sync/i);
 assert.match(html,/window\.addEventListener\("pagehide",stop\)/);
 assert.match(html,/document\.addEventListener\("visibilitychange"/);
});
