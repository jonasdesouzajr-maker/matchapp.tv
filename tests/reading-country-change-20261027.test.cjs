'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const {installGuestReservations}=require('./helpers/guest-reservations.cjs');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const book={id:'country-change-reading-fixture',title:'Regional Reading Fixture',author:'Fixture Author',year:1895,
  genres:['classics'],moods:['cozy'],pace:'balanced',length:'medium',era:'classic',access:['paid'],summary:'A test catalogue work.'};
const edition=country=>({apple:{verified:true,provider:'Apple Books',title:book.title,region:country,
  url:'https://books.apple.com/'+country.toLowerCase()+'/audiobook/fixture/id123456'},free:null,searches:[]});

async function boot({format='ebook',client,top=false}={}){
  const dom=new JSDOM('<!doctype html><html lang="en"><body><header class="app-header"></header><main><section id="ebook-matcher-root"></section></main></body></html>',{
    url:'https://matchapp.tv/ebooks/',runScripts:'outside-only'
  });
  const w=dom.window,coordinator=installGuestReservations(w);
  w.MATCH_LANG='en';w.MATCHAPP_EBOOK_CATALOG=[book];
  w.MATCHAPP_TOP_EBOOKS=top?[{...book,market:'GLOBAL',source:'Fixture source',sourceUrl:'https://example.test/reading'}]:[];
  w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLMediaElement.prototype.pause=()=>{};
  w.fetch=async()=>{throw Error('Cover requests are outside country-change regression');};
  w.localStorage.setItem('match_user_country','United States');
  w.localStorage.setItem('match_user_region','California');
  w.localStorage.setItem('match_ebook_criteria_v1',JSON.stringify({format,access:'paid'}));
  if(client)w.supabaseClient=client;
  let debits=0;
  w.checkDailyLimit=async()=>{debits++;return true;};
  w.eval(read('viewer-country.js'));
  w.eval(read('ebooks/ebook-matcher.js'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await settle();
  const root=w.document.getElementById('ebook-matcher-root');
  return {dom,w,root,coordinator,debits:()=>debits,result:()=>root.querySelector('[data-ebook-result]'),
    seen:()=>JSON.parse(w.localStorage.getItem('match_ebook_seen_v1')||'[]')};
}

test('a country change during audiobook verification cancels even if the original country is selected again',async()=>{
  const f=await boot({format:'audiobook'}),started=deferred(),answer=deferred(),regions=[];
  try{
    f.w.MatchAppAudiobooks={verify:async(_book,country)=>{regions.push(country);started.resolve();return answer.promise;}};
    const matching=f.w.MatchAppEbooks.match();await started.promise;
    f.w.MatchAppCountry.setCountry('GB');f.w.MatchAppCountry.setCountry('US');
    answer.resolve(edition('US'));await matching;
    assert.equal(f.debits(),0);assert.equal(f.result().hidden,true);assert.deepEqual(f.seen(),[]);
    assert.equal(f.root.dataset.audioBusy,'0');assert.equal(f.root.querySelector('[data-ebook-match]').disabled,false);
    assert.equal(f.root.querySelector('[data-ebook-note]').hidden,true);
    f.w.MatchAppCountry.setCountry('GB');
    f.w.MatchAppAudiobooks.verify=async(_book,country)=>{regions.push(country);return edition(country);};
    await f.w.MatchAppEbooks.match();
    assert.deepEqual(regions,['US','GB']);assert.equal(f.debits(),1);assert.equal(f.result().hidden,false);
    assert(f.result().querySelector('a.ebook-audio-verified[href^="https://books.apple.com/gb/"]'));
    assert.equal(f.result().querySelector('a.ebook-audio-verified[href^="https://books.apple.com/us/"]'),null);
  }finally{answer.resolve(null);f.dom.window.close();}
});

test('a country change while a guest reservation is pending releases that unused work without a debit',async()=>{
  const f=await boot(),started=deferred(),answer=deferred(),issued=[],released=[];
  try{
    const reserve=f.coordinator.reserve,release=f.coordinator.release;
    f.coordinator.reserve=async request=>{const result=await reserve(request);issued.push(request);started.resolve();await answer.promise;return result;};
    f.coordinator.release=async request=>{released.push(request);return release(request);};
    const matching=f.w.MatchAppEbooks.match();await started.promise;
    f.w.MatchAppCountry.setCountry('GB');answer.resolve();await matching;
    assert.equal(f.debits(),0);assert.equal(f.result().hidden,true);assert.deepEqual(f.seen(),[]);
    assert.equal(released.length,1);assert.equal(released[0].token,issued[0].token);
    assert.equal(f.w.localStorage.getItem('match_user_country'),'United States');
    assert.equal(f.w.localStorage.getItem('match_user_region'),'California');
    f.coordinator.reserve=reserve;
    await f.w.MatchAppEbooks.match();
    assert.equal(f.debits(),1,'An unshown released work remains eligible for the new country');
    assert.equal(f.result().hidden,false);
    assert(f.result().querySelector('a[href^="https://books.apple.com/gb/"]'));
  }finally{answer.resolve();f.dom.window.close();}
});

test('a registered reading reservation retains its owner epoch so country cancellation can release it',async()=>{
  const started=deferred(),answer=deferred(),calls=[];
  const user={id:'country-change-reader',is_anonymous:false};
  let remote={saved:[],disliked:[],seen:[],reserved:[],restored:[]};
  const client={auth:{getSession:async()=>({data:{session:{user}}}),getUser:async()=>({data:{user}})},
    rpc:async(_,{p_action,p_payload})=>{
      calls.push({action:p_action,...p_payload});
      assert.equal(p_payload.ownerId,user.id);
      if(p_action==='reading_claim'){
        remote={...remote,reserved:[p_payload.id]};started.resolve();await answer.promise;
        return {data:{...remote,claimed:true},error:null};
      }
      if(p_action==='reading_release')remote={...remote,reserved:[]};
      else assert.equal(p_action,'reading_list');
      return {data:remote,error:null};
    }};
  const f=await boot({client});
  try{
    const matching=f.w.MatchAppEbooks.match();await started.promise;
    f.w.MatchAppCountry.setCountry('CA');answer.resolve();await matching;
    const claim=calls.find(row=>row.action==='reading_claim'),release=calls.find(row=>row.action==='reading_release');
    assert(claim);assert(release);assert.equal(release.token,claim.token);assert.equal(release.ownerId,user.id);
    assert.deepEqual(remote.reserved,[]);assert.deepEqual(remote.seen,[]);
    assert.equal(f.debits(),0);assert.equal(f.result().hidden,true);
  }finally{answer.resolve();f.dom.window.close();}
});

test('a country change during the shared allowance response marks the old attempt unconfirmed and releases its claim',async()=>{
  const f=await boot(),started=deferred(),answer=deferred(),unconfirmed=[],confirmed=[];
  try{
    f.w.MatchAppTokens={createContext:()=>({surface:'ebook',runId:'country-change-run'}),beforeLookup:async()=>true,
      noteUnconfirmed:async(...args)=>unconfirmed.push(args),confirmResult:(...args)=>confirmed.push(args)};
    f.w.checkDailyLimit=async()=>{started.resolve();return answer.promise;};
    const matching=f.w.MatchAppEbooks.match();await started.promise;
    f.w.MatchAppCountry.setCountry('BR');answer.resolve(true);await matching;
    assert.deepEqual(unconfirmed,[['ebook','country-change-run']]);assert.deepEqual(confirmed,[]);
    assert.deepEqual(f.seen(),[]);assert.equal(f.result().hidden,true);assert.equal(f.root.dataset.audioBusy,'0');
    const retry=await f.w.MatchAppEbooks.claimSuggestion(book.id);
    assert(retry,'The stale result did not permanently consume the book identity');
    await f.w.MatchAppEbooks.releaseSuggestion(retry);
  }finally{answer.resolve(false);f.dom.window.close();}
});

test('country changes hide old reading results, update top retailer links and discard pending saved-audio replies',async()=>{
  const f=await boot({top:true}),started=deferred(),answer=deferred();
  try{
    await f.w.MatchAppEbooks.match();
    assert.equal(f.result().hidden,false);
    assert.equal(new URL(f.root.querySelector('[data-ebook-top] [data-ebook-provider="E-book store"]').href).hostname,'www.amazon.com');
    f.result().querySelector('[data-ebook-save]').click();await settle();
    f.w.MatchAppAudiobooks={verify:async()=>{started.resolve();return answer.promise;}};
    f.root.querySelector('[data-ebook-saved-audio]').click();await started.promise;
    const criteria=f.w.localStorage.getItem('match_ebook_criteria_v1');
    f.w.MatchAppCountry.setCountry('GB');answer.resolve(edition('US'));await settle();
    assert.equal(f.result().hidden,true);
    assert.equal(f.root.querySelector('[data-ebook-saved-audio-result]').textContent,'');
    assert.equal(f.root.querySelector('[data-ebook-saved-audio-result] a'),null);
    assert.equal(new URL(f.root.querySelector('[data-ebook-top] [data-ebook-provider="E-book store"]').href).hostname,'www.amazon.co.uk');
    assert.deepEqual(Array.from(f.w.MatchAppEbooks.saved()),[book.id]);
    assert.equal(f.w.localStorage.getItem('match_ebook_criteria_v1'),criteria);
    assert.equal(f.debits(),1,'Changing country does not create another reading match');
  }finally{answer.resolve(null);f.dom.window.close();}
});
