/* Mirror the current document's five existing navigation actions in native Material controls. */
(function () {
  'use strict';
  const bridge = window.MatchAppDestinationDock;
  if (window.top !== window || !bridge || window.__maNativeDock ||
      location.protocol !== 'https:' || !['matchapp.tv','www.matchapp.tv'].includes(location.hostname) ||
      /^\/(kids|oauth|private-voice|lumina-match|reelforge)(\/|$)/.test(location.pathname)) return;
  const root = document.documentElement;
  const slots = ['home','explore','matches','list','profile'];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let nav, timer, sent, restore, suspended=false;
  function schedule() {
    if(!suspended && window.document?.body?.isConnected && !timer) timer=requestAnimationFrame(publish);
  }

  const labelsObserver = new MutationObserver(schedule);
  const emptyWatchLater = {
    'en':'Your Watch Later portfolio is empty. Go match!',
    'pt-br':'Seu portfólio Ver Depois está vazio. Faça um match!',
    'es':'Tu lista Ver después está vacía. ¡Haz un match!',
    'fr':'Votre liste À regarder plus tard est vide. Lancez un match !',
    'de':'Deine Später-ansehen-Liste ist leer. Starte ein Match!',
    'it':'La tua lista Guarda più tardi è vuota. Fai un match!',
    'tr':'Daha Sonra İzle listen boş. Bir eşleşme başlat!',
    'ru':'Ваш список «Посмотреть позже» пуст. Найдите подборку!',
    'ar':'قائمة «المشاهدة لاحقًا» فارغة. ابدأ مطابقة!',
    'hi':'आपकी “बाद में देखें” सूची खाली है। एक मैच शुरू करें!',
    'id':'Daftar Tonton Nanti Anda kosong. Mulai pencocokan!',
    'ja':'「あとで見る」リストは空です。マッチを始めましょう！',
    'ko':'‘나중에 보기’ 목록이 비어 있습니다. 매치를 시작해 보세요!',
    'zh':'“稍后观看”列表为空。开始匹配吧！'
  };
  const emptySeen = {
    'en':"You haven't marked anything as seen yet.",
    'pt-br':'Você ainda não marcou nada como assistido.',
    'es':'Todavía no marcaste nada como visto.',
    'fr':"Vous n'avez encore rien marqué comme vu.",
    'de':'Du hast noch nichts als angesehen markiert.',
    'it':'Non hai ancora contrassegnato nulla come visto.',
    'tr':'Henüz hiçbir şeyi izlendi olarak işaretlemediniz.',
    'ru':'Вы пока ничего не отметили как просмотренное.',
    'ar':'لم تضع علامة «تمت المشاهدة» على أي شيء بعد.',
    'hi':'आपने अभी तक किसी चीज़ को देखा हुआ नहीं चिह्नित किया है।',
    'id':'Anda belum menandai apa pun sebagai sudah ditonton.',
    'ja':'視聴済みにした作品はまだありません。',
    'ko':'아직 시청 완료로 표시한 항목이 없습니다.',
    'zh':'你还没有将任何内容标记为已看。'
  };
  const emptyAudio = {
    'en':'No saved music, playlists, singles or podcasts yet.',
    'pt-br':'Nenhuma música, playlist, single ou podcast salvo ainda.',
    'es':'Aún no hay música, listas, singles ni podcasts guardados.',
    'fr':'Aucun morceau, playlist, single ou podcast enregistré pour le moment.',
    'de':'Noch keine Musik, Playlists, Singles oder Podcasts gespeichert.',
    'it':'Non hai ancora salvato musica, playlist, singoli o podcast.',
    'tr':'Henüz kaydedilmiş müzik, çalma listesi, single veya podcast yok.',
    'ru':'Пока нет сохранённой музыки, плейлистов, синглов или подкастов.',
    'ar':'لا توجد موسيقى أو قوائم تشغيل أو أغنيات منفردة أو بودكاست محفوظة بعد.',
    'hi':'अभी तक कोई संगीत, प्लेलिस्ट, सिंगल या पॉडकास्ट सेव नहीं किया गया है।',
    'id':'Belum ada musik, playlist, single, atau podcast yang disimpan.',
    'ja':'保存した音楽、プレイリスト、シングル、ポッドキャストはまだありません。',
    'ko':'아직 저장한 음악, 플레이리스트, 싱글 또는 팟캐스트가 없습니다.',
    'zh':'还没有保存的音乐、播放列表、单曲或播客。'
  };
  const cookingCta = {
    'en':'Explore recipes & cooking channels',
    'pt-br':'Explore receitas e canais de culinária',
    'es':'Explora recetas y canales de cocina',
    'fr':'Découvrez des recettes et des chaînes de cuisine',
    'de':'Entdecke Rezepte und Kochkanäle',
    'it':'Esplora ricette e canali di cucina',
    'tr':'Tarifleri ve yemek kanallarını keşfet',
    'ru':'Изучайте рецепты и кулинарные каналы',
    'ar':'استكشف الوصفات وقنوات الطبخ',
    'hi':'रेसिपी और कुकिंग चैनल देखें',
    'id':'Jelajahi resep dan kanal memasak',
    'ja':'レシピと料理チャンネルを探す',
    'ko':'레시피와 요리 채널 둘러보기',
    'zh':'探索食谱和烹饪频道'
  };
  function cleanStaticWebCopy() {
    const lang=(root.lang||'en').toLowerCase();
    document.querySelectorAll('.portfolio-panel p').forEach(p=>{
      const raw=p.textContent||'';
      let copies=null;
      if(/Watch Later portfolio is empty|portfólio Ver Depois está vazio|lista Ver después está vacía|À regarder plus tard est vide|Später-ansehen-Liste ist leer|Guarda più tardi è vuota|Daha Sonra İzle listen boş|Посмотреть позже|المشاهدة لاحقًا|बाद में देखें|Tonton Nanti|あとで見る|나중에 보기|稍后观看/i.test(raw))copies=emptyWatchLater;
      else if(/haven't marked anything as seen yet|não marcou nada como assistido|marcaste nada como visto|rien marqué comme vu|nichts als angesehen|contrassegnato nulla come visto|izlendi olarak işaretlemediniz|ничего не отметили|تمت المشاهدة|देखा हुआ|sudah ditonton|視聴済み|시청 완료|标记为已看/i.test(raw))copies=emptySeen;
      else if(/No saved music, playlists, singles or podcasts yet|Nenhuma música, playlist, single ou podcast|música, listas, singles ni podcasts|morceau, playlist, single ou podcast|Musik, Playlists, Singles oder Podcasts|musica, playlist, singoli o podcast|müzik, çalma listesi, single veya podcast|музыки, плейлистов, синглов|موسيقى أو قوائم تشغيل|संगीत, प्लेलिस्ट, सिंगल|musik, playlist, single, atau podcast|音楽、プレイリスト、シングル|음악, 플레이리스트, 싱글|音乐、播放列表、单曲/i.test(raw))copies=emptyAudio;
      if(!copies)return;
      const key=copies[lang] ? lang : (lang.startsWith('pt')?'pt-br':lang.split('-')[0]);
      const copy=copies[key]||copies.en;
      if(copy && p.textContent!==copy) p.textContent=copy;
    });
    if(lang==='pt-br'){
      const aria=(selector,value)=>document.querySelectorAll(selector).forEach(el=>{if(el.getAttribute('aria-label')!==value)el.setAttribute('aria-label',value);});
      aria('.ma-menu-button','Configurações e preferências');
      aria('.chat-thread-del','Excluir conversa');
      aria('#jds-microphone','Falar com Jonas');
      aria('.matchapp-notification-close','Fechar notificações');
      aria('.matchapp-notification-delete','Remover notificação');
      aria('.discover-speak','Ler resposta em voz alta');
      document.querySelectorAll('.discover-speak').forEach(el=>el.setAttribute('title','Ler resposta em voz alta'));
      const askAgain=document.querySelector('.ma-ask-again');
      if(askAgain&&/Ask another question/i.test(askAgain.textContent||''))askAgain.textContent='Fazer outra pergunta';
      document.querySelectorAll('button').forEach(btn=>{
        const text=(btn.textContent||'').trim();
        if(text==='Mark all read')btn.textContent='Marcar todas como lidas';
        else if(text==='Delete all')btn.textContent='Excluir todas';
        else if(text==='Enable device notifications')btn.textContent='Ativar notificações do dispositivo';
        else if(text==='Enable email notifications')btn.textContent='Ativar notificações por e-mail';
      });
      const notify=document.querySelector('.matchapp-notification-button');
      if(notify){
        const raw=notify.getAttribute('aria-label')||'';
        const count=raw.match(/(\d+)/)?.[1];
        if(/^Notifications/i.test(raw))notify.setAttribute('aria-label',count?('Notificações, '+count+' não lidas'):'Notificações');
      }
      const usage=document.querySelector('#ai-usage-value');
      if(usage){
        const m=(usage.textContent||'').match(/(\d+)\s+of\s+(\d+)\s+daily\s+left/i);
        if(m)usage.textContent=m[1]+' de '+m[2]+' disponíveis hoje';
      }
      const credit=document.querySelector('#ai-credit-line');
      if(credit&&/^Guest allowance/i.test(credit.textContent||'')){
        const n=(credit.textContent||'').match(/(\d+)\s+social-share/i)?.[1];
        credit.textContent='Cota de visitante'+(n?(' · '+n+' bônus por compartilhamento disponíveis'):'');
      }
      const sidebarBrand=document.querySelector('.ai-sidebar-brand span');
      if(sidebarBrand&&/Your entertainment conversation/i.test(sidebarBrand.textContent||''))sidebarBrand.textContent='Sua conversa sobre entretenimento';
      const sidebarTitle=document.querySelector('.ai-sidebar-section-title');
      if(sidebarTitle&&/Recent conversations/i.test(sidebarTitle.textContent||''))sidebarTitle.textContent='Conversas recentes';
      const usageLabel=document.querySelector('.ai-usage-row span');
      if(usageLabel&&/AI allowance/i.test(usageLabel.textContent||''))usageLabel.textContent='Cota de IA';
      const composerLabel=document.querySelector('.composer-input-label');
      if(composerLabel&&/Type your question here/i.test(composerLabel.textContent||''))composerLabel.textContent='Digite sua pergunta aqui';
    }
    const cooking=document.querySelector('a.gold-btn[href="/cooking/"]');
    if(cooking){
      const current=(cooking.textContent||'').trim();
      const known=Object.values(cookingCta);
      if(known.includes(current)||/Explore recipes & cooking channels/i.test(current)){
        const key=cookingCta[lang] ? lang : (lang.startsWith('pt')?'pt-br':lang.split('-')[0]);
        const copy=cookingCta[key]||cookingCta.en;
        if(copy&&current!==copy)cooking.textContent=copy;
      }
    }
  }
  function patchAndroidFollowups(){
    const original=window.discoverRecommendationRequest;
    if(typeof original!=='function'||original.__maAndroidFollowupPatch)return;
    const wrapped=function(question){
      const q=String(question||'').normalize('NFKC').toLowerCase();
      const hasContext=!!document.querySelector('#chat-log .chat-assistant');
      const explanatory=/\b(?:why|what makes|tell me more|more about|explain|por\s+que|porquê|porque|o que faz|vale a pena|por qué|por qué|pourquoi|warum|perché|neden|niçin|mengapa|kenapa)\b|почему|لماذا|क्यों|なぜ|どうして|왜|为什么|為什麼/iu.test(q);
      const reference=/\b(?:this|that|it|the\s+(?:movie|film|show|series|title)|esse|essa|este|esta|isso|ele|ela|filme|série|titulo|título|esta|este|eso|esa|película|serie|ce|cette|cela|film|série|titre|dieser|diese|das|film|serie|titel|questo|questa|titolo|bu|film|dizi|yapım|ini|itu|serial)\b|этот|эта|это|фильм|сериал|هذا|هذه|الفيلم|المسلسل|यह|इस|फिल्म|सीरीज़|この|それ|映画|作品|シリーズ|이|그|영화|작품|시리즈|这|這|这个|這個|电影|電影|剧|劇|作品/iu.test(q);
      if(hasContext&&explanatory&&reference)return false;
      return original(question);
    };
    wrapped.__maAndroidFollowupPatch=true;
    wrapped.__maOriginal=original;
    window.discoverRecommendationRequest=wrapped;
  }
  const dialogSelector = 'dialog,[role="dialog"],#ma-ambient-panel,#ma-android-onboarding,#ma-android-match-modal';
  function blocked() {
    return suspended || document.hidden || document.fullscreenElement || !nav || nav.hidden ||
      document.body?.classList.contains('ma-jonas-modal-open') ||
      document.body?.classList.contains('ma-jonas-chat-open') ||
      [...document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]:not([hidden]),#ma-ambient-panel,#ma-android-onboarding,#ma-android-match-modal')]
        .some(el => !el.hidden && el.getAttribute('aria-hidden') !== 'true' &&
          getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' &&
          Number(getComputedStyle(el).opacity || 1) > .01 && el.getClientRects().length);
  }
  function publish() {
    timer = 0;
    if(suspended || !window.document?.body?.isConnected)return;
    cleanStaticWebCopy();
    patchAndroidFollowups();
    const current = document.querySelector('nav.ma-cinema-dock');
    if (current !== nav) {
      labelsObserver.disconnect();
      nav = current;
      if (nav) labelsObserver.observe(nav,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-current','hidden']});
    }
    const links = slots.map(key=>nav?.querySelector('a[data-cinema-route="'+key+'"]'));
    const labels = links.map(a=>a?.querySelector('[data-cinema-copy]')?.textContent.trim() || '');
    if(!window.__maNativeDockWarm && links.every(Boolean)){
      window.__maNativeDockWarm=true;
      const warm=()=>links.forEach((a,index)=>{
        try{
          const href=new URL(a.href,location.href);
          if(href.origin!==location.origin||href.href===location.href)return;
          const link=document.createElement('link');
          link.rel='prefetch';link.as='document';link.href=href.href;link.dataset.maNativePrefetch=slots[index];
          document.head.appendChild(link);
        }catch(_){}
      });
      if('requestIdleCallback' in window)requestIdleCallback(warm,{timeout:1800});else setTimeout(warm,600);
    }
    const domSelected=links.findIndex(a=>a?.getAttribute('aria-current')==='page');
    const p=location.pathname,h=location.hash;
    const routeSelected=(p==='/'||p==='/index.html')?(h==='#questionnaire-box'?2:0):
      (p==='/profile/profile.html'?(h==='#tab-watchlater'?3:4):1);
    let language = '';
    try { language = localStorage.getItem('match_lang') || ''; } catch (_) {}
    const payload = JSON.stringify({href:location.href, visible:!blocked() && labels.every(Boolean), labels,
      selected:domSelected>=0?domSelected:routeSelected, rtl:root.dir==='rtl', lang:language||window.MATCH_LANG||root.lang||'en',
      light:root.dataset.theme==='sunrise', motion:!motion.matches && !root.classList.contains('reduce-motion')});
    if (payload !== sent) { sent=payload; bridge.postMessage(payload); }
  }
  function targetFor(message) {
    if (!root.hasAttribute('data-native-dock') || !/^(?:activate:[0-4]|explore:1)$/.test(message) || blocked()) return null;
    const anchor=nav?.querySelector('a[data-cinema-route="'+slots[message.slice(-1)]+'"]');
    return anchor?.isConnected && anchor.getAttribute('aria-disabled')!=='true' ? anchor : null;
  }
  window.__maNativeDock = {targetFor};
  // Only Android's menu listeners send activation replies. The feedback owner hears the
  // same reply synchronously before the existing anchor handles navigation.
  bridge.addEventListener('message', event => {
    const anchor=targetFor(event.data);
    if (anchor && event.data==='explore:1') {
      bridge.postMessage(JSON.stringify({href:location.href, openExplore:true}));
      return;
    }
    if (anchor) setTimeout(()=>{ if (targetFor(event.data)===anchor) anchor.click(); },0);
  });
  bridge.onmessage = event => {
    if (event.data!=='shown' && event.data!=='hidden') return;
    const shown=event.data==='shown';
    root.toggleAttribute('data-native-dock',shown);
    if(shown && nav && !restore){
      const values=[[nav,'display','none'],[document.body,'padding-bottom','8px']].map(([el,key,value])=>{
        const saved=[el.style.getPropertyValue(key),el.style.getPropertyPriority(key)];
        el.style.setProperty(key,value,'important');
        return ()=>el.style.setProperty(key,...saved);
      });
      restore=()=>values.forEach(reset=>reset());
    } else if(!shown && restore){restore();restore=null;}
  };
  const style=document.createElement('style');
  style.id='matchapp-android-premium-ui';
  style.textContent=`
    html[data-native-dock] nav.ma-cinema-dock{display:none!important;visibility:hidden!important;pointer-events:none!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}
    html[data-native-dock] body.ma-has-cinema-dock{--ma-reference-dock-clearance:8px!important}
    html[data-native-dock] body.ma-has-cinema-dock{padding-bottom:8px!important}

    html.matchapp-ai-android{
      --ma-android-bg:#09090d;
      --ma-android-surface:#121119;
      --ma-android-surface-2:#191622;
      --ma-android-stroke:rgba(229,193,88,.20);
      --ma-android-stroke-soft:rgba(255,255,255,.075);
      --ma-android-gold:#f1cf72;
      --ma-android-text:#f7f3fb;
      --ma-android-muted:#b9b1c4;
      color-scheme:dark;
      background:var(--ma-android-bg)!important;
      overscroll-behavior-y:none;
      scroll-behavior:smooth;
    }
    html.matchapp-ai-android body{
      background:
        radial-gradient(1000px 520px at 50% -160px,rgba(98,55,132,.20),transparent 62%),
        radial-gradient(760px 360px at 92% 12%,rgba(229,193,88,.07),transparent 68%),
        var(--ma-android-bg)!important;
      color:var(--ma-android-text);
      -webkit-tap-highlight-color:transparent;
      text-rendering:optimizeLegibility;
    }
    html.matchapp-ai-android :is(main,.page-shell,.app-shell,.content-shell){
      max-width:1440px;
      margin-inline:auto;
    }
    html.matchapp-ai-android :is(header,.hero,.hero-shell,.cinematic-header,.match-hero){
      border-color:var(--ma-android-stroke-soft)!important;
    }
    html.matchapp-ai-android :is(.card,.media-card,.result-card,.title-card,.match-card,.channel-card,.profile-card,[data-card]){
      border-color:var(--ma-android-stroke-soft)!important;
      box-shadow:0 14px 38px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.035);
      transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;
      backface-visibility:hidden;
    }
    html.matchapp-ai-android :is(.card,.media-card,.result-card,.title-card,.match-card,.channel-card,[data-card]):has(img){
      overflow:hidden;
    }
    html.matchapp-ai-android :is(.poster,.poster-card,.media-poster,[data-poster]) img,
    html.matchapp-ai-android :is(.card,.media-card,.result-card,.title-card,.match-card,[data-card]) > img{
      image-rendering:auto;
      transform:translateZ(0);
    }
    html.matchapp-ai-android :is(button,.button,.btn,.gold-btn,.channel-button,[role="button"]){
      min-height:44px;
      border-radius:999px!important;
      letter-spacing:.01em;
      touch-action:manipulation;
    }
    html.matchapp-ai-android :is(input,textarea,select){
      border-radius:18px!important;
      border-color:var(--ma-android-stroke-soft)!important;
      background:rgba(20,18,27,.88)!important;
      color:var(--ma-android-text)!important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
    }
    html.matchapp-ai-android :is(input,textarea,select):focus{
      border-color:rgba(241,207,114,.62)!important;
      box-shadow:0 0 0 3px rgba(241,207,114,.10)!important;
      outline:none!important;
    }
    html.matchapp-ai-android :is(h1,h2,h3,.title,.headline){
      text-wrap:balance;
      letter-spacing:-.018em;
    }
    html.matchapp-ai-android :is(.section-title,.eyebrow,.kicker,.meta,.subtitle){
      text-wrap:pretty;
    }
    html.matchapp-ai-android :is(.chip,.pill,.badge,[data-chip]){
      border-color:rgba(255,255,255,.085)!important;
      background:rgba(28,25,36,.78)!important;
      backdrop-filter:blur(14px) saturate(125%);
    }
    html.matchapp-ai-android :is(.gold-btn,.primary,.btn-primary,[data-primary]){
      background:linear-gradient(135deg,#f4d67e 0%,#d8ad43 100%)!important;
      color:#171118!important;
      border-color:rgba(255,231,158,.7)!important;
      box-shadow:0 8px 24px rgba(204,157,42,.20),inset 0 1px 0 rgba(255,255,255,.36);
    }
    html.matchapp-ai-android img{
      -webkit-user-drag:none;
      user-select:none;
    }

    /* Android app owns its status and navigation chrome. Website-only notices
       and oversized desktop spacing make the native shell feel wrapped. */
    html.matchapp-ai-android .ma-trust{
      display:none!important;
    }
    /* Long static guide/SEO blocks belong to the browser site. The Android
       shell keeps the interactive controls and localized destination cards. */
    html.matchapp-ai-android :is(#ma-home-static-intro,.ma-how-more-guides,.ma-explore-static-guide,.ma-explore-lede-extra){
      display:none!important;
    }
    html.matchapp-ai-android body.ai-chat-page .app-header{
      min-height:0!important;
      padding:10px 18px!important;
      gap:12px!important;
      box-shadow:0 10px 32px rgba(0,0,0,.18)!important;
    }
    html.matchapp-ai-android body.ai-chat-page .app-header .brand-logo{
      width:42px!important;
      height:42px!important;
      border-radius:13px!important;
    }
    html.matchapp-ai-android body.ai-chat-page .app-header .matchapp-wordmark{
      max-height:38px!important;
      width:auto!important;
    }
    html.matchapp-ai-android body.ai-chat-page .ma-page-escapes{
      margin:8px 14px 4px!important;
      gap:8px!important;
    }
    html.matchapp-ai-android body.ai-chat-page .ma-escape-pill{
      min-height:40px!important;
      padding:8px 16px!important;
      background:rgba(37,28,51,.88)!important;
      border:1px solid rgba(255,255,255,.065)!important;
      box-shadow:0 8px 20px rgba(0,0,0,.16)!important;
    }
    html.matchapp-ai-android body.ai-chat-page .discover-head{
      border-radius:24px!important;
      border:1px solid rgba(229,193,88,.20)!important;
      background:linear-gradient(145deg,rgba(31,23,42,.94),rgba(12,11,17,.92))!important;
      box-shadow:0 18px 48px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.035)!important;
    }
    html.matchapp-ai-android body.ai-chat-page .ai-sidebar{
      background:linear-gradient(180deg,rgba(20,15,29,.985),rgba(11,10,16,.985))!important;
      border-right:1px solid rgba(229,193,88,.14)!important;
      box-shadow:16px 0 40px rgba(0,0,0,.28)!important;
    }
    html.matchapp-ai-android body.ai-chat-page .ai-new-chat{
      color:#171118!important;
      border-radius:999px!important;
      background:linear-gradient(135deg,#f4d67e,#d8ad43)!important;
      box-shadow:0 8px 24px rgba(204,157,42,.18)!important;
    }
    html.matchapp-ai-android body.ai-chat-page .ai-usage-card{
      border-color:rgba(229,193,88,.12)!important;
      background:linear-gradient(145deg,rgba(75,42,110,.14),rgba(0,0,0,.20))!important;
    }
    html.matchapp-ai-android ::-webkit-scrollbar{width:0;height:0}
    html.matchapp-ai-android body{scrollbar-width:none}

    @media (min-width:701px) and (max-width:1200px){
      html.matchapp-ai-android body.ai-chat-page .ai-sidebar{
        top:68px!important;
        width:min(72vw,250px)!important;
        padding:12px 10px 14px!important;
      }
      html.matchapp-ai-android body.ai-chat-page.ai-sidebar-open .ai-sidebar-scrim{
        inset:68px 0 0!important;
        background:rgba(5,4,10,.46)!important;
        backdrop-filter:blur(3px)!important;
      }
      html.matchapp-ai-android body.ai-chat-page .ai-sidebar-toggle{
        top:76px!important;
        left:12px!important;
      }
      html.matchapp-ai-android body.ai-chat-page .wrap,
      html.matchapp-ai-android body.ai-chat-page.ai-sidebar-collapsed .wrap{
        width:100%!important;
        max-width:1240px!important;
        margin-inline:auto!important;
        padding-inline:18px!important;
      }
      html.matchapp-ai-android body.ai-chat-page .discover-head{
        padding:18px!important;
      }
      html.matchapp-ai-android body.ai-chat-page .discover-title-copy h1{
        font-size:clamp(30px,4.5vw,48px)!important;
        line-height:1.02!important;
      }
    }

    @media (max-width:700px){
      html.matchapp-ai-android :is(main,.page-shell,.content-shell){padding-inline:max(14px,env(safe-area-inset-left))!important}
      html.matchapp-ai-android :is(.card,.media-card,.result-card,.title-card,.match-card,.channel-card,[data-card]){
        box-shadow:0 10px 26px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.03);
      }
    }
    @media (min-width:701px){
      html.matchapp-ai-android :is(main,.page-shell,.content-shell){padding-inline:clamp(18px,3vw,52px)!important}
    }
    @media(prefers-reduced-motion:no-preference){
      html.matchapp-ai-android:not(.reduce-motion) :is(.marquee-item,.channel-button,.gold-btn,.card,.media-card,.result-card,.title-card,.match-card,[data-card]):active{
        transform:perspective(640px) translateY(1px) rotateX(2deg) scale(.985);
        transform-origin:center bottom;
      }
      html.matchapp-ai-android:not(.reduce-motion) :is(.card,.media-card,.result-card,.title-card,.match-card,[data-card]):hover{
        border-color:rgba(241,207,114,.24)!important;
      }
    }
  `;
  document.head.append(style);
  const bind = () => {
    const body=document.body;
    new MutationObserver(schedule).observe(body,{childList:true,attributes:true,attributeFilter:['class']});
    new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['lang','dir','class','data-theme']});
    document.querySelectorAll('.ai-sidebar,#chat-log,.matchapp-notification-panel').forEach(host=>{
      new MutationObserver(schedule).observe(host,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-label','title']});
    });
    // Existing dialogs open through style or class changes. Watch those writes
    // on dialogs alone so unrelated animation and scroll styles stay cheap.
    const dialogVisibility = new MutationObserver(schedule);
    function watchDialogs() {
      dialogVisibility.disconnect();
      for(const el of body.querySelectorAll(dialogSelector))
        dialogVisibility.observe(el,{attributes:true,attributeFilter:['style','class','open','aria-modal','aria-hidden','hidden']});
    }
    watchDialogs();
    new MutationObserver(records=>{
      const changed=records.some(r=>r.type==='attributes'
        ? r.oldValue==='dialog' || r.target.matches(dialogSelector)
        : [...r.addedNodes,...r.removedNodes].some(n=>n.matches?.(dialogSelector) || n.querySelector?.(dialogSelector)));
      if(changed){watchDialogs();schedule();}
    }).observe(body,{childList:true,subtree:true,attributes:true,attributeFilter:['role'],attributeOldValue:true});
    publish();
  };
  if(document.body) bind(); else document.addEventListener('DOMContentLoaded',bind,{once:true});
  window.addEventListener('pagehide',()=>{suspended=true;cancelAnimationFrame(timer);timer=0;});
  window.addEventListener('pageshow',()=>{suspended=false;sent=null;schedule();});
  for(const event of ['hashchange','popstate'])window.addEventListener(event,schedule);

  for(const event of ['visibilitychange','fullscreenchange','matchapp:langchange','matchapp:settingschanged'])document.addEventListener(event,schedule);
  motion.addEventListener?.('change',schedule);
})();
