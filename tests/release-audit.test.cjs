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
  const appPages=['index.html','discover.html','profile/profile.html','together.html','pricing/pricing.html','purchase.html','friends.html','callback.html','oauth/consent.html','events-archive.html'];
  assert.deepEqual([...new Set(appPages.map(p=>version(p,'app.js')))],['20260925-matchrestore2']);
  const policyPages=['index.html','discover.html','profile/profile.html','together.html','friends.html','kids/index.html'];
  assert.deepEqual([...new Set(policyPages.map(p=>version(p,'matching-policy.js')))],['20260924-runtime1']);
  const buildPages=['index.html','together.html','pricing/pricing.html','friends.html','events-archive.html'];
  assert.deepEqual([...new Set(buildPages.map(p=>version(p,'build-meta.js')))],['20260924-runtime2']);
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
