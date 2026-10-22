'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sourceRoot=path.resolve(process.env.MATCHAPP_AUDIO_COVER_SOURCE_ROOT||path.join(__dirname,'..'));
// Reuse the unchanged behavioral fixture, which executes the actual renderer,
// exact-source verifier and metadata owner. No live image or provider is fetched.
const existing=fs.readFileSync(path.join(sourceRoot,'tests/ebook-cover-handoff.test.cjs'),'utf8');
const firstTest=existing.indexOf("test('");
assert(firstTest>0,'the existing cover fixture must precede its first test');
const sandbox={require,__dirname:path.join(sourceRoot,'tests'),URL,URLSearchParams,AbortController,EventTarget,Event};
vm.runInNewContext(existing.slice(0,firstTest)+'\nglobalThis.coverFixture={fixture,flush};',sandbox,{filename:'existing-cover-fixture.cjs'});
const {fixture,flush}=sandbox.coverFixture;
const original='https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/fixture/fictional-audio.jpg/100x100bb.jpg?source=exact-edition';
const sharp=original.replace('/100x100bb.jpg','/600x600bb.jpg');
const preview=original.replace('/100x100bb.jpg','/300x300bb.jpg');
const sources=f=>f.preloads.slice(1).map(node=>node.writes[0]);

test('audio rescue starts the original after 4.5s, waits for decode and still upgrades the exact edition',async()=>{
 const f=fixture();await f.audio(original);
 await f.clock.advance(4499);assert.equal(f.probe(original),undefined);
 assert.equal(f.img.writes.length,0);assert.equal(f.fallback.hidden,false);
 await f.clock.advance(1);
 const source=f.probe(original);assert(source,'the provider original must get a bounded opportunity while derived requests remain pending');
 assert.equal(source.writeTimes[0].at,4500);assert.equal(source.loading,'eager');
 assert.equal(f.probe(sharp).src,sharp);assert.equal(f.probe(preview).src,preview);
 let decoded;source.decode=()=>new Promise(resolve=>{decoded=resolve});
 const staleOriginal=source.onload;source.load();await flush();
 assert.equal(f.img.writes.length,0,'available bytes cannot paint before successful decode');
 await f.clock.advance(100);decoded();await flush();f.ready();assert.equal(f.img.src,original);
 assert.equal(f.probe(sharp).src,sharp);assert.equal(f.probe(preview).src,preview);
 await f.clock.advance(500);f.probe(preview).load();await flush();f.ready();assert.equal(f.img.src,preview);
 await f.clock.advance(2000);f.probe(sharp).load();await flush();await f.done();f.ready();
 staleOriginal();await flush();assert.equal(f.img.src,sharp,'late original callbacks cannot downgrade sharper pixels');
 assert.equal(JSON.stringify(f.img.writes),JSON.stringify([original,preview,sharp]));
 assert.equal(f.img.dataset.bookCoverVerified,sharp);assert.equal(f.timers.size,0);assert.equal(f.requests.length,0);
});

test('a visible audio preview suppresses original rescue and survives the existing deadline',async()=>{
 const f=fixture();await f.audio(original);await f.clock.advance(3200);
 f.probe(preview).load();await flush();f.ready();await f.clock.advance(1300);
 assert.equal(f.probe(original),undefined);assert.equal(f.probe(sharp).src,sharp);
 await f.clock.advance(5000);await f.done();f.ready();
 assert.equal(f.img.src,preview);assert.equal(f.probe(original),undefined);assert.equal(f.timers.size,0);
});

test('early explicit rendition failures and the grace timer never duplicate the original request',async()=>{
 const f=fixture();await f.audio(original);await f.clock.advance(100);
 f.probe(sharp).fail();await flush();f.probe(preview).fail();await flush();
 assert.equal(f.probe(original).writeTimes[0].at,100);
 await f.clock.advance(4400);assert.equal(sources(f).filter(src=>src===original).length,1);
 f.probe(original).load();await flush();await f.done();f.ready();
 assert.equal(f.img.src,original);assert.equal(f.timers.size,0);assert.equal(f.requests.length,0);
});

