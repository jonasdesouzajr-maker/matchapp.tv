const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const build=fs.readFileSync(path.join(root,'build-meta.js'),'utf8');

test('homepage safe boot keeps heavy startup layers off the critical path',()=>{
  assert.match(html,/\/build-meta\.js\?v=195/,'homepage must fetch the safe-boot build-meta URL');
  assert.match(build,/MATCHAPP_SAFE_BOOT=true/,'safe boot must activate on the homepage');
  assert.match(build,/Math\.max\(1000,Number\(ms\)\|\|0\)/,'startup intervals must be clamped to at least one second');

  assert.doesNotMatch(html,/j\.src=\s*['"]https:\/\/www\.googletagmanager\.com\/gtm\.js/,'GTM must not execute before safe boot');
  assert.doesNotMatch(html,/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle/,'AdSense engine must remain paused during safe boot');
  assert.doesNotMatch(html,/\/ads-init\.js/,'ad observers must not start on homepage safe boot');
  assert.doesNotMatch(html,/\/ambient\.js/,'ambient rendering must not start on homepage safe boot');
  assert.doesNotMatch(html,/\/title-captions\.js/,'title audit/localization fan-out must not start on homepage safe boot');
  assert.doesNotMatch(html,/\/app-updates\.js/,'update polling must not start on homepage safe boot');
  assert.doesNotMatch(html,/\/passkeys\.js/,'passkey enhancement must not start on homepage safe boot');
  assert.doesNotMatch(html,/\/global-events\.js/,'global event enhancement must not start on homepage safe boot');

  assert.match(html,/\/app\.js\?v=192/,'core matcher must remain loaded');
  assert.match(html,/\/matching-policy\.js\?v=190/,'matching policy must remain loaded');
  assert.match(html,/\/criteria\.js\?v=190/,'core criteria UI must remain loaded');
});
