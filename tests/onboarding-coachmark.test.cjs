const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n');

test('How It Works uses visible contextual targets instead of hidden form controls',()=>{
  const js=read('onboarding-tour.js');
  assert.match(js,/function visualTarget\(el\)/);
  assert.match(js,/querySelector\?\.\('\.crit-toggle,button,\[role="button"\]'\)/);
  assert.match(js,/function firstVisible\(list\)/);
  assert.match(js,/r\.width>6&&r\.height>6/);
  assert.match(js,/\.match-more-filters>summary/);
});

test('Ask AI walkthrough step never opens or focuses Ask automatically',()=>{
  const js=read('onboarding-tour.js');
  assert.match(js,/TTS|keyboard|walkthrough explains where to tap/i);
  assert.doesNotMatch(js,/step\.mode==='ask'/);
  assert.doesNotMatch(js,/getElementById\('ma-tab-ask'\)\?\.click\(\)/);
  assert.match(js,/function blurActive\(\)/);
});

test('coachmark positions itself around the target with a directional pointer',()=>{
  const js=read('onboarding-tour.js'),css=read('onboarding-tour.css');
  assert.match(js,/window\.visualViewport/);
  assert.match(js,/panel\.dataset\.side=side/);
  assert.match(js,/--tour-arrow-x/);
  assert.match(js,/--tour-arrow-y/);
  for(const side of ['below','above','right','left']) assert.match(css,new RegExp('data-side="'+side+'"'));
  assert.match(css,/\.matchapp-tour-pointer/);
  assert.match(css,/width:min\(360px,calc\(100vw - 24px\)\)/);
  assert.doesNotMatch(css,/\.matchapp-tour-card\{[^}]*bottom:24px/);
});

test('tour spotlight remains readable without dimming the page to near-black',()=>{
  const css=read('onboarding-tour.css');
  assert.match(css,/rgba\(4,3,12,\.60\)/);
  assert.doesNotMatch(css,/rgba\(5,2,15,\.78\)/);
  assert.match(css,/@keyframes matchappTourSpot/);
});

test('manual walkthrough starts at step one and current cache keys ship to Home',()=>{
  const js=read('onboarding-tour.js'),html=read('index.html');
  assert.match(js,/function start\(\)[\s\S]*show\(0\)/);
  assert.match(js,/version:VERSION/);
  assert.match(js,/const VERSION='v4'/);
  assert.ok(html.includes('/onboarding-tour.css?v=20260924-coach1'));
  assert.ok(html.includes('/onboarding-tour.js?v=20260924-coach1'));
});
