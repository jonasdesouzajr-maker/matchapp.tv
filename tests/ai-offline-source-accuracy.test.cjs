'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const discover=read('discover.js'),proxy=read('supabase/functions/gemini-proxy/index.ts');
function part(name){
 const start=discover.indexOf('function '+name+'(');
 const end=discover.indexOf('\n}',start);
 assert(start>=0&&end>start,'missing '+name);
 return discover.slice(start,end+2);
}
const block=[
 'const DISCOVER_MAX=12;',
 part('mediaIntentQuestion'),part('detectBookIntent'),part('detectAudioIntent'),
 part('isFactualMediaQuestion'),part('requestedMovieTitle'),
 discover.slice(discover.indexOf('const EDITORIAL_FILM_CREDITS='),
  discover.indexOf('\n]);',discover.indexOf('const EDITORIAL_FILM_CREDITS='))+4),
 discover.slice(discover.indexOf('async function sourceVerifiedFilmFacts('),
  discover.indexOf('\n}',discover.indexOf('async function sourceVerifiedFilmFacts('))+2),
 part('stripQuestionWords'),
 discover.slice(discover.indexOf('async function fallbackSearch('),
  discover.indexOf('\n}',discover.indexOf('async function fallbackSearch('))+2)
].join('\n');
function setup(overrides={}){
 const calls={lookup:[],related:[]};
 const window={
  MATCH_LANG:'en',
  tmdbLookup:async(title,hints)=>{
   calls.lookup.push({title,hints});
   return {tmdbId:129,kind:'movie',adult:false,title:'Spirited Away',originalTitle:'千と千尋の神隠し',year:'2001'};
  },
  tmdbRelated:async(id,kind)=>{
   calls.related.push({id,kind});
   return {director:{id:608,name:'Hayao Miyazaki'},related:[]};
  },
  MatchAppReadingAI:{
   intent:q=>/audiobook/i.test(q)?'audiobook':'ebook',
   selectBooks:q=>[{title:'Pride and Prejudice',author:'Jane Austen',access:['paid','free']}]
  },
  ...overrides
 };
 const ctx=vm.createContext({window,CONTENT_CATALOG:[{title:'Spirited Away',cats:['movie']}],
  fetch:async()=>{throw Error('unrelated fallback must not query iTunes')},console, DISCOVER_MAX:12});
 vm.runInContext(block.replace(/^const DISCOVER_MAX=12;\n/,''),ctx);
 return {ctx,calls};
}
test('Google quota offline: exact original Studio Ghibli credits survive unrelated movie rate limits',async()=>{
 const h=setup({tmdbLookup:async()=>{throw Error('TMDB offline');},tmdbRelated:async()=>{throw Error('TMDB offline');}});
 const q='Name the director and release year of the 2001 animated film Spirited Away. Do not recommend books or music.';
 assert.equal(h.ctx.detectBookIntent(q),false);
 assert.equal(h.ctx.isFactualMediaQuestion(q),true);
 const got=await h.ctx.fallbackSearch(q,true);
 assert.match(got.answer,/Spirited Away.*2001.*Hayao Miyazaki/);
 assert.match(got.answer,/Studio Ghibli/);
 assert.equal(got.verifiedSource,'https://www.ghibli.jp/works/chihiro/');
 assert.equal(got._live,false);
 assert.equal(got.results.length,0);
 assert.match(discover,/!isFactualMediaQuestion\(question\)/);
 assert.match(discover,/discover-verified-source/);
});
test('unavailable live model: audiobook request identifies actual author and directs to official searches, without claiming a verified edition',async()=>{
 const h=setup(),q='How can I find a legitimate audiobook edition of Pride and Prejudice by Jane Austen? Please do not recommend any films or TV shows.';
 assert.equal(h.ctx.detectBookIntent(q),true);
 const got=await h.ctx.fallbackSearch(q,true);
 assert.match(got.answer,/Pride and Prejudice by Jane Austen/);
 assert.match(got.answer,/Apple Books and Audible/);
 assert.match(got.answer,/do not by themselves verify an edition/i);
 assert.equal(got.results.length,0);
 assert.equal(got._live,false);
 assert.match(read('ebooks/reading-ai.js'),/Apple Books audio search \(unverified\)/);
 assert.match(read('ebooks/reading-ai.js'),/Audible audio search \(unverified\)/);
});
test('ordinary films continue to use exact TMDB identity and verified crew',async()=>{
 const h=setup({
  tmdbLookup:async(title,hints)=>{h.calls?.lookup?.push?.({title,hints});return {tmdbId:901,kind:'movie',adult:false,title:'Example Feature',originalTitle:'Example Feature',year:'2024'};},
  tmdbRelated:async(id,kind)=>({director:{id:902,name:'Example Director'},related:[]})
 });
 const got=await h.ctx.fallbackSearch('Who directed the 2024 film Example Feature?',true);
 assert.match(got.answer,/Example Feature.*2024.*Example Director/);
 assert.equal(got.verifiedSource,'https://www.themoviedb.org/movie/901');
});
test('unknown films, mismatched titles and incorrect years fail closed without fabricated facts',async()=>{
 for(const question of [
  'Name the director and release year of the 1999 film Spirited Away.',
  'Name the director and release year of the film Imaginary Feature.'
 ]) {
  const h=setup({tmdbLookup:async()=>null}),got=await h.ctx.fallbackSearch(question,true);
  assert.doesNotMatch(got.answer,/The Bear|Hayao Miyazaki|Example Director/);
  assert.match(got.answer,/could not independently verify/i);
  assert.equal(got.results.length,0);
 }
});
test('Gemini invalid argument gets a portable JSON retry; budget caps never trigger recursive retries',()=>{
 assert.match(proxy,/if \(geminiRes.status === 400\) \{/);
 assert.match(proxy,/retrying minimal JSON generation/);
 assert.match(proxy,/if \(geminiRes.status === 404 \|\| geminiRes.status === 400\)/);
 assert.match(proxy,/status: geminiRes.status === 429 \? 429 : 502/);
 assert.doesNotMatch(proxy,/geminiRes.status === 429\)\s*\{\s*continue;/);
});
