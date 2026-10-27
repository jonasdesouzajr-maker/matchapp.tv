'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const key='matchapp_viewer_country';
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const countries=JSON.parse(read('profile-geography.js').match(/^const DATA=(.*);$/m)[1]);
const originalHeader='<header id="mh-topbox" class="app-header"><div class="mh-head">MatchApp Ai</div><details class="ma-cinema-tools"><summary>App controls</summary><nav class="mh-deck"></nav></details></header>';
const masthead='<div id="ma-reference-header"><div class="ma-reference-header-chrome">'+originalHeader+'</div><div id="ma-reference-header-slot"></div></div>';

function boot({url='https://matchapp.tv/',html=masthead,stored={},configure}={}){
  const dom=new JSDOM('<!doctype html><html lang="en"><body>'+html+'</body></html>',{url,runScripts:'outside-only'});
  const w=dom.window;
  w.MATCH_LANG=stored.match_lang||'en';
  for(const [name,value] of Object.entries(stored))w.localStorage.setItem(name,value);
  let locationRequests=0;
  Object.defineProperty(w.navigator,'geolocation',{configurable:true,value:{
    getCurrentPosition(){locationRequests++;throw Error('Country selection must work without a location permission');},
    watchPosition(){locationRequests++;throw Error('Country selection must not track location');}
  }});
  w.HTMLElement.prototype.scrollIntoView=function(){};
  configure?.(w);
  w.eval(read('viewer-country.js'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return {dom,w,api:w.MatchAppCountry,locationRequests:()=>locationRequests};
}
function picker(w){return w.document.getElementById('matchapp-viewer-country');}
function choose(w,code){
  const select=picker(w);
  assert(select instanceof w.HTMLSelectElement,'Country is a native keyboard/touch selector');
  select.value=code;
  select.dispatchEvent(new w.Event('change',{bubbles:true}));
}
function storageChange(w,name,value){
  const oldValue=w.localStorage.getItem(name);
  if(value===null)w.localStorage.removeItem(name);else w.localStorage.setItem(name,value);
  w.dispatchEvent(new w.StorageEvent('storage',{key:name,oldValue,newValue:value,storageArea:w.localStorage,url:w.location.href}));
}
function matchingForm(){
  const fields={category:['movie','series'],platform:['Netflix','Hulu'],genre:['comedy','drama'],mood:['funny','calm'],vibe:['fast'],rating:['PG-13'],decade:['2020s']};
  const form=Object.entries(fields).map(([name,values])=>'<div><label for="q-'+name+'">'+name+'</label><select id="q-'+name+'"><option value="any">Any</option>'+values.map(value=>'<option value="'+value+'">'+value+'</option>').join('')+'</select>'+(name==='platform'?'<div id="platform-country-hint"></div>':'')+'</div>').join('');
  const h=boot({stored:{[key]:'US'},html:masthead+'<section id="questionnaire-box">'+form+'</section><section id="search-box"></section><section id="loading-box" style="display:none"></section><section id="result-box" hidden style="display:none"></section>'});
  const app=read('app.js'),start=app.indexOf('const PLATFORMS =');
  h.w.CONTENT_CATALOG=[];
  h.w.sourceDiscoverableCategory=()=>false;
  h.w.eval(app.slice(start,app.indexOf("document.addEventListener('DOMContentLoaded'",start)));
  h.w.document.getElementById('q-category').addEventListener('change',h.w.onCategoryChange);
  h.w.onCategoryChange();
  h.w.eval(read('criteria.js'));
  h.w.setMatchCriteria({cat:['movie'],plat:['Netflix','Hulu'],genre:['comedy'],mood:['funny'],vibe:['fast'],rating:['PG-13'],decade:['2020s']});
  return h;
}
const plain=value=>JSON.parse(JSON.stringify(value));

test('a first-time guest selects a viewing country without a profile, sign-in or location permission',()=>{
  const {dom,w,api,locationRequests}=boot({stored:{match_lang:'pt-BR'}});
  try{
    api.mountPicker();
    assert.equal(api.regionCode(),'','An interface language does not silently choose a country');
    const changes=[];
    w.document.addEventListener('matchapp:countrychange',()=>changes.push(api.regionCode()));
    choose(w,'BR');
    assert.equal(api.regionCode(),'BR');
    assert.equal(w.localStorage.getItem(key),'BR');
    assert.equal(w.localStorage.getItem('match_user_country'),null);
    assert.equal(w.localStorage.getItem('match_user_region'),null);
    assert.equal(w.localStorage.getItem('match_lang'),'pt-BR');
    assert.deepEqual(changes,['BR']);
    assert.equal(locationRequests(),0);
  }finally{dom.window.close();}
});

test('the explicit viewing choice survives reload and profile hydration without changing account country',()=>{
  const stored={match_user_country:'Brazil',match_user_region:'Rio de Janeiro',match_lang:'pt-BR'};
  const first=boot({stored});
  try{
    assert.equal(first.api.setCountry('Norway'),true);
    assert.equal(first.api.regionCode(),'NO');
    stored[key]=first.w.localStorage.getItem(key);
    assert.equal(first.w.localStorage.getItem('match_user_country'),'Brazil');
    assert.equal(first.w.localStorage.getItem('match_user_region'),'Rio de Janeiro');
  }finally{first.dom.window.close();}
  const {dom,w,api}=boot({stored});
  try{
    api.mountPicker();
    assert.equal(api.regionCode(),'NO');
    assert.equal(picker(w).value,'NO');
    w.localStorage.setItem('match_user_country','Japan');
    w.document.dispatchEvent(new w.CustomEvent('matchapp:profilehydrated'));
    w.document.dispatchEvent(new w.CustomEvent('matchapp:authchange'));
    assert.equal(api.regionCode(),'NO');
    assert.equal(picker(w).value,'NO');
    assert.equal(w.localStorage.getItem('match_user_country'),'Japan');
    assert.equal(w.localStorage.getItem('match_lang'),'pt-BR');
  }finally{dom.window.close();}
});

test('invalid viewing values cannot replace a valid selection or turn subdivisions into countries',()=>{
  const {dom,w,api}=boot({stored:{[key]:'ZZ',match_user_country:'Fiji',match_user_region:'Ba'}});
  try{
    assert.equal(api.regionCode(),'FJ');
    assert.equal(api.setCountry('u.k.'),true);
    assert.equal(api.regionCode(),'GB');
    let changes=0;
    w.document.addEventListener('matchapp:countrychange',()=>changes++);
    for(const invalid of ['',null,'ZZ','XX','São Paulo','<script>alert(1)</script>']){
      assert.equal(api.setCountry(invalid),false,String(invalid));
      assert.equal(api.regionCode(),'GB');
      assert.equal(w.localStorage.getItem(key),'GB');
    }
    assert.equal(changes,0);
  }finally{dom.window.close();}
});

test('the same guest can choose and change country when access to localStorage is denied',()=>{
  const {dom,w,api,locationRequests}=boot({configure(w){
    Object.defineProperty(w,'localStorage',{configurable:true,get(){throw new w.DOMException('Storage denied','SecurityError');}});
  }});
  try{
    api.mountPicker();
    assert.equal(api.regionCode(),'');
    choose(w,'CA');
    assert.equal(api.regionCode(),'CA');
    assert.equal(picker(w).value,'CA');
    choose(w,'JP');
    assert.equal(api.regionCode(),'JP');
    assert.equal(picker(w).value,'JP');
    assert.equal(locationRequests(),0);
  }finally{dom.window.close();}
});

test('failed persistence never lets an old saved country override the choice just made',()=>{
  const {dom,w,api}=boot({stored:{[key]:'US'},configure(w){
    const write=w.Storage.prototype.setItem;
    w.Storage.prototype.setItem=function(name,value){
      if(name===key)throw new w.DOMException('Quota exceeded','QuotaExceededError');
      return write.call(this,name,value);
    };
  }});
  try{
    api.mountPicker();
    assert.equal(api.regionCode(),'US');
    choose(w,'PT');
    assert.equal(api.regionCode(),'PT');
    assert.equal(picker(w).value,'PT');
    assert.equal(w.localStorage.getItem(key),'US','The failed write really leaves stale storage behind');
    w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
    assert.equal(api.regionCode(),'PT');
    assert.equal(picker(w).value,'PT');
  }finally{dom.window.close();}
});

test('the visible top-box selector contains every registered country and stays outside collapsed app controls',()=>{
  const {dom,w,api}=boot();
  try{
    for(let i=0;i<4;i++)api.mountPicker();
    const select=picker(w),row=w.document.getElementById('matchapp-viewer-country-control');
    assert(select instanceof w.HTMLSelectElement);
    assert.equal(w.document.querySelectorAll('#matchapp-viewer-country').length,1);
    assert.equal(w.document.querySelectorAll('#matchapp-viewer-country-control').length,1);
    assert.equal(row.parentElement,w.document.querySelector('.ma-reference-header-chrome'));
    assert.equal(row.parentElement.firstElementChild.id,'mh-topbox','The masthead keeps its original header owner');
    assert.equal(row.closest('details'),null,'Country cannot be hidden behind App controls');
    const offered=new Set(Array.from(select.options,option=>option.value).filter(Boolean));
    assert.equal(offered.size,countries.length);
    for(const [name,code] of countries){
      assert(offered.has(code),name);
      assert.equal(api.resolveCountryCode(name),code);
    }
  }finally{dom.window.close();}
});

test('a late shared masthead relocates the existing selector rather than duplicating it or losing its choice',()=>{
  const {dom,w,api}=boot({html:originalHeader});
  try{
    api.mountPicker();
    choose(w,'NZ');
    const select=picker(w),row=w.document.getElementById('matchapp-viewer-country-control');
    const sharedHeader=w.document.createElement('div');sharedHeader.id='ma-reference-header';
    const chrome=w.document.createElement('div');chrome.className='ma-reference-header-chrome';
    sharedHeader.append(chrome);w.document.body.append(sharedHeader);
    chrome.append(w.document.getElementById('mh-topbox'));
    api.mountPicker();
    assert.equal(picker(w),select);
    assert.equal(row.parentElement,chrome);
    assert.equal(chrome.firstElementChild.id,'mh-topbox');
    assert.equal(select.value,'NZ');
    assert.equal(api.regionCode(),'NZ');
  }finally{dom.window.close();}
});

test('all supported interface languages relabel the selector without changing the viewing country',()=>{
  const {dom,w,api}=boot();
  try{
    api.mountPicker();
    api.setCountry('BR');
    let englishName='';
    for(const language of languages){
      w.MATCH_LANG=language;w.localStorage.setItem('match_lang',language);w.document.documentElement.lang=language;
      w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang:language}}));
      const select=picker(w);
      const accessibleName=select.getAttribute('aria-label')||Array.from(select.labels||[],label=>label.textContent).join(' ');
      assert(accessibleName.trim().length>=2,language+' has an accessible country label');
      if(language==='en')englishName=accessibleName;
      else assert.notEqual(accessibleName,englishName,language+' does not silently retain the English label');
      const option=Array.from(select.options).find(option=>option.value==='BR');
      assert(option.textContent.trim().length>0,language+' has a country name');
      if(language==='pt-BR')assert.match(option.textContent,/Brasil/);
      assert.equal(select.value,'BR');
      assert.equal(api.regionCode(),'BR');
      assert.equal(w.localStorage.getItem('match_lang'),language);
      assert.doesNotMatch(api.chooseCountryMessage(language),/\bprofile\b|perfil|profil|プロフィール|프로필|个人资料|профил|प्रोफ़ाइल/iu);
    }
  }finally{dom.window.close();}
});

