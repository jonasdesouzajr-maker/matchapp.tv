'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const api = require('../news-monetization.js');
const source = fs.readFileSync(path.join(__dirname, '..', 'news-monetization.js'), 'utf8');
const NOW = Date.parse('2026-10-17T12:00:00Z');
const article = overrides => ({ title: 'Netflix shares the trailer for a new film', category: 'entertainment', event_type: 'Release', description: 'The new film trailer has arrived.', url: 'https://www.hollywoodreporter.com/movies/movie-news/example/', ...overrides });
const availability = overrides => ({ verified: true, title_id: 'fixture-title', provider: 'netflix', country: 'US', checkedAt: '2026-10-17T10:00:00Z', url: 'https://www.netflix.com/title/12345678', sourceUrl: 'https://www.netflix.com/title/12345678', ...overrides });
const offer = overrides => ({ id: 'fixture-pluto', provider: 'pluto', country: 'US', type: 'free_with_ads', url: 'https://pluto.tv/us/', sourceUrl: 'https://pluto.tv/us/', checked: '2026-10-17', reviewBy: '2026-11-16', ...overrides });

function harness({ lang = 'en', country = 'US', route = '/news/', item = article(), hooks = true } = {}) {
  const dom = new JSDOM('<!doctype html><html lang="en"><body><main><article id="original-card"><a id="original-source" href="https://www.hollywoodreporter.com/movies/movie-news/example/" rel="noopener noreferrer external" target="_blank">Original source</a><p id="original-summary">Original summary</p></article><aside id="existing-ad" aria-label="existing placement"></aside></main></body></html>', { url: 'https://matchapp.tv' + route, runScripts: 'outside-only' });
  const w = dom.window, doc = w.document, card = doc.getElementById('original-card');
  w.Date.now = () => NOW;
  w.MATCH_LANG = lang;
  if (country) w.localStorage.setItem('match_user_region', country);
  w.localStorage.setItem('match_lang', lang);
  if (hooks) {
    Object.assign(card.dataset, { newsCommerceCard: '', newsTitle: item.title, newsCategory: item.category, newsEvent: item.event_type, newsDescription: item.description, newsSourceUrl: item.url, newsTitleId: item.title_id || '' });
    const slot = doc.createElement('div'); slot.className = 'ma-news-commerce-slot'; slot.dataset.newsCommerceSlot = ''; card.append(slot);
    const offers = doc.createElement('div'); offers.dataset.newsLocalOffers = ''; doc.querySelector('main').append(offers);
  }
  const original = { anchor: doc.getElementById('original-source'), summary: doc.getElementById('original-summary'), ad: doc.getElementById('existing-ad').outerHTML };
  let calls = 0, requests = 0;
  original.anchor.addEventListener('click', event => { event.preventDefault(); calls++; });
  w.fetch = () => { requests++; throw new Error('News commerce must not make requests.'); };
  w.eval(source);
  w.MatchAppNewsMonetization.init(w);
  return { dom, w, doc, card, original, api: w.MatchAppNewsMonetization, calls: () => calls, requests: () => requests };
}

test('context links require a provider and film/series context in true entertainment metadata', () => {
  const positives = [
    'Netflix shares the trailer for a new film', 'Novo filme da Netflix estreia em novembro',
    'Nueva serie de Netflix: estreno en noviembre', 'Netflix annonce une nouvelle série',
    'Neue Netflix Serie startet im November', 'Netflix presenta una nuova serie',
    'Netflix yeni dizi fragmanını yayınladı', 'Новый сериал Netflix выйдет в ноябре',
    'فيلم جديد على نتفليكس', 'नेटफ्लिक्स की नई फिल्म', 'Netflix merilis trailer film baru',
    'ネットフリックスの新作映画が公開', '넷플릭스 새 드라마 예고편', '网飞新电影预告片'
  ];
  for (const title of positives) assert.equal(api.eligibleArticle(article({ title })), true, title);
  for (const category of ['world', 'sports', 'news', '', undefined]) assert.equal(api.eligibleArticle(article({ category })), false, String(category));
  for (const title of ['Netflix announces its streaming revenue', 'The Amazon rainforest returns in a new film', 'Max discusses a new film', 'A cinema opens near you', 'MyNetflixFan celebrates a movie']) {
    assert.equal(api.eligibleArticle(article({ title })), false, title);
  }
  assert.equal(api.eligibleArticle(article({ url: 'javascript:alert(1)' })), false);
});

