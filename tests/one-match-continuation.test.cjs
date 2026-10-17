'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const api=require('../one-match-continuation.js');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const source=read('one-match-continuation.js');
const original=new JSDOM(read('index.html'));
const selects=Object.keys(api.fields).map(field=>'<div><label>'+field+'</label>'+original.window.document.getElementById('q-'+field).outerHTML+'</div>').join('');
original.window.close();
const choices={cat:['movie','series'],plat:['Netflix','Disney+'],genre:['Action','Adventure'],mood:['intense and thrilling','epic and adventurous'],vibe:['hidden gem underrated','award winning'],decade:['2020s','2010s'],rating:['teen PG-13','mature adults only R rated']};
const empty=Object.fromEntries(Object.values(api.fields).map(key=>[key,[]]));
const plain=value=>JSON.parse(JSON.stringify(value));

async function fixture({language='en',fragment='',url='https://matchapp.tv/',android=true,native=false,mode='',dismissed=false}={}){
  const w=new JSDOM('<html lang="'+language+'" data-matchapp-mode="'+mode+'"><head></head><body class="page-home"><main><article id="questionnaire-box"><div id="one-match-restore-slot" hidden></div><div class="q-grid">'+selects+'</div></article><article id="result-box" hidden><a id="res-direct-link" href="https://www.netflix.com/search?q=Exact">Existing source</a><div id="one-match-app-slot" hidden></div></article><div id="existing-ad"><ins data-ad-slot="locked"></ins></div></main></body></html>',{url:url+fragment,runScripts:'outside-only',pretendToBeVisual:true}).window;
  Object.defineProperty(w.navigator,'userAgent',{value:android?'Mozilla/5.0 (Linux; Android 16) Chrome/140 Mobile Safari/537.36':'Mozilla/5.0 Macintosh Safari/605.1.15'});
  w.matchMedia=()=>({matches:false});w.MATCH_LANG=language;
  w.localStorage.setItem('match_criteria_v1',JSON.stringify(empty));
  w.localStorage.setItem('match_credits','sentinel-balance');
  if(dismissed)w.localStorage.setItem('matchapp_growth_install_dismissed_v1',String(Date.now()+86400000));
  if(native)w.MatchAppNative={};
  let requests=0,matches=0;
  w.fetch=()=>{requests++;throw Error('Unexpected continuation request');};
  w.triggerMatch=()=>{matches++;};
  w.eval(read('growth-core.js'));
  w.eval(source); // A real head bootstrap consumes the fragment synchronously.
  const afterBootstrapHash=w.location.hash;
  w.eval(read('criteria.js'));
  const setter=w.setMatchCriteria,getter=w.getMatchCriteria;
  if(w.document.readyState==='loading')await new Promise(resolve=>w.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  return {w,setter,getter,afterBootstrapHash,requests:()=>requests,matches:()=>matches};
}

test('bounded criteria round-trip preserves all seven full multi-select arrays',()=>{
  const raw=api.serialize(choices);
  assert.deepEqual(plain(api.parse(raw)),choices);
  const store=new URL(api.playUrl(raw,'pt-BR'));
  assert.equal(store.origin,'https://play.google.com');assert.equal(store.pathname,'/store/apps/details');assert.equal(store.searchParams.get('id'),'com.jonas.papercup');
  const ref=new URLSearchParams(store.searchParams.get('referrer'));
  assert.equal(ref.get('utm_campaign'),'one_match_after_aha');assert.equal(ref.get('lang'),'pt-BR');assert.equal(ref.get('criteria'),raw);
  const resume=new URL(api.appUrl(raw,'pt-BR'));
  assert.equal(resume.origin,'https://matchapp.tv');assert.equal(resume.searchParams.get('app_resume'),'1');
  assert.equal(decodeURIComponent(resume.hash.slice('#ma-continue='.length)),raw);
  const intent=api.intentUrl(raw,'pt-BR');
  assert.ok(intent.startsWith('intent://matchapp.tv/'));assert.ok(intent.includes(';package=com.jonas.papercup;'));
  assert.equal(decodeURIComponent(intent.match(/S\.browser_fallback_url=([^;]+);end$/)[1]),resume.href);
  assert.deepEqual(plain(api.parse(api.serialize(empty))),empty);
});

test('unknown keys, duplicate fields, URL/data payloads and oversized choices fail closed',()=>{
  for(const raw of ['','category=movie&category=series','url=https%3A%2F%2Fevil.example','platform=https%3A%2F%2Fevil.example','platform=%2F%2Fevil.example','category=data%3Atext%2Fhtml','category=%3Cscript%3E','category=%','category=%00','category=movie%7Cmovie','category=movie%7C','category='+('a'.repeat(65)),'category='+Array.from({length:41},(_,i)=>'x'+i).join('|'),'category='+('a'.repeat(2400))]){
    assert.equal(api.parse(raw),null,raw.slice(0,90));
  }
  assert.equal(api.serialize({...choices,mood:[{toString:()=> 'funny'}]}),'');
  assert.equal(api.serialize({...choices,mood:['javascript:alert(1)']}),'');
  assert.throws(()=>api.playUrl('url=https%3A%2F%2Fevil.example','en'));
  assert.throws(()=>api.intentUrl('category=%3Cscript%3E','en'));
});

test('arrival removes only the continuation fragment before analytics and waits for explicit restore',async()=>{
  const raw=api.serialize(choices),f=await fixture({fragment:'#ma-continue='+encodeURIComponent(raw)});
  try{
    const d=f.w.document;
    assert.equal(f.afterBootstrapHash,'');
    assert.deepEqual(plain(f.w.getMatchCriteria()),empty);
    assert.equal(f.w.setMatchCriteria,f.setter);assert.equal(f.w.getMatchCriteria,f.getter);
    const restore=d.querySelector('#one-match-restore-slot button');assert.ok(restore);
    restore.click();
    assert.deepEqual(plain(f.w.getMatchCriteria()),choices);assert.equal(restore.disabled,true);
    assert.equal(d.querySelector('#one-match-restore-slot [role=status]').textContent,api.rows.en[8]);
    restore.click();assert.deepEqual(plain(f.w.getMatchCriteria()),choices);
    assert.equal(f.requests(),0);assert.equal(f.matches(),0);assert.equal(f.w.localStorage.getItem('match_credits'),'sentinel-balance');
  }finally{f.w.close();}
  const other=await fixture({fragment:'#questionnaire-box'});try{assert.equal(other.afterBootstrapHash,'#questionnaire-box');assert.equal(other.w.document.querySelector('#one-match-restore-slot').hidden,true);}finally{other.w.close();}
  const invalid=await fixture({fragment:'#ma-continue='+encodeURIComponent('destination=https://evil.example')});try{assert.equal(invalid.afterBootstrapHash,'');assert.equal(invalid.w.document.querySelector('#one-match-restore-slot').hidden,true);}finally{invalid.w.close();}
});

test('unavailable or incompatible incoming filters keep the existing criteria',async()=>{
  const unavailable=await fixture({fragment:'#ma-continue='+encodeURIComponent('platform=Retired+Service')});
  try{unavailable.w.document.querySelector('#one-match-restore-slot button').click();assert.deepEqual(plain(unavailable.w.getMatchCriteria()),empty);assert.equal(unavailable.w.document.querySelector('[role=status]').textContent,api.rows.en[9]);}finally{unavailable.w.close();}
  const f=await fixture({fragment:'#ma-continue='+encodeURIComponent(api.serialize(choices))});
  try{
    // Model a public-setter policy rejecting a once-supported combination.
    const originalSet=f.w.setMatchCriteria;
    f.w.setMatchCriteria=patch=>originalSet({...patch,genre:patch.genre?.slice(0,1)});
    f.w.document.querySelector('#one-match-restore-slot button').click();
    assert.deepEqual(plain(f.w.getMatchCriteria()),empty);
    assert.equal(f.w.document.querySelector('[role=status]').textContent,api.rows.en[9]);
    assert.equal(f.matches(),0);assert.equal(f.requests(),0);
  }finally{f.w.close();}
});

test('one reserved Android invitation follows a useful result and preserves existing source handlers',async()=>{
  const f=await fixture();
  try{
    const w=f.w,d=w.document,slot=d.getElementById('one-match-app-slot'),sourceLink=d.getElementById('res-direct-link'),ad=d.getElementById('existing-ad');
    let clicks=0;sourceLink.addEventListener('click',event=>{event.preventDefault();clicks++;});
    const oldAd=ad.outerHTML,href=sourceLink.href;
    assert.equal(slot.hidden,false);assert.equal(slot.children.length,0,'space is reserved without an invitation before a result');
    w.setMatchCriteria(choices);
    d.dispatchEvent(new w.CustomEvent('matchapp:newmatch'));
    assert.equal(slot.querySelectorAll('section').length,1);
    const store=slot.querySelector('.ma-continuation-primary');
    assert.deepEqual(plain(api.parse(new URLSearchParams(new URL(store.href).searchParams.get('referrer')).get('criteria'))),choices);
    d.dispatchEvent(new w.CustomEvent('matchapp:newmatch'));assert.equal(slot.querySelectorAll('section').length,1);
    sourceLink.click();assert.equal(clicks,1);assert.equal(sourceLink.href,href);assert.equal(d.getElementById('res-direct-link'),sourceLink);assert.equal(ad.outerHTML,oldAd);
    slot.querySelector('button').click();assert.equal(slot.querySelectorAll('a').length,0);
    d.dispatchEvent(new w.CustomEvent('matchapp:newmatch'));assert.equal(slot.querySelectorAll('a').length,0);
    w.MATCH_LANG='de';d.dispatchEvent(new w.CustomEvent('matchapp:langchange'));assert.equal(slot.querySelector('p').textContent,api.rows.de[4]);
    assert.equal(f.requests(),0);assert.equal(f.matches(),0);
  }finally{f.w.close();}
});

test('all fourteen chosen languages update invitation, restoration and status copy',async()=>{
  assert.equal(api.languages.length,14);
  const f=await fixture({fragment:'#ma-continue='+encodeURIComponent(api.serialize(choices))});
  try{
    const w=f.w,d=w.document;
    for(const lang of api.languages){
      assert.equal(api.rows[lang].length,10);assert.ok(api.rows[lang].every(text=>typeof text==='string'&&text.length));
      w.MATCH_LANG=lang;d.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
      const card=d.querySelector('#one-match-restore-slot section');assert.equal(card.lang,lang);assert.equal(card.dir,lang==='ar'?'rtl':'ltr');assert.equal(card.querySelector('button').textContent,api.rows[lang][7]);
    }
    d.querySelector('#one-match-restore-slot button').click();
    d.dispatchEvent(new w.CustomEvent('matchapp:newmatch'));
    for(const lang of api.languages){
      w.MATCH_LANG=lang;d.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
      assert.equal(d.querySelector('#one-match-restore-slot [role=status]').textContent,api.rows[lang][8]);
      assert.equal(d.querySelector('#one-match-app-slot h3').textContent,api.rows[lang][0]);
      assert.equal(new URLSearchParams(new URL(d.querySelector('#one-match-app-slot .ma-continuation-primary').href).searchParams.get('referrer')).get('lang'),lang);
    }
  }finally{f.w.close();}
});

test('desktop, installed shells, dismissed invitations and Kids never receive an app invitation',async()=>{
  for(const config of [{android:false},{native:true},{dismissed:true},{url:'https://matchapp.tv/kids/'},{mode:'kids'}]){
    const f=await fixture(config);try{f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:newmatch'));const slot=f.w.document.getElementById('one-match-app-slot');assert.equal(slot.hidden,true);assert.equal(slot.children.length,0);}finally{f.w.close();}
  }
});

test('production includes keep the continuation bootstrap ahead of GTM and reserve owned slots',()=>{
  const html=read('index.html'),doc=new JSDOM(html).window.document;
  const script=doc.querySelector('script[src^="/one-match-continuation.js"]');assert.ok(script&&!script.defer&&!script.async);
  assert.ok(html.indexOf('/one-match-continuation.js')<html.indexOf('<!-- Google Tag Manager -->'));
  assert.ok(html.indexOf('/growth-core.js')<html.indexOf('/one-match-continuation.js'));
  assert.ok(doc.querySelector('#questionnaire-box #one-match-restore-slot[hidden]'));
  assert.ok(doc.querySelector('#result-box #one-match-app-slot[hidden]'));
  assert.equal(doc.querySelectorAll('script[src^="/result-experience.js"]').length,1);
  assert.ok(read('ebooks/index.html').includes('/result-experience.css'));
  assert.ok(!read('kids/index.html').includes('one-match-continuation'));
  assert.match(read('one-match-continuation.css'),/#one-match-app-slot\{min-block-size:300px/);
  doc.defaultView.close();
});
