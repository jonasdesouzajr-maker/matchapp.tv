const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const topic=require('../topic-focus.js');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/\r\n/g,'\n');
const catalog=vm.runInNewContext(source.match(/const CONTENT_CATALOG = (\[[\s\S]*?\n\]);/)[1]);
const functionSource=name=>source.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n}\\n'))[0];
function matching(requested,excluded=[]){
 const dom=new JSDOM('<div id="questionnaire-box" style="display:none"></div><div id="search-box" style="display:none"></div><div id="result-box"></div><div id="loading-box"></div>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window,state={charges:0,rendered:null,messages:[]};
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.localStorage.setItem('match_seenList',JSON.stringify(excluded));w.eval(fs.readFileSync(path.join(root,'matching-policy.js'),'utf8'));
 w.getMatchCriteria=()=>requested;w.localizeMatchSynopsis=async text=>text;w.showToast=text=>state.messages.push(text);
 w.MatchAppTopicFocus=topic;
 w.MatchAppCatalogMedia={regionCode:()=>w.__testRegion||'BR'};
 const context=vm.createContext({window:w,document:w.document,CustomEvent:w.CustomEvent,CONTENT_CATALOG:catalog,SESSION_SHOWN:new Set(),isVIP:false,Math,
  isBlockedEntry:()=>false,isSurpriseEligible:entry=>entry.cats.some(c=>['movie','series','limited series','K-drama','novela brasileira','telenovela'].includes(c)),
  tSafe:key=>key,matchAllowanceBeforeLookup:async()=>true,checkDailyLimit:async()=>{state.charges++;return true;},discoverFromITunes:async()=>null,discoverVerifiedExactTMDB:async()=>null,rememberShownTitle:()=>{},renderResult:result=>{state.rendered=result;},setInterval:()=>1,clearInterval:()=>{},setTimeout,clearTimeout,requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame:()=>{},console});
 vm.runInContext(functionSource('normCriteria')+functionSource('isSurpriseEligible')+functionSource('entryAllowedForSelection')+functionSource('regionAvailabilityFits')+'async '+functionSource('verifyCuratedPlatform')+functionSource('pickFromCatalog')+functionSource('pickRecycledCatalog')+functionSource('pickGuaranteedCatalog'),context);
 vm.runInContext(source.slice(source.indexOf('const MATCH_SOURCE_DEADLINES'),source.indexOf('// Non-spending preflight.'))+source.slice(source.indexOf('window.triggerMatch = async function'),source.indexOf('// THE RENDER ENGINE')),context);
 return {dom,w,context,state};
}

test('exact catalogue choices satisfy their selected category, mood, platform, rating and decade',()=>{
 const {dom,w,context}=matching({});let cases=0;
 try{for(const entry of catalog){w.__testRegion=entry.availabilityRegions?.[0]||entry.countryCode||'BR';for(const cat of entry.cats){if(!topic.allow(entry,[cat]))continue;const criteria={cat:[cat],plat:[entry.platform],mood:entry.moods.filter(x=>x!=='any').slice(0,1),vibe:entry.vibes.filter(x=>x!=='any').slice(0,1),rating:entry.ratings.filter(x=>x!=='any').slice(0,1),decade:entry.year?[Math.floor(entry.year/10)*10+'s']:[]};
 const pick=context.pickFromCatalog(criteria.cat,criteria.plat,criteria.mood,criteria.vibe,criteria.rating,criteria.decade);
 if(cat!=='Gospel & Faith'&&entry.cats.includes('Gospel & Faith'))continue;
 assert(pick,entry.title+' must remain findable');assert(w.matchPolicy.matches(catalog.find(item=>item.title===pick.title),criteria));cases++;
 }}assert(cases>=catalog.length);}finally{dom.window.close();}
});

test('history exhaustion stays uncharged and retryable when fresh sources are unavailable',async()=>{
 const excluded=catalog.filter(entry=>entry.ratings.includes('all ages family friendly')).map(entry=>entry.title);
 const requested={cat:['movie'],plat:[],mood:[],vibe:[],rating:['all ages family friendly'],decade:[]};
 const {dom,state}=matching(requested,excluded);
 try{await dom.window.triggerMatch(false);assert.equal(state.rendered,null);assert.equal(state.charges,0);assert(state.messages.some(text=>text.includes('no match was used')));}finally{dom.window.close();}
});

test('account history exhaustion cannot silently recycle a recommendation',async()=>{
 const requested={cat:['movie'],plat:[],mood:['funny'],vibe:[],rating:[],decade:[]};
 const {dom,w,state}=matching(requested,catalog.map(entry=>entry.title));
 try{w.matchappAllowSeenAgain=true;await w.triggerMatch(false);assert.equal(state.rendered,null);assert.equal(state.charges,0);}finally{dom.window.close();}
});

test('Home reserves before its debit and releases an unshown quota refusal',async()=>{
 const requested={cat:['movie'],plat:[],mood:[],vibe:[],rating:[],decade:[]};
 const {dom,w,context,state}=matching(requested,[]);let reserved;
 context.checkDailyLimit=async()=>{reserved=w.matchPolicy.history().find(item=>item.action==='reserved');assert(reserved,'the identity must be reserved before the debit');return false;};
 try{
  await w.triggerMatch(false);
  assert.equal(state.rendered,null);assert(reserved);assert(!w.matchPolicy.excludes(reserved),'an unshown quota refusal must not consume a title');
 }finally{dom.window.close();}
});

test('Home handles an atomic claim collision with one fresh alternative and one debit',async()=>{
 const requested={cat:['movie'],plat:[],mood:[],vibe:[],rating:[],decade:[]};
 const {dom,w,context,state}=matching(requested,[]);let attempts=0,firstTitle='';
 const real=w.matchPolicy;
 w.matchPolicy={...real,claim:async item=>{
  attempts++;
  if(attempts===1){firstTitle=item.title;real.remember(item,'shown',false);return false;}
  return real.claim(item);
 }};
 try{
  await w.triggerMatch(false);
  assert.equal(attempts,2);assert(state.rendered);assert.notEqual(state.rendered.title,firstTitle);assert.equal(state.charges,1);
 }finally{dom.window.close();}
});

test('ordinary matching preserves exact choices when no verifiable candidate exists',async()=>{
 const requested={cat:['unsupported format'],plat:['Impossible service'],mood:['funny'],vibe:[],rating:[],decade:[]};
 const {dom,w,state}=matching(requested,[]);
 try{
  await w.triggerMatch(false);
  assert.equal(state.rendered,null,'unverified selections must never invent a result');
  assert.equal(state.charges,0,'no match should consume no match credit');
  assert(state.messages.some(text=>text.includes('No verified exact title')&&text.includes('no match was used')));
 }finally{dom.window.close();}
});

test('recovery cannot claim an unverified selected streaming platform',async()=>{
 const requested={cat:['movie'],plat:['Impossible service'],mood:['funny'],vibe:[],rating:[],decade:['1900s']};
 const {dom,w,state}=matching(requested,[]);
 try{
  await w.triggerMatch(false);
  assert.equal(state.rendered,null,'a catalogue label is insufficient proof of country availability');
  assert.equal(state.charges,0);
 }finally{dom.window.close();}
});

test('impossible secondary criteria fall back progressively without dropping category or rating',()=>{
 const requested={cat:['movie'],plat:['Impossible service'],mood:['funny'],vibe:['nostalgic'],rating:['teen PG-13'],decade:['1900s']};
 const {dom,context}=matching(requested,[]);
 try{
  const pick=context.pickGuaranteedCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade);
  assert(pick,'an over-specific combination should recover instead of dead-ending');
  const entry=catalog.find(e=>e.title===pick.title);
  assert(entry&&entry.cats.includes('movie'),'category remains hard');
  assert(entry.ratings.includes('teen PG-13'),'rating remains hard');
  assert.equal(pick._relaxedFallback,true);
  assert.equal(pick._relaxedStage,'broaden-platform');
 }finally{dom.window.close();}
});

