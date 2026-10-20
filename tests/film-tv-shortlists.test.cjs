'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {buildPage, loadCatalog, slug, MOOD_COPY, CAT_COPY, PLAT_COPY} = require('../tools/build-seo-pages.js');
const {copy, isScreenTitle, planShortlist, trustedPoster} = require('../tools/film-tv-shortlists.cjs');
const editorial = require('../tools/discovery-editorial.json');
const catalog = loadCatalog();

function facet(page) {
  const [kind, name] = page.split('/');
  const labels = kind === 'moods' ? MOOD_COPY : kind === 'collections' ? CAT_COPY : PLAT_COPY;
  const key = Object.keys(labels).find(value => slug(value) === name);
  const items = catalog.filter(entry => kind === 'moods' ? (entry.moods || []).includes(key) :
    kind === 'collections' ? (entry.cats || []).includes(key) : entry.platform === key)
    .sort((a, b) => (b.synopsis || '').length - (a.synopsis || '').length);
  return {kind, key, title: labels[key][0], lede: labels[key][1], items, related: []};
}

test('screen classification respects explicit media formats before secondary subject tags', () => {
  for (const cats of [['YouTube channel', 'documentary'], ['YouTube channel', 'stand-up comedy special'],
    ['podcast', 'series'], ['music album', 'movie'], ['audiobook', 'movie'], ['YouTube Shorts', 'anime']]) {
    assert.equal(isScreenTitle({cats}), false, cats.join(', '));
  }
  for (const cats of [['anime'], ['reality show'], ['short film'], ['K-drama'], ['Classical Music', 'movie'], ['documentary']]) {
    assert.equal(isScreenTitle({cats}), true, cats.join(', '));
  }
  for (const cats of [[], ['Classical Music'], ['Sports'], ['News']]) assert.equal(isScreenTitle({cats}), false);
});

test('the curated contract covers exactly the existing seventeen film and TV destinations', () => {
  assert.equal(Object.keys(copy.pages).length, 17);
  assert.deepEqual(Object.keys(copy.pages).filter(page => page.startsWith('moods/')).sort(),
    Object.keys(MOOD_COPY).map(mood => 'moods/' + slug(mood)).sort());
  const known = new Set(require('../tools/seo-urls.json').map(url => new URL(url).pathname.slice(1, -1)));
  for (const page of Object.keys(copy.pages)) {
    assert.ok(known.has(page), page);
    const {items} = facet(page);
    const plan = planShortlist(page, items);
    assert.equal(plan.shortlist.length, 3);
    assert.ok(plan.shortlist.every(({item, reason}) => isScreenTitle(item) && item.year < 2025 && copy.reasons[reason]));
    assert.equal(plan.ordered.length, items.length);
    assert.deepEqual([...plan.ordered].sort((a,b) => a.title.localeCompare(b.title)), [...items].sort((a,b) => a.title.localeCompare(b.title)));
    assert.equal(new Set(plan.ordered.map(item => item.title)).size, items.length, page + ' repeats a title');
  }
});

for (const page of Object.keys(copy.pages)) test(page + ' leads with explained screen picks and retains all catalog records once', () => {
  const input = facet(page);
  const html = buildPage(input);
  const dom = new JSDOM(html, {url: 'https://matchapp.tv/' + page + '/'});
  try {
    const d = dom.window.document;
    const shortlist = d.querySelector('.seo-shortlist');
    assert.equal(d.querySelector('.seo-hero').nextElementSibling, shortlist, 'shortlist must precede long guidance');
    assert.equal(shortlist.nextElementSibling.classList.contains('seo-editorial'), true);
    for (const paragraph of editorial[page].paragraphs) assert.ok(d.querySelector('.seo-editorial').textContent.includes(paragraph));
    const selected = [...shortlist.querySelectorAll('.seo-item')];
    assert.equal(selected.length, 3);
    for (let i = 0; i < selected.length; i++) {
      const card = selected[i], pick = copy.pages[page][i];
      assert.equal(card.querySelector('h3').childNodes[0].textContent.trim(), pick.title);
      assert.equal(card.querySelector('[data-shortlist-copy="reason.' + pick.reason + '"]').textContent, copy.reasons[pick.reason]);
      assert.notEqual(card.querySelector('.seo-syn').textContent, copy.reasons[pick.reason]);
      const exact = new URL(card.querySelector('.seo-title-link').href);
      assert.equal(exact.searchParams.get('title'), pick.title);
      assert.equal(exact.searchParams.get('focus'), 'start');
      assert.equal(exact.searchParams.has('landing'), false, 'retrieval must remain exact, not request a new match');
      const similar = new URL(card.querySelector('.seo-similar-link').href);
      assert.equal(similar.searchParams.get('landing'), page);
      assert.equal(similar.searchParams.get('like'), pick.title);
      assert.equal(similar.searchParams.has('q'), false, 'landing context must await an explicit send');
    }
    for (const cta of d.querySelectorAll('.seo-cta')) {
      const link = new URL(cta.href);
      assert.equal(link.searchParams.get('landing'), page);
      assert.equal(link.searchParams.has('q'), false);
    }
    const all = [...d.querySelectorAll('.seo-item')];
    const titles = all.map(item => item.querySelector('h3').childNodes[0].textContent.trim());
    assert.equal(all.length, input.items.length);
    assert.equal(new Set(titles).size, titles.length);
    assert.equal(d.querySelectorAll('.seo-title-link').length, all.length);
    const itemList = [...d.querySelectorAll('script[type="application/ld+json"]')]
      .map(node => JSON.parse(node.textContent)).find(node => node['@type'] === 'ItemList');
    assert.equal(itemList.numberOfItems, all.length);
    assert.deepEqual(itemList.itemListElement.map(item => item.name), titles);
    assert.deepEqual(itemList.itemListElement.map(item => item.position), all.map((_, i) => i + 1));
    assert.deepEqual(all.map(item => Number(item.querySelector('.seo-rank').textContent)), all.map((_, i) => i + 1));
    for (const card of d.querySelectorAll('.seo-other-catalog .seo-item')) {
      const title = card.querySelector('h3').childNodes[0].textContent.trim();
      assert.equal(isScreenTitle(input.items.find(item => item.title === title)), false, title);
    }
    for (const card of all.filter(item => !item.closest('.seo-other-catalog'))) {
      const title = card.querySelector('h3').childNodes[0].textContent.trim();
      assert.equal(isScreenTitle(input.items.find(item => item.title === title)), true, title);
    }
    assert.ok(d.querySelector('.seo-other-formats a[href="/ebooks/"]'));
    assert.ok(d.querySelector('.seo-other-formats a[href="/music.html"]'));
    assert.match(shortlist.textContent, /not a confirmed offer/);
    assert.equal(buildPage(input), html, 'same inputs must generate the same bytes');
  } finally {dom.window.close();}
});

