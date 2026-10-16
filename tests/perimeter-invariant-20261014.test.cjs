'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('screen edge is a locked permanent UI design invariant in repository policy',()=>{
 const policy=read('AGENTS.md');
 assert.match(policy,/NON-NEGOTIABLE GOLD PERIMETER/);
 assert.match(policy,/No text, button, image, video, panel, menu, chat, floating Jonas companion, modal, overlay or animation may visibly cover/);
 assert.match(policy,/AdSense\/AdMob inventory and its geometry remain immutable/);
 assert.match(policy,/qa-global-gold-frame-20261014\.cjs/);
});
test('a single shared frame always paints last while preserving input and scroll',()=>{
 const css=read('brand.css');
 assert.match(css,/html::after\s*\{[\s\S]*?position:fixed/);
 assert.match(css,/z-index:2147483647!important/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/border:var\(--ma-screen-frame-width\) solid var\(--ma-screen-frame-gold\)/);
 assert.match(css,/--ma-screen-frame-width:3px/);
 assert.match(css,/@media\s*\(min-width:700px\)[\s\S]*?--ma-screen-frame-width:4px/);
 assert.match(css,/@media\s*print\s*\{[\s\S]*?html::after\s*\{display:none\}/);
 assert.doesNotMatch(css,/html\s*\{[^}]*overflow:hidden/);
});
test('native modal backdrop preserves the edge and interior borders are thinner',()=>{
 const css=read('brand.css');
 assert.match(css,/html dialog:modal::backdrop\s*\{\s*clip-path:inset\(var\(--ma-screen-frame-width\) round calc\(var\(--ma-screen-frame-radius\) - var\(--ma-screen-frame-width\)\)\)!important/);
 assert.match(css,/html dialog:modal\s*\{[\s\S]*?max-inline-size:calc\(100vw - 2 \* var\(--ma-screen-frame-width\)\)/);
 assert.match(css,/--ma-internal-stroke:1px/);
 assert.match(css,/html\.kids-mode body\.page-kids[\s\S]*?border-width:2px!important/);
 const frameSection=css.slice(css.lastIndexOf('/* MATCHAPP PERIMETER FINISH'));
 assert.doesNotMatch(frameSection,/\.adsbygoogle|\.sidebar-ad-left|\.sidebar-ad-right|\.ad-banner-container|\.admob-banner/);
});
test('every functional HTML page keeps shared frame stylesheet',()=>{
 const pages=['index.html','explore.html','music.html','discover.html','about.html','profile/profile.html','pricing/pricing.html','kids/index.html','privacy.html','register.html','together.html'];
 for(const page of pages){
  const html=read(page);
  assert.match(html,/(?:\/|\.\.\/)brand\.css\?/i,page+' misses shared frame');
 }
});
