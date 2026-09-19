const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('homepage stabilization keeps the core path simple and production-ready',()=>{
  const html=read('index.html');

  assert.doesNotMatch(html,/id="chrome-notice"/);
  assert.doesNotMatch(html,/id="upgrade-ribbon"/);
  assert.doesNotMatch(html,/Big upgrades rolling out|odd rough edge|Open on Google Chrome for the Best Experience/);

  const primary=html.match(/<div class="q-grid q-grid--primary">([\s\S]*?)<\/div>\s*<details class="match-more-filters">/)?.[1]||'';
  assert.match(primary,/id="q-category"/);
  assert.match(primary,/id="q-mood"/);
  assert.match(primary,/id="q-platform"/);
  assert.doesNotMatch(primary,/id="q-vibe"|id="q-decade"|id="q-rating"/);

  const advanced=html.match(/<details class="match-more-filters">([\s\S]*?)<\/details>/)?.[1]||'';
  assert.match(advanced,/id="q-vibe"/);
  assert.match(advanced,/id="q-decade"/);
  assert.match(advanced,/id="q-rating"/);
  assert.doesNotMatch(advanced,/id="q-platform"/);
  assert.match(html,/data-i18n="q\.submit">⚡ Find My Match<\/button>/);

  const search=html.indexOf('id="search-box"');
  const together=html.indexOf('<!-- MATCH TOGETHER ENTRY -->');
  const editorial=html.indexOf('id="spotlight-ahs13"');
  assert(search>=0&&together>search&&editorial>together,'Match Together must appear before editorial/event content');

  assert.match(html,/Latest titles trending right now/);
  assert.match(html,/class="top-ai-launch"/);
  assert.match(html,/id="search-box"/);
});

test('VIP public/runtime copy matches the server-enforced 10 per day rule',()=>{
  const pricing=read('pricing/pricing.html');
  const redirect=read('pricing/index.html');
  const purchase=read('purchase.js');
  const audit=read('final-audit.js');
  const locale=read('i18n.js');

  for(const source of [pricing,redirect,purchase,audit]){
    assert.doesNotMatch(source,/Unlock Unlimited AI Concierge|unlock infinite matches|Unlimited AI Matches Daily|unlimited Matches|Unlimited VIP matches/i);
  }
  assert.match(pricing,/10 included AI actions daily/);
  assert.match(pricing,/10 AI actions per day/);
  assert.match(purchase,/10 included AI actions per day/);
  assert.doesNotMatch(audit,/textContent='∞'/);

  const vipClaims=[...locale.matchAll(/'pricing\.vipm\.f1':\s*'([^']+)'/g)].map(m=>m[1]);
  assert.equal(vipClaims.length,14);
  assert.equal(vipClaims.every(v=>/10/.test(v)),true);
});

test('match CTA and neutral quota loading state are localized without merging AI experiences',()=>{
  const html=read('index.html');
  const locale=read('i18n.js');

  const ctas=[...locale.matchAll(/'q\.submit':\s*'([^']+)'/g)].map(m=>m[1]);
  assert.equal(ctas.length,14);
  assert.equal(ctas.every(v=>!/concierge|conserje|консьерж|管家|컨시어지/i.test(v)),true);

  const loading=[...locale.matchAll(/'quota\.checking':\s*'([^']+)'/g)].map(m=>m[1]);
  assert.equal(loading.length,14);
  assert.match(html,/id="result-quota-num">…<\/span>/);
  assert.match(html,/data-i18n="quota\.checking">Checking daily allowance…<\/span>/);

  assert.match(html,/Talk to our Ai/);
  assert.match(html,/id="search-box"/);
});

test('both Android Studio modules point to current live surfaces for AAB build',()=>{
  const mainGradle=read('android-studio/app/build.gradle.kts');
  const kidsGradle=read('android-studio/kidsapp/build.gradle.kts');
  const main=read('android-studio/app/src/main/java/tv/matchapp/app/MainActivity.kt');
  const kids=read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt');

  for(const gradle of [mainGradle,kidsGradle]){
    assert.match(gradle,/versionCode = 17/);
    assert.match(gradle,/versionName = "1\.1\.8"/);
  }
  assert.match(main,/https:\/\/matchapp\.tv\/\?utm_source=android_app&appBuild=17/);
  assert.match(kids,/https:\/\/matchapp\.tv\/kids\/\?utm_source=android_kids_app&appBuild=17/);
  assert.match(main,/MATCHAPP_ANDROID_KIDS_DISABLED/);
  assert.match(kids,/MATCHAPP_ANDROID_KIDS_ONLY/);
});
