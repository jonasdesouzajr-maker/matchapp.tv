'use strict';
/* Local-only smoke for Lumina's real browser document. No real account, credential,
 * production backend, ad SDK, APK, emulator or paid service is used here.
 *
 * Run: node tools/lumina-campaign-smoke.cjs
 * Optional: LUMINA_SMOKE_OUTPUT=/tmp/lumina-review
 * Focused rerun: --section=sandbox | --section=launcher | --section=registration
 *               --section=layout --widths=320,1440
 * Use PLAYWRIGHT_BROWSERS_PATH if the installed browser cache is nondefault.
 *
 * Chromium runs its native Web Audio implementation with normal autoplay
 * policy. A test-only constructor wrapper records buffers/source lifetimes and
 * inserts a transparent analyser before the device destination. PCM/waveform
 * evidence is not a claim that a person heard sound on a physical device.
 * Visibility fallback, when needed in headless Chromium, is explicitly marked
 * as a controlled lifecycle event, not a real OS/background-tab transition.
 */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const {chromium} = require('playwright');
const campaign = require('../lumina-match/browser/campaign.js');

const ROOT = path.resolve(__dirname,'..');
const GAME = path.join(ROOT,'lumina-match/browser');
const PREFIX = '/lumina-match/browser/';
const HARNESS = '/__lumina-smoke__/parent.html';
const ACCOUNT_FIXTURE = '/__lumina-smoke__/account.html';
const LAUNCHER_HARNESS = '/__lumina-smoke__/launcher.html';
const selectedSection = process.argv.find(arg => arg.startsWith('--section='))?.slice(10) || 'all';
assert(['all','audio','layout','sandbox','launcher','registration'].includes(selectedSection),'Unknown --section');
const selectedWidths = (process.argv.find(arg => arg.startsWith('--widths='))?.slice(9) || '320,390,820,1440').split(',').map(Number);
assert(selectedWidths.length > 0 && selectedWidths.every(width => [320,390,820,1440].includes(width)),'Invalid --widths');
const OUTPUT = process.env.LUMINA_SMOKE_OUTPUT ? path.resolve(process.env.LUMINA_SMOKE_OUTPUT) : fs.mkdtempSync(path.join(os.tmpdir(),'lumina-campaign-smoke-'));
fs.mkdirSync(OUTPUT,{recursive:true});
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.mp3':'audio/mpeg','.svg':'image/svg+xml'};
const requests = [];
const report = {
  scope:'Actual local Lumina document, launcher and assets. Guests are session-only; advanced boards use a trusted local parent with synthetic account progress. No real account or authenticated/production request.',
  evidence:'Native Chromium Web Audio rendering with test-only graph/PCM observation. No human listening or physical-device claim.',
  startedAt:new Date().toISOString(), playwright:require('playwright/package.json').version,section:selectedSection,widths:selectedWidths,
  checks:[], layouts:[], musicProfiles:[], lifecycle:[], errors:[], screenshots:[], output:OUTPUT
};
const server = http.createServer((req,res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname); }
  catch (_) { res.writeHead(400).end(); return; }
  if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
  if (pathname === ACCOUNT_FIXTURE) {
    const level = Number(new URL(req.url,'http://127.0.0.1').searchParams.get('level'));
    if (!Number.isInteger(level) || level < 1 || level > 250) { res.writeHead(400).end(); return; }
    res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-store'});
    res.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic account board fixture</title>
      <style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0f0c1d}iframe{display:block;border:0;width:100%;height:100dvh}</style>
      <script>
      window.__fixtureProgress=${JSON.stringify(fixture(level))};
      window.addEventListener('message',event=>{
        const frame=document.querySelector('iframe');
        if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
        if(event.data?.type==='lumina:ready')frame.contentWindow.postMessage({type:'lumina:progress-state',mode:'account',progress:window.__fixtureProgress},location.origin);
        if(event.data?.type==='lumina:progress-change'){
          window.__fixtureProgress=event.data.progress;
          frame.contentWindow.postMessage({type:'lumina:progress-state',mode:'saved'},location.origin);
        }
      });
      </script><iframe title="Synthetic account Lumina fixture" sandbox="allow-scripts allow-same-origin" src="${PREFIX}index.html?lang=en"></iframe></html>`);
    return;
  }
  if (pathname === LAUNCHER_HARNESS) {
    res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-store'});
    res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local actual Lumina launcher</title>
      <style>html,body{margin:0;min-height:100%;font-family:system-ui;background:#0f0c1d;color:#fff}main{padding:20px}.home-hero{text-align:center}button{font:inherit}#main-auth-modal{position:fixed;inset:20px;z-index:2000;flex-direction:column;gap:20px;align-items:center;justify-content:center;background:#261b37}#main-auth-modal button,#main-auth-modal input{min-height:44px}</style>
      <link rel="stylesheet" href="/lumina-match/lumina.css">
      <script>
      // Test-owned in-memory account transport only. No account is created,
      // no token leaves this document, and every external request is blocked.
      window.__testAccount={session:null,record:{revision:0,progress:null},calls:[]};
      window.supabaseClient={
        auth:{getSession:async()=>({data:{session:window.__testAccount.session},error:null})},
        rpc:(_name,input)=>({setHeader(){return this;},abortSignal(){return this;},then(resolve,reject){
          const fixture=window.__testAccount;
          fixture.calls.push({action:input.p_action,revision:input.p_payload.revision});
          if(input.p_action==='progress'&&fixture.progressGate){
            fixture.progressEntered=true;
            const response={data:structuredClone(fixture.record),error:null};
            return fixture.progressGate.then(()=>response).then(resolve,reject);
          }
          let error=null;
          if(input.p_action==='save_progress'){
            if(input.p_payload.revision!==fixture.record.revision)error={message:'LUMINA_CONFLICT'};
            else fixture.record={revision:fixture.record.revision+1,progress:structuredClone(input.p_payload.progress)};
          }
          return Promise.resolve({data:structuredClone(fixture.record),error}).then(resolve,reject);
        }})
      };
      window.openAuthModal=()=>{document.getElementById('main-auth-modal').style.display='flex';};
      window.switchAuthTab=tab=>{document.getElementById('main-auth-modal').dataset.tab=tab;};
      window.closeAuthModal=()=>{document.getElementById('main-auth-modal').style.display='none';};
      window.addEventListener('DOMContentLoaded',()=>{
        document.getElementById('auth-cancel').onclick=window.closeAuthModal;
        document.getElementById('auth-complete').onclick=()=>{
          window.__testAccount.session={access_token:'local-fixture-token-never-transmitted',user:{id:'00000000-0000-4000-8000-000000000001',is_anonymous:false}};
          document.dispatchEvent(new Event('matchapp:authchange'));
          if(window.__testAccount.closeAuthEarly)window.closeAuthModal();
        };
      });
      </script>
      <script defer src="/lumina-match/launcher.js"></script></head>
      <body class="page-home"><main><header class="home-hero"><h1>MatchApp Ai local test host</h1></header><p>Actual Lumina launcher, modal, game module and assets. No real account or backend connection.</p></main>
      <section id="main-auth-modal" style="display:none" role="dialog" aria-label="Synthetic registration fixture"><h2>Local registration stand-in</h2><label>Fixture email field <input id="reg-email" type="email"></label><button id="auth-cancel">Cancel registration</button><button id="auth-complete">Simulate account readiness</button></section></body></html>`);
    return;
  }
  if (pathname === HARNESS) {
    res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-store'});
    res.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local Lumina guest harness</title>
      <style>html,body{margin:0;background:#0f0c1d;color:#fff;font-family:system-ui}button{min-height:44px;margin:4px;padding:8px 16px}iframe{display:block;width:100%;height:calc(100dvh - 52px);border:0}</style>
      <button id="open">Play Lumina Match</button><button id="close" hidden>Close game</button><main id="mount"></main>
      <script type="module">
      import {mountGame} from '/lumina-match/game.mjs';
      // A null session is a local guest fixture; this client cannot issue RPCs.
      window.supabaseClient={auth:{getSession:async()=>({data:{session:null},error:null})}};
      const open=document.getElementById('open'),close=document.getElementById('close'),mount=document.getElementById('mount');
      let dispose;
      function closeGame(){
        const probe=mount.querySelector('iframe')?.contentWindow?.__luminaAudioProbe;
        dispose?.();dispose=null;
        window.__closedFrame={probe:probe?.snapshot(),remainingFrames:mount.querySelectorAll('iframe').length};
        open.hidden=false;close.hidden=true;open.focus();
      }
      open.addEventListener('click',()=>{
        open.hidden=true;close.hidden=false;
        dispose=mountGame(mount,{language:()=> 'en',close:closeGame,onError:error=>{throw error;}});
      });
      close.addEventListener('click',closeGame);
      </script></html>`);
    return;
  }
  const parentModules = ['/lumina-match/game.mjs','/lumina-match/friends-bridge.mjs','/lumina-match/progress-bridge.mjs','/lumina-match/launcher.js','/lumina-match/lumina.css'];
  let file;
  if (parentModules.includes(pathname)) file = path.join(ROOT,pathname);
  else {
    if (!pathname.startsWith(PREFIX)) { res.writeHead(404).end(); return; }
    file = path.resolve(GAME,pathname.slice(PREFIX.length) || 'index.html');
    if (!file.startsWith(GAME + path.sep)) { res.writeHead(403).end(); return; }
  }
  let stat;
  try { stat = fs.statSync(file); if (!stat.isFile()) throw new Error('not a file'); }
  catch (_) { requests.push({path:pathname,status:404}); res.writeHead(404).end(); return; }
  requests.push({path:pathname,status:200,bytes:stat.size});
  res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store'});
  const stream = fs.createReadStream(file); stream.on('error',() => res.destroy()); stream.pipe(res);
});

function check(label,condition,detail) {
  const entry = {label,ok:!!condition};
  if (detail !== undefined) entry.detail = detail;
  report.checks.push(entry);
  console.log((condition ? 'PASS ' : 'FAIL ') + label);
  assert(condition,label + (detail === undefined ? '' : ': ' + JSON.stringify(detail)));
}
function fixture(level) {
  return {version:2,points:150,rounds:15,activeRound:null,campaign:{
    unlocked:level,results:Array.from({length:250},(_,i) => i < level-1 ? [3,20,60] : null),
    activeLevel:{level,cards:campaign.deck(level,() => 0.375),moves:0,elapsedSeconds:0,timed:false,hintsUsed:0}
  }};
}

// This function is serialized into isolated local test pages only. It neither
// replaces native rendering/decoding nor accesses the game's private variables.
function installAudioProbe() {
  const Native = window.AudioContext || window.webkitAudioContext;
  const contexts = [], sourceRecords = [], buffers = [], decodes = [], bufferIds = new WeakMap();
  const emit = entry => { try { window.__luminaLifecycle?.(entry)?.catch?.(() => {}); } catch (_) {} };
  function inspectBuffer(buffer) {
    if (bufferIds.has(buffer)) return bufferIds.get(buffer);
    let energy = 0, peak = 0, finite = true, signature = 2166136261;
    for (let channel=0;channel<buffer.numberOfChannels;channel++) {
      const pcm = buffer.getChannelData(channel);
      for (let i=0;i<pcm.length;i++) {
        const sample = pcm[i]; finite = finite && Number.isFinite(sample);
        energy += sample*sample; peak = Math.max(peak,Math.abs(sample));
        if (i%997 === 0) signature = Math.imul(signature ^ Math.round(sample*1e7),16777619) >>> 0;
      }
    }
    const item = {id:buffers.length+1,duration:buffer.duration,sampleRate:buffer.sampleRate,channels:buffer.numberOfChannels,
      frames:buffer.length,rms:Math.sqrt(energy/(buffer.length*buffer.numberOfChannels)),peak,finite,signature:signature.toString(16)};
    buffers.push(item); bufferIds.set(buffer,item); return item;
  }
  function snapshot() {
    return {
      contexts:contexts.map(record => ({id:record.id,state:record.context.state,currentTime:record.context.currentTime,
        createdDuringGesture:record.createdDuringGesture,resumeCalls:record.resumeCalls,suspendCalls:record.suspendCalls,closeCalls:record.closeCalls,
        states:record.states.slice(),outputConnections:record.outputConnections})),
      buffers:buffers.map(item => ({...item})),decodes:decodes.map(item => ({...item})),
      sources:sourceRecords.map(item => ({id:item.id,context:item.owner.id,kind:item.kind,loop:item.loop,buffer:item.buffer,
        startAt:item.startAt,stopAt:item.stopAt,ended:item.ended,disconnected:item.disconnected,
        active:item.started && !item.ended && !item.disconnected && item.owner.context.state !== 'closed' &&
          item.startAt <= item.owner.context.currentTime && item.stopAt > item.owner.context.currentTime}))
    };
  }
  function wrapContext(context) {
    const record = {id:contexts.length+1,context,createdDuringGesture:!!navigator.userActivation?.isActive,
      resumeCalls:0,suspendCalls:0,closeCalls:0,states:[context.state],outputConnections:0};
    contexts.push(record);
    const analyser = context.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0;
    analyser.connect(context.destination); record.analyser = analyser;
    context.addEventListener('statechange',() => record.states.push(context.state));
    for (const method of ['resume','suspend','close']) {
      const native = context[method].bind(context);
      context[method] = (...args) => {
        record[method+'Calls']++;
        const result = native(...args);
        if (method === 'close') emit({kind:'native-context-close',state:context.state,probe:snapshot()});
        return result;
      };
    }
    const createGain = context.createGain.bind(context);
    context.createGain = (...args) => {
      const gain = createGain(...args), nativeConnect = gain.connect.bind(gain);
      gain.connect = (target,...ports) => {
        if (target === context.destination) { record.outputConnections++; nativeConnect(analyser,...ports); return target; }
        return nativeConnect(target,...ports);
      };
      return gain;
    };
    for (const [method,kind] of [['createBufferSource','buffer'],['createOscillator','oscillator']]) {
      const create = context[method].bind(context);
      context[method] = (...args) => {
        const source = create(...args);
        const item = {id:sourceRecords.length+1,owner:record,kind,started:false,ended:false,disconnected:false,
          loop:false,buffer:null,startAt:0,stopAt:Infinity};
        sourceRecords.push(item);
        const start = source.start.bind(source), stop = source.stop.bind(source), disconnect = source.disconnect.bind(source);
        source.start = (...params) => {
          item.started = true; item.startAt = params[0] || context.currentTime; item.loop = !!source.loop;
          if (source.buffer) item.buffer = inspectBuffer(source.buffer).id;
          return start(...params);
        };
        source.stop = (...params) => { item.stopAt = params[0] || context.currentTime; return stop(...params); };
        source.disconnect = (...params) => { item.disconnected = true; return disconnect(...params); };
        source.addEventListener('ended',() => { item.ended = true; });
        return source;
      };
    }
    const decode = context.decodeAudioData.bind(context);
    context.decodeAudioData = (data,success,failure) => {
      const inputBytes = data.byteLength, copy = data.slice(0);
      const digest = crypto.subtle.digest('SHA-256',copy).then(value => Array.from(new Uint8Array(value),n => n.toString(16).padStart(2,'0')).join(''));
      let recorded = false;
      function done(buffer) {
        if (!recorded) {
          recorded = true;
          const item = {inputBytes,buffer:inspectBuffer(buffer).id,sha256:null}; decodes.push(item);
          digest.then(hash => { item.sha256 = hash; });
        }
        return buffer;
      }
      const result = decode(data,buffer => { done(buffer); success?.(buffer); },failure);
      result?.then(done,() => {});
      return result;
    };
    return context;
  }
  if (Native) {
    class ObservedAudioContext extends Native { constructor(...args) { super(...args); wrapContext(this); } }
    window.AudioContext = ObservedAudioContext;
    if (window.webkitAudioContext) window.webkitAudioContext = ObservedAudioContext;
  }
  window.__luminaAudioProbe = {
    snapshot,
    async waveform(milliseconds=240) {
      let peak = 0, energy = 0, count = 0, finite = true;
      const until = performance.now()+milliseconds;
      while (performance.now() < until) {
        for (const record of contexts) {
          const pcm = new Float32Array(record.analyser.fftSize); record.analyser.getFloatTimeDomainData(pcm);
          for (const sample of pcm) { finite = finite && Number.isFinite(sample); peak = Math.max(peak,Math.abs(sample)); energy += sample*sample; count++; }
        }
        await new Promise(resolve => setTimeout(resolve,20));
      }
      return {rms:count ? Math.sqrt(energy/count) : 0,peak,finite,samples:count,contextStates:contexts.map(item => item.context.state)};
    }
  };
}

async function preparePage(browser,base,viewport,seed,probe=false) {
  const context = await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:viewport.width<=820,locale:'en-US'});
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const fatal = [], badRequests = [], remote = [];
  page.on('pageerror',error => fatal.push(error.message));
  page.on('response',response => { if (response.status() >= 400) badRequests.push({url:response.url(),status:response.status()}); });
  await page.route('**/*',route => {
    const url = new URL(route.request().url());
    if (url.origin === base || url.protocol === 'data:') return route.continue();
    remote.push(url.origin+url.pathname); return route.abort('blockedbyclient');
  });
  if (probe) {
    await page.exposeBinding('__luminaLifecycle',(_source,entry) => { report.lifecycle.push(entry); });
    await page.addInitScript(installAudioProbe);
  }
  await page.goto(base+(seed ? ACCOUNT_FIXTURE+'?level='+seed.campaign.activeLevel.level : PREFIX+'index.html?lang=en'),{waitUntil:'networkidle'});
  const game = seed ? page.frames().find(frame => frame.url().includes(PREFIX)) : page;
  assert(game,'The actual game document loaded');
  await game.locator('#app[data-screen="home"] .journey-play').waitFor();
  if (seed) await game.locator('.journey-play').waitFor({state:'visible'});
  return {page:game,outerPage:page,context,fatal,badRequests,remote};
}
async function finishPage(run,label) {
  check(label+' has no JavaScript errors, missing assets or external requests',
    run.fatal.length === 0 && run.badRequests.length === 0 && run.remote.length === 0,
    {errors:run.fatal,missing:run.badRequests,external:run.remote});
  await run.context.close();
}
async function screenshot(page,name) {
  const file = path.join(OUTPUT,name+'.png');
  const surface = typeof page.screenshot === 'function' ? page : page.page();
  await surface.screenshot({path:file,fullPage:true}); report.screenshots.push(file);
}
async function geometry(page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const rect = el => { const b=el.getBoundingClientRect(); return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}; };
    const cards = Array.from(document.querySelectorAll('[data-card]'),el => ({index:Number(el.dataset.card),...rect(el)}));
    const controls = Array.from(document.querySelectorAll('button:not([data-card]),.mode-options label,.audio-setting'))
      .filter(el => !el.closest('dialog:not([open])') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
      .map(el => ({action:el.dataset.action || el.getAttribute('data-level') || el.textContent.trim().slice(0,48),...rect(el)}));
    const overflows = Array.from(document.querySelectorAll('.screen,.header,.grid,.level-grid,.audio-toolbar,dialog[open],button'))
      .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
      .map(el => ({tag:el.tagName,classes:el.className,...rect(el)})).filter(b => b.x < -1 || b.right > width+1);
    return {width,innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
      screen:document.getElementById('app').dataset.screen,theme:document.getElementById('app').dataset.theme,cards,controls,overflows};
  });
}
function assertGeometry(label,data,expectedCards) {
  check(label+' fits the viewport',data.documentWidth <= data.width+1 && data.bodyWidth <= data.width+1 && data.overflows.length === 0,data);
  check(label+' has usable 44px controls',data.controls.every(item => item.width >= 43.5 && item.height >= 43.5),data.controls);
  if (expectedCards !== undefined) {
    check(label+' has every card and 44px tap targets',
      data.cards.length === expectedCards && data.cards.every(item => item.width >= 43.5 && item.height >= 43.5 && item.x >= -1 && item.right <= data.width+1),
      {count:data.cards.length,expected:expectedCards,minWidth:Math.min(...data.cards.map(item => item.width)),minHeight:Math.min(...data.cards.map(item => item.height))});
    check(label+' preserves the original 3:4 portrait card shape',data.cards.every(item => Math.abs(item.width/item.height-0.75) < 0.005),
      data.cards.map(item => ({index:item.index,width:item.width,height:item.height,ratio:item.width/item.height})));
  }
  report.layouts.push({label,...data});
}
const probeSnapshot = page => page.evaluate(() => window.__luminaAudioProbe.snapshot());
const activeSources = state => state.sources.filter(source => source.active);
const loops = state => activeSources(state).filter(source => source.loop);
const effectStarts = state => state.sources.filter(source => !source.loop && source.startAt !== undefined).length;
async function running(page) {
  await page.waitForFunction(() => window.__luminaAudioProbe.snapshot().contexts.some(context => context.state === 'running'));
}
async function suspended(page) {
  await page.waitForFunction(() => window.__luminaAudioProbe.snapshot().contexts.every(context => context.state === 'suspended'));
}
async function settings(page,desired) {
  await page.locator('[data-audio-settings]').click();
  for (const name of ['sound','music']) if (Object.hasOwn(desired,name)) await page.locator('#lumina-'+name).setChecked(desired[name]);
  await page.locator('[data-close-audio]').click();
}
async function firstUnmatched(page) {
  return page.locator('[data-card]:not(.matched)').first();
}

async function audioSmoke(browser,base) {
  const run = await preparePage(browser,base,{width:390,height:844},null,true), page = run.page;
  try {
    check('Audio creates no context before a player gesture',(await probeSnapshot(page)).contexts.length === 0);
    check('Audio makes no MP3 request before a player gesture',requests.filter(item => item.path.endsWith('.mp3')).length === 0);
    await page.locator('.journey-play').click(); await running(page);
    await page.waitForFunction(() => window.__luminaAudioProbe.snapshot().decodes.filter(item => item.sha256).length === 2);
    await page.waitForTimeout(800); // Let the bounded level-start chime finish before measuring music alone.
    let state = await probeSnapshot(page);
    check('A real Play click creates one native running AudioContext',state.contexts.length === 1 && state.contexts[0].createdDuringGesture && state.contexts[0].state === 'running',state.contexts);
    check('Exactly one music loop feeds one audio output',loops(state).length === 1 && state.contexts[0].outputConnections === 1,state.sources);
    const music = state.buffers.find(item => item.id === loops(state)[0].buffer);
    check('Music is finite non-silent 24-second stereo PCM',music.duration === 24 && music.channels === 2 && music.finite && music.rms > 0.03 && music.peak < 0.95,music);
    const waveform = await page.evaluate(() => window.__luminaAudioProbe.waveform(320));
    check('Native Chromium renders a non-silent music waveform after the gesture',waveform.finite && waveform.rms > 0.002 && waveform.peak < 0.95,waveform);
    report.musicProfiles.push({theme:'starlight',pcm:music,waveform});
    const originals = ['flip','match'].map(name => ({name,bytes:fs.readFileSync(path.join(GAME,'sounds',name+'.mp3'))}));
    for (const asset of originals) {
      const hash = crypto.createHash('sha256').update(asset.bytes).digest('hex');
      const decoded = state.decodes.find(item => item.sha256 === hash), buffer = decoded && state.buffers.find(item => item.id === decoded.buffer);
      const expected = asset.name === 'flip' ? 0.36 : 3.408;
      check('Chromium decodes byte-exact original '+asset.name+' MP3',decoded?.inputBytes === asset.bytes.length && buffer?.rms > 0 && Math.abs(buffer.duration-expected) < 0.12,{sha256:hash,decode:decoded,pcm:buffer});
    }
    const pairs = await page.locator('[data-card]').evaluateAll(cards => {
      const groups = {};
      for (const card of cards) (groups[card.querySelector('.front').style.backgroundImage] ||= []).push(card.dataset.card);
      return Object.values(groups);
    });
    await page.locator('[data-card="'+pairs[0][0]+'"]').click();
    await page.locator('[data-card="'+pairs[0][1]+'"]').click();
    await page.waitForFunction(() => document.querySelectorAll('[data-card].matched').length === 2);
    state = await probeSnapshot(page);
    check('Actual matching cards play both decoded original effects',state.decodes.every(item => state.sources.some(source => !source.loop && source.buffer === item.buffer)),state.sources);

    await settings(page,{music:false,sound:true}); await running(page);
    state = await probeSnapshot(page);
    check('Music can be muted while sound stays enabled',loops(state).length === 0 && await page.evaluate(() => { const s=window.LuminaAudio.getSettings(); return !s.music && s.sound; }));
    await (await firstUnmatched(page)).click();
    const effectWaveform = await page.evaluate(() => window.__luminaAudioProbe.waveform(120));
    check('Original flip effect renders with music disabled',effectWaveform.finite && effectWaveform.rms > 0.001,effectWaveform);
    await settings(page,{sound:false,music:true}); await running(page);
    const beforeEffects = effectStarts(await probeSnapshot(page));
    await (await firstUnmatched(page)).click();
    state = await probeSnapshot(page);
    check('Sound can be muted while the single music loop continues',effectStarts(state) === beforeEffects && loops(state).length === 1 && await page.evaluate(() => { const s=window.LuminaAudio.getSettings(); return s.music && !s.sound; }),state.sources);
    await settings(page,{sound:false,music:false}); await running(page);
    await page.waitForTimeout(100);
    const silence = await page.evaluate(() => window.__luminaAudioProbe.waveform(160));
    check('Both audio toggles produce silence without active sources',silence.rms < 0.00001 && activeSources(await probeSnapshot(page)).length === 0,silence);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('luminaAudioSettingsV1')));
    check('Independent settings persist in the guest browser',saved.sound === false && saved.music === false && saved.volume === 0.45,saved);
    await settings(page,{sound:true,music:true}); await running(page);
    await page.locator('[data-audio-settings]').click();
    await page.locator('#lumina-volume').press('Home');
    check('Native range keyboard input sets volume to zero',await page.evaluate(() => window.LuminaAudio.getSettings().volume === 0));
    await page.locator('[data-close-audio]').click();
    check('Zero volume starts no music or effects',activeSources(await probeSnapshot(page)).length === 0);
    await page.locator('[data-audio-settings]').click();
    await page.locator('#lumina-volume').press('End');
    check('Native range keyboard input reaches the bounded upper volume',await page.evaluate(() => window.LuminaAudio.getSettings().volume === 1));
    await page.locator('[data-close-audio]').click(); await running(page);

    for (let i=0;i<3;i++) {
      await page.locator('[data-action="pause"]').click(); await suspended(page);
      check('Pause cycle '+(i+1)+' suspends and clears every source',activeSources(await probeSnapshot(page)).length === 0);
      await page.locator('[data-action="resume"]').click(); await running(page);
      state = await probeSnapshot(page);
      check('Resume cycle '+(i+1)+' reuses one context and one loop',state.contexts.length === 1 && loops(state).length === 1);
    }
    const background = await run.context.newPage(); await background.goto('about:blank'); await background.bringToFront();
    let visibility = 'native background-tab visibility';
    if (!await page.evaluate(() => document.hidden)) {
      visibility = 'controlled document.hidden/visibilitychange (headless tabs remain visible)';
      await page.evaluate(() => {
        Object.defineProperty(document,'hidden',{configurable:true,get:() => true});
        Object.defineProperty(document,'visibilityState',{configurable:true,get:() => 'hidden'});
        document.dispatchEvent(new Event('visibilitychange'));
      });
    }
    await suspended(page);
    check('Hidden game pauses all audio and the board',activeSources(await probeSnapshot(page)).length === 0 && await page.locator('.pause-panel').isVisible(),visibility);
    await background.close(); await page.bringToFront();
    if (visibility.startsWith('controlled')) await page.evaluate(() => {
      delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange'));
    });
    check('Visibility return preserves the player pause until Resume',activeSources(await probeSnapshot(page)).length === 0 && await page.locator('.pause-panel').isVisible());
    await page.locator('[data-action="resume"]').click(); await running(page);
    report.visibility = visibility;
    await page.evaluate(() => window.addEventListener('pagehide',event => {
      window.__luminaLifecycle({kind:'actual-navigation-pagehide',persisted:event.persisted,probe:window.__luminaAudioProbe.snapshot()});
    }));
    await page.goto('about:blank');
    await new Promise(resolve => setTimeout(resolve,100));
    const pagehide = report.lifecycle.find(item => item.kind === 'actual-navigation-pagehide');
    check('Real navigation emits pagehide and stops every game source',!!pagehide && activeSources(pagehide.probe).length === 0,pagehide);
    check('Final navigation closes its native context',pagehide && !pagehide.persisted && pagehide.probe.contexts.every(item => item.state === 'closed' && item.closeCalls === 1),pagehide?.probe.contexts);
  } finally { await finishPage(run,'Audio session'); }
}

async function layoutSmoke(browser,base) {
  const devices = [{width:320,height:720},{width:390,height:844},{width:820,height:1180},{width:1440,height:900}].filter(item => selectedWidths.includes(item.width));
  for (const viewport of devices) {
    for (const level of [40,90,250]) {
      const label = viewport.width+'px level '+level;
      const useProbe = viewport.width === 390 && level !== 90;
      const run = await preparePage(browser,base,viewport,fixture(level),useProbe), page = run.page;
      try {
        if (level === 40) {
          assertGeometry(viewport.width+'px Home',await geometry(page));
          await screenshot(page,'home-'+viewport.width);
        }
        if (useProbe) check(label+' has no audio before Play',(await probeSnapshot(page)).contexts.length === 0);
        await page.locator('.journey-play').click();
        await page.locator('#app[data-screen="game"] [data-card]').first().waitFor();
        const layout = await geometry(page);
        check(label+' uses the correct original theme',layout.theme === campaign.config(level).theme,layout.theme);
        assertGeometry(label,layout,campaign.config(level).pairs*2);
        await screenshot(page,'level-'+level+'-'+viewport.width);
        if (useProbe) {
          await running(page); await page.waitForTimeout(750);
          const state = await probeSnapshot(page), music = state.buffers.find(item => item.id === loops(state)[0]?.buffer);
          const waveform = await page.evaluate(() => window.__luminaAudioProbe.waveform(240));
          check(label+' renders its original finite music texture',music?.duration === 24 && music.finite && music.rms > 0.03 && waveform.finite && waveform.rms > 0.002,{music,waveform});
          report.musicProfiles.push({theme:layout.theme,pcm:music,waveform});
        }
        if (level === 40) {
          await page.locator('[data-audio-settings]').click();
          assertGeometry(viewport.width+'px audio settings',await geometry(page));
          await screenshot(page,'settings-'+viewport.width);
          await page.locator('[data-close-audio]').click();
        }
        if (viewport.width === 390 && level === 250) {
          const cards = fixture(level).campaign.activeLevel.cards, groups = {};
          cards.forEach((card,i) => (groups[card.art] ||= []).push(i));
          let matched = 0;
          for (const pair of Object.values(groups)) {
            await page.locator('[data-card="'+pair[0]+'"]').click();
            await page.locator('[data-card="'+pair[1]+'"]').click();
            matched += 2;
            if (matched < cards.length) await page.waitForFunction(n => document.querySelectorAll('[data-card].matched').length === n,matched);
          }
          await page.locator('#app[data-screen="campaign-result"]').waitFor();
          await run.outerPage.waitForFunction(() => window.__fixtureProgress.campaign.results.every(Boolean));
          const saved = await run.outerPage.evaluate(() => window.__fixtureProgress);
          check('Real final-board clicks finish at 250 with no level 251',saved.campaign.unlocked === 250 && saved.campaign.results.every(Boolean) && saved.campaign.activeLevel === null && await page.locator('[data-action="next-level"]').count() === 0);
          await screenshot(page,'completed-250-390');
          await page.locator('[data-action="levels"]').click();
          check('Completed final chapter exposes exactly levels 226 through 250',await page.locator('[data-level]').count() === 25 && await page.locator('[data-level="250"]').isEnabled() && await page.locator('[data-level="251"]').count() === 0);
          assertGeometry('390px final chapter map',await geometry(page));
          await screenshot(page,'chapter-10-390');
        }
      } finally { await finishPage(run,label); }
    }
  }
  // The level-90 fixture exercises the expanded face pool; this additional
  // narrow check covers the actual maximum board size of twenty pairs.
  for (const viewport of devices.filter(item => item.width === 320 || item.width === 1440)) {
    const run = await preparePage(browser,base,viewport,fixture(249));
    try {
      await run.page.locator('.journey-play').click();
      assertGeometry(viewport.width+'px maximum 40-card board',await geometry(run.page),40);
      await screenshot(run.page,'level-249-max-board-'+viewport.width);
    } finally { await finishPage(run,viewport.width+'px maximum board'); }
  }
  if (selectedSection === 'all' && selectedWidths.includes(390)) {
    check('All three themes have distinct native music PCM',new Set(report.musicProfiles.map(item => item.theme)).size === 3 && new Set(report.musicProfiles.map(item => item.pcm.signature)).size === 3,
      report.musicProfiles.map(item => ({theme:item.theme,signature:item.pcm.signature})));
  }
}

async function sandboxSmoke(browser,base) {
  const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  const page = await context.newPage(), fatal = [], badRequests = [], remote = [], dialogs = [];
  page.setDefaultTimeout(8000);
  page.on('pageerror',error => fatal.push(error.message));
  page.on('response',response => { if (response.status() >= 400) badRequests.push({url:response.url(),status:response.status()}); });
  page.on('dialog',async dialog => { dialogs.push(dialog.type()); await dialog.dismiss(); });
  await context.route('**/*',route => {
    const url = new URL(route.request().url());
    if (url.origin === base || url.protocol === 'data:') return route.continue();
    remote.push(url.origin+url.pathname); return route.abort('blockedbyclient');
  });
  await page.exposeBinding('__luminaLifecycle',(_source,entry) => report.lifecycle.push(entry));
  await context.addInitScript(installAudioProbe);
  try {
    await page.goto(base+HARNESS,{waitUntil:'networkidle'});
    await page.locator('#open').click();
    const frameLocator = page.frameLocator('iframe');
    await frameLocator.locator('.journey-play').waitFor();
    const frame = page.frames().find(item => item.url().includes(PREFIX));
    check('Actual game.mjs creates the production sandbox',await page.locator('iframe').getAttribute('sandbox') === 'allow-scripts allow-same-origin');
    check('Iframe has no AudioContext before its own Play gesture',(await probeSnapshot(frame)).contexts.length === 0);
    await frameLocator.locator('.journey-play').click(); await running(frame);
    const pair = await frame.locator('[data-card]').evaluateAll(cards => {
      const art = cards[0].querySelector('.front').style.backgroundImage;
      return cards.filter(card => card.querySelector('.front').style.backgroundImage === art).map(card => card.dataset.card);
    });
    await frameLocator.locator('[data-card="'+pair[0]+'"]').click();
    await frameLocator.locator('[data-card="'+pair[1]+'"]').click();
    await frame.waitForFunction(() => document.querySelectorAll('[data-card].matched').length === 2);
    const before = await frame.evaluate(() => window.LuminaGameProgress.snapshot().campaign.activeLevel);
    await frameLocator.locator('[data-action="pause"]').click(); await suspended(frame);
    await frameLocator.locator('[data-action="restart-level"]').click();
    check('Sandbox restart opens the localized inline confirmation',await frameLocator.locator('.restart-confirm').isVisible() && await frameLocator.locator('#lumina-restart-question').textContent() !== 'undefined' && dialogs.length === 0);
    await screenshot(page,'sandbox-restart-confirm-390');
    await frameLocator.locator('[data-action="cancel-restart"]').click();
    const canceled = await frame.evaluate(() => window.LuminaGameProgress.snapshot().campaign.activeLevel);
    check('Cancel keeps the saved pairs, move count and pause',canceled.moves === before.moves && JSON.stringify(canceled.cards) === JSON.stringify(before.cards) && await frameLocator.locator('.pause-panel').isVisible() && !await frameLocator.locator('.restart-confirm').isVisible());
    await frameLocator.locator('[data-action="restart-level"]').click();
    await frameLocator.locator('[data-action="cancel-restart"]').press('Escape');
    check('Escape cancels confirmation without closing the iframe',await page.locator('iframe').count() === 1 && !await frameLocator.locator('.restart-confirm').isVisible());
    await frameLocator.locator('[data-action="restart-level"]').click();
    await frameLocator.locator('[data-action="confirm-restart"]').click(); await running(frame);
    const restarted = await frame.evaluate(() => window.LuminaGameProgress.snapshot().campaign.activeLevel);
    check('Confirm restarts the same level in the actual sandbox',restarted.level === 1 && restarted.moves === 0 && restarted.elapsedSeconds === 0 && restarted.cards.every(card => !card.matched) && !await frameLocator.locator('.pause-panel').isVisible() && dialogs.length === 0,restarted);
    check('Parent document has no competing AudioContext',(await probeSnapshot(page)).contexts.length === 0);
    const waveform = await frame.evaluate(() => window.__luminaAudioProbe.waveform(180));
    check('Native audio works inside the production sandbox',waveform.finite && waveform.rms > 0.002,waveform);
    await page.locator('#close').click();
    const closed = await page.evaluate(() => window.__closedFrame);
    check('Actual mountGame disposal closes audio before removing the iframe',closed.remainingFrames === 0 && closed.probe.contexts.length === 1 && closed.probe.contexts.every(item => item.state === 'closed' && item.closeCalls === 1) && activeSources(closed.probe).length === 0,closed);
    check('Close returns focus to the local parent Play control',await page.locator('#open').isVisible() && await page.locator('#open').evaluate(el => el === document.activeElement));
  } finally { await finishPage({page,context,fatal,badRequests,remote},'Sandboxed parent integration'); }
}

async function launcherSmoke(browser,base) {
  const devices = [{width:320,height:720},{width:390,height:844},{width:820,height:1180},{width:1440,height:900}].filter(item => selectedWidths.includes(item.width));
  for (const viewport of devices) {
    const context = await browser.newContext({viewport,hasTouch:viewport.width<=820,deviceScaleFactor:1});
    const page = await context.newPage(), fatal = [], badRequests = [], remote = [];
    page.setDefaultTimeout(9000);
    page.on('pageerror',error => fatal.push(error.message));
    page.on('response',response => { if (response.status() >= 400) badRequests.push({url:response.url(),status:response.status()}); });
    await context.route('**/*',route => {
      const url = new URL(route.request().url());
      if (url.origin === base || url.protocol === 'data:') return route.continue();
      remote.push(url.origin+url.pathname); return route.abort('blockedbyclient');
    });
    await page.exposeBinding('__luminaLifecycle',(_source,entry) => report.lifecycle.push(entry));
    await context.addInitScript(installAudioProbe);
    const label = viewport.width+'px actual launcher';
    async function openGame() {
      await page.locator('#lm-launch').click();
      await page.frameLocator('iframe.lm-game-frame').locator('.journey-play:not([disabled])').waitFor();
      const frame = page.frames().find(item => item.url().includes(PREFIX));
      assert(frame,'Actual mounted game frame');
      await page.evaluate(() => { window.__lastFrameProbe=document.querySelector('iframe.lm-game-frame').contentWindow.__luminaAudioProbe; });
      return frame;
    }
    async function playPair(frame) {
      await frame.locator('.journey-play').click(); await running(frame);
      const pair = await frame.locator('[data-card]').evaluateAll(cards => {
        const art = cards[0].querySelector('.front').style.backgroundImage;
        return cards.filter(card => card.querySelector('.front').style.backgroundImage === art).map(card => card.dataset.card);
      });
      await frame.locator('[data-card="'+pair[0]+'"]').click();
      await frame.locator('[data-card="'+pair[1]+'"]').click();
      await frame.waitForFunction(() => document.querySelectorAll('[data-card].matched').length === 2);
      return frame.evaluate(() => window.LuminaGameProgress.snapshot().campaign.activeLevel);
    }
    async function assertClosed(reason) {
      await page.locator('#lm-dialog').waitFor({state:'detached'});
      const state = await page.evaluate(() => ({
        focus:document.activeElement?.id,overflow:document.body.style.getPropertyValue('overflow'),priority:document.body.style.getPropertyPriority('overflow'),
        locked:document.body.classList.contains('lm-game-open'),expanded:document.getElementById('lm-launch').getAttribute('aria-expanded'),probe:window.__lastFrameProbe.snapshot()
      }));
      check(label+' '+reason+' restores Home focus and scrolling',state.focus === 'lm-launch' && state.overflow === 'auto' && state.priority === 'important' && !state.locked && state.expanded === 'false',state);
      check(label+' '+reason+' closes every audio source',state.probe.contexts.every(item => item.state === 'closed') && activeSources(state.probe).length === 0);
    }
    try {
      await page.goto(base+LAUNCHER_HARNESS,{waitUntil:'networkidle'});
      await page.evaluate(() => document.body.style.setProperty('overflow','auto','important'));
      let frame = await openGame();
      const bounds = await page.evaluate(() => {
        const box = el => { const b=el.getBoundingClientRect(); return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}; };
        const shell=document.querySelector('.lm-shell'),close=document.getElementById('lm-close'),frame=document.querySelector('.lm-game-frame');
        const style=getComputedStyle(shell);
        return {viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,shell:box(shell),frame:box(frame),close:box(close),
          radii:[style.borderTopLeftRadius,style.borderTopRightRadius,style.borderBottomLeftRadius,style.borderBottomRightRadius].map(parseFloat),overflow:style.overflow};
      });
      const gutter=viewport.width<=480 ? 8 : 12;
      check(label+' fills the viewport inside its responsive gutter',Math.abs(bounds.shell.x-gutter)<=1 && Math.abs(bounds.shell.y-gutter)<=1 && Math.abs(bounds.shell.width-(viewport.width-2*gutter))<=1 && Math.abs(bounds.shell.height-(viewport.height-2*gutter))<=1 && bounds.documentWidth<=viewport.width+1,bounds);
      check(label+' retains rounded corners and a reachable 44px Close',bounds.radii.every(radius=>radius>=18) && bounds.overflow==='hidden' && bounds.close.width>=44 && bounds.close.height>=44 && bounds.close.x>=bounds.shell.x && bounds.close.right<=bounds.shell.right+1 && bounds.close.y>=bounds.shell.y && bounds.close.bottom<=bounds.shell.bottom,bounds);
      check(label+' allocates no audio before the child gesture',(await probeSnapshot(frame)).contexts.length===0 && (await probeSnapshot(page)).contexts.length===0);
      report.layouts.push({label,...bounds});
      await screenshot(page,'launcher-home-'+viewport.width);
      const before = await playPair(frame);
      await frame.locator('[data-save-game]').click(); await suspended(frame);
      check(label+' Save opens a dismissible registration prompt',await frame.locator('#lumina-register-dialog[open]').isVisible() && await frame.locator('[data-registration="create"]').isVisible() && await frame.locator('[data-registration="keep"]').isVisible() && await frame.locator('[data-registration="leave"]').isVisible() && await frame.locator('[data-registration="dismiss"]').isVisible());
      assertGeometry(viewport.width+'px registration prompt inside actual launcher',await geometry(frame));
      await screenshot(page,'launcher-save-prompt-'+viewport.width);
      await frame.locator('[data-registration="dismiss"]').click(); await running(frame);
      let after = await frame.evaluate(() => window.LuminaGameProgress.snapshot().campaign.activeLevel);
      check(label+' dismiss keeps the in-session attempt and resumes audio',after.moves===before.moves && JSON.stringify(after.cards)===JSON.stringify(before.cards) && !await frame.locator('.pause-panel').isVisible());
      await frame.locator('[data-save-game]').click();
      await frame.locator('[data-registration="keep"]').click(); await running(frame);
      check(label+' Keep playing leaves the game usable',!await frame.locator('#lumina-register-dialog').isVisible() && !await frame.locator('.pause-panel').isVisible());
      await frame.locator('[data-save-game]').click();
      await frame.locator('[data-registration="create"]').press('Escape'); await running(frame);
      check(label+' Escape dismisses only the Save prompt',await page.locator('#lm-dialog[open]').isVisible() && !await frame.locator('#lumina-register-dialog').isVisible());
      const stored = await frame.evaluate(() => ({
        local:Object.keys(localStorage).filter(key=>/^lumina(?:Browser|Points)/.test(key)),
        session:Object.keys(sessionStorage).filter(key=>/^lumina(?:Browser|Points)/.test(key))
      }));
      check(label+' guest progress never enters persistent or session storage',stored.local.length===0 && stored.session.length===0,stored);
      await page.locator('#lm-close').click(); await assertClosed('Close');
      frame = await openGame();
      const fresh = await frame.evaluate(() => window.LuminaGameProgress.snapshot());
      check(label+' reopening starts a fresh guest game',fresh.points===0 && fresh.rounds===0 && fresh.activeRound===null && !fresh.campaign && await frame.locator('.journey-play').getAttribute('data-action')==='campaign',fresh);
      await frame.locator('[data-save-game]').click();
      await frame.locator('[data-registration="leave"]').click(); await assertClosed('Leave without saving');

      if (viewport.width===390) {
        frame = await openGame(); await playPair(frame);
        await frame.locator('[data-save-game]').click();
        await frame.locator('[data-registration="create"]').click();
        await page.locator('#main-auth-modal').waitFor({state:'visible'});
        check('Create account hands off to the existing parent registration UI',await page.locator('#main-auth-modal').getAttribute('data-tab')==='signup' && await page.locator('iframe.lm-game-frame').count()===1 && !await page.locator('#lm-dialog').isVisible() && await page.locator('#reg-email').evaluate(el=>el===document.activeElement));
        check('Registration handoff keeps game audio suspended',activeSources(await probeSnapshot(frame)).length===0);
        await screenshot(page,'launcher-registration-handoff-390');
        await page.locator('#auth-cancel').click(); await assertClosed('registration cancellation');

        frame = await openGame(); const carried = await playPair(frame);
        await page.evaluate(() => { window.__registrationFrame=document.querySelector('iframe.lm-game-frame'); });
        await frame.locator('[data-save-game]').click();
        await frame.locator('[data-registration="create"]').click();
        await page.locator('#main-auth-modal').waitFor({state:'visible'});
        await page.locator('#auth-complete').click();
        await page.locator('#lm-dialog[open]').waitFor();
        await page.waitForFunction(() => window.__testAccount.record.progress?.campaign?.activeLevel?.moves===1);
        const adoption = await page.evaluate(() => ({sameFrame:window.__registrationFrame===document.querySelector('iframe.lm-game-frame'),progress:window.__testAccount.record.progress,calls:window.__testAccount.calls}));
        check('Synthetic registration readiness restores the same iframe and adopts the current attempt',adoption.sameFrame && adoption.progress.campaign.activeLevel.moves===carried.moves && JSON.stringify(adoption.progress.campaign.activeLevel.cards)===JSON.stringify(carried.cards) && !await page.locator('#main-auth-modal').isVisible(),{sameFrame:adoption.sameFrame,calls:adoption.calls});
        await frame.locator('[data-save-game]:not([disabled])').click();
        await frame.waitForFunction(() => document.querySelector('.save-status')?.textContent===window.LuminaMessages.en.saveSaved);
        check('Synthetic registered Save uses the account path without a guest prompt',!await frame.locator('#lumina-register-dialog').isVisible() && await page.evaluate(() => window.__testAccount.calls.some(item=>item.action==='save_progress')));
        await screenshot(page,'launcher-synthetic-account-saved-390');
        await page.locator('#lm-close').click(); await assertClosed('registered Close');
        report.registrationEvidence='Actual launcher/game/progress-bridge with local synthetic null/session/RPC transport and minimal parent auth UI stand-in. No real registration or database write.';
      }
    } finally { await finishPage({page,context,fatal,badRequests,remote},label); }
  }
}

// One regression for a successful sign-in that hides the parent auth UI while
// account progress is still loading. This uses the real launcher and bridge;
// only the auth response and held RPC response belong to the local fixture.
async function earlyRegistrationCloseSmoke(browser,base) {
  const context = await browser.newContext({viewport:{width:320,height:720},hasTouch:true,deviceScaleFactor:1});
  const page = await context.newPage(), fatal = [], badRequests = [], remote = [];
  page.setDefaultTimeout(9000);
  page.on('pageerror',error => fatal.push(error.message));
  page.on('response',response => { if (response.status() >= 400) badRequests.push({url:response.url(),status:response.status()}); });
  await context.route('**/*',route => {
    const url = new URL(route.request().url());
    if (url.origin === base || url.protocol === 'data:') return route.continue();
    remote.push(url.origin+url.pathname); return route.abort('blockedbyclient');
  });
  try {
    await page.goto(base+LAUNCHER_HARNESS,{waitUntil:'networkidle'});
    await page.locator('#lm-launch').click();
    await page.frameLocator('iframe.lm-game-frame').locator('.journey-play:not([disabled])').waitFor();
    const frame = page.frames().find(item => item.url().includes(PREFIX));
    await frame.locator('.journey-play').click();
    const pair = await frame.locator('[data-card]').evaluateAll(cards => {
      const art = cards[0].querySelector('.front').style.backgroundImage;
      return cards.filter(card => card.querySelector('.front').style.backgroundImage === art).map(card => card.dataset.card);
    });
    await frame.locator('[data-card="'+pair[0]+'"]').click();
    await frame.locator('[data-card="'+pair[1]+'"]').click();
    await frame.waitForFunction(() => document.querySelectorAll('[data-card].matched').length === 2);
    const carried = await frame.evaluate(() => window.LuminaGameProgress.snapshot());
    await page.evaluate(() => {
      window.__registrationFrame=document.querySelector('iframe.lm-game-frame');
      const fixture=window.__testAccount;
      fixture.closeAuthEarly=true;
      fixture.progressGate=new Promise(resolve => { fixture.releaseProgress=()=>{fixture.progressReleased=true;resolve();}; });
    });
    await frame.locator('[data-save-game]').click();
    await frame.locator('[data-registration="create"]').click();
    await page.locator('#main-auth-modal').waitFor({state:'visible'});
    check('Early-close scenario enters the actual registration handoff',await page.locator('#lm-dialog[data-lumina-registration]').count()===1 && !await page.locator('#lm-dialog').isVisible());
    await page.locator('#auth-complete').click();
    await page.waitForFunction(() => window.__testAccount.progressEntered && document.getElementById('lm-dialog')?.open);
    const pending = await page.evaluate(() => ({
      sameFrame:window.__registrationFrame===document.querySelector('iframe.lm-game-frame'),
      authHidden:getComputedStyle(document.getElementById('main-auth-modal')).display==='none',
      released:!!window.__testAccount.progressReleased,record:window.__testAccount.record,calls:window.__testAccount.calls
    }));
    check('Auth closes before progress readiness while the same game remains open',pending.authHidden && pending.sameFrame && !pending.released && pending.record.progress===null && !pending.calls.some(item=>item.action==='save_progress'),pending);
    const close = await page.locator('#lm-close').boundingBox();
    check('Close stays reachable during the delayed account load',await page.locator('#lm-close').isVisible() && close.width>=44 && close.height>=44 && close.x>=0 && close.x+close.width<=320);
    await screenshot(page,'registration-auth-closed-progress-pending-320');
    await page.evaluate(() => window.__testAccount.releaseProgress());
    await page.waitForFunction(() => window.__testAccount.record.progress?.campaign?.activeLevel?.moves===1);
    await frame.waitForFunction(() => document.querySelector('.save-status')?.textContent===window.LuminaMessages.en.saveSaved);
    const saved = await page.evaluate(() => ({
      sameFrame:window.__registrationFrame===document.querySelector('iframe.lm-game-frame'),record:window.__testAccount.record,calls:window.__testAccount.calls
    }));
    check('Delayed progress completion preserves and saves the staged guest attempt',saved.sameFrame && saved.record.revision===1 && saved.record.progress.campaign.activeLevel.level===carried.campaign.activeLevel.level && saved.record.progress.campaign.activeLevel.moves===carried.campaign.activeLevel.moves && JSON.stringify(saved.record.progress.campaign.activeLevel.cards)===JSON.stringify(carried.campaign.activeLevel.cards),{sameFrame:saved.sameFrame,revision:saved.record.revision,calls:saved.calls});
    check('Only one staged save is sent after the delayed load',saved.calls.filter(item=>item.action==='save_progress').length===1 && await page.locator('#lm-dialog[open]').isVisible());
    await screenshot(page,'registration-auth-closed-then-saved-320');
    await page.locator('#lm-close').click();
    await page.locator('#lm-dialog').waitFor({state:'detached'});
    check('The completed registration scenario returns to the Play pill',await page.locator('#lm-launch').evaluate(el=>el===document.activeElement) && !await page.evaluate(() => document.body.classList.contains('lm-game-open')));
    report.registrationEvidence='Actual launcher/game/progress bridge at 320px; synthetic successful session closes the auth stand-in before a manually held progress RPC resolves. No real account or database write.';
  } finally { await finishPage({page,context,fatal,badRequests,remote},'Early successful auth-close regression'); }
}

(async () => {
  let browser;
  try {
    await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
    const base = 'http://127.0.0.1:'+server.address().port;
    browser = await chromium.launch({headless:true,args:['--no-sandbox']});
    report.browser = browser.version();
    if (selectedSection === 'all' || selectedSection === 'audio') await audioSmoke(browser,base);
    if (selectedSection === 'all' || selectedSection === 'layout') await layoutSmoke(browser,base);
    if (selectedSection === 'all' || selectedSection === 'sandbox') await sandboxSmoke(browser,base);
    if (selectedSection === 'all' || selectedSection === 'launcher') await launcherSmoke(browser,base);
    if (selectedSection === 'all' || selectedSection === 'registration') await earlyRegistrationCloseSmoke(browser,base);
    report.ok = true;
  } catch (error) {
    report.ok = false; report.errors.push({message:error.message,stack:error.stack}); process.exitCode = 1;
    console.error(error.stack || error);
  } finally {
    if (browser) await browser.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
    report.finishedAt = new Date().toISOString();
    report.assetRequests = requests;
    fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({ok:report.ok,checks:report.checks.length,passed:report.checks.filter(item => item.ok).length,
      screenshots:report.screenshots.length,report:path.join(OUTPUT,'report.json')}));
  }
})();
