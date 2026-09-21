const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('Home top-level fold bars share the full Match/Ask stage width',()=>{
  const css=read('matchapp-ia.css');
  const pass=css.slice(css.indexOf('2026-09-21 coherent Home stage + AdSense placement pass'));
  assert.match(pass,/\.lazy-head\[data-fold-key="concierge"\]/);
  assert.match(pass,/\.lazy-head\[data-fold-key="together"\]/);
  assert.match(pass,/#premiere-disclosure>summary/);
  assert.match(pass,/#weekly-pick-disclosure>summary/);
  assert.match(pass,/width:100%!important;[\s\S]*max-width:100%!important/);
});

test('Home matcher keeps Mood, Format and Platform inside with compact gaps',()=>{
  const css=read('matchapp-ia.css');
  const pass=css.slice(css.indexOf('2026-09-21 coherent Home stage + AdSense placement pass'));
  assert.match(pass,/\.ma-concierge #questionnaire-box\{[\s\S]*padding:10px 12px 12px!important/);
  assert.match(pass,/\.ma-concierge \.ma-filter-row\{[\s\S]*gap:6px!important/);
  assert.match(pass,/\.ma-concierge \.ma-filter-label\{[\s\S]*padding:0 4px 2px!important/);
  assert.match(pass,/\.ma-concierge \.ma-chip-row\{[\s\S]*gap:6px!important/);
});

test('Home keeps two desktop AdSense rails and three subtle tablet/mobile in-flow slots',()=>{
  const html=read('index.html');
  const css=read('matchapp-ia.css');
  const ia=read('matchapp-ia.js');
  assert.equal((html.match(/class="sidebar-ad-left premium-ad-frame"/g)||[]).length,1);
  assert.equal((html.match(/class="sidebar-ad-right premium-ad-frame"/g)||[]).length,1);
  assert.equal((html.match(/class="ad-banner-container premium-ad-frame/g)||[]).length,3);
  const pass=css.slice(css.indexOf('2026-09-21 coherent Home stage + AdSense placement pass'));
  assert.match(pass,/@media\(min-width:1180px\)[\s\S]*sidebar-ad-left[\s\S]*sidebar-ad-right[\s\S]*display:flex!important/);
  assert.match(pass,/@media\(max-width:767px\)[\s\S]*ad-banner-container\.ma-inline-ad[\s\S]*min-height:92px!important/);
  assert.match(ia,/ads\.forEach\(ad=>ad\.classList\.add\('ma-inline-ad'\)\)/);
  assert.match(ia,/if\(ads\[0\]&&trending\)after\(trending,ads\[0\]\)/);
  assert.match(ia,/if\(ads\[1\]&&week\)after\(week,ads\[1\]\)/);
  assert.match(ia,/if\(ads\[2\]\)after\(events\|\|swift\|\|anchor,ads\[2\]\)/);
});
