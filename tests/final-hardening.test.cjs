const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('production loader wires integrity, conversational voice and compact install UI',()=>{
  const s=read('settings.js');
  for(const needle of ["css('/final-wiring.css')","js('/install-corner.js')","js('/production-hardening.js')","js('/human-conversation.js')"]){
    assert.ok(s.includes(needle),`missing ${needle}`);
  }
  assert.match(s,/s\.async=false/,'dynamic production scripts must preserve insertion order');
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

test('PWA progress uses real lifecycle stages and never moves backwards',()=>{
  const s=read('install-progress.js');
  assert.match(s,/stage\(18,/);
  assert.match(s,/stage\(68,/);
  assert.match(s,/stage\(86,/);
  assert.match(s,/stage\(100,/);
  assert.doesNotMatch(s,/easeTo\(/,'elapsed-time fake progress must not return');
  assert.match(s,/updatefound/);
  assert.match(s,/controllerchange/);
});

test('crawlability and AdSense publisher declaration stay intact',()=>{
  assert.equal(read('ads.txt').trim(),'google.com, pub-9541435081010948, DIRECT, f08c47fec0942fa0');
  const robots=read('robots.txt');
  assert.match(robots,/User-agent: \*/);
  assert.match(robots,/Allow: \/\s/);
  assert.match(robots,/Sitemap: https:\/\/matchapp\.tv\/sitemap\.xml/);
});

test('functional release refreshes sitemap through the release workflow',()=>{
  const w=read('.github/workflows/sitemap-refresh.yml');
  assert.match(w,/paths:\s*\n\s*- release\.json/);
  assert.match(w,/node tools\/update-sitemap\.js/);
  assert.match(w,/git add sitemap\.xml/);
});
