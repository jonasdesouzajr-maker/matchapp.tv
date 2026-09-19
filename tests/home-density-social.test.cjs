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
  for(const sel of ['#daily-match-checkin','.top-ask-wrap','#swifties-spotify','#questionnaire-box','#search-box','#premiere-disclosure','#how-it-works','#ai-concierge-section','#matchapp-tiktok-showcase']){
    assert.ok(lazy.includes(sel),sel+' must be foldable in Lazy Mode');
  }
  assert.ok(!lazy.includes("{ sel: '#global-events'"),'Global Events owns its native disclosure and must not get a second Lazy Mode fold control');
  assert.ok(!lazy.includes("{ sel: '#trending-rail'"),'Latest Titles must remain permanently visible');
  assert.ok(!lazy.includes("{ sel: '#latest-news'"),'Latest News must remain permanently visible');
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

test('Taylor Swift Spotify field is the last visible editorial module and carries current SEO metadata',()=>{
  const html=read('index.html'),css=read('matchapp-ia.css');
  const swift=html.indexOf('<section id="swifties-spotify"');
  const tiktok=html.indexOf('<section id="matchapp-tiktok-showcase"');
  assert(swift>tiktok,'Spotify field must come after TikTok as the final editorial field');
  assert.match(html,/Taylor Swift official music videos on Spotify/);
  assert.match(html,/numberOfItems":58/);
  for(const title of ['Elizabeth Taylor','Opalite','The Fate of Ophelia']) assert.ok(html.includes(title),title+' must be represented in metadata/content');
  assert.match(html,/open\.spotify\.com\/embed\/artist\/06HL4z0CvFAxyc27GXpf02/);
  assert.match(html,/open\.spotify\.com\/embed\/playlist\/37i9dQZF1DXe7fP0uj1s1D/);
  assert.doesNotMatch(css,/html body\.page-home #swifties-spotify,\s*html body\.page-home #how-it-works/,'canonical Home shell must not hide the restored Spotify field');
});