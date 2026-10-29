'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const source=read('patches/reference-pills.js');
const pill='[data-ma-text-pill],[data-ma-control-pill]';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(markup='',route='/'){
 const dom=new JSDOM('<!doctype html><html class="ma-reference" lang="en"><body>'+markup+'</body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 Object.defineProperty(w.document,'readyState',{configurable:true,get:()=> 'complete'});
 const frames=[];let requested=0;
 w.requestAnimationFrame=callback=>{frames.push(callback);return++requested;};
 async function drain(){
  for(let turn=0;turn<8;turn++){
   await tick();if(!frames.length)return;
   const pending=frames.splice(0);for(const callback of pending)callback(turn);
  }
  throw Error('Pill observation did not become idle');
 }
 return{dom,w,d:w.document,start:()=>w.eval(source),drain,frames,requested:()=>requested,close:()=>w.close()};
}
test('existing text, controls, labels, listeners and first-child contracts retain their original nodes',()=>{
 const f=fixture('<main><h1 id="heading">Original <em>heading</em></h1><p id="copy">Source <a id="source" href="/privacy.html">reference</a> remains exact.</p><label id="label" for="field">Name</label><input id="field" value="Original name"><button id="action" type="button"><span id="icon" aria-hidden="true">★</span>Original action</button><a id="home" href="/">Home <svg><path d="M0 0"/></svg></a></main>');
 try{
  const controls=[...f.d.querySelectorAll('button,input,a,label')],text=f.d.body.textContent,heading=f.d.getElementById('heading'),first=heading.firstChild,home=f.d.getElementById('home'),homeText=home.firstChild;
  let direct=0,delegated=0;const button=f.d.getElementById('action');button.addEventListener('click',()=>direct++);f.d.body.addEventListener('click',event=>{if(event.target.matches('#action'))delegated++;});
  f.start();
  assert.equal(f.d.body.textContent,text);assert.equal(heading.firstChild,first);assert.equal(home.firstChild,homeText);
  assert.deepEqual([...f.d.querySelectorAll('button,input,a,label')],controls);assert.equal(f.d.getElementById('label').htmlFor,'field');
  assert.equal(f.d.getElementById('field').value,'Original name');assert.equal(f.d.getElementById('source').getAttribute('href'),'/privacy.html');
  button.click();assert.equal(direct,1);assert.equal(delegated,1);assert.equal(button.getAttribute('type'),'button');assert.equal(f.d.getElementById('icon').getAttribute('aria-hidden'),'true');
  assert.equal(heading.getAttribute('data-ma-text-pill'),'title');assert.ok(button.hasAttribute('data-ma-control-pill'));
 }finally{f.close();}
});
test('native fields, selected options, editable regions, SVG and executable/data content remain untouched',()=>{
 const f=fixture('<main><label for="native">Format</label><select id="native"><optgroup label="Original group"><option value="one">One</option><option value="two" selected>Two</option></optgroup></select><textarea id="typed">User text\nsecond line</textarea><input id="input" value="Untouched"><datalist id="choices"><option value="Alpha"></option></datalist><div id="editable" contenteditable="true"><p>Editable <b>original text</b></p><span contenteditable="false">Embedded immutable value</span></div><svg id="vector" viewBox="0 0 10 10"><title>Original graphic title</title><text x="1" y="2">SVG label</text></svg><math id="formula"><mi>x</mi></math><script id="data" type="application/ld+json">{"name":"Exact source identity"}</script><style id="style">.original{color:red}</style><template id="template"><p>Original inert template</p></template><div id="excluded" data-ma-pill-exclude><p>Excluded text <a href="/">original link</a></p></div></main>');
 try{
  const ids=['native','typed','input','choices','editable','vector','formula','data','style','template','excluded'],before=ids.map(id=>f.d.getElementById(id).outerHTML),nodes=ids.map(id=>f.d.getElementById(id));
  f.d.getElementById('input').value='Unsaved typed value';f.start();
  assert.deepEqual(ids.map(id=>f.d.getElementById(id).outerHTML),before);assert.deepEqual(ids.map(id=>f.d.getElementById(id)),nodes);
  assert.equal(f.d.getElementById('input').value,'Unsaved typed value');assert.equal(f.d.getElementById('native').value,'two');assert.equal(f.d.getElementById('native').selectedIndex,1);
  assert.equal(f.d.getElementById('native').children[0].tagName,'OPTGROUP');assert.equal(f.d.getElementById('native').options.length,2);assert.equal(f.d.getElementById('typed').value,'User text\nsecond line');
  for(const id of ids)assert.equal(f.d.getElementById(id).querySelector(pill),null,id+' must retain its native/excluded subtree');
 }finally{f.close();}
});
test('each reading or action surface owns its inline text without nested pill owners',()=>{
 const f=fixture('<main><h2>Heading <strong>emphasis</strong></h2><p id="sentence">Sentence <a href="/privacy.html"><b>source link</b></a> and <em>emphasis</em>.</p><button id="button"><p>Action <strong>label</strong></p></button><ul><li><p>Nested first paragraph</p>Trailing list copy</li></ul><div><span class="badge">Original badge</span></div></main>');
 try{
  const text=f.d.body.textContent;f.start();assert.equal(f.d.body.textContent,text);
  for(const node of f.d.querySelectorAll(pill)){
   const owner=node.parentElement.closest('[data-ma-text-pill],[data-ma-control-pill]:not([data-ma-control-pill="card"])');
   assert.equal(owner,null,'one text owner, rather than nested decorations: '+node.outerHTML);
  }
  assert.ok(f.d.getElementById('sentence').hasAttribute('data-ma-text-pill'));assert.equal(f.d.getElementById('sentence').querySelector(pill),null);
  assert.ok(f.d.getElementById('button').hasAttribute('data-ma-control-pill'));assert.equal(f.d.getElementById('button').querySelector(pill),null);
 }finally{f.close();}
});
test('art cards preserve distinct heading, subtitle and topic capsules inside their one existing action',()=>{
 const f=fixture('<main><a id="banner" class="ref-editorial-banner" href="/featured/this-week/"><span class="ref-editorial-copy"><h2 id="banner-title">Most Awaited</h2><span id="banner-subtitle" class="ref-editorial-sub">Premiere guide</span></span><svg><path d="M0 0"/></svg></a><a id="topic" class="ref-topic" href="/ebooks/" style="background-image:url(/assets/cinema/books.jpg)"><svg><path d="M0 0"/></svg><span id="topic-label" class="ref-topic-name">Books</span></a><a id="poster" class="marquee-item" href="/discover.html?q=Original%20title"><img src="/covers/original.jpg" alt="Original title"><span id="poster-title" class="marquee-title">Original title</span><small id="poster-year">2026</small></a></main>');
 try{
  const text=f.d.body.textContent,anchors=[...f.d.querySelectorAll('a')],children=anchors.map(node=>[...node.children]),labels=['banner-title','banner-subtitle','topic-label','poster-title','poster-year'].map(id=>f.d.getElementById(id));let calls=0;
  anchors.forEach(anchor=>anchor.addEventListener('click',event=>{event.preventDefault();calls++;}));f.start();
  assert.equal(f.d.body.textContent,text);assert.deepEqual([...f.d.querySelectorAll('a')],anchors);
  anchors.forEach((anchor,index)=>{assert.equal(anchor.getAttribute('data-ma-control-pill'),'card');assert.deepEqual([...anchor.children],children[index]);anchor.click();});assert.equal(calls,3);
  labels.forEach(node=>{assert.ok(node.hasAttribute('data-ma-text-pill'),'art-card label remains its own text surface: '+node.id);assert.equal(node.parentElement.closest('[data-ma-text-pill]'),null,'card labels cannot inherit a broad transparent group instead');});
  assert.equal(labels[0].getAttribute('data-ma-text-pill'),'title');assert.equal(f.d.querySelectorAll('a').length,3);assert.equal(anchors[0].getAttribute('href'),'/featured/this-week/');assert.equal(anchors[1].getAttribute('href'),'/ebooks/');assert.equal(anchors[2].getAttribute('href'),'/discover.html?q=Original%20title');
 }finally{f.close();}
});
test('the actual DIV carousel originals and aria-hidden loop copies keep their caption pills and rail actions',async()=>{
 const f=fixture('<section id="trending-rail"><div id="marquee-viewport"><div id="marquee-track"></div></div></section>');
 try{
  const titles=Array.from({length:6},(_,index)=>({title:'Exact original title '+index,poster:'/covers/original-'+index+'.jpg',kind:'movie'})),calls=[];
  f.w.fetch=async url=>({ok:true,json:async()=>String(url).includes('trending-week')?{titles}:[]});f.w.selectMarqueeItem=title=>calls.push(title);
  f.w.eval(read('trending-rail.js'));await f.drain();
  const track=f.d.getElementById('marquee-track'),viewport=track.parentElement,cards=[...track.children],images=cards.map(card=>card.firstElementChild),captions=cards.map(card=>card.querySelector('.marquee-title'));
  assert.equal(cards.length,12);assert.equal(track.dataset.loopCount,'6');assert.ok(cards.every(card=>card.tagName==='DIV'));
  assert.ok(cards.slice(0,6).every(card=>card.getAttribute('role')==='button'&&card.tabIndex===0));assert.ok(cards.slice(6).every(card=>card.getAttribute('aria-hidden')==='true'&&card.tabIndex===-1));
  f.start();await f.drain();
  assert.equal(track.parentElement,viewport);assert.deepEqual([...track.children],cards);assert.equal(track.firstElementChild,cards[0]);
  cards.forEach((card,index)=>{
   assert.equal(card.firstElementChild,images[index]);assert.equal(card.querySelector('.marquee-title'),captions[index]);assert.equal(card.querySelectorAll('.marquee-title').length,1);
   assert.equal(captions[index].textContent,titles[index%6].title);assert.equal(captions[index].getAttribute('data-ma-text-pill'),'caption','both originals and loop copies need a caption surface');
   if(index<6)assert.equal(card.getAttribute('data-ma-control-pill'),'card','the existing DIV role=button is an art card, rather than one broad text surface');
   else assert.equal(card.getAttribute('aria-hidden'),'true');
   card.click();
  });
  assert.deepEqual(calls,titles.map(item=>item.title),'only each original fires its existing title handler once; hidden loop copies never open a title');
  f.w.MatchAppTextPills.refresh();await f.drain();assert.deepEqual([...track.children],cards);assert.ok(captions.every(caption=>caption.getAttribute('data-ma-text-pill')==='caption'));
 }finally{f.close();}
});
test('dynamic copy, added controls and locale repaints are decorated once and observation becomes idle',async()=>{
 const f=fixture('<main><h1 id="title">Original heading</h1><p id="copy">Original copy</p><button id="action">Original action</button></main>');
 try{
  f.start();const api=f.w.MatchAppTextPills,observer=api.observer,button=f.d.getElementById('action');let clicks=0;button.addEventListener('click',()=>clicks++);
  f.d.getElementById('title').textContent='العنوان الأصلي';button.textContent='تأكيد الاختيار';f.d.documentElement.lang='ar';f.d.documentElement.dir='rtl';
  const paragraph=f.d.createElement('p');paragraph.innerHTML='New <a href="/terms.html">source link</a> with exact text.';f.d.querySelector('main').appendChild(paragraph);
  await f.drain();assert.equal(paragraph.getAttribute('data-ma-text-pill'),'copy');assert.equal(paragraph.textContent,'New source link with exact text.');
  assert.equal(f.d.getElementById('title').textContent,'العنوان الأصلي');assert.equal(button.textContent,'تأكيد الاختيار');assert.equal(f.d.documentElement.dir,'rtl');assert.equal(f.d.getElementById('action'),button);button.click();assert.equal(clicks,1);
  const html=f.d.body.innerHTML;api.scan(f.d.body);api.refresh();await f.drain();assert.equal(f.d.body.innerHTML,html,'repainting must be idempotent');
  const count=f.requested();button.setAttribute('data-unrelated-state','selected');await f.drain();assert.equal(f.requested(),count,'own or unrelated attribute writes cannot create a feedback loop');
  f.w.eval(source);assert.equal(f.w.MatchAppTextPills,api);assert.equal(api.observer,observer);assert.equal(f.frames.length,0);
 }finally{f.close();}
});
test('rare text directly under structural roots retains the exact Text node and adjacent element structure',async()=>{
 const f=fixture('Naked body text<main id="main">Naked main text<button id="action">Keep action</button><section id="section">Naked section text</section></main>');
 try{
  const bodyText=f.d.body.firstChild,main=f.d.getElementById('main'),mainText=main.firstChild,section=f.d.getElementById('section'),sectionText=section.firstChild,button=f.d.getElementById('action'),allText=f.d.body.textContent;
  f.start();
  for(const [node,owner]of[[bodyText,f.d.body],[mainText,main],[sectionText,section]]){
   assert.equal(node.parentElement.parentElement,owner);assert.equal(node.parentElement.tagName,'SPAN');assert.equal(node.parentElement.getAttribute('data-ma-pill-inline'),'true');assert.equal(node.parentElement.firstChild,node);
  }
  assert.equal(f.d.body.textContent,allText);assert.equal(main.children[1],button);assert.equal(button.firstChild.nodeType,f.w.Node.TEXT_NODE);
  const late=f.d.createTextNode('Late naked main text');main.appendChild(late);await f.drain();assert.equal(late.parentElement.parentElement,main);assert.equal(late.parentElement.firstChild,late);assert.equal(f.frames.length,0);
 }finally{f.close();}
});
test('ad units keep their source, geometry attributes and label Text nodes while no markup is inserted into inventory',()=>{
 const f=fixture('<main><div class="ad-banner-container" style="min-height:120px;max-width:970px"><span class="ma-ad-label">Sponsored</span><ins class="adsbygoogle" style="display:block;width:100%;min-height:120px" data-ad-client="ca-pub-9541435081010948" data-ad-slot="2595698117" data-ad-format="auto" data-full-width-responsive="true">Original protected inventory</ins></div><div data-ad-container id="protected"><p>Protected source label</p></div></main>');
 try{
  const unit=f.d.querySelector('ins'),label=f.d.querySelector('.ma-ad-label'),labelText=label.firstChild,unitHTML=unit.outerHTML,containerStyle=unit.parentElement.getAttribute('style'),protectedHTML=f.d.getElementById('protected').outerHTML;
  f.start();assert.equal(unit.outerHTML,unitHTML);assert.equal(unit.parentElement.getAttribute('style'),containerStyle);assert.equal(label.firstChild,labelText);assert.equal(label.childNodes.length,1);assert.equal(label.textContent,'Sponsored');assert.equal(f.d.getElementById('protected').outerHTML,protectedHTML);
  assert.equal(unit.querySelector(pill),null);assert.equal(unit.querySelector('span'),null);
 }finally{f.close();}
});
test('real cookie localization still updates its original first Text child after pill decoration',async()=>{
 const f=fixture('<div class="ma-cookie"><p>We use essential cookies to run MatchApp. Analytics and Google AdSense may use cookies to measure visits and fund the free service. <a href="/cookies.html">Details</a>.</p><button>Accept</button><button>Essential only</button></div><button id="match-cta">Find my match</button>');
 try{
  f.w.I18N={en:{'q.submit':'Find my match'},'pt-BR':{'q.submit':'Encontrar minha combinação'}};f.w.MATCH_LANG='en';f.w.t=key=>f.w.I18N[f.w.MATCH_LANG]?.[key]||key;
  f.w.eval(read('ai-composer.js'));const paragraph=f.d.querySelector('.ma-cookie p'),originalText=paragraph.firstChild,link=paragraph.querySelector('a');f.start();
  f.w.MATCH_LANG='pt-BR';f.w.document.dispatchEvent(new f.w.Event('matchapp:langchange'));await f.drain();
  assert.equal(paragraph.firstChild,originalText);assert.equal(originalText.nodeType,f.w.Node.TEXT_NODE);assert.match(originalText.nodeValue,/Usamos cookies essenciais/);assert.equal(paragraph.querySelector('a'),link);assert.equal(link.getAttribute('href'),'/cookies.html');assert.equal(f.d.querySelector('.ma-cookie button').textContent,'Aceitar');assert.ok(paragraph.hasAttribute('data-ma-text-pill'));
 }finally{f.close();}
});
test('rail geometry children and isolated non-adult surfaces are preserved',()=>{
 const f=fixture('<div id="track"><div id="card"><a id="poster" href="/discover.html"><img src="/covers/source.jpg" alt="Original title"><span>Original title</span></a></div></div>');
 try{
  const track=f.d.getElementById('track'),card=f.d.getElementById('card'),poster=f.d.getElementById('poster'),structure=[...track.querySelectorAll(':scope > * > *')];f.start();assert.equal(track.firstElementChild,card);assert.equal(card.firstElementChild,poster);assert.deepEqual([...track.querySelectorAll(':scope > * > *')],structure);
 }finally{f.close();}
 for(const route of ['/kids/','/private-voice/','/oauth/','/android-studio/']){
  const excluded=fixture('<p>Original isolated copy</p>',route);try{const html=excluded.d.body.innerHTML;excluded.start();assert.equal(excluded.w.MatchAppTextPills,undefined);assert.equal(excluded.d.body.innerHTML,html);}finally{excluded.close();}
 }
});
test('late native app-dialog text receives surfaces without changing cancellation, labels or focus',async()=>{
 const f=fixture('<button id="trigger">Existing action</button>');
 try{
  f.w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  f.w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new f.w.Event('close'));};
  const trigger=f.d.getElementById('trigger');trigger.focus();f.start();f.w.eval(read('patches/reference-dialogs.js'));
  const pending=f.w.MatchAppDialogs.confirm('Exact saved-account question',{trigger});await f.drain();
  const dialog=f.d.getElementById('ma-reference-dialog'),cancel=dialog.querySelector('[data-dialog-action="cancel"]'),confirm=dialog.querySelector('[data-dialog-action="confirm"]'),message=dialog.querySelector('p');
  assert.equal(f.d.activeElement,cancel);assert.equal(dialog.querySelector('h2').getAttribute('data-ma-text-pill'),'title');assert.equal(message.getAttribute('data-ma-text-pill'),'copy');assert.equal(message.textContent,'Exact saved-account question');
  assert.ok(cancel.hasAttribute('data-ma-control-pill'));assert.ok(confirm.hasAttribute('data-ma-control-pill'));assert.equal(dialog.getAttribute('aria-describedby'),message.id);
  f.w.localStorage.setItem('match_lang','ar');f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:langchange',{detail:{lang:'ar'}}));await f.drain();
  assert.equal(dialog.dir,'rtl');assert.equal(dialog.querySelector('[data-dialog-action="cancel"]'),cancel);assert.equal(message.textContent,'Exact saved-account question');assert.equal(f.d.activeElement,cancel);
  cancel.click();assert.equal(await pending,false);await f.drain();assert.equal(f.d.activeElement,trigger);assert.equal(dialog.open,false);
 }finally{f.close();}
});

