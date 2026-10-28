/* Campaign integration: actual DOM handlers, deterministic clock, private
 * synthetic saves. Real browser layout/audio is checked by the smoke tool. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const core = require('../lumina-match/browser/campaign.js');
const plain = value => JSON.parse(JSON.stringify(value));
const read = file => fs.readFileSync(path.join(ROOT, 'lumina-match/browser', file), 'utf8');

function fixture(t, options = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url: 'https://matchapp.tv/lumina-match/browser/index.html?lang=' + (options.lang || 'en'),
    runScripts: 'outside-only', pretendToBeVisual: true
  });
  t.after(() => dom.window.close());
  const w = dom.window, timeouts = new Map(), intervals = new Map(), messages = [], audioCalls = [];
  let clock = 0, serial = 0, hidden = false;
  Object.defineProperty(w.performance, 'now', { value: () => clock });
  Object.defineProperty(w.document, 'hidden', { get: () => hidden });
  w.setTimeout = (fn, delay = 0) => { const id = ++serial; timeouts.set(id, { fn, at: clock + delay }); return id; };
  w.clearTimeout = id => timeouts.delete(id);
  w.setInterval = fn => { const id = ++serial; intervals.set(id, fn); return id; };
  w.clearInterval = id => intervals.delete(id);
  const parent = options.embedded ? { postMessage(value, origin) { messages.push({ value: plain(value), origin }); } } : w;
  if (options.embedded) Object.defineProperty(w, 'parent', { value: parent });
  const audio = { sound: true, music: true, volume: .45 };
  w.LuminaAudio = {
    unlock() { audioCalls.push(['unlock']); return Promise.resolve(true); },
    setActive(value) { audioCalls.push(['active', value]); },
    setTheme(value) { audioCalls.push(['theme', value]); },
    play(value) { audioCalls.push(['play', value]); },
    getSettings() { return { ...audio }; },
    setSound(value) { audio.sound = value; audioCalls.push(['sound', value]); },
    setMusic(value) { audio.music = value; audioCalls.push(['music', value]); },
    setVolume(value) { audio.volume = value; audioCalls.push(['volume', value]); }
  };
  w.LuminaOnline = { open() {}, destroy() {}, setLanguage() {} };
  w.confirm = () => true;
  for (const [key, value] of Object.entries(options.storage || {})) w.localStorage.setItem(key, value);
  for (const file of ['i18n.js', 'progress-i18n.js', 'campaign-i18n.js', 'campaign.js', 'lumina-game.js']) w.eval(read(file));
  const click = selector => {
    const element = w.document.querySelector(selector);
    assert.ok(element, selector); assert.equal(element.disabled, false, selector + ' is enabled');
    element.click(); return element;
  };
  const advance = ms => {
    clock += ms;
    // Settlement checks the same wall clock as interval ticks, including
    // expiry while the final two cards are still displayed.
    for (const [id, timer] of [...timeouts]) if (timer.at <= clock && timeouts.has(id)) {
      timeouts.delete(id); timer.fn();
    }
    for (const [id, fn] of [...intervals]) if (intervals.has(id)) fn();
  };
  const groups = () => {
    const pairs = new Map();
    for (const element of w.document.querySelectorAll('[data-card]')) {
      const key = element.querySelector('.front').style.backgroundImage;
      if (!pairs.has(key)) pairs.set(key, []);
      pairs.get(key).push(element);
    }
    return [...pairs.values()];
  };
  const clear = () => {
    for (const pair of groups()) if (!pair[0].classList.contains('matched')) {
      pair[0].click(); pair[1].click(); advance(700);
    }
  };
  const snapshot = () => plain(w.LuminaGameProgress.snapshot());
  const stored = () => Object.fromEntries(Array.from({ length: w.localStorage.length }, (_, i) => {
    const key = w.localStorage.key(i); return [key, w.localStorage.getItem(key)];
  }));
  const receive = value => w.dispatchEvent(new w.MessageEvent('message', {
    source: parent, origin: 'https://matchapp.tv', data: value
  }));
  const mode = value => {
    const input = w.document.querySelector('[name="lumina-mode"][value="' + value + '"]');
    assert.ok(input); input.checked = true; input.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  return { w, click, advance, groups, clear, snapshot, stored, receive, mode, audioCalls, audio, timeouts, intervals, messages,
    progress: (mode, extra = {}) => receive({ type: 'lumina:progress-state', mode, ...extra }),
    hide(value) { hidden = value; w.document.dispatchEvent(new w.Event('visibilitychange')); },
    screen: () => w.document.querySelector('#app').dataset.screen };
}

function saveAt(level, overrides = {}) {
  const campaign = core.empty(); campaign.unlocked = level;
  for (let i = 0; i < level - 1; i++) campaign.results[i] = [3, core.config(i + 1).pairs, 12];
  campaign.activeLevel = { level, cards: core.deck(level, () => .4), moves: 0, elapsedSeconds: 0, timed: false, hintsUsed: 0, ...overrides };
  return { version: 2, points: 150, rounds: level - 1, activeRound: null, campaign };
}
const storageFor = progress => ({ luminaBrowserProgressV2: JSON.stringify(progress) });
function accountFixture(t, progress = null, options = {}) {
  const f = fixture(t, { ...options, embedded: true });
  f.progress('account', { progress, revision: 1 });
  return f;
}

test('all 250 levels clear through the real UI, unlock in order and stop at a persisted final completion', t => {
  const f = accountFixture(t); f.click('[data-action="campaign"]');
  let expectedPoints = 0;
  for (let level = 1; level <= 250; level++) {
    assert.equal(f.screen(), 'game', 'level ' + level);
    const config = core.config(level), groups = f.groups();
    assert.equal(groups.length, config.pairs, 'level ' + level + ' pair count');
    assert.ok(groups.every(pair => pair.length === 2), 'every face has exactly two cards');
    assert.equal(f.w.document.querySelector('#app').dataset.theme, config.theme);
    assert.equal(f.snapshot().campaign.activeLevel.level, level);
    f.clear();
    assert.equal(f.screen(), 'campaign-result', 'level ' + level + ' has a reachable result');
    const saved = f.snapshot(), seconds = saved.campaign.results[level - 1][2];
    expectedPoints += 30 + Math.max(0, 30 - Math.floor(seconds / 2)) + (level % 10 === 0 ? 50 : 0);
    assert.equal(saved.points, expectedPoints);
    assert.equal(saved.rounds, level);
    assert.equal(saved.campaign.activeLevel, null, 'no completed active board is saved');
    assert.equal(saved.campaign.unlocked, Math.min(250, level + 1));
    assert.deepEqual(saved.campaign.results[level - 1], [3, config.pairs, seconds]);
    assert.ok(core.normalize(saved.campaign));
    assert.equal(saved.campaign.results.filter(Boolean).length, level);
    assert.deepEqual(f.messages.filter(item => item.value.type === 'lumina:progress-change').at(-1).value.progress, saved);
    assert.deepEqual(f.stored(), {}, 'account progress stays out of browser storage');
    f.messages.length = 0; // Each level's durable payload is already checked.
    if (level < 250) f.click('[data-action="next-level"]');
  }
  assert.match(f.w.document.querySelector('h1').textContent, /250/);
  assert.equal(f.w.document.querySelector('[data-action="next-level"]'), null);
  assert.equal(f.snapshot().campaign.results.reduce((n, value) => n + value[0], 0), 750);
  const final = f.snapshot();
  const reopened = accountFixture(t, final);
  assert.deepEqual(reopened.snapshot(), final);
  reopened.click('[data-action="campaign"]'); assert.equal(reopened.screen(), 'levels');
  assert.equal(reopened.w.document.querySelectorAll('[data-level]').length, 25);
  assert.equal(reopened.w.document.querySelector('[data-action="chapter-next"]').disabled, true);
  assert.equal(reopened.w.document.querySelector('[data-level="250"]').disabled, false);
  assert.equal(reopened.w.document.querySelector('[data-level="251"]'), null);
  reopened.click('[data-level="250"]'); reopened.clear();
  assert.equal(reopened.snapshot().campaign.unlocked, 250);
  assert.equal(reopened.snapshot().campaign.results.filter(Boolean).length, 250);
  assert.equal(reopened.w.document.querySelector('.milestone'), null, 'replay cannot repeat a milestone bonus');
});

test('all ten chapters have 25 levels and locked stages cannot start', t => {
  const f = fixture(t); f.click('[data-action="levels"]');
  assert.equal(f.w.document.querySelector('[data-action="chapter-prev"]').disabled, true);
  const visited = [];
  for (let chapter = 1; chapter <= 10; chapter++) {
    const tiles = [...f.w.document.querySelectorAll('[data-level]')];
    assert.equal(tiles.length, 25);
    for (const tile of tiles) {
      const n = Number(tile.dataset.level); visited.push(n); assert.equal(tile.disabled, n !== 1);
      if (n !== 1) { tile.click(); assert.equal(f.screen(), 'levels'); }
    }
    if (chapter < 10) f.click('[data-action="chapter-next"]');
  }
  assert.deepEqual(visited, Array.from({ length: 250 }, (_, i) => i + 1));
  assert.equal(f.w.document.querySelector('[data-action="chapter-next"]').disabled, true);
});

test('campaign resumes the exact board, time, hints and matches while keeping classic progress', t => {
  const classic = { cards: ['moon','star','planet','heart','crystal','sun'].flatMap(art => [{ art, matched: false }, { art, matched: false }]), moves: 4 };
  const f = accountFixture(t, { points: 40, rounds: 4, activeRound: classic });
  f.mode('timed'); f.click('[data-action="campaign"]');
  const pair = f.groups()[0]; pair[0].click(); pair[1].click(); f.advance(700);
  f.click('[data-action="hint"]'); f.advance(1500); f.advance(8000);
  const expected = f.snapshot();
  assert.equal(expected.campaign.activeLevel.elapsedSeconds, 10);
  assert.equal(expected.campaign.activeLevel.hintsUsed, 1);
  assert.equal(expected.campaign.activeLevel.cards.filter(card => card.matched).length, 2);
  assert.deepEqual(expected.activeRound, classic);
  f.click('[data-action="home"]');
  const reopened = accountFixture(t, expected);
  reopened.click('[data-action="campaign-resume"]');
  assert.deepEqual(reopened.snapshot(), expected);
  assert.equal(reopened.w.document.querySelectorAll('.flipped:not(.matched)').length, 0);
  reopened.click('[data-action="home"]'); reopened.click('[data-action="continue"]');
  assert.deepEqual(reopened.snapshot().activeRound, classic);
  assert.deepEqual(reopened.snapshot().campaign, expected.campaign);
});

test('pause, hidden tabs, page cache and settings preserve time until explicit resume', t => {
  const f = fixture(t); f.mode('timed'); f.click('[data-action="campaign"]'); f.advance(5000);
  f.click('[data-action="pause"]'); f.advance(60000);
  assert.equal(f.snapshot().campaign.activeLevel.elapsedSeconds, 5);
  assert.equal(f.intervals.size, 0);
  assert.ok([...f.w.document.querySelectorAll('[data-card]')].every(el => el.disabled));
  f.click('[data-action="resume"]'); f.advance(1000);
  f.hide(true); f.advance(20000); f.hide(false); f.advance(1000);
  assert.equal(f.snapshot().campaign.activeLevel.elapsedSeconds, 6);
  assert.equal(f.w.document.querySelector('.pause-panel').hidden, false);
  f.click('[data-action="resume"]'); f.advance(2000);
  f.w.dispatchEvent(new f.w.PageTransitionEvent('pagehide', { persisted: true }));
  f.w.dispatchEvent(new f.w.PageTransitionEvent('pageshow', { persisted: true })); f.advance(30000);
  assert.equal(f.snapshot().campaign.activeLevel.elapsedSeconds, 8);
  assert.equal(f.w.document.querySelector('.pause-panel').hidden, false);
  f.click('[data-action="resume"]'); f.click('[data-audio-settings]'); f.advance(60000);
  assert.equal(f.snapshot().campaign.activeLevel.elapsedSeconds, 8);
  assert.ok(f.w.document.querySelector('#lumina-audio-dialog').hasAttribute('open'));
  f.click('[data-close-audio]'); f.advance(2000);
  assert.equal(f.snapshot().campaign.activeLevel.elapsedSeconds, 10);
  f.click('[data-audio-settings]'); f.hide(true); f.click('[data-close-audio]'); f.hide(false); f.advance(1000);
  assert.equal(f.snapshot().campaign.activeLevel.elapsedSeconds, 10, 'closing settings in a hidden tab must not leave a playable frozen clock');
  assert.equal(f.w.document.querySelector('.pause-panel').hidden, false);
  assert.ok(f.audioCalls.some(call => call[0] === 'active' && call[1] === false));
});

test('timed expiry, including the final-pair delay, cannot award a clear and relaxed retry works', t => {
  const progress = saveAt(1, { timed: true, elapsedSeconds: core.config(1).seconds - 1, moves: 3 });
  const lastArt = progress.campaign.activeLevel.cards[0].art;
  for (const card of progress.campaign.activeLevel.cards) card.matched = card.art !== lastArt;
  const f = accountFixture(t, progress); f.click('[data-action="campaign-resume"]');
  const pair = f.groups().find(pair => !pair[0].disabled);
  f.advance(400); pair[0].click(); pair[1].click(); f.advance(700);
  assert.equal(f.screen(), 'defeat'); assert.equal(f.snapshot().points, progress.points);
  assert.equal(f.snapshot().campaign.results[0], null);
  f.click('[data-action="retry-level"]');
  assert.equal(f.snapshot().campaign.activeLevel.moves, 0); assert.equal(f.snapshot().campaign.activeLevel.elapsedSeconds, 0);
  f.advance(core.config(1).seconds * 1000); assert.equal(f.screen(), 'defeat');
  f.click('[data-action="relaxed-level"]'); f.advance(100000);
  assert.equal(f.screen(), 'game'); assert.equal(f.snapshot().campaign.activeLevel.timed, false);
  f.clear(); assert.equal(f.screen(), 'campaign-result');
});

test('three transient hints never auto-match and cap the earned stars at two', t => {
  const f = fixture(t); f.click('[data-action="campaign"]');
  for (let n = 1; n <= 3; n++) {
    f.click('[data-action="hint"]');
    assert.equal(f.w.document.querySelectorAll('.flipped').length, 2);
    assert.equal(f.w.document.querySelectorAll('.matched').length, 0);
    const active = f.snapshot().campaign.activeLevel;
    assert.equal(active.hintsUsed, n); assert.equal(active.moves, 0);
    assert.ok(active.cards.every(card => Object.keys(card).sort().join(',') === 'art,matched'));
    f.advance(1500); assert.equal(f.w.document.querySelectorAll('.flipped').length, 0);
  }
  assert.equal(f.w.document.querySelector('[data-action="hint"]').disabled, true);
  f.clear(); assert.equal(f.snapshot().campaign.results[0][0], 2);
});

test('restart confirmation works inside the sandbox without a browser modal and preserves completed levels', t => {
  const progress = saveAt(3, { moves: 4, elapsedSeconds: 12, hintsUsed: 1 });
  const f = accountFixture(t, progress);
  f.w.confirm = () => { throw Error('Browser modals are unavailable in the production sandbox'); };
  f.click('[data-action="campaign-resume"]'); f.click('[data-action="pause"]');
  f.click('[data-action="restart-level"]');
  assert.equal(f.w.document.querySelector('.restart-confirm').hidden, false);
  assert.equal(f.w.document.activeElement.dataset.action, 'cancel-restart');
  f.click('[data-action="cancel-restart"]'); assert.deepEqual(f.snapshot(), progress);
  f.click('[data-action="restart-level"]');
  f.w.document.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(f.w.document.querySelector('.restart-confirm').hidden, true);
  assert.deepEqual(f.snapshot(), progress);
  f.click('[data-action="restart-level"]'); f.click('[data-action="confirm-restart"]');
  const restarted = f.snapshot();
  assert.equal(restarted.campaign.activeLevel.level, 3); assert.equal(restarted.campaign.activeLevel.moves, 0);
  assert.equal(restarted.campaign.activeLevel.elapsedSeconds, 0); assert.equal(restarted.campaign.activeLevel.hintsUsed, 0);
  assert.deepEqual(restarted.campaign.results, progress.campaign.results); assert.equal(restarted.points, progress.points);
  assert.equal(f.w.document.querySelector('.pause-panel').hidden, true); assert.equal(f.intervals.size, 1);
});

test('guest campaigns remain playable in memory and never persist after closing', t => {
  const f = fixture(t); f.click('[data-action="campaign"]');
  f.w.Storage.prototype.setItem = () => { throw Error('Progress must not use guest storage'); };
  f.clear(); const saved = f.snapshot();
  assert.equal(saved.campaign.activeLevel, null); assert.equal(saved.campaign.unlocked, 2);
  assert.deepEqual(f.stored(), {});
  assert.equal(f.messages.filter(item => item.value.type === 'lumina:progress-change').length, 0);
  f.click('[data-action="home"]');
  assert.equal(f.snapshot().campaign.unlocked, 2, 'guest can continue while the game remains open');
  const reopened = fixture(t, { storage: f.stored() });
  assert.deepEqual(reopened.snapshot(), { points: 0, rounds: 0, activeRound: null });
  assert.equal(reopened.w.document.querySelector('[data-action="campaign-resume"]'), null);
});

test('previous guest snapshots and counters are ignored under registered-only saving', t => {
  const legacy = { points: 42, rounds: 3, activeRound: null };
  const storage = { ...storageFor(saveAt(90)), luminaBrowserProgress: JSON.stringify(legacy), luminaPoints:'42', luminaBrowserRounds:'3' };
  const f = fixture(t, { storage });
  assert.deepEqual(f.snapshot(), { points: 0, rounds: 0, activeRound: null });
  f.click('[data-action="campaign"]'); assert.equal(f.snapshot().campaign.activeLevel.level, 1);
  assert.deepEqual(f.stored(), storage, 'historical browser data is untouched, never reused or replaced');
});

test('guest Save opens a dismissible account prompt; Keep playing resumes and Close without saving returns to MatchApp', t => {
  const f = fixture(t, { embedded: true }); f.progress('guest');
  f.click('[data-action="campaign"]'); f.advance(5000); f.click('[data-save-game]');
  const dialog = f.w.document.querySelector('#lumina-register-dialog');
  assert.ok(dialog.hasAttribute('open'));
  assert.equal(f.w.document.activeElement.dataset.registration, 'create');
  assert.equal(f.intervals.size, 0); f.advance(60000);
  assert.equal(f.snapshot().campaign.activeLevel.elapsedSeconds, 5);
  assert.equal(f.messages.filter(item => item.value.type === 'lumina:progress-change').length, 0);
  assert.deepEqual(f.stored(), {});
  f.click('[data-registration="keep"]'); assert.equal(dialog.hasAttribute('open'), false);
  assert.equal(f.w.document.activeElement.hasAttribute('data-save-game'), true);
  f.advance(1000); assert.equal(f.snapshot().campaign.activeLevel.elapsedSeconds, 6);
  f.click('[data-save-game]');
  f.w.document.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(dialog.hasAttribute('open'), false);
  assert.equal(f.messages.some(item => item.value.type === 'lumina:close'), false);
  f.click('[data-save-game]'); f.click('[data-registration="dismiss"]');
  assert.equal(dialog.hasAttribute('open'), false);
  f.click('[data-save-game]'); f.click('[data-registration="leave"]');
  assert.equal(dialog.hasAttribute('open'), false); assert.equal(f.intervals.size, 0);
  assert.equal(f.messages.at(-1).value.type, 'lumina:close');
  assert.deepEqual(f.stored(), {});
});

test('Create account sends only the current game snapshot through the trusted parent and never claims a save', t => {
  const f = fixture(t, { embedded: true }); f.progress('guest'); f.click('[data-action="campaign"]');
  const pair = f.groups()[0]; pair[0].click(); pair[1].click(); f.advance(700);
  f.click('[data-save-game]'); const expected = f.snapshot(); f.click('[data-registration="create"]');
  assert.deepEqual(f.messages.at(-1), { value: { type: 'lumina:register', progress: expected }, origin: 'https://matchapp.tv' });
  assert.equal(f.messages.filter(item => item.value.type === 'lumina:progress-change').length, 0);
  assert.deepEqual(f.stored(), {}); assert.equal(f.intervals.size, 0);
  assert.doesNotMatch(f.w.document.querySelector('.save-status').textContent, /saved to your account/i);
});

test('registered Save requests an immediate account acknowledgment and never opens a registration prompt', t => {
  const f = accountFixture(t); f.click('[data-action="campaign"]'); f.advance(1000);
  f.click('[data-save-game]');
  const sent = f.messages.at(-1).value;
  assert.equal(sent.type, 'lumina:progress-change'); assert.equal(sent.explicit, true);
  assert.deepEqual(sent.progress, f.snapshot());
  assert.equal(f.w.document.querySelector('#lumina-register-dialog'), null);
  f.progress('saving'); assert.match(f.w.document.querySelector('.save-status').textContent, /Saving/);
  f.progress('saved', { revision: 2 }); assert.match(f.w.document.querySelector('.save-status').textContent, /Saved/);
  assert.deepEqual(f.stored(), {});
});

test('account switches cancel pending campaign work and never reuse historical guest data', t => {
  const guest = saveAt(3), account = saveAt(90);
  const storage = storageFor(guest), f = fixture(t, { embedded: true, storage });
  assert.equal(f.w.document.querySelector('[data-action="campaign"]').disabled, true);
  f.progress('account', { progress: account, revision: 8 });
  f.click('[data-action="campaign-resume"]'); assert.equal(f.groups().length, 13);
  const pair = f.groups()[0]; pair[0].click(); pair[1].click();
  assert.equal(f.timeouts.size, 1);
  f.progress('loading', { progress: null }); f.advance(1000);
  assert.equal(f.screen(), 'home'); assert.equal(f.timeouts.size, 0); assert.equal(f.intervals.size, 0);
  assert.deepEqual(f.snapshot(), { points: 0, rounds: 0, activeRound: null });
  assert.deepEqual(f.stored(), storage);
  f.progress('guest'); assert.deepEqual(f.snapshot(), { points: 0, rounds: 0, activeRound: null });
  const lastAccountWrite = f.messages.filter(item => item.value.type === 'lumina:progress-change').at(-1).value.progress;
  assert.equal(lastAccountWrite.campaign.activeLevel.level, 90);
  assert.equal(lastAccountWrite.campaign.activeLevel.cards.filter(card => card.matched).length, 0);
});

test('account save failures pause campaign input and checkpoint time while acknowledgments preserve play', t => {
  const f = fixture(t, { embedded: true }); f.progress('account', { progress: saveAt(40), revision: 2 });
  f.click('[data-action="campaign-resume"]'); f.advance(16000);
  const checkpoint = f.messages.filter(item => item.value.type === 'lumina:progress-change').at(-1).value.progress;
  assert.equal(checkpoint.campaign.activeLevel.elapsedSeconds, 16);
  const nodes = [...f.w.document.querySelectorAll('[data-card]')];
  nodes[0].click(); f.progress('saving'); f.progress('saved', { revision: 3 });
  assert.deepEqual([...f.w.document.querySelectorAll('[data-card]')], nodes);
  assert.equal(nodes[0].classList.contains('flipped'), true);
  f.progress('offline'); f.advance(60000);
  assert.equal(f.snapshot().campaign.activeLevel.elapsedSeconds, 16);
  assert.ok(nodes.every(node => node.disabled)); assert.equal(f.intervals.size, 0);
  f.click('[data-action="reload-save"]'); f.progress('account', { progress: checkpoint, revision: 3 });
  f.click('[data-action="campaign-resume"]'); assert.equal(f.snapshot().campaign.activeLevel.elapsedSeconds, 16);
});

test('sound/music controls are independent and Escape closes settings before requesting the parent close', async t => {
  const f = fixture(t, { embedded: true }); f.progress('guest'); f.click('[data-action="campaign"]');
  f.click('[data-audio-settings]');
  f.w.LuminaAudio.unlock = () => Promise.resolve(false); // Intentional pause suspends activation.
  const sound = f.w.document.querySelector('#lumina-sound'); sound.checked = false;
  sound.dispatchEvent(new f.w.Event('change', { bubbles: true }));
  f.w.document.querySelector('#lumina-audio-title').click(); await Promise.resolve();
  assert.doesNotMatch(f.w.document.querySelector('.audio-status').textContent, /unavailable/);
  assert.deepEqual(f.audio, { sound: false, music: true, volume: .45 });
  const music = f.w.document.querySelector('#lumina-music'); music.checked = false;
  music.dispatchEvent(new f.w.Event('change', { bubbles: true }));
  const volume = f.w.document.querySelector('#lumina-volume'); volume.value = '20';
  volume.dispatchEvent(new f.w.Event('input', { bubbles: true }));
  assert.deepEqual(f.audio, { sound: false, music: false, volume: .2 });
  f.w.document.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(f.w.document.querySelector('#lumina-audio-dialog').hasAttribute('open'), false);
  assert.equal(f.messages.some(item => item.value.type === 'lumina:close'), false);
  f.w.document.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(f.messages.at(-1).value.type, 'lumina:close');
});

test('all 27 supplied artwork assets retain their recorded original hashes', () => {
  const source = JSON.parse(read('campaign-source.json'));
  assert.equal(Object.keys(source.artwork).length, 27);
  for (const [name, hash] of Object.entries(source.artwork)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'lumina-match/browser', name))).digest('hex'), hash, name);
  }
  assert.equal(core.artwork.length, 24);
  for (const art of core.artwork) assert.ok(source.artwork[core.image(art)]);
});
