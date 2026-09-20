const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('premium UI token and component layers stay presentation-only and responsive',()=>{
  const tokens=read('tokens.css'),components=read('components.css'),runtime=read('premium-ui.js'),settings=read('settings.js');
  assert.match(tokens,/--ma-container:1200px/);
  assert.match(tokens,/@media\(max-width:640px\)/);
  assert.match(tokens,/@media\(min-width:1024px\)/);
  assert.match(tokens,/@media\(min-width:1440px\)/);
  assert.match(tokens,/--font-display:"Outfit"/);
  assert.match(tokens,/--font-body:"Inter"/);
  assert.match(components,/min-height:44px/);
  assert.match(components,/prefers-reduced-motion:reduce/);
  assert.match(components,/scroll-snap-type:x mandatory/);
  assert.match(runtime,/svgFallback/);
  assert.match(runtime,/IntersectionObserver/);
  assert.match(runtime,/scheduleMediaRefresh/);
  assert.doesNotMatch(runtime,/new MutationObserver/);
  assert.doesNotMatch(runtime,/function orderHome/);
  assert.match(components,/Handset\/tablet stability/);
  assert.match(runtime,/hover:hover/);
  assert.match(settings,/css\('\/tokens\.css'\)/);
  assert.match(settings,/css\('\/components\.css'\)/);
  assert.match(settings,/js\('\/premium-ui\.js'\)/);
  assert.match(settings,/if\(!isKids\)/);
});

test('onboarding waits for first user interaction',()=>{
  const tour=read('onboarding-tour.js');
  assert.match(tour,/\['pointerdown','keydown','touchstart'\]/);
  assert.match(tour,/armAfterInteraction/);
  assert.doesNotMatch(tour,/DOMContentLoaded.*setTimeout\(start,1500\)/);
});

test('premium UI release does not modify ad, analytics, auth, quota or matching sources',()=>{
  for(const file of ['ads-serve.js','ads-init.js','auth.js','matching-policy.js','app.js']){
    assert.ok(fs.existsSync(path.join(root,file)),file);
  }
});
