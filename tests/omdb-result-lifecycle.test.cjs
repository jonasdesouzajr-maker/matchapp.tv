'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../omdb-ratings.js'),'utf8');
const flush=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
const identity=(title,year=2023)=>({title,year,kind:'movie',tmdbId:title==='Second'?200:100});
const answer=body=>({data:{title:body.title,year:2023,imdbId:'tt1234567',ratings:{imdb:8.1}}});
function scene({initial=null,hidden=false,invoke=answer}={}){
 const listeners=new Map(),calls=[];
 let now=1000;
 function element(){return {hidden:true,isConnected:true,children:[],textContent:'',
  append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},
  setAttribute(name,value){this[name]=value;},addEventListener(){}};}
 const host=element(),box=element();box.hidden=hidden;box.style={display:hidden?'none':'block'};
 const win={globalMatchTitle:initial?.title||'',currentMatchIdentity:initial,tmdbKindForCats:()=> 'movie',
  supabaseClient:{functions:{invoke:(_name,{body})=>{calls.push(body);return Promise.resolve(invoke(body));}}}};
 const doc={getElementById:id=>id==='res-omdb-ratings'?host:id==='result-box'?box:null,createElement:element,
  addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);}};
 vm.runInNewContext(source,{window:win,document:doc,setTimeout:()=>1,clearTimeout(){},Promise,Map,Date:{now:()=>now}});
 const emit=(name,detail)=>{for(const fn of listeners.get(name)||[])fn({detail});};
 return {win,host,box,calls,emit,advance:ms=>{now+=ms;},
  match(value){win.currentMatchIdentity=value;win.globalMatchTitle=value.title;emit('matchapp:newmatch',value);},
  metadata(value=win.currentMatchIdentity){emit('matchapp:adult-metadata',{title:value.title,kind:value.kind,tmdbId:value.tmdbId});}};
}

test('ratings wait for a valid year then load from exact late metadata without a second Match',async()=>{
 const s=scene();
 s.match(identity('First',''));await flush();
 assert.equal(s.calls.length,0,'empty year must not become year zero or launch an ambiguous title lookup');
 s.win.currentMatchIdentity=identity('First');
 s.metadata();await flush();
 assert.equal(s.calls.length,1);
 assert.equal(s.calls[0].year,2023);
 assert.equal(s.host.hidden,false);
});

test('a known IMDb identity works when the release year is not yet available',async()=>{
 const s=scene();
 s.match({...identity('First',''),imdbId:'tt1234567'});await flush();
 assert.equal(s.calls.length,1);
 assert.equal(s.calls[0].imdbId,'tt1234567');
 assert(!Object.hasOwn(s.calls[0],'year'));
 assert.equal(s.host.hidden,false,'a valid exact-ID response is not rejected as unequal to year zero');
});

test('one title without OMDb data cannot suppress ratings for a later title',async()=>{
 const s=scene({invoke:body=>body.title==='Unknown'?{data:{unavailable:true}}:answer(body)});
 s.match(identity('Unknown'));await flush();assert.equal(s.host.hidden,true);
 s.metadata();await flush();assert.equal(s.calls.length,1,'same unavailable identity has a bounded cooldown');
 s.match(identity('Second'));await flush();
 assert.equal(s.calls.length,2,'the next identity gets its own lookup');
 assert.equal(s.host.hidden,false);
});

test('a provider rate limit still observes the shared cooldown and recovers afterward',async()=>{
 const s=scene({invoke:body=>body.title==='Limited'?{error:{context:{status:429}}}:answer(body)});
 s.match(identity('Limited'));await flush();
 s.match(identity('Second'));await flush();
 assert.equal(s.calls.length,1);
 s.advance(120001);s.match(identity('Second'));await flush();
 assert.equal(s.calls.length,2);
 assert.equal(s.host.hidden,false);
});

test('initial and verified events share one in-flight lookup and stale identities cannot repaint',async()=>{
 let finish;
 const s=scene({invoke:()=>new Promise(resolve=>{finish=resolve;})});
 s.match(identity('First'));s.metadata();await flush();
 assert.equal(s.calls.length,1);
 finish(answer({title:'First'}));await flush();
 assert.equal(s.host.hidden,false);
 s.win.currentMatchIdentity=identity('Second');s.win.globalMatchTitle='Second';
 s.metadata(identity('First'));await flush();
 assert.equal(s.calls.length,1,'old exact metadata cannot issue a lookup for the current result');
});

test('ratings also hydrate an already visible result when their script loads late',async()=>{
 const visible=scene({initial:identity('First')});await flush();
 assert.equal(visible.calls.length,1);
 assert.equal(visible.host.hidden,false);
 const closed=scene({initial:identity('First'),hidden:true});await flush();
 assert.equal(closed.calls.length,0,'a dismissed result stays dismissed');
});


const textOf=node=>[node.textContent,...node.children.map(textOf)].join('');
test('source-proven IMDb ID accepts an English alias and source year difference, never a different ID',async()=>{
 const id='tt21626284';
 const s=scene({invoke:()=>({data:{imdbId:id,title:'Lost Ladies',year:2023,ratings:{imdb:8.3,rottenTomatoes:100}}})});
 s.match({...identity('Laapataa Ladies',2024),imdbId:id});await flush();
 assert.equal(s.calls[0].imdbId,id);
 assert(!Object.hasOwn(s.calls[0],'year'),'an exact external ID is not rejected for release-year aliases');
 assert.equal(s.host.hidden,false);
 assert.match(textOf(s.host),/IMDb8\.3\/10/);
 const link=s.host.children.find(node=>node.href);
 assert.equal(link.href,'https://www.imdb.com/title/'+id+'/');
 assert.equal(link.rel,'noopener noreferrer');
 const wrong=scene({invoke:()=>({data:{imdbId:'tt9999999',title:'Lost Ladies',year:2023,ratings:{imdb:9.9}}})});
 wrong.match({...identity('Laapataa Ladies',2024),imdbId:id});await flush();
 assert.doesNotMatch(textOf(wrong.host),/9\.9/,'same title or year cannot rescue the wrong external identity');
 assert.equal(wrong.host.children[0].href,'https://www.imdb.com/title/'+id+'/');
});

test('title-only ratings still reject the wrong year or title',async()=>{
 for(const returned of [{title:'Different film',year:2023},{title:'First',year:2024}]){
  const s=scene({invoke:()=>({data:{...returned,imdbId:'tt1234567',ratings:{imdb:8.1}}})});
  s.match(identity('First',2023));await flush();
  assert.equal(s.calls[0].year,2023);
  assert.equal(s.host.hidden,true,'no guessed aliases or release years for title-only lookups');
 }
});

test('an unavailable ratings provider leaves only the source-verified IMDb link without invented scores',async()=>{
 const s=scene({invoke:()=>({data:{unavailable:true}})});
 s.match({...identity('Laapataa Ladies',2024),imdbId:'tt21626284'});await flush();
 assert.equal(s.host.hidden,false);
 assert.equal(s.host.children.length,1);
 assert.equal(s.host.children[0].href,'https://www.imdb.com/title/tt21626284/');
 assert.equal(textOf(s.host),'IMDb↗');
 const bad=scene({invoke:()=>({data:{unavailable:true}})});
 bad.match({...identity('First'),imdbId:'tt21626284/evil'});await flush();
 assert(!Object.hasOwn(bad.calls[0],'imdbId'));
 assert.equal(bad.host.hidden,true);
});
