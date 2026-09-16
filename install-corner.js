/* Compact install/update control anchored to the brand without nesting a button inside a link. */
(function(){
'use strict';
const copy={
 en:{install:'Download app',update:'Update app',installed:'Installed',safe:'Secure web app \u00b7 HTTPS \u00b7 browser security checks apply'},
 'pt-BR':{install:'Baixar app',update:'Atualizar app',installed:'Instalado',safe:'App web seguro \u00b7 HTTPS \u00b7 verificacoes de seguranca do navegador'},
 es:{install:'Descargar app',update:'Actualizar app',installed:'Instalada',safe:'App web segura \u00b7 HTTPS \u00b7 controles de seguridad del navegador'},
 fr:{install:'Telecharger',update:'Mettre a jour',installed:'Installee',safe:'Application web securisee \u00b7 HTTPS \u00b7 controles du navigateur'},
 de:{install:'App laden',update:'App aktualisieren',installed:'Installiert',safe:'Sichere Web-App \u00b7 HTTPS \u00b7 Browser-Sicherheitspruefungen'},
 it:{install:'Scarica app',update:'Aggiorna app',installed:'Installata',safe:'Web app sicura \u00b7 HTTPS \u00b7 controlli di sicurezza del browser'},
 tr:{install:'Uygulamayi indir',update:'Uygulamayi guncelle',installed:'Yuklendi',safe:'Guvenli web uygulamasi \u00b7 HTTPS \u00b7 tarayici güvenlik kontrolleri'},
 ru:{install:'Skachat',update:'Obnovit',installed:'Ustanovleno',safe:'Secure web app \u00b7 HTTPS'},
 ar:{install:'Download',update:'Update',installed:'Installed',safe:'Secure web app \u00b7 HTTPS'},
 hi:{install:'Download app',update:'Update app',installed:'Installed',safe:'Secure web app \u00b7 HTTPS'},
 id:{install:'Unduh aplikasi',update:'Perbarui aplikasi',installed:'Terpasang',safe:'Aplikasi web aman \u00b7 HTTPS \u00b7 pemeriksaan keamanan browser'},
 ja:{install:'Get app',update:'Update app',installed:'Installed',safe:'Secure web app \u00b7 HTTPS'},
 ko:{install:'Download',update:'Update',installed:'Installed',safe:'Secure web app \u00b7 HTTPS'},
 zh:{install:'Download',update:'Update',installed:'Installed',safe:'Secure web app \u00b7 HTTPS'}
};
const lang=()=>String(window.MATCH_LANG||document.documentElement.lang||'en');
const text=()=>copy[lang()]||copy[lang().split('-')[0]]||copy.en;
function originalButton(){return [...document.querySelectorAll('.install-btn')].find(b=>!b.classList.contains('brand-install-corner'))||null;}
function stateLabel(btn){const c=text();if(window.matchAppUpdatePending||btn?.classList.contains('has-app-update'))return c.update;if(window.matchAppInstallState?.isInstalled?.()||btn?.classList.contains('is-app-installed'))return c.installed;return c.install;}
function build(){
 const brand=document.querySelector('.app-header .header-brand-area')||document.querySelector('.matchapp-brand-bar .matchapp-brand-link');
 const source=originalButton();if(!brand||!source)return;
 let cluster=brand.closest('.brand-app-cluster');
 if(!cluster){cluster=document.createElement('div');cluster.className='brand-app-cluster';brand.parentNode.insertBefore(cluster,brand);cluster.appendChild(brand);}
 let btn=cluster.querySelector('.brand-install-corner');
 if(!btn){btn=source.cloneNode(true);btn.removeAttribute('id');btn.classList.add('brand-install-corner');btn.removeAttribute('style');btn.removeAttribute('onclick');btn.type='button';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.installMatchApp?.();});cluster.appendChild(btn);source.classList.add('install-source-suppressed');}
 btn.style.display=source.style.display==='none'&&!window.matchAppUpdatePending&&!window.matchAppInstallState?.isInstalled?.()?'none':'inline-flex';
 btn.classList.toggle('has-app-update',!!window.matchAppUpdatePending||source.classList.contains('has-app-update'));
 btn.classList.toggle('is-app-installed',!btn.classList.contains('has-app-update')&&(window.matchAppInstallState?.isInstalled?.()||source.classList.contains('is-app-installed')));
 const label=stateLabel(btn);btn.textContent=label;btn.setAttribute('aria-label',label);btn.title=text().safe;btn.dataset.safety=text().safe;
 let trust=cluster.querySelector('.install-safety-mini');if(!trust){trust=document.createElement('span');trust.className='install-safety-mini';cluster.appendChild(trust);}trust.textContent=text().safe;
}
function boot(){
  let queued=false,busy=false;
  const run=()=>{if(busy){queued=true;return}busy=true;try{build()}finally{busy=false;if(queued){queued=false;requestAnimationFrame(run)}}};
  run();
  const header=document.querySelector('.app-header')||document.body;
  new MutationObserver(()=>{if(!busy)requestAnimationFrame(run)}).observe(header,{subtree:true,childList:true});
  document.addEventListener('matchapp:langchange',run);
  window.addEventListener('matchapp:installstate',run);
  window.addEventListener('appinstalled',run);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
