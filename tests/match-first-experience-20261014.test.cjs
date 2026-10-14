'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=fs.readFileSync(path.join(root,'patches/match-first-experience-20261014.js'),'utf8');
const supported=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
test('Home headline sells discovery without renaming the honest MatchApp Ai brand',()=>{
 const dom=new JSDOM(home,{url:'https://matchapp.tv/'});
 const doc=dom.window.document;
 assert.equal(doc.querySelectorAll('[data-match-experience-heading]').length,1);
 assert.equal(doc.querySelector('[data-match-experience-heading]').textContent,'Find Your Next Experience');
 assert.equal(doc.querySelector('[data-match-brand-story]').textContent,'Your entertainment, matched.');
 assert.equal(doc.querySelector('[data-match-experience-nav]').getAttribute('data-ma-nav'),null);
 assert.equal(doc.querySelector('[data-match-experience-nav]').closest('a').getAttribute('href'),'/discover.html');
 assert.match(home, /<title>MatchApp Ai — What to Watch Tonight &amp; Where to Stream<\/title>/);
 assert.doesNotMatch(home,/Movies matched to you:\s*94%|AI personalities matched to you:\s*88%/);
 dom.window.close();
});
test('Discovery-first headline, Jonas destination and match identity localize in all supported languages',()=>{
 const dom=new JSDOM(home,{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window;w.MATCH_LANG='en';w.eval(scripts);
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const seen=[];
 for(const lang of supported){
  w.MATCH_LANG=lang;w.document.dispatchEvent(new w.Event('matchapp:langchange'));
  for(const attr of ['data-match-experience-heading','data-match-brand-story','data-match-experience-nav','data-match-experience-dialog','data-match-experience-eyebrow']){
   const element=w.document.querySelector('['+attr+']');
   assert.ok(element&&element.textContent.trim().length>=4,lang+' empty '+attr);
  }
  seen.push(w.document.querySelector('[data-match-experience-heading]').textContent);
  const link=w.document.querySelector('[data-match-experience-nav]').closest('a');
  assert.equal(link.getAttribute('href'),'/discover.html');
 }
 assert.equal(new Set(seen).size,supported.length);
 w.MATCH_LANG='en';w.document.dispatchEvent(new w.Event('matchapp:langchange'));
 assert.equal(w.document.querySelector('[data-match-experience-heading]').textContent,'Find Your Next Experience');
 w.close();
});
