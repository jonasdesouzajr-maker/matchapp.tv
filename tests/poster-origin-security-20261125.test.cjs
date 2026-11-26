'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../patches/real-posters-force-20261118.js'),'utf8');
function poster(sources){
 const dom=new JSDOM('<div class="poster-wall"><img></div>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 try{
  for(const src of sources){const img=dom.window.document.createElement('img');img.src=src;dom.window.document.body.append(img);}
  dom.window.setTimeout=()=>0;
  dom.window.eval(source);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom.window.document.querySelector('.poster-wall img').getAttribute('src');
 }finally{dom.window.close();}
}
test('poster wall only accepts exact trusted image origin or same-origin poster paths',()=>{
 const rejected=['https://image.tmdb.org.example.test/posters/a.jpg','https://example.test/?image.tmdb.org','https://example.test/covers/a.jpg','https://matchapp.tv/?next=/posters/a.jpg','https://user:pass@image.tmdb.org/a.jpg','http://image.tmdb.org/t/p/w500/a.jpg'];
 for(const src of rejected)assert.equal(poster([src]),null,src);
 for(const src of ['https://image.tmdb.org/t/p/w500/a.jpg','https://matchapp.tv/assets/posters/a.jpg','https://matchapp.tv/covers/a.jpg'])assert.equal(poster([...rejected,src]),src);
});
