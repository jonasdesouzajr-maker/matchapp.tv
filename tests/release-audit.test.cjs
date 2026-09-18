const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('behavioral pages load the current shared runtime instead of stale cache keys',()=>{
  const appPages=[
    'discover.html','profile/profile.html','together.html','pricing/pricing.html',
    'purchase.html','friends.html','callback.html','oauth/consent.html','events-archive.html'
  ];
  for(const p of appPages) assert.match(read(p),/\/app\.js\?v=210/,p);
  for(const p of ['discover.html','profile/profile.html','together.html','friends.html','kids/index.html'])
    assert.match(read(p),/\/matching-policy\.js\?v=200/,p);
  for(const p of ['together.html','pricing/pricing.html','friends.html','events-archive.html'])
    assert.match(read(p),/\/build-meta\.js\?v=202/,p);
  assert.match(read('pricing/pricing.html'),/\/pricing\.js\?v=20260918-audit1/);
  assert.match(read('purchase.html'),/\/purchase\.js\?v=20260918-audit1/);
});

test('public quota copy matches the shared included-action architecture',()=>{
  const home=read('index.html'),locale=read('i18n.js'),app=read('app.js');
  assert.match(home,/3 included AI actions daily · Register free for 5/);
  assert.doesNotMatch(home,/3 free matches daily/i);
  const free=[...locale.matchAll(/'how\.freeline':\s*'((?:\\.|[^'])*)'/g)].map(m=>m[1]);
  const checking=[...locale.matchAll(/'quota\.checking':\s*'((?:\\.|[^'])*)'/g)].map(m=>m[1]);
  assert.equal(free.length,14);
  assert.equal(checking.length,14);
  assert(free.every(v=>!/free matches daily|matches grátis por dia|matches gratis al día|matchs gratuits par jour/i.test(v)));
  assert.match(app,/included AI actions used/);
});

test('both Android shells are synchronized to the audited 1.1.8 release',()=>{
  const mainGradle=read('android-studio/app/build.gradle.kts');
  const kidsGradle=read('android-studio/kidsapp/build.gradle.kts');
  const main=read('android-studio/app/src/main/java/tv/matchapp/app/MainActivity.kt');
  const kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
  for(const gradle of [mainGradle,kidsGradle]){
    assert.match(gradle,/versionCode = 10/);
    assert.match(gradle,/versionName = "1\.1\.8"/);
  }
  assert.match(main,/appBuild=10/);
  assert.match(kids,/appBuild=10/);
  assert.match(main,/MATCHAPP_ANDROID_KIDS_DISABLED/);
  assert.match(kids,/MATCHAPP_ANDROID_KIDS_ONLY/);
});
