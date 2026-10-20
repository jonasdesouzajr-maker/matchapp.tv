/* Deliberate, interruptible presentation animations. No matching/account/media requests. */
(function(){
 'use strict';
 if(window.MatchCinemaMotion||!document.documentElement.classList.contains('ma-reference')||/^\/(kids|oauth|private-voice|android-studio)(\/|$)/.test(location.pathname))return;
 var running=new WeakMap(),active=new Set(),started=false;
 var curve='cubic-bezier(.22,.8,.22,1)';
 function reduced(){return document.documentElement.classList.contains('reduce-motion')||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
 function excluded(node){return !node||node.closest('.adsbygoogle,[data-ad-slot],.premium-ad-frame,.ma-cinema-fold-echo,#ma-jonas-home,#ma-ambient-jonas,#ma-ambient-panel,#ma-jonas-home-panel');}
 function play(node,frames,options){
  if(reduced()||typeof node?.animate!=='function')return null;
  try{return node.animate(frames,Object.assign({duration:260,easing:curve},options));}catch(_){return null;}
 }
 function stop(node){var current=running.get(node);if(current)current.cancel();}
 function retainStyle(node,property){return {value:node.style.getPropertyValue(property),priority:node.style.getPropertyPriority(property)};}
 function restoreStyle(node,property,old){if(old.value)node.style.setProperty(property,old.value,old.priority);else node.style.removeProperty(property);}
 function inertEcho(source){
  if(source.querySelector('iframe,video,audio,ins.adsbygoogle,[data-ad-slot]')||source.getBoundingClientRect().height>1200)return null;
  var clone=source.cloneNode(true);clone.classList.add('ma-cinema-fold-echo');clone.setAttribute('aria-hidden','true');clone.setAttribute('inert','');
  [clone].concat(Array.from(clone.querySelectorAll('*'))).forEach(function(node){
   node.removeAttribute('id');node.removeAttribute('name');node.removeAttribute('autofocus');
   Array.from(node.attributes).forEach(function(attr){if(/^on/i.test(attr.name))node.removeAttribute(attr.name);});
   if(node.matches('a,button,input,select,textarea,[tabindex]'))node.setAttribute('tabindex','-1');
  });
  return clone;
 }
 function foldFor(control){
  if(control.matches('summary')){
   var detail=control.parentElement;
   if(detail?.tagName==='DETAILS'&&!detail.matches('.ma-cinema-tools,.ref-explore-tools')&&!window.CSS?.supports?.('interpolate-size','allow-keywords'))return {host:detail,panel:detail,native:true};
   return null;
  }
  if(control.matches('.crit-toggle')){var host=control.closest('.crit-collapsible');return host?{host:host,panel:host.querySelector('.crit-chips')}:null;}
  if(control.matches('.lazy-head')){var panel=control.nextElementSibling;return panel?.classList.contains('lazy-foldable')?{host:panel,panel:panel}:null;}
  return null;
 }
 function animateFold(pair,before){
  if(reduced()||!pair.host.isConnected||!pair.panel.isConnected)return;
  var host=pair.host,panel=pair.panel,after=host.getBoundingClientRect().height,visible=pair.native?host.open:panel.getClientRects().length>0&&getComputedStyle(panel).display!=='none';
  if(Math.abs(before.height-after)<2)return;
  var style=retainStyle(host,'position'),display=retainStyle(host,'display'),echo=null;
  var wasInert=host.hasAttribute('inert'),oldAria=host.getAttribute('aria-hidden');
  var from=before.height,to=after;
  if(!visible&&host===panel&&!pair.native){
   host.style.setProperty('display',before.display,'important');host.setAttribute('inert','');host.setAttribute('aria-hidden','true');
  }else if(!visible&&before.echo){
   echo=before.echo;
   if(getComputedStyle(host).position==='static')host.style.setProperty('position','relative');
   Object.assign(echo.style,{position:'absolute',left:before.left+'px',top:before.top+'px',width:before.width+'px',height:before.panelHeight+'px',margin:'0',boxSizing:'border-box'});
   echo.style.setProperty('display',before.display,'important');echo.style.setProperty('max-height','none','important');
   host.appendChild(echo);
  }
  host.dataset.cinemaFoldAnimating='';
  var transition=play(host,[{height:from+'px'},{height:to+'px'}],{duration:320});
  var fade=play(echo||panel,visible?[{opacity:0,transform:'translateY(-5px)'},{opacity:1,transform:'translateY(0)'}]:[{opacity:1},{opacity:0}],{duration:visible?250:190});
  var finished=false;
  var task={cancel:function(){if(finished)return;finished=true;transition?.cancel();fade?.cancel();echo?.remove();delete host.dataset.cinemaFoldAnimating;restoreStyle(host,'position',style);restoreStyle(host,'display',display);if(!wasInert)host.removeAttribute('inert');if(oldAria===null)host.removeAttribute('aria-hidden');else host.setAttribute('aria-hidden',oldAria);running.delete(host);active.delete(task);}};
  running.set(host,task);active.add(task);
  if(transition)transition.finished.then(task.cancel,task.cancel);else task.cancel();
 }
 function captureFold(event){
  if(reduced())return;
  var control=event.target.closest?.('.crit-toggle,.lazy-head,summary');if(excluded(control))return;
  var pair=foldFor(control);if(!pair||!pair.panel)return;
  stop(pair.host);
  var hostBox=pair.host.getBoundingClientRect(),panelBox=pair.panel.getBoundingClientRect(),style=getComputedStyle(pair.panel);
  var before={height:hostBox.height,panelHeight:panelBox.height,width:panelBox.width,left:panelBox.left-hostBox.left,top:panelBox.top-hostBox.top,display:style.display};
  if((pair.host!==pair.panel||pair.native)&&panelBox.height>0&&style.display!=='none')before.echo=inertEcho(pair.panel);
  requestAnimationFrame(function(){animateFold(pair,before);});
 }
 function nativeFold(event){
  var detail=event.target;if(detail?.tagName!=='DETAILS'||!detail.open||reduced()||excluded(detail))return;
  if(detail.matches('.ma-cinema-tools,.ref-explore-tools')){
   var content=detail.querySelector('.ma-cinema-tools-content,.ref-explore-tools-panel');
   if(content)play(content,[{opacity:0,transform:'translateY(-6px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:240});
  }else if(!window.CSS?.supports?.('interpolate-size','allow-keywords')){
   Array.from(detail.children).filter(function(node){return node.tagName!=='SUMMARY';}).slice(0,8).forEach(function(node){play(node,[{opacity:0,transform:'translateY(-4px)'},{opacity:1,transform:'translateY(0)'}],{duration:240});});
  }
 }
 function arrive(){
  if(started)return;started=true;
  document.addEventListener('click',captureFold,true);
  document.addEventListener('toggle',nativeFold,true);
  var main=document.querySelector('main');
  if(main&&!reduced())play(main,[{opacity:.5,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:420});
  var motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  motion?.addEventListener?.('change',function(){if(reduced())active.forEach(function(task){task.cancel();});});
  document.addEventListener('change',function(){if(reduced())active.forEach(function(task){task.cancel();});});
  window.addEventListener('pagehide',function(){active.forEach(function(task){task.cancel();});});
 }
 window.MatchCinemaMotion={reduced:reduced};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrive,{once:true});else arrive();
})();
