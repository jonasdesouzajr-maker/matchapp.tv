'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const pages=[
  "guides/worldwide-entertainment-discovery/index.html",
  "guides/what-to-watch-september-2026/index.html",
  "guides/global-music-september-2026/index.html",
  "guides/books-september-2026/index.html",
  "guides/filmes-series-em-alta-brasil-setembro-2026/index.html",
  "guides/peliculas-series-tendencia-mexico-septiembre-2026/index.html",
  "collections/indian-cinema/index.html",
  "collections/mexican-series-films/index.html",
  "awareness/breast-cancer-awareness-month-2026/index.html",
  "awareness/international-translation-day-2026/index.html",
  "awareness/world-alzheimers-month-2026/index.html",
  "awareness/world-mental-health-day-2026/index.html",
  "awareness/world-tourism-day-2026/index.html"
];
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('13 public editorial routes use one approved existing GTM loader and no-script fallback',()=>{
  for(const file of pages){
    const html=read(file);
    const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'';
    const body=html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]||'';
    const scripts=[...head.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
    const loaders=scripts.filter(([,code])=>code.includes('GTM-M7J3NNBN'));
    assert.equal(loaders.length,1,file+' must contain one and only one existing GTM loader');
    assert.match(loaders[0][1],/gtm\.js/);
    const fallbacks=[...body.matchAll(/<noscript>\s*<iframe\b[^>]*><\/iframe>\s*<\/noscript>/gi)];
    assert.equal(fallbacks.filter(([html])=>html.includes('ns.html?id=GTM-M7J3NNBN')).length,1,file+' must contain the matching no-script fallback');
  }
});
test('editorial generators preserve GTM while Kids stays excluded',()=>{
  for(const file of ['tools/build-world-discovery-guide.js','tools/awareness-bot.mjs']){
    const src=read(file);
    assert(src.includes('GTM-M7J3NNBN'),file+' must preserve the existing container');
    assert(src.includes('ns.html?id=GTM-M7J3NNBN'),file+' must preserve the matching no-script fallback');
  }
  assert(!read('kids/index.html').includes('GTM-M7J3NNBN'),'Kids must not gain marketing analytics');
});
