/* MatchApp Ai — presentation-only result hierarchy.
 * Reads the completed match and its existing exact metadata enrichment. It
 * never selects a title, fetches availability, rewrites a URL or replaces a
 * click handler. The existing finite, reduced-motion-aware reveal remains
 * the single owner of match celebration.
 */
(function () {
  'use strict';
  if (window.MatchAppResultExperience || !document.body?.classList.contains('page-home') ||
      document.documentElement.classList.contains('kids-mode') || location.pathname.startsWith('/kids/')) return;

  const root = document.getElementById('result-box');
  const action = document.getElementById('res-direct-link');
  if (!root || !action) return;

  const copy = Object.freeze({
    en: {verified:'Verified available in your region',check:'Check availability in your country',terms:'Confirm the plan and price on the service.',source:'Source: JustWatch via TMDB',open:'Open on {platform}',search:'Search on {platform}',watch:'Watch on {platform}',listen:'Listen on {platform}',sourceAction:'Open source',guide:'Find where to watch'},
    pt: {verified:'Disponibilidade verificada na sua região',check:'Confira a disponibilidade no seu país',terms:'Confira o plano e o preço no serviço.',source:'Fonte: JustWatch via TMDB',open:'Abrir no {platform}',search:'Buscar no {platform}',watch:'Assistir no {platform}',listen:'Ouvir no {platform}',sourceAction:'Abrir fonte',guide:'Encontre onde assistir'},
    es: {verified:'Disponibilidad verificada en tu región',check:'Consulta la disponibilidad en tu país',terms:'Confirma el plan y el precio en el servicio.',source:'Fuente: JustWatch mediante TMDB',open:'Abrir en {platform}',search:'Buscar en {platform}',watch:'Ver en {platform}',listen:'Escuchar en {platform}',sourceAction:'Abrir fuente',guide:'Encuentra dónde verlo'},
    fr: {verified:'Disponibilité vérifiée dans votre région',check:'Vérifiez la disponibilité dans votre pays',terms:'Confirmez la formule et le prix sur le service.',source:'Source : JustWatch via TMDB',open:'Ouvrir sur {platform}',search:'Rechercher sur {platform}',watch:'Regarder sur {platform}',listen:'Écouter sur {platform}',sourceAction:'Ouvrir la source',guide:'Trouver où regarder'},
    de: {verified:'Verfügbarkeit in deiner Region bestätigt',check:'Verfügbarkeit in deinem Land prüfen',terms:'Tarif und Preis beim Anbieter prüfen.',source:'Quelle: JustWatch über TMDB',open:'Auf {platform} öffnen',search:'Auf {platform} suchen',watch:'Auf {platform} ansehen',listen:'Auf {platform} anhören',sourceAction:'Quelle öffnen',guide:'Finde heraus, wo es läuft'},
    it: {verified:'Disponibilità verificata nella tua zona',check:'Controlla la disponibilità nel tuo Paese',terms:'Verifica il piano e il prezzo sul servizio.',source:'Fonte: JustWatch tramite TMDB',open:'Apri su {platform}',search:'Cerca su {platform}',watch:'Guarda su {platform}',listen:'Ascolta su {platform}',sourceAction:'Apri la fonte',guide:'Scopri dove guardarlo'},
    tr: {verified:'Bölgenizde mevcut olduğu doğrulandı',check:'Ülkenizdeki kullanılabilirliği kontrol edin',terms:'Paket ve fiyatı hizmette kontrol edin.',source:'Kaynak: TMDB aracılığıyla JustWatch',open:'{platform} üzerinde aç',search:'{platform} üzerinde ara',watch:'{platform} üzerinde izle',listen:'{platform} üzerinde dinle',sourceAction:'Kaynağı aç',guide:'Nereden izleyebileceğinizi bulun'},
    ru: {verified:'Доступность в вашем регионе подтверждена',check:'Проверьте доступность в вашей стране',terms:'Уточните тариф и цену на сервисе.',source:'Источник: JustWatch через TMDB',open:'Открыть в {platform}',search:'Найти в {platform}',watch:'Смотреть в {platform}',listen:'Слушать в {platform}',sourceAction:'Открыть источник',guide:'Узнать, где посмотреть'},
    ar: {verified:'تم التحقق من التوفر في منطقتك',check:'تحقق من التوفر في بلدك',terms:'تأكد من الباقة والسعر لدى الخدمة.',source:'المصدر: JustWatch عبر TMDB',open:'افتح على {platform}',search:'ابحث على {platform}',watch:'شاهد على {platform}',listen:'استمع على {platform}',sourceAction:'افتح المصدر',guide:'اعثر على مكان المشاهدة'},
    hi: {verified:'आपके क्षेत्र में उपलब्धता की पुष्टि हुई',check:'अपने देश में उपलब्धता जाँचें',terms:'सेवा पर प्लान और कीमत की पुष्टि करें।',source:'स्रोत: TMDB के माध्यम से JustWatch',open:'{platform} पर खोलें',search:'{platform} पर खोजें',watch:'{platform} पर देखें',listen:'{platform} पर सुनें',sourceAction:'स्रोत खोलें',guide:'देखें कहाँ उपलब्ध है'},
    id: {verified:'Ketersediaan di wilayah Anda terverifikasi',check:'Periksa ketersediaan di negara Anda',terms:'Pastikan paket dan harga di layanan tersebut.',source:'Sumber: JustWatch melalui TMDB',open:'Buka di {platform}',search:'Cari di {platform}',watch:'Tonton di {platform}',listen:'Dengarkan di {platform}',sourceAction:'Buka sumber',guide:'Temukan tempat menontonnya'},
    ja: {verified:'お住まいの地域での配信を確認済み',check:'お住まいの国での配信状況を確認',terms:'料金とプランはサービスでご確認ください。',source:'出典：TMDB経由のJustWatch',open:'{platform}で開く',search:'{platform}で検索',watch:'{platform}で視聴',listen:'{platform}で聴く',sourceAction:'情報源を開く',guide:'視聴できるサービスを探す'},
    ko: {verified:'내 지역에서의 제공 여부 확인 완료',check:'내 국가의 제공 여부를 확인하세요',terms:'서비스에서 요금제와 가격을 확인하세요.',source:'출처: TMDB를 통한 JustWatch',open:'{platform}에서 열기',search:'{platform}에서 검색',watch:'{platform}에서 시청',listen:'{platform}에서 듣기',sourceAction:'출처 열기',guide:'시청할 수 있는 곳 찾기'},
    zh: {verified:'已核实在你所在地区提供',check:'查看你所在国家的提供情况',terms:'请在服务平台确认套餐和价格。',source:'来源：通过TMDB获取的JustWatch信息',open:'在{platform}打开',search:'在{platform}搜索',watch:'在{platform}观看',listen:'在{platform}收听',sourceAction:'打开来源',guide:'查找观看平台'}
  });
  const providers = [
    {key:'netflix',name:'Netflix',hosts:['netflix.com'],matches:['netflix','netflix standard with ads'],color:'#E50914',ink:'#FFFFFF'},
    {key:'prime',name:'Prime Video',hosts:['primevideo.com'],matches:['amazon prime video','amazon prime video with ads','prime video'],color:'#00A8E1',ink:'#081522'},
    {key:'disney',name:'Disney+',hosts:['disneyplus.com'],matches:['disney plus','disney+'],color:'#153C75',ink:'#FFFFFF'},
    {key:'max',name:'Max',hosts:['max.com','hbomax.com'],matches:['hbo max','max'],color:'#5822B4',ink:'#FFFFFF'},
    {key:'apple-tv',name:'Apple TV',hosts:['tv.apple.com'],matches:['apple tv+','apple tv plus','apple tv'],color:'#242424',ink:'#FFFFFF'},
    {key:'apple-books',name:'Apple Books',hosts:['books.apple.com'],matches:['apple books'],color:'#F68B1E',ink:'#21140B'},
    {key:'apple-music',name:'Apple Music',hosts:['music.apple.com'],matches:['apple music'],color:'#BD1849',ink:'#FFFFFF'},
    {key:'apple-podcasts',name:'Apple Podcasts',hosts:['podcasts.apple.com'],matches:['apple podcasts'],color:'#7426AC',ink:'#FFFFFF'},
    {key:'spotify',name:'Spotify',hosts:['open.spotify.com'],matches:['spotify'],color:'#1DB954',ink:'#082616'},
    {key:'youtube-music',name:'YouTube Music',hosts:['music.youtube.com'],matches:['youtube music'],color:'#C20D24',ink:'#FFFFFF'},
    {key:'youtube',name:'YouTube',hosts:['youtube.com','youtu.be'],matches:['youtube'],color:'#C20D24',ink:'#FFFFFF'},
    {key:'paramount',name:'Paramount+',hosts:['paramountplus.com'],matches:['paramount plus','paramount+','paramount plus basic with ads','paramount plus essential','paramount plus premium'],color:'#0759C7',ink:'#FFFFFF'},
    {key:'hulu',name:'Hulu',hosts:['hulu.com'],matches:['hulu'],color:'#1CE783',ink:'#0C291B'},
    {key:'peacock',name:'Peacock',hosts:['peacocktv.com'],matches:['peacock','peacock premium','peacock premium plus'],color:'#F5D447',ink:'#201B09'},
    {key:'globoplay',name:'Globoplay',hosts:['globoplay.globo.com'],matches:['globoplay'],color:'#BD1C37',ink:'#FFFFFF'},
    {key:'crunchyroll',name:'Crunchyroll',hosts:['crunchyroll.com'],matches:['crunchyroll'],color:'#F47521',ink:'#25150B'},
    {key:'viki',name:'Viki',hosts:['viki.com'],matches:['rakuten viki','viki'],color:'#146F96',ink:'#FFFFFF'},
    {key:'mubi',name:'MUBI',hosts:['mubi.com'],matches:['mubi'],color:'#173EC0',ink:'#FFFFFF'},
    {key:'mercado-play',name:'Mercado Play',hosts:['play.mercadolivre.com.br','play.mercadolibre.com.mx','play.mercadolibre.com.ar'],matches:['mercado play'],color:'#FFE600',ink:'#242218'},
    {key:'roku',name:'The Roku Channel',hosts:['therokuchannel.roku.com','roku.com'],matches:['the roku channel','roku channel'],color:'#63259B',ink:'#FFFFFF'},
    {key:'tubi',name:'Tubi',hosts:['tubitv.com'],matches:['tubi','tubi tv'],color:'#FAE729',ink:'#242016'},
    {key:'bbc',name:'BBC iPlayer',hosts:['bbc.co.uk'],matches:['bbc iplayer'],color:'#B62460',ink:'#FFFFFF'},
    {key:'itvx',name:'ITVX',hosts:['itv.com'],matches:['itvx','itvx premium'],color:'#B7ED44',ink:'#182306'},
    {key:'channel4',name:'Channel 4',hosts:['channel4.com'],matches:['channel 4'],color:'#CDEB30',ink:'#192105'},
    {key:'sbt',name:'+SBT',hosts:['mais.sbt.com.br'],matches:['+sbt','sbt+','sbt plus'],color:'#702BC2',ink:'#FFFFFF'},
    {key:'angel',name:'Angel Studios',hosts:['angel.com'],matches:['angel studios'],color:'#B9E5EE',ink:'#13242B'},
    {key:'pureflix',name:'Pure Flix',hosts:['pureflix.com'],matches:['pure flix'],color:'#154E9B',ink:'#FFFFFF'},
    {key:'hotstar',name:'Hotstar',hosts:['hotstar.com'],matches:['hotstar','jiohotstar','disney+ hotstar'],color:'#133D8E',ink:'#FFFFFF'},
    {key:'iqiyi',name:'iQIYI',hosts:['iq.com'],matches:['iqiyi'],color:'#00CF55',ink:'#082616'},
    {key:'wetv',name:'WeTV',hosts:['wetv.vip'],matches:['wetv'],color:'#096DAC',ink:'#FFFFFF'},
    {key:'viu',name:'Viu',hosts:['viu.com'],matches:['viu'],color:'#FFBF00',ink:'#251D0D'},
    {key:'pluto',name:'Pluto TV',hosts:['pluto.tv'],matches:['pluto tv'],color:'#F9E246',ink:'#242016'},
    {key:'reelshort',name:'ReelShort',hosts:['reelshort.com'],matches:['reelshort'],color:'#C2153F',ink:'#FFFFFF'},
    {key:'dramabox',name:'DramaBox',hosts:['dramaboxapp.com'],matches:['dramabox'],color:'#B52930',ink:'#FFFFFF'},
    {key:'shortmax',name:'ShortMax',hosts:['shortmax.com'],matches:['shortmax'],color:'#6625AF',ink:'#FFFFFF'},
    {key:'goodshort',name:'GoodShort',hosts:['goodshort.com'],matches:['goodshort'],color:'#D56E2A',ink:'#201409'},
    {key:'flextv',name:'FlexTV',hosts:['flextv.cc'],matches:['flextv'],color:'#BD2A7C',ink:'#FFFFFF'},
    {key:'audible',name:'Audible',hosts:['audible.com'],matches:['audible'],color:'#F5A623',ink:'#251D0D'}
  ];
  const countryCodes = {argentina:'AR',australia:'AU',belgium:'BE',brazil:'BR',brasil:'BR',canada:'CA',chile:'CL',china:'CN',colombia:'CO',denmark:'DK',egypt:'EG',finland:'FI',france:'FR',germany:'DE',greece:'GR','hong kong':'HK',india:'IN',indonesia:'ID',ireland:'IE',israel:'IL',italy:'IT',japan:'JP','south korea':'KR',korea:'KR',mexico:'MX',netherlands:'NL','new zealand':'NZ',nigeria:'NG',norway:'NO',philippines:'PH',poland:'PL',portugal:'PT',russia:'RU','south africa':'ZA',spain:'ES',sweden:'SE',switzerland:'CH',taiwan:'TW',thailand:'TH',turkey:'TR',ukraine:'UA','united kingdom':'GB',uk:'GB','united states':'US',usa:'US',vietnam:'VN'};
  let selection = null;
  let evidence = null;
  let scheduled = false;
  const host = document.createElement('div');
  host.id = 'ma-result-trust';
  host.className = 'ma-result-trust';
  host.setAttribute('role','status');
  host.setAttribute('aria-live','polite');
  host.setAttribute('aria-atomic','true');
  const states = {};
  for (const name of ['check','verified']) {
    const node = document.createElement('div');
    node.className = 'ma-result-trust__state ma-result-trust__state--' + name;
    const label = document.createElement('span');
    label.className = 'ma-result-trust__label';
    const icon = document.createElement('span');
    icon.className = 'ma-result-trust__icon';
    icon.setAttribute('aria-hidden','true');
    icon.textContent = name === 'verified' ? '✓' : '↗';
    const text = document.createElement('span');
    const detail = document.createElement('small');
    detail.className = 'ma-result-trust__detail';
    label.append(icon,text);
    node.append(label,detail);
    host.append(node);
    states[name] = {node,text,detail};
  }
  action.insertAdjacentElement('beforebegin',host);
  root.classList.add('ma-one-match');
  // Use the existing depth system's documented opt-out for this newly
  // requested flat CTA, so a higher-priority legacy bevel cannot reappear.
  action.classList.add('ma-result-primary','no-depth');

  function language() {
    const value = String(window.MATCH_LANG || document.documentElement.lang || 'en').toLowerCase().split('-')[0];
    return Object.prototype.hasOwnProperty.call(copy,value) ? value : 'en';
  }
  function region() {
    try {
      const pinned = String(localStorage.getItem('match_user_region') || '').trim();
      if (/^[a-z]{2}$/i.test(pinned)) return pinned.toUpperCase();
      const country = String(localStorage.getItem('match_user_country') || '').trim();
      if (/^[a-z]{2}$/i.test(country)) return country.toUpperCase();
      return countryCodes[country.toLowerCase()] || '';
    } catch (_) { return ''; }
  }
  function route() {
    let url;
    try { url = new URL(action.href,location.href); } catch (_) { return null; }
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase();
    const provider = providers.find(item => item.hosts.some(domain => hostname === domain || hostname.endsWith('.' + domain)));
    if (!provider) return null;
    const search = /(?:^|\/)(?:search|results|busca)(?:\/|$)/i.test(url.pathname) ||
      ['q','query','search_query','phrase','searchString','term'].some(key => url.searchParams.has(key));
    const titlePage = !search && /\/(?:title|watch|assistir|detail|movie|movies|show|shows|tv|series|album|track|playlist|episode|podcast|audiobook|book)\/[^/]+/i.test(url.pathname);
    return {provider,search,titlePage};
  }
  function verified(currentRoute) {
    if (!selection || !evidence || !currentRoute || evidence.title !== selection.title) return false;
    const userRegion = region();
    if (!userRegion || userRegion !== evidence.region) return false;
    const identity = window.currentMatchIdentity;
    if (identity?.title && identity.title !== selection.title) return false;
    const pinnedId = Number(selection.tmdbId || identity?.tmdbId);
    if (pinnedId && pinnedId !== evidence.tmdbId) return false;
    if (selection.kind && selection.kind !== evidence.kind) return false;
    if (selection.year && evidence.year && selection.year !== evidence.year) return false;
    if (!Number.isSafeInteger(evidence.tmdbId) || evidence.tmdbId < 1 || !['movie','tv'].includes(evidence.kind)) return false;
    if (evidence.source !== 'tmdb-watch-providers' ||
        evidence.sourcePage !== 'https://www.themoviedb.org/' + evidence.kind + '/' + evidence.tmdbId) return false;
    const age = Date.now() - evidence.updatedAt;
    if (!Number.isFinite(age) || age < -300000 || age > 36 * 60 * 60 * 1000) return false;
    return evidence.streams.some(name => currentRoute.provider.matches.includes(name.toLowerCase().trim()));
  }
  function write(node,value) { if (node.textContent !== value) node.textContent = value; }
  function paint() {
    const strings = copy[language()];
    const currentRoute = route();
    const isVerified = verified(currentRoute);
    const code = region();
    write(states.check.text,strings.check);
    write(states.check.detail,strings.terms);
    write(states.verified.text,strings.verified);
    // Both states occupy the same grid cell. The hidden state still reserves
    // its natural text height before the verified data arrives.
    write(states.verified.detail,strings.source + ' · ' + (code || '—'));
    for (const name of ['check','verified']) {
      const active = (name === 'verified') === isVerified;
      states[name].node.classList.toggle('is-active',active);
      states[name].node.setAttribute('aria-hidden',active ? 'false' : 'true');
    }
    host.dataset.availability = isVerified ? 'verified' : 'unconfirmed';
    if (!selection) return;
    if (currentRoute) {
      action.style.setProperty('--ma-result-cta-bg',currentRoute.provider.color);
      action.style.setProperty('--ma-result-cta-ink',currentRoute.provider.ink);
      action.dataset.resultProvider = currentRoute.provider.key;
      const key = currentRoute.search ? 'search' : (isVerified && currentRoute.titlePage ? (selection.audio ? 'listen' : 'watch') : 'open');
      write(action,strings[key].replace('{platform}',currentRoute.provider.name));
    } else {
      action.style.removeProperty('--ma-result-cta-bg');
      action.style.removeProperty('--ma-result-cta-ink');
      delete action.dataset.resultProvider;
      // A changed or unfamiliar destination must not retain a previous
      // platform's endorsement. Its original URL and callback still run.
      let key = 'sourceAction';
      try {
        if (new URL(action.href).hostname.replace(/^www\./,'') === 'justwatch.com') key = 'guide';
      } catch (_) { /* Preserve the existing destination. */ }
      write(action,strings[key]);
    }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; paint(); });
  }
  function reset() {
    selection = null;
    evidence = null;
    action.style.removeProperty('--ma-result-cta-bg');
    action.style.removeProperty('--ma-result-cta-ink');
    delete action.dataset.resultProvider;
    paint();
  }
  function present(selected,options = {}) {
    if (!selected?.title || selected.title !== window.globalMatchTitle) return;
    selection = {
      title:String(selected.title),
      year:Number(selected.year) || 0,
      tmdbId:Number(selected._tmdbId || selected._meta?.tmdbId) || 0,
      kind:String(selected._tmdbKind || selected._meta?.kind || ''),
      audio:options.audioPick === true
    };
    paint();
  }
  function setAvailability(title,meta,country) {
    if (!meta || title !== window.globalMatchTitle) return;
    const code = String(country || '').toUpperCase();
    evidence = {
      title:String(title),
      tmdbId:Number(meta.tmdb_id),
      kind:String(meta.media_kind || ''),
      year:Number(meta.year) || 0,
      region:code,
      streams:Array.isArray(meta.availability?.[code]?.stream) ? meta.availability[code].stream.map(String) : [],
      source:String(meta.availability?.source || ''),
      sourcePage:String(meta.availability?.source_page_url || ''),
      updatedAt:Date.parse(meta.updated_at || '')
    };
    paint();
  }

  new MutationObserver(schedule).observe(action,{attributes:true,attributeFilter:['href'],childList:true,subtree:true,characterData:true});
  document.addEventListener('matchapp:newmatch',reset);
  document.addEventListener('matchapp:langchange',schedule);
  document.addEventListener('matchapp:profilehydrated',schedule);
  document.addEventListener('matchapp:authchange',schedule);
  window.addEventListener('storage',event => {
    if (event.key === 'match_user_country' || event.key === 'match_user_region' || event.key === null) schedule();
  });
  window.MatchAppResultExperience = Object.freeze({present,setAvailability,reset,labels:copy});
  paint();
})();
