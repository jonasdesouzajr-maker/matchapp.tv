/* MatchApp update status — install button also refreshes an installed app. */
(function(){
'use strict';
const RELEASE_URL='/release.json';
const INSTALLED_BUILD_KEY='match_app_installed_build';
const BUILD = /^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(String(window.MATCHAPP_BUILD||''))
  ? window.MATCHAPP_BUILD : '2026.09.26.9';
// build-meta.js is the actual release authority; never overwrite its newer
// value with an obsolete update-module constant on installed mobile clients.
if(!window.MATCHAPP_BUILD)window.MATCHAPP_BUILD=BUILD;

const KIDS = location.pathname === '/kids' || location.pathname.startsWith('/kids/');
const UA = String(navigator.userAgent || '');
const IS_NATIVE_ADULT = /MatchAppAiAndroid\\//.test(UA);
const IS_MOBILE_ADULT = !KIDS && /Android|iPhone|iPad|iPod/i.test(UA);
const MOBILE_RECOVERY_KEY='matchapp_adult_mobile_runtime_20260927_1';
const isStandalone=()=>!!((window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true||window.MATCHAPP_ANDROID||IS_NATIVE_ADULT);
function safeGet(k){try{return localStorage.getItem(k)}catch(_){return null}}
function safeSet(k,v){try{localStorage.setItem(k,v)}catch(_){}}
function pt(){return String(document.documentElement.lang||navigator.language||'').toLowerCase().indexOf('pt')===0}
function appName(){return pt()?'MatchApp iA':'MatchApp Ai'}

function removeLegacyUi(){
 document.querySelectorAll('#app-release-notice,.app-release-notice,.matchapp-whats-new-modal').forEach(el=>el.remove());
}

function labelInstallButtons(mode){
 const text = mode==='update' ? (pt()?'Atualizar':'Update') : (pt()?'Instalar':'Install');
 document.querySelectorAll('.install-btn, .ma-install-go, .chrome-install-now').forEach(btn=>{
  if(btn && !btn.closest('#chrome-install-card')) btn.textContent=text;
 });
}

function overlay(msg){
 let el=document.getElementById('matchapp-update-overlay');
 if(!el){
  el=document.createElement('div');
  el.id='matchapp-update-overlay';
  el.setAttribute('role','status');
  el.style.cssText='position:fixed;inset:0;z-index:4000;display:flex;align-items:center;justify-content:center;background:rgba(8,6,18,.72);color:#fff;font:700 16px/1.4 Outfit,system-ui,sans-serif;padding:24px;text-align:center';
  const card=document.createElement('div');
  card.style.cssText='max-width:320px;border:1px solid rgba(229,193,88,.5);border-radius:18px;background:#120a22;padding:22px 20px';
  const p=document.createElement('p');
  p.id='matchapp-update-overlay-text';
  p.style.margin='0';
  card.appendChild(p);
  el.appendChild(card);
  document.body.appendChild(el);
 }
 const p=document.getElementById('matchapp-update-overlay-text');
 if(p) p.textContent=msg;
}

async function refreshWorker(){
 if(!('serviceWorker' in navigator)) return;
 const regs=await navigator.serviceWorker.getRegistrations();
 for(const reg of regs){
  try{
   await reg.update();
   if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
  }catch(_){}
 }
}

// One mobile-only refresh on an already-installed adult PWA after the 27 Sep
// matching/AI hotfix. Versioned page URL plus bumped script URLs break the
// previous old-script/new-backend combination without touching saved accounts,
// exclusions, session history or match/Ask AI credits. Never run on desktop,
// Kids, or an Android native shell (which already cold-loads with no cache).
async function recoverInstalledMobileRuntime(){
 if(!IS_MOBILE_ADULT||IS_NATIVE_ADULT||!isStandalone()||safeGet(MOBILE_RECOVERY_KEY))return;
 if(document.body?.classList.contains('match-searching'))return;
 const input=document.querySelector('.newsearch-row textarea,.newsearch-row input,#specific-search-input');
 if(input && String(input.value||'').trim())return;
 safeSet(MOBILE_RECOVERY_KEY,'pending');
 try { await refreshWorker(); } catch (_) {}
 const url=new URL(location.href);
 url.searchParams.set('ma_mobile_recovery','20260927-1');
 if(typeof location.replace==='function')location.replace(url.toString());
}

window.updateMatchAppNow=async function(){
 const name=appName();
 overlay(pt()
  ?('Atualizando '+name+' para a versão mais recente…')
  :('Updating '+name+' to the latest release…'));
 try{
  await refreshWorker();
  const res=await fetch(RELEASE_URL+'?v='+Date.now(),{cache:'no-store'});
  if(res.ok){
   const release=await res.json();
   if(release&&release.version) safeSet(INSTALLED_BUILD_KEY,String(release.version));
  }else{
   safeSet(INSTALLED_BUILD_KEY,BUILD);
  }
 }catch(_){
  safeSet(INSTALLED_BUILD_KEY,BUILD);
 }
 // An explicit mobile update must request a fresh document URL; reloading
 // the identical cached PWA URL was insufficient after the backend hotfix.
 setTimeout(()=>{
   if(IS_MOBILE_ADULT&&!IS_NATIVE_ADULT){
     const url=new URL(location.href);
     url.searchParams.set('ma_mobile_recovery','20260927-1');
     location.replace(url.toString());
   }else location.reload();
 },400);
};
window.updateMatchApp=window.updateMatchAppNow;

async function check(){
 removeLegacyUi();
 labelInstallButtons((isStandalone()||window.matchAppInstallState?.isInstalled())?'update':'install');
 try{
  const res=await fetch(RELEASE_URL+'?v='+Date.now(),{cache:'no-store'});
  if(!res.ok)return null;
  const release=await res.json();
  if(release&&release.version) window.matchAppUpdatePending={version:String(release.version)};
  // Only an installed adult mobile PWA is eligible for the one-time scoped
  // recovery. Ordinary mobile websites, desktop and Kids keep their UI and
  // update flow unchanged.
  if(window.matchAppUpdatePending && String(window.matchAppUpdatePending.version)===BUILD)
    await recoverInstalledMobileRuntime();
  return window.matchAppUpdatePending;
 }catch(err){
  console.warn('[MatchApp update check]',err);
  return null;
 }
}
window.checkMatchAppRelease=check;
window.syncMatchAppUpdateButtons=function(){labelInstallButtons((isStandalone()||window.matchAppInstallState?.isInstalled())?'update':'install')};
removeLegacyUi();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{check()},{once:true});else check();
})();
