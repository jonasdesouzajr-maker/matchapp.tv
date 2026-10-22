'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
const between=(start,end)=>main.slice(main.indexOf(start),main.indexOf(end,main.indexOf(start)));

test('the adult main window and popup route Maps before the unchanged Google authentication host rule',()=>{
  const navigation=between('private fun handleUrl(', 'private fun openCinemaMaps(');
  assert.ok(navigation.indexOf('NativeCinemaNavigationPolicy.isSearchUrl(uri.toString())')<navigation.indexOf('isTrustedAuthHost(host)'));
  assert.match(navigation,/isSearchUrl\(uri\.toString\(\)\)\) return openCinemaMaps\(uri\)/);
  const popup=between('override fun onCreateWindow(', 'override fun onShowCustomView(');
  assert.ok(popup.indexOf('isKidsUri(target)')<popup.indexOf('NativeCinemaNavigationPolicy.isSearchUrl(target.toString())'));
  assert.ok(popup.indexOf('NativeCinemaNavigationPolicy.isSearchUrl(target.toString())')<popup.indexOf('isTrustedAuthHost(host)'));
  assert.match(popup,/isSearchUrl\(target\.toString\(\)\) -> openCinemaMaps\(target\)/);
  assert.match(popup,/child\.post \{ child\.destroy\(\) \}/);
  assert.doesNotMatch(popup,/web\.destroy\(/);
  assert.match(main,/listOf\("supabase\.co", "google\.com", "gstatic\.com", "googleapis\.com", "googleusercontent\.com"\)/);
});

test('the Maps handoff preserves the original HTTPS Uri and keeps MatchApp usable when no handler can open it',()=>{
  const handoff=between('private fun openCinemaMaps(', 'private fun showCinemaMapsUnavailable(');
  assert.match(handoff,/Intent\(Intent\.ACTION_VIEW, uri\)/);
  assert.match(handoff,/addCategory\(Intent\.CATEGORY_BROWSABLE\)/);
  assert.match(handoff,/catch \(_: ActivityNotFoundException\) \{\s*showCinemaMapsUnavailable\(\)/);
  assert.match(handoff,/catch \(_: SecurityException\) \{\s*showCinemaMapsUnavailable\(\)/);
  assert.match(handoff,/return true\s*\}/);
  assert.doesNotMatch(handoff,/loadUrl|parseUri|setPackage|FLAG_ACTIVITY_NEW_TASK|requestPermissions|lastUrl\s*=/);
  assert.match(between('private fun showCinemaMapsUnavailable(', 'private fun openExternal('),/startupStrings\(\)\.getString\(R\.string\.cinema_maps_unavailable\)/);
});

test('the missing-handler message has authored resources for every supported native app language',()=>{
  const folders=['values','values-pt','values-es','values-fr','values-de','values-it','values-tr','values-ru','values-ar','values-hi','values-in','values-ja','values-ko','values-zh'];
  let english;
  for(const folder of folders){
    const xml=read('android-studio/app/src/main/res/'+folder+'/cinema_navigation.xml');
    const dom=new JSDOM(xml,{contentType:'text/xml'});
    try{
      const copy=dom.window.document.querySelector('string[name="cinema_maps_unavailable"]')?.textContent;
      assert.ok(copy?.trim().length>20,folder);
      if(folder==='values')english=copy;else assert.notEqual(copy,english,folder+' must not silently use English');
    }finally{dom.window.close();}
  }
});

test('the native CI gate executes the new JVM routing tests before exporting adult57 artifacts',()=>{
  const flow=read('.github/workflows/android-validation.yml');
  assert.match(flow,/\.\/gradlew :app:testDebugUnitTest :app:assembleDebug :app:bundleRelease :kidsapp:assembleDebug/);
  assert.match(flow,/MatchApp-Ai-adult-1\.1\.58-code58-UNSIGNED-AAB/);
  assert.match(flow,/version: 1\.1\.58; versionCode: 58/);
});
