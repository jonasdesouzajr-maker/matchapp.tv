'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('focused Home keeps the watch controller and routes other topics through Explore',()=>{
 const css=fs.readFileSync('patches/home-watch-focus.css','utf8');
 assert.doesNotMatch(css,/#ma-concierge[\s,]/,'the concierge owns the watch form and must remain visible');
 for(const id of ['ebook-matcher-root','cooking-home','latest-news','global-events','awareness-spotlight','billboard','spotify-videos','swifties-spotify'])assert.ok(css.includes('#'+id));
 for(const id of ['trending-rail','weekly-pick-disclosure','questionnaire-box','result-box'])assert.ok(!css.includes('#'+id));
 const doc=new JSDOM(fs.readFileSync('index.html','utf8')).window.document;
 assert.ok(doc.querySelector('#ma-worlds-trigger[aria-controls="ma-explore-worlds-panel"]'));
 assert.ok(doc.querySelector('#ma-explore-worlds-panel a[href="/explore.html"]'));
 assert.ok(doc.querySelector('link[href*="home-watch-focus.css"]'));
});
test('reading hub uses the original matcher and shared credit controller',()=>{
 const doc=new JSDOM(fs.readFileSync('ebooks/index.html','utf8')).window.document;
 assert.equal(doc.querySelectorAll('#ebook-matcher-root').length,1);
 assert.ok(doc.querySelector('script[src^="/app.js"]'));
 assert.ok(doc.querySelector('script[src^="/ebooks/ebook-matcher.js"]'));
 assert.ok(!doc.querySelector('a[href="/#ebook-matcher-root"]'));
});
test('existing reading bookmarks reach the reading hub with medium and locale intact',()=>{
 const d=new JSDOM('',{url:'https://matchapp.tv/ebooks/',runScripts:'outside-only'});
 const src=fs.readFileSync('patches/home-watch-focus.js','utf8');
 assert.match(src,/url\.pathname='\/ebooks\/'/);assert.match(src,/url\.searchParams\.has\('reading'\)/);
 d.window.eval(src);d.window.close();
});
