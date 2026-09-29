'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fetchDeploymentMarker}=require('../tools/deployment-marker.cjs');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('production marker retries a stale CDN 404 using unique cache-busted URLs without bypassing SHA verification',async()=>{
 const requested=[],sha='a'.repeat(40);
 const got=await fetchDeploymentMarker('https://matchapp.tv',{retryDelayMs:0,fetcher:async(url,options)=>{
  requested.push({url,options});
  return requested.length===1?{ok:false,status:404}:{ok:true,text:async()=>sha};
 }});
 assert.equal(got,sha);
 assert.equal(requested.length,2);
 for(const item of requested){
  const u=new URL(item.url);
  assert.equal(u.pathname,'/deployment-sha.txt');
  assert(u.searchParams.has('smoke'),'cache buster missing');
  assert.equal(item.options.cache,'no-store');
 }
 assert.notEqual(requested[0].url,requested[1].url,'each retry needs a new cache key');
});
test('invalid marker content or permanent 404 remains a release failure',async()=>{
 await assert.rejects(fetchDeploymentMarker('https://matchapp.tv',{attempts:2,retryDelayMs:0,fetcher:async()=>({ok:true,text:async()=>'<html>404</html>'})}),/invalid marker content/);
 await assert.rejects(fetchDeploymentMarker('https://matchapp.tv',{attempts:2,retryDelayMs:0,fetcher:async()=>({ok:false,status:404})}),/HTTP 404/);
});
test('both live browser audits and the release gate use cache-busted deployment proof',()=>{
 assert(read('tools/live-production-smoke.cjs').includes('fetchDeploymentMarker(base)'));
 assert(read('tools/live-production-deep-matching.cjs').includes('fetchDeploymentMarker(BASE)'));
 assert(read('.github/workflows/release-smoke.yml').includes('?release=\u0024{EXPECTED_SHA}-\u0024{i}'));
});
