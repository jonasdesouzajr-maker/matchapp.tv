const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const tmdb=fs.readFileSync(path.join(__dirname,'..','tmdb.js'),'utf8');

function setup(answers){
  const dom=new JSDOM('',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window,calls=[];
  w.setTimeout=(fn)=>{fn();return 1;};
  w.supabaseClient={functions:{invoke:async(name,{body})=>{calls.push(body);const next=answers.shift();return typeof next==='function'?next(body):next;}}};
  w.eval(tmdb);
  return {dom,w,calls};
}
const busy={data:null,error:{context:{status:429,headers:{get:()=>null}}}};
const discovered={data:{results:[{tmdbId:346648,kind:'movie',title:'Paddington 2',adult:false}]},error:null};

test('a failed discover is not cached, so the next Match asks the source again',async()=>{
  const {dom,w,calls}=setup([{data:null,error:{context:{status:400}}},discovered]);
  try{
    assert.equal((await w.tmdbDiscover({kind:'movie'})).length,0);
    assert.equal((await w.tmdbDiscover({kind:'movie'})).length,1,'second Match must not reuse the failure');
    assert.equal(calls.length,2);
  }finally{dom.window.close();}
});

test('Match lookups retry a busy source; background lookups do not',async()=>{
  const {dom,w,calls}=setup([busy,discovered]);
  try{
    assert.equal((await w.tmdbDiscover({kind:'tv'},{priority:true})).length,1);
    assert.equal(calls.length,2,'one retry after a 429');
  }finally{dom.window.close();}
  const bg=setup([busy,discovered]);
  try{
    assert.equal((await bg.w.tmdbDiscover({kind:'tv'})).length,0);
    assert.equal(bg.calls.length,1,'covers and captions never retry');
  }finally{bg.dom.window.close();}
});

test('a failed details request is not cached; a real empty answer is',async()=>{
  const {dom,w,calls}=setup([busy,{data:{results:[{tmdbId:1,kind:'movie',title:'A',adult:false}]},error:null},{data:{results:[]},error:null}]);
  try{
    assert.equal(await w.tmdbDetails(1,'movie'),null);
    assert.equal((await w.tmdbDetails(1,'movie'))?.title,'A');
    assert.equal(calls.length,2);
    assert.equal(await w.tmdbDetails(2,'movie'),null);
    assert.equal(await w.tmdbDetails(2,'movie'),null);
    assert.equal(calls.length,3,'a real empty answer is cached');
  }finally{dom.window.close();}
});

test('TMDB proxy preserves source genre IDs for verified mood and genre gating',()=>{
 const proxy=require('node:fs').readFileSync(require('node:path').join(__dirname,'../supabase/functions/tmdb-proxy/index.ts'),'utf8');
 assert.match(proxy,/genreIds: Array\.isArray\(r\.genre_ids\)/,
  'a source-verified TV/movie genre must reach the strict mood safety policy');
 assert.match(proxy,/Number\.isSafeInteger\(n\)&&n>0/,
  'filter invalid/non-numeric provider genre codes');
});

test('empty discover responses never poison the next exact Match',async()=>{
  const empty={data:{results:[]},error:null};
  const good={data:{results:[{tmdbId:12345,kind:'tv',title:'Verified comedy',adult:false}]},error:null};
  const {dom,w,calls}=setup([empty,good]);
  try {
    const criteria={kind:'tv',genre_ids:[35],provider:'Max',region:'BR'};
    assert.equal((await w.tmdbDiscover(criteria)).length,0);
    assert.equal((await w.tmdbDiscover(criteria)).length,1);
    assert.equal(calls.length,2,'an empty source response cannot be cached forever');
  }finally{dom.window.close();}
});

test('source-based region/provider filtering rejects channels and never uses world catalogue for Max',()=>{
  const vm=require('node:vm');
  const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/tmdb-proxy/index.ts'),'utf8');
  const fragment=source.match(/function canonicalWatchProvider\(value: unknown\): string \{[\s\S]*?\n\}/);
  assert.ok(fragment,'provider normalizer exists');
  const provider=vm.runInNewContext(fragment[0].replace('(value: unknown): string','(value)')+'; canonicalWatchProvider',{});
  assert.equal(provider('HBO Max'),'max');
  assert.equal(provider('Max'),'max');
  assert.equal(provider('HBO Max Amazon Channel'),'channel:hbomaxamazonchannel');
  assert.equal(provider('Netflix Standard with Ads'),'netflix');
  assert.equal(provider('Amazon Prime Video'),'primevideo');
  assert.match(source,/watch\/providers\/[^\n]*watch_region=/);
  assert.match(source,/params\.set\("with_watch_providers", selectedProviderIds\.join\("\\|"\)\)/);
  assert.match(source,/n\.providerFiltered=true;n\.verifiedProvider=canonicalWatchProvider\(provider\);n\.verifiedRegion=region/);
  assert.match(source,/if\(!out\.length&&upstreamFailures\)return json\(/);
});

test('exact Funny + Series + Max accepts only source-verified direct streaming in BR',async()=>{
  const vm=require('node:vm'),app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
  const start=app.indexOf('const TMDB_GENRE_ID_BY_NAME=');
  const end=app.indexOf('// AI-PROPOSED, SOURCE-VERIFIED FRESH TITLE',start);
  assert.ok(start>=0&&end>start,'extract independently verified discovery functions');
  let discovery={
    tmdbId:123456,kind:'tv',title:'Verified comedy',genreIds:[35],
    poster:'https://image.tmdb.org/t/p/w500/verified-comedy.jpg',
    overview:'A light comedy series.',year:'2023',providerFiltered:true,
    verifiedProvider:'max',verifiedRegion:'BR'
  };
  let details={
    title:'Verified comedy',year:'2023',genres:['Comedy'],originCountries:['US'],
    overview:'A light comedy series.',contentRating:'TV-PG',
    availability:{BR:{stream:['HBO Max'],rent:[],buy:[]}}
  };
  const ctx={
    window:{
      tmdbDiscover:async()=>[discovery],
      tmdbDetails:async()=>details,
      matchPolicy:{key:value=>String(value).toLowerCase(),known:()=>new Set()},
      MatchAppCatalogMedia:{regionCode:()=> 'BR'}
    },
    normCriteria:xs=>Array.isArray(xs)?xs.filter(Boolean):[],
    currentPreferenceExclusions:()=>({countries:new Set(),genres:new Set()}),
    SESSION_SHOWN:new Set(),Math,Date
  };
  const find=vm.runInNewContext(app.slice(start,end)+'; discoverVerifiedExactTMDB',ctx);
  const requested={cat:['series'],plat:['Max'],mood:['funny'],vibe:[],rating:[],genre:[],decade:[]};
  const good=await find(requested);
  assert.equal(good?.title,'Verified comedy');
  assert.equal(good?.platform,'HBO Max');
  assert.equal(good?.platformVerified,true);
  // Filtering by provider is NOT proof when a backend accidentally returns an
  // unrelated worldwide title, and Amazon channels are not a direct Max stream.
  discovery={...discovery,providerFiltered:false};
  details={...details,availability:{BR:{stream:['Netflix'],rent:['HBO Max Amazon Channel']}}};
  assert.equal(await find(requested),null);
  discovery={...discovery,providerFiltered:true};
  assert.equal(await find(requested),null,'details contradict a claimed Max result');
  details=null;
  assert.ok(await find(requested),'verified provider-filtered discover may survive temporary details outage');
});
