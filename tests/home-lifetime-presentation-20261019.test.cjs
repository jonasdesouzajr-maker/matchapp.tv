const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const trigger=source.slice(source.indexOf('window.triggerMatch = async function'),source.indexOf('// THE RENDER ENGINE'));

function home({saved=false,known=false,excluded=false,claim=true,quota=true}={}){
 const dom=new JSDOM('<input id="specific-search-input" value="Exact Film"><div id="questionnaire-box"></div><div id="search-box"></div><div id="result-box" hidden></div><div id="loading-box"></div>',{url:'https://matchapp.tv/'});
 const w=dom.window,events=[],item={title:'Exact Film',synopsis:'Verified source synopsis.',cats:['movie'],platform:'any',platformVerified:false};
 w.HTMLElement.prototype.scrollIntoView=function(){};
 const key=value=>String(value||'').toLowerCase().replace(/\W/g,'');
 w.matchPolicy={ready:async()=>{},key,history:()=>[],known:()=>new Set(known?[key(item.title)]:[]),
  excludes:()=>excluded,claim:async()=>{events.push('claim');return claim;},releaseClaim:async()=>events.push('release')};
 w.getMatchCriteria=()=>({cat:['movie'],plat:[],genre:[],mood:[],vibe:[],rating:[],decade:[]});
 w.showToast=()=>events.push('toast');
 const context=vm.createContext({window:w,document:w.document,localStorage:w.localStorage,
  CONTENT_CATALOG:[item],savedList:saved?[item]:[],LANG_NAMES_FOR_PROMPT:{en:'English'},
  normCriteria:value=>Array.isArray(value)?value.filter(Boolean):[],tSafe:key=>key,
  matchAllowanceBeforeLookup:async()=>{events.push('allowance');return true;},
  checkDailyLimit:async()=>{events.push('debit');return quota;},
  withMatchSourceDeadline:async work=>work(),verifyCuratedPlatform:async value=>{events.push('source');return value;},
  pickFromCatalog:()=>item,entryAllowedForSelection:()=>true,
  renderResult:async value=>{events.push('render');w.globalMatchTitle=value.title;const box=w.document.getElementById('result-box');box.hidden=false;box.style.display='block';},
  requestAnimationFrame:fn=>{fn();return 1;},setInterval:()=>1,clearInterval:()=>{},console});
 vm.runInContext(trigger,context);
 return {dom,w,events};
}

test('an exact saved title cannot bypass Home history or spend another Match',async()=>{
 const {dom,w,events}=home({saved:true,known:true,excluded:true});
 try{
  await w.triggerMatch(true);
  assert(!events.includes('debit'));assert(!events.includes('render'));assert(!events.includes('claim'));
  assert.equal(w.document.getElementById('result-box').style.display,'none');
 }finally{dom.window.close();}
});

test('a saved lookup alias is stopped by the complete source identity before debit or reveal',async()=>{
 const {dom,w,events}=home({saved:true,excluded:true});
 try{
  await w.triggerMatch(true);
  assert(events.includes('source'),'the canonical source identity is checked after lookup');
  assert(!events.includes('debit'));assert(!events.includes('render'));assert(!events.includes('claim'));
 }finally{dom.window.close();}
});

test('a saved lookup cannot skip the authoritative claim when a history snapshot is stale',async()=>{
 const {dom,w,events}=home({saved:true,claim:false});
 try{
  await w.triggerMatch(true);
  assert.equal(events.filter(event=>event==='claim').length,1);
  assert(!events.includes('debit'));assert(!events.includes('render'));
 }finally{dom.window.close();}
});

for(const specific of [false,true])test(`fresh ${specific?'exact-title':'questionnaire'} matching still claims, debits once, then reveals`,async()=>{
 const {dom,w,events}=home();
 try{
  await w.triggerMatch(specific);
  assert.equal(events.filter(event=>event==='claim').length,1);
  assert.equal(events.filter(event=>event==='debit').length,1);
  assert.equal(events.filter(event=>event==='render').length,1);
  assert(events.indexOf('claim')<events.indexOf('debit'));
  assert(events.indexOf('debit')<events.indexOf('render'));
 }finally{dom.window.close();}
});

test('a fresh unshown title still releases its claim when the allowance debit is refused',async()=>{
 const {dom,w,events}=home({quota:false});
 try{
  await w.triggerMatch(false);
  assert.deepEqual(events.filter(event=>['claim','debit','release','render'].includes(event)),['claim','debit','release']);
 }finally{dom.window.close();}
});

test('an unavailable optional recent-title cache cannot skip recording the shown identity',()=>{
 const identity={title:'Shown Film',tmdbId:123,kind:'movie'},remembered=[],session=new Set();
 const context=vm.createContext({SESSION_SHOWN:session,recentTitles:[],persistSessionShown:()=>{},
  localStorage:{setItem(){throw new Error('storage quota');}},
  window:{matchPolicy:{remember:(item,action)=>remembered.push({item,action})}}});
 vm.runInContext(source.match(/function rememberShownTitle\([\s\S]*?\n}\n/)[0],context);
 assert.doesNotThrow(()=>context.rememberShownTitle(identity));
 assert(session.has(identity.title));
 assert.equal(remembered.length,1);assert.equal(remembered[0].item,identity);assert.equal(remembered[0].action,'shown');
});
