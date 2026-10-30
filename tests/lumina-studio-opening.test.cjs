const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..', 'lumina-match', 'browser');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');
const languages = ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];

function fixture(t, options = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"><h1 tabindex="-1">Lumina Match</h1><button id="game-start">Play</button></div></body></html>', {
    url: 'https://matchapp.tv/lumina-match/browser/index.html?lang=' + (options.lang || 'en') + (options.reduced ? '&reducedMotion=1' : ''),
    runScripts: 'outside-only', pretendToBeVisual: true
  });
  t.after(() => dom.window.close());
  const w = dom.window, timers = new Map(), events = [], media = {plays:0, pauses:0, loads:0};
  let now = 0, next = 0, hidden = false;
  Object.defineProperty(w.document, 'hidden', {get: () => hidden});
  Object.defineProperty(w.performance, 'now', {value: () => now});
  w.setTimeout = (fn, ms) => { const id = ++next; timers.set(id, {fn, at: now + ms}); return id; };
  w.clearTimeout = id => timers.delete(id);
  w.matchMedia = () => ({matches:false});
  w.document.getElementById('app').inert = false;
  if (!options.fallback) {
    w.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    w.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new w.Event('close')); };
  }
  w.HTMLMediaElement.prototype.play = function () {
    media.plays++;
    Object.defineProperty(this, 'paused', {configurable:true,value:options.rejectPlay === true});
    return options.rejectPlay ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve();
  };
  w.HTMLMediaElement.prototype.pause = function () {
    media.pauses++; Object.defineProperty(this, 'paused', {configurable:true,value:true});
  };
  w.HTMLMediaElement.prototype.load = function () { media.loads++; };
  const script = w.document.createElement('script');
  if (options.video) script.setAttribute('data-intro-video', options.video);
  Object.defineProperty(w.document, 'currentScript', {get: () => script});
  w.addEventListener('lumina:opening-complete', e => events.push(e.detail.reason));
  w.eval(source('studio-opening.js'));
  function advance(ms) {
    const end = now + ms;
    while (true) {
      const due = [...timers.entries()].filter(([,v]) => v.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]); now = due[1].at; due[1].fn();
    }
    now = end;
  }
  return {w, events, media, timers, advance,
    dialog: () => w.document.getElementById('lumina-studio-opening'),
    skip: () => w.document.querySelector('[data-studio-skip]').click(),
    visibility(value) { hidden = value; w.document.dispatchEvent(new w.Event('visibilitychange')); },
    loadGame() {
      const audio = {unlocks:0, unlock() { this.unlocks++; return Promise.resolve(true); }, setActive(){}, setTheme(){}, play(){}, getSettings(){ return {sound:true,music:true,volume:.45}; }};
      w.LuminaAudio = audio;
      w.LuminaOnline = {destroy(){},open(){},setLanguage(){}};
      for (const name of ['i18n.js','progress-i18n.js','campaign-i18n.js','campaign.js','lumina-game.js']) w.eval(source(name));
      return audio;
    }
  };
}

test('studio credit reveals the existing game once after its finite fade, without animation events', t => {
  const f = fixture(t), app = f.w.document.getElementById('app');
  assert.equal(f.dialog().querySelector('h1').textContent, 'Adv_Dev_Ops by Jonas Junior');
  assert.equal(app.inert, true);
  assert.equal(f.dialog().getAttribute('open'), '');
  assert.equal(f.dialog().dataset.next, 'game');
  f.advance(2599); assert.equal(f.dialog().dataset.stage, 'studio');
  f.advance(1); assert.equal(f.dialog().dataset.stage, 'leaving');
  f.advance(500);
  assert.equal(f.dialog(), null); assert.equal(app.inert, false);
  assert.equal(f.w.document.activeElement, app.querySelector('h1'));
  assert.deepEqual(f.events, ['finished']);
  assert.equal(f.timers.size, 0);
  f.advance(60000); assert.deepEqual(f.events, ['finished']);
  f.w.eval(source('studio-opening.js'));
  assert.equal(f.dialog(), null, 'duplicate loading must not replay an already-finished ident');
});

