'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('RapidAPI normalizer requires exact TMDB identity, supported country and safe deep links',async()=>{
  const {normalizeStreaming,verifiedServiceUrl}=await import('../supabase/functions/rapidapi-streaming/streaming-core.mjs');
  const query={tmdbId:238,kind:'movie',country:'BR'};
  const record={tmdbId:'movie/238',showType:'movie',streamingOptions:{br:[
    {service:{id:'netflix',name:'Netflix'},type:'subscription',link:'https://www.netflix.com/title/123'},
    {service:{id:'netflix',name:'Netflix'},type:'subscription',link:'https://www.netflix.com/title/123'},
    {service:{id:'evil',name:'Unknown'},type:'free',link:'https://bad.example/steal'},
    {service:{id:'netflix',name:'Netflix'},type:'rent',link:'https://netflix.com.evil.example/path'}
  ]}};
  const got=normalizeStreaming(record,query);
  assert.equal(got.source,'Streaming Availability');
  assert.equal(got.country,'BR');
  assert.equal(got.providers.length,3);
  assert.equal(got.providers[0].link,'https://www.netflix.com/title/123');
  assert.equal(got.providers[1].link,'');
  assert.equal(got.providers[2].link,'');
  assert.equal(normalizeStreaming({...record,tmdbId:'movie/900'},query),null);
  assert.equal(normalizeStreaming({...record,showType:'series'},query),null);
  assert.equal(normalizeStreaming({...record,streamingOptions:{us:record.streamingOptions.br}},query),null);
  assert.equal(verifiedServiceUrl('netflix','javascript:alert(1)'),'');
  assert.equal(verifiedServiceUrl('netflix','https://netflix.com.evil.example/path'),'');
});
test('rapidapi display does not replace Matches, is safe against stale responses and clears on dismiss',async()=>{
  const dom=new JSDOM('<article id="result-box"><h2 id="res-title">First</h2><div id="matchapp-main-availability"></div><button id="result-dismiss"></button></article>',
    {url:'https://matchapp.tv/',runScripts:'outside-only'});
  const w=dom.window,calls=[];
  w.supabaseClient={functions:{invoke:(_name,args)=>new Promise(resolve=>calls.push({args,resolve}))}};
  w.eval(fs.readFileSync('rapidapi-streaming.js','utf8'));
  const dispatch=(title,tmdbId)=>w.document.dispatchEvent(new w.CustomEvent('matchapp:adult-metadata',
    {detail:{title,tmdbId,kind:'movie',country:'BR'}}));
  dispatch('First',1);
  w.document.getElementById('res-title').textContent='Second';
  w.document.dispatchEvent(new w.CustomEvent('matchapp:newmatch'));
  dispatch('Second',238);
  assert.equal(calls.length,2);
  calls[1].resolve({data:{country:'BR',kind:'movie',verifiedTmdbId:238,providers:[
    {name:'Netflix',type:'subscription',link:'https://www.netflix.com/title/123'}]}});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.match(w.document.getElementById('matchapp-rapidapi-links')?.textContent||'',/Netflix/);
  calls[0].resolve({data:{country:'BR',kind:'movie',verifiedTmdbId:1,providers:[
    {name:'Stale provider',type:'free',link:''}]}});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.doesNotMatch(w.document.getElementById('matchapp-rapidapi-links')?.textContent||'',/Stale provider/);
  w.document.getElementById('result-dismiss').click();
  assert.equal(w.document.getElementById('matchapp-rapidapi-links').hidden,true);
  dom.window.close();
});
test('backend protects the secret, stays off until plan confirmation and has a rate limiter',()=>{
  const backend=fs.readFileSync('supabase/functions/rapidapi-streaming/index.ts','utf8');
  const client=fs.readFileSync('rapidapi-streaming.js','utf8');
  const html=fs.readFileSync('index.html','utf8');
  assert.match(backend,/Deno.env.get\('RAPIDAPI'\)/);
  assert.match(backend,/RAPIDAPI_STREAMING_ENABLED/);
  assert.match(backend,/check_ai_rate_limit/);
  assert.doesNotMatch(client+html,/RAPIDAPI_STREAMING_ENABLED|X-RapidAPI-Key/);
  assert.match(html,/rapidapi-streaming.js/);
  assert.match(fs.readFileSync('supabase/config.toml','utf8'),/\[functions.rapidapi-streaming\][\s\S]*verify_jwt = false/);
});
