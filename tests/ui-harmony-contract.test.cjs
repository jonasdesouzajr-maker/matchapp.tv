'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('permanent UI/UX guardrail is documented',()=>{
  const agents=read('AGENTS.md');
  assert.match(agents,/PERMANENT UI\/UX, ADSENSE-READINESS & CURRENT-STANDARDS GUARDRAIL/);
  assert.match(agents,/AdSense-ready at all times/);
  assert.match(agents,/Zero regression requirement/);
});

test('final visual harmony layers load on core cross-device surfaces',()=>{
  assert.match(read('index.html'),/\/ui-harmony\.css\?v=20261003-1/);
  assert.match(read('discover.html'),/\/ui-harmony\.css\?v=20261003-1/);
  assert.match(read('pricing/pricing.html'),/\/ui-harmony\.css\?v=20261003-1/);
  assert.match(read('kids/index.html'),/\/kids\/ui-harmony\.css\?v=20261003-1/);
});

test('UI harmony stays presentation-only and away from protected AdSense contract',()=>{
  for(const file of ['ui-harmony.css','kids/ui-harmony.css']){
    const css=read(file);
    assert.match(css,/prefers-reduced-motion/);
    for(const forbidden of [
      /adsbygoogle/i,/data-ad-/i,/ca-pub-/i,/2595698117/i,
      /sidebar-ad/i,/ad-banner-container/i,/ads-init/i
    ]) assert.doesNotMatch(css,forbidden, file+' must not touch protected ad inventory');
  }
});

test('narrow-phone and responsive safeguards remain explicit',()=>{
  const adult=read('ui-harmony.css');
  const kids=read('kids/ui-harmony.css');
  assert.match(adult,/@media\(max-width:340px\)/);
  assert.match(adult,/@media\(max-width:420px\)/);
  assert.match(adult,/#q-category/);
  assert.match(adult,/#q-mood/);
  assert.match(kids,/@media\(max-width:360px\)/);
  assert.match(kids,/\.kids-primary/);
});


test('dedicated Ask page keeps the exact product brand and removes stray intro strips',()=>{
  const ia=read('matchapp-ia.js');
  const discover=read('discover.html');
  const adult=read('ui-harmony.css');
  assert.match(ia,/discover:'Ask MatchApp Ai'/);
  assert.match(discover,/>Ask MatchApp Ai<\/h1>/);
  assert.match(adult,/search\.hint.*::before/);
  assert.match(adult,/#match-packs-section/);
});
