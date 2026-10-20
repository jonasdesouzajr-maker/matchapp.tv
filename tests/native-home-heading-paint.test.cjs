'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const css=fs.readFileSync(path.join(__dirname,'../patches/reference-home.css'),'utf8');
const rule=css.match(/(html\.ma-reference\.matchapp-ai-android body\.page-home :is\(\.home-hero\.home-hero \.home-h1\.home-h1,\.ma-cinema-section-heading h2\))\s*\{([^}]+)\}/);
test('solid glyph mitigation selects only native Home hero and cinema-section heading nodes',()=>{
 assert.ok(rule,'native-only heading mitigation exists');
 const dom=new JSDOM('<html class="ma-reference"><body class="page-home"><header class="home-hero"><h1 class="home-h1">What should you watch tonight?</h1><p>Existing caption</p></header><section class="ma-cinema-section-heading"><h2>Top Titles</h2><a href="/explore.html">View all</a></section><h2 id="other">Other heading</h2><button>Existing action</button></body></html>');
 try{
  const d=dom.window.document,headings=[d.querySelector('.home-h1'),d.querySelector('.ma-cinema-section-heading h2')],before=[...d.body.childNodes];
  assert.equal(d.querySelectorAll(rule[1]).length,0,'ordinary browser treatment is unchanged');
  d.documentElement.classList.add('matchapp-ai-android');assert.deepEqual([...d.querySelectorAll(rule[1])],headings);
  assert.equal(d.getElementById('other').matches(rule[1]),false);assert.equal(d.querySelector('button').matches(rule[1]),false);assert.equal(d.querySelector('a').matches(rule[1]),false);
  d.body.className='ebook-page';assert.equal(d.querySelectorAll(rule[1]).length,0,'other adult pages retain their existing typography');
  d.body.className='kids-page';assert.equal(d.querySelectorAll(rule[1]).length,0,'Kids remains isolated');assert.deepEqual([...d.body.childNodes],before);
 }finally{dom.window.close();}
});
test('native heading mitigation alters solid paint properties without changing type, color, pills or layout',()=>{
 assert.ok(rule);const declarations=Object.fromEntries(rule[2].trim().split(';').filter(Boolean).map(value=>{const i=value.indexOf(':');return[value.slice(0,i).trim(),value.slice(i+1).trim()];}));
 assert.deepEqual(declarations,{'text-shadow':'none!important','-webkit-text-fill-color':'currentColor!important','-webkit-background-clip':'border-box!important','background-clip':'border-box!important'});
 assert.doesNotMatch(rule[2],/(?:^|;)\s*(?:font[^:]*|color|transform|filter|will-change|contain|display|position|padding[^:]*|margin[^:]*|width|height|border[^:]*|box-shadow)\s*:/,'no typography, geometry, compositing or capsule override');
});
