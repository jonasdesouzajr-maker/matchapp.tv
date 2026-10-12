'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(root,'jonas','verified-documentary-series-20261011.js'),'utf8');
const flow=fs.readFileSync(path.join(root,'discover.js'),'utf8'),html=fs.readFileSync(path.join(root,'discover.html'),'utf8');
function harness(rows,details) {
 let invoked=0,lookups=0;
 const window={supabaseClient:{functions:{invoke:async(name,args)=>{assert.equal(name,'tmdb-proxy');assert.deepEqual(Array.from(args.body.discover.genre_ids),[99]);assert.equal(args.body.discover.kind,'tv');invoked++;return {data:{results:rows}};}}},
   MatchAppCatalogMedia:{lookupLive:async(title,{kind,tmdbId})=>{assert.equal(kind,'tv');lookups++;return details[tmdbId]||null;}}};
 vm.runInNewContext(code,{window,console,Promise});
 return {api:window.MatchAppVerifiedDocumentaries,stats:()=>({invoked,lookups})};
}
const meta=(id,extras={})=>({title:'Real Documentary '+id,tmdb_id:id,media_kind:'tv',genres:['Documentary'],
 origin_countries:['BR'],year:2025,overview:'Source-backed documentary.',poster_url:'https://image.tmdb.org/t/p/w500/real.jpg',
 poster_large_url:'https://image.tmdb.org/t/p/w780/real.jpg',
 availability:{BR:{stream:['Netflix'],link:'https://www.themoviedb.org/tv/'+id+'/watch?locale=BR'}},...extras});
test('intent must be documentary TV series, never just a documentary feature film',()=>{
 const {api}=harness([],{});
 assert.equal(api.matches('Recommend a Brazilian documentary series'),true);
 assert.equal(api.matches('Séries documentais brasileiras para assistir'),true);
 assert.equal(api.matches('Recommend a Brazilian documentary film'),false);
 assert.equal(api.matches('I do not want documentary series'),false);
});
test('only verified documentary TV, Brazilian origin, poster and regional providers are returned without billing',async()=>{
 const rows=[101,102,103,104,105,106].map(id=>({tmdbId:id,kind:'tv',genreIds:[99],adult:false,title:'Real Documentary '+id}));
 const details={101:meta(101),102:meta(102,{genres:['Drama']}),103:meta(103,{origin_countries:['US']}),104:meta(104,{availability:{US:{stream:['Netflix'],link:'https://themoviedb.org/tv/104'}}}),105:meta(105,{poster_url:'https://wrong.example/test.jpg'}),106:meta(106)};
 const h=harness(rows,details),r=await h.api.resolve('Recommend a Brazilian documentary series streaming in Brazil',{lang:'en',country:'BR'});
 assert.equal(r._live,false);assert.equal(r._docVerified,true);assert.deepEqual(Array.from(r.results,x=>x.title),['Real Documentary 101','Real Documentary 106']);
 assert.ok(r.results.every(x=>x.type==='series'&&x._verifiedDocRegion==='BR'&&x._catalogMedia.genres.includes('Documentary')&&x.watchUrl.startsWith('https://')));
 assert.equal(h.stats().invoked,1);
});
test('source failure never produces prose-only fictional results or verified provider links',async()=>{
 const h=harness([{title:'Fake drama',kind:'movie',tmdbId:77,genreIds:[99]}],{77:meta(77)});
 const r=await h.api.resolve('Recomende séries documentais brasileiras',{lang:'pt-BR',country:'BR'});
 assert.equal(r._live,false);assert.equal(r.results.length,0);assert.match(r.answer,/Não consegui confirmar/);
});
test('strict source path executes before paid provider and cannot be changed by generic fallback',()=>{
 assert.ok(html.includes('/jonas/verified-documentary-series-20261011.js?v=20261011-doc1'));
 assert.ok(html.indexOf('verified-documentary-series-20261011.js')<html.indexOf('/discover.js?v='));
 assert.ok(flow.includes('window.MatchAppVerifiedDocumentaries.resolve(question'));
 assert.ok(flow.includes('!payload?._docVerified'));
 assert.ok(flow.includes('payload?._live === true'));
 assert.ok(flow.includes('viewingTarget?.(pinnedDoc, item.title, docRegion)'));
 assert.ok(flow.includes('region: item._verifiedDocRegion ||'));
 const media=fs.readFileSync(path.join(root,'catalog-media.js'),'utf8');
 assert.ok(media.includes('availability(meta,region),links=providerLinks'));
});