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
test('main Android launcher uses official icon and no Google ads SDK',()=>{
 const manifest=read('android-studio/app/src/main/AndroidManifest.xml'),gradle=read('android-studio/app/build.gradle.kts'),launcher=read('android-studio/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml');
 assert.doesNotMatch(manifest,/com\.google\.android\.gms\.ads/);assert.doesNotMatch(gradle,/play-services-ads|ads-identifier/);assert.match(launcher,/@drawable\/matchapp_launcher_safe/);
 const safe=read('android-studio/app/src/main/res/drawable/matchapp_launcher_safe.xml');
 assert.match(safe,/@drawable\/matchapp_official_icon/);assert.match(safe,/android:inset="16%"/);
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
