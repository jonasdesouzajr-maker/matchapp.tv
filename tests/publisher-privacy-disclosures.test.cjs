'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const vm=require('node:vm');
const root=path.join(__dirname,'..');

test('both public privacy policies expose personalization opt-outs and the existing consent-withdrawal route without JavaScript',()=>{
 for(const [file,lang,previousVisits] of [
  ['privacy.html','en',/previous visits to MatchApp and other websites/],
  ['privacidade.html','pt-BR',/visitas anteriores ao MatchApp e a outros sites/]
 ]){
  const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'));
  try{
   const d=dom.window.document;
   assert.equal(d.documentElement.lang,lang);
   assert.match(d.body.textContent,previousVisits);
   for(const href of ['https://www.google.com/settings/ads','https://optout.aboutads.info/','/?privacy=choices']){
    const link=d.querySelector(`a[href="${href}"]`);
    assert.ok(link,file+' lacks '+href);
    assert.ok(link.textContent.trim());
   }
   assert.equal(d.querySelectorAll('ins.adsbygoogle,script[src*="googlesyndication"]').length,0);
  }finally{dom.window.close()}
 }
});

test('the cookie explanation offers third-party choices and keeps unavailable consent honest',()=>{
 const dom=new JSDOM(fs.readFileSync(path.join(root,'cookies.html'),'utf8'));
 try{
  const d=dom.window.document;
  assert.ok(d.querySelector('a[href="https://optout.aboutads.info/"]'));
  assert.ok(d.querySelector('a[href="/?privacy=choices"]'));
  assert.match(d.body.textContent,/does not cover every vendor/);
  assert.match(d.body.textContent,/no change was saved/);
  assert.equal(d.querySelectorAll('ins.adsbygoogle,script[src*="googlesyndication"]').length,0);
 }finally{dom.window.close()}
});

test('Pricing queues its existing denied advertising defaults before the first GTM request',()=>{
 const dom=new JSDOM(fs.readFileSync(path.join(root,'pricing/pricing.html'),'utf8'));
 try{
  const scripts=[...dom.window.document.scripts];
  const defaults=scripts.find(s=>s.textContent.includes("gtag('consent', 'default'"));
  const manager=scripts.find(s=>s.textContent.includes('googletagmanager.com/gtm.js'));
  assert.ok(defaults&&manager);
  let tagRequested=false;
  const sandbox={document:{
   getElementsByTagName:()=>[{parentNode:{insertBefore:()=>{
    tagRequested=true;
    const command=sandbox.dataLayer[0];
    assert.equal(command[0],'consent');assert.equal(command[1],'default');
    for(const purpose of ['ad_storage','ad_user_data','ad_personalization','analytics_storage'])assert.equal(command[2][purpose],'denied');
    assert.equal(command[2].wait_for_update,500);
   }}}],createElement:()=>({})
  }};
  sandbox.window=sandbox;
  vm.createContext(sandbox);
  for(const s of scripts.filter(s=>s===defaults||s===manager))vm.runInContext(s.textContent,sandbox);
  assert.ok(tagRequested);
  assert.equal(sandbox.dataLayer.filter(entry=>entry[0]==='consent').length,1);
 }finally{dom.window.close()}
});
