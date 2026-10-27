/* Resizable Jonas chat panel (UI only). Phone: bottom sheet with vertical snap. Tablet/desktop: corner drag.
   Never covers the bottom dock, visible ad slots or safe areas; remembers size; keyboard accessible. */
(function(){
 'use strict';
 if(window.__maChatResize)return;window.__maChatResize=true;
 if(/^\/kids(\/|$)/.test(location.pathname))return;
 var KEY='ma-chat-size-v1',SEL='#ma-jonas-home-panel,#ma-ambient-panel',GAP=8,PHONE=768,MINW=320,MAXW=720;
 var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)'),safeProbe=null;
 function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(_){return{}}}
 function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(_){}}
 function kids(){var h=document.documentElement;return h.hasAttribute('data-kids-mode')||(document.body&&document.body.classList.contains('kids-mode'))}
 function safe(){
  // Reuse the probe: appending/removing it on every measurement retriggers
  // the body observer below and keeps an open chat in a resize loop.
  if(!safeProbe||!safeProbe.isConnected){safeProbe=document.createElement('div');safeProbe.setAttribute('aria-hidden','true');safeProbe.style.cssText='position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;width:0;height:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';document.body.appendChild(safeProbe)}
  // Read current env() values each time; rotation/keyboard changes still
  // need fresh safe-area bounds even though the element is stable.
  var c=getComputedStyle(safeProbe);return{t:parseFloat(c.paddingTop)||0,r:parseFloat(c.paddingRight)||0,b:parseFloat(c.paddingBottom)||0,l:parseFloat(c.paddingLeft)||0}}
 function vis(e){if(!e)return null;var r=e.getBoundingClientRect();return r.width>1&&r.height>1&&getComputedStyle(e).visibility!=='hidden'?r:null}
 function viewport(){var v=window.visualViewport;return{x:v?v.offsetLeft||0:0,y:v?v.offsetTop||0:0,w:v?v.width:document.documentElement.clientWidth||innerWidth,h:v?Math.min(v.height,innerHeight):innerHeight}}
 function area(panel){
  var vp=viewport(),s=safe(),top=vp.y+GAP+s.t,left=vp.x+GAP+s.l,right=vp.x+vp.w-GAP-s.r,bottom=vp.y+vp.h-GAP-s.b;
  // The same Jonas launcher remains the open/close control even at maximum
  // panel size. Preserve its existing reserved header space.
  var header=vis(document.getElementById('ma-reference-header'));
  if(header&&header.bottom>top&&header.top<vp.y+vp.h)top=Math.min(bottom,Math.max(top,header.bottom+GAP));
  var dock=vis(document.querySelector('.ma-reference-dock,.ma-cinema-dock'));
  if(dock&&dock.top<vp.y+vp.h&&dock.top>vp.y+vp.h*0.5)bottom=Math.min(bottom,dock.top-GAP);
  var ads=document.querySelectorAll('ins.adsbygoogle,[data-ad-slot],.sidebar-ad-left,.sidebar-ad-right,[id^="ad-slot"],[class*="ad-slot"]');
  for(var i=0;i<ads.length;i++){var a=vis(ads[i]);if(!a||panel.contains(ads[i])||a.bottom<=vp.y||a.top>=vp.y+vp.h||a.right<=vp.x||a.left>=vp.x+vp.w)continue;
   if(vp.w>=PHONE&&a.height>=a.width){ if(a.left>vp.x+vp.w/2)right=Math.min(right,a.left-GAP); else left=Math.max(left,a.right+GAP); }
   else if(a.top<bottom&&a.bottom>top){ if(a.top>(top+bottom)/2)bottom=Math.min(bottom,a.top-GAP); else top=Math.max(top,a.bottom+GAP); }}
  return{top:top,left:left,right:right,bottom:bottom,w:Math.max(0,right-left),h:Math.max(0,bottom-top),phone:vp.w<PHONE}}
 function minH(panel){
  var head=panel.querySelector('.jh-header,.ja-panel-head'),form=panel.querySelector('form'),lh=parseFloat(getComputedStyle(panel).lineHeight)||22;
  var h=(head?head.offsetHeight:64)+(form?form.offsetHeight:(panel.querySelector('iframe')?150:60))+3*Math.max(20,lh)+28;return Math.max(260,Math.round(h))}
 function bounds(panel,A){var mh=Math.min(minH(panel),A.h),mw=Math.min(MINW,A.w);return{minH:mh,maxH:A.h,minW:mw,maxW:Math.max(mw,Math.min(MAXW,A.w))}}
 function snaps(B){var mid=Math.round(B.minH+(B.maxH-B.minH)*0.5);var s=[B.minH,mid,B.maxH];return s.filter(function(v,i){return i===0||v-s[i-1]>40})}
 function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
 function nearest(list,v){var best=list[0];list.forEach(function(x){if(Math.abs(x-v)<Math.abs(best-v))best=x});return best}
 function set(el,p,v){el.style.setProperty(p,v,'important')}
 function revealFocusedComposer(panel){
  // Android can resize the outer panel after the iframe has already scrolled
  // its focused input into view. Recheck the frame after applying its new size.
  // Scroll only the conversation, never the underlying page or unfocused history.
  var f=panel.querySelector('iframe');if(!f)return;
  try{var d=f.contentDocument,w=f.contentWindow,e=d&&d.activeElement;
   if(!w||!e||!e.matches('textarea,input:not([type=hidden]),[contenteditable="true"]'))return;
   var r=e.getBoundingClientRect(),h=w.innerHeight;
   if(h>0&&(r.top<0||r.bottom>h))w.scrollTo(w.scrollX,Math.max(0,w.scrollY+r.top-Math.max(0,(h-r.height)/2)));
  }catch(_){} // Cross-origin frames keep their own scrolling owner.
 }
 function apply(panel,st,anim){
  var A=area(panel),B=bounds(panel,A),S=load(),mode=A.phone?'phone':'wide',cur=st||S[mode]||{};
  var h=clamp(cur.h||(A.phone?snaps(B)[Math.min(1,snaps(B).length-1)]:Math.min(560,B.maxH)),B.minH,B.maxH);
  var w=A.phone?A.w:clamp(cur.w||420,B.minW,B.maxW);
  set(panel,'position','fixed');set(panel,'inset','auto');set(panel,'margin','0');set(panel,'transform','none');
  set(panel,'top',(A.bottom-h)+'px');set(panel,'left',(A.phone?A.left:A.right-w)+'px');
  set(panel,'width',w+'px');set(panel,'height',h+'px');set(panel,'max-width',A.w+'px');set(panel,'max-height',A.h+'px');set(panel,'min-height','0');set(panel,'min-width','0');
  set(panel,'border-radius','22px');set(panel,'overflow','hidden');if(panel.hidden)panel.style.removeProperty('display');else set(panel,'display','flex');set(panel,'flex-direction','column');
  set(panel,'transition',anim&&!(reduce&&reduce.matches)?'height .22s cubic-bezier(.2,.9,.3,1),top .22s cubic-bezier(.2,.9,.3,1)':'none');
  panel.setAttribute('data-ma-resize',mode);panel.__maSize={w:w,h:h,B:B,A:A};
  var hd=panel.__maHandle;if(hd){hd.setAttribute('aria-orientation',A.phone?'horizontal':'vertical');hd.setAttribute('aria-valuemin',B.minH);hd.setAttribute('aria-valuemax',B.maxH);hd.setAttribute('aria-valuenow',Math.round(h));hd.setAttribute('aria-valuetext',Math.round(h)+' by '+Math.round(w)+' pixels')}
  revealFocusedComposer(panel);
  return{w:w,h:h,mode:mode}}
 function persist(panel){var z=panel.__maSize;if(!z)return;var S=load();S[panel.getAttribute('data-ma-resize')]={w:Math.round(z.w),h:Math.round(z.h)};save(S)}
 function css(){if(document.getElementById('ma-chat-resize-css'))return;var s=document.createElement('style');s.id='ma-chat-resize-css';
  s.textContent='[data-ma-resize]>.jh-content,[data-ma-resize]>:not(.jh-header):not(.ja-panel-head):not(.jh-footer):not(.ma-chat-grip):not(.ja-hello){min-height:0!important;flex:1 1 auto!important;overflow:auto!important;overscroll-behavior:contain}'+
  '[data-ma-resize]>.jh-header,[data-ma-resize]>.ja-panel-head,[data-ma-resize]>.jh-footer,[data-ma-resize]>.ja-hello{flex:none!important}'+
  '.ma-chat-grip{position:absolute;z-index:5;touch-action:none;-webkit-user-select:none;user-select:none;background:none;border:0;padding:0;margin:0;display:flex;align-items:center;justify-content:center;outline:none;-webkit-tap-highlight-color:transparent}'+
  '[data-ma-resize=phone]>.ma-chat-grip{top:0;left:50%;width:72px;height:22px;transform:translateX(-50%);cursor:ns-resize}'+
  '[data-ma-resize=phone]>.ma-chat-grip::before{content:"";width:44px;height:5px;border-radius:5px;background:linear-gradient(90deg,#b8893a,#f6d58b 50%,#b8893a);box-shadow:0 0 0 1px #00000055,0 1px 6px #f0c76a66}'+
  '[data-ma-resize=wide]>.ma-chat-grip{top:0;left:0;width:30px;height:30px;cursor:nwse-resize;border-radius:22px 0 12px 0}'+
  '[data-ma-resize=wide]>.ma-chat-grip::before{content:"";width:14px;height:14px;margin:-4px 0 0 -4px;background:linear-gradient(135deg,transparent 0 30%,#f3d07f 30% 38%,transparent 38% 54%,#f3d07f 54% 62%,transparent 62% 78%,#f3d07f 78% 86%,transparent 86%);transform:scaleX(-1) rotate(90deg);opacity:.95;filter:drop-shadow(0 0 3px #f0c76a88)}'+
  '.ma-chat-grip:hover::before,.ma-chat-grip[data-dragging]::before{filter:brightness(1.15) drop-shadow(0 0 5px #f6d58baa)}'+
  '.ma-chat-grip:focus-visible{box-shadow:0 0 0 2px #f6d58b;border-radius:8px}'+
  '[data-ma-resize=phone]>.jh-header,[data-ma-resize=phone]>.ja-panel-head{padding-top:14px!important}'+
  'html.ma-chat-resizing,html.ma-chat-resizing *{cursor:inherit;-webkit-user-select:none!important;user-select:none!important}';
  document.head.appendChild(s)}
 function label(){var l=(document.documentElement.lang||'en').slice(0,2);return({pt:'Redimensionar conversa',es:'Cambiar tamaño del chat',fr:'Redimensionner la conversation',de:'Chatgröße ändern',it:'Ridimensiona chat'})[l]||'Resize chat'}
 function attach(panel){
  if(panel.__maHandle||kids())return;css();
  var g=document.createElement('div');g.className='ma-chat-grip';g.setAttribute('role','separator');g.tabIndex=0;g.setAttribute('aria-label',label());panel.__maHandle=g;panel.insertBefore(g,panel.firstChild);
  var drag=null;
  g.addEventListener('pointerdown',function(e){if(e.button>0)return;e.preventDefault();var z=panel.__maSize||apply(panel);drag={x:e.clientX,y:e.clientY,w:z.w,h:z.h,id:e.pointerId};try{g.setPointerCapture(e.pointerId)}catch(_){}g.setAttribute('data-dragging','');document.documentElement.classList.add('ma-chat-resizing')});
  g.addEventListener('pointermove',function(e){if(!drag||e.pointerId!==drag.id)return;e.preventDefault();apply(panel,{w:drag.w+(drag.x-e.clientX),h:drag.h+(drag.y-e.clientY)},false)});
  function end(e){if(!drag||(e&&e.pointerId!==drag.id))return;drag=null;g.removeAttribute('data-dragging');document.documentElement.classList.remove('ma-chat-resizing');var z=panel.__maSize;
   if(z&&z.A.phone)apply(panel,{h:nearest(snaps(z.B),z.h)},true);persist(panel)}
  g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end);g.addEventListener('lostpointercapture',end);
  g.addEventListener('keydown',function(e){var z=panel.__maSize||apply(panel),st={w:z.w,h:z.h},k=e.key,step=e.shiftKey?64:24;
   if(z.A.phone){var s=snaps(z.B),i=s.indexOf(nearest(s,z.h));if(k==='ArrowUp'||k==='ArrowRight')st.h=s[Math.min(s.length-1,i+1)];else if(k==='ArrowDown'||k==='ArrowLeft')st.h=s[Math.max(0,i-1)];else if(k==='Home')st.h=z.B.minH;else if(k==='End')st.h=z.B.maxH;else return}
   else{if(k==='ArrowUp')st.h+=step;else if(k==='ArrowDown')st.h-=step;else if(k==='ArrowLeft')st.w+=step;else if(k==='ArrowRight')st.w-=step;else if(k==='Home'){st.h=z.B.minH;st.w=z.B.minW}else if(k==='End'){st.h=z.B.maxH;st.w=z.B.maxW}else return}
   e.preventDefault();apply(panel,st,true);persist(panel)});
 }

 function frameFix(panel){var f=panel.querySelector('iframe');if(!f||f.__maFix)return;f.__maFix=true;
  function go(){try{var d=f.contentDocument;if(!d||!d.head||d.getElementById('ma-chat-resize-frame'))return;var st=d.createElement('style');st.id='ma-chat-resize-frame';
   st.textContent='html.matchapp-ambient-frame .ma-cinema-dock,html.matchapp-ambient-frame .ma-reference-dock{display:none!important}html.matchapp-ambient-frame body{padding-bottom:12px!important}'+
    '@media(max-height:240px){'+
    'html.matchapp-ambient-frame,html.matchapp-ambient-frame body.ai-chat-page{height:auto!important;overflow-y:auto!important}'+
    'html.matchapp-ambient-frame body.ai-chat-page main.wrap{height:auto!important;overflow:visible!important}'+
    'html.matchapp-ambient-frame body.ai-chat-page main.wrap .premium-card.discover-head{height:auto!important;max-height:none!important;flex:none!important;overflow:visible!important}'+
    'html.matchapp-ambient-frame body.ai-chat-page .discover-head>.newsearch-row{max-height:none!important;overflow:visible!important}'+
    '}';d.head.appendChild(st);d.addEventListener('focusin',later);d.addEventListener('input',later)}catch(_){}}
  f.addEventListener('load',go);go()}
 function sync(){if(document.documentElement.classList.contains('ma-chat-resizing'))return;var ps=document.querySelectorAll(SEL);for(var i=0;i<ps.length;i++){var p=ps[i];if(kids())continue;if(p.hidden){p.style.removeProperty('display');continue}attach(p);frameFix(p);apply(p)}}
 window.MatchAppChatResize=Object.freeze({sync:sync});
 var t;var t2;function later(){clearTimeout(t);clearTimeout(t2);t=setTimeout(sync,60);t2=setTimeout(sync,450)}
 function boot(){sync();new MutationObserver(function(m){for(var i=0;i<m.length;i++){var n=m[i].target;if(m[i].type==='attributes'?n.matches&&n.matches(SEL):true){later();return}}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  addEventListener('resize',later);addEventListener('orientationchange',later);if(window.visualViewport){visualViewport.addEventListener('resize',later);visualViewport.addEventListener('scroll',later)}}
 if(document.body)boot();else document.addEventListener('DOMContentLoaded',boot);
})();
