const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const english={tmdbId:8392,title:'My Neighbor Totoro',originalTitle:'となりのトトロ',year:'1988',kind:'movie',adult:false,poster:'https://image.tmdb.org/t/p/w500/totoro.jpg'};
function setup(patch={}){const dom=new JSDOM('',{url:'https://matchapp.tv/kids/',runScripts:'outside-only'}),w=dom.window,calls=[];w.MATCH_LANG='pt-BR';w.supabaseClient={functions:{invoke:async(name,{body})=>{calls.push(body);return {data:{results:[body.tmdb_id?{...english,title:'Meu Amigo Totoro',...patch}:english]}};}}};w.eval(fs.readFileSync(path.join(__dirname,'../tmdb.js'),'utf8'));return {dom,w,calls};}
test('regional names use a verified identity while Kids keeps its independent English identity cache',async()=>{const {dom,w,calls}=setup(),hints={year:1988,kind:'movie'};assert.equal((await w.tmdbLookup('My Neighbor Totoro',hints)).title,'Meu Amigo Totoro');assert.equal(calls[0].lang,'en-US');assert.equal(calls[1].tmdb_id,8392);assert.equal(calls[1].lang,'pt-BR');assert.equal((await w.tmdbLookup('My Neighbor Totoro',{...hints,lang:'en-US'})).title,'My Neighbor Totoro');await w.tmdbLookup('My Neighbor Totoro',{...hints,lang:'en-US'});assert.equal(calls.length,3);dom.window.close();});
test('a localized response cannot replace a title with another ID, type, year, original identity or adult work',async()=>{for(const patch of [{tmdbId:1},{kind:'tv'},{year:'2005'},{originalTitle:'Other'},{adult:true}]){const {dom,w}=setup(patch);assert.equal((await w.tmdbLookup('My Neighbor Totoro',{year:1988,kind:'movie'})).title,'My Neighbor Totoro');dom.window.close();}});
test('localized captions reject fuzzy titles and wrong catalogue years or types before requesting a translation',async()=>{
 for(const patch of [{title:'Black Beauty',originalTitle:'Other'},{year:'1985'},{kind:'movie'}]){
  const d=new JSDOM('',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=d.window,calls=[];
  w.MATCH_LANG='pt-BR';w.supabaseClient={};w.fetch=async()=>({ok:true,json:async()=>[]});w.tmdbKindForCats=()=> 'tv';
  w.CONTENT_CATALOG=[{title:'Beauty in Black',year:2024,cats:['series']}];
  w.tmdbLookup=async(t,h)=>{assert.equal(h.year,2024);assert.equal(h.lang,'en-US');return {tmdbId:10,title:'Beauty in Black',originalTitle:'Beauty in Black',year:'2024',kind:'tv',adult:false,...patch};};
  w.requestTMDB=async b=>{calls.push(b);return {data:{results:[]}};};w.eval(fs.readFileSync(path.join(__dirname,'../title-captions.js'),'utf8'));
  assert.equal(await w.localizedTitle('Beauty in Black'),'Beauty in Black');assert.equal(calls.length,0);w.close();
 }
});
test('an exact typed catalogue identity permits a verified regional caption',async()=>{
 const d=new JSDOM('',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=d.window;
 w.MATCH_LANG='pt-BR';w.supabaseClient={};w.fetch=async()=>({ok:true,json:async()=>[]});w.tmdbKindForCats=()=> 'tv';
 w.CONTENT_CATALOG=[{title:'Beauty in Black',year:2024,cats:['series']}];
 const record={tmdbId:10,title:'Beauty in Black',originalTitle:'Beauty in Black',year:'2024',kind:'tv',adult:false};
 w.tmdbLookup=async()=>record;w.requestTMDB=async()=>({data:{results:[{...record,title:'Beleza em Preto'}]}});
 w.eval(fs.readFileSync(path.join(__dirname,'../title-captions.js'),'utf8'));assert.equal(await w.localizedTitle('Beauty in Black'),'Beleza em Preto');w.close();
});

test('a verified mature TV identity keeps its real poster when the synopsis mentions adult themes',async()=>{
 const d=new JSDOM('',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=d.window;
 const record={tmdbId:246246,kind:'tv',title:'Beauty in Black',originalTitle:'Beauty in Black',year:'2024',adult:false,overview:"A stripper's fate changes when she meets a cosmetics dynasty.",poster:'https://image.tmdb.org/t/p/w500/xKk4bFCCpZ9tvjUykvvMYLSBnjo.jpg'};
 w.isExplicitResult=()=>true; // Legacy keyword heuristic must not override TMDB's typed identity.
 w.supabaseClient={functions:{invoke:async()=>({data:{results:[record]}})}};
 w.eval(fs.readFileSync(path.join(__dirname,'../tmdb.js'),'utf8'));
 assert.equal((await w.tmdbLookup('Beauty in Black',{year:2024,kind:'tv'})).tmdbId,246246);
 w.close();
});

test('initial poster lookup rejects fuzzy names, wrong media, editions, adult flags and non-TMDB images',async()=>{
 const record={tmdbId:246246,kind:'tv',title:'Beauty in Black',originalTitle:'Beauty in Black',year:'2024',adult:false,poster:'https://image.tmdb.org/t/p/w500/xKk4bFCCpZ9tvjUykvvMYLSBnjo.jpg'};
 for(const patch of [{title:'Beauty in Black Music Video',originalTitle:'Beauty in Black Music Video'},{kind:'movie'},{year:'2020'},{year:''},{adult:true},{tmdbId:null},{poster:'https://unrelated.example/cover.jpg'},{posterLarge:'https://unrelated.example/cover.jpg'}]){
  const d=new JSDOM('',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=d.window;
  w.isRelevantMatch=()=>true; // A permissive discovery matcher cannot weaken artwork identity.
  w.supabaseClient={functions:{invoke:async()=>({data:{results:[{...record,...patch}]}})}};
  w.eval(fs.readFileSync(path.join(__dirname,'../tmdb.js'),'utf8'));
  assert.equal(await w.tmdbLookup('Beauty in Black',{year:2024,cats:['series']}),null,JSON.stringify(patch));
  w.close();
 }
});