test('sensitive headlines, event types and article summaries do not receive a commercial CTA', () => {
  const titles = [
    'Netflix film actor dies aged 80', 'Morre ator de série da Netflix', 'Muere actor de serie Netflix',
    'Netflix : décès de la star de la série', 'Netflix Serie: Schauspieler gestorben',
    'Muore attore della serie Netflix', 'Netflix dizi oyuncusu vefat etti',
    'Умер актер из сериала Netflix', 'وفاة نجم فيلم نتفليكس',
    'नेटफ्लिक्स फिल्म के अभिनेता का निधन', 'Aktor film Netflix meninggal',
    'ネットフリックス映画の俳優が死去', '넷플릭스 영화 배우 사망', '网飞电影演员去世',
    'Netflix film examines allegations against a producer', 'Netflix series lawsuit expands'
  ];
  for (const title of titles) assert.equal(api.contextFor(article({ title }), 'US', 'en', NOW), null, title);
  assert.equal(api.eligibleArticle(article({ event_type: 'Death' })), false);
  assert.equal(api.eligibleArticle(article({ description: 'The new film concerns a recent war and deaths.' })), false);
});

test('a provider mention stays a catalogue link without unsupported regional or title claims', () => {
  const item = article({ availability: { verified: true } });
  const before = JSON.stringify(item);
  const link = api.contextFor(item, 'US', 'en', NOW);
  assert.equal(link.href, 'https://www.netflix.com/');
  assert.equal(link.label, 'Explore Netflix');
  assert.equal(link.exact, false);
  assert.match(link.note, /Check this title/);
  assert.doesNotMatch(api.contextMarkup(item, 'US', 'en', NOW), /data-availability-checked|Sponsored|affiliate|free trial/i);
  assert.equal(JSON.stringify(item), before);
  const unavailable = api.contextFor(article({ title: 'Hulu shares a trailer for its new series' }), 'BR', 'pt', NOW);
  assert.equal(unavailable.href, '/streaming/');
  assert.equal(unavailable.external, false);
  assert.equal(api.contextFor(article(), 'RU', 'ru', NOW).href, '/streaming/');
});

test('an exact watch link requires matching identity, country, provider and fresh official title evidence', () => {
  const valid = article({ title_id: 'fixture-title', availability: availability() });
  const before = JSON.stringify(valid);
  const link = api.contextFor(valid, 'US', 'en', NOW);
  assert.equal(link.href, 'https://www.netflix.com/title/12345678');
  assert.equal(link.exact, true);
  assert.equal(link.label, 'Watch on Netflix');
  assert.match(link.note, /United States/);
  assert.match(api.contextMarkup(valid, 'US', 'en', NOW), /data-availability-checked="true"/);
  assert.equal(JSON.stringify(valid), before);
  const invalid = [
    { verified: false }, { title_id: 'different-title' }, { provider: 'prime' }, { country: 'BR' },
    { checkedAt: '2026-10-15T10:00:00Z' }, { checkedAt: '2026-10-18T10:00:00Z' }, { checkedAt: '' },
    { sourceUrl: 'https://www.netflix.com/' }, { sourceUrl: 'https://www.netflix.com/title/87654321' },
    { url: 'https://www.netflix.com/browse' }, { url: 'https://www.netflix.com.evil.example/title/12345678' },
    { url: 'https://user@www.netflix.com/title/12345678' }, { url: 'https://www.netflix.com:8443/title/12345678' },
    { url: 'http://www.netflix.com/title/12345678' }, { url: 'https://www.netflix.com/title/12345678?%72edirect=https://evil.example' },
    { url: 'https://www.netflix.com/title/12345678?affiliate_id=invented' }
  ];
  for (const overrides of invalid) assert.equal(api.contextFor(article({ title_id: 'fixture-title', availability: availability(overrides) }), 'US', 'en', NOW).exact, false, JSON.stringify(overrides));
  assert.equal(api.contextFor(valid, '', 'pt-BR', NOW).exact, false, 'language does not supply a country');
});