test('composite field captions keep the original label, field, option, value and events without a nested frame',async()=>{
 const f=fixture('<main><label id="search-label"><span id="caption">Search recipes</span><input id="search" value="Original query"></label><label id="country-label"><span id="country-caption">Country</span><select id="country"><option value="br" selected>Brazil</option><option value="pt">Portugal</option></select></label><label id="toggle">Keep original <input type="checkbox" checked></label><label id="text-contract">Direct source text<input value="Saved"></label></main>');
 try{
  const label=f.d.getElementById('search-label'),caption=f.d.getElementById('caption'),input=f.d.getElementById('search'),select=f.d.getElementById('country'),option=select.firstElementChild,optionHTML=select.innerHTML,direct=f.d.getElementById('text-contract').firstChild;let events=0;input.addEventListener('input',()=>events++);f.start();
  assert.equal(f.d.getElementById('search-label'),label);assert.equal(f.d.getElementById('caption'),caption);assert.equal(f.d.getElementById('search'),input);assert.equal(input.value,'Original query');assert.ok(label.hasAttribute('data-ma-pill-field-group'));assert.equal(label.hasAttribute('data-ma-text-pill'),false);assert.equal(caption.getAttribute('data-ma-text-pill'),'label');assert.equal(input.hasAttribute('data-ma-text-pill'),false);
  assert.equal(select.firstElementChild,option);assert.equal(select.innerHTML,optionHTML);assert.equal(select.value,'br');assert.equal(f.d.getElementById('toggle').hasAttribute('data-ma-pill-field-group'),false);assert.equal(f.d.getElementById('text-contract').firstChild,direct);
  caption.textContent='Pesquisar receitas';input.value='Saved local query';input.dispatchEvent(new f.w.Event('input',{bubbles:true}));await f.drain();f.w.MatchAppTextPills.refresh();await f.drain();assert.equal(events,1);assert.equal(input.value,'Saved local query');assert.equal(label.firstElementChild,caption);assert.equal(label.querySelectorAll('[data-ma-text-pill]').length,1);
 }finally{f.close();}
});

