'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const { completePublicHead } = require('../tools/public-discovery-head.cjs');
test('every sitemap document supplies usable search and sharing metadata', () => {
  const selectors = ['title','link[rel="canonical"]','meta[name="description"]',
    ...['og:title','og:description','og:type','og:url','og:image'].map(k=>'meta[property="'+k+'"]'),
    ...['twitter:card','twitter:title','twitter:description','twitter:image'].map(k=>'meta[name="'+k+'"]'),
    'script[type="application/ld+json"]'];
  for (const [, url] of fs.readFileSync('sitemap.xml','utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const route = new URL(url).pathname.slice(1);
    const file = route.endsWith('/') || !route ? route+'index.html' : route;
    const html = fs.readFileSync(file,'utf8');
    const dom = new JSDOM(html.slice(0,html.indexOf('</head>')+7));
    try {
      for (const selector of selectors) {
        const el = dom.window.document.querySelector(selector);
        assert.ok(el && (el.content || el.getAttribute('href') || el.textContent).trim(),file+' '+selector);
      }
      assert.equal(completePublicHead(html,file,dom.window.document),html,file+' stale generated preview');
    } finally { dom.window.close(); }
  }
});
test('metadata fallbacks respect private routes, editor overrides and later edits', () => {
  const html='<!doctype html><html lang="en"><head><title>Pick music</title><link rel="canonical" href="https://matchapp.tv/music.html"><meta name="description" content="Find a video."><meta property="og:title" content="Music from our editors"></head><body></body></html>';
  function render(source,path) {
    const dom=new JSDOM(source);
    try {return completePublicHead(source,path,dom.window.document);} finally {dom.window.close();}
  }
  assert.equal(render(html,'profile/profile.html'),html);
  const privatePage=html.replace('</head>','<meta name="robots" content="noindex,follow"></head>');
  assert.equal(render(privatePage,'music.html'),privatePage);
  const result=render(html,'music.html');
  assert.equal(render(result,'music.html'),result);
  assert.match(result,/name="twitter:title" content="Music from our editors"/);
  const updated=render(result.replace('content="Find a video."','content="Find an official video."'),'music.html');
  assert.match(updated,/property="og:description" content="Find an official video."/);
});