test('profile hydration fills an unchosen country, while another tab can change or remove a deliberate choice',()=>{
  const {dom,w,api}=boot();
  try{
    api.mountPicker();
    w.localStorage.setItem('match_user_country','Norway');
    w.document.dispatchEvent(new w.CustomEvent('matchapp:profilehydrated'));
    assert.equal(picker(w).value,'NO');
    assert.equal(api.setCountry('BR'),true);
    storageChange(w,key,'CA');
    assert.equal(api.regionCode(),'CA');
    assert.equal(picker(w).value,'CA');
    storageChange(w,key,null);
    assert.equal(api.regionCode(),'NO','Removing a choice cannot leave a stale in-memory override');
    assert.equal(picker(w).value,'NO');
    api.setCountry('JP');
    w.localStorage.clear();
    w.dispatchEvent(new w.StorageEvent('storage',{key:null,storageArea:w.localStorage,url:w.location.href}));
    assert.equal(api.regionCode(),'');
    assert.equal(picker(w).value,'');
  }finally{dom.window.close();}
});

test('the shared provider resolver uses a guest choice instead of profile, interface language or title origin',()=>{
  const {dom,w,api}=boot({stored:{match_user_country:'Brazil',match_lang:'pt-BR'}});
  try{
    w.eval(read('catalog-media.js'));
    const media=w.MatchAppCatalogMedia;
    const title={title:'An exact source title',tmdb_id:10,media_kind:'movie',origin_countries:['JP'],availability:{
      NO:{stream:['Netflix']},BR:{stream:['Globoplay']},US:{stream:['Hulu']}
    }};
    api.setCountry('NO');
    assert.equal(media.regionCode(),'NO');
    assert.equal(media.availability(title).region,'NO');
    assert.equal(media.viewingTarget(title,title.title).provider,'Netflix');
    api.setCountry('US');
    assert.equal(media.availability(title).region,'US');
    assert.equal(media.viewingTarget(title,title.title).provider,'Hulu');
    assert.equal(w.localStorage.getItem('match_user_country'),'Brazil');
    assert.equal(w.MATCH_LANG,'pt-BR');
  }finally{dom.window.close();}
});

