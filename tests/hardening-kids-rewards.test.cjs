const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Kids result celebration is lightweight and cannot own scroll/compositing',()=>{
  const js=read('kids/kids.js'),css=read('kids/kids.css');
  assert.match(js,/requestAnimationFrame\(\(\)=>\{ if\(dialog\.open&&currentWatchItem===item\) playKidsCelebrate\(\); \}\)/);
  assert.match(js,/const confettiCount=compact\?10:16/);
  assert.doesNotMatch(css,/\.kids-watch-dialog::backdrop\{[^}]*blur\(/);
  assert.doesNotMatch(css,/\.kids-celebrate\{[^}]*translateZ/);
  assert.doesNotMatch(css,/\.kids-balloon\{will-change:/);
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
  assert.match(read('kids/index.html'),/kids\.css\?v=20260921-hardening1/);
  assert.match(read('kids/index.html'),/kids\/account\.js\?v=20260921-hardening1/);
  assert.match(read('kids/index.html'),/kids\/kids\.js\?v=20260921-hardening1/);
});
