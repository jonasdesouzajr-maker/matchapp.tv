'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {brandBatches}=require('../tools/finalize-brand.js');
const runner=path.join(__dirname,'../tools/finalize-brand.js');

test('the Brand CLI covers the full site with ordered, bounded independent batches',()=>{
 const files=Array.from({length:1959},(_,i)=>'fixture/'+i+'/index.html');
 const groups=brandBatches(files);
 assert.deepEqual(groups.map(group=>group.length).slice(0,3),[96,96,96]);
 assert.equal(groups.at(-1).length,39);
 assert.equal(groups.length,21);
 assert.ok(groups.every(group=>group.length>0&&group.length<=96));
 assert.deepEqual(groups.flat(),files);
 assert.deepEqual(brandBatches([]),[]);
 assert.deepEqual(brandBatches(['a.html','b.html','c.html'],2),[['a.html','b.html'],['c.html']]);
});

test('Brand worker rejects invalid or oversized file batches',()=>{
 for(const invalid of [null,{},'list'])assert.throws(()=>brandBatches(invalid),TypeError);
 for(const size of [0,-1,97,1.5])assert.throws(()=>brandBatches(['a.html'],size),TypeError);
 const worker=spawnSync(process.execPath,[runner,'--worker'],{
  input:JSON.stringify(['../outside.html']),encoding:'utf8',timeout:15000
 });
 assert.notEqual(worker.status,0);
 assert.match(worker.stderr,/Invalid Brand worker file list/);
});

test('full Brand CLI starts bounded-heap subprocesses without changing editorial scope',()=>{
 const source=fs.readFileSync(runner,'utf8');
 assert.match(source,/spawnSync\(process\.execPath,\['--max-old-space-size=2048',__filename,'--worker'\]/);
 assert.match(source,/const paths=files\(ROOT\)\.map/);
 assert.match(source,/BRAND_WORKER_COUNT=/);
 assert.match(source,/if\(require\.main===module\)runBrandCli\(\)/);
});
