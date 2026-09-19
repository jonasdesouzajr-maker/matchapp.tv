const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('premium homepage wins first paint and late runtime cascade',()=>{
  const html=read('index.html');
  const settings=read('settings.js');
  const home=read('home-premium.css');
  assert.match(html,/home-premium\\.css\\?v=20260919-reference3/);
  assert.match(html,/settings\\.js\\?v=20260919-premium2/);
  assert.match(settings,/home-premium\\.css\\?v=20260919-reference3/);
  assert.match(settings,/dataset\.matchappHomeFinal='true'/);
  assert.match(home,/Premium density v2/);
  assert.match(home,/maLogoStarOrbit/);
  assert.match(home,/matchapp-logo-animated-transparent\.svg/);
});

test('homepage AI shortcut remains a fresh concierge chat',()=>{
  const html=read('index.html');
  const js=read('discover.js');
  assert.match(html,/class="home-ai-link" href="\/discover\.html\?focus=start&new=1"/);
  assert.match(html,/home-ai-default"[^>]*>Ai<\/span>/);
  assert.match(html,/home-ai-pt"[^>]*>iA<\/span>/);
  assert.match(js,/const forceNew = getQueryParam\('new'\) === '1'/);
  assert.match(js,/currentThread = null/);
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

test('Lazy Mode is mounted into the premium top app bar',()=>{
  const lazy=read('lazy.js');
  assert.match(lazy,/document\.querySelector\('#mh-topbox \.mh-deck'\)/);
  assert.match(lazy,/lazy-bar--header/);
});

test('homepage rails use the reviewed faster, motion-safe cadence',()=>{
  const rails=read('right-glide-rails.js');
  const news=read('latest-news.js');
  assert.match(rails,/const SPEED=\.022/);
  assert.match(rails,/prefers-reduced-motion/);
  assert.match(news,/const AUTO_MS=1900/);
});


test('approved reference top box scopes orbit animation to the logo only',()=>{
  const home=read('home-premium.css');
  const lazy=read('lazy.js');
  assert.match(home,/Reference top box v3/);
  assert.match(home,/brand-logo-placeholder::after/);
  assert.match(home,/maReferenceStarOrbit/);
  assert.match(home,/home-brand-home::before,[\s\S]*home-brand-home::after[\s\S]*content:none!important/);
  assert.match(home,/matchapp-logo-8k\.png\?v=20260919-reference3/);
  assert.match(home,/lazy-bar--header/);
  assert.match(lazy,/deck\.insertBefore\(bar,accountAnchor\)/);
});