test('curated identity disappearance, duplicate identity or reclassification stops generation', () => {
  const page = 'moods/cozy-comfort-watch';
  const input = facet(page);
  const chosen = input.items.find(item => item.title === copy.pages[page][0].title);
  assert.throws(() => buildPage({...input, items: input.items.filter(item => item !== chosen)}), /one screen title/);
  assert.throws(() => buildPage({...input, items: [...input.items, chosen]}), /one screen title/);
  assert.throws(() => buildPage({...input, items: input.items.map(item => item === chosen ? {...item, cats:['YouTube channel', 'documentary']} : item)}), /one screen title/);
});

test('non-screen landing pages retain their existing presentation and exact-title actions', () => {
  for (const page of ['collections/podcast', 'collections/classical-music', 'platforms/spotify', 'platforms/youtube']) {
    const input = facet(page);
    const dom = new JSDOM(buildPage(input), {url:'https://matchapp.tv/' + page + '/'});
    try {
      const d = dom.window.document;
      assert.equal(d.querySelector('.seo-shortlist'), null);
      assert.equal(d.querySelector('[data-shortlist-copy]'), null);
      assert.equal(d.querySelector('script[src*="seo-shortlist"]'), null);
      assert.equal(d.querySelector('.seo-cta').getAttribute('href'), '/discover.html');
      assert.equal(d.querySelector('.seo-hero').nextElementSibling.classList.contains('seo-editorial'), true);
      assert.deepEqual([...d.querySelectorAll('.seo-item h3')].map(node => node.childNodes[0].textContent.trim()), input.items.map(item => item.title));
    } finally {dom.window.close();}
  }
});

test('catalog text is escaped and only exact existing trusted poster URLs are rendered', () => {
  const input = facet('moods/cozy-comfort-watch');
  const extra = {title:'A <script>title</script> & "name"', synopsis:'<img src=x onerror=alert(1)>', cats:['movie'], platform:'<b>platform</b>'};
  const dom = new JSDOM(buildPage({...input, items:[...input.items, extra]}));
  try {
    assert.equal(dom.window.document.querySelectorAll('.seo-item script, .seo-item img[onerror], .seo-chip b').length, 0);
    assert.ok([...dom.window.document.querySelectorAll('.seo-item h3')].some(node => node.textContent === extra.title));
  } finally {dom.window.close();}
  assert.equal(trustedPoster({poster:'https://evil.example/poster.jpg'}), '');
  assert.equal(trustedPoster({poster:'javascript:alert(1)'}), '');
  assert.equal(trustedPoster({poster:'https://image.tmdb.org@evil.example/t/p/w500/x.jpg'}), '');
  assert.equal(trustedPoster({poster:'https://image.tmdb.org/t/p/w500/exact.jpg'}), 'https://image.tmdb.org/t/p/w500/exact.jpg');
  const exact = catalog.find(item => item.title === 'Acesso Total');
  assert.equal(trustedPoster(exact), exact.poster);
});

test('locale retry controls remain hidden while loading despite the shared CTA display rule', () => {
  const dom = new JSDOM(buildPage(facet('moods/cozy-comfort-watch')));
  try {
    const d = dom.window.document;
    const status = d.createElement('div');
    status.className = 'seo-shortlist-locale-status';
    const retry = d.createElement('button');
    retry.className = 'seo-cta';
    retry.hidden = true;
    status.append(retry);
    d.querySelector('main').prepend(status);
    assert.equal(dom.window.getComputedStyle(retry).display, 'none');
    retry.hidden = false;
    assert.equal(dom.window.getComputedStyle(retry).display, 'inline-flex');
    status.hidden = true;
    assert.equal(dom.window.getComputedStyle(status).display, 'none');
  } finally {dom.window.close();}
});
