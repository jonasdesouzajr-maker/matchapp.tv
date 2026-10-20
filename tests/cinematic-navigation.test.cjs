'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const languages = ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const destinations = {
  home: '/',
  explore: '/explore.html',
  matches: '/#questionnaire-box',
  list: '/profile/profile.html#tab-watchlater',
  profile: '/profile/profile.html'
};

function scene(route = '/', markup = '') {
  const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body>' +
    '<header class="app-header"><a href="/" class="matchapp-brand-link">MatchApp Ai</a>' +
    '<div id="lang-switcher-host"></div></header>' +
    '<main><button id="existing-control" type="button">Existing action</button>' +
    markup + '</main></body></html>', {
      url: 'https://matchapp.tv' + route,
      runScripts: 'outside-only',
      pretendToBeVisual: true
    });
  const w = dom.window;
  Object.defineProperty(w.document, 'readyState', {configurable: true, get: () => 'complete'});
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.matchMedia = () => ({matches: false, addEventListener() {}, removeEventListener() {}});
  w.MATCH_LANG = 'en';
  w.localStorage.setItem('match_lang', 'en');
  w.localStorage.setItem('match_settings', JSON.stringify({theme: 'ocean', fontScale: 1.2, reduceMotion: true}));
  w.localStorage.setItem('match_history', JSON.stringify([{title: 'Original saved title'}]));
  const calls = {existing: 0, portfolio: [], matching: 0};
  w.document.getElementById('existing-control').addEventListener('click', () => calls.existing++);
  w.switchPortfolioTab = tab => calls.portfolio.push(tab);
  w.generateMatch = () => calls.matching++;
  const start = () => w.eval(read('patches/reference-system.js'));
  return {dom, w, calls, start};
}

function dockLinks(w) {
  return [...w.document.querySelectorAll('nav.ma-cinema-dock a[data-cinema-route]')];
}

test('cinematic shell connects every dock action to the real product destination and mounts once', t => {
  const f = scene('/');
  t.after(() => f.dom.window.close());
  const original = f.w.document.getElementById('existing-control');
  const settings = f.w.localStorage.getItem('match_settings');
  const history = f.w.localStorage.getItem('match_history');
  f.start();
  assert.ok(f.w.document.documentElement.classList.contains('ma-reference'));
  assert.ok(f.w.MatchCinemaShell);
  assert.equal(f.w.document.querySelectorAll('nav.ma-cinema-dock').length, 1);
  const nodes = dockLinks(f.w);
  assert.equal(nodes.length, Object.keys(destinations).length);
  for (const link of nodes) {
    assert.equal(link.getAttribute('href'), destinations[link.dataset.cinemaRoute]);
    assert.ok(link.textContent.trim(), link.dataset.cinemaRoute + ' must have a visible label');
  }
  f.start();
  assert.equal(f.w.document.querySelectorAll('nav.ma-cinema-dock').length, 1);
  assert.deepEqual(dockLinks(f.w), nodes, 'a repeat boot must keep existing controls and listeners');
  assert.equal(f.w.document.getElementById('existing-control'), original);
  original.click();
  assert.equal(f.calls.existing, 1);
  assert.equal(f.calls.matching, 0, 'presentation boot must never generate or charge for a match');
  assert.equal(f.w.localStorage.getItem('match_settings'), settings);
  assert.equal(f.w.localStorage.getItem('match_history'), history);
});

