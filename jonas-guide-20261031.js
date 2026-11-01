/* Grok 2026-10-31: Jonas guide pills, Back-closes-overlays hook, Explore grid tidy. Adult pages only. No AI/quota/ad/auth logic. */
(function(){
 'use strict';
 if(window.__maGuide20261031||/^\/kids(\/|$)/.test(location.pathname))return;window.__maGuide20261031=true;
 var pt=function(){return /^pt/i.test(document.documentElement.lang||navigator.language||'')};
 var LINKS=[['/', 'Início','Home'],['/explore.html','Explorar','Explore'],['/ebooks/','Livros','Books'],['/cooking/','Receitas','Recipes'],['/guides/choose-what-to-watch/','Guia','Guide'],['/events-archive.html','Eventos','Events'],['/profile/','Perfil','Profile']];
 function pills(panel){
  if(!panel||panel.querySelector('.ma-guide-pills'))return;
  var nav=document.createElement('nav');nav.className='ma-guide-pills';nav.setAttribute('aria-label',pt()?'Ir para':'Go to');
  LINKS.forEach(function(l){if(l[0]===location.pathname)return;var a=document.createElement('a');a.href=l[0];a.textContent=pt()?l[1]:l[2];nav.appendChild(a)});
  var anchor=panel.querySelector('.jh-full');var row=anchor&&anchor.parentNode!==panel?anchor.parentNode:anchor;if(row&&row.parentNode){row.parentNode.insertBefore(nav,row);}else{panel.appendChild(nav);}
 }
 var SEL='#ma-jonas-home-panel,#ma-ambient-panel';
 function scan(){document.querySelectorAll(SEL).forEach(function(p){if(!p.hidden)pills(p)})}
 document.addEventListener('click',function(){setTimeout(scan,350)},true);
 function visible(e){if(!e||e.hidden)return false;var r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'}
 window.MatchAppHandleBack=function(){
  try{
   var panels=document.querySelectorAll(SEL+',[role="dialog"]:not([hidden]),[aria-modal="true"]');
   for(var i=panels.length-1;i>=0;i--){var p=panels[i];if(!visible(p))continue;
    var x=p.querySelector('.jh-close,[aria-label*="Fechar"],[aria-label*="Close"],[data-close],button.close');
    if(x){x.click();return true}}
   var open=[].slice.call(document.querySelectorAll('details[open]')).filter(visible).pop();
   if(open&&open.getBoundingClientRect().top<innerHeight){open.open=false;return true}
   var back=[].slice.call(document.querySelectorAll('button,a')).filter(function(b){return visible(b)&&/^(Voltar|Back)$/i.test((b.textContent||'').trim())}).pop();
   if(back){back.click();return true}
  }catch(e){}
  return false;
 };
 if(!document.querySelector('link[href*="ui-premium-polish-20261031.css"]')){var l=document.createElement('link');l.rel='stylesheet';l.href='/ui-premium-polish-20261031.css?v=6';(document.head||document.documentElement).appendChild(l);}
})();

/* ===== t307u/t308u: instant selection, cinematic loader, Android immersive layer ===== */
(function(){
  'use strict';
  if(window.__maExp20261031)return;window.__maExp20261031=1;
  var path=location.pathname||'/';if(/^\/kids/i.test(path))return;
  var root=document.documentElement;
  var ANDROID=root.classList.contains('matchapp-ai-android')||/MatchAppAiAndroid/.test(navigator.userAgent)||!!window.MatchAppFx;
  var REDUCED=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(ANDROID){root.classList.add('ma-fx');try{var vs=document.createElement('style');vs.textContent='@view-transition{navigation:auto}';document.head.appendChild(vs)}catch(_){}}

  /* --- Haptics + sounds (Android shell only) --- */
  var bridge=window.MatchAppFx||null;
  function muted(){try{return localStorage.getItem('ma.fx.muted')==='1'}catch(_){return false}}
  function buzz(ms){if(!ANDROID)return;try{if(bridge&&bridge.vibrate)bridge.vibrate(ms|0);else if(navigator.vibrate)navigator.vibrate(ms)}catch(_){}}
  var ac=null;
  function tone(f,d,v){if(!ANDROID||muted())return;try{if(bridge&&bridge.soundAllowed&&!bridge.soundAllowed())return;ac=ac||new (window.AudioContext||window.webkitAudioContext)();var o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;o.type='sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v||.04,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+d+.02)}catch(_){}}
  var fx={tap:function(){buzz(8);tone(880,.06,.025)},open:function(){buzz(14);tone(660,.12,.03);setTimeout(function(){tone(990,.1,.025)},60)},close:function(){buzz(10);tone(520,.1,.025)},match:function(){buzz(30);[523,659,784,1047].forEach(function(f,i){setTimeout(function(){tone(f,.18,.035)},i*90)})}};
  window.MatchAppFxUi=fx;
  var pf={};function prefetch(h){return;try{var u=new URL(h,location.href);if(u.origin!==location.origin||pf[u.pathname]||u.pathname===location.pathname)return;pf[u.pathname]=1;var l=document.createElement('link');l.rel='prefetch';l.href=u.pathname;document.head.appendChild(l)}catch(_){}}
  function idlePrefetch(){/* Cloudflare answers Sec-Purpose:prefetch for dynamic HTML with 503; idle prefetch only produced console errors. */}
  if(!navigator.connection||!navigator.connection.saveData)(window.requestIdleCallback||setTimeout)(idlePrefetch,{timeout:6000});

  /* --- Instant optimistic selection (visual only; app logic unchanged) --- */
  document.addEventListener('pointerdown',function(e){
    var c=e.target.closest&&e.target.closest('.crit-chip:not(.crit-more),.jh-suggestion,.ma-guide-pills a,button,a[href],summary,[role=button]');if(c&&c.matches('a[href]'))prefetch(c.href);
    if(!c)return;
    if(c.classList.contains('crit-chip')){c.classList.toggle('ma-tap-on',!c.classList.contains('is-on'));c.classList.toggle('ma-tap-off',c.classList.contains('is-on'))}
    c.classList.add('ma-press');if(c.matches('.crit-chip,.jh-suggestion,.ma-guide-pills a,.ma-cinema-dock a'))fx.tap();
  },{capture:true,passive:true});
  ['pointerup','pointercancel'].forEach(function(t){document.addEventListener(t,function(){var p=document.querySelectorAll('.ma-press');setTimeout(function(){for(var i=0;i<p.length;i++)p[i].classList.remove('ma-press')},90)},{capture:true,passive:true})});

  /* Jonas open/close + match found cues */
  document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('.jh-close,#ma-jonas-home-close,[aria-label*="Fechar"],[aria-label*="Close"]');if(t&&t.closest('#ma-jonas-home-panel,#ma-ambient-panel'))fx.close();},true);
  function watch(){var p=document.getElementById('ma-jonas-home-panel'),r=document.getElementById('result-box'),lb=document.getElementById('loading-box');
    if(p&&!p.__maW){p.__maW=1;var was=!p.hidden;new MutationObserver(function(){var now=!p.hidden;if(now&&!was)fx.open();was=now}).observe(p,{attributes:true,attributeFilter:['hidden']})}
    if(r&&!r.__maW){r.__maW=1;new MutationObserver(function(){if(r.style.display!=='none'&&!r.hidden)fx.match()}).observe(r,{attributes:true,attributeFilter:['hidden','style']})}
    if(lb&&!lb.__maL)mountLoader(lb)}

  /* --- Cinematic loader: film reel + filling meter pill + AI stars --- */
  function mountLoader(lb){lb.__maL=1;var stage=lb.querySelector('.scanner-stage');if(!stage)return;
    var d=document.createElement('div');d.className='ma-cine-loader';d.setAttribute('aria-hidden','true');
    d.innerHTML='<svg class="ma-reel" viewBox="0 0 100 100"><defs><radialGradient id="maRg" cx="40%" cy="35%"><stop offset="0" stop-color="#F6F0E1"/><stop offset=".55" stop-color="#E6C36A"/><stop offset="1" stop-color="#9C7A2E"/></radialGradient></defs><g class="ma-reel-spin"><circle cx="50" cy="50" r="46" fill="url(#maRg)"/><circle cx="50" cy="50" r="40" fill="none" stroke="#2A1846" stroke-width="2" opacity=".5"/>'+[0,60,120,180,240,300].map(function(a){var r=a*Math.PI/180;return '<circle cx="'+(50+26*Math.cos(r)).toFixed(1)+'" cy="'+(50+26*Math.sin(r)).toFixed(1)+'" r="9.5" fill="#2A1846"/>'}).join('')+'<circle cx="50" cy="50" r="7" fill="#2A1846"/><circle cx="50" cy="50" r="3" fill="#E6C36A"/></g></svg>'+
      '<div class="ma-meter"><i class="ma-meter-fill"></i><i class="ma-meter-sheen"></i></div>'+
      '<span class="ma-star s1">✦</span><span class="ma-star s2">✧</span><span class="ma-star s3">✦</span><span class="ma-star s4">✧</span><span class="ma-star s5">✦</span>';
    stage.parentNode.insertBefore(d,stage);
    var src=document.getElementById('ai-progress-bar'),fill=d.querySelector('.ma-meter-fill');
    function sync(){var w=src&&src.style.width;var v=parseFloat(w);if(!isNaN(v))fill.style.transform='scaleX('+Math.max(.04,Math.min(1,v/100))+')'}
    if(src)new MutationObserver(sync).observe(src,{attributes:true,attributeFilter:['style']});sync()}

  /* --- 3D tilt on posters/cards (Android shell, fine motion only) --- */
  if(ANDROID&&!REDUCED){var cur=null,raf=0,px=0,py=0;
    var SEL='.ref-topic,.premium-card .poster,.event-poster-link,.billboard-art,.ma-top-titles a,.title-card';
    document.addEventListener('pointerdown',function(e){cur=e.target.closest&&e.target.closest(SEL);if(cur){cur.classList.add('ma-tilt');move(e)}},{passive:true,capture:true});
    function move(e){if(!cur)return;var r=cur.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;if(!raf)raf=requestAnimationFrame(function(){raf=0;if(cur)cur.style.transform='perspective(700px) rotateX('+(-py*8).toFixed(2)+'deg) rotateY('+(px*10).toFixed(2)+'deg) scale(.985)'})}
    document.addEventListener('pointermove',move,{passive:true});
    ['pointerup','pointercancel'].forEach(function(t){document.addEventListener(t,function(){if(cur){var c=cur;cur=null;c.style.transform='';setTimeout(function(){c.classList.remove('ma-tilt')},260)}},{passive:true,capture:true})});
  }

  /* --- Sound toggle pill inside the Jonas guide (Android only) --- */
  function addToggle(){if(!ANDROID)return;var nav=document.querySelector('.ma-guide-pills');if(!nav||nav.querySelector('.ma-fx-toggle'))return;var pt=/^pt/i.test(root.lang||navigator.language||'');
    var b=document.createElement('button');b.type='button';b.className='ma-fx-toggle';
    function label(){b.textContent=muted()?(pt?'🔇 Sons desligados':'🔇 Sounds off'):(pt?'🔊 Sons ligados':'🔊 Sounds on');b.setAttribute('aria-pressed',String(!muted()))}
    b.addEventListener('click',function(){try{localStorage.setItem('ma.fx.muted',muted()?'0':'1')}catch(_){}label();fx.tap()});label();nav.appendChild(b)}

  function tick(){watch();addToggle()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick);else tick();
  new MutationObserver(function(){if(!tick.p){tick.p=1;requestAnimationFrame(function(){tick.p=0;tick()})}}).observe(document.documentElement,{childList:true,subtree:true});
})();
