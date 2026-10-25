'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const {JSDOM}=require('jsdom');
const {CRITICAL_STYLE_PRELOADS,cinemaAssets,versionFrameStylesheet,versionReferenceRuntimeAssets}=require('../tools/finalize-brand.js');
const ROOT=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unchanged=html=>html;

function newsTemplates(theme){
  const file=path.join(ROOT,'tools/refresh-news-rss.js'),source=read('tools/refresh-news-rss.js');
  const entry=source.indexOf('(async()=>{');
  assert.ok(entry>0,'extract renderer definitions without running the publisher');
  const requireFromGenerator=createRequire(file);
  return vm.runInNewContext(source.slice(0,entry)+'\n;({page,hub})',{
    __dirname:path.dirname(file),URL,console,
    fetch(){throw Error('The presentation fixture must not request publisher data');},
    require(name){return name==='./finalize-brand.js'?{cinemaAssets:theme}:requireFromGenerator(name);}
  });
}

function trendingTemplate(theme){
  const source=read('tools/refresh-trending.mjs');
  assert.match(source,/import \{cinemaAssets\} from '\.\/finalize-brand\.js'/);
  const start=source.indexOf('  const headDescription='),end=source.indexOf('\n  fs.mkdirSync(',start);
  assert.ok(start>0&&end>start,'extract only the rendered document, never refresh data');
  const titles=Array.from({length:6},(_,index)=>({title:'Original title '+index,kind:'movie',year:2026,poster:'https://image.tmdb.org/t/p/w500/fixture-'+index+'.jpg',description:'Verified fixture synopsis.',genre:['Drama'],originName:'Brazil'}));
  return vm.runInNewContext(source.slice(source.indexOf('function jsonLd('),source.indexOf('async function main('))+source.slice(start,end)+'\n;html;',{
    cinemaAssets:theme,esc,isoDay:value=>new Date(value).toISOString().slice(0,10),titles,
    updated:'2026-10-20T12:00:00Z',data:{titles,updated:'2026-10-20T12:00:00Z',sourceNote:'Verified source note & context.'},
    musicInventory:{billboard:{},items:[],spotifyVideos:{}},
    billboardMusic:{renderBillboard:()=>'<section data-fixture-billboard>Chart source</section>'},
    spotifyMusic:{renderSpotify:()=>'<section data-fixture-spotify>Official music source</section>'}
  });
}

function weeklyTemplate(theme,pick){
  const source=read('tools/refresh-weekly-pick.mjs');
  assert.match(source,/import \{cinemaAssets\} from '\.\/finalize-brand\.js'/);
  const start=source.indexOf('function verifiedSourceUrl(pick){'),end=source.indexOf('\nfunction write(pick)',start);
  assert.ok(start>0&&end>start,'extract the pure weekly document renderer');
  const render=vm.runInNewContext(source.slice(start,end)+'\n;page;',{cinemaAssets:theme,esc,httpsUrl:require('../tools/availability-evidence.cjs').httpsUrl});
  return render(pick);
}

function awarenessTemplate(theme,campaign){
  const source=read('tools/awareness-bot.mjs');
  assert.match(source,/import \{cinemaAssets\} from '\.\/finalize-brand\.js'/);
  const definitions=source.slice(source.indexOf('const today='),source.indexOf('async function verifyUrl('));
  const rendering=source.slice(source.indexOf('function seoSchema('),source.indexOf('\nfunction botOwned('));
  const render=vm.runInNewContext(definitions+rendering+'\n;generic;',{
    cinemaAssets:theme,fetch(){throw Error('Awareness presentation must not verify or rotate sources');}
  });
  return render(campaign);
}

function cjsTemplates(file,stop,expression,theme){
  const filename=path.join(ROOT,file),source=read(file),end=source.indexOf(stop);
  assert.ok(end>0,'extract definitions before generated writes in '+file);
  const requireFromGenerator=createRequire(filename);
  return vm.runInNewContext(source.slice(0,end)+'\n;('+expression+');',{
    __dirname:path.dirname(filename),URL,console,
    require(name){
      if(name==='./finalize-brand.js')return {cinemaAssets:theme};
      if(name==='node:fs')return {readFileSync:fs.readFileSync.bind(fs)};
      return requireFromGenerator(name);
    },
    fetch(){throw Error('Static presentation fixtures must not fetch sources');}
  });
}

