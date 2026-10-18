'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const catalog=read('catalog-media.js');
const app=read('app.js');
const start=app.indexOf('async function hydrateTitleFacts(');
const hydrateSource=app.slice(start,app.indexOf('\n}',start)+2);
const languages={
  en:['Genres','Comedy','Watch','Movie'], 'pt-BR':['Gêneros','Comédia','Assistir','Filme'],
  es:['Géneros','Comedia','Ver','Película'], fr:['Genres','Comédie','Regarder','Film'],
  de:['Genres','Komödie','Ansehen','Film'], it:['Generi','Commedia','Guarda','Film'],
  tr:['Türler','Komedi','İzle','Film'], ru:['Жанры','Комедия','Смотреть','Фильм'],
  ar:['الأنواع','كوميديا','مشاهدة','فيلم'], hi:['शैलियाँ','कॉमेडी','देखें','फ़िल्म'],
  id:['Genre','Komedi','Tonton','Film'], ja:['ジャンル','コメディ','視聴','映画'],
  ko:['장르','코미디','시청','영화'], zh:['类型','喜剧','观看','电影']
};
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const metadata=freeze({title:'Source Title: Identity',tmdb_id:123,media_kind:'movie',year:2026,
  genres:['Romance','Comedy'],origin_countries:['US'],cast_members:[{name:'Source Actor',character:'Source Character'}],
  overview:'A source-owned description with its original title identity.',runtime_minutes:101,content_rating:'PG-13',vote_average:7.2,
  kids_approved:true,availability:{source:'tmdb-watch-providers',source_page_url:'https://www.themoviedb.org/movie/123',
    BR:{stream:['Amazon Prime Video','Amazon Prime Video with Ads'],rent:['Amazon Video'],buy:['Amazon Video']},
    US:{stream:['Netflix']}}});
function harness({language='pt-BR',desktop=false,android=false,kids=false,source=catalog}={}){
  const dom=new JSDOM('<!doctype html><html lang="de"><body class="page-home"><article id="result-box" hidden style="display:none"><span id="res-platform-badge">Prime Video</span><h2 id="res-title">Source Title: Identity</h2><div id="res-factbar"></div><p id="res-synopsis">A source-owned description with its original title identity.</p><p id="res-cast"></p></article><section id="availability"></section></body></html>',{url:kids?'https://matchapp.tv/kids/':'https://matchapp.tv/',runScripts:'outside-only'});
  const w=dom.window;
  w.MATCH_LANG=language;w.localStorage.setItem('match_lang',language);w.localStorage.setItem('match_user_region','BR');
  w.matchMedia=()=>({matches:desktop});
  if(android)w.document.documentElement.classList.add('matchapp-android');
  if(kids)w.document.documentElement.classList.add('kids-mode');
  const calls={fetch:0};w.fetch=()=>{calls.fetch++;throw Error('Unexpected network request');};
  w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return {dom,w,d:w.document,api:w.MatchAppCatalogMedia,calls,close:()=>w.close()};
}
function changeLanguage(h,language){h.w.localStorage.setItem('match_lang',language);h.w.MATCH_LANG=language;h.d.dispatchEvent(new h.w.CustomEvent('matchapp:langchange',{detail:{lang:language}}));}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('all 14 result languages translate labels and canonical genres without changing providers, URLs or metadata',()=>{
  const before=JSON.stringify(metadata);let canonicalLinks;
  for(const [language,[genreLabel,comedy,watch,movie]] of Object.entries(languages)){
    const h=harness({language}),host=h.d.getElementById('availability');
    h.api.renderAvailability(host,metadata,{title:metadata.title,region:'BR'});
    assert.equal(host.querySelector('.matchapp-real-genres strong').textContent,genreLabel,language);
    assert.ok([...host.querySelectorAll('.matchapp-real-genres span')].some(node=>node.textContent===comedy),language);
    const action=host.querySelector('.matchapp-provider-actions a');
    assert.equal(action.textContent,watch+' · Amazon Prime Video',language);
    assert.ok(host.textContent.includes('Amazon Prime Video with Ads'),language);
    assert.equal(h.api.resultFact('Movie'),movie,language);
    const links=[...host.querySelectorAll('a')].map(node=>[node.href,node.target,node.rel]);
    canonicalLinks??=links;assert.deepEqual(links,canonicalLinks,language);
    if(language!=='en')assert.doesNotMatch(host.querySelector('.matchapp-availability-status').textContent,/Streaming in .+ now\./,language);
    assert.equal(h.d.getElementById('res-title').textContent,metadata.title);
    assert.equal(h.calls.fetch,0);h.close();
  }
  assert.equal(JSON.stringify(metadata),before);
});

