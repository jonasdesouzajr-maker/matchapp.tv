/* Adult browser install discovery — notification-bell only.
   First and second eligible Home visits get one unread install notification.
   Android routes to the official Google Play package; Apple devices get the
   real Add to Home Screen / Add to Dock flow. No floating install banner. */
(function(){
  'use strict';
  if(window.__maBrowserInstallOffer)return;
  window.__maBrowserInstallOffer=true;

  const VISITS='matchapp_install_prompt_visits_v2';
  const MAX_VISITS=2;
  const PLAY='https://play.google.com/store/apps/details?id=com.jonas.papercup';
  const DELAY=1100;
  let queued=false,completed=false;

  function nativeShell(){
    return /MatchAppTVAndroid|MatchAppAiAndroid|MatchAppAiKidsAndroid/i.test(navigator.userAgent||'') ||
      document.documentElement.classList.contains('matchapp-android');
  }
  function standalone(){
    return navigator.standalone===true ||
      !!(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches);
  }
  function android(){
    return /Android/i.test(navigator.userAgent||'')&&!nativeShell();
  }
  function apple(){
    const ua=navigator.userAgent||'';
    const ipad=/Macintosh/i.test(ua)&&Number(navigator.maxTouchPoints||0)>1;
    const ios=/iPhone|iPad|iPod/i.test(ua)||ipad;
    const mac=/Macintosh|Mac OS X/i.test(ua)&&!ios;
    return {ios,mac};
  }
  function home(){
    return document.body?.classList.contains('page-home')&&(location.pathname==='/'||location.pathname==='/index.html');
  }
  function installed(){
    return standalone()||nativeShell()||
      !!(window.matchAppInstallState&&window.matchAppInstallState.isInstalled&&window.matchAppInstallState.isInstalled());
  }
  async function relatedInstalled(){
    if(typeof navigator.getInstalledRelatedApps!=='function')return false;
    try{
      const apps=await Promise.race([
        navigator.getInstalledRelatedApps(),
        new Promise(resolve=>setTimeout(()=>resolve([]),1400))
      ]);
      return Array.isArray(apps)&&apps.some(app=>
        (app.platform==='play'&&app.id==='com.jonas.papercup')||
        (app.platform==='webapp'&&(app.id==='https://matchapp.tv/'||/manifest(?:-pt-br)?\.json$/i.test(String(app.url||''))))
      );
    }catch(_){return false;}
  }
  function locale(){
    const raw=String(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en').toLowerCase();
    return raw.startsWith('pt')?'pt-BR':'en';
  }
  function copy(kind,visit){
    const pt=locale()==='pt-BR';
    if(kind==='android')return pt?{
      title:'Baixe o MatchApp Ai no Google Play',
      body:(visit===1?'O app oficial do MatchApp Ai já está disponível. ':'Último lembrete: ')+
        'toque aqui para baixar pelo Google Play — sem instalar pelo navegador.'
    }:{
      title:'Get MatchApp Ai on Google Play',
      body:(visit===1?'The official MatchApp Ai Android app is ready. ':'One last reminder: ')+
        'tap here to download it from Google Play instead of installing from the browser.'
    };
    if(kind==='ios')return pt?{
      title:'Adicione o MatchApp Ai à Tela de Início',
      body:(visit===1?'Tenha acesso mais rápido no iPhone ou iPad. ':'Último lembrete: ')+
        'toque aqui para ver como adicionar o MatchApp Ai à Tela de Início.'
    }:{
      title:'Add MatchApp Ai to your Home Screen',
      body:(visit===1?'Get faster access on your iPhone or iPad. ':'One last reminder: ')+
        'tap here for the real Add to Home Screen steps.'
    };
    return pt?{
      title:'Adicione o MatchApp Ai ao seu Mac',
      body:(visit===1?'Abra o MatchApp Ai como um app no Mac. ':'Último lembrete: ')+
        'toque aqui para usar a opção Adicionar ao Dock/Apps do navegador.'
    }:{
      title:'Add MatchApp Ai to your Mac',
      body:(visit===1?'Open MatchApp Ai like an app on your Mac. ':'One last reminder: ')+
        'tap here for the browser Add to Dock / app steps.'
    };
  }
  function readVisits(){try{return Math.max(0,Number(localStorage.getItem(VISITS)||0)||0)}catch(_){return 0}}
  function writeVisits(value){try{localStorage.setItem(VISITS,String(value))}catch(_){}}
  function pushWhenReady(item,nextVisit,attempt){
    const api=window.MatchNotifications;
    if(api&&typeof api.pushLocal==='function'){
      if(api.pushLocal(item)!==false)writeVisits(nextVisit);
      completed=true;
      return;
    }
    if(attempt<20)setTimeout(()=>pushWhenReady(item,nextVisit,attempt+1),100);
  }
  async function notify(){
    if(completed||!home()||installed())return;
    const a=apple();
    const device=android()?'android':a.ios?'ios':a.mac?'mac':'';
    if(!device)return;
    if(await relatedInstalled()||installed())return;
    const current=readVisits();
    if(current>=MAX_VISITS)return;
    const visit=current+1;
    const c=copy(device,visit);
    pushWhenReady({
      id:'install-prompt:'+device+':'+visit,
      localKey:'install-prompt-v2-'+device+'-'+visit,
      kind:'install',
      title:c.title,
      body:c.body,
      action:'install',
      href:device==='android'?PLAY:'',
      createdAt:new Date().toISOString(),
      payload:{installPrompt:true,platform:device,visit}
    },visit,0);
  }
  function boot(){
    document.getElementById('ma-install-offer')?.remove();
    document.getElementById('ma-install-chip')?.remove();
    document.getElementById('chrome-install-card')?.remove();
    if(queued||completed||!home()||installed())return;
    queued=true;
    setTimeout(()=>{queued=false;void notify();},DELAY);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('appinstalled',()=>{completed=true;});
  window.addEventListener('matchapp:installstate',()=>{if(installed())completed=true;});
})();