test('changing country preserves compatible selected platforms and other filters while removing unavailable platforms',()=>{
  const {dom,w,api}=matchingForm();
  try{
    const before=plain(w.getMatchCriteria());
    const hint=w.document.getElementById('platform-country-hint');
    assert.equal(hint.style.display,'none','The top-box selector already communicates the country');
    assert.deepEqual(before.plat,['Netflix','Hulu']);
    const updates=[];let cleared=0;
    w.document.addEventListener('matchapp:criteriachange',event=>updates.push(plain(event.detail)));
    w.clearMatchRecovery=()=>cleared++;
    api.setCountry('CA');
    const expected={...before,plat:['Netflix']};
    assert.deepEqual(plain(w.getMatchCriteria()),expected);
    assert.equal(w.document.getElementById('q-platform').value,'Netflix');
    assert(!Array.from(w.document.getElementById('q-platform').options,option=>option.value).includes('Hulu'));
    assert.deepEqual(updates,[expected],'Downstream listeners receive the reconciled selection');
    assert.equal(cleared,1,'The obsolete missing-country recovery is cleared');
    assert.equal(hint.style.display,'none','Changing country cannot expose the old hint over the Match button');
    api.setCountry('US');
    assert.deepEqual(plain(w.getMatchCriteria()),expected,'Returning to a country does not silently restore a removed filter');
    assert.equal(hint.style.display,'none');
    w.document.getElementById('matchapp-viewer-country-control').remove();
    w.onCategoryChange();
    assert.equal(hint.style.display,'block','An older shell without the selector keeps its original country guidance');
    assert.match(hint.textContent,/US/);
    api.mountPicker();w.onCategoryChange();
    assert.equal(hint.style.display,'none','Restoring the selector hides the redundant legacy guidance again');
  }finally{dom.window.close();}
});

