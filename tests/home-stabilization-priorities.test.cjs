const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('stabilized home preserves canonical VIP 10/day public copy',()=>{
  const files=['index.html','pricing/pricing.html','profile/profile.html','purchase.js'];
  for(const file of files){
    const s=read(file);
    assert.doesNotMatch(s,/Unlimited AI Matches Daily|Unlimited Matches/i,file);
  }
  assert.match(read('index.html'),/10 matches every day/i);
  assert.match(read('pricing/pricing.html'),/10 AI matches per day/i);
  assert.match(read('build-meta.js'),/const vipDaily = 10/);
});

test('initial match form shows three core filters and keeps advanced filters in More Filters',()=>{
  const s=read('index.html');
  const more=s.indexOf('<details class="match-more-filters">');
  const moreEnd=s.indexOf('</details>',more);
  assert.ok(more>0&&moreEnd>more);
  for(const id of ['q-category','q-mood','q-platform']) assert.ok(s.indexOf('id="'+id+'"')<more,id+' must stay visible before More Filters');
  for(const id of ['q-vibe','q-decade','q-age']) {
    const pos=s.indexOf('id="'+id+'"');
    assert.ok(pos>more&&pos<moreEnd,id+' must stay inside More Filters');
  }
});

test('home contains no unfinished-product notices',()=>{
  const s=read('index.html');
  assert.doesNotMatch(s,/Open on Google Chrome for the Best Experience/i);
  assert.doesNotMatch(s,/Big upgrades rolling out/i);
  assert.doesNotMatch(s,/odd rough edge/i);
});

test('Match Together stays visible before premiere and event editorial content',()=>{
  const s=read('index.html');
  const together=s.indexOf('<a href="/together.html" class="tg-entry">');
  const premiere=s.indexOf('<details id="premiere-disclosure"');
  const events=s.indexOf('<section id="global-events"');
  assert.ok(together>0&&premiere>together&&events>premiere);
  const open=s.lastIndexOf('<details',together);
  const close=s.lastIndexOf('</details>',together);
  assert.ok(close>=open,'Match Together must not be trapped inside an earlier open details element');
});

test('core CTA, quota loading, trending and separate AI experiences remain intact',()=>{
  const s=read('index.html');
  assert.match(s,/Find My Match/);
  assert.match(s,/Checking daily matches/i);
  assert.doesNotMatch(s,/>\s*0 left today\s*</i);
  assert.match(s,/Latest titles trending right now/i);
  assert.match(s,/Talk to our Ai/);
  assert.match(s,/Search or Ask Anything/);
});

test('both Android Studio apps carry stabilized release marker without changing route separation',()=>{
  const mainGradle=read('android-studio/app/build.gradle.kts');
  const kidsGradle=read('android-studio/kidsapp/build.gradle.kts');
  const main=read('android-studio/app/src/main/java/tv/matchapp/app/MainActivity.kt');
  const kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');
  assert.match(mainGradle,/versionCode = 4/);
  assert.match(mainGradle,/versionName = "1\.1\.2"/);
  assert.match(kidsGradle,/versionCode = 4/);
  assert.match(kidsGradle,/versionName = "1\.1\.2"/);
  assert.match(main,/https:\/\/matchapp\.tv\/\?utm_source=android_app&appBuild=4/);
  assert.match(kids,/https:\/\/matchapp\.tv\/kids\/\?utm_source=android_kids_app&appBuild=4/);
  assert.match(main,/MATCHAPP_ANDROID_KIDS_DISABLED/);
  assert.match(kids,/MATCHAPP_ANDROID_KIDS_ONLY/);
});
