'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');
const read = file => fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const moduleSource = read('result-experience.js');
const html = read('index.html');
const resultMarkup = html.slice(html.indexOf('<article id="result-box"'),html.indexOf('</article>',html.indexOf('<article id="result-box"')) + 10);

function harness({language='en',country='BR',href='https://www.netflix.com/title/12345678',kids=false}={}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body class="page-home"><main class="page-wrapper">' + resultMarkup + '</main></body></html>',{url:kids?'https://matchapp.tv/kids/':'https://matchapp.tv/',runScripts:'outside-only'});
  const w = dom.window;
  w.MATCH_LANG = language;
  if(country) w.localStorage.setItem('match_user_region',country);
  const action = w.document.getElementById('res-direct-link');
  action.href = href;
  let originalCalls = 0;
  let registeredCalls = 0;
  const handler = function () { originalCalls++; return false; };
  action.onclick = handler;
  action.addEventListener('click',() => { registeredCalls++; });
  const original = {action,handler,href:action.href,poster:w.document.getElementById('res-poster-img'),posterMarkup:w.document.getElementById('res-poster-img').outerHTML,ads:[...w.document.querySelectorAll('.ad-banner-container')].map(node=>node.outerHTML)};
  w.globalMatchTitle = 'Verified fixture title';
  w.currentMatchIdentity = {title:w.globalMatchTitle,tmdbId:123,year:2024,kind:'movie'};
  w.eval(moduleSource);
  const api = w.MatchAppResultExperience;
  const selected = {title:w.globalMatchTitle,year:2024,_tmdbId:123,_tmdbKind:'movie',platform:'Netflix',watchUrl:href};
  return {dom,w,api,action,original,selected,calls:()=>({original:originalCalls,registered:registeredCalls})};
}