test('a country change invalidates pending or displayed results and restores the chooser without losing its remaining criteria',()=>{
  const {dom,w,api}=matchingForm();
  try{
    let debits=0;
    w.checkDailyLimit=async()=>{debits++;return true;};
    w.__matchappMatchRunId=7;
    for(const [phase,country] of [['preflight','CA'],['quota','GB'],['result','BR']]){
      const before=w.__matchappMatchRunId;
      w.__matchappMatchPhase=phase;
      w.document.body.classList.add('match-searching');
      w.document.getElementById('loading-box').style.display='block';
      w.document.getElementById('questionnaire-box').style.setProperty('display','none','important');
      w.document.getElementById('search-box').style.setProperty('display','none','important');
      const result=w.document.getElementById('result-box');
      result.hidden=false;result.style.display='block';
      api.setCountry(country);
      assert.equal(w.__matchappMatchRunId,before+1,'The earlier request no longer owns the result');
      assert.equal(w.__matchappMatchPhase,'idle');
      assert.equal(w.document.body.classList.contains('match-searching'),false);
      assert.equal(w.document.getElementById('loading-box').style.display,'none');
      assert.equal(w.document.getElementById('questionnaire-box').style.display,'block');
      assert.equal(w.document.getElementById('search-box').style.display,'block');
      assert.equal(result.hidden,true);
      assert.equal(result.style.display,'none');
      assert.deepEqual(plain(w.getMatchCriteria()).mood,['funny']);
      assert.deepEqual(plain(w.getMatchCriteria()).genre,['comedy']);
      assert.equal(debits,0);
    }
  }finally{dom.window.close();}
});

