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

test('Home folds persist by section and Lazy Mode closes every major content module',()=>{
  const lazy=read('lazy.js');
  const html=read('index.html');
  const css=read('matchapp-ia.css');
  for(const sel of ['#trending-rail','#daily-match-checkin','.top-ask-wrap','#ma-concierge','.tg-entry','#premiere-disclosure','#weekly-pick-disclosure','#latest-news','#global-events .global-events-fold','#how-it-works','#ai-concierge-section','#matchapp-tiktok-showcase']){
    assert.ok(lazy.includes(sel),sel+' must participate in Home folding');
  }
  assert.ok(lazy.includes("match_home_fold_state_v2"));
  assert.ok(lazy.includes("setSwift"));
  assert.ok(html.includes('.lazy-foldable:not(.lazy-open) { display: none !important; }'));
  assert.ok(css.includes('#latest-news:not([open])>.ma-news-panel'));
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


test('desktop social rewards never fire merely for opening or copying a social intent',()=>{
  const share=read('share.js');
  const html=read('index.html');
  const copy=share.slice(share.indexOf('window.copyShareText'),share.indexOf('// Per-network web intents'));
  const intents=share.slice(share.indexOf('window.shareTo = function'),share.indexOf('/* ============================================================\n   SEND TO A PERSON'));
  assert.doesNotMatch(copy,/afterShare\('copy'\)/);
  assert.doesNotMatch(intents,/afterShare\(network\)/);
  assert.match(share,/I shared it — unlock \+1 Match/);
  assert.match(share,/afterShare\(network \+ '-confirmed'\)/);
  assert.match(html,/share\.js\?v=20260919-reward3/);
});

test('Taylor Swift Spotify field sits directly below the anticipated premiere and carries current SEO metadata',()=>{
  const html=read('index.html'),css=read('matchapp-ia.css');
  const swift=html.indexOf('<section id="swifties-spotify"');
  const premiere=html.indexOf('<details id="premiere-disclosure"');
  const events=html.indexOf('<section id="global-events"');
  assert(swift>premiere&&events>swift,'Spotify field must sit between Premiere and Global Events');
  assert.match(html,/Taylor Swift official music videos on Spotify/);
  assert.match(html,/numberOfItems":58/);
  for(const title of ['Elizabeth Taylor','Opalite','The Fate of Ophelia']) assert.ok(html.includes(title),title+' must be represented in metadata/content');
  assert.match(html,/open\.spotify\.com\/embed\/artist\/06HL4z0CvFAxyc27GXpf02/);
  assert.match(html,/open\.spotify\.com\/embed\/playlist\/37i9dQZF1DXe7fP0uj1s1D/);
  assert.doesNotMatch(css,/html body\.page-home #swifties-spotify,\s*html body\.page-home #how-it-works/,'canonical Home shell must not hide the restored Spotify field');
});