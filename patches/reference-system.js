/* Shared cinematic presentation. Existing matching, account and AI handlers remain authoritative. */
(function () {
  'use strict';
  if (window.MatchCinemaShell || /^\/(kids|private-voice|oauth|android-studio)(\/|$)/.test(location.pathname) || /\/(callback|confirm)\.html$/.test(location.pathname)) return;
  document.documentElement.classList.add('ma-reference');
  if (window.top===window) document.documentElement.setAttribute('data-ma-jonas-header','pending');
  if (window.top===window && !window.MatchAppReferenceHeader && !document.querySelector('script[data-cinema-header]')) {
    var headerScript=document.createElement('script');headerScript.src='/patches/reference-header.js?v=20261020-header1&polish=20261020-ui1&launcher=20261020-1';headerScript.dataset.cinemaHeader='';headerScript.defer=true;document.head.appendChild(headerScript);
  }
  if (window.top===window && !window.MatchAppReferenceDock && !document.querySelector('script[data-cinema-signature-dock]')) {
    var dockScript=document.createElement('script');dockScript.src='/patches/reference-dock.js?v=20261020-dock1';dockScript.dataset.cinemaSignatureDock='';dockScript.defer=true;document.head.appendChild(dockScript);
  }
  // Appearance follows the saved preference on every shared page. The existing
  // Settings engine still owns previews/saving; this bridge never writes storage.
  function savedPalette() {
    try {
      var id=JSON.parse(localStorage.getItem('match_settings')||'{}').theme;
      return ['aurora','cinema','ocean','sunrise','arcade'].indexOf(id)!==-1?id:'aurora';
    } catch (_) { return 'aurora'; }
  }
  function syncPalette() {
    if (window.MatchThemes && typeof window.MatchThemes.current==='function' && window.MatchThemes.current().preview) return;
    var id=savedPalette();
    if(document.documentElement.dataset.theme!==id)document.documentElement.dataset.theme=id;
  }
  function syncFontScale() {
    // A page with the canonical Settings engine keeps its live preference owner.
    if (window.MatchSettings) return;
    var scale=1;
    try {
      var saved=JSON.parse(localStorage.getItem('match_settings')||'{}');
      var value=saved && saved.fontScale;
      // Same allowed range as the existing Profile text-size control.
      if(typeof value==='number' && Number.isFinite(value) && value>=0.85 && value<=1.4)scale=value;
    } catch (_) {}
    var text=String(scale);
    if(document.documentElement.style.getPropertyValue('--font-scale')!==text)document.documentElement.style.setProperty('--font-scale',text);
  }
  function syncAppearance() { syncPalette(); syncFontScale(); }
  syncAppearance();
  document.addEventListener('matchapp:settingschanged',syncAppearance);
  window.addEventListener('storage',function(event){if(event.key==='match_settings'||event.key===null)syncAppearance();});
  if (!window.MatchAppTextPills && !document.querySelector('script[data-cinema-pills]')) {
    var pillScript=document.createElement('script');pillScript.src='/patches/reference-pills.js?v=20261020-pills1';pillScript.dataset.cinemaPills='';pillScript.defer=true;document.head.appendChild(pillScript);
  }
  if (!window.MatchAppDialogs && !document.querySelector('script[data-cinema-dialogs]')) {
    var dialogVersion='20261020-1';
    var dialogStyle=document.createElement('link');dialogStyle.rel='stylesheet';dialogStyle.href='/patches/reference-dialogs.css?v='+dialogVersion;document.head.appendChild(dialogStyle);
    var dialogScript=document.createElement('script');dialogScript.src='/patches/reference-dialogs.js?v='+dialogVersion;dialogScript.dataset.cinemaDialogs='';dialogScript.defer=true;document.head.appendChild(dialogScript);
  }
  // Local review prototype: keep the motion layer isolated from legacy engines.
  if (!document.querySelector('script[data-cinema-motion]')) {
    var motionStyle=document.createElement('link');motionStyle.rel='stylesheet';motionStyle.href='/patches/reference-motion.css?v=20261020-motion1';document.head.appendChild(motionStyle);
    var motionScript=document.createElement('script');motionScript.src='/patches/reference-motion.js?v=20261020-motion1';motionScript.dataset.cinemaMotion='';motionScript.defer=true;document.head.appendChild(motionScript);
  }
  if (!document.querySelector('script[data-cinema-density]')) {
    var densityStyle=document.createElement('link');densityStyle.rel='stylesheet';densityStyle.href='/patches/reference-density.css?v=20261020-grid1';document.head.appendChild(densityStyle);
    var densityScript=document.createElement('script');densityScript.src='/patches/reference-density.js?v=20261020-grid1';densityScript.dataset.cinemaDensity='';densityScript.defer=true;document.head.appendChild(densityScript);
  }
  var labels = {
    en: ['Home','Explore','Matches','My List','Profile','Search','Top Titles','View all','Explore more','Find Your Perfect Match'],
    pt: ['Início','Explorar','Matches','Minha lista','Perfil','Pesquisar','Principais títulos','Ver todos','Explore mais','Encontre seu match perfeito'],
    es: ['Inicio','Explorar','Matches','Mi lista','Perfil','Buscar','Títulos destacados','Ver todos','Explora más','Encuentra tu match perfecto'],
    fr: ['Accueil','Explorer','Matches','Ma liste','Profil','Rechercher','Titres à la une','Tout voir','Explorer plus','Trouvez votre match idéal'],
    de: ['Start','Entdecken','Matches','Meine Liste','Profil','Suchen','Top-Titel','Alle ansehen','Mehr entdecken','Finde deinen perfekten Match'],
    it: ['Home','Esplora','Match','La mia lista','Profilo','Cerca','Titoli in evidenza','Vedi tutti','Esplora di più','Trova il tuo match perfetto'],
    tr: ['Ana sayfa','Keşfet','Eşleşmeler','Listem','Profil','Ara','Öne çıkanlar','Tümünü gör','Daha fazlasını keşfet','Mükemmel eşleşmeni bul'],
    ru: ['Главная','Обзор','Подборки','Мой список','Профиль','Поиск','Лучшие произведения','Смотреть все','Откройте больше','Найдите идеальный вариант'],
    ar: ['الرئيسية','استكشف','اقتراحات','قائمتي','الملف الشخصي','بحث','أبرز الأعمال','عرض الكل','اكتشف المزيد','اعثر على اختيارك المثالي'],
    hi: ['होम','खोजें','मैच','मेरी सूची','प्रोफ़ाइल','खोज','प्रमुख शीर्षक','सभी देखें','और खोजें','अपना बेहतरीन मैच खोजें'],
    id: ['Beranda','Jelajahi','Pilihan','Daftarku','Profil','Cari','Judul unggulan','Lihat semua','Jelajahi lainnya','Temukan pilihan sempurnamu'],
    ja: ['ホーム','見つける','マッチ','マイリスト','プロフィール','検索','注目の作品','すべて見る','もっと見る','ぴったりの作品を見つけよう'],
    ko: ['홈','둘러보기','추천','내 목록','프로필','검색','인기 작품','모두 보기','더 둘러보기','나에게 딱 맞는 작품 찾기'],
    zh: ['首页','探索','匹配','我的片单','个人资料','搜索','热门作品','查看全部','探索更多','找到你的完美之选']
  };
  var extraLabels = {
    en:['App controls','Quick choices','How to use'],pt:['Controles do app','Escolhas rápidas','Como usar'],es:['Controles de la app','Opciones rápidas','Cómo usar'],
    fr:['Commandes de l’app','Choix rapides','Mode d’emploi'],de:['App-Steuerung','Schnellauswahl','So funktioniert’s'],it:['Controlli dell’app','Scelte rapide','Come si usa'],
    tr:['Uygulama kontrolleri','Hızlı seçimler','Nasıl kullanılır'],ru:['Управление приложением','Быстрый выбор','Как пользоваться'],ar:['أدوات التطبيق','خيارات سريعة','طريقة الاستخدام'],
    hi:['ऐप नियंत्रण','त्वरित विकल्प','कैसे इस्तेमाल करें'],id:['Kontrol aplikasi','Pilihan cepat','Cara menggunakan'],ja:['アプリの操作','クイック選択','使い方'],ko:['앱 설정','빠른 선택','사용 방법'],zh:['应用控制','快捷选择','使用方法']
  };
  Object.keys(labels).forEach(function(key){labels[key]=labels[key].concat(extraLabels[key]);});
  var names = ['home','explore','matches','list','profile','search','titles','all','more','matchTitle','controls','quick','help'];
  var paths = ['/', '/explore.html', '/#questionnaire-box', '/profile/profile.html#tab-watchlater', '/profile/profile.html'];
  var icons = [
    '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',
    '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5z"/>',
    '<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/>',
    '<path d="M6 3h12v19l-6-4-6 4z"/>',
    '<circle cx="12" cy="7" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2z"/>'
  ];
  function svg(content) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + content + '</svg>'; }
  function copy(node, key) { node.dataset.cinemaCopy = key; return node; }
  function link(href, key, cls) { var a = document.createElement('a'); a.href = href; a.className = cls || ''; copy(a,key); return a; }
  function language() {
    var value = window.MATCH_LANG || document.documentElement.lang || 'en';
    return String(value).toLowerCase().split('-')[0];
  }
  function current() {
    var p = location.pathname;
    if (p === '/' || p === '/index.html') return location.hash === '#questionnaire-box' ? 'matches' : 'home';
    if (p === '/profile/profile.html') return location.hash === '#tab-watchlater' ? 'list' : 'profile';
    return 'explore';
  }
  function paint() {
    var words = labels[language()] || labels.en;
    document.querySelectorAll('[data-cinema-copy]').forEach(function (node) {
      var value = words[names.indexOf(node.dataset.cinemaCopy)];
      if (!value) return;
      if (node.dataset.cinemaIconOnly === 'true') { node.setAttribute('aria-label',value); node.title=value; }
      else {node.textContent = value;if(node.classList.contains('ma-cinema-help')){node.setAttribute('aria-label',value);node.title=value;}}
    });
    document.querySelectorAll('.ma-cinema-dock [data-cinema-route]').forEach(function (a) {
      var active = a.dataset.cinemaRoute === current();
      a.classList.toggle('is-active',active);
      if(active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
  }
  function revealHash() {
    if (!location.hash) return;
    var target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (_) { return; }
    if (!target) return;
    if (target.id === 'questionnaire-box') openMatch();
    var parent = target;
    while (parent && parent !== document.body) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
    if (/^tab-(history|watchlater|seenit|audio|notforme)$/.test(target.id) && typeof window.switchPortfolioTab === 'function') window.switchPortfolioTab(target.id.slice(4));
    if (target.id === 'settings-panel' || target.id === 'activity-panel' || target.id.indexOf('tab-') === 0) target.scrollIntoView?.({block:'start',behavior:'auto'});
  }
  function openMatch() {
    var section = document.getElementById('ma-concierge');
    if (!section || section.classList.contains('lazy-open')) return;
    var toggle = section.previousElementSibling;
    if (toggle && toggle.matches('.lazy-head[data-fold-key="concierge"]')) toggle.click();
  }
  function compactHomeControls() {
    if (!document.body.classList.contains('page-home')) return;
    var header = document.getElementById('mh-topbox');
    if (header && !header.querySelector('.ma-cinema-header-actions')) {
      var deck = header.querySelector('.mh-deck'), shortcuts = header.querySelector('.ma-luxe-shortcuts');
      // The dock and section links already own these destinations. Keep only
      // the distinct Kids/support actions in the compact utility panel.
      if(shortcuts)shortcuts.querySelectorAll('[data-ma-nav="0"],[data-ma-nav="1"],[data-ma-nav="2"],[data-ma-nav="4"],#ma-worlds-trigger').forEach(function(node){node.remove();});
      if (deck) {
        var actions = document.createElement('div'); actions.className='ma-cinema-header-actions';
        var search = deck.querySelector('.ma-cinema-search'); if(search) actions.appendChild(search);
        var details=document.createElement('details'); details.className='ma-cinema-tools';
        var summary=document.createElement('summary');
        summary.innerHTML=svg('<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/>');
        var caption=document.createElement('span'); copy(caption,'controls'); summary.appendChild(caption);
        details.appendChild(summary);
        var content=document.createElement('div'); content.className='ma-cinema-tools-content';
        content.appendChild(deck); if(shortcuts)content.appendChild(shortcuts); details.appendChild(content);actions.appendChild(details);header.appendChild(actions);
        header.classList.add('ma-cinema-header-compact');
        details.addEventListener('keydown',function(e){if(e.key==='Escape'){details.open=false;summary.focus();}});
        details.addEventListener('click',function(e){if(e.target.closest('#ma-worlds-trigger'))details.open=false;});
      }
    }
    var form=document.getElementById('questionnaire-box');
    var hero=document.querySelector('.home-hero');
    if(hero) {
      var footer=hero.querySelector('.ma-cinema-hero-footer');
      if(!footer){footer=document.createElement('div');footer.className='ma-cinema-hero-footer';var explore=hero.querySelector('.ma-cinema-hero-action');if(explore)footer.appendChild(explore);hero.appendChild(footer);}
      var guide=hero.querySelector('.ma-cinema-help');
      if(!guide){guide=header?.querySelector('.ma-how-button')||link('/how-it-works.html','help');guide.classList.add('ma-cinema-help');guide.removeAttribute('data-i18n');copy(guide,'help');footer.appendChild(guide);}
      header?.querySelectorAll('.ma-how-button').forEach(function(node){node.remove();});
    }
    // These are alternate renderers of the same three criteria. The draft has
    // one authoritative visible field per criterion, with all choices intact.
    if(form)form.querySelectorAll('.ma-quick,#matchapp-topic-shortcuts,#matchapp-topic-description,.ma-cinema-quick-choices').forEach(function(node){node.remove();});
    document.querySelectorAll('#ma-panel-match > .ma-together-link').forEach(function(node){node.remove();});
    document.querySelectorAll('#trending-rail .marquee-item:not([data-music-video])').forEach(function(tile){
      var image=tile.querySelector('img[data-title]');
      if(image && !tile.querySelector('.marquee-title')) {var caption=document.createElement('span');caption.className='marquee-title';caption.textContent=image.dataset.title;tile.appendChild(caption);}
    });
    paint();
  }
  function alignHomeGrid() {
    var layout=document.querySelector('body.page-home .main-layout'),content=layout?.querySelector(':scope > .container');
    if(!content||content.dataset.cinemaGrid==='1')return;
    content.dataset.cinemaGrid='1';var frame=0;
    function measure(){
      frame=0;var style=getComputedStyle(layout),box=layout.getBoundingClientRect(),inner=content.getBoundingClientRect();
      var tracks=style.gridTemplateColumns.split(' ').map(parseFloat),gap=parseFloat(style.columnGap)||0;
      var desktop=style.display==='grid'&&tracks.length===3&&tracks.every(Number.isFinite);
      // Existing sponsored columns/units keep their geometry. Only visual
      // panels fill the available content track (or the phone viewport).
      var width=desktop?tracks[1]:document.documentElement.clientWidth;
      var left=desktop?box.left+(parseFloat(style.paddingLeft)||0)+tracks[0]+gap:0;
      content.style.setProperty('--home-grid-width',width+'px');
      content.style.setProperty('--home-grid-offset',(left-inner.left)+'px');
    }
    function schedule(){if(!frame)frame=requestAnimationFrame(measure);}
    measure();window.addEventListener('resize',schedule,{passive:true});
    if('ResizeObserver'in window){var observer=new ResizeObserver(schedule);observer.observe(layout);}
    window.addEventListener('pagehide',function(){if(frame)cancelAnimationFrame(frame);observer?.disconnect();},{once:true});
  }
  function mount() {
    if (!document.body || document.querySelector('.ma-cinema-dock')) return;
    document.body.classList.add('ma-has-cinema-dock');
    var nav = document.createElement('nav'); nav.className = 'ma-cinema-dock'; nav.setAttribute('aria-label','MatchApp Ai');
    paths.forEach(function (path,i) {
      var a = document.createElement('a'); a.href = path; a.dataset.cinemaRoute = names[i];
      a.innerHTML = svg(icons[i]); var span = document.createElement('span'); copy(span,names[i]); a.appendChild(span); nav.appendChild(a);
    });
    document.body.appendChild(nav);
    var header = document.querySelector('#mh-topbox .mh-deck') || document.querySelector('.hub-header') || document.querySelector('.app-header nav') || document.querySelector('body > header');
    if (header && !header.querySelector('.ma-cinema-search')) {
      var search = link('/discover.html?focus=start','search','ma-cinema-search'); search.dataset.cinemaIconOnly='true';
      search.innerHTML = svg('<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 6 6"/>'); header.appendChild(search);
    }
    if (document.body.classList.contains('page-home')) {
      var hero = document.querySelector('.home-hero');
      if (hero && !hero.querySelector('.ma-cinema-hero-action')) {
        var action = link('/explore.html','more','ma-cinema-hero-action'); hero.appendChild(action);
      }
      var rail = document.getElementById('trending-rail');
      if (rail && !document.querySelector('.ma-cinema-section-heading')) {
        var row = document.createElement('div'); row.className='ma-cinema-section-heading';
        var title = document.createElement('h2'); copy(title,'titles'); row.appendChild(title);
        row.appendChild(link('/trending/this-week/','all')); rail.before(row);
      }
      var form = document.getElementById('questionnaire-box');
      if (form) {
        var title = form.querySelector('h2'); if(title) { title.removeAttribute('data-i18n'); copy(title,'matchTitle'); }
        form.querySelectorAll('select[id]').forEach(function (select) {
          var label = select.parentElement.querySelector('label'); if (label && !label.htmlFor) label.htmlFor = select.id;
        });
        var primary = form.querySelector('.q-grid--primary');
        if(primary) primary.querySelectorAll(':scope > div').forEach(function (row) {
          if(row.querySelector('#q-mood')) row.classList.add('ma-cinema-mood');
          if(row.querySelector('#q-category')) row.classList.add('ma-cinema-format');
          if(row.querySelector('#q-platform')) row.classList.add('ma-cinema-platform');
        });
      }
    }
    paint(); revealHash();
    requestAnimationFrame(revealHash);
    if (document.body.classList.contains('page-home')) requestAnimationFrame(function () {
      compactHomeControls();
      alignHomeGrid();
      if (!document.body.classList.contains('lazy-mode')) openMatch();
      if (location.hash === '#questionnaire-box') document.getElementById('questionnaire-box')?.scrollIntoView({block:'start',behavior:'auto'});
    });
  }
  window.MatchCinemaShell = {paint:paint,revealHash:revealHash,labels:labels};
  document.addEventListener('matchapp:langchange',function(){setTimeout(function(){paint();compactHomeControls();},0);});
  window.addEventListener('matchapp:languagechange',function(){setTimeout(function(){paint();compactHomeControls();},0);});
  window.addEventListener('hashchange',function(){revealHash();paint();});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
})();
