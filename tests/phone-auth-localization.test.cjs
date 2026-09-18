const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('phone signup and login copy covers every supported MatchApp language',()=>{
  const html=read('index.html');
  const base=read('phone-auth.js');
  const extra=read('phone-auth-i18n.js');
  const helper=read('phone-auth-localize.js');
  assert.match(html,/phone-auth-i18n\.js\?v=1/);
  assert.match(html,/phone-auth\.js\?v=1/);
  assert.match(html,/phone-auth-localize\.js\?v=1/);
  for(const lang of ['en','pt-BR','es']) assert.match(base,new RegExp("(^|[,'\\s])['\"]?"+lang.replace('-','\\-')+"['\"]?\\s*:"));
  for(const lang of ['fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']) assert.match(extra,new RegExp("(^|[,'\\s])"+lang.replace('-','\\-')+"\\s*:"));
  assert.match(helper,/matchapp:langchange/);
});
