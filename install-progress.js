/* MatchApp install/update progress.
   Browsers do not expose byte-level PWA download/install progress. This meter
   therefore advances only when a real browser/service-worker lifecycle event
   occurs; it never invents a percentage from elapsed time. */
(function(){
'use strict';
const BAR_ID='install-progress';let barEl=null,fillEl=null,labelEl=null,current=0,finishing=false;
const tr=(k,f)=>{try{const v=window.t?.(k);if(v&&v!==k)return v;}catch(_){}return f;};
function host(){return document.querySelector('.header-brand-area')||document.querySelector('.kids-brand')||document.querySelector('.matchapp-brand-link')||document.querySelector('.app-header')||document.querySelector('.kids-header')||document.body;}
function ensureBar(){
 if(barEl&&document.body.contains(barEl))return barEl;
 barEl=document.createElement('div');barEl.id=BAR_ID;barEl.className='install-progress install-progress-real';barEl.setAttribute('role','progressbar');barEl.setAttribute('aria-valuemin','0');barEl.setAttribute('aria-valuemax','100');
 barEl.innerHTML='<div class="install-progress-track"><div class="install-progress-fill"></div></div><span class="install-progress-label" aria-live="polite"></span>';
 const h=host();h.insertAdjacentElement(h===document.body?'afterbegin':'afterend',barEl);fillEl=barEl.querySelector('.install-progress-fill');labelEl=barEl.querySelector('.install-progress-label');return barEl;
}
function stage(pct,label,indeterminate=false){
 ensureBar();current=Math.max(current,Math.min(100,Number(pct)||0));fillEl.style.width=current+'%';barEl.setAttribute('aria-valuenow',String(Math.round(current)));labelEl.textContent=label||'';barEl.setAttribute('aria-label',label||'');barEl.classList.add('is-active');barEl.classList.toggle('is-indeterminate',!!indeterminate);
}
function hide(delay=2200){setTimeout(()=>{barEl?.classList.remove('is-active','is-indeterminate');current=0;finishing=false;},delay);}
function markInstalled(){document.querySelectorAll('.install-btn').forEach(btn=>{btn.classList.add('is-installed','is-app-installed');btn.classList.remove('has-update','has-app-update');btn.disabled=false;btn.setAttribute('aria-label',tr('install.installed','App installed'));});}
function complete(label){if(finishing)return;finishing=true;stage(100,label||tr('install.updated','App updated ✓'),false);markInstalled();hide();}
window.matchAppInstallProgress={
 start(){current=0;stage(12,tr('install.installing','Waiting for device install…'),true);},
 complete(){complete(tr('install.done','App installed ✓'));},
 cancel(){barEl?.classList.remove('is-active','is-indeterminate');current=0;},
 updating(){current=0;stage(18,tr('install.downloading','Downloading update…'),true);},
 downloadReady(){stage(68,tr('install.downloadReady','Download ready'),false);},
 installingUpdate(){stage(86,tr('install.installingUpdate','Installing update…'),true);},
 updated(){complete(tr('install.updated','App updated ✓'));}
};
function bindWorker(worker){
 if(!worker||worker.__matchProgressBound)return;worker.__matchProgressBound=true;
 const reflect=()=>{
  if(worker.state==='installing')window.matchAppInstallProgress.updating();
  else if(worker.state==='installed')window.matchAppInstallProgress.downloadReady();
  else if(worker.state==='activating')window.matchAppInstallProgress.installingUpdate();
  else if(worker.state==='activated'&&navigator.serviceWorker.controller)window.matchAppInstallProgress.updated();
  else if(worker.state==='redundant')window.matchAppInstallProgress.cancel();
 };
 worker.addEventListener('statechange',reflect);reflect();
}
async function bindRegistration(){
 if(!('serviceWorker'in navigator))return;
 try{const reg=await navigator.serviceWorker.getRegistration();if(!reg)return;bindWorker(reg.installing);bindWorker(reg.waiting);reg.addEventListener('updatefound',()=>bindWorker(reg.installing));}catch(_){}
}
function reflectState(){const st=window.matchAppInstallState;if(st?.isInstalled())markInstalled();}
window.addEventListener('appinstalled',()=>window.matchAppInstallProgress.complete());
window.addEventListener('matchapp:installstate',reflectState);
navigator.serviceWorker?.addEventListener?.('controllerchange',()=>window.matchAppInstallProgress.updated());
document.addEventListener('matchapp:updateapplying',()=>window.matchAppInstallProgress.updating());
document.addEventListener('matchapp:updatedownloadready',()=>window.matchAppInstallProgress.downloadReady());
document.addEventListener('matchapp:updateinstalling',()=>window.matchAppInstallProgress.installingUpdate());
document.addEventListener('matchapp:updatecomplete',()=>window.matchAppInstallProgress.updated());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{reflectState();bindRegistration();},{once:true});else{reflectState();bindRegistration();}
})();
