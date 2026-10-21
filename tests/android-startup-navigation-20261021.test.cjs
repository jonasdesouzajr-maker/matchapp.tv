'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
const intro=read('patches/jonas-intro-audio.js');
const state=read('android-studio/app/src/main/assets/native-page-state.js');

test('native launch audio never attaches document click playback, even before native DOM injection',async()=>{
 for(const ua of ['Android MatchAppTVAndroid/1.1.12','Android MatchAppAiAndroid/1.1.55 MatchAppLaunchIntro/1']){
  const dom=new JSDOM('<select><option>Film</option></select><label>Filter</label><summary>Open</summary>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
  try{
   let played=0;Object.defineProperty(dom.window.navigator,'userAgent',{value:ua});
   dom.window.Audio=function(){played++;this.play=()=>Promise.resolve();this.addEventListener=()=>{};this.pause=()=>{};};
   dom.window.eval(intro);
   for(const node of dom.window.document.body.children)node.click();
   await Promise.resolve();assert.equal(played,0);
  }finally{dom.window.close();}
 }
});

test('preserved browser intro has an in-flight latch against two rapid eligible clicks',async()=>{
 const dom=new JSDOM('<label>Filter</label>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 try{
  let played=0;dom.window.Audio=function(){this.play=()=>{played++;return Promise.resolve()};this.addEventListener=()=>{};this.pause=()=>{};};
  dom.window.eval(intro);dom.window.document.querySelector('label').click();dom.window.document.querySelector('label').click();
  await Promise.resolve();assert.equal(played,1);
  assert.equal(dom.window.sessionStorage.getItem('matchapp_intro_audio_session_v1'),'1');
 }finally{dom.window.close();}
});

function pageFixture(){
 const dom=new JSDOM('<html lang="pt-BR"><body><select id="q-platform"><option value="any">Any</option><option value="Netflix">Netflix</option><option value="Max">Max</option></select><input id="login-password" value="private-password"><textarea id="specific-search-input">private prompt</textarea><div id="result">Existing result</div></body></html>',{
  url:'https://matchapp.tv/?lang=pt-BR',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,messages=[],positions=[];
 Object.defineProperty(w.document,'readyState',{value:'complete',configurable:true});
 Object.defineProperty(w.document.documentElement,'scrollHeight',{value:5000,configurable:true});
 w.MatchAppNativePageState={postMessage:s=>messages.push(JSON.parse(s))};
 w.requestAnimationFrame=fn=>fn();w.scrollTo=(x,y)=>positions.push([x,y]);
 let criteria={plat:['Netflix','Max']},applied=0;
 w.getMatchCriteria=()=>criteria;
 w.setMatchCriteria=patch=>{criteria={...criteria,...patch};applied++;};
 w.triggerMatch=()=>{throw Error('State restoration must never generate a match')};
 return {w,messages,positions,dom,criteria:()=>criteria,applied:()=>applied};
}

test('Android page state captures full multiselect choices without passwords, drafts, DOM or tokens',()=>{
 const f=pageFixture();try{
  f.w.eval(state);
  assert.deepEqual(f.messages.at(-1).filters,{'q-platform':['Netflix','Max']});
  assert.equal(f.messages.at(-1).url,'https://matchapp.tv/?lang=pt-BR');
  assert.doesNotMatch(JSON.stringify(f.messages),/private-password|private prompt|Existing result|login-password/);
  assert.deepEqual(Object.keys(f.messages.at(-1)).sort(),['filters','lang','scrollX','scrollY','url','version']);
 }finally{f.dom.window.close();}
});

test('recreation restores allowed filter options and scroll through the existing criteria owner without generating a result',()=>{
 const f=pageFixture();try{
  f.w.__MATCHAPP_NATIVE_RESTORE__={version:1,url:f.w.location.href,filters:{'q-platform':['Max','unlisted'],'login-password':['overwritten']},scrollX:0,scrollY:480};
  f.w.eval(state);
  assert.deepEqual(Array.from(f.criteria().plat),['Max']);
  assert.equal(f.applied(),1);assert.deepEqual(f.positions,[[0,480]]);
  assert.equal(f.w.document.getElementById('login-password').value,'private-password');
  assert.equal(f.w.document.getElementById('result').textContent,'Existing result');
  f.w.eval(state);assert.equal(f.applied(),1,'repeated native injections do not repeat restore');
 }finally{f.dom.window.close();}
});

test('route mismatch and missing native state bridge never apply a foreign state snapshot',()=>{
 const f=pageFixture();try{
  f.w.__MATCHAPP_NATIVE_RESTORE__={version:1,url:'https://matchapp.tv/profile/profile.html',filters:{'q-platform':['Max']}};
  f.w.eval(state);assert.equal(f.applied(),0);
 }finally{f.dom.window.close();}
 const noBridge=new JSDOM('<body></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 try{noBridge.window.eval(state);assert.equal(noBridge.window.MatchAppNativePageCapture,undefined);}finally{noBridge.window.close();}
});

function delayedPageFixture(readyAtStart='loading'){
 const f=pageFixture(),w=f.w,scheduled=new Map();let ready=readyAtStart,height=200,y=0,nextTimer=0;
 Object.defineProperty(w.document,'readyState',{get:()=>ready,configurable:true});
 Object.defineProperty(w.document.documentElement,'scrollHeight',{get:()=>height,configurable:true});
 Object.defineProperty(w,'innerHeight',{value:600,configurable:true});
 Object.defineProperty(w,'scrollY',{get:()=>y,configurable:true});
 w.scrollTo=(x,wanted)=>{y=Math.min(wanted,Math.max(0,height-600));f.positions.push([x,y]);};
 w.setTimeout=fn=>{scheduled.set(++nextTimer,fn);return nextTimer;};w.clearTimeout=id=>scheduled.delete(id);
 w.__MATCHAPP_NATIVE_RESTORE__={version:1,url:w.location.href,filters:{},scrollX:0,scrollY:700};
 return {...f,ready:value=>{ready=value;},height:value=>{height=value;},flush:()=>{const callbacks=[...scheduled.values()];scheduled.clear();callbacks.forEach(fn=>fn());}};
}

test('recreation waits for loaded content before scroll and does not overwrite the saved offset with an early clamp',()=>{
 const f=delayedPageFixture();try{
  f.w.eval(state);f.ready('interactive');f.w.document.dispatchEvent(new f.w.Event('DOMContentLoaded'));
  assert.equal(f.w.MatchAppNativePageCapture.isRestoring(),true);
  assert.deepEqual(f.positions,[]);assert.equal(f.messages.length,0);
  f.height(2200);f.ready('complete');f.w.dispatchEvent(new f.w.Event('load'));
  assert.deepEqual(f.positions,[[0,700]]);assert.equal(f.messages.at(-1).scrollY,700);
  assert.equal(f.w.MatchAppNativePageCapture.isRestoring(),false);
  f.w.eval(state);assert.deepEqual(f.positions,[[0,700]],'page-finished reinjection does not jump a second time');
 }finally{f.dom.window.close();}
});

test('recreation retains pending scroll when history adds height after document load',()=>{
 const f=delayedPageFixture('complete');try{
  f.w.eval(state);assert.deepEqual(f.positions,[]);assert.equal(f.messages.length,0);
  f.height(2200);f.flush();assert.deepEqual(f.positions,[[0,700]]);assert.equal(f.messages.at(-1).scrollY,700);
 }finally{f.dom.window.close();}
});

test('deliberate scroll input or navigation cancels delayed restoration without a later jump',()=>{
 for(const action of ['wheel','pointerdown','keydown','navigation']){
  const f=delayedPageFixture('complete');try{
   f.w.eval(state);
   if(action==='navigation')f.w.history.replaceState(null,'','/how-it-works.html#chapter-2');
   else f.w.document.dispatchEvent(new f.w.Event(action,{bubbles:true}));
   f.height(2200);f.flush();f.w.dispatchEvent(new f.w.Event('load'));f.w.eval(state);
   assert.deepEqual(f.positions,[],action+' takes precedence over the old scroll');
   assert.equal(f.messages.at(-1).scrollY,0,'the cancelled offset is not saved again');
  }finally{f.dom.window.close();}
 }
});

test('native shell disables destructive pull refresh and keeps launcher reentry distinct from explicit links',()=>{
 const source=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 assert.match(source,/refresh\.isEnabled = false/);assert.doesNotMatch(source,/web\.reload\(\)/);
 const start=source.indexOf('override fun onNewIntent'),end=source.indexOf('override fun onPause',start);
 const reentry=source.slice(start,end);
 assert.ok(reentry.indexOf('if (intent.data == null && debugSmokeLaunch(intent) == null) return')<reentry.indexOf('resolveLaunchUrl(intent)'));
 assert.match(source,/web\.saveState\(history\)/);assert.match(source,/web\.restoreState\(state\)/);
 assert.match(source,/view\.postVisualStateCallback/);
 assert.doesNotMatch(source,/web\.post \{ web\.scrollTo\(x, y\) \}/);
 const finished=source.slice(source.indexOf('override fun onPageFinished'),source.indexOf('override fun onReceivedError'));
 assert.match(finished,/restorePendingScroll\(view\)/);
 assert.match(source,/override fun onUserInteraction\(\) \{\s*cancelPendingPageRestore\(\)/);
 assert.match(source,/override fun handleOnBackPressed\(\) \{\s*cancelPendingPageRestore\(\)/);
 assert.match(source,/setOf\("https:\/\/matchapp\.tv", "https:\/\/www\.matchapp\.tv"\)/);
 assert.match(source,/if \(!mainFrame \|\| origin\.scheme != "https"/);
 const permission=source.slice(source.indexOf('private val initialPermissions'),source.indexOf('@SuppressLint("SetJavaScriptEnabled")'));
 assert.match(permission,/ActivityResultContracts\.RequestMultiplePermissions\(\)/);
 assert.doesNotMatch(permission,/startInlineRecognition|getCurrentPosition|requestLocationUpdates/);
});

test('first-run capabilities request only ungranted mic and approximate location without starting either feature',()=>{
 const source=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 const missing=source.slice(source.indexOf('private fun missingStartupPermissions()'),source.indexOf('private fun maybeShowPermissionSetup()'));
 assert.match(missing,/listOf\(Manifest\.permission\.RECORD_AUDIO, Manifest\.permission\.ACCESS_COARSE_LOCATION\)/);
 assert.match(missing,/filter \{ ContextCompat\.checkSelfPermission\(this, it\) != PackageManager\.PERMISSION_GRANTED \}/);
 const setup=source.slice(source.indexOf('private fun maybeShowPermissionSetup()'),source.indexOf('private fun injectAmbientJonas'));
 assert.match(setup,/if \(missingStartupPermissions\(\)\.isEmpty\(\)\)/);
 assert.match(setup,/if \(missing\.isNotEmpty\(\)\) initialPermissions\.launch\(missing\)/);
 assert.doesNotMatch(setup,/startInlineRecognition|getCurrentPosition|requestLocationUpdates/);
 const geolocation=source.slice(source.indexOf('override fun onGeolocationPermissionsShowPrompt'),source.indexOf('override fun onProgressChanged'));
 assert.match(geolocation,/checkSelfPermission\(this@MainActivity, Manifest\.permission\.ACCESS_COARSE_LOCATION\)/);
 assert.match(geolocation,/NativeLaunchPolicy\.canUseApproximateLocation\(origin, web\.url, granted\)/);
 assert.match(geolocation,/callback\.invoke\(origin, allowed, false\)/);
 assert.doesNotMatch(geolocation,/\.launch\(|requestPermissions|startInlineRecognition/);
 const manifest=read('android-studio/app/src/main/AndroidManifest.xml');
 assert.match(manifest,/uses-permission android:name="android\.permission\.ACCESS_COARSE_LOCATION"/);
 assert.doesNotMatch(manifest,/ACCESS_FINE_LOCATION|ACCESS_BACKGROUND_LOCATION|POST_NOTIFICATIONS/);
 assert.match(manifest,/uses-feature android:name="android\.hardware\.location" android:required="false"/);
});

test('all fourteen first-run rationale localizations describe optional voice and approximate location',()=>{
 const locales=['values','values-pt','values-es','values-fr','values-de','values-it','values-tr','values-ru','values-ar','values-hi','values-in','values-ja','values-ko','values-zh'];
 const bodies=new Set();
 for(const locale of locales){
  const dom=new JSDOM(read('android-studio/app/src/main/res/'+locale+'/native_startup.xml'),{contentType:'application/xml'});
  try{
   const doc=dom.window.document;
   for(const key of ['permission_setup_title','permission_setup_body','permission_setup_allow','permission_setup_skip','intro_skip'])assert.ok(doc.querySelector('string[name="'+key+'"]')?.textContent.trim(),locale+' '+key);
   const body=doc.querySelector('string[name="permission_setup_body"]').textContent;
   assert.match(body,/Jonas/);bodies.add(body);
  }finally{dom.window.close();}
 }
 assert.equal(bodies.size,14);
 const english=read('android-studio/app/src/main/res/values/native_startup.xml');
 assert.match(english,/Approximate location helps find nearby cinemas/);
 assert.match(english,/Both permissions are optional/);
 assert.doesNotMatch(english,/only when you tap the microphone/);
});

test('voice entry enforces the upfront choice and OS revocation without a later permission prompt or document reset',()=>{
 const source=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 const voice=source.slice(source.indexOf('private fun startInlineRecognition('),source.indexOf('private fun sendVoiceError('));
 assert.match(voice,/NativeLaunchPolicy\.voicePermissionAction\(\s*ContextCompat\.checkSelfPermission\(this, Manifest\.permission\.RECORD_AUDIO\) == PackageManager\.PERMISSION_GRANTED,\s*startupPrefs\.getBoolean\(PREF_PERMISSION_SETUP, false\)/);
 const denied=voice.slice(voice.indexOf('NativeLaunchPolicy.VoicePermissionAction.DENY ->'),voice.indexOf('NativeLaunchPolicy.VoicePermissionAction.REQUEST ->'));
 assert.match(denied,/microphonePermissionPending = false/);
 assert.match(denied,/sendVoiceError\("permission-denied"\)\s*return/);
 assert.doesNotMatch(denied,/\.launch\(|requestPermissions|startListening|loadUrl|reload|evaluateJavascript/);
 assert.ok(voice.indexOf('VoicePermissionAction.DENY')<voice.indexOf('SpeechRecognizer.createSpeechRecognizer'));
});

test('native recreation compares consumed intents, excludes unsafe history and gates Play replay on its initiating source',()=>{
 const source=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 assert.match(source,/val currentLaunch = launchIntentFingerprint\(intent\)/);
 assert.match(source,/NativeLaunchPolicy\.shouldRestoreSavedScreen\(\s*savedInstanceState\?\.getString\(STATE_LAUNCH_INTENT\), currentLaunch/);
 assert.match(source,/val savedUrl = if \(restoreSavedScreen\)/);
 assert.match(source,/outState\.putString\(STATE_LAUNCH_INTENT, launchIntentFingerprint\(intent\)\)/);
 const save=source.slice(source.indexOf('override fun onSaveInstanceState'),source.indexOf('override fun onWindowFocusChanged'));
 assert.match(save,/web\.copyBackForwardList\(\)/);
 assert.match(save,/NativeLaunchPolicy\.canSaveHistory/);
 assert.match(save,/listOf\(entry\?\.url, entry\?\.originalUrl\)/);
 assert.ok(save.indexOf('if (safeHistory)')<save.indexOf('web.saveState(history)'));
 assert.match(source,/getInstallSourceInfo\(packageName\)\.initiatingPackageName/);
 assert.doesNotMatch(source,/\.installingPackageName|getInstallerPackageName/);
 const permission=source.slice(source.indexOf('private fun maybeShowPermissionSetup()'),source.indexOf('private fun injectAmbientJonas'));
 const callback=permission.slice(permission.indexOf('{ encoded ->'));
 for(const check of ['!hasWindowFocus()', 'introHost != null', 'startupHost != null', 'startupPrefs.getBoolean(PREF_PERMISSION_SETUP, false)', 'web.progress < 100']){
  assert.ok(callback.indexOf(check)>=0&&callback.indexOf(check)<callback.indexOf('dialog.show()'),check);
 }
});

test('process-death fallback is committed before pause and stop, bounded on read and excluded from device backup',()=>{
 const source=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 const pause=source.slice(source.indexOf('override fun onPause()'),source.indexOf('override fun onResume()'));
 assert.ok(pause.indexOf('persistScreenCheckpoint()')<pause.indexOf('web.onPause()'));
 assert.match(pause,/override fun onStop\(\) \{\s*persistScreenCheckpoint\(\)\s*super\.onStop\(\)/);
 const persist=source.slice(source.indexOf('private fun persistScreenCheckpoint()'),source.indexOf('private fun readScreenCheckpoint()'));
 assert.match(persist,/NativeLaunchPolicy\.checkpointUrl\(currentUrl\)/);
 assert.match(persist,/if \(url == null\)\s*\{[\s\S]*?remove\(PREF_SCREEN_CHECKPOINT\)\.commit\(\)/);
 assert.match(persist,/validatedPageState\(pageUiState, currentUrl\)/);
 assert.match(persist,/JSONObject\(it\)\.put\("url", url\)/);
 assert.match(persist,/putString\(PREF_SCREEN_CHECKPOINT, checkpoint\.toString\(\)\)\.commit\(\)/);
 assert.doesNotMatch(persist,/saveState|copyBackForwardList|STATE_WEB|evaluateJavascript|innerHTML|outerHTML/);
 const restore=source.slice(source.indexOf('private fun readScreenCheckpoint()'),source.indexOf('override fun onWindowFocusChanged'));
 assert.match(restore,/raw\.length > 24576/);
 assert.match(restore,/checkpointUrl\(storedUrl\)\?\.takeIf \{ it == storedUrl \}/);
 assert.match(restore,/validatedPageState\(checkpoint\.optString\("ui"\), url\)/);
 assert.match(source,/growthCanRestore = restoredUrl == null && savedInstanceState == null && currentLaunch == null/);
 for(const filename of ['backup_rules.xml','data_extraction_rules.xml']){
  assert.match(read('android-studio/app/src/main/res/xml/'+filename),/<exclude domain="sharedpref" path="matchapp_startup\.xml"\s*\/>/);
 }
});

test('a background capture can cross a fresh document boundary with filters and scroll but no draft or result contents',()=>{
 const before=pageFixture();let disk;
 try{
  Object.defineProperty(before.w,'scrollY',{value:553,configurable:true});
  before.w.eval(state);
  Object.defineProperty(before.w.document,'hidden',{value:true,configurable:true});
  before.w.document.dispatchEvent(new before.w.Event('visibilitychange'));
  disk=JSON.stringify(before.messages.at(-1));
  assert.doesNotMatch(disk,/private-password|private prompt|Existing result|login-password/);
 }finally{before.dom.window.close();}
 const after=pageFixture();try{
  after.w.__MATCHAPP_NATIVE_RESTORE__=JSON.parse(disk);
  after.w.eval(state);
  assert.deepEqual(Array.from(after.criteria().plat),['Netflix','Max']);
  assert.deepEqual(after.positions,[[0,553]]);
  assert.equal(after.applied(),1);
 }finally{after.dom.window.close();}
});

test('native manual update refreshes in place without claiming an APK install or reloading the document',async()=>{
 const dom=new JSDOM('<html><head></head><body><textarea>unsaved</textarea></body></html>',{url:'https://matchapp.tv/profile/profile.html?tab=history',runScripts:'outside-only'});
 try{
  const w=dom.window;Object.defineProperty(w.navigator,'userAgent',{value:'Android MatchAppAiAndroid/1.1.55'});
  w.matchMedia=()=>({matches:false});w.fetch=async()=>({ok:false});
  let refreshed=0;const messages=[];w.showToast=message=>messages.push(message);
  w.MatchAppLocalRefresh={refresh:async()=>{refreshed++;return{refreshed:true,kind:'local-history'}}};
  w.eval(read('app-updates.js'));assert.equal(await w.updateMatchAppNow(),true);
  assert.equal(refreshed,1);assert.equal(w.document.querySelector('textarea').value,'unsaved');
  assert.equal(w.location.href,'https://matchapp.tv/profile/profile.html?tab=history');
  assert.equal(w.localStorage.getItem('match_app_installed_build'),null);
  assert.match(messages[0],/Saved activity refreshed on this device/);assert.match(messages[0],/Google Play/);
  assert.doesNotMatch(messages[0],/latest release|synchroni[sz]|APK installed/);
 }finally{dom.window.close();}
});

test('native unchanged and unavailable refresh actions provide localized visible feedback without changing the screen',async()=>{
 for(const unavailable of [false,true]){
  const dom=new JSDOM('<html lang="en"><head></head><body><textarea>unsaved</textarea></body></html>',{url:'https://matchapp.tv/how-it-works.html',runScripts:'outside-only'});
  try{
   const w=dom.window;Object.defineProperty(w.navigator,'userAgent',{value:'Android MatchAppAiAndroid/1.1.55'});
   w.matchMedia=()=>({matches:false});w.fetch=async()=>({ok:false});w.MATCH_LANG='fr';
   w.MatchAppLocalRefresh={refresh:async()=>{if(unavailable)throw Error('Unavailable');return{refreshed:false,kind:'unchanged'};}};
   w.eval(read('app-updates.js'));assert.equal(await w.updateMatchAppNow(),false);
   const notice=w.document.querySelector('#matchapp-native-refresh-status[role="status"]');
   assert.ok(notice,'feedback remains visible on pages without a global toast helper');
   assert.match(notice.textContent,/Votre écran actuel a été conservé/);assert.match(notice.textContent,/Google Play/);
   assert.equal(notice.textContent.includes('L’actualisation est indisponible.'),unavailable);
   assert.equal(w.document.querySelector('textarea').value,'unsaved');
   assert.equal(w.location.href,'https://matchapp.tv/how-it-works.html');
   assert.equal(w.localStorage.getItem('match_app_installed_build'),null);
  }finally{dom.window.close();}
 }
});
