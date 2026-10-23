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
  var s=document.createElement('script');s.src='/poster-wall.js?v=20261023-ui1&posters=20261020-1';s.defer=true;
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
