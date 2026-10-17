const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const api=require('../sponsored-match.js');
const source=fs.readFileSync(path.join(__dirname,'../sponsored-match.js'),'utf8');
const now=Date.now(),url='https://www.netflix.com/browse';
// A test-only fixture, never inserted into either published registry.
const record={id:'sponsor_test_only',contracted:true,reviewed:true,reviewReference:'test fixture only',sponsor:'Test fixture',countries:['BR'],url,
  startsAt:new Date(now-86400000).toISOString(),expiresAt:new Date(now+86400000).toISOString(),reviewedAt:new Date(now-1000).toISOString(),
  copy:Object.fromEntries(api.languages.map(lang=>[lang,{title:'Fixture '+lang,body:'Fixture copy',cta:'Fixture action',terms:'Fixture terms'}]))};

test('no real campaign means no element, whitespace, network request or original event change',()=>{
  assert.equal(api.campaigns.length,0);assert.equal(api.destinations.length,0);assert.ok(Object.isFrozen(api.campaigns));assert.ok(Object.isFrozen(api.destinations));
  const w=new JSDOM('<html lang="en"><body><main id="result-box" hidden style="display:none"><a id="organic" href="https://www.netflix.com/title/123">Existing title</a><button id="share">Share</button></main><ins data-ad-slot="2595698117"></ins></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'}).window;
  try{
    const organic=w.document.getElementById('organic');const handler=()=>{};organic.onclick=handler;
    const before=w.document.body.innerHTML;let calls=0;w.fetch=()=>{calls++;throw Error('must not request');};
    w.MatchAppTokens={enabled:true,hasValue:true};w.localStorage.setItem('match_user_region','BR');
    w.eval(source);assert.equal(w.MatchAppSponsoredMatch.present(),false);
    assert.equal(w.document.body.innerHTML,before);assert.equal(organic.onclick,handler);assert.equal(calls,0);
    assert.equal(w.document.querySelector('.ma-sponsored-match'),null);
  }finally{w.close();}
});

test('campaign eligibility requires explicit market, exact approved URL, fresh review, active dates and all copy',()=>{
  assert.equal(api.eligible(record,'BR','pt-BR',now,[url]),true);
  for(const [patch,market,approved] of [
    [{},'US',[url]], [{},'',[url]], [{},'BR',[]], [{reviewed:false},'BR',[url]], [{contracted:false},'BR',[url]],
    [{reviewedAt:new Date(now-8*86400000).toISOString()},'BR',[url]],
    [{reviewedAt:new Date(now+1000).toISOString()},'BR',[url]],
    [{expiresAt:new Date(now-1).toISOString()},'BR',[url]],
    [{startsAt:new Date(now+1000).toISOString()},'BR',[url]],
    [{url:url+'?new_tracking=unreviewed'},'BR',[url]],
    [{copy:{...record.copy,ar:{...record.copy.ar,terms:''}}},'BR',[url]],
    [{countries:['*']},'BR',[url]]
  ])assert.equal(api.eligible({...record,...patch},market,'en',now,approved),false,JSON.stringify(patch));
  for(const link of ['http://www.netflix.com/browse','https://user@www.netflix.com/browse','https://www.netflix.com:8443/browse','https://www.netflix.com/browse#unexpected','javascript:alert(1)'])assert.equal(api.destination(link,[link]),'');
});

test('viewer country comes from saved user choice, never locale or the recommended title origin',()=>{
  const w=new JSDOM('<html lang="pt-BR"></html>',{url:'https://matchapp.tv/'}).window;
  try{
    w.MATCH_LANG='pt-BR';w.currentMatchIdentity={country:'Brazil',countryCode:'BR'};assert.equal(api.country(w),'');
    w.MatchAppGeography={resolveCountry:value=>value==='Brazil'?['Brazil','BR']:null};
    w.localStorage.setItem('match_user_region','São Paulo');w.localStorage.setItem('match_user_country','Brazil');assert.equal(api.country(w),'BR');
    w.localStorage.setItem('match_user_region','IN');assert.equal(api.country(w),'IN');
    w.localStorage.clear();assert.equal(api.country(w),'');
  }finally{w.close();}
});

test('first value and server readiness are required; Pro and all existing ad-free eligibility suppress sponsorship',()=>{
  const w=new JSDOM('',{url:'https://matchapp.tv/'}).window;
  try{
    assert.equal(api.suppressed(w),true);w.MatchAppTokens={enabled:true,hasValue:false};assert.equal(api.suppressed(w),true);
    w.MatchAppTokens.hasValue=true;assert.equal(api.suppressed(w),false);
    for(const fn of ['isPro','isAdFree']){w.MatchAppTokens[fn]=()=>true;assert.equal(api.suppressed(w),true);delete w.MatchAppTokens[fn];}
    w.MatchAppPro={isEntitled:()=>true};assert.equal(api.suppressed(w),true);delete w.MatchAppPro;
    w.localStorage.setItem('match_ad_free','true');assert.equal(api.suppressed(w),true);w.localStorage.clear();
    w.localStorage.setItem('match_profile',JSON.stringify({is_ad_free:true}));assert.equal(api.suppressed(w),true);
  }finally{w.close();}
});

test('sponsorship is inserted only before reveal, has authored attribution, and never touches Kids',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
  const call=app.indexOf('window.MatchAppSponsoredMatch?.present?.()');
  assert.ok(call>0&&call<app.indexOf("resultBox.style.display = 'block';",call));
  assert.ok(!source.includes('fetch('));assert.ok(!source.includes('setTimeout('));assert.ok(!source.includes('MutationObserver'));
  assert.equal(api.languages.length,14);for(const lang of api.languages)assert.ok(api.labels[lang]);
  const w=new JSDOM('',{url:'https://matchapp.tv/kids/'}).window;try{assert.equal(api.boot(w),null);}finally{w.close();}
  const css=fs.readFileSync(path.join(__dirname,'../sponsored-match.css'),'utf8');assert.match(css,/min-height: 340px/);assert.match(css,/border-radius: 24px/);assert.match(css,/prefers-reduced-motion: reduce/);
});
