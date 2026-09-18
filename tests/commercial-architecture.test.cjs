const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('commercial tiers are finite and use one 3-5-10-50 included-action model',()=>{
  const pricing=read('pricing/pricing.html');
  const locale=read('i18n.js');
  const quota=read('supabase/migrations/012_standardize_vip_daily_limit.sql');
  const commercial=read('supabase/migrations/013_unify_commercial_entitlements.sql');
  const bootstrap=read('supabase/security/account-identity-and-credits.sql');

  assert.match(quota,/when p_is_business then 50/i);
  assert.match(quota,/when p_is_vip then 10/i);
  assert.match(quota,/when p_profile_complete then 5/i);
  assert.match(quota,/else 3/i);

  assert.match(pricing,/10[^\n]*included AI actions/i);
  assert.match(pricing,/50[^\n]*included AI actions/i);
  assert.doesNotMatch(pricing,/5×\s*VIP|5x\s*VIP|team seats|for every seat/i);

  const vip=[...locale.matchAll(/'pricing\.vipm\.f1':\s*'((?:\\.|[^'])*)'/g)].map(m=>m[1]);
  const biz=[...locale.matchAll(/'pricing\.biz\.f1':\s*'((?:\\.|[^'])*)'/g)].map(m=>m[1]);
  assert.equal(vip.length,14);
  assert.equal(biz.length,14);
  assert(vip.every(v=>/10/.test(v)));
  assert(biz.every(v=>/50/.test(v)));
  assert.doesNotMatch(locale,/5×\s*(?:o\s*)?VIP|5倍|5배|5 أضعاف|5 गुना|5 раз больше VIP/i);

  assert.match(commercial,/p_reason='match'[\s\S]*public\.consume_match\(\)/);
  assert.match(commercial,/public\.consume_credit\('ask_ai'\)/);
  assert.match(bootstrap,/p_reason='match'[\s\S]*public\.consume_match\(\)/);
  assert.match(bootstrap,/public\.consume_credit\('ask_ai'\)/);
  assert.doesNotMatch(bootstrap,/'unlimited'\s*,\s*true/i);
});

test('paid top-ups remain type-specific after the included allowance',()=>{
  const pricingJs=read('pricing.js');
  const terms=read('terms.html');
  assert.match(pricingJs,/Extra Matches do not expire and never consume Ask AI credits/);
  assert.match(pricingJs,/1 credit = 1 Ask AI prompt\. Credits are for Ask AI only and never buy Matches/);
  assert.match(terms,/included AI action may be used for one Match or one Ask AI request/);
  assert.match(terms,/Extra Match packs extend Matches only/);
  assert.match(terms,/Ask AI credits extend Ask AI only/);
});

test('Business is single-account until a real seat system exists',()=>{
  const pricing=read('pricing/pricing.html');
  const terms=read('terms.html');
  assert.match(pricing,/one Business account/i);
  assert.doesNotMatch(pricing,/team seats|for every seat/i);
  assert.match(terms,/Business currently applies to one signed-in account/i);
});

test('Surprise Me is implemented and its copy must remain',()=>{
  const home=read('index.html');
  const together=read('together.html');
  const kids=read('kids/index.html');
  assert.match(home,/id="q-category"[\s\S]*?<option value="any" data-i18n="opt\.surprise">Surprise Me<\/option>/);
  assert.match(together,/id="tg-category"[\s\S]*?<option value="any" data-i18n="opt\.surprise">Surprise Me<\/option>/);
  assert.match(kids,/id="kids-surprise"[\s\S]*?data-k="surprise">Surprise me<\/span>/i);
});
