const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('central final wiring loads integrity modules deterministically',()=>{
  const s=read('final-wiring.js');
  assert.match(s,/s\.async=false/);
  assert.match(s,/production-hardening\.js/);
  assert.match(s,/shown-history\.js/);
  assert.match(s,/human-conversation\.js/);
  assert.match(s,/install-corner\.js/);
  assert.match(s,/match-packs-section/);
});

test('shown titles are permanent for guests and merge into signed-in history',()=>{
  const s=read('matching-policy.js');
  assert.match(s,/const GUEST_ID = 'guest'/);
  assert.match(s,/match_recentTitles/);
  assert.match(s,/guestHistory\.forEach/);
  assert.match(s,/remember\(i,'shown',false\)/);
  assert.match(s,/if\(owner\) pending\.push\(clean\)/);
});

test('visual title identity wins over incidental music tags',()=>{
  const s=read('production-hardening.js');
  const series=s.indexOf("return'series'");
  const music=s.indexOf("return'music'");
  assert.ok(series>0&&music>series,'series/movie classification must run before music classification');
  assert.match(s,/if\(!audioIntent&&isAudioType\(rawType\)\)return null/);
  assert.match(s,/platform:'any'/,'unverified visual AI results must not claim a streaming provider');
});

test('PWA progress uses lifecycle stages and never elapsed-time fake progress',()=>{
  const s=read('install-progress.js');
  assert.match(s,/stage\(18,/);
  assert.match(s,/stage\(68,/);
  assert.match(s,/stage\(86,/);
  assert.match(s,/stage\(100,/);
  assert.doesNotMatch(s,/easeTo\(/);
  assert.match(s,/updatefound/);
  assert.match(s,/controllerchange/);
});

test('crawlability and AdSense publisher declaration remain correct',()=>{
  assert.equal(read('ads.txt').trim(),'google.com, pub-9541435081010948, DIRECT, f08c47fec0942fa0');
  const robots=read('robots.txt');
  assert.match(robots,/User-agent: \*/);
  assert.match(robots,/Allow: \/\s/);
  assert.match(robots,/Sitemap: https:\/\/matchapp\.tv\/sitemap\.xml/);
});

test('functional releases refresh the sitemap',()=>{
  const w=read('.github/workflows/sitemap-refresh.yml');
  assert.match(w,/paths:\s*\n\s*- release\.json/);
  assert.match(w,/node tools\/update-sitemap\.js/);
  assert.match(w,/git add sitemap\.xml/);
  assert.match(read('package.json'),/tools\/update-sitemap\.js/);
});
