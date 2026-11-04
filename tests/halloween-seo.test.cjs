const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const {LOCALES, ORIGIN, SOCIAL_IMAGE, route, loadInputs, loadCountries, render} = require('../tools/build-halloween.cjs');
const root = path.join(__dirname,'..');
const read = relative => fs.readFileSync(path.join(root,relative),'utf8');

test('Halloween has 15 translated, self-canonical pages with reciprocal discoverable language links', () => {
  const inputs = loadInputs();
  assert.equal(LOCALES.length,15);
  assert.ok(LOCALES.includes('ko') && LOCALES.includes('zh-TW') && LOCALES.includes('pt-BR'));
  for (const lang of LOCALES) {
    const url = ORIGIN+route(lang);
    const html = read(route(lang)+'index.html');
    assert.equal(html,render(lang,inputs),lang+': generated page is stale');
    const dom = new JSDOM(html,{url});
    try {
      const doc = dom.window.document;
      const copy = inputs.copies[lang];
      assert.equal(doc.documentElement.lang,lang);
      assert.equal(doc.documentElement.dir,lang==='ar'?'rtl':'ltr');
      assert.equal(doc.querySelectorAll('h1').length,1);
      assert.equal(doc.querySelector('h1').textContent,copy.heading);
      assert.equal(doc.querySelector('link[rel="canonical"]').href,url);
      assert.equal(doc.querySelector('meta[name="description"]').content,copy.description);
      assert.equal(doc.title,copy.seoTitle+' | MatchApp Ai');
      assert.match(doc.querySelector('meta[name="robots"]').content,/max-image-preview:large/);
      for (const other of LOCALES) {
        assert.equal(doc.querySelector('head link[hreflang="'+other+'"]').href,ORIGIN+route(other));
        assert.equal(doc.querySelector('.channel-language-list a[hreflang="'+other+'"]').href,ORIGIN+route(other));
      }
      assert.equal(doc.querySelector('link[hreflang="x-default"]').href,ORIGIN+route('en'));
      assert.deepEqual(JSON.parse(doc.getElementById('hw-copy').textContent),copy);
      for (const key of ['og:title','og:description','og:url','og:image','og:image:alt','og:image:width','og:image:height']) assert.ok(doc.querySelector('meta[property="'+key+'"]').content);
      assert.equal(doc.querySelector('meta[property="og:image"]').content,SOCIAL_IMAGE);
      assert.equal(doc.querySelector('meta[property="og:image:width"]').content,'1200');
      assert.equal(doc.querySelector('meta[property="og:image:height"]').content,'800');
      for (const key of ['twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt']) assert.ok(doc.querySelector('meta[name="'+key+'"]').content);
      assert.ok(doc.querySelector('[data-ma-consent-defaults]'));
      assert.equal(doc.querySelectorAll('script[src*="adsbygoogle"], .adsbygoogle').length,0);
      const ids = Array.from(doc.querySelectorAll('[id]'),node=>node.id);
      assert.equal(new Set(ids).size,ids.length);
    } finally {dom.window.close();}
  }
});

