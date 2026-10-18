'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const source=read('discover.js');
function functionSource(name){
  const start=source.indexOf('function '+name+'(');
  const end=source.indexOf('\n}',start)+2;
  assert(start>=0&&end>start,name);
  return source.slice(source.slice(Math.max(0,start-6),start)==='async '?start-6:start,end);
}
function boot(items=[]){
  const dom=new JSDOM('<main id="chat-log"></main>',{url:'https://matchapp.tv/discover.html',runScripts:'outside-only'});
  const w=dom.window;
  w.CONTENT_CATALOG=[];w.DISCOVER_ITEMS=items;w.lastDiscoverQuestion='';
  w.eval(read('matching-policy.js'));
  w.discoverFallbackPoster=()=> 'data:image/svg+xml,fallback';
  w.discoverLabel=(_key,fallback)=>fallback;w.showToast=()=>{};
  w.eval(['titleKey','justWatchLocale','discoverWatchUrl','discoverCatalogEntry','isDiscoverDisliked','saveDiscoverPreference','prepareDiscoverRecommendations','releaseDiscoverClaims'].map(functionSource).join('\n'));
  w.eval('var discoverCatalogIndex=null,discoverCatalogSize=-1;');
  for(const name of ['saveDiscoverItem','notForMeDiscoverItem']){
    const start=source.indexOf('window.'+name+' = function');
    const end=source.indexOf('\n};',start)+3;
    w.eval(source.slice(start,end));
  }
  items.forEach((item,index)=>{
    const card=w.document.createElement('article');card.dataset.discoverIdx=index;
    card.innerHTML='<img id="dp-'+index+'"><button id="ds-'+index+'">Watch Later</button><button id="dn-'+index+'">Not For Me</button>';
    w.document.getElementById('chat-log').append(card);
  });
  return {dom,w};
}
const film=(title,id)=>({title,type:'movie',year:2013,_catalogMedia:{title,tmdb_id:id,media_kind:'movie'},_resolved:{artwork:'https://image.tmdb.org/t/p/w500/exact.jpg'}});

test('Ask AI Watch Later persists a guest source identity and remains excluded after reload',async()=>{
  const item=film('The Secret Life of Walter Mitty',116745),{dom,w}=boot([item]);
  try{
    await w.matchPolicy.ready();w.saveDiscoverItem(0);
    const saved=JSON.parse(w.localStorage.getItem('match_savedList'));
    assert.equal(saved.length,1);assert(saved[0].identityKeys.includes('tmdb:movie:116745'));
    assert.equal(w.document.getElementById('ds-0').getAttribute('aria-pressed'),'true');
    assert.equal(w.document.getElementById('ds-0').disabled,true);
    w.eval(read('matching-policy.js'));await w.matchPolicy.ready();
    assert.equal(w.isDiscoverDisliked(film('A Vida Secreta de Walter Mitty',116745)),true);
  }finally{dom.window.close();}
});

test('Ask AI Not For Me hides every visible source alias and removes it from Watch Later',async()=>{
  const original=film('The Secret Life of Walter Mitty',116745),localized=film('A Vida Secreta de Walter Mitty',116745);
  const {dom,w}=boot([original,localized]);
  try{
    await w.matchPolicy.ready();w.saveDiscoverItem(0);w.notForMeDiscoverItem(1);
    assert.equal(JSON.parse(w.localStorage.getItem('match_savedList')).length,0);
    assert.equal(JSON.parse(w.localStorage.getItem('match_dislikedList')).length,1);
    for(const card of w.document.querySelectorAll('article'))assert.equal(card.hidden,true);
    w.matchPolicy.remember(original,'ai');
    assert.equal(w.matchPolicy.history()[0].action,'dislike','passive artwork/history updates cannot undo a rejection');
    assert.equal(w.isDiscoverDisliked(original),true);
  }finally{dom.window.close();}
});

