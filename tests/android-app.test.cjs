const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('Android web shell stays ad-free and does not bounce into Chrome',()=>{
 const init=read('ads-init.js'),chrome=read('chrome-launcher.js'),main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 assert.match(init,/MatchAppTVAndroid/);assert.match(init,/MATCHAPP_IS_AD_FREE/);
 assert.match(chrome,/function inAndroidApp/);assert.match(chrome,/if\(inAndroidApp\(\)\)return;/);
 assert.match(main,/MATCHAPP_IS_AD_FREE/);
});
test('both Android modules target API 36 and preserve route separation',()=>{
 const mainG=read('android-studio/app/build.gradle.kts'),kidsG=read('android-studio/kidsapp/build.gradle.kts');
 const main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt'),kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
 for(const g of [mainG,kidsG]){assert.match(g,/compileSdk = 36/);assert.match(g,/targetSdk = 36/);assert.match(g,/versionCode = \d+/);assert.match(g,/versionName = "\d+\.\d+\.\d+"/);}
 assert.match(main,/https:\/\/matchapp\.tv\//);assert.match(kids,/https:\/\/matchapp\.tv\/kids\//);assert.match(main,/MATCHAPP_ANDROID_KIDS_BLOCKED/);assert.match(kids,/MATCHAPP_ANDROID_KIDS_ONLY/);
});
test('main Android launcher uses official icon and consent-safe production native AdMob',()=>{
 const manifest=read('android-studio/app/src/main/AndroidManifest.xml'),debugManifest=read('android-studio/app/src/debug/AndroidManifest.xml'),gradle=read('android-studio/app/build.gradle.kts'),admob=read('android-studio/app/src/main/java/com/jonas/papercup/AdMobController.kt'),main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt'),appAds=read('app-ads.txt'),launcher=read('android-studio/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml');
 assert.match(manifest,/MobileAdsInitProvider/);assert.match(manifest,/tools:node="remove"/);assert.match(manifest,/ca-app-pub-9541435081010948~6998171073/);assert.doesNotMatch(manifest,/ca-app-pub-3940256099942544~3347511713/);
 assert.match(debugManifest,/ca-app-pub-3940256099942544~3347511713/);assert.match(debugManifest,/tools:replace="android:value"/);assert.match(gradle,/play-services-ads:25\.5\.0/);assert.match(gradle,/user-messaging-platform:4\.0\.0/);
 assert.match(gradle,/ADMOB_ENABLED", "true"/);assert.match(gradle,/ca-app-pub-9541435081010948\/4843348278/);assert.match(gradle,/ca-app-pub-3940256099942544\/9214589741/);
 assert.equal(appAds.trim(),'google.com, pub-9541435081010948, DIRECT, f08c47fec0942fa0');
 for(const marker of ['requestConsentInfoUpdate','loadAndShowConsentFormIfRequired','canRequestAds','showPrivacyOptionsForm','MobileAds.initialize','getCurrentOrientationAnchoredAdaptiveBannerAdSize','fun setAdFree(adFree: Boolean)'])assert.match(admob,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 for(const marker of ['setAdFree(adFree: Boolean)','syncNativeAdEntitlement','is_vip,is_business,is_ad_free'])assert.match(main,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(launcher,/@drawable\/matchapp_launcher_safe/);
 const safe=read('android-studio/app/src/main/res/drawable/matchapp_launcher_safe.xml');
 assert.match(safe,/@drawable\/ic_launcher_foreground/);assert.match(safe,/android:inset="0%"/);
});


test('Android apps expose a same-origin native speech recognizer bridge',()=>{
 const main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 const kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
 const mainManifest=read('android-studio/app/src/main/AndroidManifest.xml');
 const kidsManifest=read('android-studio/kidsapp/src/main/AndroidManifest.xml');
 for(const manifest of [mainManifest,kidsManifest]) assert.match(manifest,/android\.speech\.action\.RECOGNIZE_SPEECH/);
 for(const src of [main,kids]){
   assert.match(src,/RecognizerIntent\.ACTION_RECOGNIZE_SPEECH/);
   assert.match(src,/addJavascriptInterface\(NativeVoiceBridge\(\), "MatchAppNativeVoice"\)/);
   assert.match(src,/matchAppNativeVoiceResult/);
   assert.match(src,/matchAppNativeVoiceError/);
   assert.match(src,/@JavascriptInterface/);
 }
 assert.match(main,/isMatchAppHost\(current\.host\.orEmpty\(\)\)/);
 assert.match(kids,/isAllowedKidsUrl\(web\.url\)/);
});


test('Kids Android app gives Lumi a native text-to-speech bridge while preserving browser fallback',()=>{
 const kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
 const gradle=read('android-studio/kidsapp/build.gradle.kts');
 const immersive=read('kids/immersive.js');
 assert.match(kids,/TextToSpeech/);
 assert.match(kids,/UtteranceProgressListener/);
 assert.match(kids,/fun speak\(text: String\?, languageTag: String\?\)/);
 assert.match(kids,/fun stopSpeaking\(\)/);
 assert.match(kids,/matchAppNativeLumiState/);
 assert.match(kids,/setSpeechRate\(1\.12f\)/);
 assert.match(kids,/setPitch\(1\.24f\)/);
 assert.match(immersive,/utter\.rate=1\.12/);
 assert.match(immersive,/utter\.pitch=1\.24/);
 assert.match(gradle,/versionCode = 29/);
 assert.match(gradle,/versionName = "1\.1\.27"/);
 assert.match(immersive,/MatchAppNativeVoice\?\.speak/);
 assert.match(immersive,/SpeechSynthesisUtterance/);
 assert.match(immersive,/matchAppNativeLumiState/);
});

test('Kids Android app exposes native biometric guardian bridge while main app stays Kids-free',()=>{
 const main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 const kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
 const mainManifest=read('android-studio/app/src/main/AndroidManifest.xml');
 const kidsManifest=read('android-studio/kidsapp/src/main/AndroidManifest.xml');
 const mainGradle=read('android-studio/app/build.gradle.kts');
 const kidsGradle=read('android-studio/kidsapp/build.gradle.kts');
 assert.doesNotMatch(main,/MatchAppNativeGuardian/);
 assert.doesNotMatch(mainManifest,/USE_BIOMETRIC/);
 assert.doesNotMatch(mainGradle,/androidx\.biometric/);
 assert.match(kids,/addJavascriptInterface\(NativeGuardianBridge\(\), "MatchAppNativeGuardian"\)/);
 assert.match(kids,/BiometricPrompt/);
 assert.match(kids,/matchAppNativeGuardianResult/);
 assert.match(kids,/openGrownUp/);
 assert.match(kidsManifest,/USE_BIOMETRIC/);
 assert.match(kidsGradle,/androidx\.biometric:biometric:1\.1\.0/);
});

test('hosted emulator transport loss is separated from app failure after deterministic render proof',()=>{
 const smoke=read('tools/android-emulator-smoke.sh');
 assert.match(smoke,/adb_reconnect\(\) \{/);
 assert.match(smoke,/Hosted emulator ADB transport unavailable; no native-app crash is established/);
 assert.match(smoke,/native Activity is RESUMED, process alive, screenshot rendered, and exact WebView route loaded/);
 assert.match(smoke,/local-mirror\.log/);
 assert.match(smoke,/GET \$smoke_path/);
 assert.match(smoke,/hosted ADB closed after verified native render; swipe result unavailable/);
 assert.match(smoke,/process exited while emulator transport remained healthy/);
 assert.doesNotMatch(smoke,/rm -f "artifacts\/android-emulator\/\$name-window\.xml"/);
 assert.doesNotMatch(smoke,/remains offline after bounded retry; no verified online WebView/);
});


test('hosted Android emulator uses a debug-only localhost mirror while release networking stays strict',()=>{
 const main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 const kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
 const mainManifest=read('android-studio/app/src/main/AndroidManifest.xml');
 const kidsManifest=read('android-studio/kidsapp/src/main/AndroidManifest.xml');
 const mainDebug=read('android-studio/app/src/debug/AndroidManifest.xml');
 const kidsDebug=read('android-studio/kidsapp/src/debug/AndroidManifest.xml');
 const smoke=read('tools/android-emulator-smoke.sh');
 for(const src of [main,kids]){
  assert.match(src,/BuildConfig\.DEBUG/);
  assert.match(src,/matchapp_smoke_url/);
  assert.match(src,/127\.0\.0\.1/);
  assert.match(src,/localhost/);
 }
 assert.match(kids,/path == "\/kids" \|\| path\.startsWith\("\/kids\/"\)/);
 for(const manifest of [mainManifest,kidsManifest]){
  assert.match(manifest,/android:usesCleartextTraffic="false"/);
  assert.match(manifest,/@xml\/network_security_config/);
 }
 for(const manifest of [mainDebug,kidsDebug]){
  assert.match(manifest,/android:usesCleartextTraffic="true"/);
  assert.match(manifest,/@xml\/network_security_config_debug/);
 }
 for(const p of ['android-studio/app/src/debug/res/xml/network_security_config_debug.xml','android-studio/kidsapp/src/debug/res/xml/network_security_config_debug.xml'])
  assert.match(read(p),/cleartextTrafficPermitted="true"/);
 assert.match(smoke,/python3 -m http\.server/);
 assert.match(smoke,/adb reverse "tcp:\$SMOKE_PORT" "tcp:\$SMOKE_PORT"/);
 assert.match(smoke,/--es matchapp_smoke_url/);
 assert.match(smoke,/\/kids\/\?native_emulator_smoke=1/);
});


test('native hosted smoke isolates adult and Kids emulators and does not fail a proven render on ADB transport loss',()=>{
 const smoke=read('tools/android-emulator-smoke.sh');
 const flow=read('.github/workflows/release-smoke.yml');
 assert.match(flow,/target: adult/);
 assert.match(flow,/target: kids/);
 assert.match(flow,/gradle_task: ':app:assembleDebug'/);
 assert.match(flow,/gradle_task: ':kidsapp:assembleDebug'/);
 assert.match(flow,/MATCHAPP_ANDROID_SMOKE_TARGET="\$\{\{ matrix\.target \}\}"/);
 assert.match(flow,/MatchApp-Android-emulator-evidence-\$\{\{ matrix\.target \}\}/);
 assert.match(smoke,/native Activity is RESUMED, process alive, screenshot rendered, and exact WebView route loaded/);
 assert.match(smoke,/hosted ADB closed after verified native render; swipe result unavailable/);
 assert.match(smoke,/process exited while emulator transport remained healthy/);
 assert.match(smoke,/case "\$\{MATCHAPP_ANDROID_SMOKE_TARGET:-all\}" in/);
 assert.doesNotMatch(smoke,/UiAutomator hierarchy unavailable/);
});


test('hosted native smoke bounds ADB setup, install and final diagnostics so runner transport loss cannot hang the workflow',()=>{
 const smoke=read('tools/android-emulator-smoke.sh');
 assert.match(smoke,/timeout 35s adb wait-for-device/);
 assert.match(smoke,/timeout 15s adb reverse "tcp:\$SMOKE_PORT" "tcp:\$SMOKE_PORT"/);
 assert.match(smoke,/timeout 75s adb install -r "\$apk"/);
 assert.match(smoke,/timeout 20s adb logcat -d -v brief -t 2500/);
});


test('adult Android keeps immersive background while respecting status bar and camera cutout',()=>{
 const main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 assert.match(main,/setDecorFitsSystemWindows\(window, false\)/);
 assert.match(main,/WindowInsetsCompat\.Type\.statusBars\(\) or WindowInsetsCompat\.Type\.displayCutout\(\)/);
 assert.match(main,/setOnApplyWindowInsetsListener\(refresh\)/);
 assert.match(main,/setPadding\(view\.paddingLeft, safe\.top, view\.paddingRight, view\.paddingBottom\)/);
});


test('adult Android premium layer is native-only, tactile and reduced-motion safe',()=>{
 const main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 const kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
 assert.match(main,/NativeExperienceBridge/);
 assert.match(main,/MatchAppNativeExperience/);
 assert.match(main,/HapticFeedbackConstants\.CONFIRM/);
 assert.match(main,/HapticFeedbackConstants\.REJECT/);
 assert.match(main,/matchapp:match-success/);
 assert.match(main,/matchapp:ai-thinking/);
 assert.match(main,/MutationObserver/);
 assert.match(main,/androidRevealed/);
 assert.match(main,/matchapp:voice-start/);
 assert.match(main,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(kids,/NativeExperienceBridge/);
});


test('adult Android is Play-Billing ready and cannot fall through to Stripe checkout',()=>{
 const main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 const manifest=read('android-studio/app/src/main/AndroidManifest.xml');
 const gradle=read('android-studio/app/build.gradle.kts');
 const kidsManifest=read('android-studio/kidsapp/src/main/AndroidManifest.xml');
 assert.match(manifest,/com\.android\.vending\.BILLING/);
 assert.match(gradle,/com\.android\.billingclient:billing:9\.1\.0/);
 assert.match(main,/__matchAppAndroidBillingGuard/);
 assert.match(main,/must never[\s\S]*Stripe checkout for digital goods/);
 assert.match(main,/#btn-vip_monthly,#btn-vip_annual,#btn-business/);
 assert.match(main,/\[data-match-pack\],\[data-credit-pack\]/);
 assert.doesNotMatch(kidsManifest,/com\.android\.vending\.BILLING/);
});


test('adult Android excludes all Kids Mode UI and browser actions without touching website Kids',()=>{
 const main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 const home=read('index.html');
 const css=read('jonas/android-hide-kids-20261010.css');
 assert.match(main,/MATCHAPP_ANDROID_KIDS_BLOCKED = true/);
 assert.match(main,/function stripAndroidKids\(\)/);
 assert.match(main,/__matchAppAndroidKidsRemoved/);
 assert.match(main,/\.remove\(\)/);
 assert.match(main,/if \(isKidsUri\(uri\)\)/);
 assert.match(main,/#matchapp-kids-entry/);
 assert.doesNotMatch(main,/showAndroidKidsNotice|configureAndroidKidsEntry|fun openKidsBrowser|fun openKidsInBrowser/);
 assert.ok(home.includes('/jonas/android-hide-kids-20261010.css'));
 assert.match(css,/html\.matchapp-ai-android #matchapp-kids-entry/);
 assert.ok(read('kids/index.html').length>100,'website Kids remains available');
});
