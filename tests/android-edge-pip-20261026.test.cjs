const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const base='android-studio/app/src/main/';
test('adult Activities migrate to current edge-to-edge API without changing the safe inset owner',()=>{
  for(const name of ['MainActivity','VoiceAvatarActivity']){
    const source=read(base+'java/com/jonas/papercup/'+name+'.kt');
    assert.match(source,/WindowCompat\.enableEdgeToEdge\(window\)/);
    assert.doesNotMatch(source,/window\.(?:statusBarColor|navigationBarColor)\s*=|setDecorFitsSystemWindows/);
    assert.match(source,/WindowInsetsCompat\.Type\.systemBars\(\) or WindowInsetsCompat\.Type\.displayCutout\(\)/);
  }
  assert.doesNotMatch(read(base+'res/values/themes.xml'),/android:(?:statusBarColor|navigationBarColor)/);
  assert.match(read('android-studio/app/build.gradle.kts'),/androidx.core:core-ktx:1\.17\.0/);
});
test('PiP uses the fullscreen policy and preserves playback only while the Activity remains visible',()=>{
  const source=read(base+'java/com/jonas/papercup/MainActivity.kt');
  const entry=source.slice(source.indexOf('override fun onUserLeaveHint()'),source.indexOf('override fun onStop()'));
  assert.match(entry,/NativePipPolicy\.mayEnter/);
  assert.match(entry,/customView != null/);
  assert.match(entry,/introHost != null \|\| startupHost != null/);
  assert.match(entry,/getGlobalVisibleRect\(bounds\)/);
  assert.match(entry,/enterPictureInPictureMode\(params\)/);
  assert.match(entry,/if \(isInPictureInPictureMode\) web\.onResume\(\)/);
  const stop=source.slice(source.indexOf('override fun onStop()'),source.indexOf('override fun onResume()'));
  assert.match(stop,/web\.onPause\(\)/);
  assert.match(read(base+'AndroidManifest.xml'),/android:supportsPictureInPicture="true"/);
  assert.doesNotMatch(read('android-studio/kidsapp/src/main/AndroidManifest.xml'),/supportsPictureInPicture/);
});
