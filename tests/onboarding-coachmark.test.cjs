const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n');

test('How It Works uses nine visible product controls as anchored targets',()=>{
  const js=read('onboarding-tour.js');
  for(const selector of [
    '#ma-tab-match',
    '.ma-quick .ma-filter-row.ma-mood-block',
    '.ma-quick .ma-filter-row:nth-child(2)',
    '.ma-quick .ma-filter-row:nth-child(3)',
    '.match-more-filters>summary',
    '#ma-tab-ask',
    '#trending-rail .marquee-item:nth-child(2)',
    '#matchapp-kids-entry',
    '#profile-link-tab'
  ]) assert.ok(js.includes(selector),selector+' must remain a tour target');
  assert.doesNotMatch(js,/key:'find'/);
  assert.doesNotMatch(js,/key:'quota'/);
});

test('walkthrough never focuses text fields or activates Ask AI by itself',()=>{
  const js=read('onboarding-tour.js');
  assert.match(js,/Ask AI is deliberately never/);
  assert.doesNotMatch(js,/step\.mode==='ask'/);
  assert.doesNotMatch(js,/getElementById\('ma-tab-ask'\)\?\.click\(\)/);
  assert.match(js,/function guardFocus\(e\)/);
  assert.match(js,/input,textarea,\[contenteditable/);
  assert.match(js,/node\.blur\(\)/);
});

test('premium coachmark is a compact speech bubble with a directional triangular tail',()=>{
  const js=read('onboarding-tour.js'),css=read('onboarding-tour.css');
  assert.match(js,/panel\.dataset\.side=best\.side/);
  assert.match(js,/--tour-arrow-x/);
  assert.match(js,/--tour-arrow-y/);
  assert.match(js,/overflowScore/);
  for(const side of ['below','above','right','left']) assert.match(css,new RegExp('data-side="'+side+'"'));
  assert.match(css,/clip-path:polygon/);
  assert.match(css,/width:min\(310px,calc\(100vw - 28px\)\)/);
  assert.doesNotMatch(css,/bottom:24px/);
});

test('phone walkthrough scrolls targets into a safe zone instead of becoming a bottom sheet',()=>{
  const js=read('onboarding-tour.js');
  assert.match(js,/function revealTarget\(el\)/);
  assert.match(js,/const roomBelow=vp\.bottom-r\.bottom/);
  assert.match(js,/const roomAbove=r\.top-vp\.top/);
  assert.match(js,/vp\.height\*\.31/);
  assert.match(js,/window\.scrollBy/);
});

test('spotlight leaves context readable and highlights the actual target',()=>{
  const css=read('onboarding-tour.css');
  assert.match(css,/rgba\(4,3,12,\.48\)/);
  assert.match(css,/border:2px solid rgba\(255,229,128,\.98\)/);
  assert.match(css,/matchappTourSpotV6/);
  assert.match(css,/\.matchapp-tour-spotlight::after/);
});

test('manual walkthrough ships the new cache key to Home',()=>{
  const js=read('onboarding-tour.js'),html=read('index.html');
  assert.match(js,/function start\(\)[\s\S]*show\(0\)/);
  assert.match(js,/const VERSION='v6'/);
  assert.ok(html.includes('/onboarding-tour.css?v=20260924-coach3'));
  assert.ok(html.includes('/onboarding-tour.js?v=20260924-coach3'));
  assert.doesNotMatch(html,/20260924-coach1/);
});


test('off-screen controls never become edge-clamped fake spotlights',()=>{
  const js=read('onboarding-tour.js');
  assert.match(js,/const visibleWidth=Math\.max\(0/);
  assert.match(js,/const targetReady=/);
  assert.match(js,/spot\.hidden=true/);
  assert.match(js,/panel\.style\.visibility='hidden'/);
});

test('Home carries a compact in-flow growth disclosure',()=>{
  const html=read('index.html'),css=read('frontend-polish.css');
  assert.match(html,/id="matchapp-growth-disclosure"/);
  assert.match(html,/Always growing\./);
  assert.match(html,/constantly expanding with new titles, features and experiences/);
  assert.match(css,/\.matchapp-growth-disclosure\{/);
  assert.match(css,/position:relative/);
  assert.doesNotMatch(css,/\.matchapp-growth-disclosure\{[^}]*position:fixed/);
});
