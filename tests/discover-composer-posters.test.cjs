const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../discover.js'),'utf8');
function functionSource(name){const start=source.indexOf('function '+name+'('),end=source.indexOf('\n}',start)+2;assert(start>=0&&end>start);return source.slice(start,end);}
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.className='';this.isConnected=true;this.attrs={};}
 appendChild(child){child.parent?.removeChild(child);this.children.push(child);child.parent=this;return child;}
 removeChild(child){this.children.splice(this.children.indexOf(child),1);child.parent=null;}
 insertBefore(child,before){child.parent?.removeChild(child);this.children.splice(this.children.indexOf(before),0,child);child.parent=this;}
 insertAdjacentElement(where,child){assert.equal(where,'afterend');const siblings=this.parent.children;child.parent?.removeChild(child);siblings.splice(siblings.indexOf(this)+1,0,child);child.parent=this.parent;}
 setAttribute(k,v){this.attrs[k]=v;}
 getAttribute(k){return k==='src'?this.src:this.attrs[k];}
 set innerHTML(v){this.html=v;this.children.forEach(c=>c.parent=null);this.children=[];}
 get innerHTML(){return this.html||'';}
}
function environment({autoLoad=true}={}){
 const page=new Element(),log=new Element(),row=new Element(),input=new Element('textarea');row.className='newsearch-row';row.appendChild(input);page.appendChild(log);page.appendChild(row);
 const images=new Map();
 const document={getElementById:id=>id==='chat-log'?log:images.get(id)||null,querySelector:selector=>selector==='.newsearch-row'?row:null,createElement:tag=>new Element(tag)};
 const probes=[],timers=new Map();let now=0,timerId=0;
 class Probe {set src(url){this.url=url;probes.push(this);if(autoLoad){this.naturalWidth=600;this.onload?.();}}}
 const context=vm.createContext({document,window:{},Image:Probe,Date:class extends Date {static now(){return now;}},
   setTimeout:(callback,delay)=>{const id=++timerId;timers.set(id,{callback,at:now+delay});return id;},clearTimeout:id=>timers.delete(id),
   HIGH_RISK_PLATFORMS_DISCOVER:new Set(),getVerifiedPoster:()=>'',paintDiscoverGenres:()=>{},paintDiscoverFacts:()=>{},discoverFallbackPoster:()=>'data:image/svg+xml,fallback'});
 vm.runInContext(['discoverPosterUrl','setDiscoverPoster','parkDiscoverComposer','placeDiscoverComposer','appendAssistantBubble'].map(functionSource).join('\n')+'\nlet discoverComposerNode=null;',context);
 const advance=ms=>{now+=ms;for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.callback();}};
 return {context,page,log,row,input,images,probes,timers,advance};
}
test('one composer remains below the chat, never jumping into expanding answers',()=>{
 const e=environment();let calls=0;e.input.oninput=()=>calls++;
 const a=e.context.appendAssistantBubble('First',[],{instant:true});
 assert.deepEqual(a.wrap.children.map(n=>n.className),['chat-answer-row','chat-results-grid']);
 assert(a.speakBtn.innerHTML.includes('viewBox="0 0 48 48"'));
 const b=e.context.appendAssistantBubble('Second',[],{instant:true});
 assert(!a.wrap.children.includes(e.row));assert(!b.wrap.children.includes(e.row));
 assert.equal(e.row.parent,e.page);
 e.context.parkDiscoverComposer();e.log.innerHTML='';
 const c=e.context.appendAssistantBubble('New',[],{instant:true});
 assert(!c.wrap.children.includes(e.row));assert.equal(e.row.parent,e.page);
 assert.equal(e.row.children[0],e.input);e.input.oninput();assert.equal(calls,1);
});
test('poster errors retry source sizes then stop at an honest fallback',()=>{
 const e=environment({autoLoad:false}),img=new Element('img'),item={};
 const urls=['https://image.tmdb.org/t/p/w780/exact.jpg','https://image.tmdb.org/t/p/w342/exact.jpg'];
 e.context.window.MatchAppCatalogMedia={posterVariants:()=>urls};
 e.context.setDiscoverPoster(img,item,urls[0],'fallback');
 assert.equal(img.src,'fallback');assert.equal(e.probes[0].url,urls[0]);e.probes[0].onerror();
 assert.equal(e.probes[1].url,urls[1]);e.probes[1].onerror();
 assert.equal(img.src,'fallback');assert.equal(img.onerror,null);assert.equal(item._resolved.artwork,'fallback');assert(item._posterExhausted);
});