test('plain reading lists receive a single gap owner while existing grids and ads retain theirs',async()=>{
 const f=fixture('<main><ul id="reading"><li>First original paragraph</li><li>Second original paragraph</li></ul><ul id="grid" style="display:grid;gap:8px"><li>Existing grid first</li><li>Existing grid second</li></ul><ins class="adsbygoogle" data-ad-slot="frozen"><ul id="ad-list"><li>Ad first</li><li>Ad second</li></ul></ins></main>');
 try{
  const list=f.d.getElementById('reading'),items=[...list.children],ad=f.d.getElementById('ad-list'),adHTML=ad.outerHTML;f.start();assert.ok(list.hasAttribute('data-ma-pill-reading-list'));assert.deepEqual([...list.children],items);assert.equal(f.d.getElementById('grid').hasAttribute('data-ma-pill-reading-list'),false);assert.equal(ad.outerHTML,adHTML);
  const late=f.d.createElement('ul');late.innerHTML='<li>Late first</li><li>Late second</li>';f.d.querySelector('main').appendChild(late);await f.drain();assert.ok(late.hasAttribute('data-ma-pill-reading-list'));const html=list.outerHTML;f.w.MatchAppTextPills.refresh();await f.drain();assert.equal(list.outerHTML,html);
 }finally{f.close();}
});

