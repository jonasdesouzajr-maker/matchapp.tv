/* A PWA loads releases from the website. Update applies the new web release;
   it does not claim to install a native App Store package. No push subscription. */
(function () {
  'use strict';
  const SEEN = 'match_release_seen';
  let release = null, checking = false, dismissedVersion = null;
  const buttonState = new WeakMap();
  const strings = {
    en:{update:'Update app',ready:'A new MatchApp update is ready',new:'What’s new in MatchApp',later:'Later',done:'Got it',applying:'Updating…',retry:'Update could not be loaded. Please try again.',fresh:'The latest features are ready.',reload:'This reloads the app. Finish any unsaved changes first.'},
    'pt-BR':{update:'Atualizar app',ready:'Uma atualização do MatchApp está pronta',new:'Novidades no MatchApp',later:'Depois',done:'Entendi',applying:'Atualizando…',retry:'Não foi possível atualizar. Tente novamente.',fresh:'Os novos recursos estão prontos.',reload:'Isso recarrega o app. Conclua alterações não salvas primeiro.'},
    es:{update:'Actualizar app',ready:'Hay una actualización de MatchApp',new:'Novedades de MatchApp',later:'Más tarde',done:'Entendido',applying:'Actualizando…',retry:'No se pudo actualizar. Intenta de nuevo.',fresh:'Las nuevas funciones están listas.',reload:'Se recargará la app. Termina los cambios sin guardar primero.'}
  };
  for(const [locale,values] of Object.entries({"fr":["Mettre l’application à jour","Une mise à jour MatchApp est prête","Nouveautés MatchApp","Plus tard","Compris","Mise à jour…","Impossible de charger la mise à jour. Réessayez.","Les nouveautés sont prêtes.","L’application va se recharger. Enregistrez vos modifications.","✓ Application installée"],"de":["App aktualisieren","Ein MatchApp-Update ist bereit","Neu bei MatchApp","Später","Verstanden","Wird aktualisiert…","Update konnte nicht geladen werden. Bitte erneut versuchen.","Die neuen Funktionen sind bereit.","Die App wird neu geladen. Speichere vorher deine Änderungen.","✓ App installiert"],"it":["Aggiorna app","Un aggiornamento MatchApp è pronto","Novità di MatchApp","Più tardi","Capito","Aggiornamento…","Impossibile caricare l’aggiornamento. Riprova.","Le nuove funzioni sono pronte.","L’app verrà ricaricata. Salva prima le modifiche.","✓ App installata"],"tr":["Uygulamayı güncelle","Yeni MatchApp güncellemesi hazır","MatchApp yenilikleri","Daha sonra","Anladım","Güncelleniyor…","Güncelleme yüklenemedi. Tekrar deneyin.","Yeni özellikler hazır.","Uygulama yeniden açılacak. Önce değişikliklerinizi kaydedin.","✓ Uygulama yüklü"],"ru":["Обновить приложение","Обновление MatchApp готово","Новое в MatchApp","Позже","Понятно","Обновление…","Не удалось загрузить обновление. Попробуйте ещё раз.","Новые функции готовы.","Приложение перезагрузится. Сначала сохраните изменения.","✓ Приложение установлено"],"ar":["تحديث التطبيق","تحديث MatchApp جديد جاهز","الجديد في MatchApp","لاحقًا","حسنًا","جارٍ التحديث…","تعذر تحميل التحديث. حاول مرة أخرى.","الميزات الجديدة جاهزة.","سيتم إعادة تحميل التطبيق. احفظ تغييراتك أولًا.","✓ التطبيق مثبت"],"hi":["ऐप अपडेट करें","MatchApp का नया अपडेट तैयार है","MatchApp में नया क्या है","बाद में","समझ गया","अपडेट हो रहा है…","अपडेट लोड नहीं हुआ। फिर कोशिश करें।","नई सुविधाएँ तैयार हैं।","ऐप फिर लोड होगा। पहले अपने बदलाव सहेजें।","✓ ऐप इंस्टॉल है"],"id":["Perbarui aplikasi","Pembaruan MatchApp baru siap","Yang baru di MatchApp","Nanti","Mengerti","Memperbarui…","Pembaruan gagal dimuat. Coba lagi.","Fitur baru sudah siap.","Aplikasi akan dimuat ulang. Simpan perubahan dahulu.","✓ Aplikasi terpasang"],"ja":["アプリを更新","MatchAppの更新を利用できます","MatchAppの新機能","後で","了解","更新中…","更新を読み込めませんでした。再試行してください。","新機能が利用できます。","アプリを再読み込みします。先に変更を保存してください。","✓ インストール済み"],"ko":["앱 업데이트","MatchApp 업데이트가 준비됐어요","MatchApp 새 소식","나중에","확인","업데이트 중…","업데이트를 불러오지 못했어요. 다시 시도하세요.","새 기능이 준비됐어요.","앱을 다시 불러옵니다. 먼저 변경 내용을 저장하세요.","✓ 앱 설치됨"],"zh":["更新应用","MatchApp新版本已准备好","MatchApp新功能","稍后","知道了","正在更新…","无法加载更新，请重试。","新功能已准备好。","应用将重新加载，请先保存更改。","✓ 应用已安装"]}))strings[locale]=Object.fromEntries(['update','ready','new','later','done','applying','retry','fresh','reload','installed'].map((k,i)=>[k,values[i]]));
  const lang = () => window.MATCH_LANG || document.documentElement.lang || 'en';
  const tr = k => (strings[lang()] || strings.en)[k];
  const stored = () => { try { return localStorage.getItem(SEEN); } catch (_) { return null; } };
  const markSeen = () => { try { localStorage.setItem(SEEN, release.version); } catch (_) {} };
  const installed = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const knownInstalled = () => installed() || !!window.matchAppInstallState?.isInstalled();
  const installedLabel = () => strings[lang()]?.installed || (lang().startsWith('pt') ? '✓ App instalado' : lang().startsWith('es') ? '✓ App instalado' : '✓ App installed');
  const compare = (a,b) => { const x=a.split('.').map(Number),y=b.split('.').map(Number); for(let i=0;i<4;i++)if(x[i]!==y[i])return x[i]-y[i];return 0; };
  function syncButtons() {
    document.querySelectorAll('.install-btn').forEach(button => {
      const pending=!!window.matchAppUpdatePending, isInstalled=knownInstalled();
      if((pending||isInstalled)&&!buttonState.has(button))buttonState.set(button,{html:button.innerHTML,display:button.style.display,aria:button.getAttribute('aria-label')});
      button.classList.toggle('has-app-update',pending);button.classList.toggle('is-app-installed',isInstalled&&!pending);
      if(pending||isInstalled){button.style.display='inline-flex';button.textContent=pending?tr('update'):installedLabel();button.setAttribute('aria-label',pending?tr('ready'):installedLabel());button.title=pending?tr('ready'):installedLabel();}
      else if(buttonState.has(button)){const old=buttonState.get(button);button.innerHTML=old.html;button.style.display=old.display;if(old.aria)button.setAttribute('aria-label',old.aria);else button.removeAttribute('aria-label');button.removeAttribute('title');buttonState.delete(button);}
    });
  }
  window.syncMatchAppUpdateButtons=syncButtons;
  function notice(pending) {
    let panel = document.getElementById('app-release-notice');
    if (!panel) {
      panel = document.createElement('aside'); panel.id = 'app-release-notice'; panel.setAttribute('aria-labelledby','app-release-heading'); panel.className = 'app-release-notice';
      panel.innerHTML = '<h2 id="app-release-heading" role="status" aria-live="polite"></h2><p class="app-release-notes"></p><p class="app-release-hint"></p><div><button type="button" class="app-release-apply"></button><button type="button" class="app-release-dismiss"></button></div>';
      document.body.append(panel);
    }
    panel.hidden = false;
    panel.querySelector('h2').textContent = tr(pending ? 'ready' : 'new');
    panel.querySelector('.app-release-notes').textContent = release.notes[lang()] || release.notes.en;
    panel.querySelector('.app-release-hint').textContent = tr(pending ? 'reload' : 'fresh');
    const apply = panel.querySelector('.app-release-apply'); apply.hidden = !pending; apply.textContent = tr('update'); apply.onclick = window.updateMatchApp;
    const dismiss = panel.querySelector('.app-release-dismiss'); dismiss.textContent = tr(pending ? 'later' : 'done'); dismiss.onclick = () => { panel.hidden = true; dismissedVersion = release.version; if (!pending) markSeen(); };
  }
  window.checkMatchAppRelease = async function () {
    if (checking || document.hidden || !window.MATCHAPP_BUILD) return;
    checking = true;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(),8000);
    try {
      const response = await fetch('/release.json', {cache:'no-store',signal:controller.signal}); if (!response.ok) return;
      const next = await response.json();
      if (!/^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(next.version || '') || !next.notes?.en || typeof next.functional !== 'boolean') return;
      // Never roll backwards if a deployment is still propagating.
      if (compare(next.version,window.MATCHAPP_BUILD) < 0) return;
      if (release && compare(next.version,release.version) < 0) return;
      release = next;
      let lastInstalled=window.matchAppInstallState?.installedBuild();
      let request;try{request=JSON.parse(localStorage.getItem('match_app_update_requested')||'null');}catch(_){}
      const requested=new URLSearchParams(location.search).get('appUpdate');
      if(installed()&&document.readyState==='complete'&&requested===release.version&&request?.version===requested&&
        request.at<=Date.now()&&Date.now()-request.at<600000&&window.MATCHAPP_BUILD===requested&&!(window.MATCHAPP_ASSET_ERRORS?.length)){
        if(window.matchAppInstallState?.confirmUpdate(requested)){lastInstalled=requested;markSeen();}
      }
      const baseline=knownInstalled()&&/^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(lastInstalled||'')?lastInstalled:window.MATCHAPP_BUILD;
      const pending = compare(release.version,baseline) > 0;
      window.matchAppUpdatePending = pending ? release : null;
      syncButtons();
      if(knownInstalled()&&typeof navigator.setAppBadge==='function'&&pending)try{await navigator.setAppBadge();}catch(_){}
      if(installed()&&!pending&&typeof navigator.clearAppBadge==='function')try{await navigator.clearAppBadge();}catch(_){}
      if (release.functional && dismissedVersion !== release.version && stored() !== release.version && (knownInstalled() || pending)) notice(pending);
    } catch (_) { /* offline: keep the current release and all sign-in methods usable */ }
    finally { clearTimeout(timer); checking = false; }
  };
  window.updateMatchApp = async function () {
    if (!window.matchAppUpdatePending) return;
    const buttons = [...document.querySelectorAll('.install-btn,.app-release-apply')]; buttons.forEach(b => {b.disabled=true;b.textContent=tr('applying');});
    try {
      // Verify that the HTML and release are reachable before replacing the view.
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(),12000);
      let response;
      try { response = await fetch(location.pathname || '/', {cache:'reload',signal:controller.signal}); }
      finally { clearTimeout(timer); }
      if (!response.ok) throw new Error('Release unavailable');
      const buildTimer=setTimeout(()=>controller.abort(),12000);let buildResponse;
      try{buildResponse=await fetch('/build-meta.js?appUpdate='+encodeURIComponent(release.version),{cache:'no-store',signal:controller.signal});}finally{clearTimeout(buildTimer);}
      const build=buildResponse.ok?(await buildResponse.text()).match(/MATCHAPP_BUILD\s*=\s*['"]([^'"]+)['"]/)?.[1]:null;
      if(!build||!/^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(build)||compare(build,release.version)<0)throw new Error('Release still deploying');
      if ('serviceWorker' in navigator) { try { const reg = await navigator.serviceWorker.getRegistration(); if(reg) await reg.update(); } catch (_) {} }
      // Other open installed windows can apply the same explicit update request.
      // Never mark a browser-tab reload as proof that the installed app updated.
      try{localStorage.setItem('match_app_update_requested',JSON.stringify({version:release.version,at:Date.now()}));}catch(_){}
      const url = new URL(location.href); url.searchParams.set('appUpdate', release.version); location.replace(url.href);
    } catch (_) {
      const hint = document.querySelector('.app-release-hint'); if (hint) hint.textContent = tr('retry');
      buttons.forEach(b => {b.disabled=false;b.textContent=tr('update');});
    }
  };
  function boot() {
    window.checkMatchAppRelease();
    // One fetch every fifteen minutes while visible; immediate check on resume.
    setInterval(window.checkMatchAppRelease,15*60*1000);
    window.addEventListener('online',window.checkMatchAppRelease);
    window.addEventListener('load',window.checkMatchAppRelease);
    window.addEventListener('appinstalled', () => { if(release) markSeen(); });
    window.addEventListener('matchapp:installstate',()=>{syncButtons();window.checkMatchAppRelease();});
    window.addEventListener('storage',async event=>{if(event.key!=='match_app_update_requested'||!installed())return;let request;try{request=JSON.parse(event.newValue);}catch(_){return;}if(!request||Date.now()-request.at>60000||request.at>Date.now()+5000)return;await window.checkMatchAppRelease();if(window.matchAppUpdatePending?.version===request.version)window.updateMatchApp();});
    document.addEventListener('visibilitychange', () => {if(!document.hidden)window.checkMatchAppRelease();});
    document.addEventListener('matchapp:langchange', () => {syncButtons();if(release && document.getElementById('app-release-notice')?.hidden===false)notice(!!window.matchAppUpdatePending);});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot);else boot();
})();