test('guaranteed picker never relaxes the selected category across category families',()=>{
 const categories=['movie','series','K-drama','anime','telenovela'].filter(cat=>catalog.some(e=>e.cats.includes(cat)));
 assert(categories.length>=3,'catalog needs multiple category families for this regression');
 for(const cat of categories){
  const {dom,context}=matching({cat:[cat],plat:['Impossible service'],mood:['funny'],vibe:[],rating:[],decade:['1900s']},[]);
  try{
   const pick=context.pickGuaranteedCatalog([cat],['Impossible service'],['funny'],[],[],['1900s']);
   if(pick){
    const entry=catalog.find(e=>e.title===pick.title);
    assert(entry&&entry.cats.includes(cat),cat+' must remain a hard category boundary');
    assert.equal(pick._relaxedFallback,true);
   }
  }finally{dom.window.close();}
 }
});

test('exact guaranteed recovery never returns Watch Later or Not For Me titles',()=>{
 const funnyMovies=catalog.filter(e=>e.cats.includes('movie')&&e.moods.includes('funny'));
 assert(funnyMovies.length>=2,'test requires at least two funny movies');
 const requested={cat:['movie'],plat:[],mood:['funny'],vibe:[],rating:[],decade:[]};
 const {dom,w,context}=matching(requested,catalog.map(entry=>entry.title));
 try{
  w.localStorage.setItem('match_savedList',JSON.stringify([{title:funnyMovies[0].title}]));
  w.localStorage.setItem('match_dislikedList',JSON.stringify([{title:funnyMovies[1].title}]));
  const pick=context.pickGuaranteedCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade);
  if(pick){
    assert(w.matchPolicy.matchesCriteria(catalog.find(e=>e.title===pick.title),requested));
    assert.notEqual(w.matchPolicy.key(pick.title),w.matchPolicy.key(funnyMovies[0].title));
    assert.notEqual(w.matchPolicy.key(pick.title),w.matchPolicy.key(funnyMovies[1].title));
  }
 }finally{dom.window.close();}
});

