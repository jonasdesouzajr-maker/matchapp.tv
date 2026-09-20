/* MatchApp update status — one quiet owner, no browser interstitials. */
(function(){
'use strict';
const RELEASE_URL='/release.json';
const INSTALLED_BUILD_KEY='match_app_installed_build';
const isStandalone=()=>!!((window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true||window.MATCHAPP_ANDROID);
function safeGet(k){try{return localStorage.getItem(k)}catch(_){return null}}
function safeSet(k,v){try{localStorage.setItem(k,v)}catch(_){}}
function removeLegacyUi(){
 document.querySelectorAll('#app-release-notice,.app-release-notice,.matchapp-whats-new-modal').forEach(el=>el.remove());
 document.querySelectorAll('.install-btn.has-app-update,.install-btn.has-update').forEach(btn=>btn.classList.remove('has-app-update','has-update'));
}
function toast(version){
 if(document.getElementById('matchapp-update-toast'))return;
 const el=document.createElement('div');el.id='matchapp-update-toast';el.className='matchapp-update-toast';el.setAttribute('role','status');
 el.innerHTML='<span>New version available</span><button type="button">Refresh</button>';
 el.querySelector('button').addEventListener('click',()=>location.reload());
 document.body.appendChild(el);
 window.matchAppUpdatePending={version};
}
async function check(){
 removeLegacyUi();
 if(!isStandalone()){window.matchAppUpdatePending=null;return null}
 try{
  const res=await fetch(RELEASE_URL+'?v='+Date.now(),{cache:'no-store'});
  if(!res.ok)throw new Error('release '+res.status);
  const release=await res.json();
  const live=String(window.MATCHAPP_BUILD||'');
  if(!release?.version||live!==String(release.version)){window.matchAppUpdatePending=null;return null}
  const installed=safeGet(INSTALLED_BUILD_KEY);
  if(installed&&installed!==live){toast(live);return window.matchAppUpdatePending}
  safeSet(INSTALLED_BUILD_KEY,live);window.matchAppUpdatePending=null;return null;
 }catch(err){console.warn('[MatchApp update check]',err);return null}
}
window.checkMatchAppRelease=check;
window.updateMatchApp=async function(){location.reload()};
window.syncMatchAppUpdateButtons=removeLegacyUi;
removeLegacyUi();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{check()},{once:true});else check();
})();
