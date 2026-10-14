'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(root,'jonas','verified-documentary-series-20261011.js'),'utf8');
const flow=fs.readFileSync(path.join(root,'discover.js'),'utf8'),html=fs.readFileSync(path.join(root,'discover.html'),'utf8');
function harness(rows,details,extra={}) {
 let invoked=0,lookups=0,discovery;
 const window={supabaseClient:{functions:{invoke:async(name,args)=>{assert.equal(name,'tmdb-proxy');assert.deepEqual(Array.from(args.body.discover.genre_ids),[99]);assert.equal(args.body.discover.kind,'tv');invoked++;return {data:{results:rows}};}}},
   MatchAppCatalogMedia:{lookupLive:async(title,{kind,tmdbId})=>{assert.equal(kind,'tv');lookups++;return details[tmdbId]||null;}},...extra};
 const invoke=window.supabaseClient.functions.invoke;
 window.supabaseClient.functions.invoke=async(name,args)=>{discovery=args.body.discover;return invoke(name,args);};
 vm.runInNewContext(code,{window,console,Promise});
 return {api:window.MatchAppVerifiedDocumentaries,stats:()=>({invoked,lookups,discovery})};
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
for(const [question,regionCode,provider] of [
 ['one documentary series streaming on Netflix in Brazil','BR','Netflix'],
 ['documentary series in Brazil on Netflix, please','BR','Netflix'],
 ['uma série documental na Netflix no Brasil','BR','Netflix'],
 ['una serie documental en Netflix en México','MX','Netflix'],
 ['documentary series on Netflix in the United Kingdom tonight','GB','Netflix'],
 ['documentary series on Netflix in South Africa','ZA','Netflix'],
 ['documentary series on Disney+ in Canada','CA','Disney+'],
 ['documentary series on Prime Video in Japan','JP','Prime Video'],
 ['Brazilian documentary series on Netflix in the United States','US','Netflix']
])test('exact viewing country and provider: '+question,async()=>{
 const row=id=>({tmdbId:id,kind:'tv',genreIds:[99],adult:false,title:'Real Documentary '+id});
 const availability=stream=>({[regionCode]:{stream,link:'https://www.themoviedb.org/tv/101/watch?locale='+regionCode}});
 const h=harness([row(101),row(102)],{101:meta(101,{availability:availability(['Other service',provider])}),
  102:meta(102,{availability:availability(['Other service'])})},{localStorage:{getItem:()=> 'DE'}});
 const r=await h.api.resolve(question,{lang:'en',country:'FR'});
 assert.equal(r.results.length,1);
 assert.equal(r.results[0]._verifiedDocRegion,regionCode);
 assert.equal(r.results[0].platform,provider);
 assert.deepEqual(Array.from(r.results[0]._catalogMedia.availability[regionCode].stream),[provider]);
 assert.equal(h.stats().discovery.region,regionCode);
 assert.equal(h.stats().discovery.provider,provider);
});

test('one requested series is one result; Netflix ad tier is eligible but channels and rentals are not',async()=>{
 const rows=[101,102,103].map(id=>({tmdbId:id,kind:'tv',genreIds:[99],adult:false,title:'Real Documentary '+id}));
 const h=harness(rows,{101:meta(101,{availability:{BR:{stream:['Netflix Amazon Channel'],link:'https://www.themoviedb.org/tv/101'}}}),
  102:meta(102,{availability:{BR:{stream:['Netflix Standard with Ads'],rent:['Prime Video'],link:'https://www.themoviedb.org/tv/102'}}}),103:meta(103)});
 const r=await h.api.resolve('one documentary series streaming on Netflix in Brazil');
 assert.equal(r.results.length,1);assert.equal(r.results[0].title,'Real Documentary 102');
 assert.equal(r.results[0]._catalogMedia.availability.BR.rent.length,0);
});

test('blocked browser storage falls back to supplied region and never throws',async()=>{
 const h=harness([{tmdbId:101,kind:'tv',genreIds:[99],title:'Real Documentary 101'}],{101:meta(101)},
  {localStorage:{getItem(){throw Error('blocked');}}});
 const r=await h.api.resolve('documentary series on Netflix',{country:'BR'});
 assert.equal(r.results[0]._verifiedDocRegion,'BR');
});

test('strict source path executes before paid provider and cannot be changed by generic fallback',()=>{
 assert.ok(html.includes('/jonas/verified-documentary-series-20261011.js?v=20261013-doc2'));
 assert.ok(html.indexOf('verified-documentary-series-20261011.js')<html.indexOf('/discover.js?v='));
 assert.ok(flow.includes('window.MatchAppVerifiedDocumentaries.resolve(question'));
 assert.ok(flow.includes('!payload?._docVerified'));
 assert.ok(flow.includes('payload?._live === true'));
 assert.ok(flow.includes('viewingTarget?.(pinnedDoc, item.title, docRegion)'));
 assert.ok(flow.includes('region: item._verifiedDocRegion ||'));
 const media=fs.readFileSync(path.join(root,'catalog-media.js'),'utf8');
 assert.ok(media.includes('availability(meta,region),links=providerLinks'));
});