// Strip only the explicitly versioned masthead assets, then the prior Jonas
// repair pin. Every other byte of the body must remain identical.
function bodyWithoutJonasRepair(body,expectRepair){
  const copy=body.cloneNode(true);
  for(const script of copy.querySelectorAll('script[src^="/patches/jonas-adult-page.js?"]')){
    const src=script.getAttribute('src'),pins=new URL(src,'https://matchapp.tv').searchParams.getAll('refined');
    if(pins.length){
      assert.deepEqual(pins,['20261025-1'],'one current presentation pin');
      assert.ok(src.endsWith('&refined=20261025-1'),'preserve the original query prefix');
      script.setAttribute('src',src.slice(0,-'&refined=20261025-1'.length));
    }
  }
  for(const script of copy.querySelectorAll('script[src]')){
    const src=script.getAttribute('src'),url=new URL(src,'https://matchapp.tv');
    if(!['/build-meta.js','/poster-wall.js','/patches/jonas-adult-page.js'].includes(url.pathname))continue;
    const pins=url.searchParams.getAll('masthead');
    if(pins.length){
      assert.deepEqual(pins,['20261025-1'],'one current masthead pin');
      assert.ok(src.endsWith('&masthead=20261025-1'),'preserve the original query prefix');
      script.setAttribute('src',src.slice(0,-'&masthead=20261025-1'.length));
    }
  }
  for(const script of copy.querySelectorAll('script[src^="/patches/jonas-adult-page.js?"]')){
    const src=script.getAttribute('src'),suffix='&repair=20261023-1';
    const pins=new URL(src,'https://matchapp.tv').searchParams.getAll('repair');
    if(expectRepair||pins.length){
      assert.deepEqual(pins,['20261023-1'],'the owned Jonas loader receives exactly the current repair pin');
      assert.ok(src.endsWith(suffix),'the repair pin must preserve the original query as an exact prefix');
      script.setAttribute('src',src.slice(0,-suffix.length));
    }
  }
  return copy.outerHTML;
}

function assertPresentationOnly(raw,themed,route){
  const before=new JSDOM(raw).window,after=new JSDOM(themed).window;
  try{
    const d=after.document,beforeDoc=before.document;
    assert.ok(d.documentElement.classList.contains('ma-reference'));
    assert.equal([...d.documentElement.classList].filter(name=>name==='ma-reference').length,1);
    for(const selector of ['style[data-cinema-layer]','link[href^="/patches/reference-system.css?"]','link[href^="/patches/reference-pages.css?"]','script[defer][src^="/patches/reference-system.js?"]'])assert.equal(d.querySelectorAll(selector).length,1,route+' has exactly one '+selector);
    assert.equal(d.querySelector('style[data-cinema-layer]').textContent,'@layer ma-reference;');
    assert.equal(d.querySelector('link[href^="/patches/reference-home.css"],link[href^="/patches/reference-explore.css"]'),null);
    assert.equal(bodyWithoutJonasRepair(d.body,true),bodyWithoutJonasRepair(beforeDoc.body,false),'all source records, controls, artwork, ad geometry and paths stay identical');
    const validOwnedPreload=node=>node.matches('link[rel="preload"][as="style"][data-cinema-preload="critical-style"]')&&CRITICAL_STYLE_PRELOADS.includes(node.getAttribute('href'));
    const originalHead=doc=>[...doc.head.children].filter(node=>!validOwnedPreload(node)&&!node.matches('style[data-cinema-layer],link[href^="/patches/reference-system.css?"],link[href^="/patches/reference-pages.css?"],script[src^="/patches/reference-system.js?"]')).map(node=>versionReferenceRuntimeAssets(versionFrameStylesheet(node.outerHTML)));
    assert.deepEqual(originalHead(d),originalHead(beforeDoc),'metadata, analytics, original styles and source scripts stay identical');
    assert.equal(d.documentElement.lang,beforeDoc.documentElement.lang);
    assert.equal(cinemaAssets(themed,route),themed,'repeated finalization cannot duplicate the theme');
  }finally{before.close();after.close();}
}

function story(language='en'){
  return {id:'theme-fixture',title:'Netflix releases original «A & B» film trailer',url:'https://www.bbc.com/news/articles/fixture',source:'BBC',source_domain:'bbc.com',source_home:'https://www.bbc.com',category:'entertainment',event_type:'Release',country:'GB',language,description:'Original publisher context.',published_at:'2026-10-20T12:00:00Z',discovered_at:'2026-10-20T12:05:00Z',image:null,matchapp_url:'https://matchapp.tv/news/articles/theme-fixture/',landing_url:'https://matchapp.tv/?news=theme-fixture#latest-news',seo:{meta_title:'Original source title | MatchApp Ai',meta_description:'Original source context.',keywords:['film'],short_tail:['film'],entity_keywords:['Netflix'],trend_keywords:[],seo_generated_at:'2026-10-20T12:05:00Z'}};
}

test('fresh news hub and retained article templates keep the approved theme without changing source records',()=>{
  const raw=newsTemplates(unchanged),themed=newsTemplates(cinemaAssets);
  for(const language of ['en','pt','ar']){
    const item=story(language),snapshot=JSON.stringify(item);
    assertPresentationOnly(raw.page(item),themed.page(item),'news/articles/theme-fixture/index.html');
    assert.equal(JSON.stringify(item),snapshot,'rendering does not mutate archived news');
  }
  const items=[story(),{...story('pt'),id:'second-source'}];
  assertPresentationOnly(raw.hub(items,'2026-10-20T12:05:00Z'),themed.hub(items,'2026-10-20T12:05:00Z'),'news/index.html');
});

