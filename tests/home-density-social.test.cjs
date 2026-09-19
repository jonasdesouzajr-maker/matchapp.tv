const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('homepage density removes legacy dead-space shell',()=>{
  const css=read('home-premium.css');
  assert.ok(css.includes('Density + ad layout pass v4'));
  assert.ok(css.includes('min-height:0!important'));
  assert.ok(css.includes('display:flex!important'));
  assert.ok(css.includes('gap:6px!important'));
});

test('Lazy Mode folds major homepage modules but normal mode stays open',()=>{
  const lazy=read('lazy.js');
  const css=read('home-premium.css');
  for(const sel of ['#daily-match-checkin','.top-ask-wrap','#trending-rail','#swifties-spotify','#questionnaire-box','#search-box','#premiere-disclosure','#latest-news','#global-events','#how-it-works','#ai-concierge-section','#matchapp-tiktok-showcase']){
    assert.ok(lazy.includes(sel),sel+' must be foldable in Lazy Mode');
  }
  assert.ok(css.includes('body.page-home:not(.lazy-mode) .lazy-head{display:none!important}'));
  assert.ok(css.includes('body.page-home.lazy-mode .lazy-foldable:not(.lazy-open){display:none!important}'));
});

test('TikTok showcase uses outbound actions and completed native share earns bonus',()=>{
  const js=read('tiktok-showcase.js');
  const html=read('index.html');
  const share=read('share.js');
  assert.ok(js.includes('navigator.share'));
  assert.ok(js.includes('await grantTikTokShareReward()'));
  assert.ok(js.includes('TikTok opened — tap Like on the video.'));
  assert.ok(js.includes('TikTok opened — add your comment on the video.'));
  assert.ok(share.includes('window.grantShareReward = grantShareReward'));
  assert.ok(html.includes('data-tiktok-showcase-status'));
  assert.ok(html.includes('+1 free Match'));
});

test('AdSense layout keeps two non-sticky desktop rails and responsive in-content ads',()=>{
  const css=read('home-premium.css');
  const html=read('index.html');
  assert.ok(css.includes('grid-template-columns:160px minmax(0,1fr) 160px!important'));
  assert.ok(css.includes('position:static!important'));
  assert.equal((html.match(/class="adsbygoogle"/g)||[]).length,5);
  assert.ok(html.includes('class="ma-ad-label">Sponsored'));
});

test('homepage search metadata remains indexable and preview friendly',()=>{
  const html=read('index.html');
  assert.ok(html.includes('<link rel="canonical" href="https://matchapp.tv/">'));
  assert.ok(html.includes('max-image-preview:large, max-snippet:-1, max-video-preview:-1'));
  assert.ok(html.includes('twitter:image" content="https://matchapp.tv/og-image-v3.png?v=2'));
  assert.ok(html.includes('application/ld+json'));
});
