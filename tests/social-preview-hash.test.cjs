'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {routes,revision,jpegSize,render,syncAndroidDebugPreview}=require('../tools/sync-social-previews.cjs');
const root=path.join(__dirname,'..');

test('every MatchApp and Lumina sharing page uses the latest approved image revision',()=>{
 for(const route of routes){
  const image=fs.readFileSync(path.join(root,route.image));
  const html=fs.readFileSync(path.join(root,route.page),'utf8');
  assert.deepEqual(jpegSize(image),{width:1200,height:630},route.image);
  assert.equal(render(html,route,image),html,route.page+' has stale or inconsistent social metadata');
  const url='https://matchapp.tv/'+route.image+'?v='+revision(image);
  for(const field of ['og:image','og:image:secure_url','twitter:image']){
   const tag=html.match(new RegExp('<meta\\b[^>]*(?:property|name)=["\\\']'+field+'["\\\'][^>]*>','i'));
   assert.ok(tag,route.page+' missing '+field);
   assert.ok(tag[0].includes('content="'+url+'"'),route.page+' needs current '+field);
  }
 }
});

test('replacing approved artwork changes the preview cache revision and all card references',()=>{
 const route=routes[0];
 const original=fs.readFileSync(path.join(root,route.image));
 const changed=Buffer.from(original);
 changed[changed.length-4]^=1;
 assert.notEqual(revision(original),revision(changed));
 const html=fs.readFileSync(path.join(root,route.page),'utf8');
 const refreshed=render(html,route,changed);
 assert.notEqual(refreshed,html);
 assert.ok(refreshed.includes('?v='+revision(changed)));
 assert.equal(render(refreshed,route,changed),refreshed,'stamping must be idempotent');
});

test('invalid or wrong-sized share artwork cannot produce a social preview',()=>{
 assert.throws(()=>jpegSize(Buffer.from('not an image')),/JPEG/);
 const route=routes[0],html=fs.readFileSync(path.join(root,route.page),'utf8');
 assert.throws(()=>render(html,route,Buffer.from('fake JPEG')),/JPEG/);
});


test('website-only builds skip intentionally absent Android debug assets while GitHub requires native parity',()=>{
 const missing=path.join(root,'tests','__absent_android_debug_preview__.html');
 assert.equal(fs.existsSync(missing),false);
 assert.equal(syncAndroidDebugPreview('write',{VERCEL:'1'},missing),false);
 assert.equal(syncAndroidDebugPreview('check',{VERCEL:'1'},missing),false);
 assert.throws(()=>syncAndroidDebugPreview('write',{GITHUB_ACTIONS:'true'},missing),/Required Android debug-preview file missing/);
 assert.equal(syncAndroidDebugPreview('check',{GITHUB_ACTIONS:'true'}),true);
});
