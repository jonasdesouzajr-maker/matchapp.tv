'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const {installGuestReservations} = require('./helpers/guest-reservations.cjs');
const {isScreenTitle} = require('../tools/film-tv-shortlists.cjs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const landing = read('patches/landing-match-intent.js');
const discover = read('discover.js');
const languages = ['en', 'pt-BR', 'es', 'fr', 'de', 'it', 'tr', 'ru', 'ar', 'hi', 'id', 'ja', 'ko', 'zh'];
const facets = [
  'moods/intense-and-thrilling', 'moods/inspiring', 'moods/cozy-comfort-watch', 'moods/funny',
  'moods/light-and-feel-good', 'moods/dark-and-gritty', 'moods/epic-and-adventurous',
  'moods/mind-bending', 'moods/heartbreaking', 'moods/romantic', 'moods/nostalgic',
  'collections/movie', 'collections/series', 'collections/k-drama', 'collections/anime',
  'collections/documentary', 'platforms/netflix'
];
function namedFunction(name) {
  const start = discover.indexOf('function ' + name + '(');
  const end = discover.indexOf('\n}\n', start) + 2;
  assert(start >= 0 && end > start, name);
  return discover.slice(discover.slice(start - 6, start) === 'async ' ? start - 6 : start, end);
}
function boot(query = '?landing=moods%2Fcozy-comfort-watch', lang = 'en', initial = '') {
  const dom = new JSDOM('<div id="discover-loading"></div><div id="discover-empty" style="display:none"></div><div id="chat-log"></div><div id="discover-compose-help"></div><textarea id="discover-new-input"></textarea>', {
    url: 'https://matchapp.tv/discover.html' + query, runScripts: 'outside-only'
  });
  const w = dom.window, events = [], field = w.document.getElementById('discover-new-input');
  field.value = initial;
  w.MATCH_LANG = 'en';
  if (lang) w.localStorage.setItem('match_lang', lang);
  w.autoGrowComposer = () => events.push({type: 'resize'});
  w.renderThreadList = () => {};
  w.getQueryParam = name => new w.URLSearchParams(w.location.search).get(name) || '';
  w.showTitleInfoCard = async title => events.push({type: 'title', title});
  w.showMusicVideoInfoCard = async id => {events.push({type: 'video', id}); return true;};
  w.showEventInfoCard = async event => {events.push({type: 'event', event}); return true;};
  w.askAndRender = async (question, options) => {events.push({type: 'request', question, options});};
  w.fetch = () => assert.fail('Landing prefill must not fetch or submit');
  w.checkDailyLimit = () => assert.fail('Landing prefill must not debit');
  w.matchAllowanceBeforeLookup = () => assert.fail('Landing prefill must not invoke matching');
  w.parkDiscoverComposer = () => {};
  w.revealJonasTurn = () => {};
  w.eval('var currentThread=null,DISCOVER_ITEMS=[];');
  w.eval(landing);
  w.eval(namedFunction('runDiscovery'));
  const sendStart = discover.indexOf('window.newDiscoverSearch = function');
  const sendEnd = discover.indexOf('\n};', sendStart) + 3;
  w.eval(discover.slice(sendStart, sendEnd));
  return {dom, w, field, events, close: () => w.close()};
}
function setLanguage(h, lang) {
  h.w.localStorage.setItem('match_lang', lang);
  h.w.MATCH_LANG = lang;
  h.w.document.dispatchEvent(new h.w.CustomEvent('matchapp:langchange', {detail: {lang}}));
}

// Exercise the real submission, both offline recoveries and exclusion/claim
// pipeline. Only paid AI, remote metadata and card presentation are boundaries.
const catalogSource = read('app.js');
const catalog = new Function(catalogSource.slice(catalogSource.indexOf('const CONTENT_CATALOG'), catalogSource.indexOf('const VERTICAL_DRAMA_TITLES')) + ';return CONTENT_CATALOG;')();
async function fallbackBoot(query, lang = 'en', initial = '', items = catalog) {
  const h = boot(query, lang, initial), w = h.w;
  installGuestReservations(w);
  w.CONTENT_CATALOG = items;
  w.eval('var DISCOVER_MAX=6,discoverThreadVersion=0,askInFlight=null,lastDiscoverQuestion="",CHAT_STORE_KEY="match_chatThreads",CHAT_MAX_THREADS=20,discoverCatalogIndex=null,discoverCatalogSize=-1;');
  w.eval(read('matching-policy.js'));
  await w.matchPolicy.ready();
  w.eval(read('cooking/catalog.js'));
  w.matchMedia = () => ({matches: false});
  w.t = key => ({'discover.offlineNote': 'Reviewed catalogue options:', 'discover.aiDown': 'AI is unavailable. Please retry.'}[key] || '');
  w.matchAllowanceBeforeLookup = async () => true;
  w.checkDailyLimit = async () => {h.events.push({type: 'debit'}); return true;};
  w.refreshAiWorkspaceStatus = () => {};
  w.newThreadId = () => 'landing-test-thread';
  w.placeDiscoverComposer = () => {};
  w.startAiWorkflow = () => {};
  w.finishAiWorkflow = () => {};
  w.typewriterReveal = async (el, text) => {el.textContent = text;};
  w.renderResultsInto = async (_grid, items) => {h.events.push({type: 'cards', items}); return items;};
  w.enrichDiscoverMedia = async item => item;
  w.askAIConversational = async question => {h.events.push({type: 'provider', question}); throw Object.assign(new Error('Test outage'), {aiUnavailable: true});};
  w.fetch = async url => {h.events.push({type: 'keyless', url}); return {ok: true, json: async () => ({results: []})};};
  w.eval([
    'mediaIntentQuestion', 'detectAudioIntent', 'detectBookIntent', 'discoverRecommendationRequest',
    'discoverRecoveryText', 'isFactualMediaQuestion', 'stripQuestionWords', 'fallbackSearch',
    'catalogFallbackForQuestion', 'titleKey', 'discoverCatalogEntry', 'isDiscoverDisliked',
    'enrichDiscoverItem', 'discoverExcludedTitles', 'discoverAnswerContainsExcludedTitle',
    'discoverRecommendationSummary', 'prepareDiscoverRecommendations', 'releaseDiscoverClaims',
    'loadThreads', 'saveThreads', 'persistCurrentThread', 'appendUserBubble', 'appendAssistantBubble',
    'runAskAndRender', 'askAndRender'
  ].map(namedFunction).join('\n'));
  h.send = async () => {
    assert.equal(w.newDiscoverSearch(), true);
    assert.equal(h.field.value, '', 'the existing composer is cleared synchronously');
    await w.askInFlight;
    return w.currentThread?.turns.at(-1)?.results || [];
  };
  return h;
}

test('a mood landing pre-fills the actual boot composer without a request, debit or keyboard focus', async () => {
  const h = boot();
  try {
    await h.w.runDiscovery();
    assert.equal(h.field.value, 'Recommend a movie or TV series. Mood: cozy comfort watch. Check availability in my selected country.');
    assert.equal(h.w.document.getElementById('discover-loading').style.display, 'none');
    assert.equal(h.w.document.getElementById('discover-empty').style.display, 'block');
    assert.equal(h.w.document.activeElement, h.w.document.body);
    assert.deepEqual(h.events.map(e => e.type), ['resize']);
    assert.equal(h.w.localStorage.getItem('match_chatThreads'), null);
  } finally {h.close();}
});

test('all 17 film/TV facets have distinct authored prefill for all 14 app languages', async () => {
  for (const facet of facets) {
    const outputs = new Set();
    const h = boot('?landing=' + encodeURIComponent(facet));
    try {
      await h.w.runDiscovery();
      for (const lang of languages) {
        setLanguage(h, lang);
        assert(h.field.value.trim(), facet + ':' + lang);
        assert.doesNotMatch(h.field.value, /undefined|\{title\}/, facet + ':' + lang);
        outputs.add(h.field.value);
        assert.equal(h.events.some(e => e.type === 'request'), false);
      }
    } finally {h.close();}
    assert.equal(outputs.size, languages.length, facet + ' must not silently fall back to English');
  }
});

test('collection and provider choices remain explicit film/TV requests', async () => {
  const cases = [
    ['collections/movie', 'Recommend a movie.'], ['collections/series', 'Recommend a TV series.'],
    ['collections/k-drama', 'Recommend a Korean drama series.'],
    ['collections/anime', 'Recommend an anime film or TV series.'],
    ['collections/documentary', 'Recommend a documentary to watch.'],
    ['platforms/netflix', 'Recommend a movie or TV series on Netflix.']
  ];
  for (const [facet, prefix] of cases) {
    const h = boot('?landing=' + encodeURIComponent(facet));
    try {await h.w.runDiscovery(); assert(h.field.value.startsWith(prefix));}
    finally {h.close();}
  }
});

test('every localized landing prompt reaches the existing recommendation gate, with and without a reference title', async () => {
  const picks = JSON.parse(read('tools/film-tv-shortlists.json')).pages;
  for (const facet of facets) {
    for (const title of ['', ...picks[facet].map(pick => pick.title)]) {
      const h = boot('?landing=' + encodeURIComponent(facet) + (title ? '&like=' + encodeURIComponent(title) : ''));
      try {
        h.w.eval(read('cooking/catalog.js'));
        h.w.eval(['mediaIntentQuestion', 'detectAudioIntent', 'detectBookIntent', 'discoverRecommendationRequest'].map(namedFunction).join('\n'));
        await h.w.runDiscovery();
        for (const lang of languages) {
          setLanguage(h, lang);
          const question = h.field.value;
          const label = facet + ':' + lang + ':' + title;
          assert.equal(h.w.discoverRecommendationRequest(question), true, label + ' must apply recommendation exclusions');
          assert.equal(h.w.detectBookIntent(question), false, label + ' must not become a reading request');
          assert.equal(h.w.detectAudioIntent(question), false, label + ' must not become an audio request');
          assert.equal(h.w.MatchCooking.isCooking(question), false, label + ' must not become a recipe request');
          if (title) assert(question.includes(title), label + ' must preserve the reference title');
        }
      } finally {h.close();}
    }
  }
});

test('a reference title containing a negative clause cannot disable the preceding recommendation request', async () => {
  const title = 'Do Not Recommend Movies; Who Is Afraid?';
  const h = boot('?landing=collections%2Fseries&like=' + encodeURIComponent(title));
  try {
    h.w.eval(['mediaIntentQuestion', 'discoverRecommendationRequest'].map(namedFunction).join('\n'));
    await h.w.runDiscovery();
    for (const lang of languages) {
      setLanguage(h, lang);
      assert(h.field.value.includes(title));
      assert.equal(h.w.discoverRecommendationRequest(h.field.value), true, lang);
    }
  } finally {h.close();}
});

test('documentary landing requests retain their title context in general discovery instead of the TV-only resolver', async () => {
  const picks = JSON.parse(read('tools/film-tv-shortlists.json')).pages['collections/documentary'];
  for (const title of ['', ...picks.map(pick => pick.title)]) {
    const h = boot('?landing=collections%2Fdocumentary' + (title ? '&like=' + encodeURIComponent(title) : ''));
    try {
      h.w.eval(read('cooking/catalog.js'));
      h.w.eval(read('jonas/verified-documentary-series-20261011.js'));
      h.w.eval(['mediaIntentQuestion', 'detectBookIntent', 'detectAudioIntent', 'discoverRecommendationRequest'].map(namedFunction).join('\n'));
      await h.w.runDiscovery();
      for (const lang of languages) {
        setLanguage(h, lang);
        const question = h.field.value;
        assert.equal(h.w.discoverRecommendationRequest(question), true, lang);
        assert.equal(h.w.MatchAppVerifiedDocumentaries.matches(question), false, lang + ' must retain the reference in general discovery');
        assert.equal(h.w.detectBookIntent(question), false, lang);
        assert.equal(h.w.detectAudioIntent(question), false, lang);
        assert.equal(h.w.MatchCooking.isCooking(question), false, lang);
        if (title) assert(question.includes(title));
      }
    } finally {h.close();}
  }
});

test('a visitor can still explicitly choose documentary TV series through the existing verified resolver', async () => {
  const h = boot('?landing=collections%2Fdocumentary&like=' + encodeURIComponent("Chef's Table"));
  try {
    h.w.eval(read('jonas/verified-documentary-series-20261011.js'));
    await h.w.runDiscovery();
    for (const question of ['Recommend documentary TV series available in Brazil.', 'Recomende séries documentais disponíveis para assistir no Brasil.']) {
      h.field.value = question;
      h.field.dispatchEvent(new h.w.Event('input', {bubbles: true}));
      setLanguage(h, 'pt-BR');
      assert.equal(h.field.value, question);
      assert.equal(h.w.MatchAppVerifiedDocumentaries.matches(h.field.value), true);
    }
  } finally {h.close();}
});

test('saved Portuguese wins over ambient language and preserves exact Unicode title plus mood', async () => {
  const title = 'Amélie & 千と千尋の神隠し — $& “café”';
  const h = boot('?landing=moods%2Flight-and-feel-good&like=' + encodeURIComponent(title) + '&lang=de', 'pt');
  try {
    h.w.MATCH_LANG = 'ja';
    await h.w.runDiscovery();
    assert.equal(h.field.value, 'Recomende um filme ou uma série de TV. Clima: leve e alto-astral. Encontre algo parecido com “' + title + '”. Confira a disponibilidade no país que selecionei.');
    assert.equal(h.w.document.querySelectorAll('textarea').length, 1);
    assert.equal(h.w.localStorage.getItem('match_lang'), 'pt');
  } finally {h.close();}
});

test('untouched prompt follows language hydration and cross-tab language changes', async () => {
  const h = boot('?landing=moods%2Fromantic&like=Am%C3%A9lie', null);
  try {
    await h.w.runDiscovery();
    const english = h.field.value;
    setLanguage(h, 'fr');
    assert(h.field.value.startsWith('Recommande-moi'));
    assert(h.field.value.includes('Amélie'));
    h.w.localStorage.setItem('match_lang', 'ar');
    h.w.dispatchEvent(new h.w.StorageEvent('storage', {key: 'match_lang', newValue: 'ar'}));
    assert(h.field.value.startsWith('اقترح'));
    setLanguage(h, 'en');
    assert.equal(h.field.value, english);
    assert.equal(h.events.some(e => e.type === 'request'), false);
  } finally {h.close();}
});

test('editing or dictating a request makes the visitor the sole owner of its text', async () => {
  for (const eventType of ['input', 'change']) {
    const h = boot();
    try {
      await h.w.runDiscovery();
      h.field.value = 'My own request, including a country and a different mood.';
      h.field.dispatchEvent(new h.w.Event(eventType, {bubbles: true}));
      setLanguage(h, 'pt-BR');
      assert.equal(h.field.value, 'My own request, including a country and a different mood.');
      assert.equal(h.w.MatchAppLandingIntent.apply(), false);
    } finally {h.close();}
  }
});

test('pre-existing drafts and programmatic edits are never overwritten', async () => {
  const h = boot(undefined, 'en', 'Existing draft');
  try {await h.w.runDiscovery(); assert.equal(h.field.value, 'Existing draft'); setLanguage(h, 'es'); assert.equal(h.field.value, 'Existing draft');}
  finally {h.close();}
  const next = boot();
  try {
    await next.w.runDiscovery();
    next.field.value = 'Text inserted by the existing speech owner';
    setLanguage(next, 'ja');
    assert.equal(next.field.value, 'Text inserted by the existing speech owner');
  } finally {next.close();}
});

test('the existing send action receives the complete mood/title prompt exactly once', async () => {
  const h = boot('?landing=moods%2Ffunny&like=' + encodeURIComponent('Derry Girls'));
  try {
    await h.w.runDiscovery();
    const prompt = h.field.value;
    assert.equal(h.w.newDiscoverSearch(), true);
    assert.equal(h.events.filter(e => e.type === 'request').length, 1);
    assert.equal(h.events.find(e => e.type === 'request').question, prompt);
    assert(prompt.includes('Mood: funny.') && prompt.includes('Derry Girls'));
    assert.equal(h.field.value, '');
    setLanguage(h, 'pt-BR');
    assert.equal(h.field.value, '', 'a sent question must not be silently restored');
    assert.equal(h.events.filter(e => e.type === 'request').length, 1);
  } finally {h.close();}
});

test('actual submit captures cozy/light intent before clearing the composer and keeps offline recovery on that mood', async () => {
  for (const [slug, mood] of [['cozy-comfort-watch', 'cozy comfort watch'], ['light-and-feel-good', 'light and feel-good']]) {
    for (const lang of ['en', 'pt-BR']) {
      const h = await fallbackBoot('?landing=moods%2F' + slug, lang);
      try {
        setLanguage(h, lang);
        await h.w.runDiscovery();
        const question = h.field.value;
        const rows = await h.send();
        assert(rows.length > 0, slug + ':' + lang);
        assert(rows.every(row => row.moods.includes(mood) && isScreenTitle(row)));
        assert(!rows.some(row => ['The Bear', 'Shogun', 'Dune: Part Two'].includes(row.title)));
        assert.equal(h.events.filter(event => event.type === 'provider').length, 1);
        assert.equal(h.events.find(event => event.type === 'provider').question, question);
        assert.equal(h.events.some(event => ['keyless', 'debit'].includes(event.type)), false);
        assert.equal(h.w.MatchAppLandingIntent.capture(question), null, 'a cleared composer cannot claim a later request');
        assert(!JSON.stringify(h.w.currentThread).includes('landingContext'), 'internal context is not persisted');
      } finally {h.close();}
    }
  }
});

test('all landing facet classes narrow real catalogue recovery by existing tags in every app language', async () => {
  for (const facet of facets) {
    const h = await fallbackBoot('?landing=' + encodeURIComponent(facet));
    try {
      await h.w.runDiscovery();
      let expected;
      for (const lang of languages) {
        setLanguage(h, lang);
        const context = h.w.MatchAppLandingIntent.capture(h.field.value);
        assert(context && Object.isFrozen(context), facet + ':' + lang);
        if (!expected) expected = JSON.stringify(context);
        assert.equal(JSON.stringify(context), expected, 'language does not change the selected facet');
        const rows = h.w.catalogFallbackForQuestion(h.field.value, context);
        if (facet === 'platforms/netflix') {
          assert.equal(rows.length, 0, 'local provider labels are not regional availability evidence');
          continue;
        }
        assert(rows.length > 0, facet + ':' + lang);
        assert(rows.every(isScreenTitle), facet + ':' + lang);
        assert(rows.every(row => !context.mood || row.moods.includes(context.mood)), facet + ':' + lang);
        assert(rows.every(row => !context.category || row.cats.includes(context.category)), facet + ':' + lang);
      }
    } finally {h.close();}
  }
});

test('exact mood tags do not bypass the existing comfort guard or turn topic-tagged audio/channels into films', async () => {
  const items = [
    {title: 'Heavy secondary tag', cats: ['movie'], moods: ['intense and thrilling', 'cozy comfort watch']},
    {title: 'Topic tagged channel', cats: ['documentary', 'YouTube channel'], moods: ['cozy comfort watch']},
    {title: 'Mixed audio format', cats: ['movie', 'podcast'], moods: ['cozy comfort watch']},
    {title: 'Unclassified work', cats: ['Classical Music'], moods: ['cozy comfort watch']},
    {title: 'Calm screen work', cats: ['short film'], moods: ['cozy comfort watch']}
  ];
  const h = await fallbackBoot('?landing=moods%2Fcozy-comfort-watch', 'en', '', items);
  try {
    await h.w.runDiscovery();
    const rows = await h.send();
    assert.deepEqual(Array.from(rows, row => row.title), ['Calm screen work']);
  } finally {h.close();}
});

test('reference-title and Netflix submissions fail closed through both offline sources without charging', async () => {
  for (const query of [
    '?landing=moods%2Fcozy-comfort-watch&like=Midnight%20Diner',
    '?landing=collections%2Fmovie&like=Am%C3%A9lie',
    '?landing=collections%2Fdocumentary&like=Chef%27s%20Table',
    '?landing=platforms%2Fnetflix'
  ]) {
    const h = await fallbackBoot(query);
    try {
      await h.w.runDiscovery();
      const question = h.field.value;
      assert.equal(h.w.MatchAppLandingIntent.capture(question).requiresLive, true);
      const rows = await h.send();
      assert.equal(rows.length, 0, query);
      assert.equal(h.events.find(event => event.type === 'provider').question, question);
      assert.equal(h.events.some(event => ['keyless', 'debit', 'cards'].includes(event.type)), false);
      assert.equal(h.w.matchPolicy.history().length, 0);
      assert(h.w.currentThread.turns.at(-1).text.includes('unavailable'));
    } finally {h.close();}
  }
});

test('the late card recovery also preserves the facet, taste exclusions and closed reference/platform cases', async () => {
  const start = discover.indexOf('    if (preparedRecommendations===null && !bookIntent && wantsTitleRecommendations && !newItems.length');
  const end = discover.indexOf('\n    DISCOVER_ITEMS = DISCOVER_ITEMS.concat(newItems);', start);
  assert(start > 0 && end > start);
  const lateBlock = discover.slice(start, end);
  for (const query of [
    '?landing=moods%2Fcozy-comfort-watch',
    '?landing=collections%2Fmovie',
    '?landing=moods%2Fcozy-comfort-watch&like=Midnight%20Diner',
    '?landing=platforms%2Fnetflix'
  ]) {
    const h = await fallbackBoot(query);
    try {
      // Normal title requests now prepare recommendations before this legacy
      // block. Exercise its actual source in the empty/unprepared state while
      // retaining the real synchronous submit capture and policy functions.
      h.w.eval('function testLateRecovery(question,opts){var preparedRecommendations=null,bookIntent=false,wantsTitleRecommendations=true,newItems=[],musicPayload=null,payload={_live:false};' + lateBlock + ';return newItems;}');
      await h.w.runDiscovery();
      const context = h.w.MatchAppLandingIntent.capture(h.field.value);
      const eligible = catalog.filter(row => isScreenTitle(row) &&
        (!context.mood || row.moods.includes(context.mood)) &&
        (!context.category || row.cats.includes(context.category)));
      const excluded = eligible.slice(0, 2).map(row => row.title);
      h.w.matchPolicy.savePreference(eligible[0], 'dislike');
      h.w.tasteAllowsEntry = row => row.title !== excluded[1];
      let rows;
      h.w.runAskAndRender = async (question, options) => {rows = h.w.testLateRecovery(question, options);};
      assert.equal(h.w.newDiscoverSearch(), true);
      assert.equal(h.field.value, '');
      await h.w.askInFlight;
      assert.equal(h.events.some(event => ['provider', 'keyless', 'debit'].includes(event.type)), false);
      if (context.requiresLive) assert.equal(rows.length, 0);
      else {
        assert(rows.length > 0, query);
        assert(rows.every(row => h.w.MatchAppLandingIntent.allowsFallback(context, row)));
        assert(!rows.some(row => excluded.includes(row.title)));
      }
    } finally {h.close();}
  }
});

test('landing recovery retains source-identity, saved, seen, disliked, blocked and taste exclusions', async () => {
  const entry = (title, id) => ({title, year: 2020, cats: ['movie'], moods: ['cozy comfort watch'], _catalogMedia: {tmdb_id: id, media_kind: 'movie'}});
  const items = ['Saved alias', 'Disliked work', 'Seen work', 'Blocked work', 'Taste excluded work', 'Fresh work'].map((title, i) => entry(title, 900 + i));
  const h = await fallbackBoot('?landing=moods%2Fcozy-comfort-watch', 'en', '', items);
  try {
    h.w.matchPolicy.savePreference(entry('Original saved name', 900), 'save');
    h.w.matchPolicy.savePreference(items[1], 'dislike');
    h.w.matchPolicy.remember(items[2], 'shown');
    h.w.isBlockedEntry = row => row.title === 'Blocked work';
    h.w.tasteAllowsEntry = row => row.title !== 'Taste excluded work';
    await h.w.runDiscovery();
    const question = h.field.value, context = h.w.MatchAppLandingIntent.capture(question);
    assert.deepEqual(Array.from(h.w.catalogFallbackForQuestion(question, context), row => row.title), ['Fresh work']);
    const rows = await h.send();
    assert.deepEqual(Array.from(rows, row => row.title), ['Fresh work']);
    assert(h.w.matchPolicy.history().some(row => row.title === 'Fresh work'));
    h.w.tasteAllowsEntry = () => false;
    assert.equal(h.w.catalogFallbackForQuestion(question, context).length, 0, 'empty eligibility cannot widen to unrelated rows');
    assert.equal(h.events.some(event => event.type === 'debit'), false);
  } finally {h.close();}
});

test('ordinary, edited and pre-existing requests retain their existing keyless and catalogue recovery', async () => {
  const question = 'Recommend a movie.';
  let baseline;
  for (const mode of ['ordinary', 'pre-existing', 'input edit', 'programmatic edit']) {
    const h = await fallbackBoot(mode === 'ordinary' ? '' : '?landing=moods%2Fcozy-comfort-watch', 'en', ['ordinary', 'pre-existing'].includes(mode) ? question : '');
    try {
      await h.w.runDiscovery();
      if (mode.includes('edit')) {
        h.field.value = question;
        if (mode === 'input edit') h.field.dispatchEvent(new h.w.Event('input', {bubbles: true}));
      }
      assert.equal(h.w.MatchAppLandingIntent.capture(question), null, mode);
      const rows = await h.send();
      assert.equal(h.events.filter(event => event.type === 'keyless').length, 2, mode);
      const titles = Array.from(rows, row => row.title);
      if (!baseline) baseline = titles;
      assert.deepEqual(titles, baseline, mode);
    } finally {h.close();}
  }
});

test('live landing requests still use the existing AI response, claim and single debit without fallback filtering', async () => {
  const h = await fallbackBoot('?landing=platforms%2Fnetflix&like=Am%C3%A9lie');
  try {
    const helper = h.w.MatchAppLandingIntent;
    h.w.MatchAppLandingIntent = {...helper, allowsFallback: () => assert.fail('A successful live response must retain its existing pipeline')};
    h.w.askAIConversational = async question => {h.events.push({type: 'provider', question}); return {answer: 'A new title to explore.', results: [{title: 'Fresh live film', type: 'movie', cats: ['movie']}], _live: true};};
    await h.w.runDiscovery();
    const question = h.field.value;
    const rows = await h.send();
    assert.deepEqual(Array.from(rows, row => row.title), ['Fresh live film']);
    assert.equal(h.events.find(event => event.type === 'provider').question, question);
    assert.equal(h.events.filter(event => event.type === 'debit').length, 1);
    assert.equal(h.events.some(event => event.type === 'keyless'), false);
    assert.equal(h.w.currentThread.turns.at(-1).text, 'A new title to explore.');
    assert(h.w.matchPolicy.history().some(row => row.title === 'Fresh live film'));
  } finally {h.close();}
});

test('existing title, event, video and q routes retain their current precedence', async () => {
  const cases = [
    ['title=Spirited%20Away', 'title', 'title', 'Spirited Away'],
    ['event=%2Fevents%2Ffilm-festival%2F', 'event', 'event', '/events/film-festival/'],
    ['video=release123', 'video', 'id', 'release123'],
    ['q=Who%20directed%20Am%C3%A9lie%3F', 'request', 'question', 'Who directed Amélie?']
  ];
  for (const [query, type, key, expected] of cases) {
    const h = boot('?landing=moods%2Fromantic&like=Other&' + query);
    try {
      await h.w.runDiscovery();
      assert.equal(h.events.filter(e => e.type === type).length, 1);
      assert.equal(h.events.find(e => e.type === type)[key], expected);
      assert.equal(h.field.value, '');
      assert.equal(h.w.MatchAppLandingIntent.apply(), false);
    } finally {h.close();}
  }
});

test('new-chat requests and invalid/unrelated landing parameters leave the ordinary composer alone', async () => {
  const queries = [
    '', '?like=Amelie', '?landing=moods%2Fmissing', '?landing=collections%2Fpodcast',
    '?landing=platforms%2Fspotify', '?landing=__proto__', '?landing=moods%2Fromantic%2Fextra',
    '?landing=moods%2Ffunny&landing=moods%2Fromantic', '?landing=moods%2Ffunny&like=One&like=Two',
    '?landing=moods%2Ffunny&like=' + 'a'.repeat(301), '?landing=moods%2Ffunny&like=Title%00bad',
    '?landing=moods%2Ffunny&new=1'
  ];
  for (const query of queries) {
    const h = boot(query);
    try {
      await h.w.runDiscovery();
      assert.equal(h.field.value, '', query);
      assert.equal(h.events.length, 0, query);
    } finally {h.close();}
  }
});

test('literal markup in a reference title is plain editable text and never becomes DOM', async () => {
  const h = boot('?landing=moods%2Fromantic&like=' + encodeURIComponent('<img src=x onerror=alert(1)>'));
  try {
    await h.w.runDiscovery();
    assert(h.field.value.includes('<img src=x onerror=alert(1)>'));
    assert.equal(h.w.document.querySelector('img'), null);
    assert.equal(h.w.document.querySelector('script'), null);
  } finally {h.close();}
});

test('unavailable storage still uses the existing selected app language without writing it', async () => {
  const h = boot();
  try {
    Object.defineProperty(h.w, 'localStorage', {get() {throw new Error('Storage unavailable');}});
    h.w.MATCH_LANG = 'it';
    await h.w.runDiscovery();
    assert(h.field.value.startsWith('Consigliami'));
  } finally {h.close();}
});

test('the handoff helper loads before discover boot and only the changed script receives its new cache pin', () => {
  const html = read('discover.html');
  const dom = new JSDOM(html);
  try {
    const scripts = [...dom.window.document.querySelectorAll('script[src]')];
    const helper = scripts.findIndex(n => n.getAttribute('src').startsWith('/patches/landing-match-intent.js?'));
    const main = scripts.findIndex(n => n.getAttribute('src').startsWith('/discover.js?'));
    assert(helper >= 0 && helper < main);
    assert.equal(new URL(scripts[main].src, 'https://matchapp.tv').searchParams.get('landing'), '20261020-1');
    assert.equal(scripts.filter(n => n.getAttribute('src').startsWith('/patches/landing-match-intent.js?')).length, 1);
  } finally {dom.window.close();}
});
