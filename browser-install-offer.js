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
  const DESKTOP_PLAY_COPY={
  "en": [
    "Get MatchApp Ai on Google Play",
    "Use MatchApp Ai on your Android phone or tablet. Open the official Google Play listing to download the app."
  ],
  "pt-BR": [
    "Baixe o MatchApp Ai no Google Play",
    "Use o MatchApp Ai no seu celular ou tablet Android. Abra a página oficial no Google Play para baixar o app."
  ],
  "es": [
    "Descarga MatchApp Ai en Google Play",
    "Usa MatchApp Ai en tu teléfono o tableta Android. Abre la página oficial de Google Play para descargar la app."
  ],
  "fr": [
    "Téléchargez MatchApp Ai sur Google Play",
    "Utilisez MatchApp Ai sur votre téléphone ou tablette Android. Ouvrez la fiche officielle Google Play pour télécharger l’application."
  ],
  "de": [
    "MatchApp Ai bei Google Play herunterladen",
    "Nutze MatchApp Ai auf deinem Android-Smartphone oder -Tablet. Öffne den offiziellen Google-Play-Eintrag, um die App herunterzuladen."
  ],
  "it": [
    "Scarica MatchApp Ai da Google Play",
    "Usa MatchApp Ai sul tuo telefono o tablet Android. Apri la pagina ufficiale di Google Play per scaricare l’app."
  ],
  "tr": [
    "MatchApp Ai uygulamasını Google Play’den indirin",
    "MatchApp Ai uygulamasını Android telefonunuzda veya tabletinizde kullanın. İndirmek için resmi Google Play sayfasını açın."
  ],
  "ru": [
    "Скачайте MatchApp Ai в Google Play",
    "Пользуйтесь MatchApp Ai на телефоне или планшете Android. Откройте официальную страницу Google Play, чтобы скачать приложение."
  ],
  "ar": [
    "نزّل MatchApp Ai من Google Play",
    "استخدم MatchApp Ai على هاتفك أو جهازك اللوحي بنظام Android. افتح الصفحة الرسمية على Google Play لتنزيل التطبيق."
  ],
  "hi": [
    "Google Play से MatchApp Ai डाउनलोड करें",
    "अपने Android फ़ोन या टैबलेट पर MatchApp Ai इस्तेमाल करें। ऐप डाउनलोड करने के लिए Google Play की आधिकारिक सूची खोलें।"
  ],
  "id": [
    "Unduh MatchApp Ai di Google Play",
    "Gunakan MatchApp Ai di ponsel atau tablet Android Anda. Buka halaman resmi Google Play untuk mengunduh aplikasi."
  ],
  "ja": [
    "Google Play で MatchApp Ai をダウンロード",
    "Android スマートフォンやタブレットで MatchApp Ai を使えます。Google Play の公式ページを開いてアプリをダウンロードしてください。"
  ],
  "ko": [
    "Google Play에서 MatchApp Ai 다운로드",
    "Android 휴대전화나 태블릿에서 MatchApp Ai를 사용하세요. Google Play 공식 페이지를 열어 앱을 다운로드하세요."
  ],
  "zh": [
    "从 Google Play 下载 MatchApp Ai",
    "在 Android 手机或平板电脑上使用 MatchApp Ai。打开 Google Play 官方页面下载应用。"
  ]
};
  function desktopPlayCopy(){
    const raw=String(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en').toLowerCase().replace(/_/g,'-');
    const lang=raw.startsWith('pt')?'pt-BR':raw.split('-')[0];
    const text=DESKTOP_PLAY_COPY[lang]||DESKTOP_PLAY_COPY.en;
    return {title:text[0],body:text[1]};
  }
  function copy(kind,visit){
    if(kind==='desktop')return desktopPlayCopy();
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
    const device=android()?'android':a.ios?'ios':a.mac?'mac':'desktop';
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
      action:device==='desktop'?'open':'install',
      href:device==='android'||device==='desktop'?PLAY:'',
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
