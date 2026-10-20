'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const home=read('index.html'),inline=home.match(/<script id="login-password-visibility">([\s\S]*?)<\/script>/)[1];
const langs=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function page({homeModal=false}={}){
 const auth=homeModal?home.slice(home.indexOf('<div role="dialog" aria-modal="true" aria-label="Sign in to MatchApp"'),home.indexOf('<script src="https://cdn.jsdelivr.net/npm/@supabase')):'';
 const dom=new JSDOM('<!doctype html><html><head></head><body>'+auth+'</body></html>',{url:'https://matchapp.tv/pricing/pricing.html',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,calls=[];w.console.log=()=>{};w.matchMedia=()=>({matches:true});w.localStorage.setItem('match_lang','pt-BR');w.localStorage.setItem('preserved-wallet','unchanged');w.sessionStorage.setItem('preserved-checkout','unchanged');
 w.fetch=()=>{calls.push('fetch');throw Error('No backend calls in auth copy test');};w.open=()=>calls.push('open');
 w.Element.prototype.scrollIntoView=function(){calls.push('scroll');};
 await tick();w.eval(read('i18n.js'));if(homeModal)w.eval(inline);
 w.eval(read('app.js').match(/window\.switchAuthTab = function\(tab\) \{[\s\S]*?\n\};/)[0]);
 w.eval(read('pricing.js'));await tick();return{dom,w,calls};
}
test('generated pricing auth modal follows all14 selected languages in both existing tabs without replacing auth inputs or actions',async t=>{
 const f=await page();t.after(()=>f.dom.window.close());const {w}=f,doc=w.document,modal=doc.getElementById('main-auth-modal');
 assert.ok(modal);const inputs=[...modal.querySelectorAll('input')],buttons=[...modal.querySelectorAll('button')];
 inputs.forEach((input,i)=>{input.value='Retain-'+i;});
 const state=inputs.map(input=>({node:input,id:input.id,type:input.type,value:input.value,autocomplete:input.autocomplete,required:input.required}));
 const handlers=buttons.map(button=>button.getAttribute('onclick'));
 for(const lang of langs){
  w.setLanguage(lang);
  assert.equal(modal.querySelector('h3').textContent,w.t('auth.unlockTitle',lang));
  assert.equal(modal.querySelector('.google-signin-btn span').textContent,w.t('auth.continueGoogle',lang));assert.equal(modal.querySelector('.auth-divider span').textContent,w.t('auth.orEmail',lang));
  assert.equal(modal.querySelector('#tab-login').textContent,w.t('auth.login',lang));assert.equal(modal.querySelector('#tab-signup').textContent,w.t('auth.signup',lang));assert.equal(modal.getAttribute('aria-label'),w.t('auth.login',lang));
  const copy=w.MatchAppAuthVisualLabels[lang==='pt-BR'?'pt':lang];
  for(const tab of ['login','signup']){
   w.switchAuthTab(tab);assert.equal(modal.querySelectorAll('.auth-form-section.active').length,1);assert.equal(modal.querySelector('.auth-form-section.active').id,'form-'+tab);
   assert.equal(doc.getElementById(tab==='login'?'login-email':'reg-email').placeholder,w.t('pf.email',lang));
  }
  assert.equal(doc.getElementById('login-password').placeholder,copy[5]);assert.equal(doc.getElementById('login-password').getAttribute('aria-label'),copy[5]);
  assert.equal(doc.getElementById('reg-password').placeholder,copy[1]);assert.equal(modal.querySelector('#form-signup .gold-btn').textContent,copy[3]);assert.equal(modal.querySelector('.auth-close').getAttribute('aria-label'),copy[4]);assert.equal(modal.querySelector('.auth-close').title,copy[4]);
  assert.deepEqual([...modal.querySelectorAll('input')],inputs);assert.deepEqual([...modal.querySelectorAll('button')],buttons);assert.deepEqual(buttons.map(button=>button.getAttribute('onclick')),handlers);
  state.forEach(saved=>{assert.equal(saved.node.id,saved.id);assert.equal(saved.node.type,saved.type);assert.equal(saved.node.value,saved.value);assert.equal(saved.node.autocomplete,saved.autocomplete);assert.equal(saved.node.required,saved.required);});
 }
 const name=doc.createElement('input');name.id='reg-full-name';name.value='Keep Name';modal.querySelector('#form-signup').prepend(name);await tick();assert.equal(name.placeholder,w.t('pf.fullName','zh'));assert.equal(name.value,'Keep Name');
 const mutations=[];const observer=new w.MutationObserver(records=>mutations.push(...records));observer.observe(modal,{childList:true,subtree:true});
 for(let i=0;i<6;i++)doc.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
 await tick();await tick();assert.equal(mutations.length,0,'identical copy must not rewrite DOM or feed scoped field observers');observer.disconnect();
 assert.equal(w.localStorage.getItem('preserved-wallet'),'unchanged');assert.equal(w.sessionStorage.getItem('preserved-checkout'),'unchanged');assert.deepEqual(f.calls,[]);
});
test('Home reuses the field dictionary and preserves a revealed typed password while login/reset labels repaint',async t=>{
 const f=await page({homeModal:true});t.after(()=>f.dom.window.close());const {w}=f,doc=w.document,modal=doc.getElementById('main-auth-modal'),copy=w.MatchAppAuthVisualLabels;
 const password=doc.getElementById('login-password'),button=modal.querySelector('.auth-password-toggle'),email=doc.getElementById('login-email'),reset=doc.getElementById('forgot-email');
 password.value='Keep this password';email.value='keep@example.com';reset.value='reset@example.com';w.toggleLoginPasswordVisibility(button);
 for(const lang of langs){w.setLanguage(lang);assert.equal(modal.getAttribute('aria-label'),w.t('auth.login',lang));assert.equal(w.MatchAppAuthVisualLabels,copy,'pricing reuses the Home copy object');assert.equal(doc.getElementById('login-password'),password);assert.equal(password.type,'text');assert.equal(password.value,'Keep this password');assert.equal(email.value,'keep@example.com');assert.equal(reset.value,'reset@example.com');assert.equal(email.placeholder,w.t('pf.email',lang));assert.equal(reset.placeholder,w.t('pf.email',lang));assert.equal(password.placeholder,copy[lang==='pt-BR'?'pt':lang][5]);assert.equal(button.getAttribute('aria-pressed'),'true');}
 w.toggleLoginPasswordVisibility(button);assert.equal(password.type,'password');assert.equal(password.value,'Keep this password');assert.deepEqual(f.calls,[]);
});
