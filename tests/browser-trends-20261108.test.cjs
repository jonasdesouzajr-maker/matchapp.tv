'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const {EDITION,LANGUAGES,loadInputs,render} = require('../tools/build-browser-trends-20261108.cjs');
const ROOT = path.join(__dirname,'..');
const ORIGIN = 'https://matchapp.tv';
const data = loadInputs();
const read = relative => fs.readFileSync(path.join(ROOT,relative),'utf8');
const eachPage = check => {
  for (const guide of data.guides) for (const lang of LANGUAGES) {
    const copy = guide.versions[lang];
    const html = read(copy.route.slice(1)+'index.html');
    const dom = new JSDOM(html,{url:ORIGIN+copy.route});
    try { check({guide,lang,copy,html,doc:dom.window.document}); }
    finally { dom.window.close(); }
  }
};

test('new browser guides retain distinct canonical and reciprocal authored translations', () => {
  const titles = new Set();
  eachPage(({guide,lang,copy,doc}) => {
    assert.equal(doc.documentElement.lang,lang);
    assert.equal(doc.querySelectorAll('h1').length,1);
    assert.equal(doc.querySelector('h1').textContent,copy.heading);
    assert.equal(doc.querySelector('link[rel=canonical]').href,ORIGIN+copy.route);
    assert.equal(doc.querySelector('meta[name=description]').content,copy.description);
    assert.ok(copy.description.length >= 50);
    assert.ok(!titles.has(doc.title)); titles.add(doc.title);
    for (const peer of LANGUAGES) {
      assert.equal(doc.querySelector('link[hreflang="'+peer+'"]').href,ORIGIN+guide.versions[peer].route);
      assert.equal(doc.querySelector('.channel-language-list a[hreflang="'+peer+'"]').getAttribute('href'),guide.versions[peer].route);
    }
    assert.equal(doc.querySelector('link[hreflang=x-default]').href,ORIGIN+guide.versions.en.route);
    assert.equal(doc.querySelector('meta[property="og:title"]').content,doc.title);
    assert.equal(doc.querySelector('meta[name="twitter:description"]').content,copy.description);
    assert.ok(!doc.querySelector('meta[name=keywords]'));
  });
});

test('guide schema reflects visible article dates and source citations without invented ratings', () => {
  eachPage(({lang,copy,doc}) => {
    const graph = JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
    const article = graph.find(item=>item['@type']==='Article');
    assert.equal(article.inLanguage,lang);
    assert.equal(article.headline,doc.querySelector('h1').textContent);
    assert.equal(article.dateModified,EDITION);
    assert.equal(doc.querySelector('time').dateTime,EDITION);
    assert.deepEqual(article.citation,copy.sources.map(source=>source.url));
    for (const source of copy.sources) assert.ok([...doc.querySelectorAll('#sources a')].some(a=>a.href===source.url));
    assert.ok(graph.some(item=>item['@type']==='BreadcrumbList'));
    assert.ok(!JSON.stringify(graph).includes('aggregateRating'));
    assert.ok(!JSON.stringify(graph).includes('FAQPage'));
    assert.ok(doc.querySelector('.ust-archive').textContent.length>100);
  });
});

test('all guide anchors and local destinations resolve, including translated section links', () => {
  eachPage(({doc}) => {
    const ids = [...doc.querySelectorAll('[id]')].map(node=>node.id);
    assert.equal(new Set(ids).size,ids.length);
    for (const anchor of doc.querySelectorAll('main a[href]')) {
      const href=anchor.getAttribute('href');
      if (href.startsWith('#')) { assert.ok(doc.getElementById(href.slice(1)),href); continue; }
      const url=new URL(href,ORIGIN);
      if (url.origin!==ORIGIN) continue;
      const target=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
      assert.ok(fs.existsSync(path.join(ROOT,target)),target);
    }
  });
});

test('new articles preserve consent ordering and remain free of advertising inventory', () => {
  eachPage(({html,doc}) => {
    assert.ok(!doc.querySelector('ins.adsbygoogle,[data-ad-slot]'));
    assert.doesNotMatch(html,/monetag|12152170|12151861|adsbygoogle\.js|MultiTag/i);
    const defaults=html.indexOf('data-ma-consent-defaults');
    const firstTag=html.indexOf('gtm.start');
    assert.ok(defaults>=0&&defaults<firstTag);
    assert.ok(doc.querySelector('link[href^="/trending/us/guide.css"]'));
    assert.ok(doc.querySelector('script[src^="/channels/reader.js"]'));
    assert.ok(doc.querySelector('script[src^="/trending/us/guide.js"]'));
  });
});

test('regional hubs and persistent sitemap include all four guide routes and retain the prior edition', () => {
  const sitemap=read('sitemap.xml'),generator=read('tools/update-sitemap.js');
  for (const guide of data.guides) for (const lang of LANGUAGES) {
    const route=guide.versions[lang].route;
    assert.ok(generator.includes('${SITE}'+route),route);
    assert.equal(sitemap.split('<loc>'+ORIGIN+route+'</loc>').length-1,1,route);
    assert.ok(read((lang==='en'?'us':'br')+'/index.html').includes('href="'+route+'"'),route);
  }
  const prior=JSON.parse(read('tools/us-trends-urls.json'));
  assert.equal(prior.length,15);
  for (const url of prior) assert.ok(sitemap.includes('<loc>'+url+'</loc>'),url);
});

test('committed articles match their reviewed edition and bounded generator', () => {
  eachPage(({guide,lang,html}) => assert.equal(html,render(guide,lang,data)));
  const motor=data.guides.find(guide=>guide.id==='motor-city');
  assert.match(motor.versions.en.scope,/U\.S\.|United States/);
  assert.match(motor.versions['pt-BR'].scope,/Brasil/);
  assert.match(JSON.stringify(data.guides.find(guide=>guide.id==='november-picks').versions),/2026-10-26|October 26|26 de outubro|Oct 26/);
});