test('Skip consumes its gesture before game audio and preserves untouched campaign progress', t => {
  const f = fixture(t), audio = f.loadGame();
  const before = JSON.stringify(f.w.LuminaGameProgress.snapshot());
  f.skip();
  assert.equal(audio.unlocks, 0, 'Skip must not activate music beneath an intro video');
  assert.equal(JSON.stringify(f.w.LuminaGameProgress.snapshot()), before);
  assert.equal(f.w.document.getElementById('app').dataset.screen, 'home');
  f.w.document.querySelector('[data-action="campaign"]').click();
  assert.equal(audio.unlocks, 1, 'the next deliberate game click retains the original audio owner');
  assert.equal(f.w.document.getElementById('app').dataset.screen, 'game');
  assert.deepEqual(f.events, ['skipped']);
});

test('all 14 locale controls stay authored while the exact studio identity stays unchanged', t => {
  for (const lang of languages) {
    const f = fixture(t, {lang});
    assert.equal(f.dialog().lang, lang);
    assert.equal(f.dialog().dir, lang === 'ar' ? 'rtl' : 'ltr');
    const text = f.dialog().querySelector('[data-studio-skip]').textContent;
    assert.ok(text.length > 0);
    if (lang !== 'en') assert.notEqual(text, 'Skip', lang);
    assert.equal(f.dialog().querySelector('h1').getAttribute('dir'), 'ltr');
    f.skip();
  }
});

test('only a trusted parent can update the opening language', t => {
  const f = fixture(t);
  const message = (origin, sourceWindow, language) => f.w.dispatchEvent(new f.w.MessageEvent('message', {
    origin, source:sourceWindow, data:{type:'lumina:set-language',language}
  }));
  message('https://untrusted.example', f.w.parent, 'pt-BR');
  assert.equal(f.dialog().lang, 'en');
  message('https://matchapp.tv', {}, 'pt-BR');
  assert.equal(f.dialog().lang, 'en');
  message('https://matchapp.tv', f.w.parent, 'pt-BR');
  assert.equal(f.dialog().querySelector('[data-studio-skip]').textContent, 'Pular');
});

test('reduced motion has an independent readable, bounded handoff', t => {
  const f = fixture(t, {reduced:true});
  f.advance(2799); assert.ok(f.dialog());
  f.advance(1); assert.equal(f.dialog(), null);
  assert.deepEqual(f.events, ['finished']);
});

test('backgrounding pauses the remaining studio time and pagehide cleans every pending callback', t => {
  const f = fixture(t);
  f.advance(1000); f.visibility(true); f.advance(60000);
  assert.equal(f.dialog().dataset.stage, 'studio');
  assert.equal(f.timers.size, 0);
  f.visibility(false); f.advance(1599); assert.equal(f.dialog().dataset.stage, 'studio');
  f.advance(1); assert.equal(f.dialog().dataset.stage, 'leaving');
  f.w.dispatchEvent(new f.w.PageTransitionEvent('pagehide', {persisted:true}));
  assert.equal(f.dialog(), null); assert.equal(f.timers.size, 0);
  f.advance(10000);
  assert.deepEqual(f.events, ['pagehide']);
});

test('Escape and fallback keyboard containment preserve the existing game entry', t => {
  const f = fixture(t, {fallback:true});
  f.w.document.getElementById('game-start').focus();
  assert.equal(f.w.document.activeElement, f.dialog().querySelector('[data-studio-skip]'));
  const escape = new f.w.KeyboardEvent('keydown', {key:'Escape',bubbles:true,cancelable:true});
  f.w.document.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented, true);
  assert.equal(f.dialog(), null); assert.equal(f.w.document.getElementById('app').inert, false);
  f.advance(60000); assert.deepEqual(f.events, ['skipped']);
});

