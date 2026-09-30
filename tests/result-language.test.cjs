const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=f=>fs.readFileSync(f,'utf8');
function setup(html='<body></body>'){const d=new JSDOM(html,{url:'https://matchapp.tv',runScripts:'outside-only'});d.window.MATCH_LANG='pt-BR';return d;}
const tick=()=>new Promise(r=>setTimeout(r,15));
test('structured proxy synopsis is translated, long descriptions are retained and failures are not cached',async()=>{
 const d=setup(),w=d.window;let calls=0;const translated='Pedro Infante recebe uma segunda chance. '.repeat(20);
 w.supabaseClient={functions:{invoke:async(name,{body})=>{calls++;assert.equal(body.lang,'pt-BR');return calls===1?{error:{message:'temporary'}}:{data:{candidates:[{content:{parts:[{text:JSON.stringify({title:'',synopsis:translated,platform:''})}]}}]}};}}};
 w.eval(source('match-localization.js'));assert.equal(await w.localizeMatchSynopsis('English source'),'English source');assert.equal(await w.localizeMatchSynopsis('English source'),translated.trim());assert.equal(calls,2);w.close();
});
test('new English catalog descriptions are translated even when the card was marked as Portuguese; later cards and language switches work',async()=>{
 const d=setup('<body><article class="discover-card"><p class="discover-synopsis" data-locale-painted="pt-BR" data-source-lang="en">Pedro Infante gets another chance.</p></article><p class="ebook-summary">An English book description.</p></body>'),w=d.window;
 w.t=()=> 'Carregando…';w.supabaseClient={functions:{invoke:async(name,{body})=>({data:{candidates:[{content:{parts:[{text:JSON.stringify({synopsis:body.lang==='es'?'Una descripción en español.':'Uma descrição em português.'})}]}}]}})}};
 w.eval(source('match-localization.js'));w.eval(source('locale-results.js'));await tick();await tick();
 assert.equal(w.document.querySelector('.discover-synopsis').textContent,'Uma descrição em português.');assert.equal(w.document.querySelector('.ebook-summary').textContent,'Uma descrição em português.');
 const n=w.document.createElement('p');n.className='reading-ai-description';n.textContent='An audiobook description.';w.document.body.append(n);await tick();assert.equal(n.textContent,'Uma descrição em português.');
 w.MATCH_LANG='es';w.document.dispatchEvent(new w.Event('matchapp:langchange'));await tick();assert.equal(n.textContent,'Una descripción en español.');
 w.MATCH_LANG='en';w.document.dispatchEvent(new w.Event('matchapp:langchange'));await tick();assert.equal(n.textContent,'An audiobook description.');w.close();
});
test('late translations cannot overwrite reused result nodes or a newer language',async()=>{
 const d=setup('<body><p class="ebook-summary">Old source</p></body>'),w=d.window;let resolve;w.t=()=> 'Carregando';w.localizeMatchSynopsis=()=>new Promise(r=>resolve=r);w.eval(source('locale-results.js'));await tick();w.document.querySelector('p').textContent='New source';resolve('Tradução antiga');await tick();assert.notEqual(w.document.querySelector('p').textContent,'Tradução antiga');w.close();
});
test('translation failures display chosen-language recovery text without permanently caching English',async()=>{
 const d=setup('<body><p class="ebook-summary">An English source.</p></body>'),w=d.window;w.supabaseClient={functions:{invoke:async()=>({error:{message:'offline'}})}};w.eval(source('match-localization.js'));w.eval(source('locale-results.js'));await tick();assert.match(w.document.querySelector('p').textContent,/tradução.*temporariamente/);w.close();
});
test('Home has exactly one clickable AI example and no horizontal example scrolling',()=>{const d=new JSDOM(source('index.html'));const row=d.window.document.querySelector('.search-examples');assert.equal(row.querySelectorAll('button').length,1);assert.equal(row.querySelectorAll('span').length,0);assert.match(row.querySelector('button').getAttribute('onclick'),/dataset.question/);assert.match(source('home-fold-grid.css'),/\.search-examples\{\s*display:block!important;overflow:visible/);d.window.close();});
test('painting the single localized example settles instead of starting an animation-frame loop',async()=>{const d=setup('<body><div class="search-examples"><button data-ai-example>Try</button></div></body>'),w=d.window;let frames=0;w.requestAnimationFrame=fn=>{frames++;return setTimeout(fn,0)};w.t=k=>k==='search.trythese'?'Experimente:':k;w.eval(source('ai-composer.js'));await tick();await tick();const b=w.document.querySelector('button');assert.match(b.textContent,/Experimente: Um filme leve na Netflix/);assert.equal(b.dataset.question,'Um filme leve na Netflix');const settled=frames;await tick();assert.equal(frames,settled);w.close();});
