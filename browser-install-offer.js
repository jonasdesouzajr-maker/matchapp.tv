/* Adult browser install discovery. Apple/desktop remain notification-bell only.
   Android gets a dismissible Play bubble per tab session, then at most two
   reminders, five and twenty minutes after dismissal. */
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
  const CLOSE={en:'Close', 'pt-BR':'Fechar',es:'Cerrar',fr:'Fermer',de:'Schließen',it:'Chiudi',tr:'Kapat',ru:'Закрыть',ar:'إغلاق',hi:'बंद करें',id:'Tutup',ja:'閉じる',ko:'닫기',zh:'关闭'};
  const SESSION='matchapp_play_bubble_session_v1';
  let bubble=null,bubbleTimer=null,bubbleStarted=false;
  let session={count:0,next:0,stopped:false};
  try{const saved=JSON.parse(sessionStorage.getItem(SESSION));if(saved&&Number.isInteger(saved.count)&&saved.count>=0&&saved.count<=3&&Number.isFinite(saved.next))session={count:saved.count,next:saved.next,stopped:saved.stopped===true};}catch(_){}
  function persist(){try{sessionStorage.setItem(SESSION,JSON.stringify(session));}catch(_){} }
  function busy(){
    return document.visibilityState==='hidden'||window.innerHeight<420||
      [...document.querySelectorAll('dialog[open],[role="dialog"]:not([hidden])')].some(node=>{
        for(let current=node;current;current=current.parentElement){const style=getComputedStyle(current);if(current.hidden||style.display==='none'||style.visibility==='hidden')return false;}
        return true;
      })||
      !!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
  }
  function bubbleCopy(){
    if(!bubble)return;
    const raw=String(window.MATCH_LANG||document.documentElement.lang||'en').toLowerCase();
    const lang=raw.startsWith('pt')?'pt-BR':raw.split('-')[0],c=desktopPlayCopy();
    bubble.lang=lang;bubble.dir=lang==='ar'?'rtl':'ltr';
    bubble.querySelector('strong').textContent=c.title;
    bubble.querySelector('p').textContent=c.body;
    bubble.querySelector('button').setAttribute('aria-label',CLOSE[lang]||CLOSE.en);
    bubble.querySelector('a').setAttribute('aria-label',c.title);
    if(bubble.isConnected&&!fitBubble(bubble))dismissBubble();
  }
  function fitBubble(box){
    // Measure the actual chrome, including translated/user-scaled headers.
    // Keep both actions visible; a short invitation may omit its helper copy.
    if(!box.getBoundingClientRect().height)return true;
    const headerBottom=Math.max(0,...[...document.querySelectorAll('.app-header,#ma-reference-header')]
      .map(node=>node.getBoundingClientRect()).filter(r=>r.height>0).map(r=>r.bottom));
    const dockTop=Math.min(innerHeight,...[...document.querySelectorAll('.ma-cinema-dock,.ma-reference-dock')]
      .map(node=>node.getBoundingClientRect()).filter(r=>r.height>0&&r.top>=0).map(r=>r.top));
    const available=Math.floor(dockTop-headerBottom-16),body=box.querySelector('p');
    box.style.bottom=Math.max(18,innerHeight-dockTop+8)+'px';
    box.style.maxHeight=Math.max(0,available)+'px';
    body.hidden=false;body.style.removeProperty('display');
    if(box.scrollHeight>box.clientHeight+1){body.hidden=true;body.style.setProperty('display','none','important');}
    const r=box.getBoundingClientRect();
    return available>0&&box.scrollHeight<=box.clientHeight+1&&r.top>=headerBottom+8&&
      r.bottom<=dockTop-8+.5&&r.left>=0&&r.right<=innerWidth;
  }
  function bubbleTargetsReachable(box){
    if(typeof document.elementFromPoint!=='function')return true;
    return [...box.querySelectorAll('button,a')].every(control=>{
      const r=control.getBoundingClientRect();
      return r.width>=44&&r.height>=44&&control.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));
    });
  }
  function dismissBubble(stop=false){
    if(!bubble)return;
    const close=bubble.querySelector('button'),restore=document.activeElement===close;
    bubble.remove();bubble=null;
    session.stopped=stop||session.count>=3;
    session.next=Date.now()+(session.count===1?5:20)*60*1000;
    persist();
    if(restore)document.querySelector('.app-header a[href="/"]')?.focus({preventScroll:true});
    scheduleBubble();
  }
  function scheduleBubble(){
    clearTimeout(bubbleTimer);
    if(session.stopped||session.count>=3||installed())return;
    bubbleTimer=setTimeout(showBubble,Math.max(0,session.next-Date.now()));
  }
  function showBubble(){
    if(bubble||session.stopped||session.count>=3||!home()||installed())return;
    if(busy()){bubbleTimer=setTimeout(showBubble,15000);return;}
    const box=document.createElement('aside');box.id='ma-install-offer';box.setAttribute('role','region');
    box.style.maxHeight='calc(100dvh - 110px - env(safe-area-inset-bottom,0px))';
    box.setAttribute('aria-labelledby','ma-play-invitation-title');
    const head=document.createElement('div');head.className='ma-offer-head';head.style.paddingRight='0';head.style.paddingInlineEnd='44px';
    const copy=document.createElement('div'),title=document.createElement('strong'),body=document.createElement('p');
    title.id='ma-play-invitation-title';title.className='ma-offer-title';body.className='ma-offer-description';
    copy.append(title,body);head.append(copy);
    const close=document.createElement('button');close.type='button';close.className='ma-offer-close';close.textContent='×';close.style.minWidth=close.style.minHeight='44px';
    close.addEventListener('click',()=>dismissBubble());
    const actions=document.createElement('div');actions.className='ma-offer-actions';actions.style.gridTemplateColumns='1fr';
    const link=document.createElement('a');link.className='ma-offer-play';link.href=PLAY;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Google Play ↗';
    link.addEventListener('click',()=>dismissBubble(true));actions.append(link);box.append(head,close,actions);
    bubble=box;bubbleCopy();box.style.visibility='hidden';document.body.append(box);
    if(!fitBubble(box)){box.remove();bubble=null;bubbleTimer=setTimeout(showBubble,15000);return;}
    box.style.removeProperty('visibility');
    if(!bubbleTargetsReachable(box)){box.remove();bubble=null;bubbleTimer=setTimeout(showBubble,15000);return;}
    session.count++;session.next=0;persist();
  }
  function startAndroidBubble(){
    if(bubbleStarted)return;bubbleStarted=true;scheduleBubble();
    document.addEventListener('matchapp:langchange',bubbleCopy);
    document.addEventListener('focusin',()=>{if(bubble&&busy())dismissBubble();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&bubble&&!busy())dismissBubble();});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!bubble)scheduleBubble();});
    window.addEventListener('resize',()=>{if(bubble&&(busy()||!fitBubble(bubble)))dismissBubble();else if(!bubble)scheduleBubble();});
    document.fonts?.addEventListener?.('loadingdone',()=>{if(bubble&&!fitBubble(bubble))dismissBubble();});
    new MutationObserver(records=>{
      if(!bubble?.isConnected)return;
      const outside=records.some(record=>record.target!==bubble&&!bubble.contains(record.target));
      if(installed()||busy()||(outside&&!fitBubble(bubble)))dismissBubble(installed());
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden','aria-expanded','style','class']});
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
    if(device==='android'){startAndroidBubble();return;}
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
  window.addEventListener('appinstalled',()=>{completed=true;session.stopped=true;clearTimeout(bubbleTimer);dismissBubble(true);persist();});
  window.addEventListener('matchapp:installstate',()=>{if(installed()){completed=true;clearTimeout(bubbleTimer);dismissBubble(true);}});
})();
