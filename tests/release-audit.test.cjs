const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('behavioral pages load one current shared runtime instead of stale cache keys',()=>{
  const version=(page,file)=>{
    const html=read(page),marker='/'+file+'?v=';
    const at=html.indexOf(marker);
    if(at<0)return '';
    return html.slice(at+marker.length).split(/["'\s<]/,1)[0];
  };
  const freshEntryPages=['index.html','discover.html'];
  const preservedPages=['profile/profile.html','pricing/pricing.html','purchase.html','friends.html','callback.html','oauth/consent.html','events-archive.html'];
  const original='20260926-catalogscale1&amp;auth=20260926-emailsingle1&amp;welcome=20260926-welcome1&amp;login=20260926-loginfix1&amp;trial=20260926-guesttrial1&amp;openai=20260927-criteria1&amp;global=20260927-ranked1';
  // Matching entry points receive session recovery; account/checkout URLs stay stable.
  assert.deepEqual([...new Set(freshEntryPages.map(p=>version(p,'app.js')))], [original+'&amp;mobilefresh=20260927-1&amp;providerfix=20260927-1&amp;poster=20260927-mobile1&amp;matching=20260928-session1&amp;topic=20260928-1&amp;formatfix=20260929-1&amp;fallbackfix=20260929-1&amp;recovery=20260929-2&amp;desktop=20260929-details1&amp;series=20260929-horrortv2&amp;language=20260930-fix2']);
  assert.equal(version('together.html','app.js'),original+'&amp;matching=20260928-session1&amp;formatfix=20260929-1&amp;fallbackfix=20260929-2');
  assert.deepEqual([...new Set(preservedPages.map(p=>version(p,'app.js')))], [original]);
  for(const p of freshEntryPages){const h=read(p);assert(h.includes('/match-ai-rank.js?v=20260927-ranked1-mobilefresh1'));assert(h.indexOf('/match-ai-rank.js?v=')<h.indexOf('/app.js?v='));}
  for(const p of preservedPages){const h=read(p);assert(h.includes('/match-ai-rank.js?v=20260927-ranked1'));assert(h.indexOf('/match-ai-rank.js?v=')<h.indexOf('/app.js?v='));}
  const policyPages=['index.html','discover.html','profile/profile.html','together.html','friends.html'];
  assert.deepEqual([...new Set(policyPages.map(p=>version(p,'matching-policy.js')))],['20260926-conflicts2']);
  assert.equal(version('kids/index.html','matching-policy.js'),'20260924-runtime1');
  const buildPages=['index.html','together.html','pricing/pricing.html','friends.html','events-archive.html'];
  assert.equal(version('index.html','build-meta.js'),'20260926-publicproof1&amp;seo=20260928-2&amp;release=20260929-5&amp;intent=20260930-1&amp;installfix=20260930-1&amp;icon=20260930-space1');
  for(const page of buildPages.filter(p=>p!=='index.html')){
    assert.equal(version(page,'build-meta.js'),'20260926-publicproof1'+(page==='events-archive.html'?'':'&amp;installfix=20260930-1&amp;icon=20260930-space1'));
  }
  assert.match(read('pricing/pricing.html'),/\/pricing\.js\?v=\d{8}-[\w-]+/);
  assert.match(read('purchase.html'),/\/purchase\.js\?v=\d{8}-[\w-]+/);
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

test('both Android shells are synchronized and target the current Play API level',()=>{
  const mainGradle=read('android-studio/app/build.gradle.kts');
  const kidsGradle=read('android-studio/kidsapp/build.gradle.kts');
  const main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
  const kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
  for(const gradle of [mainGradle,kidsGradle]){
    assert.match(gradle,/compileSdk = 36/);
    assert.match(gradle,/targetSdk = 36/);
    assert.match(gradle,/versionCode = \d+/);
    assert.match(gradle,/versionName = "\d+\.\d+\.\d+"/);
  }
  assert.match(main,/appBuild=\d+/);
  assert.match(kids,/appBuild=\d+/);
  assert.match(main,/MATCHAPP_ANDROID_KIDS_BLOCKED/);
  assert.match(kids,/MATCHAPP_ANDROID_KIDS_ONLY/);
});
