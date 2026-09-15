/* Persist every title actually displayed without observing every text mutation. */
(function(){
'use strict';
if(window.__matchappShownHistoryBooted)return;
window.__matchappShownHistoryBooted=true;

const k=t=>window.matchPolicy?.key?.(t)||String(t||'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');

function scan(){
 const policy=window.matchPolicy;
 if(!policy)return;
 // Build the recorded-title set once per scan. The previous implementation
 // copied and searched the full history again for every card.
 const known=new Set((policy.history?.()||[]).map(i=>k(i?.title)).filter(Boolean));
 const remember=(title,extra={})=>{
  const key=k(title);if(!key||known.has(key))return;
  known.add(key);
  policy.remember?.({title,...extra,reason:'Shown by MatchApp'},'shown');
 };
 const title=window.globalMatchTitle||document.getElementById('res-title')?.textContent?.trim();
 if(title&&document.getElementById('result-box')?.style.display!=='none')remember(title,{posterUrl:window.globalMatchPoster||'',streamUrl:document.getElementById('res-direct-link')?.href||''});
 document.querySelectorAll('.discover-card').forEach(card=>{const t=card.querySelector('h3')?.textContent?.trim();if(t)remember(t,{posterUrl:card.querySelector('img')?.src||'',streamUrl:card.querySelector('.discover-play')?.href||''});});
}

let scanTimer=0;
function scheduleScan(delay=40){clearTimeout(scanTimer);scanTimer=setTimeout(scan,delay);}
function relevantAddedNode(node){
 if(!node||node.nodeType!==1)return false;
 if(node.matches?.('.discover-card,#result-box'))return true;
 return !!node.querySelector?.('.discover-card,#result-box');
}

function boot(){
 scan();
 const root=document.body||document.documentElement;
 if(root&&window.MutationObserver){
  new MutationObserver(mutations=>{
   for(const m of mutations){
    for(const node of m.addedNodes||[]){
     if(relevantAddedNode(node)){scheduleScan();return;}
    }
   }
  }).observe(root,{subtree:true,childList:true});
 }
 // Result rendering already emits this event; use it instead of watching every
 // countdown/ticker/text-node mutation on the page.
 document.addEventListener('matchapp:newmatch',()=>scheduleScan(0));
 document.addEventListener('matchapp:langchange',()=>scheduleScan(0));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
