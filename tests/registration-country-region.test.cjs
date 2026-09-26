const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const read = name => fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const buildPage = () => new JSDOM(`<!doctype html><html lang="en"><body>
  <div id="editable-fields-section">
    <div class="input-group"><label for="profile-name">Name</label><input id="profile-name" value="Fixture Name"></div>
    <div class="input-group"><label for="profile-country">Country</label><select id="profile-country"></select></div>
    <div class="input-group"><label for="profile-dob">DOB</label><input id="profile-dob" value="01/01/1990"></div>
    <div class="input-group"><label for="profile-starsign">Sign</label><select id="profile-starsign"><option value="Aries">Aries</option></select></div>
  </div><button id="save-profile-btn"></button>
  <div id="locked-info-card"><span id="lock-val-region"></span></div>
  `,{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only'});

const savedResponse = {
  full_name:'Fixture Name',country:'Brazil',dob:'01/01/1990',
  star_sign:'Aries',age:36,profile_locked:true,registration_completed:true
};
function boot(rpcResult, dbProfile=null) {
  const dom=buildPage(),w=dom.window,toasts=[],calls=[];
  w.showToast=(message,isError)=>toasts.push({message,isError});
  w.hydrateProfileFromAuth=async()=>{};
  w.checkAndRenderProfileState=()=>{};
  w.saveProfileData=()=>{throw new Error('Legacy fallback must not run');};
  w.supabaseClient={
    auth:{
      getUser:async()=>({data:{user:{id:'fixture-uid'}}}),
      getSession:async()=>({data:{session:{user:{id:'fixture-uid'}}}})
    },
    rpc:async(name,args)=>{calls.push({name,args});return typeof rpcResult==='function'?rpcResult():rpcResult;},
    from:()=>({
      select:()=>({eq:()=>({maybeSingle:async()=>({data:dbProfile})})})
    })
  };
  w.eval(read('profile-geography.js'));
  w.eval(read('registration-upgrade.js'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const country=w.document.getElementById('profile-country');
  const region=w.document.getElementById('registration-region');
  return {dom,w,country,region,calls,toasts};
}
function choose({w,country,region}){
  country.value='Brazil';
  country.dispatchEvent(new w.Event('change',{bubbles:true}));
  region.value='Rio de Janeiro';
  region.dispatchEvent(new w.Event('change',{bubbles:true}));
  w.document.getElementById('registration-terms').checked=true;
  w.document.getElementById('registration-privacy').checked=true;
}

test('offline data includes 249 countries and 4387 subdivisions; selectors are dependent',()=>{
  const t=boot({data:savedResponse,error:null});
  assert.equal(t.w.MatchAppGeography.countryCount,249);
  assert.equal(t.w.MatchAppGeography.regionCount,4387);
  assert.equal(t.country.options.length,250);
  assert.equal(t.region.disabled,true);
  choose(t);
  assert.equal(t.region.disabled,false);
  assert.equal(t.region.value,'Rio de Janeiro');
  assert.equal(t.w.MatchAppGeography.getRegions('Japan').length,47);
  assert.equal(t.w.MatchAppGeography.getRegions('Australia').length,8);
  t.country.value='Japan';
  t.country.dispatchEvent(new t.w.Event('change'));
  assert.equal(t.region.value,'');
  assert.equal(t.w.MatchAppGeography.isRegion('Japan','Rio de Janeiro'),false);
  t.dom.window.close();
});

test('successful signup locks only after the complete_registration RPC succeeds',async()=>{
  const t=boot({data:savedResponse,error:null});
  choose(t);
  assert.equal(t.w.localStorage.getItem('match_profile_locked'),null);
  await t.w.saveProfileData();
  assert.equal(t.calls.length,1);
  assert.equal(t.calls[0].name,'complete_registration');
  assert.equal(t.calls[0].args.p_country,'Brazil');
  assert.equal(t.calls[0].args.p_region,'Rio de Janeiro');
  assert.equal(t.calls[0].args.p_accept_terms,true);
  assert.equal(t.calls[0].args.p_accept_privacy,true);
  assert.equal(t.w.localStorage.getItem('match_user_region'),'Rio de Janeiro');
  assert.equal(t.w.localStorage.getItem('match_profile_locked'),'true');
  assert(t.toasts.some(x=>x.message.includes('Registration saved.')));
  t.dom.window.close();
});

test('invalid date and incomplete region block the RPC without locking',async()=>{
  const t=boot({data:savedResponse,error:null});
  t.country.value='Brazil';
  t.country.dispatchEvent(new t.w.Event('change'));
  t.w.document.getElementById('registration-terms').checked=true;
  t.w.document.getElementById('registration-privacy').checked=true;
  await t.w.saveProfileData();
  assert.equal(t.calls.length,0);
  assert(t.toasts.some(x=>x.message.includes('state or region')));
  t.region.value='Rio de Janeiro';
  t.region.dispatchEvent(new t.w.Event('change'));
  t.w.document.getElementById('profile-dob').value='31/02/1990';
  await t.w.saveProfileData();
  assert.equal(t.calls.length,0);
  assert(t.toasts.some(x=>x.message.includes('valid birth date')));
  assert.notEqual(t.w.localStorage.getItem('match_profile_locked'),'true');
  t.dom.window.close();
});

test('a 400 server response preserves editable registration and gives useful validation feedback',async()=>{
  const t=boot({data:null,error:{message:'Invalid birthdate',code:'22007'}},{profile_locked:false});
  choose(t);
  await t.w.saveProfileData();
  assert.equal(t.calls.length,1);
  assert.notEqual(t.w.localStorage.getItem('match_profile_locked'),'true');
  assert(t.toasts.some(x=>x.message.includes('DD/MM/YYYY')));
  assert.equal(t.w.document.getElementById('profile-name').value,'Fixture Name');
  assert.equal(t.w.document.getElementById('save-profile-btn').disabled,false);
  t.dom.window.close();
});

test('timeout after a committed RPC is reconciled from the authoritative server profile',async()=>{
  const t=boot({data:null,error:{message:'Failed to fetch',code:'network'}},
    {...savedResponse,registration_completed_at:'2026-09-26T17:00:00Z',preferred_region:'Rio de Janeiro'});
  choose(t);
  await t.w.saveProfileData();
  assert.equal(t.w.localStorage.getItem('match_profile_locked'),'true');
  assert(t.toasts.some(x=>x.message.includes('Registration saved.')));
  t.dom.window.close();
});

test('profile page always loads one local geography dataset and one registration script',()=>{
  const html=read('profile/profile.html');
  assert.match(html,/<select id="profile-country"[^>]*required/);
  assert.match(html,/<script src="\/profile-geography.js\?v=/);
  assert.match(html,/<script data-registration-upgrade="1" src="\/registration-upgrade.js\?v=/);
  assert.match(html,/id="locked-info-card"/);
  assert.match(html,/id="lock-val-region"/);
});
