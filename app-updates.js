/* MatchApp update status — install button also refreshes an installed app. */
(function(){
'use strict';
const RELEASE_URL='/release.json';
const INSTALLED_BUILD_KEY='match_app_installed_build';
const BUILD='2026.09.23.1';
window.MATCHAPP_BUILD = BUILD;

const isStandalone=()=>!!((window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true||window.MATCHAPP_ANDROID);
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
 setTimeout(()=>location.reload(),400);
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
