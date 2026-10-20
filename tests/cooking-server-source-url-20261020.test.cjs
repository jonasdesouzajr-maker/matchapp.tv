'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module'),{JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(file,'utf8'),edge=read('supabase/functions/gemini-proxy/index.ts');
function extract(name){const start=edge.indexOf('function '+name+'('),end=edge.indexOf('\n}',start);assert(start>=0&&end>start,name);return edge.slice(start,end+2);}
const languageNames=edge.match(/const LANG_NAMES: Record<string, string> = \{[\s\S]*?\n\};/)?.[0];assert(languageNames,'actual server language names');
const helpers=['mediaIntentQuestion','detectBookIntent','detectAudioIntent'].map(extract).join('\n');
const current=extract('buildDiscoverPrompt');
const newLine=current.split('\n').find(line=>line.includes('const watchText ='));
const oldLine='  const watchText = intentQuestion.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();';
assert(newLine.includes('kidsMode ? intentQuestion : intentQuestion.replace'), 'adult-only URL stripping is the sole changed classifier input');
function promptFunction(source){const context=vm.createContext({DISCOVER_MAX:12});vm.runInContext(stripTypeScriptTypes(languageNames+'\n'+helpers+'\n'+source)+'\nthis.prompt=buildDiscoverPrompt;',context);return context.prompt;}
const prompt=promptFunction(current),baseline=promptFunction(current.replace(newLine,oldLine));
const cookingBranch='This is a COOKING request.',visualBranch='This question asks for something to watch.';

test('all126 real Recipe and channel Ask AI URLs select cooking while preserving the original question and source',t=>{
 const dom=new JSDOM(read('cooking/index.html'),{url:'https://matchapp.tv/cooking/',runScripts:'outside-only'});t.after(()=>dom.window.close());const w=dom.window;
 for(const file of ['cooking/catalog.js','cooking/i18n.js','cooking/cooking.js'])w.eval(read(file));
 const langs=[...w.MatchCookingI18n.languages],ids=new Set();let checked=0,youtubeWatch=0;
 assert.equal(langs.length,14);
 for(const lang of langs){
  w.localStorage.setItem('match_lang',lang);w.MATCH_LANG='en';w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang}}));
  assert.equal(w.MatchCookingI18n.language(),lang);
  for(const kind of ['recipes','channels']){
   w.document.getElementById('cooking-query').value='';w.document.getElementById('cooking-kind').value=kind;
   w.document.getElementById('cooking-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
   const articles=[...w.document.querySelectorAll('#cooking-results article')];assert.equal(articles.length,kind==='recipes'?5:4);
   for(const article of articles){
    const source=article.querySelector('.cooking-actions a').href,link=article.querySelector('.cooking-actions a[href^="/discover.html?q="]');assert(link,'actual generated Ask AI link');
    const question=new URL(link.href).searchParams.get('q'),result=prompt(question,lang,'BR','',[],false);
    assert(question.includes(source),lang+'/'+kind+' question preserves exact source URL');
    assert(result.includes('A user just asked you: "'+question+'"'),lang+'/'+kind+' prompt retains the full source-bearing question');
    assert(result.includes(cookingBranch),lang+'/'+article.querySelector('h3').textContent+' remains cooking');assert(!result.includes(visualBranch));
    assert.match(result,/Return an empty results array: the client renders independently reviewed cooking source links/);
    ids.add(kind+':'+source);if(source.includes('youtube.com/watch'))youtubeWatch++;checked++;
   }
  }
 }
 assert.equal(ids.size,9);assert.equal(checked,126);assert.equal(youtubeWatch,28,'both reviewed YouTube /watch recipes exercised in every language');
});

test('actual movie, series, documentary and cooking-show wording retains the visual branch with source URLs',()=>{
 for(const question of [
  'Recommend a movie about cooking. Source: https://www.youtube.com/watch?v=ATN7ZGO-PPU',
  'Find a cooking series to watch. Source: https://www.maangchi.com/recipe/bibimbap',
  'Find a documentary about cooking. Source: https://foodwishes.blogspot.com/',
  'Recommend cooking TV shows. Source: https://www.youtube.com/watch?v=4fPYsw8XVm8',
  'Quero assistir um filme de culinária. Fonte: https://www.youtube.com/watch?v=ATN7ZGO-PPU'
 ]){const result=prompt(question,'en','US','',[],false);assert(result.includes(visualBranch),question);assert(!result.includes(cookingBranch),question);assert(result.includes(question));}
});

test('Kids prompt output is byte-identical to its previous classifier for URL-bearing questions',()=>{
 const questions=[
  'Help me cook rice. https://www.youtube.com/watch?v=ATN7ZGO-PPU',
  'Tell me about nature. https://example.test/movie/series/watch',
  'Recommend a gentle family film. https://example.test/recipe',
  'Maangchi recipes https://www.youtube.com/watch?v=4fPYsw8XVm8',
  'What is this? HTTP://EXAMPLE.TEST/WATCH?q=series',
  'Explain this https://example.test/stream. Do not recommend books or music.'
 ];
 for(const lang of ['en','pt-BR','ar','ja'])for(const question of questions){
  const args=[question,lang,'BR','8',[{role:'user',text:'A gentle nature question'}],true,'6–8','A name'];
  assert.equal(prompt(...args),baseline(...args),lang+'/'+question);assert(!prompt(...args).includes(cookingBranch));
 }
});
