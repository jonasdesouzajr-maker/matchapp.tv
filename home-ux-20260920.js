/* Home UX pass 2026.09.20.1 */
(function(){
'use strict';
const HOME=location.pathname==='/'||location.pathname==='/index.html';
if(!HOME)return;

function cookieSettled(){
  try{if(localStorage.getItem('match_cookie_choice'))return true;}catch(_){}
  return !document.querySelector('.ma-cookie');
}
function tourActive(){
  return document.documentElement.classList.contains('matchapp-tour-active')
    || !!(document.querySelector('.matchapp-tour-card') && !document.querySelector('.matchapp-tour-card')?.hidden);
}
function installed(){
  return !!(window.matchAppInstallState?.isInstalled?.()
    || window.matchMedia?.('(display-mode: standalone)').matches
    || navigator.standalone===true);
}

function collapseEmptyAds(){
  const frames=[...document.querySelectorAll('.premium-ad-frame,.ad-banner-container,.sidebar-ad-left,.sidebar-ad-right,.mobile-ad-bottom,.ma-inline-ad')];
  if(!frames.length)return;
  let anyLive=false;
  frames.forEach(frame=>{
    const ins=frame.querySelector('ins.adsbygoogle');
    const iframe=frame.querySelector('iframe');
    const status=(ins?.getAttribute('data-ad-status')||ins?.getAttribute('data-adsbygoogle-status')||'').toLowerCase();
    const h=Math.max(iframe?.offsetHeight||0, ins?.clientHeight||0);
    const filled=status==='filled' || (iframe && h>90);
    const failed=status==='unfilled' || status==='adsense-unfilled';
    if(filled){frame.classList.remove('is-ad-empty');anyLive=true;return;}
    if(failed || (!iframe && h<40)) frame.classList.add('is-ad-empty');
  });
  if(!anyLive && frames.every(f=>f.classList.contains('is-ad-empty'))){
    document.documentElement.classList.add('ads-empty');
  }
}

function syncInstall(){
  const pending=!!window.matchAppUpdatePending;
  const on=installed();
  document.body.toggleAttribute('data-app-installed', on && !pending);
  if(on && !pending) document.body.setAttribute('data-app-installed','1');
  else document.body.removeAttribute('data-app-installed');
  document.querySelectorAll('.install-bubble,.install-bubble-v2').forEach(el=>el.remove());
  document.querySelectorAll('.install-btn').forEach(btn=>{
    if(pending){
      btn.style.display='inline-flex';
      btn.classList.add('has-app-update');
      btn.classList.remove('is-app-installed','is-installed');
      return;
    }
    if(on){
      btn.classList.add('is-app-installed','is-installed');
      btn.style.display='none';
      const label=btn.querySelector('.install-label');
      if(label) label.textContent='Open app';
      return;
    }
    btn.classList.remove('is-app-installed','is-installed','has-app-update');
    btn.style.display='inline-flex';
    const label=btn.querySelector('.install-label');
    if(label && !label.textContent.trim()) label.textContent='Download the App';
  });
}

function fixPremiereArt(){
  const img=document.getElementById('spotlight-poster-img');
  if(!img)return;
  const fallback='/ahs13-poster.jpg?v=20260920-ux1';
  const ok='/ahs13-official.png?v=20260920-ux1';
  if(!img.dataset.uxArt){
    img.dataset.uxArt='1';
    img.addEventListener('error',()=>{if(img.src.indexOf('ahs13-poster.jpg')===-1)img.src=fallback;},{once:true});
  }
  if(!img.getAttribute('src')) img.src=ok;
  if(img.complete && img.naturalWidth===0) img.src=fallback;
}

function hideDuplicateLatest(){
  const rail=document.getElementById('trending-rail');
  if(!rail)return;
  const fold=rail.previousElementSibling;
  const h=rail.querySelector(':scope > h4');
  if(h && fold && fold.classList.contains('lazy-head')) h.hidden=true;
}

function queueOverlays(){
  const notice=document.getElementById('app-release-notice');
  if(!cookieSettled()){
    if(notice) notice.hidden=true;
    document.querySelectorAll('.matchapp-tour-card,.matchapp-tour-spotlight').forEach(el=>{el.hidden=true;});
    document.documentElement.classList.remove('matchapp-tour-active');
    return;
  }
  if(tourActive() && notice) notice.hidden=true;
}

function boot(){
  syncInstall();
  fixPremiereArt();
  hideDuplicateLatest();
  queueOverlays();
  collapseEmptyAds();
  setTimeout(collapseEmptyAds,3500);
  setTimeout(collapseEmptyAds,8000);
  setTimeout(collapseEmptyAds,14000);
  setInterval(queueOverlays,900);
}
window.addEventListener('matchapp:installstate',syncInstall);
window.addEventListener('appinstalled',syncInstall);
document.addEventListener('matchapp:langchange',syncInstall);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
