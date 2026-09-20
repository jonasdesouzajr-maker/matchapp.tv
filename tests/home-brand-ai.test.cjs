const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('canonical IA homepage owns first paint with no legacy Home overrides',()=>{
  const html=read('index.html');
  const settings=read('settings.js');
  const ia=read('matchapp-ia.css');
  assert.match(html,/matchapp-ia\\.css\\?v=20260920-ia\\d+/);
  assert.match(html,/settings\.js\?v=20260919-/);
  for(const legacy of ['home-premium.css','home-brand.css','home-mobile.css','matchapp-ui-v3.css','redesign.css','brand-corrections.css','brand-corrections.js','home-ux-lock.css','desktop-home-restore.css','home-ux-lock.js','home-layout-guard.js']){
    assert.ok(!html.includes(legacy),legacy+' must not load on Home');
  }
  assert.ok(!settings.includes('home-premium.css'),'settings must not late-inject legacy Home CSS');
  assert.match(ia,/CANONICAL HOME SHELL — SINGLE OWNER/);
  assert.match(html,/matchapp-official-icon-512\\.webp\\?v=20260920-official1/);
});

test('Home header is static from first paint and cannot re-enter the shared legacy cascade',()=>{
  const html=read('index.html');
  const js=read('matchapp-ia.js');
  assert.match(html,/id="mh-topbox" class="app-header ma-home-header"/);
  assert.match(html,/matchapp-ia\\.js\\?v=20260920-ia\\d+/);
  assert.match(js,/if\(isHome\)\{[\s\S]*?classList\.remove\('ma-global-header'\)[\s\S]*?classList\.add\('ma-home-header'\)/);
  assert.match(js,/if\(isHome&&h\.classList\.contains\('ma-global-header'\)\)h\.classList\.remove\('ma-global-header'\)/);
});

test('homepage animated Ai brand control opens the canonical Ask panel',()=>{
  const html=read('index.html');
  const ia=read('matchapp-ia.js');
  assert.match(html,/class="ma-ai-brand-button"/);
  assert.match(html,/Start a new chat with MatchApp Ai/);
  assert.match(ia,/function openAskFromBrand\(\)/);
  assert.match(ia,/safeClick\(ask\)/);
  assert.match(ia,/specific-search-input/);
});

test('Kids assets and routing stay isolated from normal premium branding',()=>{
  const shared=read('brand.css');
  const kids=read('kids/index.html');
  const nostalgia=read('kids/nostalgia/index.html');
  assert.match(shared,/:not\(\[src\*="\/kids\/"\]\)/);
  assert.match(kids,/\/kids\/kids-logo-sm\.jpeg/);
  assert.match(nostalgia,/\/kids\/kids-logo-sm\.jpeg/);
});

test('premium intro, compact check-in and social preview ship together',()=>{
  const html=read('index.html');
  const intro=read('tiktok-showcase.css');
  const daily=read('daily-checkin.js');
  const og=read('assets/brand/matchapp-og.svg');
  assert.match(intro,/Premium intro aura v3/);
  assert.match(intro,/maPremiumAura/);
  assert.match(daily,/daily-checkin-toggle/);
  assert.match(html,/og-image-v3\.png\?v=2/);
  assert.match(og,/MatchApp TV Ai/);
  assert.match(og,/What to watch tonight, decided by AI/);
});

test('Lazy Mode remains functional without mutating the visible Home header',()=>{
  const lazy=read('lazy.js');
  assert.doesNotMatch(lazy,/document\.querySelector\('#mh-topbox \.mh-deck'\)/);
  assert.doesNotMatch(lazy,/lazy-bar--header/);
  assert.match(lazy,/bar\.hidden = true/);
  assert.match(lazy,/document\.body\.appendChild\(bar\)/);
});

test('homepage rails use the reviewed faster, motion-safe cadence',()=>{
  const rails=read('right-glide-rails.js');
  const news=read('latest-news.js');
  assert.match(rails,/const SPEED=\.022/);
  assert.match(rails,/prefers-reduced-motion/);
  assert.match(rails,/max-width: 1024px/);
  assert.match(rails,/setInterval\(tick,1450\)/);
  assert.match(news,/const AUTO_MS=1900/);
});


test('canonical top box keeps the logo animated and all controls visible',()=>{
  const ia=read('matchapp-ia.css');
  const lazy=read('lazy.js');
  assert.match(ia,/CANONICAL HOME SHELL — SINGLE OWNER/);
  assert.match(ia,/ma-brand-orb-stage/);
  assert.match(ia,/nav\.mh-deck/);
  assert.match(ia,/flex-wrap:wrap!important/);
  assert.match(lazy,/bar\.hidden = true/);
});

test('fresh Home loads stay at top until the visitor interacts',()=>{
  const html=read('index.html');
  const origin=read('page-origin.js');
  assert.match(html,/page-origin\.js\?v=20260919-origin3/);
  assert.match(origin,/scrollRestoration='manual'/);
  assert.match(origin,/const topTimer=setInterval\(top,50\)/);
  assert.match(origin,/Element\.prototype\.scrollIntoView=function/);
  assert.match(origin,/HTMLElement\.prototype\.focus=function/);
  assert.match(origin,/userInteracted=true/);
});


test('premium Home header distributes controls and keeps Kids Mode visible',()=>{
 const css=read('matchapp-ia.css'),js=read('matchapp-ia.js'),html=read('index.html');
 assert.match(css,/HOME HEADER PREMIUM GRID V2/);assert.match(css,/grid-template-columns:minmax\(330px,.9fr\) minmax\(520px,1.35fr\)/);
 assert.match(css,/#profile-link-tab #nav-profile-text\{display:none!important\}/);assert.match(js,/matchapp-kids-entry/);assert.match(js,/kids-logo-sm\.jpeg/);
 assert.match(html,/onboarding-tour\.js\?v=20260919-tour2/);assert.match(html,/catalog-plus\.js\?v=20260919-catalog\d+/);
});
test('first visitor walkthrough auto reveals UI and ends at the registration gateway',()=>{
 const tour=read('onboarding-tour.js'),register=read('register.html');assert.match(tour,/const VERSION='v2'/);assert.match(tour,/MatchAppScrollGate\?\.unlock/);
 assert.match(tour,/scrollIntoView/);assert.match(tour,/crit-open/);assert.match(tour,/finish:'Got it'/);assert.match(tour,/register\.html\?from=tour/);
 assert.doesNotMatch(register,/http-equiv="refresh"/i);assert.match(register,/href="\/\?openAuth=1"/);assert.match(register,/Back to Home — Match or Ask Ai/);
});
test('catalog expansion stocks music artists, Apple Music playlists and thin international shelves',()=>{
 const cat=read('catalog-plus.js'),html=read('index.html'),app=read('app.js');assert.match(cat,/Apple Music playlist/);assert.match(cat,/music artist/);
 assert.match(cat,/platform:"GoodShort"/);assert.match(cat,/platform:"WeTV"/);assert.match(cat,/platform:"iQIYI"/);assert.match(cat,/platform:"Viu"/);assert.match(cat,/platform:"Tubi"/);
 assert.match(html,/value="music artist"/);assert.match(app,/broaden-platform/);assert.match(app,/Closest available · secondary filters broadened/);
});

test('every selectable thin platform is stocked by the expanded catalog',()=>{
 const cat=read('catalog-plus.js');
 for(const platform of ['FlexTV','Hotstar','Pluto TV','GoodShort','WeTV','iQIYI','Viu','Tubi','Apple TV+','Apple Music','Audible']){
   assert.ok(cat.includes('platform:"'+platform+'"'),platform+' must have at least one real catalog entry');
 }
});