test('an unknown-country platform match focuses the selector without a source call, debit or profile redirect',async()=>{
  const {dom,w,api}=boot();
  try{
    api.mountPicker();
    const messages=[],criteria={cat:['movie'],plat:['Netflix'],genre:['comedy'],mood:['funny'],vibe:[],rating:[],decade:[]};
    let sourceCalls=0,debits=0;
    w.ensureCompactMatchSession=async()=>({data:{session:null}});
    w.matchPolicy={ready:async()=>{},key:value=>String(value||'').toLowerCase()};
    w.matchAllowanceBeforeLookup=async()=>true;
    w.getMatchCriteria=()=>criteria;
    w.PLATFORMS={Netflix:{cats:['movie','series']}};
    w.showMatchRecovery=message=>messages.push(message);
    w.showToast=message=>messages.push(message);
    w.clearMatchRecovery=()=>{};
    w.fetch=async()=>{sourceCalls++;throw Error('No country, no provider request');};
    w.checkDailyLimit=async()=>{debits++;return true;};
    const app=read('app.js').replace(/\r\n/g,'\n');
    const normalize=app.match(/function normCriteria\([\s\S]*?\n}\n/)[0];
    const trigger=app.slice(app.indexOf('\nwindow.triggerMatch = async function(')+1,app.indexOf('// THE RENDER ENGINE'));
    w.eval(normalize+'\n'+trigger);
    assert.equal(await w.triggerMatch(false),false);
    assert.equal(w.__matchappMatchPhase,'idle');
    assert.equal(w.document.activeElement,picker(w),'A guest has a direct way to supply the missing input');
    assert.equal(sourceCalls,0);
    assert.equal(debits,0);
    assert.equal(w.location.pathname,'/');
    assert.deepEqual(criteria,{cat:['movie'],plat:['Netflix'],genre:['comedy'],mood:['funny'],vibe:[],rating:[],decade:[]});
    assert(messages.every(message=>!String(message).toLowerCase().includes('profile')));
  }finally{dom.window.close();}
});

test('the adult country picker leaves the separate Kids product untouched',()=>{
  const {dom,w,api,locationRequests}=boot({url:'https://matchapp.tv/kids/'});
  try{
    api.mountPicker();
    api.openPicker();
    assert.equal(picker(w),null);
    assert.equal(w.document.getElementById('matchapp-viewer-country-control'),null);
    assert.equal(locationRequests(),0);
  }finally{dom.window.close();}
});
