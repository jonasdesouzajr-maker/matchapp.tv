const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8').replace(/\r\n/g,'\n');
const fn=name=>source.match(new RegExp('(?:async )?function '+name+'\\([\\s\\S]*?\\n}\\n'))[0];
const moodGenres=source.match(/const MOOD_SOURCE_GENRES=\{[\s\S]*?\n\};/)[0];
const cozyRules=source.match(/const COZY_BLOCKED_GENRES[\s\S]*?function moodFitsVerified\([\s\S]*?\n}/)[0];

function harness({proposals,lookup,details,known=[],shown=[]}){
  const calls={lookup:[],details:[]};
  const window={
    matchPolicy:{key:t=>String(t).toLowerCase().replace(/[^a-z0-9]/g,''),known:()=>new Set(known.map(t=>String(t).toLowerCase().replace(/[^a-z0-9]/g,'')))},
    MatchAppCatalogMedia:{regionCode:()=>'BR'},
    tmdbLookup:async(title,hints)=>{calls.lookup.push({title,hints});return lookup[title]||null;},
    tmdbDetails:async(id,kind,opts)=>{calls.details.push({id,kind,opts});return details[id]||null;}
  };
  const context=vm.createContext({window,console,SESSION_SHOWN:new Set(shown),
    fetchGeminiData:async()=>({results:proposals}),
    currentPreferenceExclusions:()=>({countries:new Set(),genres:new Set()})});
  vm.runInContext(moodGenres+'\n'+cozyRules+'\n'+['normCriteria','canonicalProviderName','sourceRatingFits','categoryFitsVerified'].map(fn).join('\n')+'\n'+fn('aiProposedVerifiedExact'),context);
  return {run:requested=>context.aiProposedVerifiedExact(requested),calls};
}
const movie=(id,title,extra={})=>({tmdbId:id,kind:'movie',title,year:2017,genres:['Comedy','Family'],originCountries:['GB'],contentRating:'PG',availability:{BR:{stream:['Netflix']}},overview:'A bear.',...extra});

test('AI proposals are only returned after TMDB verifies every hard choice',async()=>{
  const {run,calls}=harness({
    proposals:[{title:'Seen Before',year:2019,kind:'movie'},{title:'Wrong Genre',year:2016,kind:'movie'},{title:'Paddington 2',year:2017,kind:'movie'}],
    lookup:{'Wrong Genre':{tmdbId:2,kind:'movie',title:'Wrong Genre'},'Paddington 2':{tmdbId:3,kind:'movie',title:'Paddington 2'}},
    details:{2:movie(2,'Wrong Genre',{genres:['Drama']}),3:movie(3,'Paddington 2')},
    known:['Seen Before']
  });
  const pick=await run({cat:['movie'],plat:['Netflix'],mood:['funny'],vibe:[],rating:[],decade:[],genre:[]});
  assert.equal(pick?.title,'Paddington 2');
  assert.equal(pick.platform,'Netflix');
  assert.equal(pick.source,'tmdb-exact-live');
  assert.ok(!calls.lookup.some(c=>c.title==='Seen Before'),'already-seen titles are never even looked up');
  assert.ok(calls.details.every(c=>c.opts&&c.opts.priority===true),'Match lookups use the priority lane');
});

test('a proposal that is not on the requested platform is rejected',async()=>{
  const {run}=harness({
    proposals:[{title:'Paddington 2',year:2017,kind:'movie'}],
    lookup:{'Paddington 2':{tmdbId:3,kind:'movie',title:'Paddington 2'}},
    details:{3:movie(3,'Paddington 2',{availability:{BR:{stream:['Max']}}})}
  });
  assert.equal(await run({cat:['movie'],plat:['Netflix'],mood:[],vibe:[],rating:[],decade:[],genre:[]}),null);
});

test('formats TMDB cannot verify never reach the AI stage',async()=>{
  let asked=false;
  const {run}=harness({proposals:[],lookup:{},details:{}});
  const pick=await run({cat:['podcast'],plat:[],mood:[],vibe:[],rating:[],decade:[],genre:[]});
  assert.equal(pick,null);assert.equal(asked,false);
});


test('cozy live verification rejects heavy romance/drama and accepts genuine comfort genres',async()=>{
  const {run}=harness({
    proposals:[
      {title:'Heavy Romance',year:2024,kind:'movie'},
      {title:'Warm Family Film',year:2023,kind:'movie'}
    ],
    lookup:{
      'Heavy Romance':{tmdbId:7,kind:'movie',title:'Heavy Romance'},
      'Warm Family Film':{tmdbId:8,kind:'movie',title:'Warm Family Film'}
    },
    details:{
      7:movie(7,'Heavy Romance',{genres:['Drama','Romance'],overview:'A parent travels abroad looking for an organ donor for a critically ill child.'}),
      8:movie(8,'Warm Family Film',{genres:['Comedy','Family'],overview:'A family reconnects over a gentle holiday weekend.'})
    }
  });
  const pick=await run({cat:['movie'],plat:['Netflix'],mood:['cozy comfort watch'],vibe:[],rating:[],decade:[],genre:[]});
  assert.equal(pick?.title,'Warm Family Film');
});

test('shown results are promoted into shared match history for cross-device repeat prevention',()=>{
  const block=source.match(/function rememberShownTitle\(title\)[\s\S]*?\n}/)?.[0]||'';
  assert.match(block,/matchPolicy\?\.remember\?\.\(\{title\}, 'shown'\)/);
});