test('language switching repaints existing result nodes and retains external listeners and source identity',()=>{
  const h=harness(),host=h.d.getElementById('availability');
  h.api.renderAvailability(host,metadata,{title:metadata.title,region:'BR'});
  const link=host.querySelector('.matchapp-provider-actions a'),href=link.href;
  let clicks=0;link.addEventListener('click',event=>{event.preventDefault();clicks++;});
  const bar=h.d.getElementById('res-factbar');bar.innerHTML='<span>2026</span><span>United States</span><span>Movie</span><span>Comedy</span>';
  h.api.localizeResultFacts(bar);
  assert.match(bar.textContent,/2026Estados UnidosFilmeComédia/);
  changeLanguage(h,'ja');
  assert.equal(host.querySelector('.matchapp-provider-actions a'),link);
  assert.equal(link.href,href);assert.equal(link.textContent,'視聴 · Amazon Prime Video');
  assert.match(bar.textContent,/2026アメリカ合衆国映画コメディ/);
  link.click();assert.equal(clicks,1);
  changeLanguage(h,'pt-BR');assert.match(bar.textContent,/2026Estados UnidosFilmeComédia/);
  assert.equal(h.calls.fetch,0);h.close();
});

test('saved app language wins over stale result, ambient, page and device languages',()=>{
  const h=harness();h.w.MATCH_LANG='en';h.w.matchResultLanguage=()=> 'en';h.w.localStorage.setItem('match_lang','pt-BR');
  assert.equal(h.api.resultFact('United States'),'Estados Unidos');
  h.w.matchResultLanguage=()=>{throw Error('A stale optional result locale must not be consulted');};
  assert.equal(h.api.resultFact('Movie'),'Filme');
  assert.equal(h.api.resultFact('Science-Fiction','genre'),'Ficção científica');
  assert.equal(h.api.resultFact('Source-specific subgenre','genre'),'Source-specific subgenre');
  h.w.localStorage.setItem('match_lang','ko-KR');assert.equal(h.api.resultFact('Movie'),'영화');
  h.w.localStorage.setItem('match_lang','pt_br');assert.equal(h.api.resultFact('Movie'),'Filme');h.close();
});

test('a failed optional label hook cannot interrupt the existing hydration path',async()=>{
  const h=harness();let fetches=0;
  const failureWindow={MATCH_LANG:'pt-BR',matchMedia:()=>({matches:false}),MatchAppCatalogMedia:{localizeResultFacts(){throw Error('Optional display hook failed');}}};
  const hydrate=vm.runInNewContext('('+hydrateSource+')',{window:failureWindow,document:h.d,sanitizeDisplayText:value=>String(value),
    fetchTitleMeta:async()=>{fetches++;return {year:2026,country:'United States',genres:['Comedy']};}});
  await hydrate({title:metadata.title,cats:['movie']},{year:2026,country:'United States'});
  assert.equal(fetches,1);assert.match(h.d.getElementById('res-factbar').textContent,/2026United StatesComedy/);h.close();
});

