const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/\r\n/g,'\n');
const catalog=vm.runInNewContext(source.match(/const CONTENT_CATALOG = (\[[\s\S]*?\n\]);/)[1]);
const functionSource=name=>source.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n}\\n'))[0];
function matching(requested,excluded=[]){
 const dom=new JSDOM('<div id="questionnaire-box" style="display:none"></div><div id="search-box" style="display:none"></div><div id="result-box"></div><div id="loading-box"></div>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window,state={charges:0,rendered:null,messages:[]};
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.localStorage.setItem('match_seenList',JSON.stringify(excluded));w.eval(fs.readFileSync(path.join(root,'matching-policy.js'),'utf8'));
 w.getMatchCriteria=()=>requested;w.localizeMatchSynopsis=async text=>text;w.showToast=text=>state.messages.push(text);
 const context=vm.createContext({window:w,document:w.document,CustomEvent:w.CustomEvent,CONTENT_CATALOG:catalog,SESSION_SHOWN:new Set(),isVIP:false,Math,
  isBlockedEntry:()=>false,isSurpriseEligible:entry=>entry.cats.some(c=>['movie','series','limited series','K-drama','novela brasileira','telenovela'].includes(c)),
  tSafe:key=>key,checkDailyLimit:async()=>{state.charges++;return true;},discoverFromITunes:async()=>null,rememberShownTitle:()=>{},renderResult:result=>{state.rendered=result;},setInterval:()=>1,clearInterval:()=>{},setTimeout:fn=>{fn();return 1;},console});
 vm.runInContext(functionSource('normCriteria')+functionSource('pickFromCatalog')+functionSource('pickRecycledCatalog'),context);
 vm.runInContext(source.slice(source.indexOf('window.triggerMatch = async function'),source.indexOf('// THE RENDER ENGINE')),context);
 return {dom,w,context,state};
}

test('exact catalogue choices satisfy their selected category, mood, platform, rating and decade',()=>{
 const {dom,w,context}=matching({});let cases=0;
 try{for(const entry of catalog){for(const cat of entry.cats){const criteria={cat:[cat],plat:[entry.platform],mood:entry.moods.filter(x=>x!=='any').slice(0,1),vibe:entry.vibes.filter(x=>x!=='any').slice(0,1),rating:entry.ratings.filter(x=>x!=='any').slice(0,1),decade:entry.year?[Math.floor(entry.year/10)*10+'s']:[]};
 const pick=context.pickFromCatalog(criteria.cat,criteria.plat,criteria.mood,criteria.vibe,criteria.rating,criteria.decade);
 if(cat!=='Gospel & Faith'&&entry.cats.includes('Gospel & Faith'))continue;
 assert(pick,entry.title+' must remain findable');assert(w.matchPolicy.matches(catalog.find(item=>item.title===pick.title),criteria));cases++;
 }}assert(cases>=catalog.length);}finally{dom.window.close();}
});

test('history exhaustion recycles an exact family-safe title without dropping age restriction',async()=>{
 const excluded=catalog.filter(entry=>entry.ratings.includes('all ages family friendly')).map(entry=>entry.title);
 const {dom,w,state}=matching({cat:['movie'],plat:[],mood:[],vibe:[],rating:['all ages family friendly'],decade:[]},excluded);
 try{await w.triggerMatch(false);assert(state.rendered,'an exact previously shown title should be recycled instead of dead-ending');const entry=catalog.find(e=>e.title===state.rendered.title);assert(entry&&entry.cats.includes('movie'));assert(entry.ratings.includes('all ages family friendly'),'recovery must preserve the selected age/rating');assert.equal(state.rendered._historyFallback,true);assert.equal(state.charges,1);}finally{dom.window.close();}
});

test('account history exhaustion returns an exact recycled title instead of the no-fresh error',async()=>{
 const {dom,w,state}=matching({cat:['movie'],plat:[],mood:['funny'],vibe:[],rating:[],decade:[]},catalog.map(entry=>entry.title));
 try{await w.triggerMatch(false);assert(state.rendered,'history exhaustion must still produce a result');const entry=catalog.find(e=>e.title===state.rendered.title);assert(entry&&entry.cats.includes('movie'));assert(entry.moods.includes('funny'));assert.equal(state.rendered._historyFallback,true);assert.equal(state.charges,1);assert(!state.messages.includes('polish.noFresh'));}finally{dom.window.close();}
});

test('truly impossible criteria still fail closed before spending a match',async()=>{
 const {dom,w,state}=matching({cat:['movie'],plat:['Impossible service'],mood:['funny'],vibe:[],rating:[],decade:[]},catalog.map(entry=>entry.title));
 try{await w.triggerMatch(false);assert.equal(state.rendered,null);assert.equal(state.charges,0);assert(state.messages.includes('polish.noFresh'));}finally{dom.window.close();}
});

test('recycled fallback preserves criteria and avoids the current title when another exact option exists',()=>{
 const requested={cat:['movie'],plat:[],mood:['funny'],vibe:[],rating:[],decade:[]};
 const {dom,w,context}=matching(requested,catalog.map(entry=>entry.title));
 try{const exact=catalog.filter(e=>w.matchPolicy.matchesCriteria(e,requested));assert(exact.length>=2,'test requires at least two funny movies');context.window.globalMatchTitle=exact[0].title;context.SESSION_SHOWN.add(exact[0].title);const pick=context.pickRecycledCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade);assert(pick);assert.equal(pick._historyFallback,true);assert(w.matchPolicy.matchesCriteria(catalog.find(e=>e.title===pick.title),requested));assert.notEqual(pick.title,exact[0].title);}
 finally{dom.window.close();}
});

