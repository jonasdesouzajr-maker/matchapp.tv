'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'..','android-studio','app'),main=fs.readFileSync(path.join(base,'src/main/java/com/jonas/papercup/MainActivity.kt'),'utf8');
const activity=fs.readFileSync(path.join(base,'src/main/java/com/jonas/papercup/VoiceAvatarActivity.kt'),'utf8');
const home=fs.readFileSync(path.join(base,'src/main/assets/avatar-ai/home-preview.js'),'utf8');
const session=fs.readFileSync(path.join(base,'src/main/assets/avatar-ai/index.html'),'utf8');
const gradle=fs.readFileSync(path.join(base,'build.gradle.kts'),'utf8');
test('version 44 keeps the production package untouched for Play review later',()=>{
  assert.match(gradle,/applicationId = "com\.jonas\.papercup"/);
  assert.match(gradle,/versionCode = 45/);
  assert.match(gradle,/versionName = "1\.1\.41"/);
  assert.match(gradle,/applicationIdSuffix = "\.debug"/);
});
test('Home preview locally animates without calling metered Realtime services',()=>{
  assert.doesNotThrow(()=>new vm.Script(home,{filename:'home-preview.js'}));
  assert.match(home,/ma-avatar-home/);
  assert.match(home,/maPortraitBreathe/);
  assert.match(home,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(home,/\/v1\/realtime\/calls|OPENAI_API_KEY|new RTCPeerConnection/);
  assert.match(main,/androidAvatarHomeJs/);
  assert.match(main,/isAdultAiDocument\(uri\)/);
});
test('only the Jonas photo is distributed; companion settings remain signed-in',()=>{
  assert.ok(fs.statSync(path.join(base,'src/main/assets/avatar-ai','jonas.jpg')).size>7000);
  assert.equal(fs.existsSync(path.join(base,'src/main/assets/avatar-ai','aureya.jpg')),false);
  assert.match(home,/preferred_ai_avatar/);
  assert.match(home,/matchapp_android_ai_persona_/);
  assert.match(home,/function signup\(\)/);
  assert.match(home,/if\(!getSession\(\)\)\{signup\(\);return\}/);
  assert.match(home,/window\.openAuthModal/);
  assert.match(home,/mic-btn-index/);
});
test('spoken Home prompts retain the normal quota-checked voice result route',()=>{
 const result=main.slice(main.indexOf('private fun sendVoiceResult'),main.indexOf('private fun sendVoiceError'));
 assert.match(result,/matchAppNativeVoiceResult/);
 assert.doesNotMatch(result,/matchappAndroidAvatarHome/);
 assert.match(home,/MatchAppVoiceOrigin/);
 assert.match(home,/function greet/);
});
test('typed input retains text-first Ask AI and opens optional voice chat',()=>{
  assert.match(home,/ma-av-text-to-voice/);
  assert.match(home,/window\.MatchAppNativeVoice/);
  assert.match(home,/window\.supabaseClient\.from\('profiles'\)/);
  assert.match(main,/fun openVoiceAvatarForPersona/);
  assert.doesNotMatch(home,/newDiscoverSearch\(\)/);
});