test('source recycling flags cannot bypass the final known-title guard',async()=>{
 const requested={cat:['movie'],plat:[],mood:['funny'],vibe:[],rating:[],decade:[]};
 for(const sourceName of ['catalog-recycle','catalog-guaranteed-recycle']){
  const {dom,w,context,state}=matching(requested,catalog.map(entry=>entry.title));
  try{
   const old=catalog.find(e=>w.matchPolicy.matchesCriteria(e,requested));
   w.MatchAppAIRank={rank:()=>{}};
   context.rankVerifiedCuratedMatch=async()=>({...old,source:sourceName,_historyFallback:true});
   await w.triggerMatch(false);assert.equal(state.rendered,null);assert.equal(state.charges,0);
  }finally{dom.window.close();}
 }
});

test('legacy recycled picker returns only a fresh exact alternative and returns null after exhaustion',()=>{
 const requested={cat:['movie'],plat:[],mood:['funny'],vibe:[],rating:[],decade:[]};
 const {dom,w,context}=matching(requested,[]);
 try{
  const exact=catalog.filter(e=>w.matchPolicy.matchesCriteria(e,requested));
  context.window.globalMatchTitle=exact[0].title;context.SESSION_SHOWN.add(exact[0].title);
  const pick=context.pickRecycledCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade);
  assert(pick);assert(w.matchPolicy.matchesCriteria(pick,requested));assert.notEqual(pick.title,exact[0].title);assert.notEqual(pick._historyFallback,true);
  w.localStorage.setItem('match_seenList',JSON.stringify(catalog.map(entry=>entry.title)));
  assert.equal(context.pickRecycledCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade),null);
 }finally{dom.window.close();}
});

test('both fallback pickers keep saved, declined and ordinary history excluded',()=>{
 const requested={cat:['movie'],plat:[],mood:[],vibe:[],rating:[],decade:[]};
 const {dom,w,context}=matching(requested,catalog.map(entry=>entry.title));
 try{
  const exact=catalog.filter(e=>w.matchPolicy.matchesCriteria(e,requested));
  const saved=exact[0],declined=exact[1];
  w.localStorage.setItem('match_savedList',JSON.stringify([{title:saved.title}]));
  w.matchPolicy.remember(declined,'dislike',false);w.localStorage.removeItem('match_dislikedList');
  for(const picker of ['pickRecycledCatalog','pickGuaranteedCatalog'])assert.equal(context[picker](requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade),null);
  assert(w.matchPolicy.excludes(declined,{hardOnly:true}));
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

test('a stalled AI proposal leaves time to launch independent exact discovery',async()=>{
 const {dom,w,context,state}=matching({cat:['movie'],plat:['Impossible service'],mood:[],vibe:[],rating:[],decade:[]});
 let now=1000,sourceCalls=0;const deadlines=[];
 context.Date={now:()=>now};
 context.aiProposedVerifiedExact=()=>new Promise(()=>{});
 context.discoverVerifiedExactTMDB=async()=>{sourceCalls++;return null;};
 context.setTimeout=(fn,ms)=>{deadlines.push(ms);queueMicrotask(()=>{now+=ms;fn();});return deadlines.length;};
 try{
  await w.triggerMatch(false);
  assert.equal(sourceCalls,1,'independent discovery must run after AI timeout');
  assert.equal(deadlines[0],25000,'AI reserves 35 seconds of the overall budget');
  assert(deadlines[1]>=27000,'TMDB retains time even after AI stalls');
  assert.equal(state.rendered,null,'unavailable regional proof must not become a platform-labelled catalogue fallback');
  assert.equal(state.charges,0,'unsuccessful independent recovery remains uncharged');
 }finally{dom.window.close();}
});
