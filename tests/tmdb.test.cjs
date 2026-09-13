const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
test('Kids can verify English catalogue identities in a Portuguese UI without reusing localized cache results',async()=>{
  const dom=new JSDOM('',{url:'https://matchapp.tv/kids/',runScripts:'outside-only'}),w=dom.window,calls=[];
  w.MATCH_LANG='pt-BR';
  w.supabaseClient={functions:{invoke:async(name,{body})=>{calls.push(body.lang);return {data:{results:[{title:body.lang==='pt-BR'?'Meu Amigo Totoro':'My Neighbor Totoro',originalTitle:'となりのトトロ',year:'1988',kind:'movie',adult:false,poster:'https://image.tmdb.org/t/p/w500/totoro.jpg'}]}};}}};
  w.eval(fs.readFileSync(path.join(__dirname,'../tmdb.js'),'utf8'));
  const hints={year:1988,kind:'movie'};
  assert.equal(await w.tmdbLookup('My Neighbor Totoro',hints),null);
  const result=await w.tmdbLookup('My Neighbor Totoro',{...hints,lang:'en-US'});
  assert.equal(result.title,'My Neighbor Totoro');
  await w.tmdbLookup('My Neighbor Totoro',{...hints,lang:'en-US'});
  assert.deepEqual(calls,['pt-BR','en-US']);
  dom.window.close();
});
