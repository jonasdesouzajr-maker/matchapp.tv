/* Persist every title actually displayed, even when it came from an older soft recent cache. */
(function(){
'use strict';
const k=t=>window.matchPolicy?.key?.(t)||String(t||'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
function recorded(title){const key=k(title);return !!window.matchPolicy?.history?.().some(i=>k(i.title)===key);}
function remember(title,extra={}){if(!title||recorded(title))return;window.matchPolicy?.remember?.({title,...extra,reason:'Shown by MatchApp'},'shown');}
function scan(){
 const title=window.globalMatchTitle||document.getElementById('res-title')?.textContent?.trim();
 if(title&&document.getElementById('result-box')?.style.display!=='none')remember(title,{posterUrl:window.globalMatchPoster||'',streamUrl:document.getElementById('res-direct-link')?.href||''});
 document.querySelectorAll('.discover-card').forEach(card=>{const t=card.querySelector('h3')?.textContent?.trim();if(t)remember(t,{posterUrl:card.querySelector('img')?.src||'',streamUrl:card.querySelector('.discover-play')?.href||''});});
}
function boot(){scan();new MutationObserver(()=>queueMicrotask(scan)).observe(document.documentElement,{subtree:true,childList:true,characterData:true});document.addEventListener('matchapp:langchange',scan);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