test('fresh trending document keeps the approved theme and immediate poster loading',()=>{
  const raw=trendingTemplate(unchanged),themed=trendingTemplate(cinemaAssets);
  assertPresentationOnly(raw,themed,'trending/this-week/index.html');
  const w=new JSDOM(themed).window;
  try{assert.deepEqual([...w.document.querySelectorAll('.trend-card img')].map(img=>img.getAttribute('loading')),['eager','eager','eager','eager','lazy','lazy']);}
  finally{w.close();}
});

test('fresh weekly-choice documents preserve verified art and viewing routes while receiving the theme',()=>{
  const pick={title:'Verified fixture title',year:2026,poster:'https://image.tmdb.org/t/p/w780/fixture.jpg',synopsis:'Verified source synopsis.',genres:['Drama'],cast:['Actor One'],country:'Brazil',runtime:120,rating:'PG-13',selectedAt:'2026-10-20T12:00:00Z',sourceUrl:'https://www.themoviedb.org/movie/123',sourceRank:1,releaseDate:'2026-10-19',streaming:{name:'Netflix',region:'BR'}};
  for(const fixture of [pick,{...pick,inCinemas:true,streaming:null}]){
    const snapshot=JSON.stringify(fixture),raw=weeklyTemplate(unchanged,fixture),themed=weeklyTemplate(cinemaAssets,fixture);
    assertPresentationOnly(raw,themed,'featured/this-week/index.html');
    assert.equal(JSON.stringify(fixture),snapshot,'rendering does not modify weekly selection data');
    const w=new JSDOM(themed).window;
    try{
      const poster=w.document.querySelector('.hero img');
      assert.equal(poster.getAttribute('src'),fixture.poster);assert.equal(poster.getAttribute('fetchpriority'),'high');
      assert.ok(w.document.querySelector('a.button').getAttribute('href').startsWith('/discover.html?q='));
    }finally{w.close();}
  }
});

test('fresh awareness documents preserve campaign identity, dates, resources and copy without invoking rotation',()=>{
  const campaign={id:'fixture-campaign-2026',name:'Fixture Awareness Month',year:2026,pageUrl:'/awareness/fixture-campaign-2026/',startDate:'2026-10-01',endExclusive:'2026-11-01',durationDays:31,sourceName:'World Health Organization',sourceUrl:'https://www.who.int/campaigns/fixture',ribbonColor:'#e5c158',ribbonColorName:'gold',ribbonSourceName:'Official ribbon resource',ribbonSourceUrl:'https://www.who.int/campaigns/fixture/ribbon',theme:'Authored campaign theme & source context.',supportLine:'Authored campaign support line.'};
  for(const fixture of [campaign,{...campaign,ribbonColorName:'',ribbonSourceUrl:''}]){
    const snapshot=JSON.stringify(fixture);
    assertPresentationOnly(awarenessTemplate(unchanged,fixture),awarenessTemplate(cinemaAssets,fixture),'awareness/'+fixture.id+'/index.html');
    assert.equal(JSON.stringify(fixture),snapshot,'presentation never mutates the campaign record');
  }
});

test('fresh worldwide guide preserves every authored language section and discovery link',()=>{
  const args=['tools/build-world-discovery-guide.js','const out=','render(LANGUAGES)'];
  const raw=cjsTemplates(...args,unchanged),themed=cjsTemplates(...args,cinemaAssets);
  assertPresentationOnly(raw,themed,'guides/worldwide-entertainment-discovery/index.html');
  const w=new JSDOM(themed).window;
  try{
    const cards=[...w.document.querySelectorAll('.lang-card')];assert.equal(cards.length,14);
    assert.equal(cards.find(card=>card.lang==='ar').getAttribute('dir'),'rtl');
    for(const card of cards)assert.ok(card.querySelector('a').getAttribute('href').includes('lang='+card.lang));
  }finally{w.close();}
});

test('fresh sponsorship and streaming directories preserve forms, source art, markets and exact route paths',()=>{
  const args=['tools/build-partnership-pages.cjs','for(const [route,body]of',"({sponsor:page('sponsor',sponsor),streaming:page('streaming',directory)})"];
  const raw=cjsTemplates(...args,unchanged),themed=cjsTemplates(...args,cinemaAssets);
  for(const type of ['sponsor','streaming'])assertPresentationOnly(raw[type],themed[type],type+'/index.html');
});

test('fresh founder biography repairs copied partial theme assets without duplicating them or changing his identity',()=>{
  const args=['tools/build-founder-page.cjs','fs.mkdirSync(','body'];
  const raw=cjsTemplates(...args,unchanged),themed=cjsTemplates(...args,cinemaAssets);
  assertPresentationOnly(raw,themed,'founder/index.html');
  const w=new JSDOM(themed).window;
  try{
    const founder=JSON.parse(w.document.querySelector('#founder-schema').textContent)['@graph'][0];
    assert.equal(founder.mainEntity.name,'Jonas Junior');assert.equal(founder.mainEntity['@type'],'Person');
    assert.equal(w.document.querySelector('#founder-portrait').getAttribute('fetchpriority'),'high');
  }finally{w.close();}
});
