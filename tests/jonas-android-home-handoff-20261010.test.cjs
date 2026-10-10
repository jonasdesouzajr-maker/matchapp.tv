'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('only Jonas-sourced questions trigger automatic spoken answers',()=>{
 const home=read('index.html'),discover=read('discover.js');
 assert.match(home,/<form class="jh-form"[^>]*><input type="hidden" name="from" value="jonas"/);
 assert.match(discover,/await askAndRender\(q, \{voiceOrigin: getQueryParam\('from'\) === 'jonas'\}\)/);
 assert.match(home,/floating-voice-20261010-v5\.js/);
 const voice=read('jonas/floating-voice-20261010-v5.js');
 assert.doesNotMatch(voice,/window\.MATCHAPP_ANDROID\|\|window\.__matchappJonasVoice/);
 assert.match(voice,/matchapp_voice_origin_v1/);
 assert.match(voice,/MatchAppNativeVoice/);
});
test('Android Kids Mode is removed while standalone browser Kids remains intact',()=>{
 const native=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 const web=read('index.html'),css=read('jonas/android-hide-kids-20261010.css');
 assert.match(native,/function stripAndroidKids\(\)/);
 assert.match(native,/if \(isKidsUri\(uri\)\)/);
 assert.doesNotMatch(native,/showAndroidKidsNotice|configureAndroidKidsEntry|openKidsInBrowser\(\)|fun openKidsBrowser\(\)/);
 assert.match(css,/html\.matchapp-ai-android #matchapp-kids-entry/);
 assert.match(css,/grid-column:1 \/ 11!important/);
 assert.match(web,/android-hide-kids-20261010\.css/);
 assert.ok(read('kids/index.html').length>100);
});
