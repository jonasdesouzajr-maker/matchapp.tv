'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('shared outer frame has responsive, visibly rounded corners without clipping the app',()=>{
 const css=read('brand.css');
 assert.match(css,/--ma-screen-frame-radius:clamp\(20px,3vmin,32px\)/);
 assert.match(css,/border-radius:var\(--ma-screen-frame-radius\)/);
 assert.doesNotMatch(css,/border-radius:clamp\(3px,.5vw,7px\)/);
 assert.match(css,/clip-path:inset\(var\(--ma-screen-frame-width\) round calc\(var\(--ma-screen-frame-radius\) - var\(--ma-screen-frame-width\)\)\)/);
 assert.doesNotMatch(css,/html\s*\{[^}]*overflow:hidden/);
});
test('frame refresh preserves other cache parameters and remains idempotent for adult and Kids routes',()=>{
 const {versionFrameStylesheet,versionBrandStylesheet}=require('../tools/finalize-brand');
 for(const href of ['/brand.css','/brand.css?v=195','../brand.css?v=195','/brand.css?v=20261015-spacing1&amp;headerauth=20261016-1','/brand.css?v=20261015-spacing1&frame=old']){
  const before='<link rel="stylesheet" href="'+href+'"><script src="/app.js?v=unchanged"></script>';
  const after=versionFrameStylesheet(before);
  assert.equal(versionFrameStylesheet(after),after);
  assert.ok(after.endsWith('<script src="/app.js?v=unchanged"></script>'));
  const u=new URL(after.match(/href="([^"]+)"/)[1].replace(/&amp;/g,'&'),'https://matchapp.tv/');
  assert.equal(u.searchParams.get('frame'),'20261016-rounded1');
  assert.equal(u.searchParams.getAll('frame').length,1);
  if(href.includes('headerauth'))assert.equal(u.searchParams.get('headerauth'),'20261016-1');
 }
 const normalized=versionFrameStylesheet(versionBrandStylesheet('<link href="/brand.css?v=old">',true));
 assert.ok(normalized.includes('headerauth=20261016-1&amp;frame=20261016-rounded1'));
});
test('representative desktop, mobile, tablet, Android and Kids pages request the new frame',()=>{
 for(const file of ['index.html','explore.html','discover.html','music.html','about.html','profile/profile.html','pricing/pricing.html','kids/index.html','privacy.html','register.html','together.html']){
  const html=read(file),match=html.match(/href=["']([^"']*brand\.css[^"']*)["']/);
  assert.ok(match,file+' has shared brand stylesheet');
  const u=new URL(match[1].replace(/&amp;/g,'&'),'https://matchapp.tv/');
  assert.equal(u.searchParams.get('frame'),'20261016-rounded1',file);
 }
});
