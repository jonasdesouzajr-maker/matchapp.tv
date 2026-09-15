/* MatchApp install/update progress. Browsers do not expose byte-level PWA
   install progress, so completion is tied only to real browser/OS events. */
(function(){
'use strict';
const BAR_ID='install-progress';let barEl=null,fillEl=null,labelEl=null,easeTimer=null,current=0;
function host(){return document.querySelector('.header-brand-area')||document.querySelector('.kids-brand')||document.querySelector('.matchapp-brand-link')||document.querySelector('.app-header')||document.querySelector('.kids-header')||document.body;}
function ensureBar(){if(barEl&&document.body.contains(barEl))return barEl;barEl=document.createElement('div');barEl.id=BAR_ID;barEl.className='install-progress';barEl.setAttribute('role','progressbar');barEl.setAttribute('aria-valuemin','0');barEl.setAttribute('aria-valuemax','100');barEl.innerHTML='<div class="install-progress-track"><div class="install-progress-fill"></div></div><span class="install-progress-label"></span>';const h=host();h.insertAdjacentElement(h===document.body?'afterbegin':'afterend',barEl);fillEl=barEl.querySelector('.install-progress-fill');labelEl=barEl.querySelector('.install-progress-label');return barEl;}
function setProgress(pct,label){ensureBar();current=Math.max(0,Math.min(100,pct));fillEl.style.width=current+'%';barEl.setAttribute('aria-valuenow',String(Math.round(current)));if(label){labelEl.textContent=label;barEl.setAttribute('aria-label',label);}barEl.classList.add('is-active');}
function stop(){clearInterval(easeTimer);easeTimer=null;}function hideBar(delay=1600){stop();setTimeout(()=>barEl?.classList.remove('is-active'),delay);}
function easeTo(ceiling,stepMs=120){stop();easeTimer=setInterval(()=>{if(current>=ceiling){stop();return;}const left=ceiling-current;setProgress(current+Math.max(.4,left*.06));},stepMs);}
const tr=(k,f)=>{try{const v=window.t?.(k);if(v&&v!==k)return v;}catch(_){}return f;};
function markInstalled(){document.querySelectorAll('.install-btn').forEach(btn=>{btn.classList.add('is-installed','is-app-installed');btn.classList.remove('has-update','has-app-update');btn.disabled=true;const label=btn.querySelector('.install-label');if(label)label.textContent=tr('install.installed','App updated');btn.setAttribute('aria-label',tr('install.installed','App updated'));});}
window.matchAppInstallProgress={
 start(){setProgress(8,tr('install.installing','Installing MatchApp…'));easeTo(90);},
 complete(){stop();setProgress(100,tr('install.done','App updated ✓'));hideBar(2200);markInstalled();},
 cancel(){stop();barEl?.classList.remove('is-active');},
 updating(){setProgress(10,tr('install.downloading','Downloading update…'));easeTo(88);},
 downloadReady(){stop();setProgress(100,tr('install.downloadReady','Download ready'));},
 installingUpdate(){setProgress(92,tr('install.installingUpdate','Installing on this device…'));easeTo(99,180);},
 updated(){stop();setProgress(100,tr('install.updated','App updated ✓'));hideBar(2400);markInstalled();}
};
function reflectState(){const st=window.matchAppInstallState;if(!st)return;if(document.querySelector('.install-btn.has-app-update,.install-btn.has-update'))return;if(st.isInstalled())markInstalled();}
window.addEventListener('appinstalled',()=>window.matchAppInstallProgress.complete());window.addEventListener('matchapp:installstate',reflectState);document.addEventListener('matchapp:updateapplying',()=>window.matchAppInstallProgress.updating());document.addEventListener('matchapp:updatedownloadready',()=>window.matchAppInstallProgress.downloadReady());document.addEventListener('matchapp:updateinstalling',()=>window.matchAppInstallProgress.installingUpdate());document.addEventListener('matchapp:updatecomplete',()=>window.matchAppInstallProgress.updated());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',reflectState);else reflectState();
})();
