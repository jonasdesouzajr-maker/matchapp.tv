/* MatchApp update status — install button also refreshes an installed app. */
(function(){
'use strict';
const RELEASE_URL='/release.json';
const INSTALLED_BUILD_KEY='match_app_installed_build';
const BUILD = /^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(String(window.MATCHAPP_BUILD||''))
  ? window.MATCHAPP_BUILD : '2026.09.26.9';
const validVersion=v=>/^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(String(v||''));
function newer(a,b){return validVersion(a)&&validVersion(b)&&a.split('.').map(Number).some((n,i,parts)=>n>Number(b.split('.')[i])&&parts.slice(0,i).every((v,j)=>v===Number(b.split('.')[j])));}
async function bounded(work){let timer;try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Update check timed out')),8000);})]);}finally{clearTimeout(timer);}}
// build-meta.js is the actual release authority; never overwrite its newer
// value with an obsolete update-module constant on installed mobile clients.
if(!window.MATCHAPP_BUILD)window.MATCHAPP_BUILD=BUILD;

const KIDS = location.pathname === '/kids' || location.pathname.startsWith('/kids/');
const UA = String(navigator.userAgent || '');
const IS_NATIVE_ADULT = /MatchAppAiAndroid\//.test(UA);
const IS_MOBILE_ADULT = !KIDS && /Android|iPhone|iPad|iPod/i.test(UA);
const MOBILE_RECOVERY_KEY='matchapp_adult_mobile_runtime_20260927_1';
const isStandalone=()=>!!((window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true||window.MATCHAPP_ANDROID||IS_NATIVE_ADULT);
function safeGet(k){try{return localStorage.getItem(k)}catch(_){return null}}
function safeSet(k,v){try{localStorage.setItem(k,v)}catch(_){}}
function pt(){return String(document.documentElement.lang||navigator.language||'').toLowerCase().indexOf('pt')===0}
function appName(){return 'MatchApp Ai'}

function removeLegacyUi(){
 document.querySelectorAll('#app-release-notice,.app-release-notice,.matchapp-whats-new-modal').forEach(el=>el.remove());
}

function labelInstallButtons(mode){
 const text = mode==='update' ? (pt()?'Atualizar':'Update') : mode==='installed' ? (pt()?'Instalado':'Installed') : (pt()?'Instalar':'Install');
 document.querySelectorAll('.install-btn, .ma-install-go, .chrome-install-now').forEach(btn=>{
  const kidsLabel=KIDS&&btn.matches('.kids-install')&&btn.querySelector('[data-k]');
  if(kidsLabel){
   kidsLabel.dataset.k=mode==='update'?'updateApp':mode==='installed'?'installedApp':'installApp';
   kidsLabel.dispatchEvent(new CustomEvent('matchapp:kids-install-label',{bubbles:true}));
   return;
  }
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
  if(!KIDS){const close=document.createElement('button');close.type='button';close.textContent=pt()?'Fechar':'Close';close.className='gold-btn';close.style.cssText='margin-top:12px;min-height:44px';close.addEventListener('click',()=>el.remove());card.appendChild(close);}
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

// Native refresh only repaints saved local activity. It does not install an APK
// or claim to synchronize records with a server.
const nativeRefreshMessages={
 en:['Saved activity refreshed on this device.','Your current screen has been kept.','Refresh is unavailable.','App updates are installed through Google Play.'],
 pt:['A atividade salva foi atualizada neste dispositivo.','Sua tela atual foi mantida.','Não foi possível atualizar.','As atualizações do aplicativo são instaladas pelo Google Play.'],
 es:['La actividad guardada se ha actualizado en este dispositivo.','Se ha conservado la pantalla actual.','No se puede actualizar ahora.','Las actualizaciones de la aplicación se instalan desde Google Play.'],
 fr:['L’activité enregistrée a été actualisée sur cet appareil.','Votre écran actuel a été conservé.','L’actualisation est indisponible.','Les mises à jour de l’application s’installent via Google Play.'],
 de:['Die gespeicherten Aktivitäten wurden auf diesem Gerät neu angezeigt.','Deine aktuelle Ansicht bleibt erhalten.','Die Ansicht kann gerade nicht aktualisiert werden.','App-Updates werden über Google Play installiert.'],
 it:['L’attività salvata è stata aggiornata su questo dispositivo.','La schermata attuale è stata mantenuta.','L’aggiornamento della schermata non è disponibile.','Gli aggiornamenti dell’app si installano tramite Google Play.'],
 tr:['Bu cihazda kayıtlı etkinlikler yenilendi.','Mevcut ekranınız korundu.','Yenileme şu anda kullanılamıyor.','Uygulama güncellemeleri Google Play üzerinden yüklenir.'],
 ru:['Сохранённые действия обновлены на этом устройстве.','Текущий экран сохранён.','Обновление экрана недоступно.','Обновления приложения устанавливаются через Google Play.'],
 ar:['تم تحديث النشاط المحفوظ على هذا الجهاز.','تم الاحتفاظ بالشاشة الحالية.','تحديث الشاشة غير متاح.','تُثبَّت تحديثات التطبيق عبر Google Play.'],
 hi:['इस डिवाइस पर सहेजी गई गतिविधि रीफ़्रेश की गई।','आपकी मौजूदा स्क्रीन बरकरार है।','रीफ़्रेश उपलब्ध नहीं है।','ऐप के अपडेट Google Play से इंस्टॉल होते हैं।'],
 id:['Aktivitas tersimpan telah disegarkan di perangkat ini.','Layar saat ini tetap dipertahankan.','Penyegaran tidak tersedia.','Pembaruan aplikasi dipasang melalui Google Play.'],
 ja:['この端末に保存されたアクティビティを再表示しました。','現在の画面は保持されています。','画面を再読み込みできませんでした。','アプリのアップデートは Google Play からインストールします。'],
 ko:['이 기기에 저장된 활동을 새로 표시했습니다.','현재 화면이 유지됩니다.','화면을 새로 표시할 수 없습니다.','앱 업데이트는 Google Play에서 설치합니다.'],
 zh:['已重新显示此设备上保存的活动。','当前页面已保留。','暂时无法刷新。','应用更新通过 Google Play 安装。']
};
let nativeRefreshStatusTimer;
function notifyNativeRefresh(result){
 const language=String(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en').toLowerCase().replace('_','-').split('-')[0];
 const copy=nativeRefreshMessages[language]||nativeRefreshMessages.en;
 const status=result?.refreshed===true?copy[0]:(result?.kind==='unavailable'?copy[2]+' ':'')+copy[1];
 const message=status+' '+copy[3];
 if(typeof window.showToast==='function'){
  try{window.showToast(message);return;}catch(_){}
 }
 let notice=document.getElementById('matchapp-native-refresh-status');
 if(!notice){
  notice=document.createElement('div');notice.id='matchapp-native-refresh-status';
  notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  notice.style.cssText='position:fixed;inset-inline:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));margin-inline:auto;max-width:32rem;padding:14px 16px;border:1px solid rgba(229,193,88,.5);border-radius:14px;background:#21162f;color:#fff;font:500 14px/1.5 Outfit,system-ui,sans-serif;z-index:4000;pointer-events:none';
  (document.body||document.documentElement).appendChild(notice);
 }
 notice.textContent=message;
 clearTimeout(nativeRefreshStatusTimer);nativeRefreshStatusTimer=setTimeout(()=>notice.remove(),6500);
}

let nativeRefreshModule;
function loadNativeRefresh(){
 if(window.MatchAppLocalRefresh?.refresh)return Promise.resolve();
 if(!nativeRefreshModule)nativeRefreshModule=bounded(new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='/patches/native-local-refresh.js?v=20261021-1';
  script.onload=()=>window.MatchAppLocalRefresh?.refresh?resolve():reject(new Error('Refresh unavailable'));
  script.onerror=()=>reject(new Error('Refresh unavailable'));
  (document.head||document.documentElement).appendChild(script);
 })).catch(error=>{nativeRefreshModule=null;throw error;});
 return nativeRefreshModule;
}
window.updateMatchAppNow=async function(){
 if(!KIDS&&(IS_NATIVE_ADULT||window.MATCHAPP_ANDROID)){
  try{
   await loadNativeRefresh();
   const result=await bounded(window.MatchAppLocalRefresh.refresh({reason:'manual-update'}));
   notifyNativeRefresh(result);
   return result?.refreshed===true;
  }catch(_){
   notifyNativeRefresh({refreshed:false,kind:'unavailable'});
   return false;
  }
 }
 const name=appName();
 overlay(pt()
  ?('Atualizando '+name+' para a versão mais recente…')
  :('Updating '+name+' to the latest release…'));
 try{
  await bounded(refreshWorker());
  const res=await bounded(fetch(RELEASE_URL+'?v='+Date.now(),{cache:'no-store'}));
  if(res.ok){
   const release=await bounded(res.json());
   if(!validVersion(release?.version))throw new Error('Invalid release');
   safeSet(INSTALLED_BUILD_KEY,String(release.version));
  }else{
   throw new Error('Update unavailable');
  }
 }catch(_){
  document.getElementById('matchapp-update-overlay')?.remove();
  if(window.showToast)window.showToast(pt()?'Não foi possível atualizar. Tente novamente.':'Could not update. Please try again.');
  return false;
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
 labelInstallButtons((isStandalone()||window.matchAppInstallState?.isInstalled())?(KIDS||window.matchAppUpdatePending?'update':'installed'):'install');
 try{
  const res=await bounded(fetch(RELEASE_URL+'?v='+Date.now(),{cache:'no-store'}));
  if(!res.ok)return null;
  const release=await bounded(res.json());
  const installedBuild=window.matchAppInstallState?.installedBuild?.()||safeGet(INSTALLED_BUILD_KEY)||BUILD;
  if(KIDS){if(release&&release.version)window.matchAppUpdatePending={version:String(release.version)};}
  else window.matchAppUpdatePending=release&&newer(release.version,installedBuild)?{version:String(release.version)}:null;
  window.syncMatchAppUpdateButtons();
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
window.syncMatchAppUpdateButtons=function(){labelInstallButtons((isStandalone()||window.matchAppInstallState?.isInstalled())?(KIDS||window.matchAppUpdatePending?'update':'installed'):'install')};
removeLegacyUi();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{check()},{once:true});else check();
})();
