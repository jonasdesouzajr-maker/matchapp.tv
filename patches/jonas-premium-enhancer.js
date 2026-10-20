/* Presentation only: existing voice handlers remain the sole speech engine. */
(function(){
 'use strict';
 if(window.top!==window||/^\/(kids|private-voice|oauth)(\/|$)/.test(location.pathname)||/\/(callback|confirm)\.html$/.test(location.pathname)||window.__maJonasPremium)return;
 window.__maJonasPremium=true;
 var docked=true,placed=false,dragStart=null,activeRoot=null,frame=0,settleTimer=0,observers=[];
 var positionKey='matchapp-jonas-position-v2',safeProbe=null;
 function viewport(){
  var v=window.visualViewport;
  return {left:v?v.offsetLeft:0,top:v?v.offsetTop:0,width:v?v.width:innerWidth,height:v?v.height:innerHeight};
 }
 function safeBounds(width,height){
  if(!safeProbe){
   safeProbe=document.createElement('span');safeProbe.setAttribute('aria-hidden','true');
   safeProbe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;inset:0;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
   (document.body||document.documentElement).appendChild(safeProbe);
  }
  var v=viewport(),s=getComputedStyle(safeProbe),gap=12;
  var left=v.left+Math.max(gap,parseFloat(s.paddingLeft)||0),top=v.top+Math.max(gap,parseFloat(s.paddingTop)||0);
  return {minX:left,minY:top,maxX:Math.max(left,v.left+v.width-width-Math.max(gap,parseFloat(s.paddingRight)||0)),maxY:Math.max(top,v.top+v.height-height-Math.max(gap,parseFloat(s.paddingBottom)||0))};
 }
 // The two existing drag owners share only visible-screen bounds. Speech,
 // pointer handling and conversation state remain in their original modules.
 window.MatchAppJonasPlacement=Object.freeze({bounds:safeBounds});
 function fitViewport(){
  var v=viewport(),style=document.documentElement.style;
  style.setProperty('--ja-view-height',v.height+'px');style.setProperty('--ja-view-width',v.width+'px');
  style.setProperty('--ja-view-top',v.top+'px');style.setProperty('--ja-view-left',v.left+'px');
 }
 function applyPosition(root,x,y){
  root.style.setProperty('position','fixed','important');
  root.style.setProperty('left',Math.round(x)+'px','important');root.style.setProperty('top',Math.round(y)+'px','important');
  root.style.setProperty('right','auto','important');root.style.setProperty('bottom','auto','important');
 }
 // A default launcher may occupy empty space only. Text is measured line by
 // line, clipped to the same overflow boxes that paint it (including SR-only
 // labels). Whole moving rails stay protected between animation frames.
 function obstacles(root){
  var v=viewport(),rects=[],styles=new Map(),clips=new Map();
  function style(node){if(!styles.has(node))styles.set(node,getComputedStyle(node));return styles.get(node)}
  function visible(node){
   if(root.contains(node)||node.closest('#ma-ambient-panel,#ma-jonas-home-panel,[hidden],script,style,noscript,template,svg,option,.ma-jonas-dock-slot'))return false;
   var closed=node.closest('details:not([open])');
   if(closed&&!closed.querySelector(':scope > summary')?.contains(node))return false;
   var s=style(node);return s.visibility!=='hidden'&&s.display!=='none'&&s.opacity!=='0'&&node.checkVisibility?.({checkOpacity:true,checkVisibilityCSS:true,contentVisibilityAuto:true})!==false;
  }
  function clip(node){
   if(clips.has(node))return clips.get(node);
   var box={left:v.left,top:v.top,right:v.left+v.width,bottom:v.top+v.height};
   for(var a=node;a&&a!==document.body;a=a.parentElement){
    var s=style(a),r=a.getBoundingClientRect();
    if(/hidden|clip|auto|scroll/.test(s.overflowX)){box.left=Math.max(box.left,r.left);box.right=Math.min(box.right,r.right)}
    if(/hidden|clip|auto|scroll/.test(s.overflowY)){box.top=Math.max(box.top,r.top);box.bottom=Math.min(box.bottom,r.bottom)}
   }
   clips.set(node,box);return box;
  }
  function add(r,node){
   var c=clip(node),box={left:Math.max(r.left,c.left),top:Math.max(r.top,c.top),right:Math.min(r.right,c.right),bottom:Math.min(r.bottom,c.bottom)};
   if(box.right-box.left>1&&box.bottom-box.top>1)rects.push(box);
  }
  document.querySelectorAll('a,button,input,select,textarea,summary,[role="button"],#trending-rail,.marquee-viewport,.ref-primary-topics,nav.ma-cinema-dock,ins.adsbygoogle,iframe,.ad-banner-container,.sidebar-ad-left,.sidebar-ad-right').forEach(function(node){
   if(visible(node))add(node.getBoundingClientRect(),node);
  });
  var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(var text=walker.nextNode();text;text=walker.nextNode()){
   var parent=text.parentElement;if(!text.textContent.trim()||!parent||parent.closest('select,option')||!visible(parent))continue;
   var c=clip(parent);if(c.right<=c.left||c.bottom<=c.top)continue;
   var range=document.createRange();range.selectNodeContents(text);
   Array.from(range.getClientRects?.()||[]).forEach(function(r){add(r,parent)});
  }
  return rects;
 }
 function clearAt(x,y,size,blocks){
  // Eight pixels include the halo and breathing room around the glass edge.
  return !blocks.some(function(r){return x-8<r.right&&x+size+8>r.left&&y-8<r.bottom&&y+size+8>r.top});
 }
 function defaultPosition(root,size,bounds,blocks){
  var v=viewport(),dock=document.querySelector('nav.ma-cinema-dock'),dockBox=dock&&dock.getBoundingClientRect();
  var x=Math.max(bounds.minX,bounds.maxX-6),bottom=v.top+v.height-110-size;
  if(dockBox&&dockBox.height>0&&dockBox.top>v.top)bottom=Math.min(bottom,dockBox.top-size-18);
  var y=Math.max(bounds.minY,Math.min(bounds.maxY,bottom)),current=root.getBoundingClientRect();
  // Hysteresis: scrolling does not move an already clear default launcher.
  if(root.dataset.jonasPlacement==='floating'&&Math.abs(current.width-size)<1&&current.left>=bounds.minX&&current.left<=bounds.maxX&&current.top>=bounds.minY&&current.top<=bounds.maxY&&clearAt(current.left,current.top,size,blocks))return{x:current.left,y:current.top};
  if(clearAt(x,y,size,blocks))return{x:x,y:y};
  var candidates=[],seen=new Set();
  function candidate(cx,cy){cx=Math.max(bounds.minX,Math.min(bounds.maxX,cx));cy=Math.max(bounds.minY,Math.min(bounds.maxY,cy));var key=Math.round(cx)+':'+Math.round(cy);if(!seen.has(key)){seen.add(key);candidates.push({x:cx,y:cy})}}
  // Include obstacle boundaries so a usable narrow gutter is not missed by
  // the grid. The grid also searches interior gaps, rather than two edges.
  blocks.forEach(function(r){[r.left-size-9,r.right+9].forEach(function(cx){candidate(cx,y);candidate(cx,bounds.minY);candidate(cx,bounds.maxY)});[r.top-size-9,r.bottom+9].forEach(function(cy){candidate(x,cy);candidate(bounds.minX,cy);candidate(bounds.maxX,cy)})});
  for(var cy=bounds.minY;cy<=bounds.maxY;cy+=12)for(var cx=bounds.minX;cx<=bounds.maxX;cx+=12)candidate(cx,cy);
  candidate(bounds.maxX,bounds.maxY);
  candidates.sort(function(a,b){return Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)});
  return candidates.find(function(p){return clearAt(p.x,p.y,size,blocks)})||null;
 }
 // Home's guide has a requested default companion position above it.
 // It remains a preference only when both guide and halo are visibly clear.
 function homeGuideAnchor(root,size,blocks){
  if(!document.body.classList.contains('page-home'))return null;
  var guide=document.querySelector('.ma-cinema-hero-footer .ma-how-button');
  if(!guide||guide.checkVisibility?.({checkVisibilityCSS:true})===false)return null;
  var r=guide.getBoundingClientRect(),v=viewport(),b=safeBounds(size,size);
  if(!r.width||!r.height||r.top<v.top||r.bottom>v.top+v.height||r.left<v.left||r.right>v.left+v.width)return null;
  var x=Math.round(r.left+(r.width-size)/2),y=Math.round(r.top-size-12);
  if(x<b.minX||x>b.maxX||y<b.minY||y>b.maxY||!clearAt(x,y,size,blocks))return null;
  return{x:x,y:y,size:size};
 }
 function clearReserved(){
  document.querySelectorAll('.ma-jonas-dock-slot').forEach(function(slot){var dock=slot.parentElement;slot.remove();dock.removeAttribute('data-jonas-reserved');if(dock.classList.contains('ma-jonas-reserve-only'))dock.remove()});
 }
 function reserveDock(root){
  var dock=document.querySelector('nav.ma-cinema-dock');
  if(!dock){dock=document.createElement('div');dock.className='ma-jonas-reserve-only';dock.setAttribute('aria-hidden','true');document.body.appendChild(dock)}
  var slot=dock.querySelector('.ma-jonas-dock-slot');
  if(!slot){slot=document.createElement('span');slot.className='ma-jonas-dock-slot';slot.setAttribute('aria-hidden','true');dock.appendChild(slot)}
  dock.setAttribute('data-jonas-reserved','');root.style.setProperty('--ma-jonas-launcher-size','56px');
  var box=slot.getBoundingClientRect();applyPosition(root,box.left+(box.width-56)/2,box.top+(box.height-56)/2);
  root.dataset.jonasPlacement='dock';
 }
 function positionHome(){
  var root=activeRoot;if(root&&document.documentElement.hasAttribute('data-ma-jonas-header')){clearReserved();window.MatchAppReferenceHeader?.claim(root);return;}
  if(!root||root.hidden||dragStart||root.classList.contains('is-chat-stage')||root.dataset.jonasPositionHeld==='1')return;
  if(docked){
   var blocks=obstacles(root),guide=null;
   for(var guideSizes=[78,64,56],g=0;g<guideSizes.length;g++){guide=homeGuideAnchor(root,guideSizes[g],blocks);if(guide)break}
   if(guide){clearReserved();root.style.setProperty('--ma-jonas-launcher-size',guide.size+'px');applyPosition(root,guide.x,guide.y);root.dataset.jonasPlacement='floating';root.dataset.jonasGuideAnchor='1';root.dataset.jonasDefaultDock='1';return}
   delete root.dataset.jonasGuideAnchor;
   // A reserved dock stays stable on dense screens. The visible Home guide
   // preference above is the sole exception; intentional drag always wins.
   if(root.dataset.jonasPlacement==='dock'){reserveDock(root);return}
   var next=null,size=78,current=root.getBoundingClientRect(),currentBounds=safeBounds(current.width,current.height);
   if(root.dataset.jonasPlacement==='floating'&&current.left>=currentBounds.minX&&current.left<=currentBounds.maxX&&current.top>=currentBounds.minY&&current.top<=currentBounds.maxY&&clearAt(current.left,current.top,current.width,blocks)){clearReserved();root.dataset.jonasDefaultDock='1';return}
   for(var sizes=[78,64,56],i=0;i<sizes.length;i++){size=sizes[i];next=defaultPosition(root,size,safeBounds(size,size),blocks);if(next)break}
   if(next){clearReserved();root.style.setProperty('--ma-jonas-launcher-size',size+'px');applyPosition(root,next.x,next.y);root.dataset.jonasPlacement='floating'}else reserveDock(root);
   root.dataset.jonasDefaultDock='1';
  }else{
   clearReserved();var width=root.offsetWidth||78,height=root.offsetHeight||width,b=safeBounds(width,height);
   var r=root.getBoundingClientRect(),x=parseFloat(root.style.left),y=parseFloat(root.style.top);
   if(!root.style.left&&!r.width)return;
   if(!Number.isFinite(x))x=r.left;if(!Number.isFinite(y))y=r.top;
   applyPosition(root,Math.max(b.minX,Math.min(b.maxX,x)),Math.max(b.minY,Math.min(b.maxY,y)));
  }
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(function(){frame=0;fitViewport();positionHome()})}
 function scheduleSettled(){
  if(!docked)return;schedule();clearTimeout(settleTimer);
  settleTimer=setTimeout(function(){settleTimer=0;if(docked)schedule()},440);
 }
 function dockHome(root){
  if(document.documentElement.hasAttribute('data-ma-jonas-header')){clearReserved();placed=true;activeRoot=root;window.MatchAppReferenceHeader?.claim(root);return;}
  if(placed&&activeRoot===root)return;
  // A replacement native launcher cannot inherit the hidden Home owner's slot.
  clearReserved();placed=true;activeRoot=root;docked=true;
  try{var saved=JSON.parse(localStorage.getItem(positionKey)||'null');if(Number.isFinite(saved?.x)&&Number.isFinite(saved?.y))docked=false}catch(_){}
  root.classList.remove('ja-header-default');root.classList.toggle('ja-corner-default',docked);
  // Portrait artwork must not start HTML image dragging and cancel the
  // existing pointer controller halfway through a deliberate move.
  root.addEventListener('dragstart',function(e){e.preventDefault()});
  document.addEventListener('dragstart',function(e){if(dragStart)e.preventDefault()},true);
  root.querySelectorAll('img').forEach(function(image){image.draggable=false});
  root.addEventListener('pointerdown',function(e){if(e.button!==0&&e.pointerType==='mouse')return;dragStart={x:e.clientX,y:e.clientY,id:e.pointerId}});
  // Only observe the existing drag controller; no second pointer/chat owner.
  // A deliberate drag restores the shared 78px size before the original owner
  // serializes normalized coordinates, so reloads cannot shift a small default.
  window.addEventListener('pointermove',function(e){if(dragStart&&dragStart.id===e.pointerId&&Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)>=(root.id==='ma-jonas-home'?9:6)){docked=false;root.classList.remove('ja-corner-default');root.dataset.jonasDefaultDock='0';root.dataset.jonasPlacement='dragged';root.style.setProperty('--ma-jonas-launcher-size','78px');clearReserved()}},{passive:true});
  function end(e){if(dragStart&&dragStart.id===e.pointerId)dragStart=null}
  window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  var rootObserver=new MutationObserver(schedule);rootObserver.observe(root,{attributes:true,attributeFilter:['class','hidden']});observers.push(rootObserver);
  var layoutObserver=new MutationObserver(function(changes){if(docked&&changes.some(function(change){return change.target!==root&&!root.contains(change.target)&&!change.target.closest?.('#ma-ambient-panel,#ma-jonas-home-panel')}))schedule()});
  layoutObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','open']});observers.push(layoutObserver);
  window.addEventListener('resize',schedule,{passive:true});window.addEventListener('load',schedule,{once:true});
  document.addEventListener('load',function(e){if(docked&&e.target.tagName==='IMG')schedule()},true);
  window.addEventListener('scroll',function(){if(docked)schedule()},{passive:true});
  // Legacy folds animate their height with WAAPI. Recheck the finished
  // layout once, without observing every animation style frame.
  document.addEventListener('toggle',scheduleSettled,true);
  document.addEventListener('click',function(e){if(e.target.closest?.('summary,.lazy-head,[aria-expanded],[data-fold-key],.crit-toggle'))scheduleSettled()},true);
  function paintedEnd(e){if(docked&&!root.contains(e.target)&&!e.target.closest?.('#ma-ambient-panel,#ma-jonas-home-panel'))schedule()}
  document.addEventListener('transitionend',paintedEnd,true);document.addEventListener('animationend',paintedEnd,true);
  if(window.visualViewport){window.visualViewport.addEventListener('resize',schedule,{passive:true});window.visualViewport.addEventListener('scroll',schedule,{passive:true})}
  positionHome();schedule();
 }
 fitViewport();
 // A single noninteractive decoration; the original pointer and speech owners remain authoritative.
 function installConstellation(host){
  host.classList.add('ma-jonas-stellar');
  if(host.querySelector(':scope > .ma-jonas-cosmos'))return;
  var cosmos=document.createElement('span');cosmos.className='ma-jonas-cosmos';cosmos.setAttribute('aria-hidden','true');
  cosmos.innerHTML='<svg class="ma-jonas-starmap" viewBox="0 0 100 100" focusable="false" aria-hidden="true"><path class="ma-jonas-starthread" d="M18 24 11 46 17 70M32 11 50 6 69 12M84 25 91 47 84 73"/><path class="ma-jonas-star" style="--star-delay:-.8s;--star-time:4.1s" d="M18 19 19.1 22.9 23 24 19.1 25.1 18 29 16.9 25.1 13 24 16.9 22.9Z"/><path class="ma-jonas-star" style="--star-delay:-2.1s;--star-time:3.7s" d="M11 42 12 45 15 46 12 47 11 50 10 47 7 46 10 45Z"/><path class="ma-jonas-star" style="--star-delay:-1.3s;--star-time:4.6s" d="M17 66 18 69 21 70 18 71 17 74 16 71 13 70 16 69Z"/><path class="ma-jonas-star" style="--star-delay:-2.8s;--star-time:4.3s" d="M32 7 32.9 10.1 36 11 32.9 11.9 32 15 31.1 11.9 28 11 31.1 10.1Z"/><path class="ma-jonas-star" style="--star-delay:-.4s;--star-time:4.8s" d="M69 8 70 11 73 12 70 13 69 16 68 13 65 12 68 11Z"/><path class="ma-jonas-star" style="--star-delay:-1.7s;--star-time:3.9s" d="M84 20 85.1 23.9 89 25 85.1 26.1 84 30 82.9 26.1 79 25 82.9 23.9Z"/><path class="ma-jonas-star" style="--star-delay:-3s;--star-time:4.5s" d="M91 43 92 46 95 47 92 48 91 51 90 48 87 47 90 46Z"/><path class="ma-jonas-star" style="--star-delay:-2.3s;--star-time:4.2s" d="M84 69 85 72 88 73 85 74 84 77 83 74 80 73 83 72Z"/><g class="ma-jonas-stardust"><circle cx="50" cy="6" r=".7"/><circle cx="22" cy="16" r=".65"/><circle cx="10" cy="58" r=".65"/><circle cx="76" cy="17" r=".65"/><circle cx="92" cy="61" r=".65"/><circle cx="26" cy="83" r=".65"/><circle cx="75" cy="83" r=".65"/></g></svg>';
  host.appendChild(cosmos);
 }
 function syncConstellationVisibility(){document.documentElement.toggleAttribute('data-ma-jonas-fx-paused',document.hidden);}
 function enhance(){
  var root=document.getElementById("ma-jonas-home");
  if(root&&document.body.classList.contains("page-home")){root.classList.add("is-floating");document.body.classList.add("ma-jonas-inline");if(!document.documentElement.hasAttribute('data-ma-jonas-header')&&root.parentNode!==document.body)document.body.appendChild(root)}
  var active=document.getElementById('ma-ambient-jonas')||root;if(active)dockHome(active);
  document.querySelectorAll('#ma-jonas-home .jh-bubble,#ma-ambient-jonas .ja-bubble').forEach(installConstellation);
  syncConstellationVisibility();
  document.querySelectorAll('#ma-jonas-home .jh-portrait,#ma-ambient-jonas .ja-bubble').forEach(function(host){
   if(host.dataset.jonasPremium==='1')return;
   var image=host.querySelector('img');if(!image)return;
   host.dataset.jonasPremium='1';
   var layer=host;
   if(host.classList.contains('ja-bubble')){
    layer=document.createElement('span');layer.className='ja-premium-face';
    image.before(layer);layer.appendChild(image);
    var eyes=document.createElement('img');eyes.className='ja-blink';eyes.draggable=false;eyes.alt='';eyes.decoding='async';eyes.setAttribute('aria-hidden','true');eyes.src='/jonas/faces/jonas/blink.jpg';layer.appendChild(eyes);
   }
   var smile=document.createElement('img');smile.className='ja-premium-smile';
   smile.draggable=false;smile.alt='';smile.setAttribute('aria-hidden','true');smile.decoding='async';
   smile.onload=function(){layer.appendChild(smile)};
   smile.src='/jonas/faces/jonas/smile.jpg';
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
 document.addEventListener('matchapp:jonas-mounted',enhance);
 document.addEventListener('visibilitychange',function(){syncConstellationVisibility();if(!document.hidden)schedule()});
 window.addEventListener('pageshow',syncConstellationVisibility);
 document.addEventListener('matchapp:langchange',schedule);
 window.addEventListener('pagehide',function(e){if(e.persisted)return;observers.forEach(function(observer){observer.disconnect()});clearTimeout(settleTimer);if(frame){cancelAnimationFrame(frame);frame=0}});
})();
