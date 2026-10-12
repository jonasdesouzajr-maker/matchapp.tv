'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=path.join(root,'android-studio','app'),native=fs.readFileSync(path.join(app,'src','main','java','com','jonas','papercup','MainActivity.kt'),'utf8');
const filenames=['jonas/android-ambient-assistant-20261011.js','jonas/android-ambient-assistant-20261011.css','jonas/android-ambient-embed-20261011.css','jonas/narrated-transcript-20261011.js','discover.js','voice-input.js'];
test('debug preview bundles the exact validated web assets, and release contains none',()=>{
 for(const name of filenames){
  const source=fs.readFileSync(path.join(root,name)),preview=fs.readFileSync(path.join(app,'src','debug','assets','ambient-preview',name));
  assert.ok(source.equals(preview),name+' changed after debug preview was staged');
  assert.equal(fs.existsSync(path.join(app,'src','main','assets','ambient-preview',name)),false,'release must not bundle '+name);
 }
});
test('WebView serves the preview only to DEBUG builds at first party HTTPS URLs',()=>{
 assert.match(native,/private fun debugAmbientPreview\(url: String\): WebResourceResponse\?/);
 assert.match(native,/if \(!BuildConfig\.DEBUG\) return null/);
 assert.match(native,/uri\.scheme != "https" \|\| !isMatchAppHost/);
 assert.match(native,/assets\.open\("ambient-preview\/\$relative"\)/);
 assert.match(native,/debugAmbientPreview\(request\.url\.toString\(\)\) \?: AdBlocker\.intercept/);
 assert.match(native,/debugAmbientPreview\(url\) \?: AdBlocker\.intercept/);
});
