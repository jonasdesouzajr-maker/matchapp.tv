const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'..','home-approved.css'),'utf8');
test('adult Home top box keeps mature dark presentation-only fill',()=>{
  assert.match(css,/owner-requested adult top-box tone/);
  assert.match(css,/#mh-topbox\.app-header\.ma-home-header\{[\s\S]*background-color:#100c14!important;[\s\S]*rgba\(10,8,13,\.992\)/);
  assert.doesNotMatch(css,/#kids-main|\.kids-body|\.adsbygoogle/);
});
