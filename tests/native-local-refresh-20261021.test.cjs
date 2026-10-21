const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const adapter = fs.readFileSync('patches/native-local-refresh.js', 'utf8');
const portfolio = fs.readFileSync('portfolio-history.js', 'utf8');
const activity = fs.readFileSync('activity.js', 'utf8');

function setup(t, body, path = '/profile/profile.html?tab=history#portfolio') {
  const dom = new JSDOM(body, { url: 'https://matchapp.tv' + path, runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window;
  Object.defineProperty(w.document, 'readyState', { value: 'complete', configurable: true });
  w.scrollTo = (x, y) => { w.scrollX = x; w.scrollY = y; };
  w.scrollTo(0, 340);
  w.fetch = () => { throw new Error('A local refresh must not fetch or debit'); };
  w.eval(adapter);
  return w;
}

function result(value) { return JSON.parse(JSON.stringify(value)); }

test('refresh keeps current results, route, filters, language and chat/profile drafts when no read-only loader exists', async t => {
  const w = setup(t, '<select id="country"><option selected>BR</option></select><textarea id="draft">Keep my next question</textarea><article id="result">My selected title</article><input id="profile-name" value="Unsaved name">', '/discover.html?mood=comfort&country=BR#result');
  const before = w.document.body.innerHTML;
  const url = w.location.href;
  const draft = w.document.querySelector('#draft');
  draft.focus();
  draft.setSelectionRange(3, 7);
  w.localStorage.setItem('match_lang', 'pt-BR');
  w.matchPolicy = { refresh() { throw new Error('Must not mutate match history'); } };
  w.findMatch = () => { throw new Error('Must not generate or debit a match'); };
  assert.deepEqual(result(await w.MatchAppLocalRefresh.refresh({ reason: 'manual-update' })), { refreshed: false, kind: 'unchanged' });
  assert.equal(w.document.body.innerHTML, before);
  assert.equal(w.location.href, url);
  assert.equal(w.document.activeElement, draft);
  assert.equal(draft.selectionStart, 3);
  assert.equal(draft.selectionEnd, 7);
  assert.equal(w.localStorage.getItem('match_lang'), 'pt-BR');
  assert.equal(w.scrollY, 340);
});

test('real portfolio renderer refreshes local records without resetting its selected tab or drafts, changing storage or emitting broad events', async t => {
  const w = setup(t, '<button id="tab-history" class="active">History</button><div id="panel-history"><span id="count-history">0</span><div id="history-list"></div></div><input id="profile-name" value="Unsaved"><textarea id="chat-draft">Still typing</textarea>');
  let policyRecords = [{ title: 'First title', action: 'save', addedAt: 1 }];
  let tabCalls = 0, historyEvents = 0;
  w.matchPolicy = { history: () => policyRecords, refresh: () => { throw new Error('Mutating sync forbidden'); } };
  w.MatchActivity = { all: () => [{ detail: 'Second title', type: 'match', ts: 2 }] };
  w.MatchAppPortfolioPosters = { apply: (img, item) => { img.alt = item.title; }, bind() {} };
  w.switchPortfolioTab = () => { tabCalls++; };
  w.document.addEventListener('matchapp:historychange', () => { historyEvents++; });
  w.localStorage.setItem('match_savedList', '[{"title":"First title"}]');
  const saved = w.localStorage.getItem('match_savedList');
  w.eval(portfolio);
  assert.equal(tabCalls, 1);
  policyRecords = [...policyRecords, { title: 'Third title', action: 'seen', addedAt: 3 }];
  const host = w.document.getElementById('history-list');
  host.scrollTop = 91;
  const url = w.location.href;
  const draft = w.document.getElementById('chat-draft');
  draft.focus();
  assert.deepEqual(result(await w.MatchAppLocalRefresh.refresh({ reason: 'manual-update' })), { refreshed: true, kind: 'local-history' });
  assert.deepEqual(Array.from(host.querySelectorAll('h3'), node => node.textContent), ['Third title', 'Second title', 'First title']);
  assert.equal(w.document.getElementById('count-history').textContent, '3');
  assert.equal(w.document.getElementById('profile-name').value, 'Unsaved');
  assert.equal(draft.value, 'Still typing');
  assert.equal(w.document.activeElement, draft);
  assert.equal(w.document.getElementById('tab-history').className, 'active');
  assert.equal(host.scrollTop, 91);
  assert.equal(w.scrollY, 340);
  assert.equal(w.location.href, url);
  assert.equal(w.localStorage.getItem('match_savedList'), saved);
  assert.equal(historyEvents, 0);
  assert.equal(tabCalls, 1, 'the refresh must not invoke portfolio init or tab selection');
});

test('inactive, busy or currently focused History stays intact', async t => {
  const w = setup(t, '<div id="panel-history" style="display:none"><div id="history-list"><button id="remove">Remove</button></div></div>');
  let calls = 0;
  w.MatchAppPortfolioHistory = { refresh() { calls++; return true; } };
  assert.equal((await w.MatchAppLocalRefresh.refresh()).kind, 'unchanged');
  w.document.getElementById('panel-history').style.display = 'block';
  w.document.getElementById('remove').focus();
  assert.equal((await w.MatchAppLocalRefresh.refresh()).kind, 'unchanged');
  w.document.getElementById('remove').blur();
  w.document.getElementById('history-list').setAttribute('aria-busy', 'true');
  assert.equal((await w.MatchAppLocalRefresh.refresh()).kind, 'unchanged');
  w.document.getElementById('history-list').removeAttribute('aria-busy');
  w.document.getElementById('remove').disabled = true;
  assert.equal((await w.MatchAppLocalRefresh.refresh()).kind, 'unchanged');
  assert.equal(calls, 0);
});

test('renderer failure retains visible records, their event handlers, count and scroll, and does not claim success', async t => {
  const w = setup(t, '<span id="count-history">1</span><div id="history-list"><button id="saved">Original record</button></div>');
  const host = w.document.getElementById('history-list');
  const saved = w.document.getElementById('saved');
  let clicked = 0;
  saved.addEventListener('click', () => { clicked++; });
  host.scrollTop = 52;
  w.MatchAppPortfolioHistory = { refresh() {
    host.replaceChildren();
    w.document.getElementById('count-history').textContent = '0';
    host.scrollTop = 0;
    w.scrollTo(0, 0);
    throw new Error('Artwork renderer unavailable');
  } };
  assert.deepEqual(result(await w.MatchAppLocalRefresh.refresh()), { refreshed: false, kind: 'unavailable' });
  assert.equal(host.firstChild, saved, 'restore original nodes, not clones that lose handlers');
  saved.click();
  assert.equal(clicked, 1);
  assert.equal(w.document.getElementById('count-history').textContent, '1');
  assert.equal(host.scrollTop, 52);
  assert.equal(w.scrollY, 340);
});

test('repeated refresh taps share one Promise and renderer invocation; a declined loader is unchanged', async t => {
  const w = setup(t, '<div id="history-list">Retained</div>');
  let calls = 0;
  w.MatchAppPortfolioHistory = { refresh() { calls++; return false; } };
  const first = w.MatchAppLocalRefresh.refresh({ reason: 'manual-update' });
  const second = w.MatchAppLocalRefresh.refresh({ reason: 'manual-update' });
  assert.equal(first, second);
  assert.deepEqual(result(await first), { refreshed: false, kind: 'unchanged' });
  assert.equal(calls, 1);
  assert.equal(w.document.getElementById('history-list').textContent, 'Retained');
  await w.MatchAppLocalRefresh.refresh();
  assert.equal(calls, 2);
  const api = w.MatchAppLocalRefresh;
  w.eval(adapter);
  assert.equal(w.MatchAppLocalRefresh, api, 'duplicate loading must not replace the singleton');
});

test('real activity renderer rereads local history and preserves selected filter without writing records', async t => {
  const w = setup(t, '<select id="activity-filter"><option value="">All</option><option value="save" selected>Saved</option></select><span id="activity-count"></span><div id="activity-list"></div>');
  const records = [{ type: 'save', ts: 2, detail: 'Saved title' }, { type: 'match', ts: 1, detail: 'Other matched title' }];
  w.localStorage.setItem('match_activity', JSON.stringify(records));
  w.eval(activity);
  const original = w.localStorage.getItem('match_activity');
  assert.deepEqual(result(await w.MatchAppLocalRefresh.refresh()), { refreshed: true, kind: 'local-activity' });
  assert.equal(w.document.getElementById('activity-filter').value, 'save');
  assert.equal(w.document.querySelectorAll('.activity-row').length, 1);
  assert.match(w.document.getElementById('activity-list').textContent, /Saved title/);
  assert.doesNotMatch(w.document.getElementById('activity-list').textContent, /Other matched title/);
  assert.equal(w.localStorage.getItem('match_activity'), original);
});

test('Kids and incomplete portfolio dependencies have no adult refresh side effects', async t => {
  const w = setup(t, '<div id="history-list">Keep this view</div>', '/kids/');
  let calls = 0;
  w.MatchAppPortfolioHistory = { refresh() { calls++; return true; } };
  assert.equal((await w.MatchAppLocalRefresh.refresh()).kind, 'unchanged');
  assert.equal(calls, 0);

  const adult = setup(t, '<div id="history-list"></div>');
  adult.MatchAppPortfolioPosters = { apply() {}, bind() {} };
  adult.eval(portfolio);
  adult.document.getElementById('history-list').textContent = 'Previously loaded record';
  assert.equal(adult.MatchAppPortfolioHistory.refresh(), false);
  assert.equal(adult.document.getElementById('history-list').textContent, 'Previously loaded record');
});