test('new recommendations exclude shown aliases after source resolution and deduplicate one answer',async()=>{
  const old=film('Prior film',100),a={title:'Translated prior',type:'movie'},b={title:'New movie',type:'movie'},duplicate={title:'Novo filme',type:'movie'};
  const {dom,w}=boot([a,b,duplicate]);
  try{
    await w.matchPolicy.ready();w.matchPolicy.remember(old,'shown');
    w.enrichDiscoverItem=item=>item;
    w.enrichDiscoverMedia=async item=>{item._catalogMedia={title:item.title,tmdb_id:item===a?100:200,media_kind:'movie'};return item;};
    w.discoverCardHTML=(item,index)=>'<article data-discover-idx="'+index+'">'+item.title+'</article>';
    w.discoverPosterUrl=()=>'';w.hydrateDiscoverCard=async()=>{};w.attachRelated=async()=>{};
    w.eval(functionSource('renderResultsInto'));
    const grid=w.document.createElement('div');w.document.body.append(grid);
    const rendered=await w.renderResultsInto(grid,[a,b,duplicate],0,{fresh:true});
    assert.equal(rendered.length,1);assert.equal(rendered[0],b);
    assert.equal(grid.querySelector('article').dataset.discoverIdx,'1','action keeps the original item index');
    assert.equal(w.matchPolicy.history().length,2);
    assert.equal(w.matchPolicy.excludes(duplicate),true);
    assert.equal(w.isDiscoverDisliked(b),false,'the current answer is not hidden merely because it was recorded as shown');
  }finally{dom.window.close();}
});

test('country-specific lookup failure still leaves a usable Where to Watch action',async()=>{
  const item={title:'A verified title',type:'movie',_availabilityVerified:false}, {dom,w}=boot([item]);
  try{
    w.MatchAppCatalogMedia={regionCode:()=> 'BR'};
    const link=w.document.createElement('a');link.id='dl-0';w.document.querySelector('article').append(link);
    const panel=w.document.createElement('div');panel.id='discover-availability-0';panel.hidden=true;w.document.querySelector('article').append(panel);
    w.getVerifiedPoster=()=>null;w.HIGH_RISK_PLATFORMS_DISCOVER=new Set();w.paintDiscoverGenres=()=>{};w.paintDiscoverFacts=()=>{};
    w.eval(functionSource('discoverPosterUrl'));w.eval(functionSource('hydrateDiscoverCard'));
    await w.hydrateDiscoverCard(item,0);
    assert.equal(link.href,'https://www.justwatch.com/br/search?q=A%20verified%20title');
    assert.equal(link.onclick,null,'missing metadata cannot install a click handler for a hidden panel');
    assert.equal(link.target,'_blank');
    w.MatchAppCatalogMedia.regionCode=()=>'';w.MATCH_LANG='pt-BR';
    assert.equal(w.discoverWatchUrl(item),'https://www.justwatch.com/','unknown location is not inferred from UI language');
  }finally{dom.window.close();}
});

test('competing fresh responses reveal only the identity that wins its atomic claim',async()=>{
  const first=film('One original title',300),second=film('Um título traduzido',300),{dom,w}=boot([]);
  try{
    await w.matchPolicy.ready();
    const claims=[];
    w.matchPolicy={...w.matchPolicy,claim:item=>new Promise(resolve=>claims.push({item,resolve}))};
    w.enrichDiscoverItem=item=>item;w.enrichDiscoverMedia=async item=>item;
    w.discoverCardHTML=(item,index)=>'<article data-discover-idx="'+index+'">'+item.title+'</article>';
    w.discoverPosterUrl=()=>'';w.hydrateDiscoverCard=async()=>{};w.attachRelated=async()=>{};
    w.eval(functionSource('renderResultsInto'));
    const a=w.document.createElement('div'),b=w.document.createElement('div');w.document.body.append(a,b);
    const pendingA=w.renderResultsInto(a,[first],0,{fresh:true});
    const pendingB=w.renderResultsInto(b,[second],1,{fresh:true});
    for(let i=0;i<30&&claims.length<2;i++)await Promise.resolve();
    assert.equal(claims.length,2,'both requests reach the independent atomic reservation');
    assert.equal(a.children.length,0,'even cached exact artwork waits for the reservation');
    assert.equal(b.children.length,0,'a competing response cannot show a speculative preview');
    claims[0].resolve(true);claims[1].resolve(false);
    const [acceptedA,acceptedB]=await Promise.all([pendingA,pendingB]);
    assert.equal(acceptedA.length,1);assert.equal(acceptedB.length,0);
    assert.equal(a.querySelector('article').textContent,first.title);assert.equal(b.children.length,0);
    assert.equal(w.matchPolicy.history().length,1,'only the winning card enters passive display history');
  }finally{dom.window.close();}
});