test('failed original decoding leaves higher audio renditions alive without painting invalid pixels',async()=>{
 const f=fixture();await f.audio(original);await f.clock.advance(4500);
 const source=f.probe(original);assert(source);source.decode=()=>Promise.reject(Error('fixture decode failure'));
 source.load();await flush();assert.equal(f.img.writes.length,0);assert.equal(f.fallback.hidden,false);
 assert.equal(f.probe(sharp).src,sharp);assert.equal(f.probe(preview).src,preview);
 await f.clock.advance(1000);f.probe(sharp).load();await flush();await f.done();f.ready();
 assert.equal(f.img.src,sharp);assert.equal(sources(f).filter(src=>src===original).length,1);assert.equal(f.timers.size,0);
});

test('audio rescue does not request or paint after disconnection or identity replacement',async()=>{
 for(const replaced of [false,true]){
  const f=fixture();await f.audio(original);const staleLoad=f.probe(sharp).onload;
  await f.clock.advance(4000);
  if(replaced)f.replace({title:'Another fictional title',author:'Example Writer'});else f.img.isConnected=false;
  await f.clock.advance(500);await f.done();staleLoad();await flush();
  assert.equal(f.probe(original),undefined);assert.equal(f.img.writes.length,0);
  assert.equal(f.probe(sharp).src,'');assert.equal(f.probe(preview).src,'');assert.equal(f.timers.size,0);
 }
});

test('a newer audio source prevents obsolete recovery and owns the remaining work',async()=>{
 const f=fixture();await f.audio(original);const staleLoad=f.probe(sharp).onload;
 await f.clock.advance(4000);
 const next=original.replace('fictional-audio.jpg','another-fictional-audio.jpg'),nextSharp=next.replace('/100x100bb.jpg','/600x600bb.jpg');
 await f.audio(next);await f.clock.advance(500);staleLoad();await flush();
 assert.equal(f.probe(original),undefined);assert.equal(f.probe(next),undefined);assert.equal(f.img.writes.length,0);
 f.probe(nextSharp).load();await flush();await f.done();f.ready();
 assert.equal(f.img.src,nextSharp);assert.equal(f.timers.size,0);
});

test('restarting the same exact audio source cancels retired probes and their deadline',async()=>{
 const f=fixture();await f.audio(original);await f.clock.advance(4500);
 const retiredSource=f.probe(original);assert(retiredSource);const staleLoad=retiredSource.onload;
 await f.audio(original);assert.equal(retiredSource.src,'');
 staleLoad();await flush();assert.equal(f.img.writes.length,0);
 const currentSharp=f.probe(sharp);f.probe(preview).load();await flush();f.ready();
 await f.clock.advance(5000);
 assert.equal(currentSharp.src,sharp,'the retired run deadline cannot cancel current sharper work');
 assert.equal(sources(f).filter(src=>src===original).length,1,'the current preview suppresses any second rescue');
 currentSharp.load();await flush();await f.done();f.ready();assert.equal(f.img.src,sharp);assert.equal(f.timers.size,0);
});

test('all pending audio renditions including rescue still expire at 9.5s with no late paint',async()=>{
 const f=fixture();await f.audio(original);await f.clock.advance(4500);
 const source=f.probe(original);assert(source);const staleLoad=source.onload;
 await f.clock.advance(5000);await f.done();staleLoad();await flush();
 assert.equal(f.now(),9500);assert.equal(f.img.writes.length,0);assert.equal(f.img.hidden,true);assert.equal(f.fallback.hidden,false);
 assert.equal(source.src,'');assert.equal(f.probe(sharp).src,'');assert.equal(f.probe(preview).src,'');
 assert.equal(f.timers.size,0);assert.equal(f.requests.length,0);
});

test('default ebook rendering and original-only audio retain their existing budgets without rescue',async()=>{
 const ebook=fixture();await ebook.source(original);await ebook.clock.advance(4500);
 assert.equal(ebook.probe(original),undefined);assert.equal(ebook.preloads.length,3);
 await ebook.clock.advance(5000);await ebook.done();assert.equal(ebook.timers.size,0);
 const audio=fixture();await audio.audio(sharp);assert.equal(audio.preloads.length,2);
 assert.equal(audio.delays.includes(4500),false);assert.equal(audio.delays.includes(7000),true);
 await audio.clock.advance(7000);await audio.done();assert.equal(audio.timers.size,0);assert.equal(audio.img.writes.length,0);
});
