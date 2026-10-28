/* Exercise the real isolated audio owner with a controllable Web Audio graph.
 * PCM generation is real; only the browser device and transport are mocked. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {JSDOM} = require('jsdom');
const ROOT = path.resolve(__dirname,'..');
const source = fs.readFileSync(path.join(ROOT,'lumina-match/browser/audio.js'),'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const tick = async () => { for(let i=0;i<12;i++) await Promise.resolve(); };

function fixture(t, options={}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>',{
    url:'https://matchapp.tv/lumina-match/browser/index.html',runScripts:'outside-only'
  });
  const w=dom.window, timers=new Map(), contexts=[], requests=[], activation={isActive:!options.inactiveGesture};
  let clock=0, timerId=0, hidden=false, rejectResume=!!options.rejectResume;
  Object.defineProperty(w.document,'hidden',{get:()=>hidden});
  Object.defineProperty(w.navigator,'userActivation',{value:activation});
  Object.defineProperty(w.performance,'now',{value:()=>clock});
  w.setTimeout=(fn,delay=0)=>{const id=++timerId;timers.set(id,{fn,at:clock+delay});return id;};
  w.clearTimeout=id=>timers.delete(id);
  if(options.blockStorage) Object.defineProperty(w,'localStorage',{get(){throw Error('storage denied');}});
  else if(options.settings) w.localStorage.setItem('luminaAudioSettingsV1',JSON.stringify(options.settings));
  class Param {
    constructor(){this.value=1;this.events=[];}
    cancelScheduledValues(at){this.events.push(['cancel',at]);}
    setValueAtTime(value,at){this.value=value;this.events.push(['set',value,at]);}
    linearRampToValueAtTime(value,at){this.value=value;this.events.push(['linear',value,at]);}
    exponentialRampToValueAtTime(value,at){this.value=value;this.events.push(['exponential',value,at]);}
  }
  class Node {
    constructor(context,type){this.context=context;this.type=type;this.connections=[];this.disconnected=false;context.nodes.push(this);}
    connect(node){this.connections.push(node);return node;}
    disconnect(){this.disconnected=true;this.connections=[];}
  }
  class Source extends Node {
    constructor(context,type){super(context,type);this.started=false;this.ended=false;this.frequency=new Param();context.sources.push(this);}
    start(at=0){assert.equal(this.started,false);this.started=true;this.startedAt=at;}
    stop(at){this.stopAt=at===undefined?this.context.currentTime:at;if(at===undefined||at<=this.context.currentTime)this.end();}
    end(){if(this.ended)return;this.ended=true;if(this.onended)this.onended();}
  }
  class Context {
    constructor(){this.state='suspended';this.currentTime=0;this.nodes=[];this.sources=[];this.buffers=[];this.listeners=new Map();this.destination={};this.resumeCalls=0;this.decodeCalls=0;contexts.push(this);}
    addEventListener(name,fn){this.listeners.set(name,fn);}
    removeEventListener(name,fn){if(this.listeners.get(name)===fn)this.listeners.delete(name);}
    stateChange(){this.listeners.get('statechange')?.();}
    createGain(){const n=new Node(this,'gain');n.gain=new Param();return n;}
    createBufferSource(){return new Source(this,'buffer');}
    createOscillator(){return new Source(this,'oscillator');}
    createBuffer(channels,length,sampleRate){const data=Array.from({length:channels},()=>new Float32Array(length));const b={duration:length/sampleRate,length,sampleRate,numberOfChannels:channels,getChannelData:i=>data[i]};this.buffers.push(b);return b;}
    resume(){
      this.resumeCalls++;
      if(rejectResume)return Promise.reject(Error('activation required'));
      if(options.pendingResume)return new Promise(resolve=>{this.finishResume=()=>{if(this.state!=='closed'){this.state='running';this.stateChange();}resolve();};});
      this.state='running';this.stateChange();return Promise.resolve();
    }
    suspend(){if(this.state!=='closed'){this.state='suspended';this.stateChange();}return Promise.resolve();}
    close(){this.state='closed';this.stateChange();return Promise.resolve();}
    decodeAudioData(bytes,success,failure){
      this.decodeCalls++;
      if(options.pendingDecode)return new Promise(()=>{});
      if(options.failDecode){const p=Promise.reject(Error('invalid audio'));p.catch(failure);return p;}
      const buffer={duration:new Uint8Array(bytes)[0]===1?0.36:3.408,originalSample:true};
      if(options.callbackDecode){Promise.resolve().then(()=>success(buffer));return undefined;}
      return Promise.resolve(buffer);
    }
  }
  if(!options.noContext) w[options.webkit?'webkitAudioContext':'AudioContext']=Context;
  w.fetch=(url,init)=>{
    requests.push({url,init});
    if(options.neverFetch)return new Promise(()=>{});
    if(options.failFetch)return Promise.reject(Error('offline'));
    return Promise.resolve({ok:true,headers:{get:()=>null},arrayBuffer:()=>Promise.resolve(Uint8Array.of(url.includes('flip')?1:2).buffer)});
  };
  w.eval(source);
  const audio=w.LuminaAudio;
  t.after(()=>{audio.dispose();dom.window.close();});
  const activeSources=()=>contexts.flatMap(c=>c.sources).filter(s=>s.started&&!s.ended);
  async function advance(ms){clock+=ms;for(const c of contexts)if(c.state==='running')c.currentTime=clock/1000;for(const [id,item]of [...timers])if(item.at<=clock){timers.delete(id);item.fn();}for(const c of contexts)for(const s of c.sources)if(!s.ended&&s.stopAt!==undefined&&s.stopAt<=c.currentTime)s.end();await tick();}
  function visibility(value){hidden=value;w.document.dispatchEvent(new w.Event('visibilitychange'));}
  return {w,audio,contexts,requests,timers,activation,activeSources,advance,visibility,allowResume(){rejectResume=false;}};
}

test('audio does not create a device, fetch samples or play before a user gesture',async t=>{
  const f=fixture(t,{inactiveGesture:true});
  f.audio.setActive(true);f.audio.setTheme('grove');f.audio.play('win');
  assert.equal(await f.audio.unlock(),false);
  assert.equal(f.contexts.length,0);assert.equal(f.requests.length,0);
  f.activation.isActive=true;assert.equal(await f.audio.unlock(),true);await tick();
  assert.equal(f.contexts.length,1);assert.equal(f.requests.length,2);
  assert.equal(f.activeSources().filter(s=>s.loop).length,1);
  assert.ok(Object.isFrozen(f.audio));
});

test('all three original scores render audible, finite, distinct stereo PCM and only one loop',async t=>{
  const f=fixture(t);await f.audio.unlock();
  const signatures=[];
  for(const theme of ['starlight','grove','ocean']){
    f.audio.setTheme(theme);
    const music=f.activeSources().filter(s=>s.loop);assert.equal(music.length,1);
    const buffer=music[0].buffer;assert.equal(buffer.duration,24);assert.equal(buffer.numberOfChannels,2);
    let squares=0,peak=0,stereoDifference=0;const left=buffer.getChannelData(0),right=buffer.getChannelData(1);
    for(let i=0;i<left.length;i++){assert.ok(Number.isFinite(left[i])&&Number.isFinite(right[i]));squares+=left[i]*left[i];peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));stereoDifference+=Math.abs(left[i]-right[i]);}
    assert.ok(Math.sqrt(squares/left.length)>0.03,'score must not be silent');
    assert.ok(peak<0.95,'headroom prevents PCM clipping');assert.ok(stereoDifference>100);
    signatures.push(crypto.createHash('sha256').update(Buffer.from(left.buffer)).digest('hex'));
  }
  assert.equal(new Set(signatures).size,3);
  assert.equal(f.contexts[0].buffers.length,3);
  f.audio.setTheme('starlight');assert.equal(f.contexts[0].buffers.length,3,'theme buffers are reused');
});

test('original APK effects match their recorded byte hashes and duration metadata',()=>{
  const directory=path.join(ROOT,'lumina-match/browser/sounds');
  const manifest=JSON.parse(fs.readFileSync(path.join(directory,'source.json'),'utf8'));
  assert.equal(manifest.source,'LuminaMatch.apk');
  assert.equal(manifest.source_sha256,'aaa0ada11067b34212624f8c87005b4df30d19f87f0c57579d874c5d9ec74b4c');
  for(const [name,item]of Object.entries(manifest.effects)){
    const bytes=fs.readFileSync(path.join(directory,name));
    assert.equal(bytes.length,item.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256);
    assert.ok(item.duration_seconds>0&&item.duration_seconds<4);
  }
});

test('samples decode once, use same-origin credential-free requests, and play the original buffers',async t=>{
  const f=fixture(t);await f.audio.unlock();await tick();
  await f.audio.unlock();await tick();
  assert.equal(f.requests.length,2);assert.equal(f.contexts[0].decodeCalls,2);
  for(const request of f.requests){assert.match(request.url,/^https:\/\/matchapp\.tv\/lumina-match\/browser\/sounds\/(flip|match)\.mp3$/);assert.equal(request.init.credentials,'omit');}
  f.audio.play('flip');f.audio.play('match');
  const effects=f.activeSources().filter(s=>!s.loop);
  assert.equal(effects.length,2);assert.ok(effects.every(s=>s.buffer.originalSample));
  assert.deepEqual(effects.map(s=>s.buffer.duration),[0.36,3.408]);
});

test('music and sound can be muted independently and preferences survive a new game',async t=>{
  const f=fixture(t);await f.audio.unlock();await tick();
  f.audio.setMusic(false);assert.equal(f.activeSources().filter(s=>s.loop).length,0);
  assert.equal(f.audio.play('match'),true);assert.ok(f.activeSources().some(s=>!s.loop));
  f.audio.setMusic(true);assert.equal(f.activeSources().filter(s=>s.loop).length,1);
  f.audio.setSound(false);assert.equal(f.activeSources().filter(s=>!s.loop).length,0);
  assert.equal(f.audio.play('win'),false);assert.equal(f.activeSources().filter(s=>s.loop).length,1);
  f.audio.setVolume(0.2);const saved=JSON.parse(f.w.localStorage.getItem('luminaAudioSettingsV1'));
  assert.deepEqual(saved,{sound:false,music:true,volume:0.2});
  const next=fixture(t,{settings:saved});assert.deepEqual(plain(next.audio.getSettings()),saved);
  const detached=next.audio.getSettings();detached.music=false;assert.equal(next.audio.getSettings().music,true);
  next.audio.setVolume(2);assert.equal(next.audio.getSettings().volume,1);
  next.audio.setVolume(-2);assert.equal(next.audio.getSettings().volume,0);
  next.audio.setVolume(NaN);assert.equal(next.audio.getSettings().volume,0);
});

test('pause and tab visibility silence every source, then resume only the eligible music',async t=>{
  const f=fixture(t);await f.audio.unlock();await tick();f.audio.play('match');
  assert.equal(f.activeSources().length,2);
  f.audio.setActive(false);assert.equal(f.activeSources().length,0);assert.equal(f.contexts[0].state,'suspended');
  f.visibility(true);f.visibility(false);await tick();assert.equal(f.activeSources().length,0,'a paused game stays paused');
  f.audio.setActive(true);await tick();assert.equal(f.activeSources().length,1);assert.ok(f.activeSources()[0].loop);
  f.visibility(true);assert.equal(f.activeSources().length,0);
  f.visibility(false);await tick();assert.equal(f.activeSources().length,1);
  assert.equal(f.contexts.length,1);
});

test('dispose cancels pending loads and activation deadlines, closes the graph and forbids late playback',async t=>{
  const f=fixture(t,{pendingResume:true,neverFetch:true});
  const unlocking=f.audio.unlock();await tick();
  assert.equal(f.timers.size,3);
  f.audio.dispose();assert.equal(await unlocking,false);await tick();
  assert.equal(f.timers.size,0);assert.equal(f.contexts[0].state,'closed');
  assert.ok(f.requests.every(r=>r.init.signal.aborted));
  f.contexts[0].finishResume();await tick();
  f.audio.setActive(true);f.audio.setMusic(true);f.audio.setSound(true);f.audio.play('win');
  assert.equal(await f.audio.unlock(),false);assert.equal(f.activeSources().length,0);
  assert.ok(f.contexts[0].nodes.every(n=>n.disconnected));
});

test('hidden pages cannot start or finish delayed activation',async t=>{
  const f=fixture(t,{pendingResume:true});const unlocking=f.audio.unlock();await tick();
  f.visibility(true);assert.equal(await unlocking,false);f.contexts[0].finishResume();await tick();
  assert.equal(f.activeSources().length,0);assert.equal(f.contexts[0].state,'suspended');
  assert.equal(await f.audio.unlock(),false);
});

test('autoplay rejection stays silent and a later user gesture retries the same context',async t=>{
  const f=fixture(t,{rejectResume:true});assert.equal(await f.audio.unlock(),false);await tick();
  assert.equal(f.activeSources().length,0);assert.equal(f.timers.size,0);
  f.allowResume();assert.equal(await f.audio.unlock(),true);await tick();
  assert.equal(f.contexts.length,1);assert.equal(f.activeSources().filter(s=>s.loop).length,1);
  assert.equal(f.requests.length,2);
});

test('unavailable samples have a bounded single attempt and synthesized effects remain audible',async t=>{
  const f=fixture(t,{neverFetch:true});await f.audio.unlock();await tick();
  await f.advance(4600);assert.equal(f.timers.size,0);assert.ok(f.requests.every(r=>r.init.signal.aborted));
  assert.equal(f.audio.play('flip'),true);assert.ok(f.activeSources().some(s=>s.type==='sine'));
  await f.audio.unlock();assert.equal(f.requests.length,2);
  const failed=fixture(t,{failDecode:true});await failed.audio.unlock();await tick();
  assert.equal(failed.audio.play('match'),true);assert.equal(failed.activeSources().filter(s=>!s.loop).length,2);
});

test('WebKit prefixed contexts and callback-only decoders use the original effect samples',async t=>{
  const f=fixture(t,{webkit:true,callbackDecode:true});await f.audio.unlock();await tick();
  assert.equal(f.audio.play('flip'),true);
  assert.ok(f.activeSources().find(s=>!s.loop).buffer.originalSample);
});

test('fast repeated effects are bounded and unknown names never allocate nodes',async t=>{
  const f=fixture(t);await f.audio.unlock();await tick();
  f.audio.play('match');assert.equal(f.audio.play('match'),false);
  for(let i=0;i<12;i++){await f.advance(101);f.audio.play('match');}
  assert.ok(f.activeSources().filter(s=>!s.loop).length<=6);
  const count=f.contexts[0].nodes.length;assert.equal(f.audio.play('anything'),false);assert.equal(f.contexts[0].nodes.length,count);
});

test('unavailable storage and audio hardware do not break the game or create external fallback requests',async t=>{
  const f=fixture(t,{blockStorage:true});await f.audio.unlock();f.audio.setSound(false);f.audio.setMusic(false);f.audio.setVolume(0);
  assert.deepEqual(plain(f.audio.getSettings()),{sound:false,music:false,volume:0});assert.equal(f.activeSources().length,0);
  const unavailable=fixture(t,{noContext:true});assert.equal(await unavailable.audio.unlock(),false);
  unavailable.audio.setActive(true);unavailable.audio.play('tap');assert.equal(unavailable.requests.length,0);
});

test('zero-volume activation remains ready without allocating audible sources',async t=>{
  const f=fixture(t,{settings:{sound:true,music:true,volume:0}});
  assert.equal(await f.audio.unlock(),true);await tick();assert.equal(f.activeSources().length,0);
  f.audio.setVolume(0.45);assert.equal(f.activeSources().filter(s=>s.loop).length,1);
});

test('page cache restoration resumes a previously activated game, while final pagehide disposes it',async t=>{
  const f=fixture(t);await f.audio.unlock();await tick();
  f.w.dispatchEvent(new f.w.PageTransitionEvent('pagehide',{persisted:true}));assert.equal(f.activeSources().length,0);assert.notEqual(f.contexts[0].state,'closed');
  f.w.dispatchEvent(new f.w.PageTransitionEvent('pageshow',{persisted:true}));await tick();assert.equal(f.activeSources().filter(s=>s.loop).length,1);
  f.w.dispatchEvent(new f.w.PageTransitionEvent('pagehide',{persisted:false}));await tick();assert.equal(f.activeSources().length,0);assert.equal(f.contexts[0].state,'closed');
  const neverActivated=fixture(t);neverActivated.w.dispatchEvent(new neverActivated.w.PageTransitionEvent('pageshow',{persisted:true}));assert.equal(neverActivated.contexts.length,0);
});