test('related source poster metadata and trust icon labels each remain one semantic capsule',()=>{
 const f=fixture('<main><div class="marquee-item" role="button" id="poster"><img src="/original.jpg"><div class="music-cover-header"><span>YouTube</span><span>Original artist</span></div><div class="music-video-caption"><span>Original title</span><div class="music-cover-meta"><span>2026-10-01</span><span>12M views</span></div><span>youtu.be/original</span></div></div><span class="ma-result-trust__label"><span aria-hidden="true">✓</span><span>Source checked</span></span></main>');
 try{
  const poster=f.d.getElementById('poster'),nodes=[...poster.querySelectorAll('*')],text=poster.textContent;let calls=0;poster.addEventListener('click',()=>calls++);f.start();assert.deepEqual([...poster.querySelectorAll('*')],nodes);assert.equal(poster.textContent,text);assert.equal(poster.querySelector('img').getAttribute('src'),'/original.jpg');
  for(const selector of ['.music-cover-header','.music-video-caption','.ma-result-trust__label']){const group=f.d.querySelector(selector);assert.ok(group.hasAttribute('data-ma-text-pill'));assert.equal(group.querySelectorAll('[data-ma-text-pill]').length,0);}assert.equal(poster.getAttribute('data-ma-control-pill'),'card');poster.click();assert.equal(calls,1);
 }finally{f.close();}
});

