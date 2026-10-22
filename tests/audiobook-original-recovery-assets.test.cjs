'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),version='20261022-1';
const matcherBefore='/ebooks/ebook-matcher.js?v=20261011-meta1&tokens=20261017-1&reliability=20261018-1&cover=20261019-handoff1&lifetime=20261019-1&coverload=20261019-eager1&art=20261020-source1&locale=20261020-books14-1&audioart=20261020-exact1&ebookart=20261020-renditions1&fastart=20261020-1&androidqa=20261021-1';
const lazyBefore='/ebooks/ebook-matcher.js?v=20261011-meta1&reliability=20261018-1&lifetime=20261019-1&art=20261020-source1&locale=20261020-books14-1&ebookart=20261020-renditions1&fastart=20261020-1';
const readingBefore='/ebooks/reading-ai.js?v=20260926-publishericon2&language=20260930-fix2&reliability=20261018-1&lifetime=20261019-1&art=20261020-source1&locale=20261020-books14-1&ebookart=20261020-renditions1&fastart=20261020-1';
const scripts=html=>[...html.matchAll(/<script\b[^>]*\bsrc=(['"])([^'"]+)\1/gi)].map(match=>match[2].replace(/&amp;/g,'&'));
const finalizer=read('tools/finalize-brand.js'),start=finalizer.indexOf('function withQueryParams('),end=finalizer.indexOf('function name(',start);
assert(start>=0&&end>start,'actual URL normalizer must be available');
const normalizer=vm.createContext({URLSearchParams});vm.runInContext(finalizer.slice(start,end)+'\nthis.normalize=referenceRuntimeAssetURL;',normalizer);

test('all four reading loader emissions preserve their complete prior URLs and add only the audio cover key',()=>{
 for(const file of ['index.html','ebooks/index.html']){
  const urls=scripts(read(file)).filter(url=>url.split('?')[0]==='/ebooks/ebook-matcher.js');
  assert.deepEqual(urls,[matcherBefore+'&audiocover='+version],file);
 }
 const reading=scripts(read('discover.html')).filter(url=>url.split('?')[0]==='/ebooks/reading-ai.js');
 assert.deepEqual(reading,[readingBefore+'&audiocover='+version]);
 const source=read('ebooks/reading-ai.js'),lazy=[...source.matchAll(/script\.src='([^']*\/ebooks\/ebook-matcher\.js\?[^']+)'/g)];
 assert.equal(lazy.length,1);assert.equal(lazy[0][1],lazyBefore+'&audiocover='+version);
 assert(source.includes("script.dataset.readingStateOnly='1'"),'the existing state-only lazy mode remains in place');
});

test('audio cover normalization is idempotent and preserves prior query values and fragments',()=>{
 for(const file of ['ebook-matcher.js','reading-ai.js']){
  const input='/ebooks/'+file+'?v=retained&locale=kept&route=book%20view&audiocover=old#saved';
  const once=normalizer.normalize(input),url=new URL(once,'https://matchapp.tv');
  assert.equal(normalizer.normalize(once),once);assert.equal(url.searchParams.get('v'),'retained');
  assert.equal(url.searchParams.get('locale'),'kept');assert.equal(url.searchParams.get('route'),'book view');
  assert.deepEqual(url.searchParams.getAll('audiocover'),[version]);assert.equal(url.hash,'#saved');
  assert.equal(url.searchParams.get('art'),'20261020-source1');assert.equal(url.searchParams.get('fastart'),'20261020-1');
 }
});

test('the new audio cover key never spreads to unchanged runtime, identity, metadata, styles or external URLs',()=>{
 for(const input of ['/app.js?v=kept','/profile.js?v=kept','/ebooks/audiobooks.js?v=kept','/ebooks/cover-identity.js?v=kept','/ebooks/book-details-20261011.js?v=kept','/style.css?v=kept','https://cdn.example/ebook-matcher.js?v=kept']){
  const output=normalizer.normalize(input);assert.equal(new URL(output,'https://matchapp.tv').searchParams.has('audiocover'),false,input);
 }
});

const {verifiedVisiblePixels,URLS,ARTWORK_IDENTITY}=require('../tools/qa-audiobook-original-recovery.cjs');
const upgradeSample=()=>({visible:true,src:URLS.preview,currentSrc:URLS.preview,naturalWidth:300,naturalHeight:300,objectFit:'contain',verified:null,pending:URLS.preview,ownerPending:URLS.preview,ownerVerified:URLS.original,ownerIdentity:ARTWORK_IDENTITY,runActive:true});

test('controlled artwork observations recognize exact active marker lag and require the settled marker',()=>{
 const pending=upgradeSample();assert.equal(verifiedVisiblePixels(pending),true);
 assert.equal(verifiedVisiblePixels(pending,true),false,'pending marker lag never certifies a settled image');
 const priorPixels={...pending,currentSrc:URLS.original,naturalWidth:100,naturalHeight:100};
 assert.equal(verifiedVisiblePixels(priorPixels),true,'the exact previous pixels may remain during the same upgrade');
 const committed={...pending,verified:URLS.preview,ownerVerified:URLS.preview,pending:null,ownerPending:null,runActive:false};
 assert.equal(verifiedVisiblePixels(committed,true),true);
 assert.equal(verifiedVisiblePixels({...committed,verified:null}),false,'a missing marker after the run ends is a real failure');
});

test('controlled artwork observations reject foreign, unowned, lower-quality and dimension-mismatched handoffs',()=>{
 const pending=upgradeSample();
 for(const change of [
  {src:'https://untrusted.invalid/art.jpg'},
  {currentSrc:'https://untrusted.invalid/art.jpg'},
  {ownerIdentity:'another title'},
  {naturalWidth:100},
  {naturalHeight:100},
  {runActive:false},
  {pending:null},
  {ownerPending:null},
  {ownerPending:URLS.sharp},
  {ownerVerified:null},
  {ownerVerified:URLS.sharp},
  {ownerVerified:URLS.preview},
  {verified:URLS.original}
 ])assert.equal(verifiedVisiblePixels({...pending,...change}),false,JSON.stringify(change));
});
