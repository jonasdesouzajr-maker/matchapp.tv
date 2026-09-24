const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('shared frontend polish is loaded last on every affected web surface',()=>{
  for(const page of ['index.html','discover.html','profile/profile.html','together.html','kids/index.html']){
    const html=read(page);
    const link='/frontend-polish.css?v=20260924-ui1';
    assert.ok(html.includes(link),page+' must load the shared polish layer');
    assert.ok(html.indexOf(link)<html.lastIndexOf('</head>'),page+' polish link belongs in head');
  }
  assert.match(read('kids/index.html'),/<body class="page-kids kids-body">/);
});

test('AI answers never auto-play and retain an explicit listen control',()=>{
  const js=read('discover.js');
  assert.doesNotMatch(js,/autoReadEnabled|match_voice_autoread|match_voice_autoread_hint_seen/);
  assert.match(js,/speak\.onclick = \(\) => window\.readAloud\(text, speak\)/);
  assert.match(js,/TTS is user-initiated only/);
  const profile=read('profile/profile.html');
  assert.doesNotMatch(profile,/set-autoread|Read AI answers aloud/);
});

test('history deletion uses the in-app confirmation dialog, never window.confirm',()=>{
  const js=read('portfolio-history.js');
  assert.match(js,/function confirmHistoryRemoval\(/);
  assert.match(js,/role','alertdialog'/);
  assert.match(js,/aria-modal','true'/);
  assert.match(js,/await confirmHistoryRemoval\(i\.title\|\|i\.detail,remove\)/);
  assert.doesNotMatch(js,/window\.confirm/);
});

test('polish layer fixes toast, CLS reservation, event balance and card breathing room',()=>{
  const css=read('frontend-polish.css');
  assert.match(css,/#toast-host\{[\s\S]*position:fixed!important;[\s\S]*right:24px!important/);
  assert.match(css,/#mh-topbox \.mh-deck\{min-height:96px!important/);
  assert.match(css,/@media\(max-width:700px\)[\s\S]*#mh-topbox \.mh-deck\{min-height:146px!important/);
  assert.match(css,/@media\(min-width:768px\)[\s\S]*#global-events \.global-event-grid\{[\s\S]*display:grid!important;[\s\S]*grid-template-columns:repeat\(auto-fit,minmax\(160px,1fr\)\)!important/);
  assert.match(css,/\.ma-news-card-body\{padding:16px!important\}/);
  assert.match(css,/\.discover-card\{padding:20px!important\}/);
  assert.match(css,/-webkit-line-clamp:2!important/);
});

test('ad fallback changes only presentation while keeping the locked units intact',()=>{
  const css=read('frontend-polish.css');
  assert.match(css,/\.premium-ad-frame,\.ad-banner-container/);
  assert.match(css,/overflow:hidden!important;/);
  assert.match(css,/ins\.adsbygoogle:not\(\[data-ad-status="filled"\]\)/);
  assert.match(css,/rgba\(24,24,27,\.50\)/);
  assert.match(css,/@keyframes maAdFallbackPulse/);
});

test('fold chrome is lighter, redundant Match Together arrows are gone and CTAs are unified',()=>{
  const css=read('frontend-polish.css');
  const html=read('index.html');
  assert.match(css,/lazy-head\[data-fold-key="together"\] \.lazy-head-chevron\{display:none!important\}/);
  assert.doesNotMatch(html,/class="tg-entry-arrow"/);
  assert.match(css,/background:linear-gradient\(90deg,#7c3aed 0%,#6366f1 100%\)!important/);
  assert.match(css,/body\.page-kids \.kids-primary/);
  assert.match(css,/html,body\{border-top:0!important;outline:0\}/);
});

test('foreground panels use the stronger dark frost layer',()=>{
  const css=read('frontend-polish.css');
  assert.match(css,/background-color:rgba\(9,9,11,\.78\)!important/);
  assert.match(css,/border-color:rgba\(255,255,255,\.10\)!important/);
  assert.match(css,/backdrop-filter:blur\(24px\)!important/);
});
