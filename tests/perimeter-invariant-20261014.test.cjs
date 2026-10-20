'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('the latest owner instruction replaces the old gold outline with a borderless screen',()=>{
 const policy=read('AGENTS.md');
 const current=policy.slice(policy.indexOf('OWNER CINEMATIC DESIGN REVIEW'),policy.indexOf('OWNER JONAS SPEECH IDENTITY'));
 assert.match(current,/removal of the gold viewport outline completely/);
 assert.match(current,/supersedes the older non-negotiable perimeter\/rounded-frame instructions/);
 assert.match(current,/zero frame width and no drawn outline/);
 assert.match(policy,/AdSense\/AdMob inventory and its geometry remain immutable/);
});
test('the shared stylesheet draws no viewport outline or input-blocking overlay',()=>{
 const css=read('brand.css');
 const pseudo=[...css.matchAll(/html::after\s*\{([^}]+)\}/g)].at(-1)?.[1];
 assert.ok(pseudo,'the old viewport pseudo-element is explicitly retired');
 assert.match(pseudo,/content:none!important/);
 assert.match(pseudo,/display:none!important/);
 assert.match(pseudo,/border:0!important/);
 assert.match(pseudo,/box-shadow:none!important/);
 assert.match(css,/--ma-screen-frame-width:0px/);
 assert.doesNotMatch(css,/--ma-screen-frame-width:\s*[1-9]/);
 assert.doesNotMatch(css,/html\s*\{[^}]*overflow:hidden/);
});
test('border removal retains dialog viewport bounds and existing interior strokes without touching ad rules',()=>{
 const css=read('brand.css');
 assert.match(css,/html dialog:modal::backdrop\s*\{\s*clip-path:inset\(var\(--ma-screen-frame-width\) round calc\(var\(--ma-screen-frame-radius\) - var\(--ma-screen-frame-width\)\)\)!important/);
 assert.match(css,/html dialog:modal\s*\{[\s\S]*?max-inline-size:calc\(100vw - 2 \* var\(--ma-screen-frame-width\)\)/);
 assert.match(css,/--ma-internal-stroke:1px/);
 assert.match(css,/html\.kids-mode body\.page-kids[\s\S]*?border-width:2px!important/);
 const frameSection=css.slice(css.indexOf('/* Owner requested a borderless screen'),css.indexOf('/* Permanent asset containment'));
 assert.ok(frameSection.length>100,'scope the check to the actual changed viewport rules');
 assert.doesNotMatch(frameSection,/\.adsbygoogle|\.sidebar-ad-left|\.sidebar-ad-right|\.ad-banner-container|\.admob-banner/);
});
test('every functional HTML page keeps the shared brand stylesheet that removes the outline',()=>{
 const pages=['index.html','explore.html','music.html','discover.html','about.html','profile/profile.html','pricing/pricing.html','kids/index.html','privacy.html','register.html','together.html'];
 for(const page of pages){
  const html=read(page);
  assert.match(html,/(?:\/|\.\.\/)brand\.css\?/i,page+' misses shared brand styles');
 }
});
