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
const runtime=read('jonas/android-avatar/runtime.js');
const css=read('jonas/android-avatar/experience.css');
const activity=read(app+'java/com/jonas/papercup/VoiceAvatarActivity.kt');
const main=read(app+'java/com/jonas/papercup/MainActivity.kt');
const manifest=read(app+'AndroidManifest.xml');

test('Android-only avatar uses the created circular face, not the real photo',()=>{
 assert.ok(fs.statSync(path.join(root,app,'assets/avatar-ai/created-avatar.jpg')).size>8000);
 assert.match(html,/<canvas id="face"/);
 assert.match(runtime,/img\.src="created-avatar\.jpg"/);
 assert.match(css,/border-radius:50%/);
 assert.doesNotMatch(runtime,/img\.src="jonas\.jpg"/);
 assert.match(html,/https:\/\/matchapp\.tv\/jonas\/android-avatar\/runtime\.js/);
 assert.doesNotMatch(html,/heygen\.ai|liveavatar\.com|elevenlabs/i);
 assert.match(runtime,/mouth/);assert.match(runtime,/blink/);assert.match(runtime,/breath/);
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
 assert.equal(scripts.length,1);
 assert.doesNotThrow(()=>new vm.Script(scripts[0][1],{filename:'avatar-bootstrap.js'}));
 assert.doesNotThrow(()=>new vm.Script(runtime,{filename:'remote-avatar-runtime.js'}));
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
 assert.match(runtime,/getUserMedia/);assert.match(runtime,/pc\.close/);
 assert.match(runtime,/Authorization":"Bearer "\+jwt/);
 assert.match(runtime,/functions\/v1\/private-voice-call/);
});
test('Native launcher does not modify browser, Kids or checkout and stays owner-gated',()=>{
 assert.match(main,/openVoiceAvatar\(\)/);
 assert.match(main,/matchapp-android-avatar-launcher/);
 assert.match(main,/document.getElementById\('matchapp-android-avatar-launcher'\)\?\.remove\(\)/);
 assert.match(fs.readFileSync(path.join(root,'jonas/floating-home-20261010-v3.js'),'utf8'),/ma-jonas-inline/);
 assert.match(main,/localStorage\.getItem\(keys\[i\]\)/);
 assert.match(main,/VoiceAvatarActivity\.EXTRA_TOKEN/);
 assert.match(main,/if\(s&&s\.user&&s\.user\.id&&s\.access_token\)/);
 assert.match(main,/setupNativeVoiceAvatarLauncher/);
 assert.doesNotMatch(main,/if\(!owner\) return;/);
 assert.ok(!fs.existsSync(path.join(root,'avatar-ai')));
});
test('Audio motion uses local amplitudes, is explicitly not phoneme accurate, and honours reduced motion',()=>{
 assert.match(runtime,/getByteTimeDomainData/);
 assert.match(runtime,/speaking/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(html,/not phoneme-accurate lip-sync/i);
 assert.match(runtime,/window\.addEventListener\("pagehide",stop\)/);
 assert.match(runtime,/document\.addEventListener\("visibilitychange"/);
});

test('Editable avatar runtime is first-party HTTPS only with a signed native fallback',()=>{
 assert.match(html,/https:\/\/matchapp\.tv\/jonas\/android-avatar\/runtime\.js/);
 assert.match(html,/https:\/\/matchapp\.tv\/jonas\/android-avatar\/experience\.css/);
 assert.match(html,/matchAppAvatarLoadFailed/);
 assert.match(runtime,/__matchappAvatarPendingToken/);
 assert.match(activity,/WebSettings\.LOAD_NO_CACHE/);
 assert.doesNotMatch(runtime,/SUPABASE_SERVICE_ROLE_KEY|OPENROUTER_API_KEY/);
});
