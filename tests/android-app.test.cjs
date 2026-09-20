const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('Android web shell stays ad-free and does not bounce into Chrome',()=>{
 const init=read('ads-init.js'),chrome=read('chrome-launcher.js'),main=read('android-studio/app/src/main/java/tv/matchapp/app/MainActivity.kt');
 assert.match(init,/MatchAppTVAndroid/);assert.match(init,/MATCHAPP_IS_AD_FREE/);
 assert.match(chrome,/function inAndroidApp/);assert.match(chrome,/if\(inAndroidApp\(\)\)return;/);
 assert.match(main,/MATCHAPP_IS_AD_FREE/);
});
test('both Android modules target API 36 and preserve route separation',()=>{
 const mainG=read('android-studio/app/build.gradle.kts'),kidsG=read('android-studio/kidsapp/build.gradle.kts');
 const main=read('android-studio/app/src/main/java/tv/matchapp/app/MainActivity.kt'),kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
 for(const g of [mainG,kidsG]){assert.match(g,/compileSdk = 36/);assert.match(g,/targetSdk = 36/);assert.match(g,/versionCode = \d+/);assert.match(g,/versionName = "\d+\.\d+\.\d+"/);}
 assert.match(main,/https:\/\/matchapp\.tv\//);assert.match(kids,/https:\/\/matchapp\.tv\/kids\//);assert.match(main,/MATCHAPP_ANDROID_KIDS_AVAILABLE/);assert.match(kids,/MATCHAPP_ANDROID_KIDS_ONLY/);
});
test('main Android launcher uses official icon and no Google ads SDK',()=>{
 const manifest=read('android-studio/app/src/main/AndroidManifest.xml'),gradle=read('android-studio/app/build.gradle.kts'),launcher=read('android-studio/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml');
 assert.doesNotMatch(manifest,/com\.google\.android\.gms\.ads/);assert.doesNotMatch(gradle,/play-services-ads|ads-identifier/);assert.match(launcher,/@drawable\/matchapp_official_icon/);
});
