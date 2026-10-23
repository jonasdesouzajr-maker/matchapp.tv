'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const original=fs.readFileSync(path.join(__dirname,'../supabase/functions/tmdb-proxy/index.ts'),'utf8');
// Load the complete handler through Node 24's native TypeScript support while
// replacing only its external SDK import and the three runtime dependencies.
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-tmdb-test-'));
const entry=path.join(directory,'tmdb-proxy.cts');
let install;
try{
 fs.writeFileSync(entry,'module.exports = function install(createClient, Deno, fetch) {\n'+
  original.replace(/^import\s+\{ createClient \}[^\n]+\n/m,'')+'\n};\n');
 install=require(entry);
}finally{fs.rmSync(directory,{recursive:true,force:true});}

function fixture(kind='movie'){
 return {id:42,title:'Verified title',name:'Verified series',original_title:'Original title',
  original_name:'Original series',release_date:'2024-03-01',first_air_date:'2024-03-01',
  adult:false,poster_path:'/verified.jpg',genre_ids:[35],genres:[{id:35,name:'Comedy'}],
  overview:'Verified source metadata.',runtime:100};
}
function server(record,{allowed=true}={}){
 let handler;const requests=[];
 install(()=>({rpc:async()=>({data:{allowed},error:null})}),
  {env:{get:name=>name==='TMDB_API_KEY'?'test-source-token':''},serve:fn=>{handler=fn;}},
  async url=>{const u=new URL(url);requests.push(u);return Response.json(
   u.pathname.includes('/search/')?{results:[record]}:record);});
 return {requests,async call(body,origin='https://matchapp.tv'){
  const response=await handler(new Request('https://example.test/tmdb-proxy',{
   method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));
  return {status:response.status,data:await response.json()};
 }};
}

test('movie details preserve the source IMDb identity without another provider request',async()=>{
 const s=server({...fixture(),imdb_id:'tt1234567'});
 const answer=await s.call({tmdb_id:42,kind:'movie',details:true});
 assert.equal(answer.status,200);
 assert.equal(answer.data.results[0].imdbId,'tt1234567');
 assert.equal(answer.data.results[0].tmdbId,42);
 assert.equal(answer.data.results[0].title,'Verified title');
 assert.equal(answer.data.results[0].year,'2024');
 assert.equal(answer.data.results[0].poster,'https://image.tmdb.org/t/p/w500/verified.jpg');
 assert.equal(s.requests.length,1);
 assert.equal(s.requests[0].pathname,'/3/movie/42');
 assert(!s.requests[0].searchParams.get('append_to_response').split(',').includes('external_ids'),
  'movie details already carry their IMDb ID');
});

test('TV details include exact external IDs in the existing source request',async()=>{
 const s=server({...fixture('tv'),external_ids:{imdb_id:'tt12345678'}});
 const answer=await s.call({tmdb_id:42,kind:'tv',details:true});
 assert.equal(answer.status,200);
 assert.equal(answer.data.results[0].imdbId,'tt12345678');
 assert.equal(answer.data.results[0].kind,'tv');
 assert.equal(s.requests.length,1,'the same details request owns the external identity');
 assert.equal(s.requests[0].pathname,'/3/tv/42');
 const appended=s.requests[0].searchParams.get('append_to_response').split(',');
 for(const name of ['external_ids','videos','watch/providers','credits','content_ratings'])
  assert(appended.includes(name),name+' must remain in verified details');
});

test('missing or malformed source IDs never become caller-supplied IMDb identities',async()=>{
 const invalid=[undefined,null,'','tt123','tt12345678901','nm1234567',1234567,
  'https://www.imdb.com/title/tt1234567/','tt1234567?other', ['tt1234567']];
 for(const kind of ['movie','tv'])for(const id of invalid){
  const record={...fixture(kind),...(kind==='movie'?{imdb_id:id}:{external_ids:{imdb_id:id}})};
  const s=server(record);
  const answer=await s.call({tmdb_id:42,kind,details:true,imdbId:'tt7654321'});
  assert.equal(answer.status,200);
  assert.equal(answer.data.results[0].imdbId,null);
 }
});

test('ordinary TV artwork requests do not acquire unnecessary external metadata',async()=>{
 const s=server(fixture('tv'));
 const exact=await s.call({tmdb_id:42,kind:'tv'});
 assert.equal(exact.data.results[0].imdbId,null);
 assert.equal(s.requests[0].searchParams.has('append_to_response'),false);
 const search=await s.call({query:'Verified series',kind:'tv'});
 assert.equal(search.data.results[0].imdbId,null);
 assert.equal(s.requests[1].pathname,'/3/search/tv');
 assert.equal(s.requests[1].searchParams.has('append_to_response'),false);
});

test('exact identity, adult filtering, origins and rate limiting still gate enrichment',async()=>{
 const badId=server(fixture());
 assert.equal((await badId.call({tmdb_id:'42',kind:'movie',details:true})).status,400);
 assert.equal(badId.requests.length,0);
 const adult=server({...fixture(),adult:true,imdb_id:'tt1234567'});
 assert.deepEqual((await adult.call({tmdb_id:42,kind:'movie',details:true})).data.results,[]);
 const untrusted=server(fixture());
 assert.equal((await untrusted.call({tmdb_id:42,kind:'movie',details:true},'https://other.example')).status,403);
 assert.equal(untrusted.requests.length,0);
 const limited=server(fixture(),{allowed:false});
 assert.equal((await limited.call({tmdb_id:42,kind:'movie',details:true})).status,429);
 assert.equal(limited.requests.length,0);
});
