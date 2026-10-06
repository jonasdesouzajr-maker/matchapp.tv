/* Adult Ask AI: source evidence, not generated prose, decides watch recommendations. */
(function () {
  'use strict';
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const key = s => norm(s).replace(/[^\p{L}\p{N}]/gu, '');
  const DOC = /\b(?:docu(?:s|series)?|docu-series|documentar(?:y|ies|io|ios)|documentaire|documentaires|dokumentar\w*|dokumentation|belgesel\w*|documenter|documentario)\b|ドキュメンタリー|纪录片|紀錄片|다큐|وثائق|документал|वृत्तचित्र/u;
  const SWITCH = /\b(?:movies?|films?|peliculas?|filmes?|podcasts?|music|songs?|audiobooks?|e-?books?|livros?|livres?|musica|anime|novelas?)\b/;
  const TOPICS = [
    ['mythology', /\b(?:myth\w*|mitolog\w*|folklor\w*|legends?|lendas?)\b/, /\b(?:mytholog\w*|mitolog\w*|folklor\w*|pantheon)\b|\b(?:greek|norse|ancient|egyptian|roman|indigenous|brazilian|world(?:'s)?)\s+(?:myths?|legends?|gods?)\b|\bmyths?\b.{0,80}\b(?:legends?|monsters?|gods?|deities)\b/],
    ['nature', /\b(?:nature|naturaleza|natureza|wildlife|animals?|animais|ocean\w*|oceano\w*)\b/, /\b(?:nature|natural world|wildlife|animals?|animais|ocean\w*|oceano\w*|habitats?|species|especies)\b/],
    ['space', /\b(?:space|astronom\w*|cosmos|espaco|universo)\b/, /\b(?:space|astronom\w*|cosmos|espaco|univers\w*|planets?|galax\w*|astronaut\w*)\b/],
    ['crime', /\b(?:true crime|crime|criminal\w*)\b/, /\b(?:crime|criminal\w*|murder\w*|assassin\w*|police|policia|investigat\w*)\b/],
    ['history', /\b(?:history|historical|historia|historico)\b/, /\b(?:histor\w*|civiliza\w*|ancient|antigo|war|guerra|empire|imperio)\b/]
  ];
  const COUNTRIES = {brazil:'BR',brasil:'BR','united states':'US',usa:'US','united kingdom':'GB',uk:'GB',canada:'CA',portugal:'PT',mexico:'MX',argentina:'AR',france:'FR',germany:'DE',spain:'ES',australia:'AU',japan:'JP',india:'IN'};
  const ISO = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
  let countryLocale = '', countryNames = [];
  function countries() {
    const locale = window.MATCH_LANG || 'en';
    if (countryLocale === locale) return countryNames;
    const names = new Map(Object.entries(COUNTRIES));
    for (const language of new Set(['en',locale])) {
      try { const display = new Intl.DisplayNames([language],{type:'region'});
        ISO.forEach(code=>names.set(norm(display.of(code)),code));
      } catch (_) { /* The fixed aliases and ISO preferences remain usable. */ }
    }
    countryLocale = locale;
    countryNames = [...names.entries()].sort((a,b)=>b[0].length-a[0].length);
    return countryNames;
  }
  function explicitRegion(text) {
    const n = norm(text);
    // Availability country is not the production origin: "Brazilian myths" is not a region selector.
    const locations = [...n.matchAll(/(?:\b(?:in|no|na|em|en|au|aux|im|nel|nella|di|في|в)|在)\s*(?:(?:the|les|la|le|el)\s+)?/gu)].map(m=>n.slice(m.index+m[0].length));
    for (const [name, code] of countries()) {
      if (locations.some(location=>location.startsWith(name) && !/[\p{L}\p{N}]/u.test(location.slice(name.length,name.length+1))) || n.includes(name+'で') || n.includes(name+'에서')) return code;
    }
    const iso = n.match(/\b(?:region|country|pais)\s*[:=]\s*([a-z]{2})\b/);
    if (iso && ISO.includes(iso[1].toUpperCase())) return iso[1].toUpperCase();
    return '';
  }
  function constraints(question, history = []) {
    let doc = false, kind = '', topic = null, region = '', provider = '', nonVisualHistory = false, subject = [];
    const users = history.filter(t => t.role === 'user').slice(-8).map(t => t.text);
    for (const text of [...users, question]) {
      const n = norm(text);
      if (/\b(?:books?|audiobooks?|podcasts?|music|songs?|livros?|livres?|recipes?|receitas?)\b/.test(n)) nonVisualHistory = true;
      if (DOC.test(n) || /\b(?:watch|stream\w*|series|movies?|films?|assistir)\b/.test(n)) nonVisualHistory = false;
      if (!DOC.test(n) && SWITCH.test(n)) { doc = false; kind = ''; topic = null; region = ''; provider = ''; subject = []; }
      if (DOC.test(n)) doc = true;
      if (/\b(?:series|serie|docuseries|docu-series|tv show)\b/.test(n)) kind = 'tv';
      else if (/\b(?:movies?|films?|filmes?|peliculas?)\b/.test(n)) kind = 'movie';
      const nextTopic = TOPICS.find(t => t[1].test(n));
      if (nextTopic) { topic = nextTopic[0]; subject = []; }
      else {
        const about = n.match(/\b(?:about|sobre|acerca de|sur|uber)\s+(.+?)(?=\b(?:streaming|available|disponivel|on netflix|in brazil|em brasil)\b|[.!?]|$)/)?.[1];
        if (about) {
          subject = (about.match(/[\p{L}]{4,}/gu)||[]).filter(s=>!['that','with','their','lives','people','series','documentary','documentaries','stream','watch'].includes(s)).slice(0,6);
          topic = null;
        }
      }
      region = explicitRegion(n) || region;
      const p = n.match(/\b(netflix|prime video|disney\+|globoplay|paramount\+|max)(?!\w)/);
      if (p) provider = p[1];
    }
    const n = norm(question);
    const factual = /\b(?:who directed|director of|when was|release date|release year|quem dirigiu|who stars|who starred|cast of|what is|tell me about|explain|o que e)\b/.test(n);
    const watch = /\b(?:watch|stream\w*|recommend|suggest|find|series|movies?|films?|assistir|recomende|indique|encontre|ver|regarder|sehen|empfehlen|guarda|consiglia|izle|oner|rekomendasi|tonton)\b|观看|看电影|見る|おすすめ|추천|시청|посовет|смотреть|شاهد|اقترح|देखना/u.test(n);
    const followup = /\b(?:find one|another|other|not at all|not what|as i asked|as requested|proper|nothing|not streaming|outro|outra|como pedi)\b/.test(n);
    const nonVisual = /\b(?:podcasts?|music|songs?|audiobooks?|e-?books?|livros?|livres?|musica|recipes?|receitas?|cook\w*)\b/.test(n);
    const active = !factual && !nonVisual && !nonVisualHistory && (doc || watch || followup);
    let savedCountry = '', savedRegion = '';
    try { const saved = norm(localStorage.getItem('match_user_country'));
      savedCountry = countries().find(([name])=>name===saved)?.[1] || '';
      const code = String(localStorage.getItem('match_user_region')||'').toUpperCase();
      if (ISO.includes(code)) savedRegion = code;
    } catch (_) {}
    return {active, documentary:doc, kind, topic, subject, provider, question,
      region:region || savedRegion || savedCountry || window.MatchAppCatalogMedia?.regionCode?.() || 'US'};
  }
  function prompt(question, c) {
    if (!c.active) return question;
    return question + '\n\nCurrent watch constraints: '+(c.documentary?'documentary nonfiction ONLY; no fictional or children\'s shows. ':'')+
      (c.kind ? 'Format: '+(c.kind==='tv'?'docuseries/TV series, not a film. ':'film, not a series. ') : '')+
      (c.topic ? 'Subject: '+c.topic+'. Do not substitute a different subject. ' : '')+
      (c.subject?.length ? 'Subject terms: '+c.subject.join(', ')+'. ' : '')+
      'Streaming region: '+c.region+'. '+(c.provider?'Provider: '+c.provider+'. ':'')+
      'Return exact candidate title identities. Regional availability will be checked independently; do not claim a platform from memory. Find alternatives rather than repeating previously rejected titles.';
  }
  function sourceFits(meta, c) {
    if (!meta || !Number.isSafeInteger(Number(meta.tmdb_id)) || Number(meta.tmdb_id)<=0 || !['movie','tv'].includes(meta.media_kind)) return false;
    if (c.kind && c.kind !== meta.media_kind) return false;
    const genres = (Array.isArray(meta.genres) ? meta.genres : []).map(norm);
    if (c.documentary && !genres.includes('documentary')) return false;
    if (c.documentary && genres.some(g => /^(kids|animation)$/.test(g))) return false;
    if (!c.documentary && window.matchPolicy && !window.matchPolicy.fitsQuestion({title:meta.title,type:meta.media_kind==='tv'?'series':'movie',genres:meta.genres,cats:meta.genres,synopsis:meta.overview},c.question)) return false;
    // Only original source text can establish subject fit. Never inspect the AI synopsis here.
    const topic = TOPICS.find(t => t[0] === c.topic);
    if (topic && !topic[2].test(norm([meta.title, meta.overview].join(' ')))) return false;
    if (c.subject?.length && !c.subject.every(word=>norm(meta.title+' '+meta.overview).includes(word))) return false;
    if (meta.availability?.source !== 'tmdb-watch-providers') return false;
    const streams = window.MatchAppCatalogMedia?.availability?.(meta,c.region)?.streams || [];
    if (!streams.length) return false;
    if (c.provider && !streams.some(p => norm(p).includes(c.provider.replace('+','')))) return false;
    return /^https:\/\/image\.tmdb\.org\//.test(meta.poster_large_url || meta.poster_url || '');
  }
  const COPY = {
    en:['Verified streaming options in','No exact streaming match verified in','I will not replace your request with children’s fiction, a different subject, or an unavailable title. Try another provider or explicitly broaden the subject.','Regional provider evidence: TMDB / JustWatch.'],
    pt:['Opções de streaming verificadas em','Não confirmei uma opção exata de streaming em','Não vou substituir seu pedido por ficção infantil, outro assunto ou um título indisponível. Tente outra plataforma ou amplie explicitamente o tema.','Disponibilidade regional: TMDB / JustWatch.'],
    es:['Opciones de streaming verificadas en','No pude verificar una opción exacta de streaming en','No sustituiré tu solicitud por ficción infantil, otro tema o un título no disponible. Prueba otra plataforma o amplía explícitamente el tema.','Disponibilidad regional: TMDB / JustWatch.'],
    fr:['Options de streaming vérifiées en','Aucune option exacte de streaming vérifiée en','Je ne remplacerai pas votre demande par une fiction jeunesse, un autre sujet ou un titre indisponible. Essayez une autre plateforme ou élargissez le sujet.','Disponibilité régionale : TMDB / JustWatch.'],
    de:['Verifizierte Streaming-Angebote in','Kein passendes Streaming-Angebot bestätigt in','Keine Kinderfiktion, anderen Themen oder nicht verfügbaren Titel als Ersatz. Bitte eine andere Plattform wählen oder das Thema erweitern.','Regionale Verfügbarkeit: TMDB / JustWatch.'],
    it:['Opzioni streaming verificate in','Nessuna opzione streaming esatta verificata in','Non sostituirò la richiesta con fiction per bambini, un altro tema o titoli non disponibili. Prova un’altra piattaforma o amplia il tema.','Disponibilità regionale: TMDB / JustWatch.'],
    tr:['Doğrulanmış yayın seçenekleri:','Tam eşleşen yayın doğrulanamadı:','Çocuk kurgusu, başka konu veya erişilemeyen içerik önermeyeceğim. Başka platform deneyin veya konuyu genişletin.','Bölgesel kaynak: TMDB / JustWatch.'],
    ru:['Подтверждённые варианты просмотра:','Точный вариант просмотра не подтверждён:','Детская фантастика, другая тема или недоступные названия не заменят ваш запрос. Попробуйте другую платформу или расширьте тему.','Региональный источник: TMDB / JustWatch.'],
    ar:['خيارات مشاهدة موثقة في','لم أتحقق من خيار مطابق في','لن أستبدل طلبك بخيال للأطفال أو موضوع آخر أو عنوان غير متاح. جرّب منصة أخرى أو وسّع الموضوع.','مصدر التوفر الإقليمي: TMDB / JustWatch.'],
    hi:['सत्यापित स्ट्रीमिंग विकल्प:','सटीक स्ट्रीमिंग विकल्प सत्यापित नहीं हुआ:','बच्चों की कल्पना, अलग विषय या अनुपलब्ध शीर्षक नहीं सुझाऊँगा। दूसरा मंच चुनें या विषय बढ़ाएँ।','क्षेत्रीय स्रोत: TMDB / JustWatch.'],
    id:['Opsi streaming terverifikasi di','Tidak ada opsi persis terverifikasi di','Tidak akan mengganti permintaan dengan fiksi anak, topik lain, atau judul tak tersedia. Coba platform lain atau perluas topik.','Sumber regional: TMDB / JustWatch.'],
    ja:['配信を確認できた作品：','条件に合う配信を確認できませんでした：','子供向けフィクション、別のテーマ、未配信の作品には置き換えません。別のサービスを選ぶかテーマを広げてください。','地域別配信情報：TMDB / JustWatch。'],
    ko:['확인된 스트리밍 작품:','정확한 스트리밍 일치를 확인하지 못했습니다:','아동용 허구, 다른 주제, 이용 불가 작품으로 대체하지 않습니다. 다른 플랫폼을 선택하거나 주제를 넓혀 주세요.','지역 정보: TMDB / JustWatch.'],
    zh:['已核实的流媒体作品：','未核实到完全匹配的作品：','不会用儿童虚构故事、其他主题或不可观看的作品替代。请尝试其他平台或明确扩大主题。','地区来源：TMDB / JustWatch。']
  };
  async function resolve(payload, c, previous = []) {
    if (!c.active) return payload;
    const media = window.MatchAppCatalogMedia;
    const excluded = new Set(previous.map(x => key(x.title)));
    const candidates = (Array.isArray(payload?.results)?payload.results:[]).filter(r=>r?.title && !excluded.has(key(r.title))).slice(0,6);
    let timer, expired = false;
    const work = (async()=>{
      const accepted = [], ids = new Set();
      async function verify(row) {
        if (expired || !row?.title || excluded.has(key(row.title))) return;
        if (window.isDiscoverDisliked?.(row.title)) return;
        const kind = row.kind || c.kind || (/movie|film/i.test(row.type||'')?'movie':'tv');
        // Fresh exact source details; AI genre/platform fields never qualify a title.
        let meta;
        try { meta = await media?.lookupLive?.(row.title,{kind,year:row.year||'',tmdbId:row.tmdbId||null,priority:true}); } catch (_) { return; }
        if (expired || !sourceFits(meta,c)) return;
        if (key(meta.title)!==key(row.title) || (row.year && String(row.year)!==String(meta.year))) return;
        const id = meta.media_kind+':'+meta.tmdb_id;
        if (ids.has(id) || excluded.has(key(meta.title)) || window.isDiscoverDisliked?.(meta.title)) return;
        ids.add(id);
        const target = media.viewingTarget(meta,meta.title,c.region);
        accepted.push({title:meta.title,year:meta.year,type:meta.media_kind==='tv'?'series':'movie',
          cats:c.documentary?['documentary',meta.media_kind==='tv'?'series':'movie']:meta.genres,
          synopsis:meta.overview||'',synopsisLang:'en',realGenres:meta.genres,
          platform:target.provider,watchUrl:target.href,_catalogMedia:meta,_viewing:target,
          _availabilityVerified:true,_watchVerified:true,_watchRegion:c.region});
      }
      await Promise.all(candidates.map(verify));
      if (!accepted.length && c.documentary && !expired && typeof window.tmdbDiscover==='function') {
        // Independent source recovery: discover nonfiction, then verify exact regional details.
        const rows = await window.tmdbDiscover({kind:c.kind||'',genre_ids:[99],region:c.region,provider:c.provider,pages:3},{priority:true}).catch(()=>[]);
        const topic = TOPICS.find(t=>t[0]===c.topic);
        const eligible = rows.filter(r=>!excluded.has(key(r.title)) && (!topic || topic[2].test(norm(r.title+' '+r.overview))) && (!c.subject?.length || c.subject.every(word=>norm(r.title+' '+r.overview).includes(word)))).slice(0,8);
        await Promise.all(eligible.map(verify));
      }
      return accepted.slice(0,3);
    })();
    let results;
    try {
      results = await Promise.race([work,new Promise(resolve=>{timer=setTimeout(()=>{expired=true;resolve([]);},24000);})]);
    } finally { clearTimeout(timer); }
    const lang = String(window.MATCH_LANG||'en').split('-')[0], copy = COPY[lang]||COPY.en;
    const region = media?.countryName?.(c.region)||c.region;
    const answer = results.length
      ? copy[0]+' '+region+': '+results.map(r=>r.title+' ('+r.year+') — '+r.platform).join('; ')+'. '+copy[3]
      : copy[1]+' '+region+(c.topic?' ('+c.topic+')':'')+'. '+copy[2];
    return {...payload,answer,results,_live:results.length>0,_watchChecked:true};
  }
  window.MatchAppWatchVerified=Object.freeze({constraints,prompt,sourceFits,resolve});
})();