test('all fourteen app languages label the same navigation controls without changing destinations', t => {
  const f = scene('/explore.html');
  t.after(() => f.dom.window.close());
  f.start();
  const nodes = dockLinks(f.w);
  const labels = f.w.MatchCinemaShell.labels;
  assert.ok(labels && typeof labels === 'object');
  for (const lang of languages) {
    const row = labels[lang] || (lang === 'pt-BR' && labels.pt);
    assert.ok(row, 'authored dictionary missing for ' + lang);
    assert.ok(Object.values(row).every(value => typeof value === 'string' && value.trim()), lang);
    f.w.MATCH_LANG = lang;
    f.w.localStorage.setItem('match_lang', lang);
    f.w.document.documentElement.lang = lang;
    f.w.document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:langchange', {detail: {lang}}));
    f.w.MatchCinemaShell.paint();
    assert.deepEqual(dockLinks(f.w), nodes, 'locale repaint must preserve the actual anchors');
    for (const link of nodes) {
      assert.equal(link.getAttribute('href'), destinations[link.dataset.cinemaRoute], lang);
      assert.ok(link.textContent.trim(), lang + '/' + link.dataset.cinemaRoute);
      assert.notEqual(link.textContent.trim(), 'undefined', lang);
    }
  }
});

test('compact Home keeps original account and filter handlers while removing redundant renderers', async t => {
  const f=scene('/', '<article id="questionnaire-box"><div id="matchapp-topic-shortcuts"><button id="original-topic" type="button">Movie</button></div>' +
    '<p id="matchapp-topic-description">Choose a topic</p><div class="ma-quick"><button id="original-quick" type="button">Comfort</button></div>' +
    '<div class="q-grid--primary"><div><label>Format</label><select id="q-category"><option value="any">Any</option><option value="movie">Movie</option></select></div></div>' +
    '<details class="match-more-filters"><summary>More filters</summary><select id="q-genre"><option value="Action">Action</option></select></details></article>');
  t.after(()=>f.dom.window.close());
  const w=f.w,header=w.document.querySelector('header');
  w.document.body.classList.add('page-home');header.id='mh-topbox';
  const deck=w.document.createElement('nav');deck.className='mh-deck';
  const action=w.document.createElement('button');action.type='button';action.id='original-account';action.textContent='Account';
  let accountCalls=0,filterCalls=0;
  action.addEventListener('click',()=>accountCalls++);deck.appendChild(action);header.appendChild(deck);
  const shortcuts=w.document.createElement('nav');shortcuts.className='ma-luxe-shortcuts';
  shortcuts.innerHTML='<a data-ma-nav="0" href="/">Home</a><a data-ma-nav="1" href="/discover.html">Talk</a>' +
    '<a data-ma-nav="2" href="/#trending-rail">Trending</a><a data-ma-nav="4" href="/profile/profile.html">Profile</a>' +
    '<a data-ma-nav="5" href="/kids/">Kids</a><a href="/#ma-donate-support">Donate</a>';
  header.appendChild(shortcuts);
  const format=w.document.getElementById('q-category'),genre=w.document.getElementById('q-genre');
  format.addEventListener('change',()=>filterCalls++);format.value='movie';
  f.start();
  await new Promise(resolve=>w.requestAnimationFrame(resolve));
  const tools=header.querySelector('details.ma-cinema-tools');
  assert.ok(tools,'account controls remain in a discoverable native details menu');
  assert.equal(tools.open,false);
  assert.equal(tools.querySelector('.mh-deck'),deck);
  assert.equal(tools.querySelector('.ma-luxe-shortcuts'),shortcuts);
  assert.equal(tools.querySelector('#original-account'),action);
  assert.equal(shortcuts.querySelector('[data-ma-nav="0"],[data-ma-nav="1"],[data-ma-nav="2"],[data-ma-nav="4"]'),null);
  assert.ok(shortcuts.querySelector('[data-ma-nav="5"]'));
  assert.ok(shortcuts.querySelector('a[href="/#ma-donate-support"]'));
  assert.equal(w.document.querySelector('.ma-quick,#matchapp-topic-shortcuts,.ma-cinema-quick-choices'),null);
  assert.equal(w.document.getElementById('q-category'),format);
  assert.equal(w.document.getElementById('q-genre'),genre);
  tools.open=true;
  action.click();format.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(accountCalls,1);assert.equal(filterCalls,1);
  for(const lang of languages){
    w.MATCH_LANG=lang;w.MatchCinemaShell.paint();
    assert.ok(tools.querySelector('summary').textContent.trim());
    assert.equal(w.document.getElementById('original-account'),action);
    assert.equal(w.document.getElementById('q-category'),format);
    assert.equal(format.value,'movie');
  }
  // The existing IA rebuilds its quick panel when a language changes. The
  // draft must remove that duplicate without disturbing the real selectors.
  const rebuilt=w.document.createElement('div');rebuilt.className='ma-quick';
  const rebuiltButton=w.document.createElement('button');rebuiltButton.textContent='Rebuilt choice';
  rebuilt.appendChild(rebuiltButton);w.document.getElementById('questionnaire-box').prepend(rebuilt);
  w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang:'en'}}));
  await new Promise(resolve=>w.setTimeout(resolve,15));
  assert.equal(w.document.querySelector('.ma-quick'),null,'locale rebuild must not restore duplicate fields');
  assert.equal(w.document.getElementById('q-category'),format);assert.equal(format.value,'movie');
  format.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(filterCalls,2);
});

