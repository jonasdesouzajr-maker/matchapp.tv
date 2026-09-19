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
  assert.match(html,/matchapp-ia\.css\?v=20260919-ia18/);
  assert.match(html,/settings\.js\?v=20260919-ia18/);
  for(const legacy of ['home-premium.css','home-brand.css','home-ux-lock.css','desktop-home-restore.css','home-ux-lock.js','home-layout-guard.js']){
    assert.ok(!html.includes(legacy),legacy+' must not load on Home');
  }
  assert.ok(!settings.includes('home-premium.css'),'settings must not late-inject legacy Home CSS');
  assert.match(ia,/CANONICAL HOME SHELL — SINGLE OWNER/);
  assert.match(html,/matchapp-orb-live\.svg\?v=20260919-orb1/);
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
  assert.match(news,/const AUTO_MS=1900/);
});


test('canonical top box keeps the logo animated and all controls visible',()=>{
  const ia=read('matchapp-ia.css');
  const lazy=read('lazy.js');
  assert.match(ia,/CANONICAL HOME SHELL — SINGLE OWNER/);
  assert.match(ia,/ma-brand-orb-stage/);
  assert.match(ia,/nav\.mh-deck/);
  assert.match(ia,/flex-wrap:wrap!important/);
  assert.match(lazy,/deck\.insertBefore\(bar,accountAnchor\)/);
});

test('normal Home refresh starts at the top while intentional deep links are preserved',()=>{
  const html=read('index.html');
  assert.match(html,/id="matchapp-home-scroll-origin"/);
  assert.match(html,/scrollRestoration='manual'/);
  assert.match(html,/window\.scrollTo\(\{top:0,left:0,behavior:'auto'\}\)/);
  assert.match(html,/Boolean\(location\.hash\)/);
  assert.match(html,/q\.get\('ask'\)==='1'/);
  assert.match(html,/q\.get\('news'\)/);
});
