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
function environment(){
 const page=new Element(),log=new Element(),row=new Element(),input=new Element('textarea');row.className='newsearch-row';row.appendChild(input);page.appendChild(log);page.appendChild(row);
 const images=new Map();
 const document={getElementById:id=>id==='chat-log'?log:images.get(id)||null,querySelector:selector=>selector==='.newsearch-row'?row:null,createElement:tag=>new Element(tag)};
 const context=vm.createContext({document,window:{},HIGH_RISK_PLATFORMS_DISCOVER:new Set(),getVerifiedPoster:()=>'',paintDiscoverGenres:()=>{},paintDiscoverFacts:()=>{},discoverFallbackPoster:()=>'data:image/svg+xml,fallback'});
 vm.runInContext(['discoverPosterUrl','setDiscoverPoster','parkDiscoverComposer','placeDiscoverComposer','appendAssistantBubble'].map(functionSource).join('\n')+'\nlet discoverComposerNode=null;',context);
 return {context,page,log,row,input,images};
}
test('one existing composer moves between the answer and cards, surviving chat reset',()=>{
 const e=environment();let calls=0;e.input.oninput=()=>calls++;
 const a=e.context.appendAssistantBubble('First',[],{instant:true});
 assert.deepEqual(a.wrap.children.map(n=>n.className),['chat-answer-row','newsearch-row','chat-results-grid']);
 assert(a.speakBtn.innerHTML.includes('viewBox="0 0 48 48"'));
 const b=e.context.appendAssistantBubble('Second',[],{instant:true});
 assert(!a.wrap.children.includes(e.row));assert(b.wrap.children.includes(e.row));
 e.context.parkDiscoverComposer();e.log.innerHTML='';
 const c=e.context.appendAssistantBubble('New',[],{instant:true});
 assert(c.wrap.children.includes(e.row));assert.equal(e.row.children[0],e.input);e.input.oninput();assert.equal(calls,1);
});
test('poster errors retry source sizes then stop at an honest fallback',()=>{
 const e=environment(),img=new Element('img'),item={};
 const urls=['https://image.tmdb.org/t/p/w780/exact.jpg','https://image.tmdb.org/t/p/w342/exact.jpg'];
 e.context.window.MatchAppCatalogMedia={posterVariants:()=>urls};
 e.context.setDiscoverPoster(img,item,urls[0],'fallback');
 assert.equal(img.src,urls[0]);img.onerror();assert.equal(img.src,urls[1]);img.onerror();
 assert.equal(img.src,'fallback');assert.equal(img.onerror,null);assert.equal(item._resolved.artwork,'fallback');assert(item._posterExhausted);
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