function metadata(overrides={}) {
  return {
    title:'Verified fixture title',tmdb_id:123,media_kind:'movie',year:2024,
    updated_at:new Date().toISOString(),
    availability:{source:'tmdb-watch-providers',source_page_url:'https://www.themoviedb.org/movie/123',BR:{stream:['Netflix'],rent:[],buy:[]}},
    ...overrides
  };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('result presentation retains the original destination, control objects and both click paths',async () => {
  const h = harness();
  h.api.present(h.selected,{audioPick:false});
  h.api.setAvailability(h.selected.title,metadata(),'BR');
  await flush();
  assert.equal(h.action,h.original.action);
  assert.equal(h.action.href,h.original.href);
  assert.equal(h.action.onclick,h.original.handler);
  assert.ok(h.action.classList.contains('no-depth'),'the inherited decorative bevel opts out on this CTA only');
  h.action.click();
  assert.deepEqual(h.calls(),{original:1,registered:1});
  assert.equal(h.w.document.getElementById('res-poster-img'),h.original.poster);
  assert.equal(h.original.poster.outerHTML,h.original.posterMarkup);
  assert.deepEqual([...h.w.document.querySelectorAll('.ad-banner-container')].map(node=>node.outerHTML),h.original.ads);
  assert.equal(h.w.document.querySelectorAll('#ma-result-trust').length,1);
  assert.equal(h.action.previousElementSibling.id,'ma-result-trust');
  assert.equal(h.w.document.getElementById('btn-share-match').getAttribute('onclick'),'openShareSheet()');
  assert.equal(h.w.document.getElementById('btn-watch-later').getAttribute('onclick'),"recordAction('save')");
  assert.equal(h.w.document.getElementById('btn-not-for-me').getAttribute('onclick'),'openNotForMeChooser()');
  assert.equal(h.w.document.querySelector('.rematch-btn--primary').getAttribute('onclick'),'matchAgainSameCriteria()');
  assert.equal(h.action.textContent,'Watch on Netflix');
  h.dom.window.close();
});

test('country verification requires fresh source evidence for the exact identity and current route provider',() => {
  const cases = [
    ['valid record',metadata(),'BR','verified'],
    ['different identity',metadata({tmdb_id:987}),'BR','unconfirmed'],
    ['different year',metadata({year:2023}),'BR','unconfirmed'],
    ['different kind',metadata({media_kind:'tv'}),'BR','unconfirmed'],
    ['different country',metadata(),'US','unconfirmed'],
    ['stale record',metadata({updated_at:'2024-01-01T00:00:00Z'}),'BR','unconfirmed'],
    ['undated record',metadata({updated_at:''}),'BR','unconfirmed'],
    ['future record',metadata({updated_at:new Date(Date.now()+3600000).toISOString()}),'BR','unconfirmed'],
    ['rent-only record',metadata({availability:{source:'tmdb-watch-providers',source_page_url:'https://www.themoviedb.org/movie/123',BR:{rent:['Netflix']}}}),'BR','unconfirmed'],
    ['wrong provider',metadata({availability:{source:'tmdb-watch-providers',source_page_url:'https://www.themoviedb.org/movie/123',BR:{stream:['Prime Video']}}}),'BR','unconfirmed'],
    ['untrusted attribution',metadata({availability:{source:'ai-suggestion',source_page_url:'https://www.themoviedb.org/movie/123',BR:{stream:['Netflix']}}}),'BR','unconfirmed'],
    ['wrong source identity',metadata({availability:{source:'tmdb-watch-providers',source_page_url:'https://www.themoviedb.org/movie/987',BR:{stream:['Netflix']}}}),'BR','unconfirmed']
  ];
  for (const [reason,record,region,expected] of cases) {
    const h = harness();
    const before = JSON.stringify(record);
    h.api.present(Object.freeze(h.selected));
    h.api.setAvailability(h.selected.title,record,region);
    assert.equal(h.w.document.getElementById('ma-result-trust').dataset.availability,expected,reason);
    assert.equal(JSON.stringify(record),before,'the source record stays immutable');
    h.dom.window.close();
  }
});

test('interface language never establishes the visitor country, and an old match cannot lend its proof',() => {
  for(const language of ['en','pt-BR','ja','ar']) {
    const h = harness({language,country:''});
    h.api.present(h.selected);
    h.api.setAvailability(h.selected.title,metadata(),'BR');
    assert.equal(h.w.document.getElementById('ma-result-trust').dataset.availability,'unconfirmed');
    h.w.localStorage.setItem('match_user_country','Brazil');
    h.api.setAvailability(h.selected.title,metadata(),'BR');
    assert.equal(h.w.document.getElementById('ma-result-trust').dataset.availability,'verified');
    h.w.globalMatchTitle = 'A different fixture';
    h.w.currentMatchIdentity = {title:h.w.globalMatchTitle,tmdbId:124,kind:'movie'};
    h.w.document.dispatchEvent(new h.w.CustomEvent('matchapp:newmatch',{detail:h.w.currentMatchIdentity}));
    h.api.present({...h.selected,title:h.w.globalMatchTitle,_tmdbId:124});
    h.api.setAvailability(h.selected.title,metadata(),'BR');
    assert.equal(h.w.document.getElementById('ma-result-trust').dataset.availability,'unconfirmed');
    h.dom.window.close();
  }
});

test('enrichment may arrive before CTA rendering and search destinations never promise immediate playback',async () => {
  const h = harness({href:'https://www.netflix.com/search?q=Verified%20fixture%20title'});
  h.api.setAvailability(h.selected.title,metadata(),'BR');
  h.api.present(h.selected);
  assert.equal(h.action.textContent,'Search on Netflix');
  assert.equal(h.w.document.getElementById('ma-result-trust').dataset.availability,'verified');
  assert.equal(h.action.href,h.original.href);
  h.action.href = 'https://www.primevideo.com/search?phrase=Verified%20fixture%20title';
  await flush();
  assert.equal(h.action.textContent,'Search on Prime Video');
  assert.equal(h.w.document.getElementById('ma-result-trust').dataset.availability,'unconfirmed');
  assert.equal(h.action.onclick,h.original.handler);
  h.action.href = 'https://example.org/a-different-source';
  await flush();
  assert.equal(h.action.textContent,'Open source','an unfamiliar replacement route cannot retain another provider’s label');
  assert.equal(h.action.dataset.resultProvider,undefined);
  h.dom.window.close();
});

test('deceptive provider hosts and bundled channels cannot inherit primary-service availability claims',() => {
  const h = harness({href:'https://netflix.com.example.org/title/12345678'});
  h.api.present(h.selected);
  h.api.setAvailability(h.selected.title,metadata(),'BR');
  assert.equal(h.action.dataset.resultProvider,undefined);
  assert.equal(h.w.document.getElementById('ma-result-trust').dataset.availability,'unconfirmed');
  h.dom.window.close();
  const p = harness({href:'https://www.primevideo.com/detail/0ABCD'});
  p.api.present(p.selected);
  p.api.setAvailability(p.selected.title,metadata({availability:{source:'tmdb-watch-providers',source_page_url:'https://www.themoviedb.org/movie/123',BR:{stream:['HBO Max Amazon Channel']}}}),'BR');
  assert.equal(p.w.document.getElementById('ma-result-trust').dataset.availability,'unconfirmed');
  p.dom.window.close();
});

test('every existing watch/audio platform receives an honest branded route with readable color contrast',() => {
  const app = read('app.js');
  const platformStart = app.indexOf('const PLATFORMS = {') + 'const PLATFORMS = '.length;
  const platformEnd = app.indexOf('\n};',platformStart) + 2;
  const platforms = vm.runInNewContext('(' + app.slice(platformStart,platformEnd) + ')');
  const luminance = hex => {
    const c = hex.replace('#','').match(/../g).map(v=>parseInt(v,16)/255).map(v=>v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
    return .2126*c[0]+.7152*c[1]+.0722*c[2];
  };
  for(const [name,platform] of Object.entries(platforms)) {
    const h = harness({href:platform.search('Verified fixture title')});
    h.api.present(h.selected);
    assert.ok(h.action.dataset.resultProvider,name + ' has an explicit route treatment');
    assert.match(h.action.textContent,/Search on|Open on/,name + ' is not promised instant playback');
    const a = luminance(h.action.style.getPropertyValue('--ma-result-cta-bg'));
    const b = luminance(h.action.style.getPropertyValue('--ma-result-cta-ink'));
    assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05) >= 4.5,name + ' meets normal-text 4.5:1 contrast');
    assert.equal(h.action.href,h.original.href);
    h.dom.window.close();
  }
});