test('only reviewed, active official no-cost options survive country and source validation', () => {
  assert.equal(api.validOffers([offer()], 'US', NOW).length, 1);
  assert.equal(api.validOffers([offer()], 'BR', NOW).length, 0);
  const invalid = [
    { type: 'free_trial' }, { type: '50_percent_off' }, { provider: 'invented' }, { country: '' },
    { checked: '2026-10-18' }, { checked: 'invalid' }, { reviewBy: '2026-10-17' }, { reviewBy: '2027-10-17' },
    { url: 'https://pluto.tv.evil.example/us/' }, { sourceUrl: 'https://unverified.example/' },
    { url: 'https://pluto.tv/us/?tag=fake-affiliate' }, { url: 'https://pluto.tv/us/?redirect=https://evil.example' },
    { url: 'javascript:alert(1)' }, { url: 'https://visitor:password@pluto.tv/us/' }
  ];
  for (const overrides of invalid) assert.equal(api.validOffers([offer(overrides)], 'US', NOW).length, 0, JSON.stringify(overrides));
  assert.equal(api.validOffers([offer(), offer()], 'US', NOW).length, 1);
  assert.equal(api.offers.length, 4);
  assert.equal(api.validOffers(api.offers, 'US', NOW).length, 1);
  assert.equal(api.offersMarkup([], 'US', 'en', NOW), '');
  assert.equal(api.offersMarkup(api.offers, 'US', 'en', Date.parse('2026-11-17')), '');
});

test('unknown country never silently shows a foreign offer and published offer wording is honest', () => {
  const unknown = new JSDOM(api.offersMarkup([offer()], '', 'pt', NOW));
  assert.equal(unknown.window.document.querySelectorAll('.ma-news-offer-card').length, 0);
  assert.equal(unknown.window.document.querySelector('select').value, '');
  unknown.window.close();
  const local = new JSDOM(api.offersMarkup([offer()], 'US', 'en', NOW));
  assert.equal(local.window.document.querySelectorAll('.ma-news-offer-card').length, 1);
  assert.match(local.window.document.body.textContent, /Free with ads/);
  assert.match(local.window.document.body.textContent, /Provider details/);
  assert.doesNotMatch(local.window.document.body.textContent, /trial|discount|expires|sponsored|verified available/i);
  assert.equal(local.window.document.querySelector('details').open, false);
  local.window.close();
});

test('all fourteen supported languages have authored context and offer copy', () => {
  const expected = { en: 'Explore Netflix', pt: 'Explorar Netflix', es: 'Explorar Netflix', fr: 'Explorer Netflix', de: 'Netflix entdecken', it: 'Esplora Netflix', tr: 'Netflix kataloğunu keşfet', ru: 'Открыть каталог Netflix', ar: 'استكشف Netflix', hi: 'Netflix पर विकल्प देखें', id: 'Jelajahi Netflix', ja: 'Netflixをチェック', ko: 'Netflix 둘러보기', zh: '浏览Netflix' };
  assert.deepEqual([...api.languages].sort(), Object.keys(expected).sort());
  for (const [lang, label] of Object.entries(expected)) {
    const link = api.contextFor(article(), 'US', lang, NOW);
    assert.equal(link.label, label, lang);
    const markup = api.offersMarkup([offer()], 'US', lang, NOW);
    assert.ok(markup.length > 400, lang);
    assert.doesNotMatch(markup, /undefined|\{(?:provider|country|date)\}/, lang);
    if (lang !== 'en') assert.doesNotMatch(markup, /Local streaming options|Free with ads|Provider details|Choose a country/, lang);
  }
});