test('stalled artwork stays visible and bounded recovery promotes only a decoded original',()=>{
 const e=environment({autoLoad:false}),img=new Element('img'),item={title:'Exact film'};
 const urls=['https://image.tmdb.org/t/p/w780/exact.jpg','https://image.tmdb.org/t/p/w500/exact.jpg'];
 e.context.window.MatchAppCatalogMedia={posterVariants:()=>urls};
 e.context.setDiscoverPoster(img,item,urls[0],'fallback');
 assert.equal(img.src,'fallback');e.advance(3000);
 assert.equal(e.probes.length,2);assert.equal(img.src,'fallback');
 e.probes[1].naturalWidth=500;e.probes[1].onload();
 assert.equal(img.src,urls[1]);assert.equal(item._resolved.artwork,urls[1]);assert.equal(e.timers.size,0);
});

test('an old poster probe cannot replace a newer card identity',()=>{
 const e=environment({autoLoad:false}),img=new Element('img');
 const old={title:'Old film'},next={title:'New film'};
 e.context.setDiscoverPoster(img,old,'https://image.tmdb.org/t/p/w500/old.jpg','old-fallback');
 const late=e.probes[0].onload;e.probes[0].naturalWidth=500;
 e.context.setDiscoverPoster(img,next,'https://image.tmdb.org/t/p/w500/new.jpg','new-fallback');
 late();assert.equal(img.src,'new-fallback');
 e.probes[1].naturalWidth=500;e.probes[1].onload();
 assert.equal(img.src,'https://image.tmdb.org/t/p/w500/new.jpg');
});

test('exact source identity keeps a remake poster separate from a same-named registry title',()=>{
 const e=environment();e.context.getVerifiedPoster=()=> 'https://image.tmdb.org/t/p/w780/tv-adaptation.jpg';
 const item={title:'The Gentlemen',year:2019,type:'movie',_catalogMedia:{tmdb_id:522627,media_kind:'movie',poster_url:'https://image.tmdb.org/t/p/w500/movie-original.jpg'}};
 assert.equal(e.context.discoverPosterUrl(item),'https://image.tmdb.org/t/p/w500/movie-original.jpg');
});

test('resolved metadata for a replaced chat card cannot paint into a reused action index',async()=>{
 const e=environment(),old=new Element('img'),current=new Element('img');e.images.set('dp-0',old);
 let release;e.context.window.MatchAppCatalogMedia={resolvePoster:()=>new Promise(resolve=>release=resolve)};
 vm.runInContext('async '+functionSource('hydrateDiscoverCard'),e.context);
 const work=e.context.hydrateDiscoverCard({title:'Old film',type:'movie'},0);
 old.isConnected=false;current.src='new-poster';e.images.set('dp-0',current);
 release({url:'https://image.tmdb.org/t/p/w500/old.jpg',meta:{tmdb_id:12,media_kind:'movie'}});
 await work;assert.equal(current.src,'new-poster');assert.equal(e.probes.length,0);
});
test('incomplete catalog metadata resolves original artwork using the existing exact identity',async()=>{
 const e=environment(),img=new Element('img');e.images.set('dp-0',img);
 let options;e.context.window.MatchAppCatalogMedia={resolvePoster:async(title,opts)=>{options=opts;return {url:'https://image.tmdb.org/t/p/original/exact.jpg',meta:{tmdb_id:116745,media_kind:'movie'}};}};
 vm.runInContext('async '+functionSource('hydrateDiscoverCard'),e.context);
 await e.context.hydrateDiscoverCard({title:'A Vida Secreta de Walter Mitty',type:'movie',year:2013,_catalogMedia:{tmdb_id:116745,media_kind:'movie',overview:'Known metadata'}},0);
 assert.equal(options.tmdbId,116745);assert.equal(options.kind,'movie');assert.equal(img.src,'https://image.tmdb.org/t/p/original/exact.jpg');
});
test('resolved artwork paints without waiting for optional preview metadata',async()=>{
 const e=environment(),img=new Element('img');e.images.set('dp-0',img);
 let release;e.context.getRichMetadata=()=>new Promise(resolve=>release=resolve);
 vm.runInContext('async '+functionSource('hydrateDiscoverCard'),e.context);
 const work=e.context.hydrateDiscoverCard({title:'Known film',type:'movie',_meta:{artwork:'https://image.tmdb.org/t/p/w500/known.jpg'}},0);
 assert.equal(img.src,'https://image.tmdb.org/t/p/w500/known.jpg');release(null);await work;
});