test('profile deep links reveal existing settings and activity details, including their ancestors', t => {
  const f = scene('/profile/profile.html#settings-panel',
    '<details id="outer-settings"><summary>Account</summary>' +
    '<details id="settings-panel"><summary>Settings</summary><input id="set-fontscale" type="range"></details>' +
    '</details><details id="activity-panel"><summary>Activity</summary></details>');
  t.after(() => f.dom.window.close());
  f.start();
  f.w.MatchCinemaShell.revealHash();
  assert.equal(f.w.document.getElementById('settings-panel').open, true);
  assert.equal(f.w.document.getElementById('outer-settings').open, true);
  f.w.history.replaceState({}, '', '/profile/profile.html#activity-panel');
  f.w.dispatchEvent(new f.w.HashChangeEvent('hashchange'));
  assert.equal(f.w.document.getElementById('activity-panel').open, true);
  assert.equal(f.calls.matching, 0);
});

test('My List deep links use the existing portfolio handler and retain saved data', t => {
  const f = scene('/profile/profile.html#tab-watchlater',
    '<button id="tab-watchlater" type="button">Watch later</button>' +
    '<div id="panel-watchlater"></div>');
  t.after(() => f.dom.window.close());
  const handler = f.w.switchPortfolioTab;
  const saved = f.w.localStorage.getItem('match_history');
  f.start();
  f.w.MatchCinemaShell.revealHash();
  assert.ok(f.calls.portfolio.includes('watchlater'));
  assert.equal(f.w.switchPortfolioTab, handler, 'do not replace the portfolio engine');
  assert.equal(f.w.localStorage.getItem('match_history'), saved);
});

test('private, callback and isolated Kids routes do not acquire adult cinema navigation', t => {
  for (const route of ['/kids/', '/kids/example/', '/private-voice/', '/oauth/consent.html',
    '/android-studio/', '/callback.html', '/confirm.html']) {
    const f = scene(route);
    t.after(() => f.dom.window.close());
    f.start();
    assert.equal(f.w.document.querySelector('nav.ma-cinema-dock'), null, route);
    assert.equal(f.w.document.documentElement.classList.contains('ma-reference'), false, route);
  }
});

test('all representative adult page families load the same cinematic presentation entry point', () => {
  for (const file of ['index.html', 'explore.html', 'discover.html', 'profile/profile.html',
    'pricing/pricing.html', 'ebooks/index.html', 'cooking/index.html', 'music.html',
    'news/index.html', 'events-archive.html', 'together.html', 'friends.html',
    'about.html', 'contact.html', 'privacy.html', 'terms.html',
    'guides/worldwide-entertainment-discovery/index.html']) {
    assert.match(read(file), /(?:src|href)=["']\/patches\/reference-system\.js\?/, file);
  }
  assert.match(read('tools/finalize-brand.js'), /(?:reference-system|apply-cinema-design)/,
    'regenerated editorial pages must retain the shared presentation');
});
