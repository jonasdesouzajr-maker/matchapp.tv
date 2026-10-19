'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
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
 part('mediaIntentQuestion'),part('detectBookIntent'),part('detectAudioIntent'),part('discoverRecommendationRequest'),
 part('discoverRecoveryText'),part('isFactualMediaQuestion'),part('requestedMovieTitle'),
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
 assert.equal(h.ctx.discoverRecommendationRequest(q),false,'an explicit request to avoid recommendations is still factual source lookup');
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
 assert.equal(h.ctx.discoverRecommendationRequest(q),false,'negative media exclusions cannot turn a named edition lookup into recommendations');
 const got=await h.ctx.fallbackSearch(q,true);
 assert.match(got.answer,/Pride and Prejudice by Jane Austen/);
 assert.match(got.answer,/Apple Books and Audible/);
 assert.match(got.answer,/do not by themselves verify an edition/i);
 assert.equal(got.results.length,0);
 assert.equal(got._live,false);
 const dom=new JSDOM('<main id="sources"></main>',{url:'https://matchapp.tv/discover.html',runScripts:'outside-only'});
 try{
  const w=dom.window;w.MATCH_LANG='en';
  w.localStorage.setItem('match_user_country','United States');
  w.MATCHAPP_EBOOK_CATALOG=[{id:'pride-prejudice',title:'Pride and Prejudice',author:'Jane Austen',access:['paid','free'],genres:['romance']}];
  for(const file of ['viewer-country.js','ebooks/audiobooks.js','ebooks/reading-ai.js'])w.eval(read(file));
  const host=w.document.querySelector('#sources');
  assert.equal(w.MatchAppReadingAI.render(q,host),1);
  const apple=host.querySelector('a[href^="https://books.apple.com/us/"]');
  const audible=host.querySelector('a[href^="https://www.audible.com/"]');
  assert.match(apple?.textContent||'',/Apple Books audio search \(unverified\)/);
  assert.match(audible?.textContent||'',/Audible.*\(unverified\)/);
 }finally{dom.window.close();}
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

const recoveryLanguages={
 en:'Conversational AI is temporarily unavailable.',
 'pt-BR':'O chat de IA está temporariamente indisponível.',
 es:'El chat de IA está temporalmente no disponible.',
 fr:'Le chat IA est temporairement indisponible.',
 de:'Der KI-Chat ist vorübergehend nicht verfügbar.',
 it:'La chat IA è temporaneamente indisponibile.',
 tr:'Yapay zekâ sohbeti geçici olarak kullanılamıyor.',
 ru:'Чат с ИИ временно недоступен.',
 ar:'دردشة الذكاء الاصطناعي غير متاحة مؤقتًا.',
 hi:'एआई चैट अभी अस्थायी रूप से उपलब्ध नहीं है।',
 id:'Obrolan AI sementara tidak tersedia.',
 ja:'AIチャットは一時的に利用できません。',
 ko:'AI 채팅을 일시적으로 사용할 수 없습니다.',
 zh:'AI聊天暂时不可用。'
};
for(const [lang,unavailable] of Object.entries(recoveryLanguages))test(`selected ${lang} survives factual and reading provider outages with exact source identities`,async()=>{
 const h=setup({MATCH_LANG:lang,tmdbLookup:async()=>null});
 // An English question never overrides the visitor's selected UI language.
 const film=await h.ctx.fallbackSearch('Who directed the 2001 film Spirited Away?',true);
 assert(film.answer.includes(unavailable));
 for(const identity of ['Spirited Away','2001','Hayao Miyazaki','Studio Ghibli'])assert(film.answer.includes(identity));
 assert.equal(film.verifiedSource,'https://www.ghibli.jp/works/chihiro/');
 assert.equal(film.results.length,0);assert.equal(film._live,false);
 const unknown=await h.ctx.fallbackSearch('Who directed the 2024 film Imaginary Feature?',true);
 assert.equal(unknown.answer,h.ctx.discoverRecoveryText('factsUnavailable'));
 assert(!unknown.verifiedSource);assert.equal(unknown.results.length,0);
 const audio=await h.ctx.fallbackSearch('Find an audiobook edition of Pride and Prejudice by Jane Austen, do not recommend movies.',true);
 assert(audio.answer.includes(unavailable));
 for(const identity of ['Pride and Prejudice','Jane Austen','Apple Books','Audible','Match E-books Ai'])assert(audio.answer.includes(identity));
 assert.equal(audio.results.length,0);assert.equal(audio._live,false);
 assert(audio.answer.endsWith(h.ctx.discoverRecoveryText('audio')),'unverified searches retain the authored edition/listening-rights limitation');
 const book=await h.ctx.fallbackSearch('Find an ebook edition of Pride and Prejudice by Jane Austen.',true);
 assert(book.answer.endsWith(h.ctx.discoverRecoveryText('books')));
 if(lang!=='en')for(const result of [film,unknown,audio,book])assert.doesNotMatch(result.answer,/Conversational AI is temporarily unavailable|was directed by| by Jane Austen/);
});
test('empty Send uses the selected language on every supported locale without contacting or charging a provider',()=>{
 const start=discover.indexOf('window.newDiscoverSearch = function () {');
 const handler=discover.slice(start,discover.indexOf('\n};',start)+3);
 for(const lang of Object.keys(recoveryLanguages)){
  const h=setup({MATCH_LANG:lang});
  const hint={dataset:{},textContent:'Initial hint'};
  let sent=0;
  h.ctx.document={getElementById:id=>id==='discover-new-input'?{value:'   '}:id==='discover-compose-help'?hint:null};
  h.ctx.askAndRender=()=>{sent++;};
  vm.runInContext(handler,h.ctx);
  assert.equal(h.ctx.window.newDiscoverSearch(),false);
  assert.equal(sent,0);assert.equal(hint.dataset.error,'1');
  assert(hint.textContent.includes('MatchApp Ai'));
  assert.equal(hint.textContent,h.ctx.discoverRecoveryText('emptyHint'));
  if(lang!=='en')assert.doesNotMatch(hint.textContent,/Type a question/);
 }
});
test('all authored source, recovery, reading and composer copy is complete and follows language switches',()=>{
 const h=setup();
 const keys=['directed','source','unavailable','factsUnavailable','books','audio','author','sourceLink','readingLink','emptyHint'];
 for(const lang of Object.keys(recoveryLanguages)){
  h.ctx.window.MATCH_LANG=lang;
  for(const key of keys){
   const text=h.ctx.discoverRecoveryText(key,{title:'Exact Title',year:'2001',director:'Exact Director',source:'Exact Source',author:'Exact Author'});
   assert(text.trim(),`${lang} ${key}`);assert.doesNotMatch(text,/\{\w+\}/);
  }
 }
 h.ctx.window.MATCH_LANG='fr-CA';assert.equal(h.ctx.discoverRecoveryText('unavailable'),recoveryLanguages.fr);
 h.ctx.window.MATCH_LANG='pt-BR';assert.equal(h.ctx.discoverRecoveryText('unavailable'),recoveryLanguages['pt-BR']);
 h.ctx.window.MATCH_LANG='ja';assert.equal(h.ctx.discoverRecoveryText('unavailable'),recoveryLanguages.ja);
 assert.match(discover,/sourceLink\.textContent=discoverRecoveryText\('sourceLink'\)/);
 assert.match(discover,/route\.textContent = discoverRecoveryText\('readingLink'\)/);
});
