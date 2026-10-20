'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {watchPoster,watchPosterMarkup,injectWatchPoster}=require('../tools/build-watch-pages.js');
const info={tmdbId:693134,kind:'movie',year:2024,regions:{},regionObservations:{}};
const row={title:'Dune: Part Two',tmdbId:693134,kind:'movie',year:2024,poster:'https://image.tmdb.org/t/p/w500/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg'};
test('watch detail art must match numeric identity, kind, year and trusted source',()=>{
 assert.ok(watchPoster(info,[row]));
 for(const patch of [{tmdbId:123},{kind:'tv'},{year:1984},{adult:true},{poster:'https://untrusted.example/cover.jpg'},{poster:'javascript:alert(1)'}]){
  assert.equal(watchPoster(info,[{...row,...patch}]),null,JSON.stringify(patch));
 }
 assert.equal(watchPoster({kind:'movie'},[row]),null);
});
test('detail first-view source uses explicit responsive dimensions and starts without a metadata request',()=>{
 const d=new JSDOM(watchPosterMarkup('Dune: Part Two',info,[row])).window.document,img=d.querySelector('img');
 assert.equal(img.dataset.tmdbId,'693134');assert.equal(img.dataset.tmdbKind,'movie');assert.equal(img.dataset.tmdbYear,'2024');
 assert.equal(img.getAttribute('loading'),'eager');assert.equal(img.getAttribute('fetchpriority'),'high');
 assert.equal(img.getAttribute('width'),'300');assert.equal(img.getAttribute('height'),'450');
 assert.ok(img.getAttribute('src').includes('/w342/'));assert.match(img.srcset,/185w.*342w.*500w.*780w/);
 assert.equal(img.alt,'Dune: Part Two');assert.match(img.dataset.posterPreferredUrl,/^https:\/\/image\.tmdb\.org\/t\/p\/w342\//);assert.equal(img.hasAttribute('data-src'),false);
});
test('surgical detail patch retains existing routes, metadata, hooks and ad bytes, and is idempotent',()=>{
 const before='<!doctype html><html><head><link rel="canonical" href="https://matchapp.tv/where-to-watch/dune-part-two/"><script src="/patches/reference-system.js"></script></head><body><main><header class="w2w-hero"><h1>Dune</h1><p>Unchanged source copy</p><nav><a href="#availability-br">Brazil</a></nav></header><section id="availability-br">Original provider</section><div data-ad-slot="fixed">untouched ad</div></main></body></html>';
 const after=injectWatchPoster(before,'Dune: Part Two',info,[row]);
 assert.equal(injectWatchPoster(after,'Dune: Part Two',info,[row]),after);
 const original=new JSDOM(before).window.document,updated=new JSDOM(after).window.document;
 for(const selector of ['h1','p','nav','[rel=canonical]','script','[data-ad-slot]','#availability-br'])assert.equal(updated.querySelector(selector).outerHTML,original.querySelector(selector).outerHTML,selector);
 assert.equal(updated.querySelectorAll('[data-watch-poster]').length,1);
 assert.equal(updated.querySelectorAll('[data-watch-poster-layout]').length,1);
 assert.equal(injectWatchPoster(before,'Unknown',info,[]),before);
});

test('known source year binds art even when availability snapshot omits it',()=>{
 const d=new JSDOM(watchPosterMarkup('Dune: Part Two',{...info,year:null},[row])).window.document;
 assert.equal(d.querySelector('img').dataset.tmdbYear,'2024');
});
