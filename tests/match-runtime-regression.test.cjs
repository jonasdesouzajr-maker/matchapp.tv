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
 vm.runInContext(functionSource('normCriteria')+functionSource('pickFromCatalog'),context);
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

test('an exhausted family selection cannot spend a match or silently drop the age restriction',async()=>{
 const excluded=catalog.filter(entry=>entry.ratings.includes('all ages family friendly')).map(entry=>entry.title);
 const {dom,w,state}=matching({cat:['movie'],plat:[],mood:[],vibe:[],rating:['all ages family friendly'],decade:[]},excluded);
 try{await w.triggerMatch(false);assert.equal(state.rendered,null,'no result may violate the requested age restriction');assert.equal(state.charges,0,'an empty exact search must not use credits');}finally{dom.window.close();}
});

test('account history exhaustion cannot consume credits when no new title can be returned',async()=>{
 const {dom,w,state}=matching({cat:['movie'],plat:[],mood:['funny'],vibe:[],rating:[],decade:[]},catalog.map(entry=>entry.title));
 try{await w.triggerMatch(false);assert.equal(state.rendered,null);assert.equal(state.charges,0,'permanent exclusions count toward exhaustion before metering');assert.equal(w.document.getElementById('questionnaire-box').style.display,'block','an empty rematch restores the criteria');assert.equal(w.document.getElementById('search-box').style.display,'block');assert.equal(w.document.getElementById('loading-box').style.display,'none');}finally{dom.window.close();}
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
