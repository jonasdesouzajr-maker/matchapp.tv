'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {waitForUsableCover}=require('../tools/cover-load-check.cjs');
test('a failed first image request does not mask a verified fallback that loads later',async()=>{
 const image={isConnected:true,complete:true,naturalWidth:0,hidden:true};
 setTimeout(()=>{image.complete=false;},5);
 setTimeout(()=>{image.complete=true;image.naturalWidth=600;image.hidden=false;},30);
 assert.equal(await waitForUsableCover(image,250),true);
});
test('missing pixels, hidden art and detached results cannot pass cover verification',async()=>{
 assert.equal(await waitForUsableCover({isConnected:false,complete:true,naturalWidth:600,hidden:false},50),false);
 assert.equal(await waitForUsableCover({isConnected:true,complete:true,naturalWidth:0,hidden:false},50),false);
 assert.equal(await waitForUsableCover({isConnected:true,complete:true,naturalWidth:600,hidden:true},50),false);
});