test('the existing i18n cross-tab storage handler repaints result labels through langchange',()=>{
  const h=harness(),host=h.d.getElementById('availability');
  h.w.eval(read('i18n.js'));
  h.api.renderAvailability(host,metadata,{title:metadata.title,region:'BR'});
  const link=host.querySelector('.matchapp-provider-actions a');
  assert.equal(link.textContent,'Assistir · Amazon Prime Video');
  h.w.localStorage.setItem('match_lang','fr');
  h.w.dispatchEvent(new h.w.StorageEvent('storage',{key:'match_lang',oldValue:'pt-BR',newValue:'fr'}));
  assert.equal(host.querySelector('.matchapp-provider-actions a'),link);
  assert.equal(link.textContent,'Regarder · Amazon Prime Video');
  assert.match(host.querySelector('.matchapp-availability-status').textContent,/Brésil/);h.close();
});

test('both existing hydration paths translate badges without changing the fetched or selected record',async()=>{
  for(const options of [{desktop:true},{desktop:false},{desktop:true,android:true}]){
    const h=harness(options),selected=freeze({title:metadata.title,cats:['movie']}),hints=freeze({year:2026,country:'United States',cats:['movie']});
    const selectedBefore=JSON.stringify({selected,hints});let fetches=0;
    const hydrate=vm.runInNewContext('('+hydrateSource+')',{window:h.w,document:h.d,sanitizeDisplayText:value=>String(value),
      fetchTitleMeta:async(title,receivedHints)=>{fetches++;assert.equal(title,metadata.title);assert.equal(receivedHints,hints);return freeze({year:2026,country:'United States',genres:['Comedy']});}});
    await hydrate(selected,hints);
    const text=h.d.getElementById('res-factbar').textContent;
    assert.ok(text.includes('Estados Unidos'));assert.ok(text.includes(options.desktop&&!options.android?'Filme':'Comédia'));
    assert.equal(fetches,options.desktop&&!options.android?0:1);
    assert.equal(JSON.stringify({selected,hints}),selectedBefore);h.close();
  }
});

test('availability follow action retains its real arguments and pending state through language switches',async()=>{
  const h=harness(),host=h.d.getElementById('availability');
  const unavailable=freeze({...metadata,availability:{...metadata.availability,BR:{stream:[]}}});
  h.api.renderAvailability(host,unavailable,{title:metadata.title,region:'BR'});
  const follow=host.querySelector('.matchapp-follow-availability');let signedIn=0,toast='';
  h.w.openAuthModal=()=>signedIn++;h.w.showToast=value=>toast=value;
  follow.click();assert.equal(signedIn,1);assert.match(toast,/Entre na sua conta/);
  let resolveFollow,received;
  h.w.MatchNotifications={followTitle:(...args)=>{received=args;return new Promise(resolve=>resolveFollow=resolve);}};
  follow.click();assert.equal(follow.disabled,true);assert.equal(received[0],unavailable);assert.equal(received[1],'BR');
  changeLanguage(h,'ja');assert.equal(host.querySelector('.matchapp-follow-availability'),follow);assert.equal(follow.disabled,true);
  resolveFollow(true);await tick();assert.equal(follow.disabled,false);assert.match(follow.textContent,/通知をお送りします/);
  changeLanguage(h,'pt-BR');assert.match(follow.textContent,/Você será avisado/);assert.equal(follow.classList.contains('is-following'),true);
  assert.match(host.querySelector('.matchapp-other-countries').textContent,/Estados Unidos · Netflix/);
  assert.equal(h.calls.fetch,0);h.close();
});

test('adult presentation helpers are inert in Kids and preserve raw source genres there',()=>{
  const h=harness({kids:true}),host=h.d.getElementById('availability');
  h.api.renderAvailability(host,metadata,{kids:true,title:metadata.title,region:'BR'});
  assert.equal(host.querySelector('.matchapp-real-genres strong').textContent,'Genres');
  assert.equal(host.querySelector('.matchapp-provider-actions a').textContent,'Watch · Amazon Prime Video');
  assert.ok(host.textContent.includes('Comedy'));assert.equal(host.querySelector('[data-ma-result-copy],[data-ma-result-fact]'),null);
  const before=host.innerHTML;changeLanguage(h,'ja');assert.equal(host.innerHTML,before);h.close();
});
