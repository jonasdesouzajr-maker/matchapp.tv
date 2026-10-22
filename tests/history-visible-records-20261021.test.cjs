'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const home = new JSDOM(read('index.html'));
const resultMarkup = home.window.document.getElementById('result-box').outerHTML;
home.window.close();
const modules = ['production-hardening.js', 'shown-history.js'];
const tick = () => new Promise(resolve => setTimeout(resolve, 110));

async function setup(t, body = resultMarkup) {
  const dom = new JSDOM('<!doctype html><html lang="en"><body>' + body + '</body></html>', {
    url: 'https://matchapp.tv/', runScripts: 'outside-only'
  });
  const w = dom.window;
  Object.defineProperty(w.document, 'readyState', { value: 'complete', configurable: true });
  // Already-installed optional wrappers keep this fixture about history writes.
  w.askAIConversational = Object.assign(async () => ({ results: [] }), { __integrityPatched: true });
  w.showToast = Object.assign(() => {}, { __freshPatched: true });
  let fetches = 0, matches = 0;
  w.fetch = () => { fetches++; throw new Error('Passive history must not fetch'); };
  w.triggerMatch = () => { matches++; };
  w.localStorage.setItem('match_owned_wallet_test', '{"match":3,"ask":3}');
  w.eval(read('matching-policy.js'));
  await w.matchPolicy.attach(null);
  t.after(() => {
    assert.equal(fetches, 0);
    assert.equal(matches, 0);
    assert.equal(w.localStorage.getItem('match_owned_wallet_test'), '{"match":3,"ask":3}');
    w.close();
  });
  return w;
}

function reveal(w, title) {
  const box = w.document.getElementById('result-box');
  box.hidden = false;
  box.style.display = 'block';
  w.globalMatchTitle = title;
  w.document.getElementById('res-title').textContent = title;
}

for (const module of modules) {
  test(module + ': opening actual Home markup does not create placeholder history or an exclusion', async t => {
    const w = await setup(t);
    assert.equal(w.document.getElementById('res-title').textContent, 'Title');
    assert.equal(w.document.getElementById('result-box').hidden, true);
    w.eval(read(module));
    assert.equal(w.matchPolicy.history().length, 0);
    assert.equal(w.localStorage.getItem('match_history_guest'), '[]');
    assert.equal(w.matchPolicy.known().has('title'), false);
  });

  test(module + ': visible static markup still requires a runtime result identity', async t => {
    const w = await setup(t);
    reveal(w, 'Title');
    delete w.globalMatchTitle;
    w.eval(read(module));
    assert.equal(w.matchPolicy.history().length, 0);
    assert.equal(w.matchPolicy.known().has('title'), false);
  });

  test(module + ': hidden ancestors and absent result containers cannot record stale runtime titles', async t => {
    const variants = [
      '<section hidden><article id="result-box"><h2 id="res-title">Previous result</h2></article></section>',
      '<section style="display:none"><article id="result-box"><h2 id="res-title">Previous result</h2></article></section>',
      '<section style="visibility:hidden"><article id="result-box"><h2 id="res-title">Previous result</h2></article></section>',
      '<section aria-hidden="true"><article id="result-box"><h2 id="res-title">Previous result</h2></article></section>',
      '<h2 id="res-title">Previous result</h2>'
    ];
    for (const body of variants) {
      const w = await setup(t, body);
      w.globalMatchTitle = 'Previous result';
      w.eval(read(module));
      assert.equal(w.matchPolicy.history().length, 0, body);
    }
  });

  test(module + ': a genuine revealed work named Title is recorded once, including after a language repaint', async t => {
    const w = await setup(t);
    reveal(w, 'Title');
    w.eval(read(module));
    assert.deepEqual(Array.from(w.matchPolicy.history(), row => row.title), ['Title']);
    w.document.getElementById('res-title').textContent = 'Localized display name';
    w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
    await tick();
    assert.deepEqual(Array.from(w.matchPolicy.history(), row => row.title), ['Title']);
    assert.equal(w.matchPolicy.known().has('title'), true);
  });

  test(module + ': passive discovery scanning waits until a hidden card is revealed', async t => {
    const w = await setup(t, '<section id="answer" hidden><article class="discover-card"><h3>A real discovery</h3></article></section>');
    w.eval(read(module));
    assert.equal(w.matchPolicy.history().length, 0);
    const answer = w.document.getElementById('answer');
    answer.hidden = false;
    w.document.dispatchEvent(new w.CustomEvent('matchapp:newmatch'));
    await tick();
    assert.deepEqual(Array.from(w.matchPolicy.history(), row => row.title), ['A real discovery']);
  });
}

test('passive scanners preserve existing user history, including a saved work named Title', async t => {
  const w = await setup(t);
  w.matchPolicy.remember({ title: 'Title', posterUrl: 'https://example.test/real-art.jpg' }, 'save');
  w.matchPolicy.remember({ title: 'Another saved work' }, 'seen');
  const before = w.localStorage.getItem('match_history_guest');
  modules.forEach(module => w.eval(read(module)));
  assert.equal(w.localStorage.getItem('match_history_guest'), before);
  assert.equal(w.matchPolicy.history().find(row => row.title === 'Title').action, 'save');
});

test('portfolio imports explicitly identified AI titles while retaining questions in Activity unchanged', async t => {
  const w = await setup(t, '<span id="count-history">0</span><div id="history-list"></div>');
  w.eval(read('activity.js'));
  w.MatchActivity.log('ai', 'Can you suggest a science fiction series?');
  w.MatchActivity.log('ai', 'Dune'); // A title-like prompt is still a question event.
  w.MatchActivity.log('ai', 'A real AI result', { source: 'ask-ai', posterUrl: '' });
  w.matchPolicy.remember({ title: 'A policy AI title?' }, 'ai');
  const activityBefore = w.localStorage.getItem('match_activity');
  const historyBefore = w.localStorage.getItem('match_history_guest');
  w.MatchAppPortfolioPosters = { apply(img, item) { img.alt = item.title; }, bind() {} };
  w.eval(read('portfolio-history.js'));
  assert.deepEqual(new Set(Array.from(w.document.querySelectorAll('.profile-history-card h3'), node => node.textContent)),
    new Set(['A real AI result', 'A policy AI title?']));
  assert.equal(w.document.getElementById('count-history').textContent, '2');
  assert.equal(w.MatchActivity.all().length, 3, 'question entries remain available in Activity');
  assert.equal(w.localStorage.getItem('match_activity'), activityBefore);
  assert.equal(w.localStorage.getItem('match_history_guest'), historyBefore);
});
