const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('Android app user agent skips ads and does not bounce into Chrome',()=>{
  const ads=read('ads-serve.js');
  assert.match(ads,/MatchAppTVAndroid/);
  assert.match(ads,/MATCHAPP_IS_AD_FREE/);
  assert.match(ads,/ads-empty/);
  const init=read('ads-init.js');
  assert.match(init,/MatchAppTVAndroid/);
  assert.match(init,/MATCHAPP_IS_AD_FREE/);
  const chrome=read('chrome-launcher.js');
  assert.match(chrome,/function inAndroidApp/);
  assert.match(chrome,/if\(inAndroidApp\(\)\)return;/);
  const settings=read('settings.js');
  assert.match(settings,/if\(!\/MatchAppTVAndroid/);
  assert.match(settings,/js\('\/ads-serve\.js'\)/);
  const home=read('index.html');
  assert.match(home,/if \(\/MatchAppTVAndroid\/i\.test\(userAgent\)\) return;/);
});

test('Android Studio project stays ad-free while unpublished store CTA stays hidden',()=>{
  const manifest=read('android-studio/app/src/main/AndroidManifest.xml');
  assert.match(manifest,/tv\.matchapp\.app/);
  assert.match(manifest,/android.permission.INTERNET/);
  assert.doesNotMatch(manifest,/com\.google\.android\.gms\.ads/);
  const gradle=read('android-studio/app/build.gradle.kts');
  assert.match(gradle,/applicationId = "tv.matchapp.app"/);
  assert.doesNotMatch(gradle,/play-services-ads/);
  assert.doesNotMatch(gradle,/ads-identifier/);
  assert.match(gradle,/versionCode = 21/);
  assert.match(gradle,/versionName = "1\.1\.19"/);
  const blocker=read('android-studio/app/src/main/java/tv/matchapp/app/AdBlocker.kt');
  assert.match(blocker,/googlesyndication/);
  assert.match(blocker,/adsbygoogle/);
  const main=read('android-studio/app/src/main/java/tv/matchapp/app/MainActivity.kt');
  assert.match(main,/MatchAppTVAndroid\/\d+\.\d+(?:\.\d+)?/);
  assert.match(main,/MatchAppAiAndroid\/\d+\.\d+(?:\.\d+)?/);
  assert.match(main,/MATCHAPP_IS_AD_FREE/);
  assert.match(main,/https:\/\/matchapp\.tv\//);
  assert.match(main,/appBuild=21/);
  assert.match(main,/MatchAppAiAndroid\/1\.1\.19/);
  const kidsGradle=read('android-studio/kidsapp/build.gradle.kts');
  const kidsMain=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
  assert.match(kidsGradle,/versionCode = 21/);
  assert.match(kidsGradle,/versionName = "1\.1\.19"/);
  assert.match(kidsMain,/appBuild=21/);
  assert.match(kidsMain,/MatchAppAiKidsAndroid\/1\.1\.19/);
  assert.match(main,/replace\("; wv\)"/);
  const listing=read('android/index.html');
  assert.match(listing,/Google Play — Coming Soon/);
  assert.doesNotMatch(listing,/play\.google\.com\/store\/apps\/details\?id=tv\.matchapp\.app/);
  assert.match(listing,/canonical" href="https:\/\/matchapp\.tv\/android\/"/);
});

test('standard Android app keeps the website Kids Mode entry while Kids app stays isolated',()=>{
  const main=read('android-studio/app/src/main/java/tv/matchapp/app/MainActivity.kt');
  assert.match(main,/MATCHAPP_ANDROID_KIDS_AVAILABLE/);
  assert.doesNotMatch(main,/MATCHAPP_ANDROID_KIDS_DISABLED/);
  assert.doesNotMatch(main,/function scrubKids/);
  assert.doesNotMatch(main,/if \(isKidsUri\(data\)\) return HOME/);
  const kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
  assert.match(kids,/MATCHAPP_ANDROID_KIDS_ONLY/);
  assert.match(kids,/if \(isKidsUri\(uri\)\) return false/);
});