test('every Halloween film keeps its verified identity, original poster, source and localized editorial copy', () => {
  const inputs = loadInputs();
  assert.equal(inputs.films.length,20);
  assert.equal(new Set(inputs.films.map(film=>film.tmdbId)).size,20);
  for (const lang of LOCALES) {
    const url = ORIGIN+route(lang);
    const dom = new JSDOM(read(route(lang)+'index.html'),{url});
    try {
      const doc = dom.window.document;
      const copy = inputs.copies[lang];
      const articles = Array.from(doc.querySelectorAll('article.hw-film'));
      assert.equal(articles.length,20);
      const graph = JSON.parse(doc.querySelector('[type="application/ld+json"]').textContent)['@graph'];
      const list = graph.find(node=>node['@type']==='ItemList');
      assert.equal(list.numberOfItems,20);
      assert.equal(list.itemListElement.length,20);
      assert.equal(graph.some(node=>node['@type']==='Event'),false);
      for (const [index,film] of inputs.films.entries()) {
        const card = articles[index];
        assert.equal(card.id,'film-'+film.key);
        assert.equal(card.dataset.filmId,String(film.tmdbId));
        assert.equal(card.dataset.year,String(film.year));
        assert.equal(card.dataset.originalTitle,film.originalTitle);
        assert.equal(card.dataset.tone,film.tone);
        assert.equal(card.querySelector('h3 bdi').textContent,film.originalTitle);
        assert.equal(card.querySelector('.hw-why').textContent,copy.why[film.key]);
        if(lang!=='en') assert.notEqual(copy.why[film.key],inputs.copies.en.why[film.key],lang+': untranslated recommendation');
        const poster = card.querySelector('img.hw-poster');
        assert.equal(poster.src,film.poster);
        assert.equal(poster.getAttribute('width'),'500');
        assert.equal(poster.getAttribute('height'),'750');
        assert.equal(poster.getAttribute('loading'),'lazy');
        assert.equal(card.querySelector('button[data-hw-check]').dataset.hwCheck,String(film.tmdbId));
        assert.equal(card.querySelector('.hw-availability').textContent,copy.chooseFirst);
        assert.equal(card.querySelector('.hw-source').href,film.availability.source_page_url);
        assert.equal(card.querySelector('.hw-source-date time').dateTime,film.checkedAt);
        const item = list.itemListElement[index];
        assert.equal(item.position,index+1);
        assert.equal(item.item['@type'],'Movie');
        assert.equal(item.item.url,url+'#film-'+film.key);
        assert.ok(doc.getElementById(new URL(item.item.url).hash.slice(1)));
        assert.equal(item.item.name,film.originalTitle);
        assert.equal(item.item.identifier.value,film.tmdbId);
        assert.equal(item.item.description,copy.why[film.key]);
        assert.match(item.item.image,/^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\/[A-Za-z0-9]+\.jpg$/);
        assert.equal('offers' in item.item,false);
        assert.equal('aggregateRating' in item.item,false);
        assert.equal('review' in item.item,false);
        assert.equal('contentRating' in item.item,false);
      }
    } finally {dom.window.close();}
  }
});

test('Halloween country selection is worldwide and independent of language, with persistent sitemap discovery', () => {
  const inputs = loadInputs();
  const countryCodes = loadCountries().map(([,code])=>code).sort();
  assert.ok(countryCodes.length>=249);
  const manifest = JSON.parse(read('tools/halloween-urls.json'));
  assert.deepEqual(manifest,LOCALES.map(lang=>ORIGIN+route(lang)));
  assert.match(read('tools/update-sitemap.js'),/readList\('halloween-urls\.json'\)/);
  assert.match(read('tools/update-sitemap.js'),/\.\.\.halloween/);
  for (const lang of LOCALES) {
    const url = ORIGIN+route(lang);
    const dom = new JSDOM(read(route(lang)+'index.html'),{url});
    try {
      const doc = dom.window.document;
      const options = Array.from(doc.querySelectorAll('#hw-country option'));
      assert.equal(options[0].value,'');
      assert.equal(doc.getElementById('hw-country').value,'');
      assert.deepEqual(options.slice(1).map(option=>option.value).sort(),countryCodes);
      assert.equal(doc.getElementById('hw-country-note').textContent,inputs.copies[lang].countryNote);
      const brazil = options.find(option=>option.value==='BR');
      assert.equal(brazil.textContent,new Intl.DisplayNames([lang],{type:'region'}).of('BR'));
      assert.equal(doc.querySelectorAll('[data-hw-tone]').length,4);
      assert.equal(doc.querySelectorAll('[data-hw-tone][aria-pressed="true"]').length,1);
      assert.equal(doc.querySelectorAll('#movie-night article').length,3);
      assert.equal(doc.querySelectorAll('.hw-faq details').length,4);
      assert.ok(doc.querySelector('.hw-related a[href="/streaming/"]'));
      assert.ok(doc.querySelector('.hw-related a[href="/together.html"]'));
      assert.ok(doc.querySelector('script[defer][src^="/viewer-country.js?"]'));
      assert.ok(doc.querySelector('script[defer][src^="/halloween/config.js?"]'));
      assert.ok(doc.querySelector('script[defer][src^="/halloween/guide.js?"]'));
    } finally {dom.window.close();}
  }
});
