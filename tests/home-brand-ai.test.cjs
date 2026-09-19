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
  assert.match(html,/matchapp-ia\.css\?v=20260919-ia\d+/);
  assert.match(html,/settings\.js\?v=20260919-/);
  for(const legacy of ['home-premium.css','home-brand.css','home-mobile.css','matchapp-ui-v3.css','redesign.css','brand-corrections.css','brand-corrections.js','home-ux-lock.css','desktop-home-restore.css','home-ux-lock.js','home-layout-guard.js']){
    assert.ok(!html.includes(legacy),legacy+' must not load on Home');
  }
  assert.ok(!settings.includes('home-premium.css'),'settings must not late-inject legacy Home CSS');
  assert.match(ia,/CANONICAL HOME SHELL — SINGLE OWNER/);
  assert.match(html,/matchapp-orb-live\.svg\?v=20260919-orb1/);
});

test('Home header is static from first paint and cannot re-enter the shared legacy cascade',()=>{
  const html=read('index.html');
  const js=read('matchapp-ia.js');
  assert.match(html,/id="mh-topbox" class="app-header ma-home-header"/);
  assert.match(html,/matchapp-ia\\.js\\?v=20260919-ia25/);
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
