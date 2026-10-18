'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {matchingFixtureHtml}=require('../tools/qa-matching-fixture-html.cjs');

test('matching fixture removes parsed scripts including unusual closing tags and template contents',()=>{
 const html='<!doctype html><html><head><SCRIPT>window.mustNotRun=1;</SCRIPT ><script src="/runtime.js"></script></head><body><main id="result"><p>Original result</p></main><template><script>bad()</script><template><script src="/nested.js"></script></template></template></body></html>';
 const dom=new JSDOM(matchingFixtureHtml(html,'http://127.0.0.1:4321'));
 try{
  const check=root=>{assert.equal(root.querySelectorAll('script').length,0);for(const t of root.querySelectorAll('template'))check(t.content);};
  check(dom.window.document);
  assert.equal(dom.window.document.querySelector('#result p').textContent,'Original result');
  assert.equal(dom.window.mustNotRun,undefined);
 }finally{dom.window.close();}
});
test('matching fixture preserves source layout, CSS, artwork and literal escaped script text',()=>{
 const html='<!doctype html><html lang="pt-BR"><head><base href="https://example.invalid/"><link rel="stylesheet" href="brand.css"><style>.result{display:grid}</style></head><body><main class="result"><img src="/original.webp" alt="Original artwork"><code>&lt;script&gt;literal&lt;/script&gt;</code></main></body></html>';
 const dom=new JSDOM(matchingFixtureHtml(html,'http://localhost:4321/'));
 try{
  const d=dom.window.document;
  assert.equal(d.documentElement.lang,'pt-BR');assert.equal(d.querySelectorAll('base').length,1);
  assert.equal(d.querySelector('base').href,'http://localhost:4321/');
  assert.equal(d.querySelector('link').href,'http://localhost:4321/brand.css');
  assert.equal(d.querySelector('img').src,'http://localhost:4321/original.webp');
  assert.equal(d.querySelector('code').textContent,'<script>literal</script>');
  assert.equal(d.querySelector('style').textContent,'.result{display:grid}');
  assert(d.querySelector('main.result'));
 }finally{dom.window.close();}
});
test('matching fixture refuses non-loopback origins and embedded credentials',()=>{
 for(const base of ['https://127.0.0.1:4321','http://example.invalid','http://127.0.0.1.evil.invalid','http://user@localhost:4321']){
  assert.throws(()=>matchingFixtureHtml('<main>Owned fixture</main>',base),/loopback origin/);
 }
});