test('history recycling never returns Watch Later or Not For Me titles',()=>{
 const requested={cat:['movie'],plat:[],mood:[],vibe:[],rating:[],decade:[]};
 const {dom,w,context}=matching(requested,catalog.map(entry=>entry.title));
 try{
  const exact=catalog.filter(e=>w.matchPolicy.matchesCriteria(e,requested));
  assert(exact.length>=3,'test requires at least three matching movies');
  const saved=exact[0],declined=exact[1];
  w.localStorage.setItem('match_savedList',JSON.stringify([{title:saved.title}]));
  w.matchPolicy.remember(declined,'dislike',false);
  w.localStorage.removeItem('match_dislikedList');
  const pick=context.pickRecycledCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade);
  assert(pick,'another recyclable exact title should still be available');
  assert.equal(pick._historyFallback,true);
  assert.notEqual(w.matchPolicy.key(pick.title),w.matchPolicy.key(saved.title),'Watch Later must remain excluded');
  assert.notEqual(w.matchPolicy.key(pick.title),w.matchPolicy.key(declined.title),'Not For Me must remain excluded after cloud/history restore');
 }finally{dom.window.close();}
});

test('removed catalogue options cannot remain as invisible saved search constraints',()=>{
 const html='<div><label>Category</label><select id="q-category"><option value="any">Any</option><option value="movie">Movies</option></select></div><div><label>Platform</label><select id="q-platform"><option value="any">Any</option><option value="Netflix">Netflix</option></select></div>';
 const dom=new JSDOM(html,{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 try{w.localStorage.setItem('match_criteria_v1',JSON.stringify({cat:['C-drama'],plat:['Apple TV+']}));w.eval(fs.readFileSync(path.join(root,'criteria.js'),'utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));w.document.dispatchEvent(new w.Event('matchapp:optionspruned'));
 const criteria=w.getMatchCriteria();assert.deepEqual(Array.from(criteria.cat),[]);assert.deepEqual(Array.from(criteria.plat),[]);
 }finally{dom.window.close();}
});

test('catalogue pruning synchronizes chips and saved state while retaining available choices',()=>{
 const html='<div><label>Category</label><select id="q-category"><option value="any">Any</option><option value="movie">Movies</option><option value="C-drama">C-drama</option></select></div><div><label>Platform</label><select id="q-platform"><option value="any">Any</option><option value="Netflix">Netflix</option></select></div>';
 const dom=new JSDOM(html,{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 try{w.eval(fs.readFileSync(path.join(root,'criteria.js'),'utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));w.setMatchCriteria({cat:['movie','C-drama'],plat:['Netflix']});
 w.document.querySelector('option[value="C-drama"]').remove();w.document.dispatchEvent(new w.Event('matchapp:optionspruned'));
 assert.deepEqual(Array.from(w.getMatchCriteria().cat),['movie']);assert.deepEqual(Array.from(w.getMatchCriteria().plat),['Netflix']);assert.equal(w.document.querySelector('[data-value="C-drama"]'),null);
 const saved=JSON.parse(w.localStorage.getItem('match_criteria_v1'));assert.deepEqual(saved.cat,['movie']);assert.deepEqual(saved.plat,['Netflix']);
 w.document.dispatchEvent(new w.Event('matchapp:langchange'));assert.deepEqual(Array.from(w.getMatchCriteria().cat),['movie']);assert.equal(w.document.querySelector('[data-value="movie"]').getAttribute('aria-pressed'),'true');
 }finally{dom.window.close();}
});