test('only configured same-origin Lumina media follows the ident; completion cannot run twice', t => {
  const f = fixture(t, {video:'/lumina-match/browser/intro.mp4'});
  assert.equal(f.w.document.querySelector('video'), null, 'do not fetch video under the studio screen');
  f.advance(3100);
  const video = f.dialog().querySelector('video');
  assert.equal(f.dialog().dataset.next, 'video');
  assert.equal(video.src, 'https://matchapp.tv/lumina-match/browser/intro.mp4');
  assert.equal(video.muted, false); assert.equal(video.playsInline, true);
  assert.equal(f.media.plays, 1);
  video.dispatchEvent(new f.w.Event('ended'));
  video.dispatchEvent(new f.w.Event('error'));
  f.advance(60000);
  assert.equal(f.dialog(), null); assert.deepEqual(f.events, ['finished']);
  assert.equal(f.media.pauses, 1); assert.equal(f.media.loads, 1);
  assert.equal(video.hasAttribute('src'), false);
  assert.equal(f.timers.size, 0);
});

test('external or unrelated video cannot be silently substituted for the Lumina intro', t => {
  for (const video of ['https://untrusted.example/lumina-match/intro.mp4','/assets/brand/matchapp-launch-intro.mp4','javascript:alert(1)']) {
    const f = fixture(t, {video});
    f.advance(3100);
    assert.equal(f.dialog(), null); assert.equal(f.media.plays, 0);
  }
});

test('blocked unmuted autoplay offers a localized gesture; skipping cancels stale play failures', async t => {
  const f = fixture(t, {video:'/lumina-match/browser/intro.webm',rejectPlay:true,lang:'pt-BR'});
  f.advance(3100); await Promise.resolve();
  const play = f.dialog().querySelector('[data-studio-play]');
  assert.equal(play.hidden, false); assert.equal(play.textContent, 'Reproduzir introdução');
  assert.equal(f.timers.size, 0, 'a user choice must not be dismissed by a load watchdog');
  play.click(); assert.equal(f.media.plays, 2);
  f.skip(); await Promise.resolve();
  assert.equal(f.dialog(), null); assert.deepEqual(f.events, ['skipped']);
  assert.equal(f.timers.size, 0);
});

test('unavailable or stalled media cannot trap startup and video is quiet while backgrounded', t => {
  const failed = fixture(t, {video:'/lumina-match/browser/intro.mp4'});
  failed.advance(3100);
  failed.dialog().querySelector('video').dispatchEvent(new failed.w.Event('error'));
  assert.deepEqual(failed.events, ['media-error']);
  const stalled = fixture(t, {video:'/lumina-match/browser/intro.mp4'});
  stalled.advance(18100);
  assert.equal(stalled.dialog(), null); assert.deepEqual(stalled.events, ['media-timeout']);
  const away = fixture(t, {video:'/lumina-match/browser/intro.mp4'});
  away.advance(3100); away.visibility(true); away.advance(60000);
  assert.ok(away.dialog()); assert.equal(away.media.pauses, 1);
  away.visibility(false);
  assert.equal(away.dialog().querySelector('[data-studio-play]').hidden, false);
  assert.equal(away.media.plays, 1, 'returning from another app must not restart audio unexpectedly');
  away.skip(); assert.equal(away.timers.size, 0);
});

test('a late playing event after background pause cannot hide the resume action or restore audio', t => {
  const f = fixture(t, {video:'/lumina-match/browser/intro.mp4'});
  f.advance(3100);
  const video = f.dialog().querySelector('video');
  video.dispatchEvent(new f.w.Event('playing'));
  assert.equal(f.dialog().querySelector('[data-studio-play]').hidden, true);
  f.visibility(true);
  video.dispatchEvent(new f.w.Event('playing'));
  f.visibility(false);
  assert.equal(video.paused, true);
  assert.equal(f.dialog().querySelector('[data-studio-play]').hidden, false);
  assert.equal(f.media.plays, 1);
  assert.equal(f.timers.size, 0);
  video.dispatchEvent(new f.w.Event('playing'));
  assert.equal(f.dialog().querySelector('[data-studio-play]').hidden, false, 'paused late events stay harmless after returning');
  f.dialog().querySelector('[data-studio-play]').click();
  video.dispatchEvent(new f.w.Event('playing'));
  assert.equal(video.paused, false);
  assert.equal(f.media.plays, 2);
  assert.equal(f.dialog().querySelector('[data-studio-play]').hidden, true);
  f.skip();
});
