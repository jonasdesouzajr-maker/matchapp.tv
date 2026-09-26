'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Every main change launches live regression only after its own deployment marker',()=>{
 const workflow=read('.github/workflows/release-smoke.yml');
 assert.match(workflow,/push:\s*\n\s*branches:\s*\[main\]/);
 const pushBlock=workflow.slice(workflow.indexOf('  push:'),workflow.indexOf('  workflow_dispatch:'));
 assert.doesNotMatch(pushBlock,/paths:|paths-ignore:/,'Do not silently skip UI, editorial or metadata releases');
 assert.match(workflow,/EXPECTED_SHA: \$\{\{ github\.sha \}\}/);
 assert.match(workflow,/deployment-sha\.txt/);
 assert.match(workflow,/node tools\/live-production-smoke\.cjs/);
 assert.match(workflow,/upload-artifact@/,'Keep screenshots and machine-readable report');
});

test('Live smoke code parses and exercises separate genuine normal, Bookworms, magazine and AI flows',()=>{
 const js=read('tools/live-production-smoke.cjs');
 assert.doesNotThrow(()=>new vm.Script(js,{filename:'tools/live-production-smoke.cjs'}));
 for(const term of [
  'LIVE normal movie matching and source poster',
  'LIVE Bookworms real e-book matching and verified original cover',
  'LIVE magazine matching and authentic publisher cover route',
  'LIVE original publisher icon resolves',
  "record('LIVE Ask AI '+label",
  "'movie-fact'",
  "'audiobook-intent'",
  "select[data-ebook-select=\"format\"]",
  'original visible posters'
 ])assert.ok(js.includes(term),term+' must run after every deployment');
 assert.match(js,/covers\\.openlibrary\\.org/);
 assert.match(js,/books\\.google\\.com/);
 assert.match(js,/image\.naturalWidth>0/);
 assert.match(js,/record\('browser fatal JS exceptions'/);
 assert.doesNotMatch(js,/checkDailyLimit\s*=|mockGemini|fakePoster|bypassQuota/i);
});

test('Automated regression suite retains genuine normal match, ebook source identity and Ask AI contracts',()=>{
 const npm=JSON.parse(read('package.json'));
 assert.match(npm.scripts.test,/tests\/\*\.test\.cjs/);
 for(const file of ['tests/match-runtime-regression.test.cjs','tests/magazines-reading-safety.test.cjs',
  'tests/ask-ai-related.test.cjs','tests/verified-media-runtime.test.cjs','tests/home-events-ebooks-poster-visual.test.cjs']){
  assert.ok(fs.existsSync(path.join(root,file)),file);
 }
 const policy=read('AGENTS.md');
 assert.match(policy,/MANDATORY POST-CHANGE MATCHING, BOOKWORMS, AI AND ORIGINAL ART REGRESSION/);
});