test('all 14 languages have authored trust/action labels and both trust states reserve natural text height',async () => {
  const h = harness();
  const langs = ['en','pt','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
  assert.deepEqual(Object.keys(h.api.labels).sort(),langs.sort());
  for(const language of langs) {
    h.w.MATCH_LANG = language === 'pt' ? 'pt-BR' : language;
    h.api.present(h.selected);
    h.api.setAvailability(h.selected.title,metadata(),'BR');
    h.w.document.dispatchEvent(new h.w.CustomEvent('matchapp:langchange',{detail:{lang:h.w.MATCH_LANG}}));
    await flush();
    const labels = h.api.labels[language];
    assert.equal(Object.keys(labels).length,10);
    for(const value of Object.values(labels)) assert.ok(typeof value === 'string' && value.trim());
    assert.equal(h.action.textContent,labels.watch.replace('{platform}','Netflix'));
    const active = h.w.document.querySelector('.ma-result-trust__state.is-active');
    assert.equal(active.getAttribute('aria-hidden'),'false');
    assert.match(active.textContent,new RegExp(labels.verified.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    const reserved = h.w.document.querySelector('.ma-result-trust__state:not(.is-active)');
    assert.equal(reserved.getAttribute('aria-hidden'),'true');
    assert.equal(reserved.hidden,false);
  }
  const css = read('result-experience.css');
  assert.match(css,/grid-area: 1 \/ 1/);
  assert.match(css,/visibility: hidden/);
  assert.match(css,/min-block-size: 84px/);
  assert.match(css,/min-height: 60px/);
  assert.match(css,/border-radius: 24px/);
  assert.match(css,/padding: 24px/);
  assert.match(css,/prefers-reduced-motion/);
  assert.doesNotMatch(css,/adsbygoogle|\.ad-banner-container|\.poster-stage|#res-poster-img/);
  assert.doesNotMatch(moduleSource,/fetch\(|\.onclick\s*=|replaceChild\(|setInterval\(/);
  h.dom.window.close();
});

test('the existing finite reduced-motion reveal remains intact and Kids never gains the presentation layer',() => {
  const app = read('app.js');
  assert.match(app,/!document\.documentElement\.classList\.contains\('reduce-motion'\) && !matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches && typeof confetti !== 'undefined'/);
  assert.match(app,/particleCount: compactFx \? 20 : 38/);
  assert.match(app,/disableForReducedMotion: true/);
  assert.match(app,/try \{ window\.MatchAppResultExperience\?\.present\?\.\(selected, \{audioPick\}\); \} catch \(_\) \{\}/);
  const h = harness({kids:true});
  assert.equal(h.api,undefined);
  assert.equal(h.w.document.getElementById('ma-result-trust'),null);
  h.dom.window.close();
});
