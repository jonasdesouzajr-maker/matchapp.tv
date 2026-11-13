/* MatchApp Ai Android premium shell — presentation/navigation only.
 * Reuses existing routes, auth, profile, Taste DNA, Jonas and AdMob mechanisms.
 */
(function(){
  'use strict';
  if(window.top!==window||window.__maAndroidPremiumShell||!/MatchAppAiAndroid\//.test(navigator.userAgent)||/^\/(kids|oauth|private-voice|lumina-match|reelforge)(\/|$)/.test(location.pathname))return;
  window.__maAndroidPremiumShell=true;
  const LOGO=window.__MATCHAPP_ANDROID_LOGO||'';
  const HOME='/';
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const lang=()=>String(window.MATCH_LANG||localStorage.getItem('match_lang')||navigator.language||document.documentElement.lang||'en').toLowerCase();
  const copy={
    en:{title:'Finish your MatchApp Ai setup',sub:'A few details make your matches much more personal.',profile:'Profile',dna:'Taste DNA',close:'Close',prev:'Back',next:'Next',question:'Question',of:'of',save:'Save DNA',signedOut:'Your account session is not ready yet. Return to MatchApp Ai and sign in again.',done:'Your MatchApp Ai is ready',doneSub:'Your profile and Taste DNA are connected to your account.',enter:'Enter MatchApp Ai',nudge:'Complete profile & Taste DNA'},
    'pt-br':{title:'Finalize seu MatchApp Ai',sub:'Alguns detalhes deixam seus matches muito mais pessoais.',profile:'Perfil',dna:'DNA de preferências',close:'Fechar',prev:'Voltar',next:'Próxima',question:'Pergunta',of:'de',save:'Salvar DNA',signedOut:'Sua sessão ainda não está pronta. Volte ao MatchApp Ai e entre novamente.',done:'Seu MatchApp Ai está pronto',doneSub:'Seu perfil e DNA de preferências estão conectados à sua conta.',enter:'Entrar no MatchApp Ai',nudge:'Completar perfil e DNA'},
    es:{title:'Termina de configurar MatchApp Ai',sub:'Unos pocos datos hacen que tus matches sean mucho más personales.',profile:'Perfil',dna:'ADN de gustos',close:'Cerrar',prev:'Atrás',next:'Siguiente',question:'Pregunta',of:'de',save:'Guardar ADN',signedOut:'La sesión de tu cuenta aún no está lista. Vuelve a MatchApp Ai e inicia sesión otra vez.',done:'Tu MatchApp Ai está listo',doneSub:'Tu perfil y ADN de gustos están conectados a tu cuenta.',enter:'Entrar en MatchApp Ai',nudge:'Completar perfil y ADN'},
    fr:{title:'Terminez la configuration de MatchApp Ai',sub:'Quelques détails rendent vos matchs beaucoup plus personnels.',profile:'Profil',dna:'ADN des goûts',close:'Fermer',prev:'Retour',next:'Suivant',question:'Question',of:'sur',save:'Enregistrer l’ADN',signedOut:'Votre session de compte n’est pas encore prête. Revenez à MatchApp Ai et reconnectez-vous.',done:'Votre MatchApp Ai est prêt',doneSub:'Votre profil et votre ADN des goûts sont liés à votre compte.',enter:'Entrer dans MatchApp Ai',nudge:'Compléter profil et ADN'},
    de:{title:'MatchApp Ai einrichten',sub:'Ein paar Angaben machen deine Matches deutlich persönlicher.',profile:'Profil',dna:'Geschmacks-DNA',close:'Schließen',prev:'Zurück',next:'Weiter',question:'Frage',of:'von',save:'DNA speichern',signedOut:'Deine Kontositzung ist noch nicht bereit. Kehre zu MatchApp Ai zurück und melde dich erneut an.',done:'Dein MatchApp Ai ist bereit',doneSub:'Profil und Geschmacks-DNA sind mit deinem Konto verbunden.',enter:'MatchApp Ai öffnen',nudge:'Profil & DNA vervollständigen'},
    it:{title:'Completa MatchApp Ai',sub:'Pochi dettagli rendono i tuoi match molto più personali.',profile:'Profilo',dna:'DNA dei gusti',close:'Chiudi',prev:'Indietro',next:'Avanti',question:'Domanda',of:'di',save:'Salva DNA',signedOut:'La sessione del tuo account non è ancora pronta. Torna a MatchApp Ai e accedi di nuovo.',done:'MatchApp Ai è pronto',doneSub:'Profilo e DNA dei gusti sono collegati al tuo account.',enter:'Entra in MatchApp Ai',nudge:'Completa profilo e DNA'},
    tr:{title:"MatchApp Ai kurulumunu tamamla",sub:'Birkaç ayrıntı eşleşmelerini çok daha kişisel yapar.',profile:'Profil',dna:'Zevk DNA',close:'Kapat',prev:'Geri',next:'İleri',question:'Soru',of:'/',save:'DNA’yı kaydet',signedOut:'Hesap oturumun henüz hazır değil. MatchApp Ai’ye dönüp tekrar giriş yap.',done:'MatchApp Ai hazır',doneSub:'Profilin ve Zevk DNA hesabına bağlandı.',enter:"MatchApp Ai'ye gir",nudge:'Profil ve DNA tamamla'},
    ru:{title:'Завершите настройку MatchApp Ai',sub:'Несколько деталей сделают рекомендации гораздо точнее.',profile:'Профиль',dna:'ДНК вкуса',close:'Закрыть',prev:'Назад',next:'Далее',question:'Вопрос',of:'из',save:'Сохранить ДНК',signedOut:'Сеанс аккаунта ещё не готов. Вернитесь в MatchApp Ai и войдите снова.',done:'MatchApp Ai готов',doneSub:'Профиль и ДНК вкуса связаны с аккаунтом.',enter:'Открыть MatchApp Ai',nudge:'Заполнить профиль и ДНК'},
    ar:{title:'أكمل إعداد MatchApp Ai',sub:'بعض التفاصيل تجعل المطابقات أكثر تخصيصًا.',profile:'الملف الشخصي',dna:'بصمة الذوق',close:'إغلاق',prev:'السابق',next:'التالي',question:'سؤال',of:'من',save:'حفظ البصمة',signedOut:'جلسة حسابك غير جاهزة بعد. ارجع إلى MatchApp Ai وسجّل الدخول مرة أخرى.',done:'MatchApp Ai جاهز',doneSub:'تم ربط ملفك وبصمة ذوقك بحسابك.',enter:'الدخول إلى MatchApp Ai',nudge:'إكمال الملف وبصمة الذوق'},
    hi:{title:'MatchApp Ai सेटअप पूरा करें',sub:'कुछ विवरण आपके मैच को अधिक व्यक्तिगत बनाते हैं।',profile:'प्रोफ़ाइल',dna:'पसंद DNA',close:'बंद करें',prev:'पीछे',next:'अगला',question:'प्रश्न',of:'में से',save:'DNA सेव करें',signedOut:'आपका खाता सत्र अभी तैयार नहीं है। MatchApp Ai पर लौटकर फिर से साइन इन करें।',done:'MatchApp Ai तैयार है',doneSub:'आपकी प्रोफ़ाइल और पसंद DNA खाते से जुड़ गए हैं।',enter:'MatchApp Ai खोलें',nudge:'प्रोफ़ाइल और DNA पूरा करें'},
    id:{title:'Selesaikan pengaturan MatchApp Ai',sub:'Beberapa detail membuat match jauh lebih personal.',profile:'Profil',dna:'DNA selera',close:'Tutup',prev:'Kembali',next:'Berikutnya',question:'Pertanyaan',of:'dari',save:'Simpan DNA',signedOut:'Sesi akunmu belum siap. Kembali ke MatchApp Ai dan masuk lagi.',done:'MatchApp Ai siap',doneSub:'Profil dan DNA selera sudah terhubung ke akun.',enter:'Masuk ke MatchApp Ai',nudge:'Lengkapi profil & DNA'},
    ja:{title:'MatchApp Ai の設定を完了',sub:'少しの情報でマッチがよりあなた向けになります。',profile:'プロフィール',dna:'好みDNA',close:'閉じる',prev:'戻る',next:'次へ',question:'質問',of:'/',save:'DNAを保存',signedOut:'アカウントのセッションがまだ準備できていません。MatchApp Ai に戻って再度ログインしてください。',done:'MatchApp Ai の準備完了',doneSub:'プロフィールと好みDNAがアカウントに保存されました。',enter:'MatchApp Aiへ',nudge:'プロフィールとDNAを完成'},
    ko:{title:'MatchApp Ai 설정 마무리',sub:'몇 가지 정보로 추천을 더 개인화할 수 있어요.',profile:'프로필',dna:'취향 DNA',close:'닫기',prev:'이전',next:'다음',question:'질문',of:'/',save:'DNA 저장',signedOut:'계정 세션이 아직 준비되지 않았습니다. MatchApp Ai로 돌아가 다시 로그인하세요.',done:'MatchApp Ai 준비 완료',doneSub:'프로필과 취향 DNA가 계정에 연결되었습니다.',enter:'MatchApp Ai 열기',nudge:'프로필 & DNA 완료'},
    zh:{title:'完成 MatchApp Ai 设置',sub:'补充少量信息，让匹配更懂你。',profile:'个人资料',dna:'偏好 DNA',close:'关闭',prev:'返回',next:'下一步',question:'问题',of:'/',save:'保存 DNA',signedOut:'账号会话尚未准备好。请返回 MatchApp Ai 并重新登录。',done:'MatchApp Ai 已准备好',doneSub:'个人资料和偏好 DNA 已连接到账号。',enter:'进入 MatchApp Ai',nudge:'完善资料与 DNA'}
  };
  function t(){const l=lang();return copy[l]||copy[l.split('-')[0]]||copy.en}
  const androidChromeCopy={
    en:{titles:'Top Titles',all:'View all',more:'Explore more',matchTitle:'Find Your Perfect Match',controls:'App controls',quick:'Quick choices',help:'How to use'},
    pt:{titles:'Principais títulos',all:'Ver todos',more:'Explore mais',matchTitle:'Encontre seu match perfeito',controls:'Controles do app',quick:'Escolhas rápidas',help:'Como usar'},
    es:{titles:'Títulos destacados',all:'Ver todos',more:'Explora más',matchTitle:'Encuentra tu match perfecto',controls:'Controles de la app',quick:'Opciones rápidas',help:'Cómo usar'},
    fr:{titles:'Titres à la une',all:'Tout voir',more:'Explorer plus',matchTitle:'Trouvez votre match idéal',controls:'Commandes de l’app',quick:'Choix rapides',help:'Mode d’emploi'},
    de:{titles:'Top-Titel',all:'Alle ansehen',more:'Mehr entdecken',matchTitle:'Finde deinen perfekten Match',controls:'App-Steuerung',quick:'Schnellauswahl',help:'So funktioniert’s'},
    it:{titles:'Titoli in evidenza',all:'Vedi tutti',more:'Esplora di più',matchTitle:'Trova il tuo match perfetto',controls:'Controlli dell’app',quick:'Scelte rapide',help:'Come si usa'},
    tr:{titles:'Öne çıkanlar',all:'Tümünü gör',more:'Daha fazlasını keşfet',matchTitle:'Mükemmel eşleşmeni bul',controls:'Uygulama kontrolleri',quick:'Hızlı seçimler',help:'Nasıl kullanılır'},
    ru:{titles:'Лучшие произведения',all:'Смотреть все',more:'Откройте больше',matchTitle:'Найдите идеальный вариант',controls:'Управление приложением',quick:'Быстрый выбор',help:'Как пользоваться'},
    ar:{titles:'أبرز الأعمال',all:'عرض الكل',more:'اكتشف المزيد',matchTitle:'اعثر على اختيارك المثالي',controls:'أدوات التطبيق',quick:'خيارات سريعة',help:'طريقة الاستخدام'},
    hi:{titles:'प्रमुख शीर्षक',all:'सभी देखें',more:'और खोजें',matchTitle:'अपना बेहतरीन मैच खोजें',controls:'ऐप नियंत्रण',quick:'त्वरित विकल्प',help:'कैसे इस्तेमाल करें'},
    id:{titles:'Judul unggulan',all:'Lihat semua',more:'Jelajahi lainnya',matchTitle:'Temukan pilihan sempurnamu',controls:'Kontrol aplikasi',quick:'Pilihan cepat',help:'Cara menggunakan'},
    ja:{titles:'注目の作品',all:'すべて見る',more:'もっと見る',matchTitle:'ぴったりの作品を見つけよう',controls:'アプリの操作',quick:'クイック選択',help:'使い方'},
    ko:{titles:'인기 작품',all:'모두 보기',more:'더 둘러보기',matchTitle:'나에게 딱 맞는 작품 찾기',controls:'앱 설정',quick:'빠른 선택',help:'사용 방법'},
    zh:{titles:'热门作品',all:'查看全部',more:'探索更多',matchTitle:'找到你的完美之选',controls:'应用控制',quick:'快捷选择',help:'使用方法'}
  };
  const matchOverlayCopy={
    en:{sub:'Open Match in a fast, focused experience without leaving this screen.',cta:'Find something to watch',modal:'Your Match'},
    pt:{sub:'Abra o Match em uma experiência rápida e focada sem sair desta tela.',cta:'Encontrar algo para assistir',modal:'Seu Match'},
    es:{sub:'Abre Match en una experiencia rápida y enfocada sin salir de esta pantalla.',cta:'Encontrar algo para ver',modal:'Tu Match'},
    fr:{sub:'Ouvrez Match dans une expérience rapide et ciblée sans quitter cet écran.',cta:'Trouver quelque chose à regarder',modal:'Votre Match'},
    de:{sub:'Öffne Match schnell und fokussiert, ohne diesen Bildschirm zu verlassen.',cta:'Etwas zum Anschauen finden',modal:'Dein Match'},
    it:{sub:'Apri Match in un’esperienza rapida e mirata senza lasciare questa schermata.',cta:'Trova qualcosa da guardare',modal:'Il tuo Match'},
    tr:{sub:'Bu ekrandan ayrılmadan Match’i hızlı ve odaklı bir deneyimde aç.',cta:'İzleyecek bir şey bul',modal:'Eşleşmen'},
    ru:{sub:'Откройте Match в быстром и удобном режиме, не покидая этот экран.',cta:'Найти, что посмотреть',modal:'Ваш выбор'},
    ar:{sub:'افتح Match في تجربة سريعة ومركزة من دون مغادرة هذه الشاشة.',cta:'اعثر على شيء لمشاهدته',modal:'اختيارك'},
    hi:{sub:'इस स्क्रीन से बाहर जाए बिना तेज़ और केंद्रित Match अनुभव खोलें।',cta:'देखने के लिए कुछ खोजें',modal:'आपका Match'},
    id:{sub:'Buka Match dalam pengalaman cepat dan fokus tanpa meninggalkan layar ini.',cta:'Cari tontonan',modal:'Match kamu'},
    ja:{sub:'この画面を離れずに、すばやく集中できる Match を開きます。',cta:'観るものを探す',modal:'あなたの Match'},
    ko:{sub:'이 화면을 떠나지 않고 빠르고 집중된 Match를 열어보세요.',cta:'볼거리 찾기',modal:'나의 Match'},
    zh:{sub:'无需离开当前页面，即可快速进入专注的 Match 体验。',cta:'寻找想看的内容',modal:'你的 Match'}
  };
  function overlayCopy(){const l=lang();return matchOverlayCopy[l]||matchOverlayCopy[l.split('-')[0]]||matchOverlayCopy.en}
  const studioCopy={
    en:['More from ADV_DEV_OPS','Coming soon to Google Play','Explore our games'],
    pt:['Mais de ADV_DEV_OPS','Em breve no Google Play','Conheça nossos jogos'],
    es:['Más de ADV_DEV_OPS','Próximamente en Google Play','Descubre nuestros juegos'],
    fr:['Aussi par ADV_DEV_OPS','Bientôt sur Google Play','Découvrez nos jeux'],
    de:['Mehr von ADV_DEV_OPS','Demnächst bei Google Play','Entdecke unsere Spiele'],
    it:['Altro da ADV_DEV_OPS','Presto su Google Play','Scopri i nostri giochi'],
    tr:['ADV_DEV_OPS oyunları','Yakında Google Play’de','Oyunlarımızı keşfet'],
    ru:['Ещё от ADV_DEV_OPS','Скоро в Google Play','Откройте наши игры'],
    ar:['المزيد من ADV_DEV_OPS','قريبًا على Google Play','اكتشف ألعابنا'],
    hi:['ADV_DEV_OPS की और पेशकश','जल्द Google Play पर','हमारे गेम खोजें'],
    id:['Lainnya dari ADV_DEV_OPS','Segera di Google Play','Jelajahi game kami'],
    ja:['ADV_DEV_OPS のゲーム','Google Play で近日公開','ゲームをチェック'],
    ko:['ADV_DEV_OPS의 다른 앱','Google Play에서 곧 출시','게임 살펴보기'],
    zh:['ADV_DEV_OPS 的更多作品','即将登陆 Google Play','探索我们的游戏'],
    'zh-tw':['ADV_DEV_OPS 的更多作品','即將登陸 Google Play','探索我們的遊戲']
  };
  function mountStudioGames(){
    if(!document.body.classList.contains('page-home'))return;
    const footer=qs('.seo-footer');if(!footer)return;
    const c=studioCopy[lang()]||studioCopy[lang().split('-')[0]]||studioCopy.en;
    let section=qs('#ma-android-studio-games');
    if(!section){
      section=document.createElement('section');section.id='ma-android-studio-games';
      section.setAttribute('aria-labelledby','ma-studio-title');
      section.innerHTML='<h2 id="ma-studio-title"></h2><div class="ma-studio-grid"><a href="/founder/#lumina-title"><img src="/reelforge/email/lumina_icon.jpg" alt="" width="64" height="64" loading="lazy" decoding="async"><span><strong translate="no">Lumina Match</strong><small></small></span></a><a href="/founder/#reelforge-title"><img src="/reelforge/email/reelforge_icon.jpg" alt="" width="64" height="64" loading="lazy" decoding="async"><span><strong translate="no">ReelForge: Cinema Clash</strong><small></small></span></a></div><a class="ma-studio-more" href="/founder/"></a>';
      footer.before(section);
    }
    const put=(node,value)=>{if(node.textContent!==value)node.textContent=value};
    put(qs('h2',section),c[0]);qsa('small',section).forEach(node=>put(node,c[1]));put(qs('.ma-studio-more',section),c[2]);
  }
  function paintAndroidChrome(){
    const l=lang(),c=androidChromeCopy[l]||androidChromeCopy[l.split('-')[0]]||androidChromeCopy.en;
    qsa('[data-cinema-copy]').forEach(node=>{
      const key=node.dataset.cinemaCopy,value=c[key];if(!value)return;
      if(node.dataset.cinemaIconOnly==='true'){
        if(node.getAttribute('aria-label')!==value)node.setAttribute('aria-label',value);
        if(node.title!==value)node.title=value;
      }else if(node.textContent!==value)node.textContent=value;
    });
  }
  const appearanceCopy={
    en:['Appearance','Dark','Light'],pt:['Aparência','Escuro','Claro'],es:['Apariencia','Oscuro','Claro'],
    fr:['Apparence','Sombre','Clair'],de:['Darstellung','Dunkel','Hell'],it:['Aspetto','Scuro','Chiaro'],
    tr:['Görünüm','Koyu','Açık'],ru:['Оформление','Тёмное','Светлое'],ar:['المظهر','داكن','فاتح'],
    hi:['दिखावट','गहरा','हल्का'],id:['Tampilan','Gelap','Terang'],ja:['外観','ダーク','ライト'],
    ko:['화면 모드','다크','라이트'],zh:['外观','深色','浅色'],'zh-tw':['外觀','深色','淺色']
  };
  function saveAppearance(theme){
    if(!['aurora','sunrise'].includes(theme))return;
    if(window.MatchSettings){window.MatchSettings.set('theme',theme);return}
    // Lightweight editorial pages share the saved palette without loading the
    // Home settings controller. Preserve every other preference in its record.
    try{
      const saved=JSON.parse(localStorage.getItem('match_settings')||'{}');
      localStorage.setItem('match_settings',JSON.stringify({...saved,theme}));
      document.documentElement.dataset.theme=theme;
      document.dispatchEvent(new CustomEvent('matchapp:settingschanged',{detail:{key:'theme',value:theme}}));
    }catch(_){}
  }
  function mountAppearance(){
    const locale=lang(),c=appearanceCopy[locale]||appearanceCopy[locale.split('-')[0]]||appearanceCopy.en;
    const light=document.documentElement.dataset.theme==='sunrise';
    qsa('.ma-cinema-tools-content,.ref-explore-tools-panel,.ma-reference-header-tools-panel').forEach(panel=>{
      let group=qs('.ma-android-appearance',panel);
      if(!group){
        group=document.createElement('fieldset');group.className='ma-android-appearance';group.dataset.maPillExclude='';
        group.innerHTML='<legend></legend><button type="button" data-ma-appearance="aurora"><span aria-hidden="true">☾</span><span></span></button><button type="button" data-ma-appearance="sunrise"><span aria-hidden="true">☀</span><span></span></button><p class="ma-android-brand-story"></p>';
        group.addEventListener('click',event=>{const button=event.target.closest('button[data-ma-appearance]');if(button)saveAppearance(button.dataset.maAppearance)});
        panel.prepend(group);
      }
      const label=qs('legend',group);if(label.textContent!==c[0])label.textContent=c[0];
      qsa('button',group).forEach((button,i)=>{const text=button.lastElementChild;if(text.textContent!==c[i+1])text.textContent=c[i+1];const pressed=String((i===1)===light);if(button.getAttribute('aria-pressed')!==pressed)button.setAttribute('aria-pressed',pressed)});
      const story=qsa('.ma-masthead-intro>span').map(node=>node.textContent.trim()).filter(Boolean).join(' · '),target=qs('.ma-android-brand-story',group);
      if(target.textContent!==story)target.textContent=story;
      target.hidden=!story;
    });
  }
  function installStyle(){
    if(qs('#ma-android-premium-style'))return;
    const s=document.createElement('style');s.id='ma-android-premium-style';s.textContent=`
      html.matchapp-ai-android{--ma-neon:#b73cff;--ma-pink:#ff3da7;--ma-blue:#57b9ff;--ma-gold:#efc75e;--ma-panel:#12101a;--ma-card:#191622}
      html.matchapp-ai-android body{background:#08080d!important;overscroll-behavior-y:none}
      html.matchapp-ai-android :is(.ma-trust,[data-ma-trust]){display:none!important}
      html.matchapp-ai-android :is(.app-header,.cinematic-header,header.app-header){padding:10px 14px!important;min-height:64px!important;background:linear-gradient(180deg,rgba(12,10,18,.985),rgba(10,9,15,.94))!important;border-bottom:1px solid rgba(255,255,255,.06)!important;box-shadow:0 12px 32px rgba(0,0,0,.26)!important}
      html.matchapp-ai-android .ma-playai-mark{width:42px!important;height:42px!important;object-fit:contain!important;border:0!important;background:transparent!important;box-shadow:none!important}
      html.matchapp-ai-android .ma-playai-wordmark{max-width:min(68vw,390px)!important}
      html.matchapp-ai-android :is(.premium-card,.media-card,.match-card,.result-card,.channel-card,.profile-hub-row,[data-card]){border:1px solid rgba(255,255,255,.075)!important;border-radius:20px!important;background:linear-gradient(145deg,rgba(27,23,37,.96),rgba(12,11,17,.96))!important;box-shadow:0 12px 34px rgba(0,0,0,.28),inset 0 1px rgba(255,255,255,.035)!important;margin-block:10px!important}
      html.matchapp-ai-android :is(.poster-grid,.media-grid,.channel-grid,.marquee-track,.rail-track,.cards-row){gap:12px!important}
      html.matchapp-ai-android :is(.poster,.poster-card,.media-card,[data-card]){scroll-snap-align:start}
      @media(max-width:1280px){
        html.matchapp-ai-android .ma-android-rail{
          display:grid!important;grid-template-columns:none!important;grid-auto-flow:column!important;
          grid-auto-columns:minmax(132px,38vw)!important;overflow-x:auto!important;overflow-y:hidden!important;
          padding:4px 4px 10px!important;scroll-snap-type:x mandatory;overscroll-behavior-inline:contain;
          scrollbar-width:none;-webkit-overflow-scrolling:touch
        }
        html.matchapp-ai-android .ma-android-rail::-webkit-scrollbar{display:none}
        html.matchapp-ai-android body.matchapp-profile .profile-hub-menu{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      }
      @media(max-width:620px){
        html.matchapp-ai-android .ma-android-rail{
          grid-auto-columns:minmax(128px,72vw)!important;
          padding-inline:12px!important;scroll-padding-inline:12px!important
        }
        html.matchapp-ai-android .ma-android-rail>*{scroll-snap-stop:always;scroll-margin-inline:12px}
        html.matchapp-ai-android body.matchapp-profile .profile-hub-menu{grid-template-columns:1fr!important}
        html.matchapp-ai-android body:not(.ai-chat-page) .app-header{
          padding:7px 10px!important;gap:5px!important;min-height:0!important
        }
        html.matchapp-ai-android .app-header :is(.ma-brand-orb-stage,.ma-brand-orb,.ma-playai-mark,.brand-logo){
          width:34px!important;height:34px!important;min-width:34px!important
        }
        html.matchapp-ai-android .app-header :is(.ma-wordmark,.ma-playai-wordmark,.app-title-main){
          font-size:clamp(20px,6.5vw,28px)!important;line-height:1!important
        }
        html.matchapp-ai-android .app-header .ma-word-ai{font-size:inherit!important;line-height:1!important}
        html.matchapp-ai-android .app-header :is(.ma-brand-caption,.mh-tagline){
          font-size:9px!important;line-height:1.25!important;letter-spacing:.04em!important;margin-block:2px!important
        }
        html.matchapp-ai-android .app-header :is(select,input,.ma-cinema-search,.ma-cinema-tools>summary){
          min-height:42px!important
        }
        html.matchapp-ai-android .app-header #ma-ambient-jonas{
          transform:scale(.84)!important;transform-origin:center!important
        }
        html.matchapp-ai-android body.page-home #mh-topbox.app-header{
          margin:0!important;border-radius:0!important
        }
        html.matchapp-ai-android body.page-home #mh-topbox .mh-head{
          display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:6px!important
        }
        html.matchapp-ai-android body.page-home #mh-topbox .mh-tagline{
          grid-column:1/-1!important;margin:1px 0!important;padding:0!important
        }
        html.matchapp-ai-android body.page-home #mh-topbox .ma-cinema-header-actions{gap:4px!important;margin-top:1px!important}
        html.matchapp-ai-android #main-auth-modal,
        html.matchapp-ai-android #ma-android-onboarding,
        html.matchapp-ai-android #ma-android-match-modal{backdrop-filter:none!important}
        html.matchapp-ai-android #main-auth-modal{padding:8px!important}
        html.matchapp-ai-android #main-auth-modal>:is(.auth-box,.auth-modal-content,.modal-content){
          width:calc(100vw - 16px)!important;max-height:94vh!important;max-height:94dvh!important;
          padding:14px!important;border-radius:22px!important
        }
        html.matchapp-ai-android #main-auth-modal :is(.google-signin-btn,.phone-auth-entry,.passkey-button,#login-submit){
          min-height:48px!important;margin-block:6px!important;padding:10px 14px!important
        }
        html.matchapp-ai-android #main-auth-modal .auth-divider{margin:10px 0!important}
        html.matchapp-ai-android #main-auth-modal .auth-tabs{margin-top:10px!important;gap:8px!important}
        html.matchapp-ai-android #main-auth-modal .auth-tab{min-height:44px!important;padding:8px!important}
        html.matchapp-ai-android #main-auth-modal .passkey-box{margin:9px 0!important;padding:10px!important;border-radius:16px!important}
        html.matchapp-ai-android #main-auth-modal .passkey-help{font-size:12.5px!important;line-height:1.4!important;margin:7px 2px!important}
        html.matchapp-ai-android #main-auth-modal #form-login>input,
        html.matchapp-ai-android #main-auth-modal .auth-password-field{margin-bottom:8px!important}
        html.matchapp-ai-android #main-auth-modal #login-submit{font-size:17px!important}
        html.matchapp-ai-android :is(.premium-card,.media-card,.match-card,.result-card,.channel-card,.profile-hub-row,[data-card]){
          box-shadow:0 8px 20px rgba(0,0,0,.22)!important
        }
      }
      html.matchapp-ai-android :is(button,.btn,.gold-btn,.secondary-btn,.pill,.chip,[role="button"]){min-height:44px;border-radius:999px!important;margin:3px!important}
      html.matchapp-ai-android :is(input,select,textarea){min-height:46px;border-radius:15px!important;margin-block:4px!important}
      html.matchapp-ai-android img{max-width:100%}
      html.matchapp-ai-android :is(.section-head,.title-row,.card-actions,.result-actions,.portfolio-tabs){gap:10px!important}
      html.matchapp-ai-android body.page-home #trending-rail{margin:6px auto 10px!important;padding:8px 0 9px!important;border-radius:18px!important}
      html.matchapp-ai-android body.page-home #trending-rail h4{margin:0 12px 7px!important}
      html.matchapp-ai-android body.page-home #trending-rail .marquee-track{gap:10px!important;padding:2px 12px 7px!important}
      html.matchapp-ai-android body.page-home #trending-rail .marquee-item{flex:0 0 132px!important;width:132px!important;height:198px!important;border-radius:14px!important}
      html.matchapp-ai-android body.page-home #trending-rail .marquee-item img{width:100%!important;height:100%!important;aspect-ratio:2/3!important;object-fit:contain!important}
      html.matchapp-ai-android body.page-home #questionnaire-box{margin:10px 0!important;padding:13px 14px!important;border-radius:20px!important}
      html.matchapp-ai-android body.page-home #questionnaire-box :is(.q-grid,.criteria-grid,.crit-grid){gap:8px 10px!important}
      html.matchapp-ai-android body.page-home :is(.tg-entry,.spotlight-card,.ebook-fold){margin-block:9px!important;padding:12px 14px!important;border-radius:20px!important}
      html.matchapp-ai-android body.page-home :is(.home-fold,.ma-fold,details){margin-block:8px!important}
      html.matchapp-ai-android body.matchapp-profile .profile-hub{margin-bottom:10px!important}
      html.matchapp-ai-android body.matchapp-profile .profile-hub-menu{gap:10px!important}
      html.matchapp-ai-android body.matchapp-profile .profile-hub-row{margin:0!important;min-height:64px!important}
      #ma-android-match-launch{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;margin:10px 0;padding:16px 18px;border:1px solid rgba(183,60,255,.28);border-radius:22px;background:linear-gradient(135deg,rgba(41,23,61,.96),rgba(12,11,17,.98));box-shadow:0 14px 36px rgba(0,0,0,.28)}
      #ma-android-match-launch small,.mam-card header small{display:block;color:#caa8ff;font:800 10px/1.2 Inter,system-ui;text-transform:uppercase;letter-spacing:.12em}
      #ma-android-match-launch h2{margin:4px 0 5px;color:#fff;font:800 clamp(20px,3vw,28px)/1.05 Inter,system-ui}
      #ma-android-match-launch p{margin:0;color:#bcb4c7;font:500 12px/1.45 Inter,system-ui}
      #ma-android-match-launch .mam-open{min-height:48px;padding:0 20px;border:0;border-radius:999px;background:linear-gradient(135deg,#f0d18a,#d8aa50);color:#161017;font-weight:850;box-shadow:0 8px 22px rgba(216,170,80,.18)}
      #ma-android-match-modal{position:fixed;z-index:2147483460;inset:0;display:grid;place-items:center;padding:max(14px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom));background:rgba(3,3,8,.78);backdrop-filter:blur(18px) saturate(135%);opacity:0;transition:opacity .16s ease}
      #ma-android-match-modal.is-open{opacity:1}
      .mam-card{width:min(96vw,820px);max-height:min(90vh,860px);max-height:min(90dvh,860px);display:grid;grid-template-rows:auto 1fr;overflow:hidden;border:1px solid rgba(183,60,255,.36);border-radius:28px;background:linear-gradient(155deg,#21162f,#0c0b12 72%);box-shadow:0 34px 110px rgba(0,0,0,.7),0 0 60px rgba(183,60,255,.15)}
      .mam-card>header{display:flex;align-items:center;gap:12px;padding:13px 14px;border-bottom:1px solid rgba(255,255,255,.07);background:linear-gradient(90deg,rgba(183,60,255,.14),rgba(87,185,255,.06))}
      .mam-card>header>div{flex:1;min-width:0}.mam-card>header strong{display:block;margin-top:3px;color:#fff;font:800 21px/1.05 Inter,system-ui}
      .mam-x{width:44px;height:44px;min-width:44px!important;min-height:44px!important;margin:0!important;border-radius:50%!important;border:1px solid #ff7d88!important;background:linear-gradient(180deg,#e2465c,#9d1e34)!important;color:#fff!important;font:800 23px/1 system-ui!important;box-shadow:0 7px 20px rgba(220,63,84,.3)!important}
      .mam-body{overflow:auto;padding:12px;background:#0b0b10}
      .mam-body #questionnaire-box{display:block!important;margin:0!important;max-width:none!important;border:0!important;background:transparent!important;box-shadow:none!important;padding:6px!important}
      @media(max-width:700px){#ma-android-match-launch{grid-template-columns:1fr;padding:14px}.mam-card{border-radius:24px}.mam-body{padding:9px}}
      html.matchapp-ai-android #main-auth-modal{align-items:center!important;justify-content:center!important;padding:max(18px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom))!important;background:rgba(3,3,8,.76)!important;backdrop-filter:blur(16px) saturate(130%)!important}
      html.matchapp-ai-android #main-auth-modal>:is(.auth-box,.auth-modal-content,.modal-content){width:min(94vw,520px)!important;max-height:min(86vh,720px)!important;max-height:min(86dvh,720px)!important;overflow:auto!important;border-radius:26px!important;border:1px solid rgba(183,60,255,.32)!important;background:linear-gradient(155deg,#21162f,#0d0c14 70%)!important;box-shadow:0 28px 90px rgba(0,0,0,.62),0 0 45px rgba(183,60,255,.13)!important;padding:22px!important}
      html.matchapp-ai-android body #ma-ambient-panel#ma-ambient-panel:not([hidden]){position:fixed!important;left:12px!important;right:auto!important;top:max(12px,env(safe-area-inset-top))!important;bottom:auto!important;width:calc(100vw - 24px)!important;height:calc(100vh - 24px)!important;height:calc(100dvh - max(24px,env(safe-area-inset-top) + env(safe-area-inset-bottom)))!important;max-width:none!important;max-height:none!important;margin:0!important;transform:none!important;border-radius:28px!important;border:1px solid rgba(183,60,255,.4)!important;background:linear-gradient(160deg,#1e142b,#0b0b11 72%)!important;box-shadow:0 30px 100px rgba(0,0,0,.68),0 0 54px rgba(183,60,255,.14)!important}
      html.matchapp-ai-android body #ma-ambient-panel#ma-ambient-panel .ja-panel-head{background:linear-gradient(90deg,rgba(183,60,255,.17),rgba(87,185,255,.08))!important;padding:10px 12px!important}
      html.matchapp-ai-android body #ma-ambient-panel#ma-ambient-panel .ja-close{border:1px solid rgba(255,120,120,.88)!important;background:linear-gradient(180deg,#e2465c,#9d1e34)!important;color:#fff!important;border-radius:50%!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;box-shadow:0 7px 22px rgba(216,53,78,.38)!important}
      html.matchapp-ai-android #ma-ambient-panel iframe{border-radius:0 0 26px 26px!important}
      html.matchapp-ai-android #ma-ambient-jonas{z-index:2147483200!important}
      html.matchapp-ai-android #ma-ambient-jonas .ja-bubble{box-shadow:0 8px 26px rgba(0,0,0,.48),0 0 0 4px rgba(183,60,255,.28),0 0 30px rgba(183,60,255,.24)!important}
      #ma-android-onboarding{position:fixed;z-index:2147483500;inset:0;display:grid;place-items:center;padding:max(14px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom));background:rgba(3,3,8,.76);backdrop-filter:blur(18px) saturate(135%)}
      #ma-android-onboarding[hidden]{display:none!important}
      .mao-card{position:relative;width:min(96vw,760px);height:min(88vh,820px);height:min(88dvh,820px);display:grid;grid-template-rows:auto 1fr;overflow:hidden;border-radius:30px;border:1px solid rgba(183,60,255,.36);background:linear-gradient(155deg,#21162f,#0c0b12 72%);box-shadow:0 34px 110px rgba(0,0,0,.7),0 0 60px rgba(183,60,255,.15)}
      .mao-head{display:grid;grid-template-columns:52px 1fr 46px;gap:12px;align-items:center;padding:15px 16px;border-bottom:1px solid rgba(255,255,255,.07);background:linear-gradient(90deg,rgba(183,60,255,.14),rgba(87,185,255,.06))}
      .mao-logo{width:50px;height:50px;object-fit:contain}.mao-head h2{margin:0;color:#fff;font:800 clamp(18px,4vw,25px)/1.08 Inter,system-ui}.mao-head p{margin:4px 0 0;color:#bdb4cb;font:500 12px/1.35 Inter,system-ui}
      .mao-x{width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,120,120,.7);background:linear-gradient(180deg,#dd3f54,#a11f35);color:#fff;font:800 22px/1 system-ui;box-shadow:0 7px 20px rgba(220,63,84,.3)}
      .mao-frame{width:100%;height:100%;border:0;background:#0b0b10}
      .mao-done{display:grid;place-items:center;text-align:center;padding:28px;color:#fff}.mao-done img{width:94px;height:94px;object-fit:contain}.mao-done h3{font-size:28px;margin:12px 0 8px}.mao-done p{max-width:40ch;color:#beb5ca;line-height:1.5}.mao-enter{padding:12px 22px;border:0;background:linear-gradient(135deg,#b73cff,#ff3da7);color:#fff;font-weight:800;box-shadow:0 10px 30px rgba(183,60,255,.28)}
      .mao-nudge{position:fixed;z-index:2147483450;right:14px;bottom:calc(96px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:9px;max-width:min(88vw,340px);padding:9px 12px;border:1px solid rgba(183,60,255,.4);border-radius:18px;background:rgba(21,16,30,.96);box-shadow:0 14px 40px rgba(0,0,0,.45);color:#fff;font:700 12px/1.25 Inter,system-ui}.mao-nudge img{width:34px;height:34px;object-fit:contain}.mao-nudge button{margin-left:auto!important;min-width:34px!important;width:34px!important;height:34px!important;min-height:34px!important;background:#a11f35!important;color:white!important;border:0!important}
      @media(max-width:700px){html.matchapp-ai-android :is(main,.main-layout,.container,.wrap){padding-inline:12px!important}.mao-card{height:min(90vh,820px);height:min(90dvh,820px);border-radius:24px}.mao-head{padding:12px}.mao-head p{font-size:11px}}
      @media(prefers-reduced-motion:reduce){html.matchapp-ai-android *,html.matchapp-ai-android *:before,html.matchapp-ai-android *:after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}

@layer ma-reference.refinement {
html.matchapp-ai-android #ma-reference-header#ma-reference-header#ma-reference-header#ma-reference-header #ma-donate-shortcut#ma-donate-shortcut::after {display:none!important}
}
@layer matchappAndroidCinema {

html.matchapp-ai-android #ref-explore-header .ref-explore-tools>summary {display:grid!important;place-items:center!important;width:44px!important;height:44px!important;box-sizing:border-box!important;padding:10px!important;margin:0!important;background:#ffffff08!important;border:1px solid #ffffff0c!important;border-radius:16px!important}
html.matchapp-ai-android body.page-explore main {padding:12px 14px!important;box-sizing:border-box!important;width:100%!important;max-width:1120px!important;margin:0 auto!important}
html.matchapp-ai-android body.page-explore .ref-explore-hero {min-height:0!important;padding:20px!important;margin:0 0 12px!important;border:1px solid #ffffff10!important;border-radius:24px!important;box-sizing:border-box!important}
html.matchapp-ai-android body.page-explore .ref-explore-hero-copy {padding:0!important;max-width:100%!important;width:100%!important}
html.matchapp-ai-android body.page-explore .hub-title {width:100%!important;font:750 clamp(28px,7vw,40px)/1.08 system-ui!important;max-width:none!important;margin:0 0 8px!important;letter-spacing:-.035em!important}
html.matchapp-ai-android body.page-explore .hub-lede {font:400 13px/1.5 system-ui!important;max-width:32em!important;margin:0 0 16px!important}
html.matchapp-ai-android body.page-explore .ref-explore-primary {min-height:44px!important;padding:10px 16px!important;font:700 13px/1.3 system-ui!important;border-radius:14px!important}
html.matchapp-ai-android body.page-explore .ref-editorial-banners {gap:10px!important;margin:0 0 12px!important}
html.matchapp-ai-android body.page-explore .ref-editorial-banner {padding:14px!important;min-height:80px!important;border:1px solid #ffffff10!important;border-radius:20px!important;box-sizing:border-box!important}
html.matchapp-ai-android body.page-explore .ref-editorial-banner h2 {font:750 18px/1.2 system-ui!important;margin:0 0 6px!important}
html.matchapp-ai-android body.page-explore .ref-editorial-sub {font:500 12px/1.3 system-ui!important}
html.matchapp-ai-android body.page-explore .ref-primary-topics {gap:10px!important}
html.matchapp-ai-android body.page-explore .ref-topic-caption {gap:6px!important;padding:10px!important;box-sizing:border-box!important;width:100%!important}
html.matchapp-ai-android body.page-explore .ref-topic-caption h2 {font:700 14px/1.3 system-ui!important;word-break:normal!important;overflow-wrap:normal!important;margin:0!important;min-width:0!important}
html.matchapp-ai-android body.page-explore .ref-topic-caption svg {width:20px!important;height:20px!important;flex:0 0 20px!important}

/* Android cinema refinement. No web asset, route or catalog mutations. */
html.matchapp-ai-android body.page-home .main-layout {width:100%!important;max-width:none!important;margin:0!important;box-sizing:border-box!important}
html.matchapp-ai-android body.page-home .page-wrapper {width:100%!important;box-sizing:border-box!important}
html.matchapp-ai-android .ma-cinema-tools>summary {display:grid!important;place-items:center!important;width:44px!important;height:44px!important;position:relative!important;inset:auto!important;transform:none!important}
html.matchapp-ai-android .ma-auth-offer-fold {margin:12px 0!important;padding:12px!important;border:1px solid #ffffff0c!important;border-radius:16px!important;background:#251b32!important;font:600 13px/1.4 system-ui!important}
html.matchapp-ai-android #main-auth-modal > .premium-card :is(h2,h3) {font:750 19px/1.2 system-ui!important;padding-inline-end:44px!important;margin:0 0 16px!important}
html.matchapp-ai-android #main-auth-modal > .premium-card p {font-size:13px!important;line-height:1.5!important}
html.matchapp-ai-android .mam-card {box-sizing:border-box!important;width:100%!important;max-width:620px!important}
html.matchapp-ai-android .ma-cinema-tools>summary>svg {transform:none!important;width:22px!important;height:22px!important;position:static!important;margin:0!important}
html.matchapp-ai-android .ma-cinema-section-heading {width:calc(100% - 32px)!important;max-width:calc(100% - 32px)!important;box-sizing:border-box!important}
html.matchapp-ai-android body.page-home #trending-rail .marquee-viewport {width:100%!important;box-sizing:border-box!important}
html.matchapp-ai-android #ma-ambient-panel .ja-face-wrap {width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;max-width:44px!important;max-height:44px!important;flex:0 0 44px!important}

html.matchapp-ai-android body.page-home .main-layout>.container {box-sizing:border-box!important;width:100%!important;padding:0!important;margin:0!important;min-width:0!important}
html.matchapp-ai-android .ma-cinema-header-actions>:is(a,details),html.matchapp-ai-android .ma-cinema-tools>summary {box-sizing:border-box!important}
html.matchapp-ai-android .ma-cinema-header-actions>details.ma-cinema-tools {padding:0!important}
html.matchapp-ai-android body.page-home #trending-rail .marquee-item>img {position:static!important;inset:auto!important;transform:none!important}
html.matchapp-ai-android .ma-cinema-section-heading {margin:8px 16px!important;padding:0!important;min-height:36px!important}
html.matchapp-ai-android .ma-cinema-section-heading :is(h2,h3,h4) {font:750 19px/1.3 Inter,system-ui!important;letter-spacing:-.025em!important}
html.matchapp-ai-android .ma-cinema-section-heading a {font:650 12px/1.2 Inter,system-ui!important;min-height:44px!important}
html.matchapp-ai-android .poster-wall {opacity:.06!important}
html.matchapp-ai-android {--ma-neon:#a88af4;--ma-gold:#eac779;--ma-panel:#14111d;--ma-card:#191523;color-scheme:dark}
html.matchapp-ai-android body {background:radial-gradient(ellipse at 95% 0,#22152f 0,transparent 36%),#0b0910!important;color:#f9f5ff;font-family:Inter,system-ui,sans-serif!important}
html.matchapp-ai-android :is(button,a,input,select,textarea):focus-visible {outline:2px solid #d3b5ff!important;outline-offset:3px!important}
html.matchapp-ai-android #ma-reference-header {background:linear-gradient(125deg,#20142c,#100d17 80%)!important;border-bottom:1px solid #ffffff0d!important;box-shadow:0 8px 24px #0002!important}
html.matchapp-ai-android .ma-reference-header-original {background:transparent!important;border:0!important;box-shadow:none!important}
html.matchapp-ai-android .ma-brand-title-line {gap:6px!important;white-space:nowrap!important}
html.matchapp-ai-android .ma-brand-home-link {gap:9px!important;padding:0!important;margin:0!important;justify-content:flex-start!important}
html.matchapp-ai-android .ma-brand-copy {min-width:0!important;padding:0!important;background:transparent!important;border:0!important}
html.matchapp-ai-android .ma-cinema-header-actions {margin:0!important;gap:5px!important}
html.matchapp-ai-android .ma-cinema-header-actions>:is(a,details),html.matchapp-ai-android .ma-cinema-tools>summary {margin:0!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;padding:11px!important;border:1px solid #ffffff0c!important;background:#ffffff08!important;border-radius:16px!important}
html.matchapp-ai-android .ma-cinema-tools>summary {padding:0!important;border:0!important;background:transparent!important}
html.matchapp-ai-android #matchapp-viewer-country {font:600 13px/1.2 Inter,system-ui!important;background:#ffffff08!important;border:1px solid #ffffff12!important;border-radius:14px!important;padding:0 30px 0 13px!important;margin:0!important}
html.matchapp-ai-android body.page-home .page-wrapper {padding:10px 0 16px!important;margin:0 auto!important}
html.matchapp-ai-android body.page-home .main-layout {padding:0!important;gap:16px!important}
html.matchapp-ai-android body.page-home .home-hero {max-width:none!important;box-sizing:border-box!important;min-height:156px!important;margin:0 14px 2px!important;width:calc(100% - 28px)!important;padding:18px 18px 16px!important;border:1px solid #ffffff0c!important;border-radius:24px!important;overflow:hidden!important;box-shadow:0 12px 28px #0003!important;background-position:center!important}
html.matchapp-ai-android body.page-home .home-h1 {font:750 clamp(25px,6.5vw,38px)/1.1 Inter,system-ui,sans-serif!important;letter-spacing:-.045em!important;max-width:11.8em!important;margin:0 0 18px!important;text-shadow:0 2px 14px #0008!important;color:#fffaf1!important;padding:0!important;background:none!important}
html.matchapp-ai-android body.page-home .ma-cinema-hero-footer {display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important}
html.matchapp-ai-android body.page-home .ma-cinema-hero-action {min-height:44px!important;padding:12px 18px!important;background:linear-gradient(120deg,#f3d493,#d7ae62)!important;font:750 13px/1.2 Inter,system-ui!important;border-radius:14px!important;color:#241827!important;box-shadow:0 5px 16px #0002!important}
html.matchapp-ai-android body.page-home .ma-cinema-help {min-height:44px!important;padding:10px 12px!important;font:600 12px/1.25 Inter,system-ui!important;border-radius:14px!important;background:#0b0910a8!important;color:#efe6fa!important;max-width:48%!important}
html.matchapp-ai-android body.page-home #trending-rail {margin:0!important;padding:8px 0 0!important;background:transparent!important;border:0!important;box-shadow:none!important;overflow:visible!important}
html.matchapp-ai-android body.page-home #trending-rail :is(h4,.ma-cinema-rail-head) {margin:0 16px 12px!important;padding:0!important;font:750 19px/1.3 Inter,system-ui!important;letter-spacing:-.025em!important;gap:10px!important}
html.matchapp-ai-android body.page-home #trending-rail :is(h4,.ma-cinema-rail-head) a {font-size:12px!important;min-height:44px!important;display:inline-flex!important;align-items:center!important;color:#d5ba89!important}
html.matchapp-ai-android body.page-home #trending-rail .marquee-viewport {mask-image:none!important;-webkit-mask-image:none!important;padding:0 16px 4px!important;scroll-padding-inline:16px!important}
html.matchapp-ai-android body.page-home #trending-rail .marquee-track {gap:12px!important;padding:0!important;align-items:start!important}
html.matchapp-ai-android body.page-home #trending-rail .marquee-item {display:flex!important;flex-direction:column!important;gap:0!important;overflow:hidden!important;border:0!important;background:#17121f!important;box-shadow:0 7px 16px #0003!important;scroll-snap-align:start!important;scroll-snap-stop:normal!important}
html.matchapp-ai-android body.page-home #trending-rail .marquee-item::after {background:none!important}
html.matchapp-ai-android body.page-home #trending-rail .marquee-item>img {flex:none!important;object-fit:cover!important;object-position:center!important;display:block!important;border-radius:14px 14px 0 0!important}
html.matchapp-ai-android body.page-home #trending-rail .marquee-title {position:static!important;inset:auto!important;transform:none!important;display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;overflow:hidden!important;text-overflow:ellipsis!important;width:100%!important;min-height:38px!important;max-height:38px!important;padding:7px 8px 4px!important;box-sizing:border-box!important;background:#17121f!important;color:#f4eff9!important;font:600 11px/1.25 Inter,system-ui!important;text-align:start!important;text-shadow:none!important;border-radius:0!important;white-space:normal!important}
html.matchapp-ai-android #ma-android-match-launch {position:relative!important;overflow:hidden!important;margin:16px 14px!important;padding:18px!important;border:1px solid #b393de26!important;border-radius:24px!important;background:radial-gradient(ellipse at 100% 0,#77509738,transparent 62%),linear-gradient(130deg,#251b32,#14111d)!important;gap:14px!important;box-shadow:0 12px 32px #0002!important}
html.matchapp-ai-android #ma-android-match-launch small {color:#c7a9ee!important;font-size:9px!important;letter-spacing:.15em!important}
html.matchapp-ai-android #ma-android-match-launch h2 {font:750 22px/1.16 Inter,system-ui!important;letter-spacing:-.03em!important;margin:7px 0!important;color:#fff7ec!important}
html.matchapp-ai-android #ma-android-match-launch p {font:450 12px/1.45 Inter,system-ui!important;color:#bfb3cc!important;margin:0!important}
html.matchapp-ai-android #ma-android-match-launch .mam-open {min-height:46px!important;padding:11px 16px!important;font:750 13px/1.35 Inter,system-ui!important;border-radius:15px!important;margin:0!important;background:linear-gradient(115deg,#f3d797,#d5a955)!important;color:#271c28!important;box-shadow:0 5px 16px #d8ae5614!important}
html.matchapp-ai-android :is(.mam-card,.mao-card) {border:1px solid #d5bbff30!important;background:linear-gradient(145deg,#261b33,#100e17 70%)!important;border-radius:26px!important;box-shadow:0 20px 60px #0008!important}
html.matchapp-ai-android :is(.mam-card>header,.mao-head) {background:#ffffff03!important;padding:16px!important;gap:12px!important}
html.matchapp-ai-android .mam-card>header strong {font-size:21px!important;letter-spacing:-.025em!important}
html.matchapp-ai-android .mam-body {background:transparent!important;padding:14px!important;overscroll-behavior:contain}
html.matchapp-ai-android .mam-body :is(input,select) {min-height:46px!important;font-size:14px!important;border-radius:13px!important}
html.matchapp-ai-android :is(.mam-x,.mao-x,.ma-android-auth-x,#ma-ambient-panel .ja-close) {width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;flex:none!important;background:#712c40!important;border:1px solid #f38c9d40!important;color:#ffcfda!important;box-shadow:none!important}
html.matchapp-ai-android #main-auth-modal>:is(.auth-box,.auth-modal-content,.modal-content) {padding:20px!important;border:1px solid #d5bbff30!important;background:linear-gradient(150deg,#251a33,#100e17 75%)!important;border-radius:26px!important}
html.matchapp-ai-android #ma-ambient-panel .ja-panel-head {height:68px!important;max-height:68px!important;min-height:68px!important;box-sizing:border-box!important;flex:none!important;padding:10px 12px!important;border-bottom:1px solid #ffffff0a!important;background:#ffffff03!important}
html.matchapp-ai-android #ma-ambient-panel .ja-head-text strong {font:750 18px/1.15 Inter,system-ui!important}
html.matchapp-ai-android #ma-ambient-panel .ja-head-text span {font:450 11px/1.4 Inter,system-ui!important;color:#b9afc8!important}
html.matchapp-ai-android #ma-ambient-panel .ja-hello {padding:10px 14px!important;margin:0!important;font:500 12px/1.4 Inter,system-ui!important;flex:none!important;background:#23192e!important}
html.matchapp-ai-android #ma-ambient-panel #ma-ambient-chat-frame {min-height:0!important;flex:1 1 0!important;border-radius:0!important;width:100%!important}
html.matchapp-ai-android #ma-ambient-panel .ma-guide-pills {height:52px!important;min-height:52px!important;box-sizing:border-box!important;flex:none!important;display:flex!important;overflow-x:auto!important;flex-wrap:nowrap!important;padding:6px 10px!important;gap:6px!important;scrollbar-width:none!important}
html.matchapp-ai-android #ma-ambient-panel .ma-guide-pills>* {height:40px!important;max-height:40px!important;box-sizing:border-box!important;flex:none!important;font:600 11px/1.2 system-ui!important;min-height:40px!important;padding:10px 12px!important;margin:0!important}
html.matchapp-ai-android #ma-ambient-panel .ma-chat-grip {display:none!important}
html.matchapp-ai-android body.matchapp-profile .profile-hub {padding:0 14px!important;box-sizing:border-box!important}
html.matchapp-ai-android body.matchapp-profile :is(.profile-hub,.profile-hub-menu) {gap:10px!important}
html.matchapp-ai-android body.matchapp-profile .profile-hub-row {border:1px solid #ffffff0b!important;background:linear-gradient(135deg,#21192d,#15111d)!important;border-radius:18px!important;min-height:64px!important;padding:14px!important;box-shadow:none!important}
@media(max-width:620px){html.matchapp-ai-android #ma-android-match-launch{grid-template-columns:1fr!important}html.matchapp-ai-android .ma-android-rail{grid-auto-columns:minmax(150px,62vw)!important;gap:12px!important;padding-inline:14px!important;scroll-padding-inline:14px!important}}
/* Compact Android finish. A control has one surface and one spacing owner. */
html.matchapp-ai-android {--ma-native-bg:#100d17;--ma-native-surface:#1c1626;--ma-native-field:#292132;--ma-native-text:#f5f0fa;--ma-native-muted:#c1b5cc;--ma-native-line:#d5bbff26;--ma-native-accent:#e6c485;--ma-native-ink:#281c29;--ma-native-close:#712c40;--ma-native-close-text:#ffdae2}
html.matchapp-ai-android[data-theme="sunrise"] {--ma-native-bg:#f7f3ee;--ma-native-surface:#fffdf9;--ma-native-field:#eee7df;--ma-native-text:#302735;--ma-native-muted:#665b70;--ma-native-line:#77618430;--ma-native-accent:#8c6021;--ma-native-ink:#fffaf2;--ma-native-close:#f9e1e7;--ma-native-close-text:#93293f;color-scheme:light!important}
html.matchapp-ai-android body {background:var(--ma-native-bg)!important;color:var(--ma-native-text)!important}
/* Keep the first screen interactive while lower sections wait for the viewport. */
html.matchapp-ai-android body.page-home .seo-footer {content-visibility:auto;contain-intrinsic-size:auto 700px;background:var(--ma-native-surface)!important;color:var(--ma-native-text)!important;border-color:var(--ma-native-line)!important}
html.matchapp-ai-android #ma-android-studio-games {margin:14px!important;padding:18px!important;border-radius:22px!important;background:var(--ma-native-surface)!important;color:var(--ma-native-text)!important;border:1px solid var(--ma-native-line)!important;content-visibility:auto;contain-intrinsic-size:auto 220px}
html.matchapp-ai-android #ma-android-studio-games h2 {margin:0 0 14px!important;font:700 18px/1.3 system-ui!important;color:var(--ma-native-text)!important}
html.matchapp-ai-android .ma-studio-grid {display:grid!important;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))!important;gap:12px!important}
html.matchapp-ai-android .ma-studio-grid a {display:flex!important;align-items:center!important;gap:12px!important;padding:12px!important;border-radius:18px!important;background:var(--ma-native-field)!important;color:var(--ma-native-text)!important;text-decoration:none!important;min-width:0!important}
html.matchapp-ai-android .ma-studio-grid img {width:56px!important;height:56px!important;object-fit:cover!important;border-radius:14px!important;flex:0 0 56px!important}
html.matchapp-ai-android .ma-studio-grid strong {display:block!important;color:var(--ma-native-text)!important;font:650 14px/1.4 system-ui!important}
html.matchapp-ai-android .ma-studio-grid small {display:block!important;color:var(--ma-native-muted)!important;font:500 12px/1.5 system-ui!important;margin-top:4px!important}
html.matchapp-ai-android .ma-studio-more {display:inline-flex!important;align-items:center!important;min-height:44px!important;margin-top:8px!important;color:var(--ma-native-accent)!important;font:600 13px/1.4 system-ui!important}
html.matchapp-ai-android .seo-footer :is(h2,h3,h4,strong,summary) {color:var(--ma-native-text)!important;text-shadow:none!important}
html.matchapp-ai-android .seo-footer :is(p,small,.seo-footer-lede,.seo-footer-legal) {color:var(--ma-native-muted)!important;text-shadow:none!important}
html.matchapp-ai-android .seo-footer :is(a,button) {color:var(--ma-native-accent)!important;border-color:var(--ma-native-line)!important}
html.matchapp-ai-android :is(.ma-brand-caption,.mh-tagline) {color:var(--ma-native-muted)!important;text-shadow:none!important}
html.matchapp-ai-android #ma-reference-header {background:var(--ma-native-surface)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-bottom:1px solid var(--ma-native-line)!important;box-shadow:0 4px 16px #0000000a!important}
html.matchapp-ai-android .ma-cinema-header-actions>details.ma-cinema-tools {padding:0!important;border:0!important;background:none!important;box-shadow:none!important;border-radius:999px!important}
html.matchapp-ai-android :is(.ma-cinema-search,.ma-cinema-tools>summary,.ref-explore-tools>summary) {display:flex!important;align-items:center!important;justify-content:center!important;padding:0!important;margin:0!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;border-radius:999px!important;border:1px solid var(--ma-native-line)!important;background:var(--ma-native-field)!important;color:var(--ma-native-text)!important;box-shadow:none!important;gap:0!important}
html.matchapp-ai-android :is(.ma-cinema-tools>summary,.ref-explore-tools>summary)>svg {width:20px!important;height:20px!important;flex:0 0 20px!important;transform:none!important;margin:0!important}
html.matchapp-ai-android :is(.ma-cinema-tools>summary,.ref-explore-tools>summary)>span {position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip-path:inset(50%)!important}
html.matchapp-ai-android :is(.ma-cinema-tools-content,.ref-explore-tools-panel,.ma-reference-header-tools-panel) {padding:12px!important;border-radius:22px!important;background:var(--ma-native-surface)!important;color:var(--ma-native-text)!important;border:1px solid var(--ma-native-line)!important;box-shadow:0 14px 38px #0003!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;overflow-x:hidden!important}
html.matchapp-ai-android :is(.ma-cinema-tools,.ref-explore-tools,.ma-reference-header-tools):not([open])>:is(.ma-cinema-tools-content,.ref-explore-tools-panel,.ma-reference-header-tools-panel) {display:none!important}
html.matchapp-ai-android .ma-cinema-tools-content nav.mh-deck {display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;margin:0 0 8px!important;padding:0!important}
html.matchapp-ai-android .ma-cinema-tools-content :is(button,a,select) {min-width:0!important;max-width:100%!important;min-height:44px!important;height:auto!important;margin:0!important;padding:10px 14px!important;border-radius:999px!important;box-sizing:border-box!important;font:600 13px/1.35 system-ui!important;gap:8px!important;text-align:center!important;white-space:normal!important;overflow-wrap:break-word!important;align-items:center!important;justify-content:center!important;color:var(--ma-native-text)!important;background:var(--ma-native-field)!important;border:1px solid var(--ma-native-line)!important;box-shadow:none!important}
html.matchapp-ai-android .ma-cinema-tools-content :is(#lang-switcher-host,#nav-reg-btn,#nav-logout-btn,#profile-link-tab,#quota-badge) {grid-column:1/-1!important;width:100%!important;max-width:none!important}
html.matchapp-ai-android .ma-cinema-tools-content #lang-switcher-host {grid-row:1!important;margin:0!important;padding:0!important;min-height:44px!important;height:auto!important}
html.matchapp-ai-android .ma-cinema-tools-content select {height:44px!important;width:100%!important;text-align:start!important;padding-inline:14px 32px!important}
html.matchapp-ai-android .ma-cinema-tools-content #nav-reg-btn {background:var(--ma-native-accent)!important;color:var(--ma-native-ink)!important}
html.matchapp-ai-android .ma-cinema-tools-content nav.ma-luxe-shortcuts {display:grid!important;grid-template-columns:1fr!important;gap:8px!important;margin:0!important;padding:0!important}
html.matchapp-ai-android .ma-cinema-tools-content #ma-donate-shortcut {width:100%!important;justify-self:stretch!important;padding:10px 14px!important;background:var(--ma-native-field)!important;color:var(--ma-native-muted)!important}
html.matchapp-ai-android .ma-cinema-tools-content #ma-donate-shortcut>span {display:inline!important}
html.matchapp-ai-android .ma-cinema-tools-content :is(button,a) svg {width:20px!important;height:20px!important;flex:0 0 20px!important;margin:0!important;transform:none!important}
html.matchapp-ai-android :is(.ja-bubble,.jh-bubble) {border:0!important;border-radius:50%!important;box-shadow:none!important;background:transparent!important}
html.matchapp-ai-android :is(.ja-premium-face,.jh-portrait) {border-radius:50%!important}
html.matchapp-ai-android #matchapp-viewer-country {border-radius:999px!important;border:1px solid var(--ma-native-line)!important;color:var(--ma-native-text)!important;background:var(--ma-native-field)!important;font:500 12px/1.3 system-ui!important}
html.matchapp-ai-android #ma-reference-header-slot .ma-reference-jonas-caption,html.matchapp-ai-android #ma-reference-header-slot .ma-reference-jonas-caption :is(strong,span) {color:var(--ma-native-text)!important}
html.matchapp-ai-android .ma-android-appearance {display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;padding:0!important;margin:0 0 12px!important;border:0!important;min-width:0!important}
html.matchapp-ai-android .ma-android-appearance>legend {float:left!important;grid-column:1/-1!important;width:100%!important;padding:0 4px 4px!important;margin:0!important;color:var(--ma-native-muted)!important;font:600 12px/1.4 system-ui!important}
html.matchapp-ai-android .ma-android-appearance>button {display:flex!important;min-height:44px!important;border-radius:999px!important;gap:8px!important;align-items:center!important;justify-content:center!important}
html.matchapp-ai-android .ma-android-appearance>button[aria-pressed="true"] {background:var(--ma-native-accent)!important;color:var(--ma-native-ink)!important;border-color:transparent!important}
html.matchapp-ai-android .ma-android-brand-story {grid-column:1/-1!important;padding:4px!important;margin:0 0 4px!important;font:500 11px/1.4 system-ui!important;color:var(--ma-native-muted)!important;background:none!important;box-shadow:none!important}
html.matchapp-ai-android body.page-home .main-layout>.container {max-width:none!important}
html.matchapp-ai-android body.page-home .home-hero {min-height:142px!important;padding:16px!important;border-radius:20px!important}
html.matchapp-ai-android body.page-home .home-h1 {font:750 clamp(23px,6.2vw,34px)/1.16 system-ui!important;max-width:none!important;margin:0 0 14px!important}
html.matchapp-ai-android body.page-home .ma-cinema-hero-footer {position:static!important;width:100%!important;gap:8px!important;align-items:stretch!important}
html.matchapp-ai-android body.page-home :is(.ma-cinema-hero-action,.ma-cinema-help) {position:static!important;inset:auto!important;transform:none!important;min-height:44px!important;border-radius:999px!important;padding:10px 14px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;flex:1 1 0%!important;max-width:none!important;white-space:normal!important;font:600 12px/1.35 system-ui!important;text-align:center!important}
html.matchapp-ai-android .ma-cinema-section-heading {gap:12px!important;min-height:44px!important;align-items:center!important}
html.matchapp-ai-android .ma-cinema-section-heading :is(h2,h3,h4) {font:700 17px/1.25 system-ui!important;color:var(--ma-native-text)!important;margin:0!important}
html.matchapp-ai-android .ma-cinema-section-heading a {white-space:nowrap!important;color:var(--ma-native-accent)!important}
html.matchapp-ai-android #ma-android-match-launch {margin:12px 14px!important;padding:16px!important;border-radius:20px!important;gap:10px!important;background:var(--ma-native-surface)!important;border-color:var(--ma-native-line)!important}
html.matchapp-ai-android #ma-android-match-launch h2 {font:700 20px/1.2 system-ui!important;color:var(--ma-native-text)!important;margin:4px 0 6px!important}
html.matchapp-ai-android #ma-android-match-launch :is(p,small) {color:var(--ma-native-muted)!important}
html.matchapp-ai-android #ma-android-match-launch :is(h2,h3) {color:var(--ma-native-text)!important}
html.matchapp-ai-android #ma-android-match-launch p {color:var(--ma-native-muted)!important}
html.matchapp-ai-android #ma-android-match-launch .mam-open {min-height:44px!important;border-radius:999px!important;background:var(--ma-native-accent)!important;color:var(--ma-native-ink)!important}
html.matchapp-ai-android body.page-explore :is(.ref-explore-hero,.ref-editorial-banner) {background-color:#170e21!important;color:#fff8ef!important}
html.matchapp-ai-android body.page-explore :is(.ref-explore-hero,.ref-editorial-banner) :is(h1,h2,h3,strong) {color:#fff8ef!important}
html.matchapp-ai-android body.page-explore :is(.ref-explore-hero,.ref-editorial-banner) :is(p,small,.ref-editorial-sub) {color:#e5dbe9!important}
html.matchapp-ai-android .ma-auth-offer-fold {background:var(--ma-native-field)!important;color:var(--ma-native-text)!important;border-color:var(--ma-native-line)!important}
html.matchapp-ai-android #result-box .ma-guest-trial-bar {background:var(--ma-native-field)!important;color:var(--ma-native-text)!important;border:1px solid var(--ma-native-line)!important;box-shadow:none!important;padding:12px!important;margin:12px 0!important;gap:10px!important;border-radius:18px!important}
html.matchapp-ai-android #result-box .ma-guest-trial-count {color:var(--ma-native-text)!important;font:600 12px/1.45 system-ui!important}
html.matchapp-ai-android #result-box .ma-guest-trial-button {background:var(--ma-native-accent)!important;color:var(--ma-native-ink)!important;min-height:44px!important;height:auto!important;padding:10px 14px!important;border-radius:999px!important;font:650 12px/1.4 system-ui!important;white-space:normal!important}
html.matchapp-ai-android #result-box :is(.ma-result-exit,.result-dismiss) {display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:44px!important;padding:10px 14px!important;border-radius:999px!important;background:var(--ma-native-field)!important;color:var(--ma-native-text)!important;font:650 13px/1.3 system-ui!important;box-sizing:border-box!important}
html.matchapp-ai-android #result-box .result-dismiss {width:44px!important;height:44px!important;padding:10px!important;background:var(--ma-native-close)!important;color:var(--ma-native-close-text)!important}
@media(max-width:620px){html.matchapp-ai-android #result-box {padding:16px!important}html.matchapp-ai-android #result-box .match-result-toolbar {min-height:44px!important;height:auto!important;margin:0 0 12px!important;padding:0!important}html.matchapp-ai-android #result-box .res-poster-col {max-width:220px!important;width:58vw!important;margin-inline:auto!important}}
html.matchapp-ai-android :is(.mam-card,.mao-card,#main-auth-modal>.premium-card,#main-auth-modal>.auth-box,.profile-hub-row,.ref-topic-caption) {background:var(--ma-native-surface)!important;color:var(--ma-native-text)!important;border-color:var(--ma-native-line)!important}
html.matchapp-ai-android :is(.mam-card,.mao-card,#main-auth-modal,.profile-hub-row,.ref-topic-caption) :is(h2,h3,strong,label) {color:var(--ma-native-text)!important}
html.matchapp-ai-android :is(.mam-card,.mao-card,#main-auth-modal,.profile-hub-row,.ref-topic-caption) :is(p,small) {color:var(--ma-native-muted)!important}
html.matchapp-ai-android :is(.mam-card,#main-auth-modal) :is(input,select,textarea,.crit-chip,.ma-cinema-select) {background:var(--ma-native-field)!important;color:var(--ma-native-text)!important;border-color:var(--ma-native-line)!important}
html.matchapp-ai-android :is(.mam-x,.mao-x,.ma-android-auth-x,#ma-ambient-panel .ja-close) {background:var(--ma-native-close)!important;color:var(--ma-native-close-text)!important;border-color:var(--ma-native-line)!important}
html.matchapp-ai-android #ma-ambient-panel {background:var(--ma-native-bg)!important;color:var(--ma-native-text)!important;border-color:var(--ma-native-line)!important}
html.matchapp-ai-android #ma-ambient-panel :is(.ja-panel-head,.ja-hello,.ma-guide-pills) {background:var(--ma-native-surface)!important;color:var(--ma-native-text)!important}
html.matchapp-ai-android #ma-ambient-panel .ma-guide-pills :is(a,button) {background:var(--ma-native-field)!important;color:var(--ma-native-text)!important;border:1px solid var(--ma-native-line)!important;box-shadow:none!important;min-height:44px!important}
html.matchapp-ai-android #ma-ambient-panel :is(.ja-head-text strong,.ja-head-text span) {color:var(--ma-native-text)!important}
html.matchapp-ai-android body.page-home #trending-rail :is(.marquee-item,.marquee-title) {background:var(--ma-native-surface)!important;color:var(--ma-native-text)!important}
@media(max-width:620px){html.matchapp-ai-android #ma-reference-header .ma-masthead-intro {display:none!important}}
@media(prefers-reduced-motion:no-preference){html.matchapp-ai-android :is(.mam-card,.mao-card){animation:ma-native-enter .2s cubic-bezier(.2,.8,.2,1)}@keyframes ma-native-enter{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}}

}
    `;document.head.appendChild(s);
  }
  function applyBrand(root=document){
    if(!LOGO)return;
    qsa('.auth-brand-orb,.hub-brand img,.ma-brand-home-link>img,.ma-playai-mark,.ma-brand-orb,.brand-logo,img[alt*="MatchApp Logo" i],img[alt="MatchApp Ai"]',root).forEach(img=>{if(img.src!==LOGO)img.src=LOGO;img.removeAttribute('srcset');if(img.style.getPropertyValue('content')!=='normal')img.style.setProperty('content','normal','important');});
    qsa('.ma-cinema-dock a[data-cinema-route="matches"] svg',root).forEach(icon=>{const mark=document.createElement('img');mark.src=LOGO;mark.alt='';mark.className='ma-android-match-mark';mark.style.cssText='width:28px!important;height:28px!important;object-fit:contain!important';icon.replaceWith(mark)});
  }
  function markRails(root=document){
    qsa('.poster-grid,.media-grid,.channel-grid,.cards-row',root).forEach(row=>{
      row.classList.toggle('ma-android-rail',row.children.length>=4);
    });
  }
  const phoneGeometry=new Map();
  function compactPhoneHeader(){
    phoneGeometry.forEach((_,el)=>{if(!el.isConnected)phoneGeometry.delete(el)});
    const phone=window.matchMedia?.('(max-width:620px)').matches===true;
    const set=(selector,props)=>qsa(selector).forEach(el=>Object.entries(props).forEach(([k,v])=>{
      if(!phone){const old=phoneGeometry.get(el)?.get(k);if(old)el.style.setProperty(k,old[0],old[1]);return}
      if(!phoneGeometry.has(el))phoneGeometry.set(el,new Map());
      if(!phoneGeometry.get(el).has(k))phoneGeometry.get(el).set(k,[el.style.getPropertyValue(k),el.style.getPropertyPriority(k)]);
      if(el.dataset.maAndroidPhoneGeom!=='1')el.dataset.maAndroidPhoneGeom='1';
      if(el.style.getPropertyValue(k)!==v||el.style.getPropertyPriority(k)!=='important')el.style.setProperty(k,v,'important');
    }));
    set('#ma-reference-header',{padding:'8px 14px 10px','min-height':'0px'});
    set('.ma-reference-header-bar',{display:'grid','grid-template-columns':'minmax(0,1fr) 36px 44px 44px',padding:'0px',gap:'8px','min-height':'0px','align-items':'center'});
    set('.ma-reference-header-chrome',{display:'contents'});
    set('.ma-reference-header-original',{display:'contents'});
    set('.ma-reference-header-original>.mh-head',{'grid-area':'1 / 1 / 2 / 3',display:'block',padding:'0px','min-width':'0px'});
    set('.ma-reference-header-original>.ma-cinema-header-actions',{display:'contents'});
    set('.ma-cinema-header-actions>.ma-cinema-search',{'grid-area':'1 / 3'});
    set('.ma-cinema-header-actions>.ma-cinema-tools',{'grid-area':'1 / 4'});
    set('#shell-brand-lockup,#home-brand-lockup,.ma-brand-home-link',{height:'44px','min-height':'44px',margin:'0px'});
    set('.mh-head .ma-brand-orb-stage,.mh-head .ma-brand-orb',{width:'40px',height:'40px','min-width':'40px','max-width':'40px','min-height':'40px','max-height':'40px','flex-basis':'40px'});
    set('#ref-explore-header>.hub-brand',{'grid-area':'1 / 1 / 2 / 3',display:'flex','min-width':'0px'});
    set('#ref-explore-header>.ma-cinema-search',{'grid-area':'1 / 3',width:'44px',height:'44px',display:'grid','place-items':'center'});
    set('#ref-explore-header>.ref-explore-tools',{'grid-area':'1 / 4',width:'44px',height:'44px',padding:'0px'});
    set('#ref-explore-header>.ma-masthead-intro',{'grid-area':'2 / 1',width:'100%','align-self':'center'});
    set('#ref-explore-header .hub-brand>img',{display:'block',width:'40px',height:'40px','min-width':'40px','object-fit':'contain',background:'transparent'});
    set('#ref-explore-header .ma-wordmark,#ref-explore-header .ma-word-ai',{'font-size':'clamp(20px,5.8vw,24px)','line-height':'1'});
    set('.mh-head .ma-wordmark,.mh-head .ma-word-ai',{'font-size':'clamp(20px,5.8vw,24px)','line-height':'1'});
    set('.ma-masthead-intro',{margin:'3px 0 1px',padding:'0px',gap:'1px'});
    set('.ma-masthead-story',{font:'500 10px/13px system-ui,sans-serif','letter-spacing':'0px'});
    set('.ma-masthead-formats',{font:'500 9px/12px system-ui,sans-serif','letter-spacing':'.035em'});
    set('#matchapp-viewer-country-control',{'grid-column':'1','grid-row':'2',width:'100%','max-width':'none',height:'44px','min-height':'44px',margin:'0px'});
    set('#matchapp-viewer-country',{width:'100%','max-width':'none',height:'44px','min-height':'44px'});
    set('#ma-reference-header-slot',{'grid-column':'2 / 5','grid-row':'2',width:'100%',height:'48px','min-height':'0px',padding:'0px','align-self':'center'});
    set('#ma-reference-header-slot>#ma-ambient-jonas,#ma-reference-header-slot>#ma-jonas-home',{display:'grid','grid-template-columns':'44px minmax(0,1fr)','grid-template-rows':'auto',gap:'7px',width:'100%','max-width':'none',height:'48px','justify-items':'start','align-items':'center',transform:'none'});
    set('#ma-reference-header-slot :is(.ja-bubble,.jh-bubble)',{width:'44px',height:'44px','min-width':'44px','min-height':'44px','max-width':'44px','max-height':'44px',margin:'0px'});
    set('#ma-reference-header-slot .ma-reference-jonas-caption',{position:'static',width:'auto','max-width':'none','min-width':'0px',height:'auto','min-height':'0px',padding:'0px','align-items':'flex-start','text-align':'start',border:'0px',background:'transparent',font:'500 9px/1.25 system-ui'});
    set('#ma-reference-header-slot .ma-reference-jonas-caption :is(strong,span)',{font:'inherit','line-height':'1.25','text-align':'start'});
    if(!phone){qsa('[data-ma-android-phone-geom="1"]').forEach(el=>delete el.dataset.maAndroidPhoneGeom);phoneGeometry.clear()}
  }
  function polishCinemaPosters(){
    const width=window.matchMedia('(max-width:620px)').matches?112:148;
    qsa('#trending-rail .marquee-item').forEach(el=>{
      const set=(node,k,v)=>{if(node&&node.style.getPropertyValue(k)!==v)node.style.setProperty(k,v,'important')};
      set(el,'width',width+'px');set(el,'min-width',width+'px');set(el,'max-width',width+'px');set(el,'height',(width*1.5+38)+'px');set(el,'flex','0 0 '+width+'px');set(el,'border-radius','14px');set(el,'margin','0px');
      const poster=el.querySelector(':scope>img');
      if(poster){set(poster,'width',width+'px');set(poster,'height',(width*1.5)+'px');if(poster.sizes!==width+'px')poster.sizes=width+'px'}
    });
  }

  // Shared pages use several precedence layers. Apply only this Android style
  // guide's declarations, using CSSOM-normalized values to avoid observer loops.
  // Save prior inline values so responsive changes restore the original owner.
  const cinemaOverrides=new Map();
  function polishCinemaSurfaces(){
    const sheet=qs('#ma-android-premium-style')?.sheet;if(!sheet)return;
    const layer=Array.from(sheet.cssRules).find(r=>r.name==='matchappAndroidCinema');if(!layer)return;
    const desired=new Map();
    const collect=rules=>Array.from(rules).forEach(rule=>{
      if(rule.selectorText&&rule.style){
        qsa(rule.selectorText).forEach(el=>{
          if(!desired.has(el))desired.set(el,new Map());
          const props=desired.get(el);
          Array.from(rule.style).forEach(k=>{const value=rule.style.getPropertyValue(k);if(value)props.set(k,value)});
          // CSSOM exposes empty longhands for an unresolved var() shorthand.
          // Preserve the authored shorthand instead of clearing the surface.
          ['background','border'].forEach(key=>{
            const value=rule.style.getPropertyValue(key);
            if(!value.includes('var('))return;
            const resets=k=>key==='background'?k.startsWith('background-'):/^border(?:-(?:top|right|bottom|left))?-(?:width|style|color)$/.test(k)||k.startsWith('border-image');
            Array.from(props.keys()).filter(k=>k===key||resets(k)).forEach(k=>props.delete(k));
            props.set(key,value);
          });
        });
      }else if(rule.cssRules&&(!rule.conditionText||matchMedia(rule.conditionText).matches)&&!rule.name)collect(rule.cssRules);
    });
    collect(layer.cssRules);
    cinemaOverrides.forEach((saved,el)=>{
      saved.forEach((before,k)=>{
        if(!desired.get(el)?.has(k)){el.style.setProperty(k,before.value,before.priority);saved.delete(k)}
      });
      if(!el.isConnected||!saved.size)cinemaOverrides.delete(el);
    });
    desired.forEach((props,el)=>{
      if(!cinemaOverrides.has(el))cinemaOverrides.set(el,new Map());
      const saved=cinemaOverrides.get(el);
      props.forEach((v,k)=>{
        if(!saved.has(k))saved.set(k,{value:el.style.getPropertyValue(k),priority:el.style.getPropertyPriority(k)});
        if(el.style.getPropertyValue(k)!==v||el.style.getPropertyPriority(k)!=='important')el.style.setProperty(k,v,'important');
      });
    });
  }

  let refreshQueued=false;
  function refreshForStructuralChanges(records){
    // Countdown, quota and caption text updates already inherit their styles.
    // Repainting the entire native shell for each text tick forces layout work
    // while the user scrolls. New or replaced elements still get the finish.
    if(records.some(record=>Array.from(record.addedNodes).concat(Array.from(record.removedNodes)).some(node=>node.nodeType===1)))schedulePremiumRefresh();
  }
  function schedulePremiumRefresh(){
    if(refreshQueued)return;
    refreshQueued=true;
    requestAnimationFrame(()=>{
      refreshQueued=false;
      applyBrand();markRails();mountAppearance();mountStudioGames();compactPhoneHeader();polishCinemaPosters();polishCinemaSurfaces();paintAndroidChrome();paintMatchOverlay();addRedClose();installMatchOverlay();enforceJonasFullscreen();polishErrorBubble();
    });
  }
  function shouldPolishJonasFrame(records,body){
    return records.some(record=>record.type==='attributes'
      ?record.target===body&&record.attributeName==='class'
      :Array.from(record.addedNodes).concat(Array.from(record.removedNodes)).some(node=>node.nodeType===1));
  }
  function polishJonasFrame(){
    const frame=qs('#ma-ambient-chat-frame');if(!frame)return;
    if(!frame.dataset.maCinemaBound){frame.dataset.maCinemaBound='1';frame.addEventListener('load',polishJonasFrame)}
    let doc;try{doc=frame.contentDocument}catch(_){return}
    const head=doc?.querySelector('.discover-head');if(!head)return;
    const palette=getComputedStyle(document.documentElement),color=name=>palette.getPropertyValue('--ma-native-'+name).trim();
    const set=(selector,props)=>Array.from(doc.querySelectorAll(selector)).forEach(el=>Object.entries(props).forEach(([k,v])=>{if(el.style.getPropertyValue(k)!==v)el.style.setProperty(k,v,'important')}));
    let toolbar=doc.querySelector('.ma-native-chat-toolbar');
    if(!toolbar){
      toolbar=doc.createElement('div');toolbar.className='ma-native-chat-toolbar';
      const fresh=doc.querySelector('#jonas-header-new-chat'),history=doc.querySelector('.jonas-top-history');
      if(history)toolbar.append(history);if(fresh)toolbar.append(fresh);head.prepend(toolbar);
    }
    const article=doc.querySelector('.ma-discover-editorial');
    if(article&&!article.closest('details')){
      const details=doc.createElement('details'),summary=doc.createElement('summary');
      details.className='ma-native-chat-guide';summary.textContent=article.querySelector('h2')?.textContent||article.querySelector('h3')?.textContent||t().dna;
      article.before(details);details.append(summary,article);
    }
    set('html,body',{background:color('bg'),color:color('text'),margin:'0px',padding:'0px'});
    set('.poster-wall,.luxury-bg',{opacity:'0'});
    set('main.wrap',{background:color('bg'),width:'100%','max-width':'none',margin:'0px',padding:'8px','box-sizing':'border-box'});
    set('.discover-head',{position:'relative',display:'flex','flex-direction':'column',height:'calc(100dvh - 16px)','min-height':'260px',margin:'0px',padding:'0px',border:'0px',background:color('bg'),'box-shadow':'none',gap:'10px','box-sizing':'border-box'});
    set('.ma-native-chat-toolbar',{display:'block',position:'relative',height:'44px','min-height':'44px','flex-shrink':'0'});
    set('.jonas-top-history,#jonas-header-new-chat',{display:'inline-flex',position:'absolute',top:'0px',left:'auto',right:'auto',width:'calc(50% - 4px)','min-width':'0px','min-height':'44px',height:'44px','max-height':'44px',margin:'0px',padding:'8px',background:color('surface'),color:color('text'),border:'1px solid rgba(255, 255, 255, 0.08)','border-radius':'14px',font:'600 12px/1.2 system-ui','box-sizing':'border-box','justify-content':'center','align-items':'center',gap:'6px','z-index':'2'});
    set('.jonas-top-history',{'inset-inline-start':'0px','inset-inline-end':'auto'});
    set('#jonas-header-new-chat',{'inset-inline-end':'0px','inset-inline-start':'auto'});
    set('#chat-log',{display:'flex','flex-direction':'column',background:color('bg'),flex:'1 1 0%','min-height':'0px','max-height':'none','overflow-y':'auto',margin:'0px',padding:'4px','overscroll-behavior':'contain'});
    set('.newsearch-row',{'flex-shrink':'0',position:'static',margin:'0px',padding:'0px',width:'100%'});
    set('.composer',{display:'grid','grid-template-columns':'minmax(0, 1fr) 44px auto',gap:'6px',padding:'6px',background:color('field'),border:'1px solid rgba(209, 180, 245, 0.24)','border-radius':'20px','box-sizing':'border-box'});
    set('#discover-new-input',{'min-width':'0px',width:'100%','min-height':'44px','max-height':'96px',margin:'0px',padding:'11px 10px',border:'0px',background:'transparent',font:'400 14px/1.5 system-ui','box-sizing':'border-box'});
    set('.composer-send,#mic-btn-discover',{'min-height':'44px',height:'44px',margin:'0px',padding:'8px 12px','border-radius':'14px',font:'700 12px/1.2 system-ui'});
    set('.newsearch-row p',{font:'400 11px/1.4 system-ui',margin:'6px 4px',color:color('muted')});
    set('.ma-native-chat-guide',{margin:'12px 8px',padding:'12px',background:color('surface'),'border-radius':'16px',font:'500 12px/1.5 system-ui'});
    set('#chat-log :is(.chat-answer-text,.chat-message,.ai-message)',{color:color('text')});
    set('#discover-new-input',{color:color('text')});
    set('.composer-send,#mic-btn-discover',{background:color('surface'),color:color('text')});
    if(doc.body.classList.contains('ai-sidebar-open'))set('.ai-sidebar',{display:'flex',position:'fixed',inset:'8px',width:'auto','max-width':'none','max-height':'none','z-index':'2147483500'});
    else {const side=doc.querySelector('.ai-sidebar');if(side?.style.getPropertyValue('z-index')==='2147483500')['display','position','inset','width','max-width','max-height','z-index'].forEach(k=>side.style.removeProperty(k))}
    if(!doc.documentElement.dataset.maCinemaFrame){
      doc.documentElement.dataset.maCinemaFrame='1';
      let queued=false;
      // Speech highlights change a word's class many times per second. Only
      // new controls/results and the body's sidebar state need a layout pass.
      const observer=new frame.contentWindow.MutationObserver(records=>{if(queued||!shouldPolishJonasFrame(records,doc.body))return;queued=true;requestAnimationFrame(()=>{queued=false;if(frame.isConnected)polishJonasFrame()})});
      observer.observe(doc.documentElement,{childList:true,subtree:true});
      observer.observe(doc.body,{attributes:true,attributeFilter:['class']});
      frame.addEventListener('load',()=>observer.disconnect(),{once:true});
    }
  }
  let watchedJonasPanel=null,jonasPanelObserver=null,jonasFramePending=false;
  function enforceJonasFullscreen(){
    const panel=qs('#ma-ambient-panel');if(!panel)return;
    if(panel!==watchedJonasPanel){
      jonasPanelObserver?.disconnect();watchedJonasPanel=panel;
      jonasPanelObserver=new MutationObserver(()=>{
        if(jonasFramePending)return;jonasFramePending=true;
        requestAnimationFrame(()=>{jonasFramePending=false;enforceJonasFullscreen()});
      });
      jonasPanelObserver.observe(panel,{attributes:true,attributeFilter:['style','hidden']});
    }
    if(panel.hidden)return;
    polishJonasFrame();
    const vv=window.visualViewport,inset=8;
    const width=Math.round(vv?.width||window.innerWidth),height=Math.round(vv?.height||window.innerHeight);
    const props={position:'fixed',left:((vv?.offsetLeft||0)+inset)+'px',right:'auto',top:((vv?.offsetTop||0)+inset)+'px',bottom:'auto',width:Math.max(1,width-inset*2)+'px',height:Math.max(1,height-inset*2)+'px','max-width':'none','max-height':'none','min-height':'0px',margin:'0px',padding:'0px',transform:'none','border-radius':'24px',display:'flex','flex-direction':'column','z-index':'2147483500',background:'var(--ma-native-bg)'};
    Object.entries(props).forEach(([k,v])=>{if(panel.style.getPropertyValue(k)!==v||panel.style.getPropertyPriority(k)!=='important')panel.style.setProperty(k,v,'important')});
    panel.setAttribute('aria-modal','true');
  }

  function polishErrorBubble(){
    const bubble=qs('#ma-error-notice');if(!bubble)return;
    const panel=qs('#ma-ambient-panel'),panelOpen=panel&&!panel.hidden;
    const imp=(el,key,value)=>el&&el.style.setProperty(key,value,'important');
    if(panelOpen){
      bubble.dataset.maJonasFixed='1';
      imp(bubble,'position','fixed');imp(bubble,'z-index','2147483600');
      imp(bubble,'left','12px');imp(bubble,'right','12px');imp(bubble,'top','82px');
      imp(bubble,'width','auto');imp(bubble,'max-width','none');imp(bubble,'margin','0');
    }else if(bubble.dataset.maJonasFixed==='1'){
      ['position','z-index','left','right','top','width','max-width','margin'].forEach(k=>bubble.style.removeProperty(k));
      delete bubble.dataset.maJonasFixed;
    }
    imp(bubble,'padding','10px 46px 10px 12px');imp(bubble,'border-radius','18px');
    imp(bubble,'background','rgba(28,22,38,.97)');imp(bubble,'color','#f4d7a4');
    imp(bubble,'border','1px solid rgba(215,183,117,.55)');imp(bubble,'box-shadow','0 12px 36px rgba(0,0,0,.42)');
    imp(bubble,'font-size','12px');imp(bubble,'line-height','1.38');
    const x=bubble.querySelector('.ma-error-close');
    if(x){imp(x,'position','absolute');imp(x,'right','8px');imp(x,'top','8px');imp(x,'width','32px');imp(x,'height','32px');imp(x,'min-width','32px');imp(x,'min-height','32px');imp(x,'padding','0');imp(x,'margin','0');imp(x,'border-radius','50%');imp(x,'background','#a11f35');imp(x,'color','#fff');imp(x,'border','1px solid rgba(255,125,136,.7)');}
  }
  function addRedClose(){
    const modal=qs('#main-auth-modal');if(!modal)return;
    const box=modal.querySelector('.auth-box,.auth-modal-content,.modal-content,.premium-card')||modal.firstElementChild;if(!box)return;
    const old=modal.querySelector('.auth-close');
    let x=old||modal.querySelector('.ma-android-auth-x');
    if(old)qsa('.ma-android-auth-x',modal).filter(e=>e!==old).forEach(e=>e.remove());
    if(!x){x=document.createElement('button');x.type='button';x.textContent='×';x.onclick=()=>window.closeAuthModal?.();box.appendChild(x)}
    x.classList.add('ma-android-auth-x');x.setAttribute('aria-label',t().close);
    const offer=modal.querySelector('#ma-welcome-offer');
    if(offer){
      let fold=offer.closest('.ma-auth-offer-fold');
      if(!fold){fold=document.createElement('details');fold.className='ma-auth-offer-fold';const summary=document.createElement('summary');fold.append(summary);offer.before(fold);fold.append(offer)}
      const label=offer.querySelector('#ma-bonus-headline')?.textContent.trim();if(label&&fold.firstElementChild.textContent!==label)fold.firstElementChild.textContent=label;
      fold.hidden=offer.hidden||offer.style.display==='none';
    }
    const set=(el,props)=>Object.entries(props).forEach(([k,v])=>{if(el.style.getPropertyValue(k)!==v||el.style.getPropertyPriority(k)!=='important')el.style.setProperty(k,v,'important')});
    set(modal,{'z-index':'2147483550','box-sizing':'border-box',padding:'16px','align-items':'center','justify-content':'center'});
    set(box,{position:'relative',width:'100%','max-width':'520px','max-height':'calc(100dvh - 32px)','box-sizing':'border-box','overflow-y':'auto',margin:'0px',padding:'20px','border-radius':'24px',background:'var(--ma-native-surface)'});
    set(x,{position:'sticky',float:'inline-end',margin:'0px 0px 8px 12px',right:'0px',top:'0px','z-index':'4',width:'44px',height:'44px','min-height':'44px','border-radius':'50%',background:'var(--ma-native-close)',color:'var(--ma-native-close-text)',border:'1px solid rgba(243, 140, 157, 0.25)'});
  }

  function paintMatchOverlay(){
    const l=lang(),chrome=androidChromeCopy[l]||androidChromeCopy[l.split('-')[0]]||androidChromeCopy.en;
    const c=overlayCopy(),launch=qs('#ma-android-match-launch'),modal=qs('#ma-android-match-modal');
    if(launch){
      const h=launch.querySelector('h2'),p=launch.querySelector('p'),b=launch.querySelector('.mam-open');
      if(h&&h.textContent!==chrome.matchTitle)h.textContent=chrome.matchTitle;
      if(p&&p.textContent!==c.sub)p.textContent=c.sub;
      if(b&&b.textContent!==c.cta)b.textContent=c.cta;
    }
    if(modal){
      const h=modal.querySelector('header strong'),x=modal.querySelector('.mam-x'),close=t().close;
      if(h&&h.textContent!==c.modal)h.textContent=c.modal;
      if(x&&x.getAttribute('aria-label')!==close)x.setAttribute('aria-label',close);
    }
  }
  function watchMatchPresentation(host,onReveal){
    let submitted=false,finished=false;const beforeSubmit=new Map();
    const visible=node=>node&&!node.hidden&&getComputedStyle(node).display!=='none'&&getComputedStyle(node).visibility!=='hidden';
    const check=()=>{if(submitted&&!finished&&[qs('#loading-box'),qs('#result-box')].some(node=>visible(node)&&!beforeSubmit.get(node))){finished=true;onReveal()}};
    const submit=event=>{if(event.target.closest('.gold-btn.ma-primary')){[qs('#loading-box'),qs('#result-box')].filter(Boolean).forEach(node=>beforeSubmit.set(node,visible(node)));submitted=true;queueMicrotask(check)}};
    const observer=new MutationObserver(check);
    [qs('#loading-box'),qs('#result-box')].filter(Boolean).forEach(node=>observer.observe(node,{attributes:true,attributeFilter:['style','hidden','class']}));
    host.addEventListener('click',submit,true);
    const matched=()=>{if(submitted&&!finished){finished=true;onReveal()}};
    document.addEventListener('matchapp:newmatch',matched);
    return()=>{finished=true;observer.disconnect();host.removeEventListener('click',submit,true);document.removeEventListener('matchapp:newmatch',matched)};
  }
  function installMatchOverlay(){
    if(qs('#ma-android-match-launch')||!qs('#questionnaire-box'))return;
    const box=qs('#questionnaire-box');
    const marker=document.createComment('ma-questionnaire-home-anchor');
    box.parentNode.insertBefore(marker,box);
    const launch=document.createElement('section');
    launch.id='ma-android-match-launch';
    launch.innerHTML='<div class="mam-copy"><small>MatchApp Ai</small><h2></h2><p></p></div><button type="button" class="mam-open"></button>';
    marker.parentNode.insertBefore(launch,marker.nextSibling);
    paintMatchOverlay();
    box.hidden=true;
    box.style.setProperty('display','none','important');
    const open=()=>{
      if(qs('#ma-android-match-modal'))return;
      const host=document.createElement('div');host.id='ma-android-match-modal';host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label',overlayCopy().modal);
      host.innerHTML='<section class="mam-card"><header><div><small>MatchApp Ai</small><strong></strong></div><button type="button" class="mam-x" aria-label="'+t().close+'">×</button></header><div class="mam-body"></div></section>';
      host.querySelector('strong').textContent=overlayCopy().modal;
      const body=host.querySelector('.mam-body');
      box.hidden=false;box.style.removeProperty('display');body.appendChild(box);
      const previousFocus=document.activeElement,previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
      let closed=false,stopWatching=()=>{};
      const close=(revealing=false)=>{if(closed)return;closed=true;stopWatching();document.body.style.overflow=previousOverflow;if(revealing!==true)previousFocus?.focus?.({preventScroll:true});box.hidden=true;box.style.setProperty('display','none','important');marker.parentNode.insertBefore(box,marker.nextSibling);host.remove()};
      stopWatching=watchMatchPresentation(host,()=>close(true));
      host.querySelector('.mam-x').onclick=close;
      host.addEventListener('click',e=>{if(e.target===host)close()});
      document.body.appendChild(host);
      requestAnimationFrame(()=>{host.classList.add('is-open');host.querySelector('.mam-x').focus({preventScroll:true})});
      host.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}});
    };
    launch.querySelector('.mam-open').onclick=open;
    document.addEventListener('click',e=>{
      const target=e.target?.closest?.('a[href="#questionnaire-box"],button[data-target="#questionnaire-box"],[data-scroll-target="#questionnaire-box"]');
      if(target){e.preventDefault();open()}
    },true);
  }
  function authIntent(){
    document.addEventListener('submit',e=>{const id=e.target?.id;if(id==='form-login'||id==='form-signup')sessionStorage.setItem('ma_android_auth_flow',id==='form-login'?'login':'signup')},true);
    document.addEventListener('click',e=>{const modal=e.target?.closest?.('#main-auth-modal');if(!modal)return;const form=qs('#form-signup',modal);const signup=qs('#tab-signup.active',modal)||(form&&!form.hidden&&getComputedStyle(form).display!=='none');sessionStorage.setItem('ma_android_auth_flow',signup?'signup':'login')},true);
  }
  function cleanupOnboardingParam(){
    const u=new URL(location.href);if(!u.searchParams.has('maAndroidOnboarding'))return;u.searchParams.delete('maAndroidOnboarding');history.replaceState(null,'',u.pathname+u.search+u.hash);
  }
  function nudge(){
    if(qs('.mao-nudge'))return;const n=document.createElement('div');n.className='mao-nudge';n.innerHTML='<img alt=""><span></span><button type="button" aria-label="'+t().close+'">×</button>';n.querySelector('img').src=LOGO;n.querySelector('span').textContent=t().nudge;n.onclick=e=>{if(e.target.tagName!=='BUTTON'){n.remove();openOnboarding()}};n.querySelector('button').onclick=e=>{e.stopPropagation();n.remove()};document.body.appendChild(n);
  }
  window.MatchAppAndroidOnboardingNudge=nudge;
  function finishOnboarding(host){
    host.querySelector('.mao-card').innerHTML='<section class="mao-done"><div><img alt=""><h3></h3><p></p><button type="button" class="mao-enter"></button></div></section>';
    const d=host.querySelector('.mao-done');d.querySelector('img').src=LOGO;d.querySelector('h3').textContent=t().done;d.querySelector('p').textContent=t().doneSub;d.querySelector('button').textContent=t().enter;d.querySelector('button').onclick=()=>{host.remove();sessionStorage.removeItem('ma_android_onboarding_pending');location.href=HOME};
  }
  function configureProfileFrame(frame,host){
    let doc,win;try{doc=frame.contentDocument;win=frame.contentWindow}catch(_){return false}if(!doc||!win||!doc.documentElement)return false;
    if(doc.documentElement.dataset.maAndroidOnboardingFrame==='1')return true;
    doc.documentElement.dataset.maAndroidOnboardingFrame='1';
    const css=doc.createElement('style');css.textContent=`
      html,body{background:#0b0b10!important;min-height:100%!important}body{padding:0!important}
      .app-header,.profile-hub,footer,.pf-support,.portfolio-tabs,.profile-security-card,.container>[data-matchapp-pro-entry],.container>.premium-card:not(#account-details),#activity-panel{display:none!important}
      .main-layout,.container{max-width:none!important;width:100%!important;margin:0!important;padding:12px!important}
      #account-details{display:block!important;margin:0!important;padding:14px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
      #account-details>h3,#account-details>.pf-card-sub{margin-left:2px!important}
      #editable-fields-section{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
      #editable-fields-section .input-group{margin:0!important}#editable-fields-section label{margin:0 0 5px!important}
      #save-profile-btn{width:100%!important;margin:12px 0 2px!important}
      #taste-quiz{margin:0!important;padding:2px 0 0!important;background:transparent!important;border:0!important;box-shadow:none!important}
      #taste-quiz>h2{margin:4px 0 6px!important;font-size:22px!important}.taste-lead{margin-bottom:10px!important}
      #taste-form{display:block!important}.taste-q{display:none!important;margin:0!important;padding:12px!important;border:1px solid rgba(183,60,255,.28)!important;border-radius:18px!important;background:rgba(183,60,255,.055)!important}.taste-q.mao-current{display:block!important}
      .taste-q-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}.taste-choice{min-height:48px!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:14px!important;background:#17131f!important;padding:9px!important;margin:0!important}
      .mao-quiz-nav{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin:12px 0 4px}.mao-quiz-nav button{min-height:44px;border-radius:999px;border:1px solid rgba(183,60,255,.3);background:#21162f;color:#fff;font-weight:800}.mao-quiz-nav button:last-child{background:linear-gradient(135deg,#b73cff,#ff3da7);border:0}.mao-progress{text-align:center;color:#baafd0;font-size:12px}
      #taste-save{display:none!important;width:100%!important;margin:12px 0 0!important;background:linear-gradient(135deg,#b73cff,#ff3da7)!important;color:#fff!important}.mao-final #taste-save{display:block!important}
      @media(max-width:620px){#editable-fields-section,.taste-q-grid{grid-template-columns:1fr!important}.main-layout,.container{padding:10px!important}#account-details{padding:10px!important}}
    `;doc.head.appendChild(css);
    function keepFrameFocused(){
      const account=doc.getElementById('account-details');
      if(account){
        if(account.hidden)account.hidden=false;
        if(!account.classList.contains('profile-hub-open'))account.classList.add('profile-hub-open');
        if(account.style.getPropertyValue('display')!=='block'||account.style.getPropertyPriority('display')!=='important')account.style.setProperty('display','block','important');
      }
      qsa('.app-header,.profile-hub,footer,.pf-support,.portfolio-tabs,.profile-security-card,.container>[data-matchapp-pro-entry],.container>.premium-card:not(#account-details),#activity-panel',doc).forEach(el=>{
        if(el.style.getPropertyValue('display')!=='none'||el.style.getPropertyPriority('display')!=='important')el.style.setProperty('display','none','important');
      });
    }
    keepFrameFocused();
    const frameObserver=new win.MutationObserver(keepFrameFocused);
    frameObserver.observe(doc.documentElement,{attributes:true,childList:true,subtree:true,attributeFilter:['hidden','class','style']});
    frame.addEventListener('load',()=>frameObserver.disconnect(),{once:true});
    const setup=()=>{
      const quiz=doc.getElementById('taste-quiz');if(!quiz)return false;
      const fields=qsa('.taste-q',quiz);if(!fields.length)return false;
      let index=0;const nav=doc.createElement('div');nav.className='mao-quiz-nav';nav.innerHTML='<button type="button"></button><span class="mao-progress"></span><button type="button"></button>';quiz.insertBefore(nav,quiz.querySelector('#taste-save'));
      const prev=nav.children[0],progress=nav.children[1],next=nav.children[2];prev.textContent=t().prev;next.textContent=t().next;
      const render=()=>{fields.forEach((f,i)=>f.classList.toggle('mao-current',i===index));progress.textContent=t().question+' '+(index+1)+' '+t().of+' '+fields.length;prev.style.visibility=index?'visible':'hidden';next.textContent=index===fields.length-1?'✓':t().next;quiz.classList.toggle('mao-final',index===fields.length-1);};
      const valid=()=>!!fields[index].querySelector('input:checked');
      prev.onclick=()=>{if(index>0){index--;render()}};
      next.onclick=()=>{if(!valid()){const st=quiz.querySelector('.taste-status');if(st)st.hidden=false;return}if(index<fields.length-1){index++;render()}else quiz.querySelector('#taste-save')?.click()};
      quiz.querySelector('#taste-save')?.addEventListener('click',()=>setTimeout(()=>{try{const st=JSON.parse(win.localStorage.getItem('match_taste')||'{}');if(st.done)finishOnboarding(host)}catch(_){}},500));
      render();
      const locked=()=>win.localStorage.getItem('match_profile_locked')==='true';
      if(!locked()){quiz.hidden=true;const timer=setInterval(()=>{if(!document.body.contains(host)){clearInterval(timer);return}if(locked()){clearInterval(timer);quiz.hidden=false;quiz.scrollIntoView({block:'start',behavior:'smooth'})}},350)}
      else quiz.hidden=false;
      return true;
    };
    if(!setup()){let tries=0;const timer=setInterval(()=>{if(setup()||++tries>30)clearInterval(timer)},250)}
  }
  function openOnboarding(){
    cleanupOnboardingParam();
    const c=t();
    if(window.MatchAppNativeOnboarding?.open){
      window.MatchAppNativeOnboarding.open(
        c.title,c.sub,c.done,c.doneSub,c.enter,c.close,
        c.prev,c.next,c.question,c.of,c.save||'',c.signedOut||''
      );
      return;
    }
    if(qs('#ma-android-onboarding'))return;
    const host=document.createElement('div');host.id='ma-android-onboarding';host.innerHTML='<section class="mao-card"><header class="mao-head"><img class="mao-logo" alt=""><div><h2></h2><p></p></div><button class="mao-x" type="button" aria-label="'+c.close+'">×</button></header><iframe class="mao-frame" title="'+c.title+'"></iframe></section>';
    host.querySelector('.mao-logo').src=LOGO;host.querySelector('h2').textContent=c.title;host.querySelector('p').textContent=c.sub;host.querySelector('.mao-x').onclick=()=>{host.remove();nudge()};host.addEventListener('click',e=>{if(e.target===host){host.remove();nudge()}});document.body.appendChild(host);
    const frame=host.querySelector('iframe');frame.addEventListener('load',()=>configureProfileFrame(frame,host));frame.src='/profile/profile.html?maAndroidFrame=1';
  }
  function routeVerifiedSignup(){
    const u=new URL(location.href);
    const pending=sessionStorage.getItem('ma_android_onboarding_pending')==='1';
    const topProfile=location.pathname==='/profile/profile.html'&&!u.searchParams.has('maAndroidFrame')&&!u.searchParams.has('maAndroidNativeOnboarding');
    if(topProfile&&(u.searchParams.get('welcome')==='verified'||pending)){
      sessionStorage.setItem('ma_android_onboarding_pending','1');
      location.replace('/?maAndroidOnboarding=1');
      return true;
    }
    return false;
  }
  function boot(){
    installStyle();applyBrand();markRails();mountAppearance();mountStudioGames();compactPhoneHeader();polishCinemaPosters();polishCinemaSurfaces();paintAndroidChrome();addRedClose();installMatchOverlay();authIntent();
    [120,420,1000,2200].forEach(ms=>setTimeout(schedulePremiumRefresh,ms));
    if(routeVerifiedSignup())return;
    const u=new URL(location.href);if((location.pathname==='/'||location.pathname==='/index.html')&&u.searchParams.get('maAndroidOnboarding')==='1'){sessionStorage.setItem('ma_android_onboarding_pending','1');setTimeout(openOnboarding,500)}
    const openMatchRoute=()=>{if(location.hash==='#questionnaire-box'&&!qs('#ma-android-match-modal'))setTimeout(()=>qs('#ma-android-match-launch .mam-open')?.click(),140)};
    openMatchRoute();
    window.addEventListener('hashchange',openMatchRoute);
    document.addEventListener('matchapp:authchange',e=>{if(!e.detail?.signedIn)return;const flow=sessionStorage.getItem('ma_android_auth_flow');if(flow==='login'){sessionStorage.removeItem('ma_android_auth_flow');if(location.pathname!==HOME&&location.pathname!=='/index.html')location.replace(HOME);else window.closeAuthModal?.();return}if(flow==='signup'){sessionStorage.removeItem('ma_android_auth_flow');sessionStorage.setItem('ma_android_onboarding_pending','1');if(location.pathname!==HOME&&location.pathname!=='/index.html')location.replace('/?maAndroidOnboarding=1');else setTimeout(openOnboarding,450)}});
    document.addEventListener('matchapp:profilehydrated',()=>{if(sessionStorage.getItem('ma_android_onboarding_pending')==='1'&&(location.pathname===HOME||location.pathname==='/index.html'))setTimeout(openOnboarding,250)});
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('#ma-ambient-jonas')){requestAnimationFrame(enforceJonasFullscreen);setTimeout(enforceJonasFullscreen,80);setTimeout(enforceJonasFullscreen,220)}
      if(e.target?.closest?.('#ma-ambient-panel .ja-close'))setTimeout(schedulePremiumRefresh,80);
    },true);
    window.addEventListener('resize',enforceJonasFullscreen,{passive:true});
    window.addEventListener('resize',schedulePremiumRefresh,{passive:true});
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',schedulePremiumRefresh);
    window.visualViewport?.addEventListener('resize',enforceJonasFullscreen,{passive:true});
    window.visualViewport?.addEventListener('scroll',enforceJonasFullscreen,{passive:true});
    ['matchapp:langchange','matchapp:languagechange'].forEach(name=>document.addEventListener(name,()=>setTimeout(schedulePremiumRefresh,0)));
    document.addEventListener('matchapp:settingschanged',schedulePremiumRefresh);
    document.addEventListener('toggle',event=>{if(event.target.matches?.('.ma-cinema-tools,.ref-explore-tools,.ma-reference-header-tools'))schedulePremiumRefresh()},true);
    new MutationObserver(schedulePremiumRefresh).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    window.addEventListener('storage',e=>{if(e.key==='match_lang')setTimeout(schedulePremiumRefresh,0)});
    new MutationObserver(refreshForStructuralChanges).observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
