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

function boot(statusRpc, initialGetSession, storage = new Map()) {
  const handlers = {}, calls = [];
  let currentHtml = '', claim, overlay;
  const root = {
    id:'', className:'', dataset:{},
    classList:{add() {},contains() {return false;}},
    setAttribute() {},
    set innerHTML(s) {currentHtml = s; this._html = s;},
    get innerHTML() {return this._html || '';},
    querySelector(selector) {
      if (selector === '.mcb-close') return {addEventListener(){}};
      if (selector !== '.dc-action' || !currentHtml.includes('class="dc-action')) return null;
      return {disabled:false,textContent:'',animate() {},addEventListener(_event,fn) {claim=fn;}};
    }
  };
  const doc={
    readyState:'loading',documentElement:{lang:'en',classList:{contains(){return false;}}},
    body:{classList:{contains(){return false;}},appendChild(node){overlay=node;}},
    addEventListener(event,fn){handlers[event]=fn;},
    dispatchEvent(e){calls.push(e.type);},
    getElementById(id){return id==='daily-match-checkin' && root.id===id ? root:null;},
    querySelector(selector){if(selector==='.top-ask-wrap')return {parentNode:{insertBefore(node){root.id=node.id;}}};return null;},
    createElement(tag){if(tag==='section')return root;return {
      dataset:{},classList:{add(){}},setAttribute(){},innerHTML:'',
      querySelector(){return {addEventListener(){},focus(){}}},
      addEventListener(){},remove(){}
    };}
  };
  const sb={auth:{
    getSession:initialGetSession,
    refreshSession:async()=>({data:{session:{user:{id:'member-1'}}},error:null})
  },rpc:async name=>{calls.push(name);if(name==='daily_match_checkin_status')return statusRpc();
    return {data:{ok:true,awarded:1,matches:3,streak:1,rewarded:false},error:null};}};
  const win={supabaseClient:sb,isUserLoggedIn:true,matchProfileState:{userId:'member-1'},
    MATCH_LANG:'en',matchMedia:()=>({matches:true}),refreshQuotaStatus:async()=>{},
    showToast:()=>{throw Error('No toast expected after a credited check-in');}};
  const storageApi={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  vm.runInNewContext(checkin,{window:win,document:doc,localStorage:{getItem(){return null;}},
    sessionStorage:storageApi,CustomEvent:class {constructor(type){this.type=type;}},
    location:{},setTimeout:(fn,ms)=>ms<1000?setTimeout(fn,ms):0,console});
  return {root,win,handlers,calls,storage,getClaim:()=>claim,getOverlay:()=>overlay};
}
const flush = ()=>new Promise(resolve=>setImmediate(resolve));
const member = async()=>({data:{session:{user:{id:'member-1'}}},error:null});

test('a signed-in member can claim when status fails; balance and non-modal reward appear once',async()=>{
  const state=boot(async()=>({data:null,error:{message:'Temporary status RPC error'}}),member);
  state.handlers.DOMContentLoaded();
  await flush();await flush();
  assert.match(state.root.innerHTML,/Your daily Match is ready/);
  assert.match(state.root.innerHTML,/Claim \+1 Match/);
  assert.equal(typeof state.getClaim(),'function');
  await state.getClaim()();
  assert.match(state.root.innerHTML,/Checked in today/);
  assert.match(state.root.className,/is-hidden/);
  assert.equal(state.calls.filter(c=>c==='daily_match_checkin').length,1);
  assert(state.calls.includes('matchapp:matchbalancechange'));
  assert.match(state.getOverlay()?.className||'',/daily-reward-toast/);
});

test('existing session waits for confirmed status before showing a reminder; repeated status does not dismiss it',async()=>{
  let release;
  const state=boot(()=>new Promise(resolve=>{release=resolve;}),member);
  state.handlers.DOMContentLoaded();
  await flush();await flush();
  assert.match(state.root.className,/is-hidden/);
  assert.doesNotMatch(state.root.innerHTML,/Your daily Match is ready/);
  release({data:{authenticated:true,streak:1,checked_today:false},error:null});
  await flush();await flush();
  assert.match(state.root.innerHTML,/Your streak: 1 of 7 days/);
  assert.doesNotMatch(state.root.className,/is-hidden/);
  state.handlers['matchapp:authchange']();
  await flush();await flush();
  assert.doesNotMatch(state.root.className,/is-hidden/);
  assert.match(state.root.innerHTML,/Claim \+1 Match/);
});

test('a reminder is not shown again across page navigation within the same browser session',async()=>{
  const storage=new Map();
  const rpc=async()=>({data:{authenticated:true,streak:2,checked_today:false},error:null});
  const first=boot(rpc,member,storage);
  first.handlers.DOMContentLoaded();await flush();await flush();
  assert.match(first.root.innerHTML,/Your daily Match is ready/);
  const second=boot(rpc,member,storage);
  second.handlers.DOMContentLoaded();await flush();await flush();
  assert.match(second.root.className,/is-hidden/);
  assert.doesNotMatch(second.root.innerHTML,/Your daily Match is ready/);
  assert.equal(second.win.openDailyCheckin(),true);
  assert.match(second.root.innerHTML,/Your daily Match is ready/);
});

test('a checked-in account and a signed-out guest do not get the bubble',async()=>{
  const claimed=boot(async()=>({data:{authenticated:true,streak:3,checked_today:true},error:null}),member);
  claimed.handlers.DOMContentLoaded();await flush();await flush();
  assert.match(claimed.root.className,/is-hidden/);
  const guest=boot(async()=>({data:{authenticated:false},error:null}),
    async()=>({data:{session:null},error:null}));
  guest.handlers.DOMContentLoaded();await flush();await flush();
  assert.match(guest.root.className,/is-hidden/);
});

test('stale guest status cannot overwrite a newer authenticated check-in status',async()=>{
  let release,reads=0;
  const state=boot(async()=>({data:{authenticated:true,streak:2,checked_today:false},error:null}),
    async()=>++reads===1?new Promise(resolve=>{release=resolve;}):member());
  state.handlers.DOMContentLoaded();
  state.handlers['matchapp:authchange']();
  await flush();await flush();
  assert.match(state.root.innerHTML,/Your streak: 2 of 7 days/);
  release({data:{session:null},error:null});
  await flush();await flush();
  assert.match(state.root.innerHTML,/Your daily Match is ready/);
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
  assert.match(proxy,/^const FREE_MODEL_CHAIN = \["gemini-3\.5-flash-lite", "gemini-3\.8-flash"\];$/m);
  assert.match(proxy,/^const MODEL_CHAIN = \[$/m);
  assert.match(proxy,/Deno\.env\.get\("GEMINI_FREE_API_KEY"\)/);
  assert.match(proxy,/Deno\.env\.get\("GEMINI_API_KEY"\)/);
  assert.match(proxy,/\.\.\.\(freeApiKey \? FREE_MODEL_CHAIN\.map[\s\S]*\.\.\.\(paidApiKey \? MODEL_CHAIN\.map/);
  assert.match(proxy,/if \(route\.tier === "free" && freeProjectBlocked\) continue/);
  assert.match(proxy,/freeProjectBlocked = true;[\s\S]*if \(paidApiKey\) continue/);
  assert.match(proxy,/x-goog-api-key": route\.key/);
  assert.match(proxy,/served tier=free model=\$\{model\}/);
  assert.match(proxy,/separate free-tier secret is not configured/);
  assert.match(proxy,/free project model unavailable:/);
  assert.match(proxy,/const projectWide = \/\(\?:project\|billing account\)/);
  assert.match(proxy,/if \(!projectWide\) continue/);
  assert.match(proxy,/project_spend_cap/);
  assert.match(proxy,/model_or_tier_rate_limit/);
});
test('the homepage loads the check-in session fix instead of a stale cached script',()=>{
  assert.match(homeHtml,/daily-checkin\.js\?v=20260927-authsession1/);
});
