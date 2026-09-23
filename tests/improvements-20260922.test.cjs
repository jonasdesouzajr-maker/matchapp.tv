const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const LANGS=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
test('improvement notice stays off Home while remaining available on Ask AI and Kids',()=>{
  const js=read('trust-notice.js'),css=read('trust-notice.css');
  const home=read('index.html');
  assert.doesNotMatch(home,/class="ma-trust" data-ma-trust role="note"/);
  assert.doesNotMatch(home,/trust-notice\.(?:css|js)\?v=/);
  for(const f of ['discover.html','kids/index.html']){const h=read(f);assert.match(h,/class="ma-trust" data-ma-trust role="note"/,f);assert.match(h,/trust-notice\.css\?v=/,f);assert.match(h,/trust-notice\.js\?v=/,f);}
  for(const l of LANGS)assert.ok(js.includes("'"+l+"':"),l);
  assert.match(css,/@keyframes maTrustBlink\{0%,100%\{opacity:1\}50%\{opacity:\.25\}\}/);
  assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/body\.kids-paused \.ma-trust \.ma-trust-dot\{animation:none!important\}/);
  assert.doesNotMatch(js,/requestAnimationFrame|setInterval|setTimeout/);
});
test('match insights stay informational, bounded and translated',()=>{
  const js=read('match-insights.js').replace(/\/\*[\s\S]*?\*\//g,''),home=read('index.html');
  assert.match(home,/match-insights\.js\?v=/);
  assert.doesNotMatch(js,/\.disabled\s*=|MutationObserver|requestAnimationFrame|setInterval/);
  for(const l of LANGS)assert.ok(js.includes("'"+l+"':"),l);
  assert.match(js,/matchapp:newmatch/);assert.match(js,/\/discover\.html\?title=/);
});
test('Surprise Me uses Taste DNA only inside the already-eligible pool',()=>{
  const app=read('app.js');const fn=app.slice(app.indexOf('function pickFromCatalog('),app.indexOf('function pickRecycledCatalog('));
  assert.match(fn,/window\.tasteBiasPool\(pool, 'any', 'any'\)/);assert.match(fn,/biased\.length < pool\.length/);
});
test('Kids joy celebration is one-shot, bounded and respects calm settings',()=>{
  const js=read('kids/kids-joy.js').replace(/\/\*[\s\S]*?\*\//g,''),css=read('kids/kids.css'),kids=read('kids/kids.js');
  assert.match(js,/const BITS = 16;/);assert.doesNotMatch(js,/requestAnimationFrame|setInterval|MutationObserver/);
  assert.match(js,/addEventListener\('close', clear\)/);assert.match(js,/kids-paused/);assert.match(js,/prefers-reduced-motion/);
  assert.match(css,/\*,\*::before,\*::after\{animation:none!important;transition:none!important;scroll-behavior:auto!important\}/);
  assert.doesNotMatch(kids,/playKidsCelebrate|requestAnimationFrame/);
});
test('Kids guardian gates adult exits, keeps the timer off by default and syncs only curated favorites',()=>{
  const g=read('kids/kids-guardian.js'),kids=read('kids/kids.js'),html=read('kids/index.html');
  assert.match(html,/kids-guardian\.js\?v=/);assert.match(html,/kids-joy\.js\?v=/);
  assert.match(g,/#kids-exit,#kids-account-help/);assert.match(g,/LIMITS\.includes\(n\) \? n : 0/);
  assert.match(g,/kids_favorites/);assert.match(g,/const requestFrame = window\.requestAnimationFrame/);assert.match(g,/if \(progress >= 1\)/);assert.match(g,/cancelFrame\(holdFrame\)/);assert.doesNotMatch(g,/MutationObserver\(\(\)/);
  assert.match(kids,/allowed\.has\(key\)/);assert.match(kids,/window\.KidsFavorites=Object\.freeze/);
  for(const l of LANGS)assert.ok(g.includes("'"+l+"':"),l);
  const sql=read('supabase/migrations/20260922100000_kids_favorites_sync.sql');
  assert.match(sql,/jsonb_array_length\(kids_favorites\) <= 100/);assert.match(sql,/grant select \(kids_favorites\), update \(kids_favorites\)/);
});
test('Ask AI shows its cost and honours hard exclusions for known titles',()=>{
  const js=read('discover.js');
  assert.match(js,/function paintAiSendCost\(\)/);assert.match(js,/entryPassesPreferenceExclusions\(entry\)/);
  for(const l of LANGS)assert.ok(js.includes('"'+l+'":'),l);
});
test('Home keywords are a short evergreen set and the heading typo is fixed',()=>{
  const home=read('index.html');const kw=home.match(/<meta name="keywords" content="([^"]*)"/)[1].split(',');
  assert.ok(kw.length<=40,String(kw.length));assert.match(home,/K-drama/);assert.doesNotMatch(kw.join(','),/September \d+ 2026/);
  assert.match(home,/>Find what to watch here</);assert.doesNotMatch(read('premium-cinema.js'),/FInd/);
});
test('Kids catalogue candidates are staged for review and never loaded',()=>{
  const c=JSON.parse(read('docs/kids-catalogue-candidates-2026-09.json'));
  assert.ok(c.candidates.length>=30);assert.ok(c.candidates.every(x=>x.status==='pending-review'));
  assert.doesNotMatch(read('kids/kids.js')+read('kids/index.html'),/kids-catalogue-candidates/);
});
