const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const source = fs.readFileSync(require('node:path').join(__dirname,'..','legal-kit.js'),'utf8');
function mount({url='https://matchapp.tv/',choice,lang='en',storageBlocked=false}={}) {
 const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>',{url,runScripts:'outside-only'});
 const w=dom.window;
 if(choice)w.localStorage.setItem('match_cookie_choice',choice);
 w.localStorage.setItem('match_lang',lang);
 if(storageBlocked)Object.defineProperty(w,'localStorage',{get(){throw Error('blocked')}});
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {dom,w,link:w.document.getElementById('ma-privacy-choices')};
}
test('a legacy Accept flag never grants consent or creates a substitute banner',()=>{
 const {dom,w,link}=mount({choice:'all'});
 assert.ok(link);assert.equal(w.document.querySelector('.ma-cookie'),null);
 assert.equal((w.dataLayer||[]).length,0);
 assert.equal(w.document.querySelectorAll('ins.adsbygoogle,script[src*="googlesyndication"]').length,0);
 dom.window.close();
});
test('a stored refusal is replayed on reload without granting any purpose',()=>{
 for(let load=0;load<2;load++){
  const {dom,w}=mount({choice:'essential'});
  assert.equal(w.dataLayer.length,1);
  assert.equal(w.dataLayer[0][0],'consent');assert.equal(w.dataLayer[0][1],'update');
  assert.ok(Object.values(w.dataLayer[0][2]).every(v=>v==='denied'));dom.window.close();
 }
});
test('unavailable CMP reports no saved change and keeps controls usable',()=>{
 const {dom,w,link}=mount({storageBlocked:true});
 link.click();assert.equal(w.document.getElementById('ma-privacy-status').hidden,false);
 assert.match(w.document.getElementById('ma-privacy-status').textContent,/No consent change was saved/);
 assert.equal((w.dataLayer||[]).length,0);dom.window.close();
});
test('withdrawal uses the real CMP callback queue and legacy refusal clears only on completed user action',()=>{
 const {dom,w,link}=mount({choice:'essential'});let listener,opened=0;
 w.__tcfapi=(command,version,fn)=>{assert.equal(command,'addEventListener');assert.equal(version,2);listener=fn};
 w.googlefc.showRevocationMessage=()=>opened++;
 const ready=w.googlefc.callbackQueue[0].CONSENT_API_READY;
 w.googlefc.callbackQueue={push(value){value.CONSENT_API_READY()}};
 ready();link.click();assert.equal(opened,1);
 listener({eventStatus:'tcloaded'},true);assert.equal(w.localStorage.getItem('match_cookie_choice'),'essential');
 listener({eventStatus:'useractioncomplete'},false);assert.equal(w.localStorage.getItem('match_cookie_choice'),'essential');
 listener({eventStatus:'useractioncomplete'},true);assert.equal(w.localStorage.getItem('match_cookie_choice'),null);
 assert.equal(w.dataLayer.length,1);dom.window.close();
});
test('a privacy deep link waits for the CMP and opens once when ready',()=>{
 const {dom,w}=mount({url:'https://matchapp.tv/?privacy=choices'});let opened=0;
 w.googlefc.showRevocationMessage=()=>opened++;
 const ready=w.googlefc.callbackQueue[0].CONSENT_API_READY;
 w.googlefc.callbackQueue={push(value){value.CONSENT_API_READY()}};
 ready();ready();assert.equal(opened,1);dom.window.close();
});
test('all supported languages have authored privacy controls; Kids remains isolated',()=>{
 for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){
  const {dom,w,link}=mount({lang});assert.ok(link.textContent.length>6);
  if(lang!=='en')assert.notEqual(link.textContent,'Privacy and cookie settings');
  w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  assert.equal(w.document.querySelectorAll('#ma-privacy-choices').length,1);dom.window.close();
 }
 const {dom,w}=mount({url:'https://matchapp.tv/kids/'});assert.equal(w.document.querySelector('.ma-legal-bar'),null);assert.equal(w.googlefc,undefined);dom.window.close();
});
