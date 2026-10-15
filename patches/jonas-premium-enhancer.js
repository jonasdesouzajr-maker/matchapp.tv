/* Presentation only: existing voice handlers remain the sole speech engine. */
(function(){
 'use strict';
 if(location.pathname.startsWith('/kids')||window.__maJonasPremium)return;
 window.__maJonasPremium=true;
 var docked=true,placed=false,dragStart=null;
 function fitViewport(){
  var v=window.visualViewport,style=document.documentElement.style;
  style.setProperty('--ja-view-height',(v?v.height:innerHeight)+'px');
  style.setProperty('--ja-view-width',(v?v.width:innerWidth)+'px');
  style.setProperty('--ja-view-top',(v?v.offsetTop:0)+'px');
  style.setProperty('--ja-view-left',(v?v.offsetLeft:0)+'px');
 }
 fitViewport();
 window.addEventListener('resize',fitViewport,{passive:true});
 if(window.visualViewport){window.visualViewport.addEventListener('resize',fitViewport,{passive:true});window.visualViewport.addEventListener('scroll',fitViewport,{passive:true})}
 function positionHome(){
  var slot=document.getElementById('ma-jonas-header-slot');
  var root=document.getElementById('ma-ambient-jonas')||document.getElementById('ma-jonas-home');
  if(!root||!docked||root.classList.contains('is-chat-stage')||root.dataset.jonasPositionHeld==='1')return;
  var size=root.offsetWidth||76,vw=Math.max(1,innerWidth),vh=Math.max(1,innerHeight);
  var right=vw>=1100?28:(vw>=700?22:14);
  var bottom=vw>=1100?120:(vw>=700?118:Math.max(104,Math.min(150,vh*.17)));
  var x=Math.max(17,vw-size-right),y=Math.max(17,vh-size-bottom);
  // Reserve the header corner before placing the default launcher; saved drags remain authoritative.
  if(!document.body.classList.contains('page-home')||vw<1100){
   var head=document.querySelector('#mh-topbox .mh-head,.app-header .mh-head,.journey-header,.matchapp-brand-bar');
   var headerBox=head?head.getBoundingClientRect():null;
   x=Math.max(17,vw-size-22);y=Math.max(17,Math.min(vh-size-17,headerBox?headerBox.top+14:20));
  }
  if(slot&&document.body.classList.contains('page-home')&&vw>=1100&&window.matchMedia('(hover:hover) and (pointer:fine)').matches){
   var box=slot.getBoundingClientRect();
   if(box.width&&box.height){x=Math.max(17,Math.min(vw-size-17,box.left+(box.width-size)/2));y=Math.max(17,Math.min(vh-size-17,box.top+(box.height-size)/2))}
  }
  root.style.setProperty('left',x+'px','important');
  root.style.setProperty('top',y+'px','important');
  root.style.setProperty('right','auto','important');root.style.setProperty('bottom','auto','important');
  root.dataset.jonasDefaultDock='1';
 }
 function dockHome(root){
  if(placed)return;
  try{var saved=JSON.parse(localStorage.getItem('matchapp-jonas-position-v2')||'null');if(Number.isFinite(saved?.x)&&Number.isFinite(saved?.y))docked=false}catch(_){}
  placed=true;if(docked)root.classList.add('ja-header-default');
  root.addEventListener('pointerdown',function(e){dragStart={x:e.clientX,y:e.clientY}});
  root.addEventListener('pointermove',function(e){if(dragStart&&Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)>8){docked=false;root.classList.remove('ja-header-default')}});
  root.addEventListener('pointerup',function(){dragStart=null});
  root.addEventListener('pointercancel',function(){dragStart=null});
  new MutationObserver(positionHome).observe(root,{attributes:true,attributeFilter:['class','hidden']});
  window.addEventListener('resize',positionHome,{passive:true});
  var slot=document.getElementById('ma-jonas-header-slot');
  if(slot&&window.ResizeObserver)new ResizeObserver(positionHome).observe(slot.parentElement);
  positionHome();requestAnimationFrame(positionHome);
 }
 function enhance(){
  var root=document.getElementById("ma-jonas-home");
  if(root&&document.body.classList.contains("page-home")){root.classList.add("is-floating");document.body.classList.add("ma-jonas-inline");if(root.parentNode!==document.body)document.body.appendChild(root)}
  var active=document.getElementById('ma-ambient-jonas')||root;if(active)dockHome(active);
  document.querySelectorAll('#ma-jonas-home .jh-portrait,#ma-ambient-jonas .ja-bubble').forEach(function(host){
   if(host.dataset.jonasPremium==='1')return;
   var image=host.querySelector('img');if(!image)return;
   host.dataset.jonasPremium='1';
   var layer=host;
   if(host.classList.contains('ja-bubble')){
    layer=document.createElement('span');layer.className='ja-premium-face';
    image.before(layer);layer.appendChild(image);
    var eyes=document.createElement('img');eyes.className='ja-blink';eyes.alt='';eyes.setAttribute('aria-hidden','true');eyes.src='/jonas/faces/jonas/blink.jpg';layer.appendChild(eyes);
   }
   var smile=document.createElement('img');smile.className='ja-premium-smile';
   smile.alt='';smile.setAttribute('aria-hidden','true');smile.decoding='async';
   smile.onload=function(){layer.appendChild(smile)};
   smile.src='/jonas/faces/jonas/smile.jpg';
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
 document.addEventListener('matchapp:jonas-mounted',enhance);
 document.addEventListener('visibilitychange',function(){if(!document.hidden)positionHome()});
})();
