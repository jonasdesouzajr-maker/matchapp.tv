/* Draft Top Titles owner. Native touch/trackpad scrolling stays authoritative.
   This is presentation only: original cards, artwork and title handlers remain. */
(function(){
 'use strict';
 if(window.MatchTopTitlesDraft)return;
 var controllers=new WeakMap(),labels={en:['Previous titles','Next titles'],pt:['Títulos anteriores','Próximos títulos'],es:['Títulos anteriores','Títulos siguientes'],fr:['Titres précédents','Titres suivants'],de:['Vorherige Titel','Nächste Titel'],it:['Titoli precedenti','Titoli successivi'],tr:['Önceki yapımlar','Sonraki yapımlar'],ru:['Предыдущие произведения','Следующие произведения'],ar:['الأعمال السابقة','الأعمال التالية'],hi:['पिछले शीर्षक','अगले शीर्षक'],id:['Judul sebelumnya','Judul berikutnya'],ja:['前の作品','次の作品'],ko:['이전 작품','다음 작품'],zh:['上一组作品','下一组作品']};
 function mount(vp){
  if(!vp)return null;
  if(controllers.has(vp)){controllers.get(vp).refreshChrome();return controllers.get(vp);}
  // A late optional draft load must not start a second owner over a live legacy rail.
  if(vp.dataset.railReady==='1'&&vp.dataset.topTitlesOwner!=='draft-native-right')return null;
  var track=vp.querySelector('#marquee-track'),root=vp.closest('#trending-rail');if(!track||!root)return null;
  var frame=0,idle=0,last=0,glidePosition=0,seam=0,holdUntil=0,autoWriteUntil=0,suppressUntil=0,visible=true,hover=false,touch=false,pointer=null,disposed=false;
  var reducedQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)'),hoverQuery=window.matchMedia?.('(hover:hover) and (pointer:fine)');
  var HOLD=2200,SPEED=25;
  var desktopQuery=window.matchMedia?.('(min-width:1100px)');
  function nativeApp(){return window.MATCHAPP_ANDROID===true||/MatchApp(?:Ai|TV)Android\//i.test(navigator.userAgent||'')||typeof window.MatchAppNativeExperience?.setNewsAccountContext==='function'||typeof window.MatchAppNativeAuth?.openOAuth==='function';}
  function desktopControls(){var tablet=/Android|iPad|iPhone|iPod/i.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);return!nativeApp()&&!tablet&&!!hoverQuery?.matches&&(desktopQuery?desktopQuery.matches:innerWidth>=1100);}
  root.querySelectorAll('.marquee-arrow--left,.marquee-arrow--right,.marquee-prev,.marquee-next').forEach(function(button){button.remove();});
  var nav=root.querySelector('.ma-top-titles-controls');
  if(!nav){nav=document.createElement('div');nav.className='ma-top-titles-controls';nav.innerHTML='<button type="button" class="ma-top-titles-arrow" data-top-title-step="-1" aria-controls="marquee-viewport"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6M8 12h12"/></svg></button><button type="button" class="ma-top-titles-arrow" data-top-title-step="1" aria-controls="marquee-viewport"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6M4 12h12"/></svg></button>';root.appendChild(nav);}
  function refreshChrome(){var hide=!desktopControls();root.classList.add('ma-top-titles-grid');root.classList.toggle('ma-top-titles-native-app',nativeApp());root.classList.toggle('ma-top-titles-no-arrows',hide);nav.hidden=hide;if(nav.parentElement!==root)root.appendChild(nav);}
  vp.dataset.railReady='1';vp.dataset.topTitlesOwner='draft-native-right';vp.dataset.matchappAutoplayActive='1';vp.tabIndex=0;
  vp.classList.add('ma-top-titles-native');track.classList.add('is-marquee-flowing');
  function now(){return performance.now();}
  function reduced(){return document.documentElement.classList.contains('reduce-motion')||reducedQuery?.matches;}
  function paint(){var lang=String(window.MATCH_LANG||document.documentElement.lang||'en').toLowerCase().split('-')[0],copy=labels[lang]||labels.en;nav.querySelectorAll('button').forEach(function(button,i){button.setAttribute('aria-label',copy[i]);button.title=copy[i];});vp.style.setProperty('--top-title-direction',document.documentElement.dir==='rtl'?'rtl':'ltr');}
  function stop(){cancelAnimationFrame(frame);frame=0;clearTimeout(idle);idle=0;last=0;vp.classList.remove('is-autoglide');}
  function focusHeld(){return vp.contains(document.activeElement)&&document.activeElement.matches(':focus-visible');}
  function paused(){return disposed||document.hidden||!visible||hover||touch||pointer||focusHeld()||reduced()||now()<holdUntil;}
  function normalize(){
   if(!seam||touch||pointer)return;
   var max=vp.scrollWidth-vp.clientWidth;
   if(vp.scrollLeft<1){autoWriteUntil=now()+70;vp.scrollLeft+=seam;}
   else if(vp.scrollLeft>max-1&&vp.scrollLeft>=seam){autoWriteUntil=now()+70;vp.scrollLeft-=seam;}
  }
  function schedule(){
   stop();if(disposed||document.hidden||!visible||hover||touch||pointer||focusHeld()||reduced()||vp.scrollWidth<=vp.clientWidth)return;
   if(now()<holdUntil){idle=setTimeout(schedule,Math.max(20,holdUntil-now()+20));return;}
   normalize();glidePosition=vp.scrollLeft;vp.classList.add('is-autoglide');frame=requestAnimationFrame(flow);
  }
  function flow(time){
   frame=0;if(paused()){schedule();return;}
   var delta=last?Math.min(40,time-last):16;last=time;
   autoWriteUntil=time+90;
   // A decreasing native scrollLeft moves the actual poster images RIGHT.
   // The physical scroller remains LTR even when its title text is RTL.
   if(glidePosition<=1&&seam)glidePosition+=seam;
   glidePosition-=SPEED*delta/1000;vp.scrollLeft=glidePosition;
   frame=requestAnimationFrame(flow);
  }
  function hold(){holdUntil=now()+HOLD;stop();schedule();}
  function measure(){
   refreshChrome();
   // The weekly renderer may replace source cards after the shell paints.
   // Recreate only a missing caption, retaining the full original identity for
   // assistive technology when the compact visual title wraps to two lines.
   track.querySelectorAll('.marquee-item:not([data-music-video])').forEach(function(card){
    var image=card.querySelector('img'),title=image?.dataset.title||image?.alt||'';if(!title)return;
    var caption=card.querySelector('.marquee-title');if(!caption){caption=document.createElement('span');caption.className='marquee-title';card.appendChild(caption);}if(!caption.textContent.trim())caption.textContent=title;
    if(!card.getAttribute('aria-label'))card.setAttribute('aria-label',title);
   });
   var duplicate=track.querySelector('[data-loop-copy="1"]');seam=duplicate?duplicate.offsetLeft-(track.firstElementChild?.offsetLeft||0):0;
   track.querySelectorAll('[data-loop-copy="1"],[aria-hidden="true"]').forEach(function(card){card.setAttribute('aria-hidden','true');card.tabIndex=-1;card.querySelectorAll('a,button,[tabindex]').forEach(function(node){node.tabIndex=-1;});});
   if(seam&&vp.scrollLeft<1){autoWriteUntil=now()+90;vp.scrollLeft=seam;}
   schedule();
  }
  function step(){var first=track.querySelector('.marquee-item'),gap=parseFloat(getComputedStyle(track).gap)||8;return(first?.getBoundingClientRect().width||140)+gap;}
  function nudge(direction){hold();var amount=step()*Math.max(1,Math.floor(vp.clientWidth/step())-1);if(seam&&vp.scrollLeft+direction*amount<0)vp.scrollLeft+=seam;else if(seam&&vp.scrollLeft+direction*amount>vp.scrollWidth-vp.clientWidth)vp.scrollLeft-=seam;vp.scrollBy({left:direction*amount,behavior:reduced()?'auto':'smooth'});}
  nav.querySelectorAll('button').forEach(function(button){button.addEventListener('click',function(){nudge(Number(button.dataset.topTitleStep));});});
  function pointerDown(event){
   if(event.button!==0&&event.pointerType==='mouse')return;
   pointer={id:event.pointerId,type:event.pointerType,x:event.clientX,y:event.clientY,scroll:vp.scrollLeft,moved:false};hold();
  }
  function pointerMove(event){
   if(!pointer||event.pointerId!==pointer.id)return;
   if(Math.abs(event.clientX-pointer.x)>6||Math.abs(event.clientY-pointer.y)>6||Math.abs(vp.scrollLeft-pointer.scroll)>2)pointer.moved=true;
   if(pointer.type==='mouse'&&pointer.moved){event.preventDefault();vp.scrollLeft=pointer.scroll-(event.clientX-pointer.x);vp.classList.add('is-dragging');if(!vp.hasPointerCapture(event.pointerId))try{vp.setPointerCapture(event.pointerId);}catch(_){}}
  }
  function pointerEnd(event){
   if(!pointer||event.pointerId!==pointer.id)return;
   if(pointer.moved||Math.abs(vp.scrollLeft-pointer.scroll)>2)suppressUntil=now()+550;
   if(pointer.type==='mouse')try{if(vp.hasPointerCapture(event.pointerId))vp.releasePointerCapture(event.pointerId);}catch(_){}
   pointer=null;vp.classList.remove('is-dragging');hold();
  }
  vp.addEventListener('pointerdown',pointerDown,{passive:true});vp.addEventListener('pointermove',pointerMove,{passive:false});
  window.addEventListener('pointerup',pointerEnd,{passive:true});vp.addEventListener('pointercancel',pointerEnd,{passive:true});
  vp.addEventListener('touchstart',function(){touch=true;hold();},{passive:true});
  ['touchend','touchcancel'].forEach(function(type){vp.addEventListener(type,function(){touch=false;hold();},{passive:true});});
  vp.addEventListener('wheel',hold,{passive:true});
  // Native scroll events from our own RAF may be delivered after a delayed
  // frame. They must never restart the idle clock; user gestures stop the RAF
  // synchronously before their native scroll/inertia events arrive.
  vp.addEventListener('scroll',function(){if(!vp.classList.contains('is-autoglide')&&now()>autoWriteUntil)hold();},{passive:true});
  // The existing title handoff listens in document capture. Guard a completed
  // drag one step earlier, so it cannot accidentally navigate before the rail
  // receives the click. Deliberate clicks keep that original handoff intact.
  window.addEventListener('click',function(event){if(!disposed&&now()<suppressUntil&&vp.contains(event.target)&&event.target.closest?.('.marquee-item')){event.preventDefault();event.stopImmediatePropagation();}},true);
  vp.addEventListener('dragstart',function(event){if(event.target.closest?.('.marquee-item'))event.preventDefault();});
  vp.addEventListener('keydown',function(event){
   if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();nudge(event.key==='ArrowLeft'?-1:1);}
   else if((event.key==='Enter'||event.key===' ')&&event.target.matches?.('.marquee-item[role="button"]')){event.preventDefault();event.stopPropagation();event.target.click();}
  });
  root.addEventListener('mouseenter',function(){if(hoverQuery?.matches){hover=true;stop();}},{passive:true});
  root.addEventListener('mouseleave',function(){hover=false;schedule();},{passive:true});
  nav.addEventListener('mouseenter',function(){if(hoverQuery?.matches){hover=true;stop();}},{passive:true});nav.addEventListener('mouseleave',function(){hover=false;schedule();},{passive:true});
  vp.addEventListener('focusin',stop,{passive:true});vp.addEventListener('focusout',function(){setTimeout(schedule,0);},{passive:true});
  document.addEventListener('visibilitychange',function(){if(document.hidden)stop();else{holdUntil=now()+300;schedule();}});
  reducedQuery?.addEventListener?.('change',schedule);
  desktopQuery?.addEventListener?.('change',measure);
  hoverQuery?.addEventListener?.('change',function(){if(!hoverQuery.matches)hover=false;measure();});
  document.addEventListener('matchapp:langchange',paint);window.addEventListener('matchapp:languagechange',paint);
  document.addEventListener('change',function(){if(reduced())stop();else schedule();});
  document.addEventListener('matchapp:settingschanged',function(event){if(!event.detail?.key||['reduceMotion','*'].includes(event.detail.key))schedule();});
  if('IntersectionObserver'in window){var observer=new IntersectionObserver(function(entries){visible=!!entries[0]?.isIntersecting;if(visible)schedule();else stop();},{threshold:.12});observer.observe(vp);}
  var mutation=new MutationObserver(function(){requestAnimationFrame(measure);});mutation.observe(track,{childList:true});
  if('ResizeObserver'in window){var resize=new ResizeObserver(measure);resize.observe(vp);}else window.addEventListener('resize',measure,{passive:true});
  var api={nudge:nudge,hold:hold,refreshChrome:refreshChrome,snapshot:function(){return{owner:vp.dataset.topTitlesOwner,scrollLeft:vp.scrollLeft,seam:seam,autoFrame:!!frame,idleTimer:!!idle,paused:!!paused(),reduced:!!reduced(),visible:visible,hover:hover,touch:touch,focusHeld:!!focusHeld(),holdMs:Math.max(0,Math.round(holdUntil-now())),physicalDirection:'right',nativeApp:!!nativeApp(),arrows:nav.hidden?0:nav.querySelectorAll('button').length};},destroy:function(){disposed=true;stop();mutation.disconnect();observer?.disconnect();resize?.disconnect();}};
  controllers.set(vp,api);vp.__railHold=hold;
  window.addEventListener('pagehide',stop);window.addEventListener('pageshow',schedule);
  refreshChrome();paint();measure();return api;
 }
 window.MatchTopTitlesDraft={mount:mount};
 function boot(){if(document.documentElement.classList.contains('ma-reference')||document.documentElement.dataset.topTitlesDraft==='1')mount(document.getElementById('marquee-viewport'));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else{boot();document.addEventListener('DOMContentLoaded',boot,{once:true});}
})();
