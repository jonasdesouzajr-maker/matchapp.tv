'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const app=fs.readFileSync('app.js','utf8');
const country=require('../viewer-country.js');
function setup(){
 const d=new JSDOM('<div id="questionnaire-box"><button onclick="triggerMatch(false)">Match</button><p id="match-pool-hint">Pool hint</p><div id="next">Next section</div></div>');
 const w=d.window;w.showToast=()=>assert.fail('recovery must not float over controls');
 w.eval=undefined;
 const c=vm.createContext({window:w,document:w.document});
 vm.runInContext(app.slice(app.indexOf('window.clearMatchRecovery ='),app.indexOf('window.matchRecoveryHeading =')),c);
 return {d,w};
}
test('empty match recovery occupies one in-flow notice and hides conflicting pool guidance',()=>{
 const {d,w}=setup();try{
  w.showMatchRecovery('No fresh exact match. No credit used.');
  const n=w.document.querySelector('#match-recovery');
  assert.equal(n.previousElementSibling.tagName,'BUTTON');
  assert.equal(n.getAttribute('role'),'status');
  assert.equal(w.document.querySelector('#match-pool-hint').hidden,true);
  w.showMatchRecovery('<strong>Retry</strong>');
  assert.equal(w.document.querySelectorAll('#match-recovery').length,1);
  assert.equal(w.document.querySelector('#match-recovery').children.length,0,'copy is text, never HTML');
  w.document.dispatchEvent(new w.Event('matchapp:criteriachange'));
  assert.equal(w.document.querySelector('#match-recovery'),null);
  assert.equal(w.document.querySelector('#match-pool-hint').hidden,false);
  w.showMatchRecovery('Previous language');
  w.document.dispatchEvent(new w.Event('matchapp:langchange'));
  assert.equal(w.document.querySelector('#match-recovery'),null,'language changes cannot retain stale translated copy');
 }finally{d.window.close();}
});
test('missing viewing country returns actionable localized guidance before any source work',()=>{
 const start=app.indexOf('const screenPlatform=');
 const block=app.slice(start,app.indexOf('const wantedGenres =',start));
 const run=new Function('window','PLATFORMS','requested','isSpecificSearch','normCriteria',block+'return true;');
 for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){
  let notice='';const w={MATCH_LANG:lang,MatchAppCountry:{...country,regionCode:()=>''},showMatchRecovery:s=>notice=s};
  const platforms={Netflix:{cats:['movie','series']},Spotify:{cats:['Spotify playlist']}};
  assert.equal(run(w,platforms,{plat:['Netflix']},false,a=>a),false);
  assert.equal(notice,country.chooseCountryMessage(lang));assert.equal(w.__matchappMatchPhase,'idle');
  assert.equal(run(w,platforms,{plat:['Spotify']},false,a=>a),true,'global music does not require a viewing country');
  w.MatchAppCountry.regionCode=()=>'BR';
  assert.equal(run(w,platforms,{plat:['Netflix']},false,a=>a),true);
 }
});
