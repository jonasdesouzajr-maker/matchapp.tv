'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Android adaptive launcher references the approved premium icon with mask-safe inset',()=>{
 const adaptive=read('android-studio/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml');
 const fg=read('android-studio/app/src/main/res/drawable/matchapp_launcher_safe.xml');
 assert.match(adaptive,/matchapp_launcher_safe/);
 assert.match(fg,/matchapp_launcher_premium/);
 assert.match(fg,/android:inset="6%"/);
 assert.ok(fs.statSync(path.join(root,'android-studio/app/src/main/res/drawable/matchapp_launcher_premium.webp')).size>10000);
});
test('One live Android Jonas assistant greets directly and drags with GPU transforms',()=>{
 const js=read('jonas/android-ambient-assistant-20261011.js');
 assert.match(js,/requestAnimationFrame\(flushDrag\)/);
 assert.match(js,/translate3d\(/);
 assert.match(js,/bubble\.setPointerCapture/);
 assert.ok(js.indexOf('// Start the local TTS immediately')<js.indexOf('createFrame(activeTitle);frame.dataset.title=activeTitle'));
 assert.match(js,/function listen\(/);
 assert.match(js,/\['Result','Partial','Error'\]/);
});
test('Jonas face blends only mouth layers, and text mode remains still',()=>{
 const js=read('jonas/discovery-avatar-stage-20261010.js');
 const css=read('jonas/discovery-avatar-stage-20261010.css');
 assert.match(js,/jds-mouth-next/);
 assert.match(js,/const next=frontMouth===mouth/);
 assert.match(js,/el\.dataset\.state!=='speaking'/);
 assert.match(css,/speech-only continuity/);
 assert.match(css,/transition:opacity 130ms/);
});
test('Android composer has scoped premium styling without replacing controls',()=>{
 const css=read('jonas/android-premium-composer-20261012.css');
 const html=read('discover.html');
 assert.match(css,/\.matchapp-ai-android/);
 assert.match(css,/\.matchapp-ambient-frame/);
 assert.match(css,/#mic-btn-discover/);
 assert.match(css,/\.composer-send/);
 assert.match(html,/android-premium-composer-20261012\.css/);
 assert.match(html,/newDiscoverSearch\(/);
});
test('Top Titles uses velocity-responsive continuation only in Android',()=>{
 const js=read('app.js');
 assert.match(js,/const ANDROID_KINETIC=\/MatchAppAiAndroid\\\//);
 assert.match(js,/kineticSpeed\*dt/);
 assert.match(js,/drag\.speed/);
 assert.match(js,/const MARQUEE_AUTO_MS=4200/);
});

test('Android voice timing drives stable Jonas speech-only mouth animation',()=>{
 const native=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 const ambient=read('jonas/android-ambient-assistant-20261011.js');
 const css=read('jonas/android-ambient-assistant-20261011.css');
 assert.match(native,/override fun onRangeStart\(/);
 assert.match(native,/sendVoiceWordRange\(/);
 assert.match(native,/JSONObject\.quote\(fragment\)/);
 assert.match(ambient,/matchAppNativeSpeechWord/);
 assert.match(ambient,/ja-mouth-a/);
 assert.match(ambient,/ja-mouth-b/);
 assert.match(ambient,/function faceSpeech\(/);
 assert.match(css,/\[data-speaking="1"\]/);
 assert.match(css,/ja-natural-breathe/);
});
