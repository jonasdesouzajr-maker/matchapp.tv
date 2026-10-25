/* MatchApp Ai UI fixes, 2026-10-23 (adult pages only). Loaded by
   patches/jonas-adult-page.js. Decorative/UI only: no ads, auth or SEO changes. */
(function(){
 'use strict';
 if(window.__maUiFix1023)return;window.__maUiFix1023=true;
 if(/^\/kids(\/|$)/.test(location.pathname))return;
 function isKids(){var b=document.body;return !b||b.classList.contains('kids-body')||b.classList.contains('page-kids')||document.documentElement.hasAttribute('data-kids-mode')}
 var XSVG='<svg class="ma-x" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';

 /* 2. Poster wall: make sure the collage script runs on every adult page. */
 function ensureWall(){
  if(isKids()||document.querySelector('.poster-wall,script[src*="/poster-wall.js"]'))return;
  var s=document.createElement('script');s.src='/poster-wall.js?v=20261023-ui1&posters=20261020-1&masthead=20261025-1';s.defer=true;
  (document.body||document.head).appendChild(s);
 }

 /* 1. Genuine controls that are only a text link with a hairline edge. */
 function polishPills(root){
  (root||document).querySelectorAll('a[data-ma-control-pill],button[data-ma-control-pill]').forEach(function(el){
   if(el.classList.contains('ma-pill-polish')||el.hasAttribute('data-ma-pill-exclude'))return;
   if(el.closest('[data-ma-pill-exclude],ins.adsbygoogle,[data-ad-slot],.ma-reference-dock,.ma-cinema-dock,footer,.streaming-links,.seo-footer-links,.ma-home-legal-row,.ma-home-legal-meta,.mp-footer-actions,#ma-ambient-panel .ja-panel-head,#ma-jonas-home-panel .jh-head,.poster-wall,article,[class*="card"],[class*="step"],[class*="chapter"],[class*="tour"],[class*="crumb"],[aria-label*="readcrumb"],[class*="format"],[class*="edition"]'))return;
   if(el.matches('.ja-close,.jh-close,.ma-chat-grip,.ma-ui-grip,.gold-btn,[class*="pill"],[class*="notification-button"]'))return;
   var text=(el.textContent||'').trim();if(!text||text.length>40)return;
   if(el.querySelector('img'))return;
   var cs=getComputedStyle(el);
   var bg=cs.backgroundImage!=='none'||!/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
   var padded=(parseFloat(cs.paddingLeft)||0)>=10;
   if(bg||padded)return;
   if([].filter.call(el.children,function(c){return c.tagName!=='svg'&&c.tagName!=='SVG'&&(c.textContent||'').trim();}).length>1)return;
   var r=el.getBoundingClientRect();if(r.width===0&&r.height===0)return;
   el.classList.add('ma-pill-polish');
   if(el.offsetHeight>46){el.classList.remove('ma-pill-polish');el.setAttribute('data-ma-pill-exclude','');}
  });
 }

 /* 5. Crisp close X + reliable close on click and tap. */
 function fixClose(){
  document.querySelectorAll('#ma-ambient-panel .ja-close,#ma-jonas-home-close').forEach(function(btn){
   if(btn.dataset.maXFixed)return;btn.dataset.maXFixed='1';
   btn.innerHTML=XSVG;
   btn.addEventListener('click',function(){
    var panel=btn.closest('#ma-ambient-panel,#ma-jonas-home-panel');
    setTimeout(function(){
     if(!panel||panel.hidden)return;
     if(panel.id==='ma-ambient-panel'&&window.MatchAppAmbientJonas&&window.MatchAppAmbientJonas.isOpen())window.MatchAppAmbientJonas.close();
     else if(!panel.hidden)document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    },60);
   });
  });
 }

 /* 4. Resizable AI answer areas: mouse, touch and keyboard, clamped. */
 var KEY='ma-ui-answer-h-v1';
 function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(_){return{}}}
 function save(o){try{localStorage.setItem(KEY,JSON.stringify(o))}catch(_){}}
 function limits(){var vh=(window.visualViewport&&window.visualViewport.height)||innerHeight;return{min:200,max:Math.max(260,Math.round(vh*0.78))}}
 function clamp(h){var l=limits();return Math.max(l.min,Math.min(l.max,Math.round(h)))}
 function makeResizable(box){
  if(!box||box.dataset.maUiResizable)return;
  if(!box.textContent.trim()&&!box.children.length)return;
  box.dataset.maUiResizable='1';box.classList.add('ma-ui-resizable');
  var grip=document.createElement('div');grip.className='ma-ui-grip';grip.setAttribute('role','separator');grip.setAttribute('aria-orientation','horizontal');
  grip.setAttribute('aria-label','Resize answer area');grip.tabIndex=0;
  box.insertAdjacentElement('afterend',grip);
  var saved=load()[box.id];if(saved){box.style.height=clamp(saved)+'px';box.style.maxHeight='none';}
  function set(h){h=clamp(h);box.style.height=h+'px';box.style.maxHeight='none';grip.setAttribute('aria-valuenow',String(h));var o=load();o[box.id]=h;save(o);}
  var startY=0,startH=0,id=null;
  grip.addEventListener('pointerdown',function(e){if(e.button>0)return;id=e.pointerId;startY=e.clientY;startH=box.getBoundingClientRect().height;try{grip.setPointerCapture(id)}catch(_){}e.preventDefault();});
  grip.addEventListener('pointermove',function(e){if(id!==e.pointerId)return;set(startH+(e.clientY-startY));});
  function end(e){if(id!==e.pointerId)return;id=null;try{grip.releasePointerCapture(e.pointerId)}catch(_){}}
  grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
  grip.addEventListener('keydown',function(e){var h=box.getBoundingClientRect().height;if(e.key==='ArrowDown'){set(h+24);e.preventDefault()}else if(e.key==='ArrowUp'){set(h-24);e.preventDefault()}});
 }
 function scanResizable(){
  ['chat-log','ma-ai-answer'].forEach(function(id){var b=document.getElementById(id);if(b&&!b.hidden)makeResizable(b);});
 }

 /* chat-resize sets an inline display:flex!important that defeats [hidden]. */
 function watchHidden(){
  document.querySelectorAll('#ma-ambient-panel,#ma-jonas-home-panel').forEach(function(panel){
   if(panel.__maHidWatch)return;panel.__maHidWatch=true;
   var sync=function(){if(panel.hidden)panel.style.removeProperty('display');};
   sync();if(window.MutationObserver)new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['hidden','style']});
  });
 }

 var queued=false;
 function dedupeBrand(){
  var top=document.querySelector('#ma-reference-header img[src*="matchapp-ai-mark"]');if(!top||!top.getBoundingClientRect().width)return;
  document.querySelectorAll('.matchapp-brand-bar .matchapp-brand-link').forEach(function(a){if(!a.closest('#ma-reference-header')&&a.querySelector('img.ma-playai-mark'))a.classList.add('ma-ui-dup-brand');});
 }
 function run(){queued=false;if(isKids())return;dedupeBrand();polishPills();fixClose();watchHidden();scanResizable();}
 function queue(){if(queued)return;queued=true;(window.requestAnimationFrame||setTimeout)(run);}
 function start(){
  if(isKids())return;
  ensureWall();run();
  if(window.MutationObserver){var n=0;var mo=new MutationObserver(function(){queue();if(++n>4000)mo.disconnect();});mo.observe(document.body,{childList:true,subtree:true});}
  window.addEventListener('load',function(){ensureWall();queue();setTimeout(queue,1500);},{once:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* Round 4: Jonas face life. One controller for every Jonas portrait (launcher
   bubble, ambient panel head, home bubble and medallion). Uses the aligned
   rest/blink/smile/aa/ee/oh photos as cross-faded layers, never warps the image.
   Hooks only into existing state: jh-speaking, data-speaking, speechSynthesis
   and the chat's #ai-workflow-fill progress (thinking). */
(function(){
 if(document.documentElement.classList.contains('kids')||/\/kids(\/|-|$)/.test(location.pathname))return;
 var D='/jonas/faces/jonas/',RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 var PHONE=(window.innerWidth||1000)<=700,SEL='.ja-premium-face,.ja-face-wrap,.jh-portrait,.jh-medallion';
 var hosts=[],lastThink=false,lastTalk=false,openSeen=new WeakSet();
 function rnd(a,b){return a+Math.random()*(b-a)}
 function base(h){return h.querySelector('img:not([class]),img.ja-face')||h.querySelector('img')}
 function layer(h,name,cls){var i=document.createElement('img');i.className='ma-lf '+cls;i.alt='';i.decoding='async';i.setAttribute('aria-hidden','true');i.dataset.src=D+name+'.jpg';h.appendChild(i);return i}
 function need(i){if(i&&!i.src)i.src=i.dataset.src;return i}
 function setup(h){
  if(h.__maLife)return h.__maLife;var b=base(h);if(!b||!b.offsetWidth)return null;
  h.classList.add('ma-life');b.classList.add('ma-lf-base');
  var pos=getComputedStyle(h.querySelector('.jh-blink-layer,.ja-blink,.jh-mouth-layer,.ja-mouth')||b).objectPosition||'50% 20%';
  h.style.setProperty('--ma-lf-pos',pos);
  var own=true;
  var L={h:h,blink:layer(h,'blink','ma-lf-blink'),wink:layer(h,'blink','ma-lf-wink'),smile:layer(h,'smile','ma-lf-smile'),v:{}};
  if(own)['aa','ee','oh'].forEach(function(n){L.v[n]=layer(h,n,'ma-lf-v')});
  // wink mask: viewer's-left eye, mapped through object-fit:cover onto this box
  var py=parseFloat(pos.split(' ')[1])/100||.2,r=(b.naturalHeight||1152)/(b.naturalWidth||768),bw=b.offsetWidth,bh=b.offsetHeight||bw,s=bw/(768),ih=1152*s,ey=(.35*ih-(ih-bh)*py)/bh;
  h.style.setProperty('--ma-wink-y',(ey*100).toFixed(1)+'%');
  setTimeout(function(){need(L.blink);need(L.wink);need(L.smile)},PHONE?2500:900);
  try{new MutationObserver(function(){h.__natT=Date.now()}).observe(h,{subtree:true,attributes:true,attributeFilter:['src','style']})}catch(e){}
  h.__maLife=L;hosts.push(L);sync(h);setTimeout(function(){sync(h)},60);if(!RM)scheduleBlink(L);return L;
 }
 function sync(h){try{h.querySelectorAll(':scope > img').forEach(function(i){(i.getAnimations?i.getAnimations():[]).forEach(function(x){if(x.animationName==='ma-lf-breathe')x.startTime=0})})}catch(e){}}
 function talking(h){
  var home=h.closest('#ma-jonas-home'),amb=h.closest('#ma-ambient-panel,#ma-ambient-jonas,#ma-ambient-jonas-launcher');
  if(home&&home.classList.contains('jh-speaking'))return true;
  if(amb&&(amb.getAttribute('data-speaking')==='1'))return true;
  var p=document.getElementById('ma-ambient-panel');if(p&&p.getAttribute('data-speaking')==='1'&&h.closest('#ma-ambient-panel'))return true;
  return false;
 }
 function thinking(){
  var docs=[document];document.querySelectorAll('iframe').forEach(function(f){try{if(f.offsetWidth&&f.contentDocument)docs.push(f.contentDocument)}catch(e){}});
  for(var i=0;i<docs.length;i++){var f=docs[i].getElementById('ai-workflow-fill');if(f&&f.offsetParent!==null){var w=parseFloat(f.style.width);if(w>=4&&w<100)return true}}
  return false;
 }
 function blinkOnce(L,cls,ms){var el=need(cls==='w'?L.wink:L.blink);el.classList.add('on');setTimeout(function(){el.classList.remove('on')},ms)}
 function scheduleBlink(L){
  setTimeout(function(){
   if(!L.h.isConnected){return}
   if(!document.hidden&&!L.h.classList.contains('ma-smiling')){blinkOnce(L,'b',rnd(110,160));if(Math.random()<.18)setTimeout(function(){blinkOnce(L,'b',120)},300)}
   scheduleBlink(L);
  },rnd(2000,6000));
 }
 function smile(L,ms){if(!L)return;need(L.smile);L.h.classList.add('ma-smiling');clearTimeout(L.st);L.st=setTimeout(function(){L.h.classList.remove('ma-smiling')},ms||1700)}
 function visemes(L,on){
  var names=Object.keys(L.v);if(!names.length)return;
  if(!on){clearTimeout(L.vt);names.forEach(function(n){L.v[n].classList.remove('on')});L.h.classList.remove('ma-talking');return}
  if(L.h.classList.contains('ma-talking'))return;L.h.classList.add('ma-talking');
  names.forEach(function(n){need(L.v[n])});
  var seq=['aa','ee','oh',null,'aa',null,'ee','oh'],k=0;
  (function step(){
   if(!talking(L.h)&&!window.__maFaceForceTalk){visemes(L,false);return}
   names.forEach(function(n){L.v[n].classList.remove('on')});
   var nat=[].some.call(L.h.querySelectorAll('.ja-mouth,.jh-mouth-layer'),function(m){return m.style.opacity==='1'&&Date.now()-(L.h.__natT||0)<450});var n=nat||Math.random()<.2?null:seq[(k++)%seq.length];if(n)L.v[n].classList.add('on');
   L.vt=setTimeout(step,PHONE?rnd(140,200):rnd(95,165));
  })();
 }
 function tick(){
  document.querySelectorAll(SEL).forEach(function(h){if(h.offsetWidth)setup(h)});
  hosts=hosts.filter(function(L){return L.h.isConnected});
  var th=thinking()||!!window.__maFaceForceThink,anyTalk=false;
  hosts.forEach(function(L){
   var t=talking(L.h)||!!window.__maFaceForceTalk;anyTalk=anyTalk||t;
   L.h.classList.toggle('ma-thinking',th&&!t);
   if(t){L.h.classList.remove('ma-smiling');visemes(L,true)}else if(L.h.classList.contains('ma-talking'))visemes(L,false);
   // greeting smile the first time a panel head becomes visible
   if(!openSeen.has(L.h)&&L.h.closest('#ma-ambient-panel,.jh-header')){openSeen.add(L.h);setTimeout(function(){if(!talking(L.h))smile(L,1900)},450)}
  });
  if(lastThink&&!th)setTimeout(function(){hosts.forEach(function(L){if(!talking(L.h))smile(L,1800)})},250);
  if(lastTalk&&!anyTalk)hosts.forEach(function(L){setTimeout(function(){if(!talking(L.h))smile(L,1400)},350)});
  lastThink=th;lastTalk=anyTalk;
  setTimeout(tick,document.hidden?1500:(anyTalk||th?150:400));
 }
 // rare wink: only when idle, never while talking or thinking
 function wink(){
  setTimeout(function(){
   if(!RM&&!document.hidden)hosts.forEach(function(L){var h=L.h;if(h.offsetWidth&&!talking(h)&&!h.classList.contains('ma-thinking')&&!h.classList.contains('ma-talking')&&Math.random()<.6){smile(L,900);setTimeout(function(){blinkOnce(L,'w',260)},180)}});
   wink();
  },rnd(25000,50000));
 }
 window.MatchAppJonasFace={smile:function(){hosts.forEach(function(L){smile(L,1800)})},wink:function(){hosts.forEach(function(L){smile(L,900);setTimeout(function(){blinkOnce(L,'w',600)},150)})},blink:function(){hosts.forEach(function(L){blinkOnce(L,'b',600)})}};
 function go(){tick();wink()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',go,{once:true});else go();
})();
