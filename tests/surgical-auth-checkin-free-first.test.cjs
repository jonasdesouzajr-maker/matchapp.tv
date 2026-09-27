const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const checkin = read('daily-checkin.js');
const registration = read('registration-upgrade.js');
const profileHtml = read('profile/profile.html');
const homeHtml = read('index.html');
const proxy = read('supabase/functions/gemini-proxy/index.ts');

function boot(statusRpc, initialGetSession) {
  const handlers = {}, calls = [];
  let currentHtml = '', claim, join, overlay;
  const root = {
    id:'', className:'', dataset:{},
    classList:{add() {},contains() {return false;}},
    setAttribute() {},
    set innerHTML(s) {currentHtml = s; this._html = s;},
    get innerHTML() {return this._html || '';},
    querySelector(selector) {
      const isJoin = selector === '.dc-action-join';
      if (isJoin && !currentHtml.includes('dc-action-join')) return null;
      if (!isJoin && selector.includes(':not(') && !currentHtml.includes('dc-action">') &&
          !currentHtml.includes('is-bonus-claim')) return null;
      if (!isJoin && !selector.includes(':not(')) return null;
      return {
        disabled:false, textContent:'', animate() {},
        addEventListener(_event, fn) {if(isJoin) join=fn; else claim=fn;}
      };
    }
  };
  const doc={
    readyState:'loading', documentElement:{lang:'en',classList:{contains(){return false;}}},
    body:{classList:{contains(){return false;}},appendChild(node){overlay=node;}},
    addEventListener(event,fn){handlers[event]=fn;},
    dispatchEvent(e){calls.push(e.type);},
    getElementById(id){return id==='daily-match-checkin' && root.id===id ? root:null;},
    querySelector(selector){if(selector==='.top-ask-wrap')return {parentNode:{insertBefore(node){root.id=node.id;}}};return null;},
    createElement(tag){if(tag==='section')return root;return {
      dataset:{},setAttribute(){},innerHTML:'',
      querySelector(){return {addEventListener(){},focus(){}}},
      addEventListener(){},remove(){}
    };}
  };
  const sb={auth:{
    getSession:initialGetSession,
    refreshSession:async()=>({data:{session:{user:{id:'member-1'}}},error:null})
  },rpc:async name=>{calls.push(name);if(name==='daily_match_checkin_status')return statusRpc();return {data:{ok:true,awarded:1,matches:3,streak:1,rewarded:false},error:null};}};
  const win={supabaseClient:sb,isUserLoggedIn:true,matchProfileState:{userId:'member-1'},
    MATCH_LANG:'en',matchMedia:()=>({matches:true}),refreshQuotaStatus:async()=>{},
    showToast:()=>{throw Error('No toast expected after a credited check-in');}};
  vm.runInNewContext(checkin,{window:win,document:doc,localStorage:{getItem(){return null;}},
    CustomEvent:class {constructor(type){this.type=type;}},location:{},setTimeout,console});
  return {root,win,handlers,calls, getClaim:()=>claim,getJoin:()=>join,getOverlay:()=>overlay};
}
const flush = ()=>new Promise(resolve=>setImmediate(resolve));

test('signed-in member remains eligible when the status RPC fails; successful claim is credited once',async()=>{
  const state=boot(async()=>({data:null,error:{message:'Temporary status RPC error'}}),
    async()=>({data:{session:{user:{id:'member-1'}}},error:null}));
  state.handlers.DOMContentLoaded();
  await flush();await flush();
  assert.doesNotMatch(state.root.innerHTML,/Register to unlock/);
  assert.match(state.root.innerHTML,/Check in · \+1 Match/);
  assert.equal(typeof state.getClaim(),'function');
  await state.getClaim()();
  assert.match(state.root.innerHTML,/Checked in today/);
  assert.equal(state.calls.filter(c=>c==='daily_match_checkin').length,1);
  assert(state.calls.includes('matchapp:matchbalancechange'));
  assert(state.getOverlay(),'Reward celebration should appear');
});

test('stale guest status cannot overwrite a newer authenticated check-in status',async()=>{
  let release;
  let reads=0;
  const state=boot(async()=>({data:{authenticated:true,streak:2,checked_today:false},error:null}),
    async()=>++reads===1 ? new Promise(resolve=>{release=resolve;}) :
      ({data:{session:{user:{id:'member-1'}}},error:null}));
  state.handlers.DOMContentLoaded();
  state.handlers['matchapp:authchange']();
  await flush();await flush();
  assert.match(state.root.innerHTML,/Day 2 of 7/);
  release({data:{session:null},error:null});
  await flush();await flush();
  assert.doesNotMatch(state.root.innerHTML,/Register to unlock/);
});

test('registration success is presented only after server verification, before navigating home',()=>{
  assert.match(registration,/response\?\.profile_locked[\s\S]*response\?\.registration_completed/);
  assert.match(registration,/const current = await sb\.auth\.getSession\(\)/);
  assert.match(registration,/showRegistrationSuccess\(\);/);
  assert.match(registration,/registration-save-success-title/);
  assert.match(registration,/setTimeout\(\(\) => \{ if \(overlay\.isConnected\) goHome\(\); \}, 3500\)/);
  assert.match(profileHtml,/registration-upgrade\.js\?v=20260927-confirm1/);
});

test('a separately funded-free-tier Gemini project is preferred before any paid key',()=>{
  assert.match(proxy,/const FREE_MODEL_CHAIN = \["gemini-2\.5-flash-lite", "gemini-2\.5-flash"\]/);
  assert.match(proxy,/Deno\.env\.get\("GEMINI_FREE_API_KEY"\)/);
  assert.match(proxy,/Deno\.env\.get\("GEMINI_API_KEY"\)/);
  assert.match(proxy,/\.\.\.\(freeApiKey \? FREE_MODEL_CHAIN\.map[\s\S]*\.\.\.\(paidApiKey \? MODEL_CHAIN\.map/);
  assert.match(proxy,/if \(route\.tier === "free" && freeProjectBlocked\) continue/);
  assert.match(proxy,/freeProjectBlocked = true;[\s\S]*if \(paidApiKey\) continue/);
  assert.match(proxy,/x-goog-api-key": route\.key/);
});
test('the homepage loads the check-in session fix instead of a stale cached script',()=>{
  assert.match(homeHtml,/daily-checkin\.js\?v=20260927-authsession1/);
});
