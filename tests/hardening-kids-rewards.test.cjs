const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Kids Mode runs with no animation or smooth-scroll effects',()=>{
  const js=read('kids/kids.js'),css=read('kids/kids.css'),voice=read('kids/voice-feedback.js');
  assert.doesNotMatch(js,/playKidsCelebrate|requestAnimationFrame/);
  assert.doesNotMatch(js,/behavior\s*:\s*['"]smooth['"]/);
  assert.doesNotMatch(voice,/animation\s*:|@keyframes|requestAnimationFrame|behavior\s*:\s*['"]smooth['"]|will-change/);
  assert.match(css,/emergency Kids stability lock/);
  assert.match(css,/\*,\*::before,\*::after\{animation:none!important;transition:none!important;scroll-behavior:auto!important\}/);
  assert.match(css,/\.kids-watch-dialog::backdrop\{backdrop-filter:none!important;-webkit-backdrop-filter:none!important\}/);
  assert.match(css,/\.kids-celebrate\{display:none!important\}/);
});
test('main and Kids match paths never recycle a shown title',()=>{
  const app=read('app.js'),kids=read('kids/kids.js');
  const start=app.indexOf('window.triggerMatch = async function');
  const end=app.indexOf('// THE RENDER ENGINE',start);
  const trigger=app.slice(start,end);
  assert.doesNotMatch(trigger,/pickRecycledCatalog\(/);
  assert.doesNotMatch(trigger,/pickGuaranteedCatalog\(/);
  assert.match(app,/window\.matchPolicy\?\.remember\([\s\S]*?'shown'\)/);
  assert.doesNotMatch(kids,/const source=unseen\.length\?unseen:pool/);
  assert.match(kids,/window\.matchPolicy\?\.remember\([\s\S]*?'shown'\)/);
});

test('share rewards accumulate as persistent Match currency',()=>{
  const app=read('app.js'),share=read('share.js'),kidsAccount=read('kids/account.js'),migration=read('supabase/migrations/20260921210945_persistent_share_match_rewards.sql');
  assert.match(app,/match_guestBonusMatches/);
  assert.match(app,/purchased_matches: remainingExtras/);
  assert.match(share,/match_guestBonusMatches/);
  assert.doesNotMatch(share,/match_dailyCount'\), Math\.max\(0, current - 1\)/);
  assert.match(kidsAccount,/rpc\('claim_share_reward'\)/);
  assert.match(migration,/purchased_matches = coalesce\(purchased_matches, 0\) \+ 1/);
  assert.match(migration,/revoke execute on function public\.claim_share_reward\(\) from public, anon/);
});

test('result reveal starts at the top and Kids social choices are restored',()=>{
  const app=read('app.js'),kids=read('kids/index.html');
  assert.match(app,/block: 'start'/);
  assert.match(kids,/data-kids-social="whatsapp"/);
  assert.match(kids,/data-kids-social="facebook"/);
  assert.match(kids,/data-kids-social="x"/);
  assert.match(kids,/data-kids-social="telegram"/);
  assert.match(kids,/id="kids-share-confirm"/);
});

test('cache keys force the hardening bundle onto every device wrapper',()=>{
  assert.match(read('index.html'),/app\.js\?v=20260921-hardening1/);
  assert.match(read('index.html'),/share\.js\?v=20260921-hardening1/);
  assert.match(read('kids/index.html'),/kids\.css\?v=20260921-static1/);
  assert.match(read('kids/index.html'),/kids\/account\.js\?v=20260921-hardening1/);
  assert.match(read('kids/index.html'),/kids\/voice-feedback\.js\?v=20260921-static1/);
  assert.match(read('kids/index.html'),/kids\/kids\.js\?v=20260921-static1/);
});


test('Kids share reward and confirmation copy covers all supported languages',()=>{
  const copy=read('kids/match-copy.js');
  for(const token of ["en:[","'pt-BR':[","es:[","fr:[","de:[","it:[","tr:[","ru:[","ar:[","hi:[","id:[","ja:[","ko:[","zh:["]){
    assert.ok(copy.includes(token),'share copy missing for '+token);
  }
  for(const key of ['shareConfirm','shareFinish','shareReward','shareLimit']) assert.match(copy,new RegExp(key+':values\\[\\d\\]'));
  assert.match(read('kids/kids.js'),/tr\('shareReward'\)/);
  assert.match(read('kids/kids.js'),/tr\('shareFinish'\)/);
});


test('Kids result enrichment cannot observe and rewrite its own dialog subtree',()=>{
  const media=read('catalog-media.js');
  assert.doesNotMatch(media,/observeSurface\(kids\s*,\s*enrichKids\)/);
  assert.doesNotMatch(media,/new MutationObserver[\s\S]{0,1800}kids-watch-dialog/);
  assert.match(media,/document\.addEventListener\('matchapp:kids-result',queueKidsEnrich\)/);
  assert.match(media,/if\(!dialog\|\|!dialog\.open\)return/);
  assert.match(media,/matchappPreviewSignature/);
  assert.match(media,/if\(kids&&host\.dataset\.matchappPreviewSignature===previewSignature\)return/);
  assert.match(media,/clearTimeout\(kidsEnrichTimer\)/);
  assert.match(media,/setTimeout\(\(\)=>\{[\s\S]*enrichKids\(\)\.catch/);
});
