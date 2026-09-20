/* MatchApp Home folding — single owner for normal folds + Lazy Mode. */
(function(){
'use strict';
const STORE_KEY='match_lazy_mode';
const FOLD_KEY='match_home_fold_state_v2';
const GENERIC=[
 {sel:'#trending-rail',key:'trending',label:'🎬 Latest titles trending right now'},
 {sel:'#ma-concierge',key:'concierge',label:'🎯 Match / Ask MatchApp Ai'},
 {sel:'.tg-entry',key:'together',label:'🍿 Match Together'}
];
/* These sections are intentionally hidden/re-homed by the current IA.
   Never generate orphan fold bars for them on Home. */
const RETIRED_GENERIC_KEYS=new Set(['checkin','topask','how','aboutai']);
const NATIVE=[
 {sel:'#premiere-disclosure',key:'premiere'},
 {sel:'#weekly-pick-disclosure',key:'weekly'},
 {sel:'#latest-news',key:'news'},
 {sel:'#global-events .global-events-fold',key:'events'}
];
let foldState=loadFoldState(), syncing=false, observerQueued=false;
function loadFoldState(){try{const x=JSON.parse(localStorage.getItem(FOLD_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch(_){return{}}}
function saveFoldState(){try{localStorage.setItem(FOLD_KEY,JSON.stringify(foldState))}catch(_){}}
function lazyOn(){return document.body.classList.contains('lazy-mode')}
function storedOpen(key){return foldState[key]!==false}
function remember(key,open){foldState[key]=!!open;saveFoldState()}
function isOn(){try{return localStorage.getItem(STORE_KEY)==='1'}catch(_){return false}}
function setOn(v){try{localStorage.setItem(STORE_KEY,v?'1':'0')}catch(_){}}
function loggedIn(){return window.isUserLoggedIn===true}
function tr(key,fallback){if(typeof window.t!=='function')return fallback;const v=window.t(key);return v&&v!==key?v:fallback}
function labelFor(cfg,section){const h=section.querySelector?.('h2,h3,h4');const t=h?.textContent?.trim().replace(/\s+/g,' ');return t&&t.length<=72?t:cfg.label}
function setGeneric(section,open){
 const head=section.previousElementSibling?.classList?.contains('lazy-head')?section.previousElementSibling:null;
 section.classList.toggle('lazy-open',!!open);
 if(head){head.classList.toggle('is-open',!!open);head.setAttribute('aria-expanded',open?'true':'false')}
}
function mountGeneric(cfg,section){
 if(!section||section.dataset.lazyFoldMounted==='1')return;
 section.dataset.lazyFoldMounted='1';section.dataset.foldKey=cfg.key;section.classList.add('lazy-foldable');
 const head=document.createElement('button');head.type='button';head.className='lazy-head';head.dataset.foldKey=cfg.key;
 head.innerHTML='<span class="lazy-head-label"></span><span class="lazy-head-chevron" aria-hidden="true">⌄</span>';
 head.querySelector('.lazy-head-label').textContent=labelFor(cfg,section);
 head.addEventListener('click',()=>{const open=!section.classList.contains('lazy-open');setGeneric(section,open);if(!lazyOn())remember(cfg.key,open)});
 section.parentNode.insertBefore(head,section);
 if(cfg.key==='trending'){const title=section.querySelector(':scope > h4');if(title)title.hidden=true;}
}
function setNative(el,open){if(el&&el.tagName==='DETAILS'&&el.open!==!!open)el.open=!!open}
function mountNative(cfg,el){
 if(!el||el.dataset.foldStateMounted==='1')return;
 el.dataset.foldStateMounted='1';el.dataset.foldKey=cfg.key;
 el.addEventListener('toggle',()=>{if(syncing||lazyOn())return;remember(cfg.key,el.open)});
}
function hydrateSwift(section){
 if(!section||section.dataset.swiftHydrated==='1')return;
 section.dataset.swiftHydrated='1';
 section.querySelectorAll('iframe[data-src]').forEach(frame=>{if(!frame.src)frame.src=frame.dataset.src});
}
function armSwiftHydration(section){
 if(!section||section.dataset.swiftHydrationArmed==='1')return;
 section.dataset.swiftHydrationArmed='1';
 if('IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){io.disconnect();hydrateSwift(section)}
  },{rootMargin:'120px 0px'});
  io.observe(section);
 }else{
  const hydrate=()=>hydrateSwift(section);
  section.addEventListener('pointerdown',hydrate,{once:true,passive:true});
  section.addEventListener('touchstart',hydrate,{once:true,passive:true});
  section.addEventListener('focusin',hydrate,{once:true});
 }
}
function setSwift(open){
 const section=document.getElementById('swifties-spotify');if(!section)return;
 const btn=section.querySelector('.swifties-fold'),body=section.querySelector('#swifties-spotify-body');
 if(btn){btn.setAttribute('aria-expanded',open?'true':'false');const icon=btn.querySelector('.swifties-fold-icon');if(icon)icon.textContent=open?'▴':'▾'}
 if(body)body.hidden=!open;
}
function mountSwift(){
 const section=document.getElementById('swifties-spotify');if(!section||section.dataset.foldStateMounted==='1')return;
 section.dataset.foldStateMounted='1';const btn=section.querySelector('.swifties-fold');if(!btn)return;
 armSwiftHydration(section);
 btn.addEventListener('click',()=>{
  const open=btn.getAttribute('aria-expanded')!=='true';
  setSwift(open);
  if(open)hydrateSwift(section);
  if(!lazyOn())remember('swifties',open);
 });
}
function cleanupRetiredHeads(){
 document.querySelectorAll('.lazy-head[data-fold-key]').forEach(head=>{
  if(!RETIRED_GENERIC_KEYS.has(head.dataset.foldKey))return;
  const section=head.nextElementSibling;
  if(section?.dataset?.foldKey===head.dataset.foldKey){
   section.classList.remove('lazy-foldable','lazy-open');
   delete section.dataset.lazyFoldMounted;
   delete section.dataset.foldKey;
  }
  head.remove();
 });
}
function mountAll(){
 cleanupRetiredHeads();
 GENERIC.forEach(cfg=>document.querySelectorAll(cfg.sel).forEach(el=>mountGeneric(cfg,el)));
 NATIVE.forEach(cfg=>document.querySelectorAll(cfg.sel).forEach(el=>mountNative(cfg,el)));
 mountSwift();
}
function syncAll(forceClosed=false){
 syncing=true;
 try{
  GENERIC.forEach(cfg=>document.querySelectorAll(cfg.sel).forEach(el=>setGeneric(el,forceClosed?false:storedOpen(cfg.key))));
  NATIVE.forEach(cfg=>document.querySelectorAll(cfg.sel).forEach(el=>setNative(el,forceClosed?false:storedOpen(cfg.key))));
  setSwift(forceClosed?false:storedOpen('swifties'));
 }finally{queueMicrotask(()=>{syncing=false})}
}
function buildToggle(){
 if(document.getElementById('lazy-toggle-bar'))return;
 const bar=document.createElement('div');bar.id='lazy-toggle-bar';bar.className='lazy-bar';bar.hidden = true;bar.setAttribute('aria-hidden','true');
 bar.innerHTML='<button type="button" id="lazy-toggle" class="lazy-toggle" role="switch" aria-checked="false"><span class="lazy-switch" aria-hidden="true"><span class="lazy-knob"></span></span><span class="lazy-toggle-text"><strong class="lazy-title">'+tr('lazy.title','Lazy Mode')+'</strong><small class="lazy-sub"></small></span><span class="lazy-lock" aria-hidden="true">🔒</span></button>';
 document.body.appendChild(bar);document.getElementById('lazy-toggle').addEventListener('click',onToggleClick);
}
function onToggleClick(){
 if(!loggedIn()){window.showToast?.(tr('lazy.memberOnly','🔒 Lazy Mode is a free member perk — join in 10 seconds.'));window.openAuthModal?.();return}
 apply(!lazyOn(),true);
}
function refreshToggleUI(){
 const btn=document.getElementById('lazy-toggle');if(!btn)return;const on=lazyOn(),member=loggedIn();
 btn.classList.toggle('is-on',on);btn.classList.toggle('is-locked',!member);btn.setAttribute('aria-checked',on?'true':'false');
 const sub=btn.querySelector('.lazy-sub');if(sub)sub.textContent=!member?tr('lazy.subLocked','Members only — free to join'):(on?tr('lazy.subOn','Everything folded. Open only what you want.'):tr('lazy.subOff','Fold every Home section at once.'));
}
function apply(on,announce){
 if(on&&!loggedIn())on=false;document.body.classList.toggle('lazy-mode',on);setOn(on);mountAll();syncAll(on);refreshToggleUI();
 if(announce)window.showToast?.(on?tr('lazy.on','😌 Lazy Mode on — everything folded.'):tr('lazy.off','✨ Your saved section layout is restored.'));
 if(Array.isArray(window.dataLayer))window.dataLayer.push({event:'lazy_mode_toggle',lazy_mode:on?'on':'off'});
}
window.setLazyMode=v=>apply(!!v,false);
function init(){
 buildToggle();mountAll();apply(isOn(),false);
 const obs=new MutationObserver(records=>{
  let relevant=false;
  for(const r of records)for(const n of r.addedNodes||[])if(n.nodeType===1&&(n.matches?.('#weekly-pick-disclosure,#latest-news,#ma-concierge')||n.querySelector?.('#weekly-pick-disclosure,#latest-news,#ma-concierge'))){relevant=true;break}
  if(relevant&&!observerQueued){observerQueued=true;queueMicrotask(()=>{observerQueued=false;mountAll();syncAll(lazyOn())})}
 });
 obs.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
document.addEventListener('matchapp:authchange',()=>apply(isOn(),false));
document.addEventListener('matchapp:langchange',refreshToggleUI);
})();
