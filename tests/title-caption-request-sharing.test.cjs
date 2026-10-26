'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('title-captions.js','utf8');
function fixture(fetcher){
 const d=new JSDOM('<html lang="pt-BR"><head></head><body></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=d.window;
 w.MATCH_LANG='pt-BR';w.supabaseClient={};w.fetch=fetcher;
 const records=Array.from({length:26},(_,i)=>({title:'Title '+i,originalTitle:'Original '+i,year:2024,kind:'movie',tmdbId:i+1,adult:false}));
 w.requestTMDB=async body=>({data:{results:[{...records[body.tmdb_id-1],title:'Localized '+body.tmdb_id}]}});
 w.eval(source);return {w,records,close:()=>w.close()};
}
test('26 simultaneous verified captions share one registry download and keep distinct title identities',async()=>{
 let reads=0,finish;const response=new Promise(r=>finish=r),f=fixture(()=>{reads++;return response;});
 try{
  const work=f.records.map(r=>f.w.localizedTitle(r.title,{year:r.year,kind:r.kind}));
  assert.equal(reads,1);
  finish({ok:true,json:async()=>f.records});
  assert.deepEqual(await Promise.all(work),f.records.map(r=>'Localized '+r.tmdbId));
  assert.equal(reads,1);
  assert.equal(await f.w.localizedTitle('Title 0',{year:2024,kind:'movie'}),'Localized 1');
  assert.equal(reads,1);
 }finally{f.close();}
});
for(const kind of ['network','http','invalid-payload','json-parse'])test('registry '+kind+' failure stays shared, fails closed and permits a later read',async()=>{
 let reads=0,finish;const pending=new Promise(r=>finish=r);const f=fixture(()=>{reads++;return reads===1?pending:Promise.resolve({ok:true,json:async()=>f.records});});
 try{
  const a=f.w.localizedTitle('Title 0',{year:2024,kind:'movie'}),b=f.w.localizedTitle('Title 1',{year:2024,kind:'movie'});
  assert.equal(reads,1);
  if(kind==='network')finish(Promise.reject(Error('offline')));
  else finish({ok:kind!=='http',json:async()=>{if(kind==='json-parse')throw Error('malformed JSON');return {unexpected:true};}});
  assert.deepEqual(await Promise.all([a,b]),['Title 0','Title 1']);
  f.w.MATCH_LANG='es';
  assert.equal(await f.w.localizedTitle('Title 0',{year:2024,kind:'movie'}),'Localized 1');
  assert.equal(reads,2);
 }finally{f.close();}
});