test('hydration preserves original article nodes, listeners, advertising markup and stored state', () => {
  const h = harness();
  const originalMarkup = h.original.anchor.outerHTML;
  const saved = Object.fromEntries(Object.keys(h.w.localStorage).map(key => [key, h.w.localStorage.getItem(key)]));
  h.api.hydrate(h.w); h.api.init(h.w);
  assert.equal(h.doc.getElementById('original-source'), h.original.anchor);
  assert.equal(h.doc.getElementById('original-summary'), h.original.summary);
  assert.equal(h.original.anchor.outerHTML, originalMarkup);
  assert.equal(h.doc.getElementById('existing-ad').outerHTML, h.original.ad);
  h.original.anchor.click(); assert.equal(h.calls(), 1);
  assert.equal(h.doc.querySelectorAll('.ma-news-commerce-slot .ma-news-commerce-cta').length, 1);
  assert.equal(h.requests(), 0);
  assert.equal(h.w.adsbygoogle, undefined);
  assert.equal(h.doc.querySelectorAll('script[src], iframe, img').length, 0);
  assert.deepEqual(Object.fromEntries(Object.keys(h.w.localStorage).map(key => [key, h.w.localStorage.getItem(key)])), saved);
  h.dom.window.close();
});

test('explicit language changes translate only the new slot and preserve an open options panel', () => {
  const h = harness();
  const details = h.doc.querySelector('.ma-news-offers'); details.open = true;
  h.w.MATCH_LANG = 'ar'; h.w.localStorage.setItem('match_lang', 'ar');
  h.doc.dispatchEvent(new h.w.CustomEvent('matchapp:langchange', { detail: { lang: 'ar' } }));
  const slot = h.doc.querySelector('[data-news-commerce-slot]');
  assert.equal(slot.dir, 'rtl'); assert.equal(slot.lang, 'ar');
  assert.equal(slot.querySelector('.ma-news-commerce-cta span').textContent, 'استكشف Netflix');
  assert.equal(h.doc.querySelector('.ma-news-offers').open, true);
  assert.equal(h.doc.querySelector('[data-news-offer-country]').value, 'US');
  assert.equal(h.doc.documentElement.lang, 'en', 'existing language management remains authoritative');
  assert.equal(h.doc.getElementById('original-summary').textContent, 'Original summary');
  assert.equal(h.doc.querySelectorAll('.ma-news-offers').length, 1);
  h.dom.window.close();
});

test('country choice in the options carousel is local and never overwrites the app country', () => {
  const h = harness({ country: 'IN' });
  assert.equal(h.doc.querySelectorAll('.ma-news-offer-card').length, 0);
  const select = h.doc.querySelector('[data-news-offer-country]');
  select.value = 'US'; select.dispatchEvent(new h.w.Event('change'));
  assert.equal(h.doc.querySelectorAll('.ma-news-offer-card').length, 1);
  assert.equal(h.w.localStorage.getItem('match_user_region'), 'IN');
  select.value = ''; select.dispatchEvent(new h.w.Event('change'));
  assert.equal(h.doc.querySelectorAll('.ma-news-offer-card').length, 0);
  h.w.MATCH_LANG = 'pt'; h.api.hydrate(h.w);
  assert.equal(h.doc.querySelector('[data-news-offer-country]').value, '', 'an explicitly cleared choice stays clear across language changes');
  assert.equal(h.doc.querySelectorAll('.ma-news-offer-card').length, 0);
  assert.equal(h.requests(), 0);
  h.dom.window.close();
});

