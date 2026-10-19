'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {collectReport,FEEDS}=require('../tools/sports-partner-feed.js');
const NOW=Date.parse('2026-10-19T17:30:00Z');
const atom=title=>'<feed><entry><title>'+title+'</title><link rel="alternate" href="https://theconversation.com/research-123456"/>'+
 '<published>2026-10-19T10:00:00Z</published></entry></feed>';

async function scenario(respond){
 const requests=[],origins=new Map(),cancelled=[];
 const redirect=(location,{fail=false}={})=>({status:302,headers:new Headers(location===undefined?{}:{location}),
  body:{async cancel(){cancelled.push(location);if(fail)throw Error('Response cleanup failed');}}});
 const result=await collectReport(async(url,options)=>{
  assert.equal(options.redirect,'manual');
  assert.equal(options.signal.aborted,false);
  assert.ok(FEEDS.some(feed=>feed.url===url),'only exact approved feeds may be requested');
  if(!origins.has(options.signal))origins.set(options.signal,url);
  requests.push({url,signal:options.signal});
  if(origins.get(options.signal)===FEEDS[0].url)return respond({url,options,redirect,cancelled,requests});
  return {ok:true,status:200,url,text:async()=>'<feed></feed>'};
 },NOW);
 assert.equal(origins.size,FEEDS.length);
 assert.ok([...origins.keys()].every(signal=>signal.aborted),'success and failure must release request resources');
 return {result,requests,cancelled,check:result.checks.find(check=>check.url===FEEDS[0].url)};
}

test('approved feed redirects cancel their bodies before fetching the next hop and preserve dated sports',async()=>{
 const final=FEEDS.find(feed=>feed.category==='general').url;
 const {result,check,cancelled,requests}=await scenario(({url,redirect,cancelled})=>{
  if(url===FEEDS[0].url)return redirect(final);
  assert.deepEqual(cancelled,[final],'discard redirect response before requesting its destination');
  return {ok:true,status:200,url,text:async()=>atom('Tennis participation research across generations')};
 });
 assert.equal(check.ok,true);assert.equal(requests.length,FEEDS.length+1);
 assert.deepEqual(cancelled,[final]);assert.equal(result.items.length,1);
 assert.equal(result.items[0].published_at,'2026-10-19T10:00:00.000Z');
 assert.equal(result.items[0].source,'The Conversation');assert.equal(result.items[0].image,null);
});

for(const [name,location] of [
 ['missing',undefined],['malformed','https://[invalid'],
 ['unapproved host','https://unapproved.example/feed'],
 ['HTTP downgrade','http://theconversation.com/au/articles.atom'],
 ['unapproved path','https://theconversation.com/unapproved.atom']
])test(name+' feed redirects fail before another request and cancel their response body',async()=>{
 const {result,check,cancelled,requests}=await scenario(({redirect})=>redirect(location));
 assert.equal(check.ok,false);assert.equal(requests.length,FEEDS.length);
 assert.equal(cancelled.length,1);assert.deepEqual(result.items,[]);
});

test('redirect loops retain the three-hop cap and cancel the final rejected response',async()=>{
 const {check,cancelled,requests}=await scenario(({redirect})=>redirect(FEEDS[0].url));
 assert.equal(check.ok,false);assert.match(check.error,/Unapproved feed redirect/);
 assert.equal(requests.length,FEEDS.length+3);assert.equal(cancelled.length,4);
});

test('a redirect cancellation failure aborts the request and prevents another hop',async()=>{
 const {check,cancelled,requests}=await scenario(({redirect})=>redirect(FEEDS[1].url,{fail:true}));
 assert.equal(check.ok,false);assert.match(check.error,/Response cleanup failed/);
 assert.equal(cancelled.length,1);assert.equal(requests.length,FEEDS.length);
});

test('HTTP error bodies are cancelled without consumption and leave a failed source check',async()=>{
 let cancelled=0,read=0;
 const {check}=await scenario(()=>({ok:false,status:503,
  body:{async cancel(){cancelled++;}},text:async()=>{read++;return 'Unavailable';}}));
 assert.equal(check.ok,false);assert.match(check.error,/HTTP 503/);
 assert.equal(cancelled,1);assert.equal(read,0);
});

test('HTTP error cleanup failures remain failures while aborting remaining request resources',async()=>{
 let cancelled=0;
 const {check}=await scenario(()=>({ok:false,status:503,
  body:{async cancel(){cancelled++;throw Error('Response cleanup failed');}}}));
 assert.equal(check.ok,false);assert.match(check.error,/Response cleanup failed/);assert.equal(cancelled,1);
});

test('invalid final feed bodies remain failed checks with their request resources released',async()=>{
 const {check,result}=await scenario(()=>({ok:true,status:200,text:async()=>'<html>Service unavailable</html>'}));
 assert.equal(check.ok,false);assert.match(check.error,/Invalid RSS\/Atom response/);assert.deepEqual(result.items,[]);
});

test('body read failures abort the request without accepting partial feed data',async()=>{
 const {check,result}=await scenario(()=>({ok:true,status:200,text:async()=>{throw Error('Body connection reset');}}));
 assert.equal(check.ok,false);assert.match(check.error,/Body connection reset/);assert.deepEqual(result.items,[]);
});

test('transport errors release request resources without treating failure as an empty success',async()=>{
 const {check,result}=await scenario(()=>{throw Error('Connection unavailable');});
 assert.equal(check.ok,false);assert.match(check.error,/Connection unavailable/);assert.deepEqual(result.items,[]);
});

test('an unapproved final response URL fails even when its XML contains a dated sports headline',async()=>{
 const {check,result}=await scenario(()=>({ok:true,status:200,url:'https://unapproved.example/feed',
  text:async()=>atom('Tennis participation research across generations')}));
 assert.equal(check.ok,false);assert.match(check.error,/Unapproved feed redirect/);assert.deepEqual(result.items,[]);
});

test('sport-topic redirects to general feeds cannot admit unrelated general-news headlines',async()=>{
 const final=FEEDS.find(feed=>feed.category==='general').url;
 const {check,result,cancelled}=await scenario(({url,redirect})=>url===FEEDS[0].url?redirect(final):
  {ok:true,status:200,url,text:async()=>atom('Housing research changes city planning')});
 assert.equal(check.ok,true);assert.equal(check.items,0);assert.deepEqual(result.items,[]);assert.deepEqual(cancelled,[final]);
});

test('a final approved sport-topic feed retains its explicit topic privileges',async()=>{
 const final=FEEDS[1].url;
 const {check,result}=await scenario(({url,redirect})=>url===FEEDS[0].url?redirect(final):
  {ok:true,status:200,url,text:async()=>atom('Research explains recovery across generations')});
 assert.equal(check.ok,true);assert.equal(result.items.length,1);
 assert.equal(result.items[0].title,'Research explains recovery across generations');
});