test('icon-only controls get capsules without modifying art or protected subtrees',async()=>{
 const f=fixture('<button id="icon" aria-label="Sound"><svg><path d="M0 0"/></svg></button><div contenteditable="true"><button id="editor">Editable</button></div><ins class="adsbygoogle"><button id="ad">Ad</button></ins>');
 try{const art=f.d.querySelector('svg'),markup=art.outerHTML;f.start();await f.drain();assert(f.d.getElementById('icon').hasAttribute('data-ma-control-pill'));assert.equal(art.outerHTML,markup);assert(!f.d.getElementById('editor').hasAttribute('data-ma-control-pill'));assert(!f.d.getElementById('ad').hasAttribute('data-ma-control-pill'));}finally{f.close();}
});
test('text scanning prunes whole excluded branches before reading their text',()=>{
 const f=fixture('<template id="archive"></template><div contenteditable="true">'+('<span>Private draft</span>'.repeat(400))+'</div><p>Visible copy</p>');
 try{let reads=0;const desc=Object.getOwnPropertyDescriptor(f.w.Node.prototype,'nodeValue');Object.defineProperty(f.w.Node.prototype,'nodeValue',{configurable:true,get(){reads++;return desc.get.call(this);},set:desc.set});f.start();assert(reads<20,'excluded draft descendants must not be visited: '+reads);assert.equal(f.d.querySelector('p').getAttribute('data-ma-text-pill'),'copy');}finally{f.close();}
});