test('three official trials require the exact reviewed market, renewal price and eligibility terms', () => {
  const expected = { BR: { amount: 3490, currency: 'BRL', path: 'br' }, MX: { amount: 19900, currency: 'MXN', path: 'mx' }, GB: { amount: 999, currency: 'GBP', path: 'uk' } };
  for (const [country, approved] of Object.entries(expected)) {
    const record = api.offers.find(o => o.country === country);
    assert.ok(Object.isFrozen(record)); assert.ok(Object.isFrozen(record.renewal));
    assert.equal(record.renewal.amount, approved.amount); assert.equal(record.renewal.currency, approved.currency);
    assert.equal(api.validOffers([record], country, NOW).length, 1);
    assert.equal(api.validOffers([record], 'IN', NOW).length, 0);
    assert.equal(api.validOffers([record], country, Date.parse('2026-10-24T00:00:00Z')).length, 0, 'editorial review cutoff removes the claim');
    for (const invalid of [
      { country: 'US' }, { id: 'invented-trial' }, { trialDays: 30 }, { eligibility: 'everyone' }, { cancelHours: 0 },
      { url: record.url + '?tag=unapproved' }, { url: record.url.replace('www.apple.com', 'www.apple.com.evil.example') },
      { sourceUrl: 'https://www.apple.com/in/apple-tv/' }, { termsUrl: 'https://www.apple.com/legal/internet-services/itunes/us/terms.html' },
      { reviewBy: '2026-11-16' }, { renewal: undefined }, { renewal: { ...record.renewal, amount: 1 } },
      { renewal: { ...record.renewal, autoRenew: false } }, { renewal: { ...record.renewal, interval: 'year' } }
    ]) assert.equal(api.validOffers([{ ...record, ...invalid }], country, NOW).length, 0, JSON.stringify(invalid));
    const dom = new JSDOM(api.offersMarkup(api.offers, country, 'en', NOW)), doc = dom.window.document;
    assert.equal(doc.querySelectorAll('.ma-news-offer-card').length, 1);
    assert.equal(doc.querySelector('.ma-news-commerce-cta').href, 'https://www.apple.com/' + approved.path + '/apple-tv/');
    assert.equal(doc.querySelector('.ma-news-offer-source a').href, record.termsUrl);
    assert.match(doc.body.textContent, /7-day free trial/); assert.match(doc.body.textContent, /Eligible new subscribers/);
    assert.match(doc.body.textContent, /Renews automatically until cancelled/); assert.match(doc.body.textContent, /at least 24 hours/);
    assert.match(doc.body.textContent, /separate subscription/); assert.doesNotMatch(doc.body.textContent, /Sponsored|affiliate|expires|available to everyone/);
    dom.window.close();
  }
  assert.equal(api.validOffers(api.offers, 'IN', NOW).length, 0, 'a nearby country or interface language supplies no trial');
});

test('trial disclosures and exact renewal amounts are authored in all fourteen languages', () => {
  for (const lang of api.languages) {
    for (const country of ['BR', 'MX', 'GB']) {
      const record = api.offers.find(o => o.country === country), dom = new JSDOM(api.offersMarkup(api.offers, country, lang, NOW)), doc = dom.window.document;
      const expectedPrice = new Intl.NumberFormat(lang, { style: 'currency', currency: record.renewal.currency, currencyDisplay: 'code', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(record.renewal.amount / 100);
      assert.ok(doc.querySelector('.ma-news-trial-renewal').textContent.includes(expectedPrice), lang + country);
      assert.doesNotMatch(doc.body.textContent, /undefined|\{(?:country|price|provider|date)\}/);
      if (lang !== 'en') assert.doesNotMatch(doc.body.textContent, /7-day free trial|Eligible new subscribers|Renews automatically|Trial terms|separate subscription/);
      assert.equal(doc.querySelectorAll('.ma-news-offer-card--trial').length, 1);
      dom.window.close();
    }
  }
});

test('Kids and unhooked surfaces stay untouched', () => {
  const kids = harness({ route: '/kids/' });
  assert.equal(kids.doc.querySelectorAll('.ma-news-commerce-cta,.ma-news-offers').length, 0);
  kids.dom.window.close();
  const plain = harness({ hooks: false });
  assert.equal(plain.doc.querySelectorAll('.ma-news-commerce-cta,.ma-news-offers').length, 0);
  assert.equal(plain.w.__matchappNewsCommerceStarted, undefined);
  plain.dom.window.close();
});

test('ineligible hooked records and malformed availability cannot manufacture a badge or link', () => {
  const h = harness({ item: article({ description: 'The actor has died.' }) });
  assert.equal(h.doc.querySelector('[data-news-commerce-slot]').childElementCount, 0);
  h.card.dataset.newsDescription = '';
  const invalid = h.doc.createElement('script'); invalid.type = 'application/json'; invalid.dataset.newsAvailability = ''; invalid.textContent = '{bad'; h.card.append(invalid);
  assert.doesNotThrow(() => h.api.hydrate(h.w));
  assert.equal(h.doc.querySelector('[data-availability-checked]'), null);
  assert.equal(h.doc.querySelector('.ma-news-commerce-slot a').getAttribute('href'), 'https://www.netflix.com/');
  h.dom.window.close();
});
