'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const os=require('node:os');
const fs=require('node:fs');
const path=require('node:path');
const {captureAuditedScreenshot,assertScreenshotProof}=require('../tools/live-qa-screenshot.cjs');

const pixels=Buffer.alloc(2048);
Buffer.from([137,80,78,71,13,10,26,10]).copy(pixels,0);
pixels.writeUInt32BE(13,8);
pixels.write('IHDR',12,'ascii');
pixels.writeUInt32BE(390,16);
pixels.writeUInt32BE(844,20);
const viewport={width:390,height:844};
function scratch(t){
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-shot-'));
 t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
 return path.join(d,'screenshot.png');
}
test('A completed font load uses normal Playwright visual evidence',async t=>{
 const file=scratch(t);
 let used=false;
 const page={
  evaluate:async()=> 'ready',
  screenshot:async options=>{assert.equal(options.animations,'disabled');used=true;fs.writeFileSync(options.path,pixels)},
  viewportSize:()=>viewport
 };
 const warning=await captureAuditedScreenshot(page,file);
 assert.equal(warning,null);
 assert.equal(used,true);
 assert.deepEqual(fs.readFileSync(file),pixels);
});
test('A stalled font CDN produces a real Chromium viewport capture and an explicit warning',async t=>{
 const file=scratch(t),events=[];
 let checked=0;
 const page={
  evaluate:async()=> ++checked===1?'pending':true,
  screenshot:async()=>{throw Error('Must not wait indefinitely on fonts')},
  context:()=>({newCDPSession:async()=>({
   send:async(method,options)=>{events.push(method);assert.equal(options.format,'png');return {data:pixels.toString('base64')}},
   detach:async()=>{events.push('detached')}
  })}),
  viewportSize:()=>viewport
 };
 const warning=await captureAuditedScreenshot(page,file,{fontWaitMs:1});
 assert.match(warning.issue,/font status pending/);
 assert.match(warning.issue,/unverified/);
 assert.deepEqual(events,['Page.captureScreenshot','detached']);
 assert.ok(fs.existsSync(file));
});
test('Neither missing nor undersized screenshots can be reported as saved',async t=>{
 const file=scratch(t);
 assert.throws(()=>assertScreenshotProof(Buffer.alloc(1600),viewport),/PNG evidence/);
 const page={
  evaluate:async()=> 'pending',
  context:()=>({newCDPSession:async()=>({send:async()=>({data:''}),detach:async()=>{}})}),
  viewportSize:()=>viewport
 };
 await assert.rejects(()=>captureAuditedScreenshot(page,file,{fontWaitMs:1}),/no screenshot data/);
 assert.equal(fs.existsSync(file),false);
});
