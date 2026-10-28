/* Lumina's isolated audio owner. Original effects come from Jonas's Android APK;
 * the three ambient scores below are composed here and synthesized locally.
 * No context, samples or music are started before an explicit user gesture. */
(function () {
  'use strict';
  var host = window, doc = document, STORAGE = 'luminaAudioSettingsV1';
  var settings = {sound:true,music:true,volume:0.45};
  try {
    var stored = JSON.parse(host.localStorage.getItem(STORAGE));
    if (stored && typeof stored === 'object') {
      if (typeof stored.sound === 'boolean') settings.sound = stored.sound;
      if (typeof stored.music === 'boolean') settings.music = stored.music;
      if (typeof stored.volume === 'number' && Number.isFinite(stored.volume)) settings.volume = Math.max(0,Math.min(1,stored.volume));
    }
  } catch (_) { /* Audio preferences remain usable without browser storage. */ }

  var context = null, master = null, effectBus = null;
  var activated = false, desiredActive = true, disposed = false, away = false;
  var theme = 'starlight', musicVoice = null, resumePending = null, resumeAttempt = null;
  var voices = [], queuedEffects = [], buffers = Object.create(null), musicBuffers = Object.create(null);
  var sampleLoads = new Set(), attemptedSamples = false, lastEffect = Object.create(null);
  var assetBase;
  try { assetBase = new URL('sounds/',doc.currentScript && doc.currentScript.src || host.location.href); }
  catch (_) { assetBase = null; }

  // Four six-second phrases, with soft overlapping pads and a four-note motif.
  // Notes are MIDI pitches, not samples or quotations from an existing song.
  var scores = {
    starlight:{chords:[[50,54,57],[47,50,54],[43,47,50],[45,49,52]],melody:[[74,78,81,78],[71,74,78,74],[67,71,74,71],[69,73,76,73]],brightness:0.12},
    grove:{chords:[[52,55,59],[48,52,55],[43,47,50],[50,54,57]],melody:[[76,79,83,79],[72,76,79,76],[71,74,79,74],[74,78,81,78]],brightness:0.2},
    ocean:{chords:[[48,52,55],[45,48,52],[41,45,48],[43,47,50]],melody:[[72,76,79,76],[69,72,76,72],[65,69,72,69],[67,71,74,71]],brightness:0.06}
  };
  function now() { return host.performance && typeof host.performance.now === 'function' ? host.performance.now() : Date.now(); }
  function eligible() { return !disposed && !away && !doc.hidden && desiredActive && activated; }
  function audible() { return eligible() && context && context.state === 'running' && settings.volume > 0; }
  function persist() { try { host.localStorage.setItem(STORAGE,JSON.stringify(settings)); } catch (_) {} }
  function disconnect(node) { try { node.disconnect(); } catch (_) {} }
  function setGain(node,value,at) {
    if (!node) return;
    try { node.gain.cancelScheduledValues(at); node.gain.setValueAtTime(value,at); }
    catch (_) { node.gain.value = value; }
  }
  function stopVoice(voice) {
    if (!voice || voice.closed) return;
    voice.closed = true;
    voice.sources.forEach(function (source) { source.onended = null; try { source.stop(); } catch (_) {} disconnect(source); });
    voice.nodes.forEach(disconnect);
    var index = voices.indexOf(voice); if (index >= 0) voices.splice(index,1);
    if (musicVoice === voice) musicVoice = null;
  }
  function stopEffects() { voices.slice().forEach(stopVoice); queuedEffects = []; }
  function stopMusic() { stopVoice(musicVoice); }
  function quiet() {
    if (resumeAttempt) {
      host.clearTimeout(resumeAttempt.timer); resumeAttempt.cancel();
      resumeAttempt = null; resumePending = null;
    }
    stopMusic(); stopEffects();
    if (context) {
      setGain(master,0,context.currentTime);
      try { var result = context.suspend(); if (result && result.catch) result.catch(function () {}); } catch (_) {}
    }
  }
  function createContext() {
    if (context || disposed) return !!context;
    var Constructor = host.AudioContext || host.webkitAudioContext;
    if (typeof Constructor !== 'function') return false;
    try {
      context = new Constructor({latencyHint:'interactive'});
      master = context.createGain(); effectBus = context.createGain();
      master.gain.value = 0; effectBus.gain.value = 0.65;
      effectBus.connect(master); master.connect(context.destination);
      context.addEventListener('statechange',stateChanged);
      return true;
    } catch (_) {
      if (context) { try { var result = context.close(); if (result && result.catch) result.catch(function () {}); } catch (_) {} }
      context = null; master = null; effectBus = null; return false;
    }
  }
  function stateChanged() {
    if (!context || disposed) return;
    if (context.state !== 'running') { stopMusic(); stopEffects(); return; }
    if (!eligible()) { quiet(); return; }
    reconcile();
  }
  function decode(data) {
    return new Promise(function (resolve,reject) {
      try {
        // Both callback-only WebKit and promise-based implementations settle
        // this promise exactly once; a failed sample keeps the synth fallback.
        var result = context.decodeAudioData(data,resolve,reject);
        if (result && result.then) result.then(resolve,reject);
      } catch (error) { reject(error); }
    });
  }
  function loadSamples() {
    if (attemptedSamples || !context || typeof host.fetch !== 'function' || !assetBase || assetBase.origin !== host.location.origin) return;
    attemptedSamples = true;
    ['flip','match'].forEach(function (name) {
      var controller = typeof host.AbortController === 'function' ? new host.AbortController() : null;
      var load = {controller:controller,timer:null,cancel:null}; sampleLoads.add(load);
      var canceled = new Promise(function (_,reject) { load.cancel = function () { reject(new Error('audio canceled')); }; });
      var deadline = new Promise(function (_,reject) {
        load.timer = host.setTimeout(function () {
          if (controller) controller.abort(); reject(new Error('audio deadline'));
        },4500);
      });
      var operation = Promise.resolve().then(function () {
        return host.fetch(new URL(name+'.mp3',assetBase).href,{credentials:'omit',cache:'force-cache',signal:controller ? controller.signal : undefined});
      }).then(function (response) {
        if (!response.ok || Number(response.headers && response.headers.get('content-length')) > 1024*1024) throw new Error('audio response');
        return response.arrayBuffer();
      }).then(function (data) {
        if (disposed || data.byteLength > 1024*1024) throw new Error('audio unavailable');
        return decode(data);
      });
      Promise.race([operation,deadline,canceled]).then(function (buffer) {
        if (!disposed && buffer && buffer.duration > 0 && buffer.duration <= 8) buffers[name] = buffer;
      }).catch(function () { /* A short synthesized effect remains available. */ }).finally(function () {
        host.clearTimeout(load.timer); sampleLoads.delete(load);
      });
    });
  }
  function makeMusic(name) {
    if (musicBuffers[name]) return musicBuffers[name];
    var rate = 22050, length = rate*24, buffer = context.createBuffer(2,length,rate);
    var left = buffer.getChannelData(0), right = buffer.getChannelData(1), score = scores[name];
    var sine = Math.sin, exponential = Math.exp, twoPi = Math.PI*2;
    function note(midi,start,duration,amplitude,pan,pluck) {
      var frequency = 440*Math.pow(2,(midi-69)/12), count = Math.floor(duration*rate), offset = Math.floor(start*rate);
      var leftGain = Math.cos(pan*Math.PI/2), rightGain = Math.sin(pan*Math.PI/2);
      var step = twoPi*frequency/rate, attackLength = pluck ? 0.035 : 0.7, releaseLength = pluck ? 0.5 : 1.1;
      var index = (offset%length+length)%length;
      for (var n = 0; n < count; n++) {
        var time = n/rate;
        var attack = time < attackLength ? time/attackLength : 1;
        var release = duration-time < releaseLength ? (duration-time)/releaseLength : 1;
        var envelope = attack*attack*release*release*(pluck ? exponential(-time*1.7) : 1);
        var phase = step*n;
        var value = amplitude*envelope*(sine(phase)+score.brightness*sine(phase*2));
        left[index] += value*leftGain; right[index] += value*rightGain;
        index++; if (index === length) index = 0;
      }
    }
    score.chords.forEach(function (chord,bar) {
      chord.forEach(function (midi,voice) { note(midi,bar*6-0.4,6.8,0.14,0.25+voice*0.25,false); });
      note(chord[0]-12,bar*6,6,0.075,0.5,false);
      score.melody[bar].forEach(function (midi,beat) { note(midi,bar*6+beat*1.5,2.2,0.17,beat%2 ? 0.62 : 0.38,true); });
    });
    // Fixed gain preserves the gentle dynamics without loudness jumps at a
    // theme change. Wraparound note tails make each 24-second loop seamless.
    for (var i=0;i<length;i++) { left[i] *= 0.9; right[i] *= 0.9; }
    musicBuffers[name] = buffer; return buffer;
  }
  function startMusic() {
    if (musicVoice || !audible() || !settings.music) return;
    var voice = {sources:[],nodes:[],closed:false};
    try {
      var source = context.createBufferSource(), gain = context.createGain();
      voice.sources.push(source); voice.nodes.push(gain);
      source.buffer = makeMusic(theme); source.loop = true;
      var time = context.currentTime;
      gain.gain.setValueAtTime(0,time); gain.gain.linearRampToValueAtTime(0.24,time+0.4);
      source.connect(gain); gain.connect(master); musicVoice = voice;
      source.onended = function () { stopVoice(voice); };
      source.start();
    } catch (_) { stopVoice(voice); }
  }
  function reconcile() {
    if (!eligible()) { quiet(); return; }
    if (!context || context.state !== 'running') return;
    setGain(master,settings.volume,context.currentTime);
    if (!settings.sound || settings.volume === 0) stopEffects();
    if (!settings.music || settings.volume === 0) stopMusic(); else startMusic();
    var pending = queuedEffects.splice(0);
    pending.forEach(function (item) { if (now()-item.at < 400) performEffect(item.name); });
  }
  function resume() {
    if (!context || disposed || !eligible()) return Promise.resolve(false);
    if (context.state === 'running') { reconcile(); return Promise.resolve(true); }
    if (resumePending) return resumePending;
    var resumed;
    try { resumed = context.resume(); } catch (_) { return Promise.resolve(false); }
    var job = {timer:null,cancel:null}; resumeAttempt = job;
    var canceled = new Promise(function (resolve) { job.cancel = function () { resolve(false); }; });
    resumePending = Promise.race([Promise.resolve(resumed).then(function () { return true; }),canceled,new Promise(function (_,reject) {
      job.timer = host.setTimeout(function () { reject(new Error('audio resume deadline')); },1600);
    })]).then(function (resumed) {
      if (!resumed) return false;
      reconcile(); return !!(eligible() && context && context.state === 'running');
    }).catch(function () { return false; }).finally(function () {
      host.clearTimeout(job.timer);
      if (resumeAttempt === job) { resumeAttempt = null; resumePending = null; }
    });
    return resumePending;
  }
  function unlock() {
    if (disposed || away || doc.hidden) return Promise.resolve(false);
    // When the browser exposes transient activation, reject accidental calls
    // from page initialization. Later resumes reuse the previously granted
    // activation; they never create a fresh context on page load.
    if (!activated && host.navigator && host.navigator.userActivation && !host.navigator.userActivation.isActive) return Promise.resolve(false);
    if (!createContext()) return Promise.resolve(false);
    activated = true; loadSamples(); return resume();
  }
  function performEffect(name) {
    if (!audible() || !settings.sound) return false;
    while (voices.length >= 6) stopVoice(voices[0]);
    var voice = {sources:[],nodes:[],closed:false}; voices.push(voice);
    var time = context.currentTime, remaining = 0;
    function attach(source,gain,duration,offset) {
      voice.sources.push(source); voice.nodes.push(gain); remaining++;
      source.connect(gain); gain.connect(effectBus);
      source.onended = function () { remaining--; if (remaining === 0) stopVoice(voice); };
      source.start(time+offset); source.stop(time+offset+duration);
    }
    try {
      if (buffers[name]) {
        var source = context.createBufferSource(), gain = context.createGain();
        source.buffer = buffers[name]; gain.gain.value = name === 'match' ? 0.65 : 0.8;
        attach(source,gain,Math.min(source.buffer.duration,8),0);
      } else {
        var notes = {flip:[660],match:[659.25,987.77],miss:[196],win:[523.25,659.25,783.99,1046.5],level:[392,523.25,659.25],tap:[880]}[name];
        notes.forEach(function (frequency,index) {
          var oscillator = context.createOscillator(), gain = context.createGain();
          var duration = name === 'tap' ? 0.065 : name === 'flip' ? 0.09 : name === 'miss' ? 0.16 : 0.42;
          var offset = index*0.085, start = time+offset;
          oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency,start);
          gain.gain.setValueAtTime(0,start); gain.gain.linearRampToValueAtTime(0.22,start+0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);
          attach(oscillator,gain,duration,offset);
        });
      }
      return true;
    } catch (_) { stopVoice(voice); return false; }
  }
  function play(name) {
    if (!['flip','match','miss','win','level','tap'].includes(name) || !eligible() || !settings.sound || settings.volume === 0) return false;
    var at = now(), cooldown = name === 'flip' ? 45 : name === 'match' ? 100 : 30;
    if (typeof lastEffect[name] === 'number' && at-lastEffect[name] < cooldown) return false;
    lastEffect[name] = at;
    if (!context || context.state !== 'running') {
      if (resumePending) { if (queuedEffects.length === 3) queuedEffects.shift(); queuedEffects.push({name:name,at:at}); }
      return false;
    }
    return performEffect(name);
  }
  function setActive(value) { desiredActive = value === true; if (!eligible()) quiet(); else resume(); }
  function setTheme(value) {
    if (!Object.prototype.hasOwnProperty.call(scores,value) || value === theme || disposed) return;
    theme = value; stopMusic(); startMusic();
  }
  function setSound(value) { if (disposed) return; settings.sound = value === true; persist(); reconcile(); }
  function setMusic(value) { if (disposed) return; settings.music = value === true; persist(); reconcile(); }
  function setVolume(value) {
    if (disposed || typeof value !== 'number' || !Number.isFinite(value)) return;
    settings.volume = Math.max(0,Math.min(1,value)); persist(); reconcile();
  }
  function visibilityChanged() { if (doc.hidden) quiet(); else if (eligible()) resume(); }
  function pageHidden(event) { if (event.persisted) { away = true; quiet(); } else dispose(); }
  function pageShown(event) { if (event.persisted && !disposed) { away = false; if (eligible()) resume(); } }
  function dispose() {
    if (disposed) return;
    disposed = true; quiet();
    sampleLoads.forEach(function (load) { host.clearTimeout(load.timer); if (load.controller) load.controller.abort(); load.cancel(); }); sampleLoads.clear();
    doc.removeEventListener('visibilitychange',visibilityChanged);
    host.removeEventListener('pagehide',pageHidden); host.removeEventListener('pageshow',pageShown);
    if (context) {
      context.removeEventListener('statechange',stateChanged);
      disconnect(effectBus); disconnect(master);
      try { var result = context.close(); if (result && result.catch) result.catch(function () {}); } catch (_) {}
    }
    buffers = Object.create(null); musicBuffers = Object.create(null); queuedEffects = [];
  }
  doc.addEventListener('visibilitychange',visibilityChanged);
  host.addEventListener('pagehide',pageHidden); host.addEventListener('pageshow',pageShown);
  host.LuminaAudio = Object.freeze({unlock:unlock,setActive:setActive,setTheme:setTheme,play:play,
    getSettings:function () { return {sound:settings.sound,music:settings.music,volume:settings.volume}; },
    setSound:setSound,setMusic:setMusic,setVolume:setVolume,dispose:dispose});
})();
