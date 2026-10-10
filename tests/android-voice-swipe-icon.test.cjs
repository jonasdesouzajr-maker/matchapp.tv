'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),main=fs.readFileSync(path.join(root,'android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt'),'utf8');
const base=path.join(root,'android-studio/app/src/main/res');
function dims(file){const buf=fs.readFileSync(file);assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');return [buf.readUInt32BE(16),buf.readUInt32BE(20)];}
test('Jonas AI is a circular created face that stays on screen while scrolling',()=>{
 assert.match(main,/function setupNativeVoiceAvatarLauncher\(\)/);
 assert.match(main,/Jonas UI is loaded from matchapp.tv home/);
 assert.ok(fs.existsSync(path.join(root,'jonas/floating-home-20261010-v3.js')));
 assert.match(main,/border-radius:50%/);
 assert.match(main,/openVoiceAvatar\(\)/);
 assert.match(main,/setupNativeVoiceAvatarLauncher\(\)/);
 assert.doesNotMatch(main,/if\(!owner\) return;/);
 assert.match(main,/if \(token\.length !in 100\.\.6000\)/);
 assert.match(main,/VoiceAvatarActivity\.EXTRA_TOKEN, token/);
 assert.match(main,/isMatchAppHost\(page\.host\.orEmpty\(\)\) \|\| isKidsUri\(page\)/);
 assert.match(main,/!chooseJonasVoice\(engine, locale\)/);
 assert.match(main,/val eligible = engine\.voices\.orEmpty\(\)/);
 assert.match(main,/filterNot \{ femaleOrUnknownGender\.containsMatchIn/);
 assert.doesNotMatch(main,/engine\.setPitch\(0\.78f\)|engine\.setPitch\(0\.88f\)|engine\.language = locale/);
});
test('Voice final transcript automatically triggers the existing Ask AI pipeline once',()=>{
 assert.match(main,/matchapp:voice-transcript/);
 assert.match(main,/data\.inputId==='discover-new-input'/);
 assert.match(main,/String\(field\.value\|\|''\)\.trim\(\)!==value/);
 assert.match(main,/window\.newDiscoverSearch\(\)/);
 assert.match(main,/pendingVoiceUtterance = value to languageTag/);
 assert.match(main,/speechPlayer\.__humanPatched/);
 assert.match(main,/window\.readAloud=speechPlayer\.__original/);
 assert.match(main,/window\.MatchAppNativeVoice\.speak/);
 assert.match(main,/if \(pending != null\) speakVoiceText\(pending\.first, pending\.second\)/);
 assert.match(main,/pendingVoiceUtterance = null/);
 assert.match(main,/data\.inputId==='specific-search-input'/);
 assert.match(main,/\.gold-btn'\)\?\.click\(\)/);
 const website=fs.readFileSync(path.join(root,'voice-input.js'),'utf8');
 assert.match(website,/markVoiceOrigin\(inputId,transcript\)/);
 assert.match(website,/if\(onFinalTranscript\)onFinalTranscript\(transcript\)/);
});
test('Top Titles drag is Android-only, two-way, tap-safe, and preserves vertical page movement',()=>{
 assert.match(main,/installAndroidInteractionRecovery/);
 assert.match(main,/document\.getElementById\('marquee-viewport'\)/);
 assert.match(main,/touchmove/);
 assert.match(main,/start\.scroll\+dx/);
 assert.match(main,/Math\.abs\(dx\)<=Math\.abs\(dy\)\*1\.18/);
 assert.match(main,/touch-action','pan-y'/);
 assert.match(main,/passive:false/);
 assert.match(main,/e\.stopImmediatePropagation\(\)/);
 assert.match(main,/vp\.__railHold\?\.\(\)/);
});
test('Every adult launcher size is padded, the startup mark is circular and Kids icons are unmodified',()=>{
 assert.match(main,/setImageResource\(R\.drawable\.ic_launcher_foreground\)/);
 assert.doesNotMatch(main,/setImageResource\(R\.drawable\.matchapp_official_icon\)/);
 assert.deepEqual(dims(path.join(base,'drawable/ic_launcher_foreground.png')),[512,512]);
 const sizes={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
 for(const [dpi,size] of Object.entries(sizes)){
   assert.deepEqual(dims(path.join(base,'mipmap-'+dpi,'ic_launcher.png')),[size,size]);
   assert.deepEqual(dims(path.join(base,'mipmap-'+dpi,'ic_launcher_round.png')),[size,size]);
 }
 const theme=fs.readFileSync(path.join(base,'values/themes.xml'),'utf8');
 assert.match(theme,/windowSplashScreenAnimatedIcon.*launch_empty/);
 assert.match(main,/R\.raw\.matchapp_launch_intro/);
});
