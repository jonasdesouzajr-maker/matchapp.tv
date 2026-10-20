/* MatchApp's original cinematic interaction suite, 2026-10-20.
 * One cue per deliberate action, shared with the existing sound entry points.
 * No startup audio, telemetry, quota calls, speech changes or third-party samples. */
(function(){
 'use strict';
 if(window.MatchAppFeedback||/^\/(kids|private-voice|oauth)(?:\/|$)/.test(location.pathname)||/\/(callback|confirm)\.html$/.test(location.pathname)||document.body?.classList.contains('page-kids'))return;
 var ctx=null,ready=false,gestureSeen=false,lastHaptic=0,lastSound=0,intent=null,serial=0,buffers={},loading={},voices=[];
 var lastRevealKey='',lastRevealAt=0,purchaseToken={},pendingPurchase=null,seenPurchases=new Set();
 var pendingPurchaseKey='match_cinematic_purchase_pending_v1',purchaseSeenPrefix='match_cinematic_purchase_seen_v1:';
 var palette={
  tap:[[659.25,0,.7]],open:[[523.25,0,.56],[783.99,.045,.43]],close:[[783.99,0,.48],[523.25,.035,.4]],
  select:[[659.25,0,.57],[880,.035,.36]],confirm:[[523.25,0,.54],[783.99,.045,.4],[1046.5,.09,.29]],
  mic:[[440,0,.52],[659.25,.055,.4]],error:[[440,0,.5],[392,.065,.35]],
  clapper:[[190,0,.60],[370,.003,.24],[740,.016,.10]],
  reel:[[659.25,0,.20]],reelOpen:[[523.25,0,.20]],reelClose:[[440,0,.18]],reelSelect:[[659.25,0,.18]],
  reveal:[[783.99,0,.50],[1174.66,.055,.33],[1567.98,.11,.21],[2349.32,.17,.11]],
  saveChime:[[659.25,0,.42],[987.77,.055,.25]],
  purchaseCash:[[1174.66,.085,.44],[1567.98,.13,.30],[2349.32,.19,.20]],
  // Original destination signatures share the glass timbre, with distinct
  // first notes so even an immediate document navigation keeps its identity.
  navHome:[[523.25,0,.46],[659.25,.035,.29],[783.99,.075,.19]],
  navExplore:[[587.33,0,.46],[783.99,.035,.29],[1174.66,.075,.19]],
  navMatches:[[659.25,0,.46],[783.99,.04,.29],[1046.5,.08,.19]],
  navMyList:[[783.99,0,.43],[659.25,.035,.27],[987.77,.075,.18]],
  navProfile:[[880,0,.42],[659.25,.035,.27],[523.25,.075,.18]]
 };
 var dockSignatures={
  home:{cue:'navHome',haptic:10},explore:{cue:'navExplore',haptic:[7,18,5]},
  matches:{cue:'navMatches',haptic:[6,18,6]},mylist:{cue:'navMyList',haptic:[5,18,9]},
  profile:{cue:'navProfile',haptic:8}
 };
 var aliases={tap:'clapper',nav:'reel',tab:'reelSelect',open:'reelOpen',close:'reelClose',select:'reelSelect',primary:'clapper',result:'reveal',save:'saveChime',like:'saveChime',share:'saveChime',together:'clapper',soundOn:'confirm',back:'reelClose'};
 var cinematicKinds=new Set(['clapper','reel','reelOpen','reelClose','reelSelect','reveal','saveChime','purchaseCash']);
 function allowed(){try{return localStorage.getItem('match_soundEnabled')!=='false'}catch(_){return true}}
 function reduced(){try{return document.documentElement.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return true}}
 function haptics(){try{return localStorage.getItem('match_hapticsEnabled')!=='false'&&!reduced()}catch(_){return false}}
 function speaking(){return !!(window.speechSynthesis?.speaking||document.querySelector('#ma-jonas-home.jh-speaking,#ma-ambient-jonas[data-speaking="1"],#ma-ambient-panel[data-speaking="1"]'))}
 function vibrate(pattern){
  if(!haptics()||document.hidden||Date.now()-lastHaptic<85)return;
  lastHaptic=Date.now();try{navigator.vibrate?.(pattern)}catch(_){}
 }
 function context(){
  if(!allowed())return null;
  var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  try{if(!ctx||ctx.state==='closed')ctx=new AC();if(ctx.state==='suspended')ctx.resume?.().catch?.(()=>{});return ctx}catch(_){return null}
 }
 function preload(kind){
  // Navigation is authored directly in this one engine, without extra files
  // or a fetch that would race the destination page.
  if(kind.indexOf('nav')===0||cinematicKinds.has(kind))return;
  if(buffers[kind]||loading[kind]||!ctx||typeof fetch!=='function')return;
  loading[kind]=true;
  fetch('/assets/audio/matchapp-'+kind+'.wav?v=glass20261020-1',{credentials:'same-origin'})
   .then(function(r){if(!r.ok)throw Error('audio unavailable');return r.arrayBuffer()})
   .then(function(bytes){return ctx.decodeAudioData(bytes)})
   .then(function(buffer){buffers[kind]=buffer}).catch(function(){/* Authored synthesis below remains usable offline. */});
 }
 function release(){
  voices.forEach(function(v){try{v.stop()}catch(_){}try{v.disconnect()}catch(_){}});voices=[];
 }
 function noise(audio,delay,duration,level,cutoff){
  if(typeof audio.createBuffer!=='function'||typeof audio.createBufferSource!=='function')return;
  var length=Math.max(1,Math.ceil(audio.sampleRate*duration)),buffer=audio.createBuffer(1,length,audio.sampleRate),samples=buffer.getChannelData(0);
  for(var i=0;i<length;i++){var t=i/audio.sampleRate;samples[i]=(Math.random()*2-1)*Math.exp(-t/(duration/6));}
  var source=audio.createBufferSource(),gain=audio.createGain(),filter=typeof audio.createBiquadFilter==='function'?audio.createBiquadFilter():null;
  source.buffer=buffer;gain.gain.setValueAtTime(level,audio.currentTime+delay);
  if(filter){filter.type='highpass';filter.frequency.setValueAtTime(cutoff||1000,audio.currentTime+delay);source.connect(filter);filter.connect(gain);}else source.connect(gain);
  gain.connect(audio.destination);source.start(audio.currentTime+delay);source.stop(audio.currentTime+delay+duration);voices.push(source);
  source.onended=function(){try{source.disconnect();filter?.disconnect();gain.disconnect()}catch(_){}};
 }
 function synth(kind,audio){
  // Original clapper/reel/bling/coin timbres use generated noise and oscillators,
  // with no recordings, paid samples, loops or automatic carousel triggers.
  if(kind==='clapper'){noise(audio,0,.045,.052,850);noise(audio,.018,.022,.020,1700);}
  else if(kind.indexOf('reel')===0||kind.indexOf('nav')===0){[0,.028,.064].forEach(function(delay,i){noise(audio,delay,.014,.012-i*.002,2300);});}
  else if(kind==='reveal')noise(audio,.055,.12,.006,6500);
  else if(kind==='purchaseCash'){noise(audio,0,.06,.035,700);noise(audio,.038,.026,.018,1800);noise(audio,.26,.035,.006,5600);}
  var life=kind==='clapper'?.065:kind.indexOf('reel')===0?.065:kind==='reveal'?.34:kind==='purchaseCash'?.34:kind==='saveChime'?.24:.19;
  var gains=kind==='clapper'?[.018,.003,.001]:kind.indexOf('reel')===0?[.012,.0025,.0008]:[.035,.0085,.0035];
  palette[kind].forEach(function(note){
   [1,2.71,4.09].forEach(function(ratio,index){
    var o=audio.createOscillator(),g=audio.createGain(),start=audio.currentTime+.002+note[1];
    o.type='sine';o.frequency.setValueAtTime(note[0]*ratio,start);
    g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(note[2]*gains[index],start+.003);
    g.gain.exponentialRampToValueAtTime(.0001,start+life);o.connect(g);g.connect(audio.destination);
    o.start(start);o.stop(start+life+.01);voices.push(o);o.onended=function(){try{o.disconnect();g.disconnect()}catch(_){}};
   });
  });
 }
 function play(kind,token){
  if(['cash','purchase','purchaseCash','chaChing'].includes(kind)&&token!==purchaseToken)return false;
  if(!gestureSeen||!allowed()||document.hidden||speaking())return false;
  var result=kind==='result',cash=kind==='purchaseCash',now=Date.now(),run=window.__matchappMatchRunId,revealKey=result&&run!==undefined&&run!==null?'run:'+String(run):'';
  kind=aliases[kind]||kind||'clapper';if(!palette[kind])kind='clapper';
  if(result&&((revealKey&&revealKey===lastRevealKey)||(!revealKey&&now-lastRevealAt<400)))return false;
  if(!result&&!cash&&intent&&now-intent.at<100){if(intent.played)return false;intent.played=true;kind=aliases[intent.kind]||intent.kind;}
  else if((result||cash)&&intent&&now-intent.at<100)intent.played=true;
  if(now-lastSound<36&&!result&&!cash)return false;
  var audio=context();if(!audio)return false;lastSound=now;release();
  if(result){lastRevealKey=revealKey;lastRevealAt=now;}
  if(result)vibrate([16,24,10]);
  if(cash)vibrate([12,24,20]);
  if(buffers[kind]){
   try{var source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffers[kind];gain.gain.value=.42;source.connect(gain);gain.connect(audio.destination);source.start();voices.push(source);source.onended=function(){try{source.disconnect();gain.disconnect()}catch(_){}};return true}catch(_){}
  }
  synth(kind,audio);preload(kind);return true;
 }
 function receiptKey(evidence){
  if(!evidence||evidence.delivered!==true||typeof evidence.reference!=='string')return '';
  if(evidence.provider==='stripe'&&/^cs_(?:test_|live_)?[A-Za-z0-9_]{1,220}$/.test(evidence.reference))return 'stripe:'+evidence.reference;
  if(evidence.provider==='play'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(evidence.reference))return 'play:'+evidence.reference;
  return '';
 }
 function clearPendingPurchase(){pendingPurchase=null;try{sessionStorage.removeItem(pendingPurchaseKey)}catch(_){}}
 function flushPurchase(){
  if(!pendingPurchase)return false;
  if(!receiptKey(pendingPurchase)||!Number.isFinite(pendingPurchase.at)||Date.now()-pendingPurchase.at>90000||pendingPurchase.at>Date.now()+1000||!allowed()){clearPendingPurchase();return false;}
  if(!play('purchaseCash',purchaseToken))return false;
  clearPendingPurchase();return true;
 }
 function purchaseConfirmed(evidence){
  var key=receiptKey(evidence);if(!key)return false;
  if(seenPurchases.has(key))return false;
  try{if(sessionStorage.getItem(purchaseSeenPrefix+key)==='1')return false;sessionStorage.setItem(purchaseSeenPrefix+key,'1');}catch(_){}
  seenPurchases.add(key);
  if(!allowed())return false;
  pendingPurchase={provider:evidence.provider,reference:evidence.reference,delivered:true,at:Date.now()};
  try{sessionStorage.setItem(pendingPurchaseKey,JSON.stringify(pendingPurchase))}catch(_){}
  // Confirmations can arrive after a full checkout navigation. Keep the gesture
  // gate: a verified pending cue waits for a deliberate action, never a URL flag.
  flushPurchase();return true;
 }
 function wrapExisting(){
  ['playMatchAppSound','maPlayUISound'].forEach(function(name){
   if(typeof window[name]!=='function'||window[name].__maSensory)return;
   var wrapped=function(kind){return play(kind)};wrapped.__maSensory=true;window[name]=wrapped;
  });
 }
 var micSelector='#mic-btn-discover,#mic-button,.mic-btn,.jh-mic,[data-action="mic"],[data-voice-trigger],.ma-voice-mic,.ja-bubble,#ma-jonas-home-bubble';
 function dockSignature(el){
  if(!el.matches('a[href]')||!el.closest('.ma-cinema-dock'))return null;
  var destination=el.getAttribute('data-ma-dock-destination');
  return Object.prototype.hasOwnProperty.call(dockSignatures,destination)?dockSignatures[destination]:null;
 }
 function kindFor(el){
  if(el.matches(micSelector)||el.closest(micSelector))return 'mic';
  if(el.matches('summary'))return el.parentElement.open?'close':'open';
  if(el.matches('.crit-toggle,[aria-expanded]'))return el.getAttribute('aria-expanded')==='true'?'close':'open';
  if(el.matches('[data-action="close"],[data-dismiss],.modal-close,.ja-close,.jh-close,[class*="close-btn"]'))return 'close';
  if(el.matches('.ma-chip,.crit-chip,.ma-tab,.portfolio-tab,[role="tab"],input[type="checkbox"],input[type="radio"],select'))return 'select';
  if(el.matches('#btn-watch-later,#btn-seen-it,[data-action="save"],[data-action="like"],[id*="save"],[id*="share"]'))return 'save';
  if(el.matches('.gold-btn,.ma-primary,.composer-send,[type="submit"]'))return 'clapper';
  if(el.matches('a[href]'))return 'nav';
  return 'tap';
 }
 function onClick(e){
  if(!e.isTrusted||document.hidden)return;
  gestureSeen=true;
  var el=e.target.closest?.('button,a[href],summary,[role="button"],input[type="checkbox"],input[type="radio"],select');
  if(!el)return;
  if(el.matches('.sound-toggle-btn')){intent=null;wrapExisting();setTimeout(function(){if(!allowed()){release();clearPendingPurchase();}},0);return;}
  if(el.closest('.adsbygoogle,[data-ad-slot]')||el.matches(':disabled,[aria-disabled="true"]')){intent={at:Date.now(),played:true,kind:'tap'};return;}
  wrapExisting();var nav=dockSignature(el),kind=nav?nav.cue:kindFor(el),mic=kind==='mic';
  intent={id:++serial,at:Date.now(),kind:kind,played:false};var token=intent.id;
  if(!mic&&!el.matches('a[href]')&&flushPurchase()){intent.played=true;return;}
  if(nav){
   vibrate(nav.haptic);
   // Start within this deliberate gesture before the browser follows the
   // unchanged href. The consumed intent suppresses legacy duplicate cues.
   play(kind);return;
  }
  vibrate(mic?115:12);
  // AudioContext is unlocked inside the user's gesture, including iOS Safari.
  if(allowed())context();
  setTimeout(function(){if(intent?.id===token&&!intent.played)play(kind)},0);
 }
 function onChange(e){
  if(!e.isTrusted||!e.target.matches?.('select,input[type="range"]'))return;
  gestureSeen=true;
  wrapExisting();intent=null;play('select');vibrate(8);
 }
 function init(){
  if(ready)return;ready=true;wrapExisting();
  try{var stored=JSON.parse(sessionStorage.getItem(pendingPurchaseKey)||'null');if(stored&&receiptKey(stored))pendingPurchase=stored;}catch(_){}
  document.addEventListener('click',onClick,{capture:true,passive:true});
  document.addEventListener('change',onChange,{passive:true});
 }
 window.MatchAppFeedback={play:function(kind){return play(kind)},purchaseConfirmed:purchaseConfirmed,stop:release,version:'cinema20261020-1'};
 document.addEventListener('visibilitychange',function(){if(document.hidden)release()});
 document.addEventListener('matchapp:audio-ready',wrapExisting);
 document.addEventListener('DOMContentLoaded',wrapExisting,{once:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
