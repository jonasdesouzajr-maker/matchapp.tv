/* Carry an editorial landing choice into the existing, editable Ask AI field.
   This module never submits a question or changes matching/allowance policy. */
(function (w, d) {
  'use strict';
  var moods = ['intense-and-thrilling', 'inspiring', 'cozy-comfort-watch', 'funny', 'light-and-feel-good', 'dark-and-gritty', 'epic-and-adventurous', 'mind-bending', 'heartbreaking', 'romantic', 'nostalgic'];
  var collections = ['movie', 'series', 'k-drama', 'anime', 'documentary'];
  var copy = {
    en: {
      screen: 'Recommend a movie or TV series.', mood: 'Mood:', similar: 'Find something similar to “{title}”.', country: 'Check availability in my selected country.',
      moods: ['intense and thrilling', 'inspiring', 'cozy comfort watch', 'funny', 'light and feel-good', 'dark and gritty', 'epic and adventurous', 'mind-bending', 'heartbreaking', 'romantic', 'nostalgic'],
      formats: ['Recommend a movie.', 'Recommend a TV series.', 'Recommend a Korean drama series.', 'Recommend an anime film or TV series.', 'Recommend a documentary to watch.'],
      netflix: 'Recommend a movie or TV series on Netflix.'
    },
    'pt-BR': {
      screen: 'Recomende um filme ou uma série de TV.', mood: 'Clima:', similar: 'Encontre algo parecido com “{title}”.', country: 'Confira a disponibilidade no país que selecionei.',
      moods: ['intenso e eletrizante', 'inspirador', 'aconchegante e reconfortante', 'engraçado', 'leve e alto-astral', 'sombrio e realista', 'épico e cheio de aventuras', 'instigante e surpreendente', 'comovente e devastador', 'romântico', 'nostálgico'],
      formats: ['Recomende um filme.', 'Recomende uma série de TV.', 'Recomende uma série coreana.', 'Recomende um filme ou uma série de anime.', 'Recomende um documentário para assistir.'],
      netflix: 'Recomende um filme ou uma série de TV na Netflix.'
    },
    es: {
      screen: 'Recomienda una película o serie de televisión.', mood: 'Ambiente:', similar: 'Encuentra algo parecido a “{title}”.', country: 'Comprueba la disponibilidad en el país que he seleccionado.',
      moods: ['intenso y emocionante', 'inspirador', 'acogedor y reconfortante', 'divertido', 'ligero y optimista', 'oscuro y crudo', 'épico y aventurero', 'desconcertante', 'desgarrador', 'romántico', 'nostálgico'],
      formats: ['Recomienda una película.', 'Recomienda una serie de televisión.', 'Recomienda una serie coreana.', 'Recomienda una película o serie de anime.', 'Recomienda un documental para ver.'],
      netflix: 'Recomienda una película o serie de televisión en Netflix.'
    },
    fr: {
      screen: 'Recommande-moi un film ou une série télévisée.', mood: 'Ambiance :', similar: 'Trouve quelque chose de similaire à « {title} ».', country: 'Vérifie la disponibilité dans le pays que j’ai sélectionné.',
      moods: ['intense et palpitante', 'inspirante', 'douillette et réconfortante', 'drôle', 'légère et réjouissante', 'sombre et âpre', 'épique et aventureuse', 'déroutante', 'bouleversante', 'romantique', 'nostalgique'],
      formats: ['Recommande-moi un film.', 'Recommande-moi une série télévisée.', 'Recommande-moi une série coréenne.', 'Recommande-moi un film ou une série d’animation japonaise.', 'Recommande-moi un documentaire à regarder.'],
      netflix: 'Recommande-moi un film ou une série télévisée sur Netflix.'
    },
    de: {
      screen: 'Empfehlen Sie mir einen Film oder eine Fernsehserie.', mood: 'Stimmung:', similar: 'Finden Sie etwas Ähnliches wie „{title}“.', country: 'Prüfen Sie die Verfügbarkeit in meinem ausgewählten Land.',
      moods: ['intensiv und spannend', 'inspirierend', 'gemütlich und wohltuend', 'lustig', 'leicht und aufmunternd', 'düster und ungeschönt', 'episch und abenteuerlich', 'rätselhaft und überraschend', 'herzzerreißend', 'romantisch', 'nostalgisch'],
      formats: ['Empfehlen Sie mir einen Film.', 'Empfehlen Sie mir eine Fernsehserie.', 'Empfehlen Sie mir eine koreanische Dramaserie.', 'Empfehlen Sie mir einen Anime-Film oder eine Anime-Serie.', 'Empfehlen Sie mir eine Dokumentation zum Anschauen.'],
      netflix: 'Empfehlen Sie mir einen Film oder eine Fernsehserie auf Netflix.'
    },
    it: {
      screen: 'Consigliami un film o una serie TV.', mood: 'Atmosfera:', similar: 'Trova qualcosa di simile a “{title}”.', country: 'Verifica la disponibilità nel paese che ho selezionato.',
      moods: ['intensa e avvincente', 'd’ispirazione', 'accogliente e rassicurante', 'divertente', 'leggera e di buonumore', 'cupa e cruda', 'epica e avventurosa', 'spiazzante', 'straziante', 'romantica', 'nostalgica'],
      formats: ['Consigliami un film.', 'Consigliami una serie TV.', 'Consigliami una serie coreana.', 'Consigliami un film o una serie anime.', 'Consigliami un documentario da guardare.'],
      netflix: 'Consigliami un film o una serie TV su Netflix.'
    },
    tr: {
      screen: 'Bir film veya TV dizisi tavsiye et.', mood: 'Ruh hali:', similar: '“{title}” benzeri bir yapım bul.', country: 'Seçtiğim ülkede izlenebilir olup olmadığını kontrol et.',
      moods: ['yoğun ve heyecanlı', 'ilham verici', 'sıcak ve rahatlatıcı', 'komik', 'hafif ve iyi hissettiren', 'karanlık ve sert', 'destansı ve maceralı', 'zihin zorlayıcı', 'yürek burkan', 'romantik', 'nostaljik'],
      formats: ['Bir film tavsiye et.', 'Bir TV dizisi tavsiye et.', 'Bir Kore dizisi tavsiye et.', 'Bir anime filmi veya dizisi tavsiye et.', 'İzlemek için bir belgesel tavsiye et.'],
      netflix: 'Netflix’te bir film veya TV dizisi tavsiye et.'
    },
    ru: {
      screen: 'Посоветуй фильм или сериал.', mood: 'Настроение:', similar: 'Найди что-нибудь похожее на «{title}».', country: 'Проверь доступность в выбранной мной стране.',
      moods: ['напряжённое и захватывающее', 'вдохновляющее', 'уютное и успокаивающее', 'весёлое', 'лёгкое и жизнерадостное', 'мрачное и суровое', 'эпическое и приключенческое', 'запутанное и неожиданное', 'душераздирающее', 'романтическое', 'ностальгическое'],
      formats: ['Посоветуй фильм.', 'Посоветуй сериал.', 'Посоветуй корейскую дораму.', 'Посоветуй аниме-фильм или аниме-сериал.', 'Посоветуй, что посмотреть из документалистики.'],
      netflix: 'Посоветуй фильм или сериал на Netflix.'
    },
    ar: {
      screen: 'اقترح فيلمًا أو مسلسلًا تلفزيونيًا.', mood: 'الأجواء:', similar: 'ابحث عن عمل يشبه «{title}».', country: 'تحقق من توفره في البلد الذي اخترته.',
      moods: ['حماسية ومثيرة', 'ملهمة', 'دافئة ومريحة', 'مضحكة', 'خفيفة ومبهجة', 'قاتمة وقاسية', 'ملحمية ومليئة بالمغامرات', 'محيرة للذهن', 'مفجعة', 'رومانسية', 'تثير الحنين'],
      formats: ['اقترح فيلمًا.', 'اقترح مسلسلًا تلفزيونيًا.', 'اقترح مسلسلًا كوريًا.', 'اقترح فيلم أنمي أو مسلسل أنمي.', 'اقترح عملًا وثائقيًا لمشاهدته.'],
      netflix: 'اقترح فيلمًا أو مسلسلًا تلفزيونيًا على Netflix.'
    },
    hi: {
      screen: 'कोई फ़िल्म या टीवी सीरीज़ सुझाओ।', mood: 'माहौल:', similar: '“{title}” जैसी कोई दूसरी कहानी खोजो।', country: 'मेरे चुने हुए देश में इसकी उपलब्धता जाँचो।',
      moods: ['तीव्र और रोमांचक', 'प्रेरणादायक', 'सुकूनभरा और आरामदायक', 'मज़ेदार', 'हल्का-फुल्का और मन खुश करने वाला', 'अंधकारमय और कठोर', 'भव्य और साहसिक', 'दिमाग़ घुमा देने वाला', 'दिल तोड़ने वाला', 'रोमांटिक', 'पुरानी यादें जगाने वाला'],
      formats: ['कोई फ़िल्म सुझाओ।', 'कोई टीवी सीरीज़ सुझाओ।', 'कोई कोरियाई ड्रामा सीरीज़ सुझाओ।', 'कोई एनीमे फ़िल्म या टीवी सीरीज़ सुझाओ।', 'देखने के लिए कोई डॉक्यूमेंट्री सुझाओ।'],
      netflix: 'Netflix पर कोई फ़िल्म या टीवी सीरीज़ सुझाओ।'
    },
    id: {
      screen: 'Rekomendasikan film atau serial TV.', mood: 'Suasana:', similar: 'Cari tontonan yang mirip dengan “{title}”.', country: 'Periksa ketersediaannya di negara yang saya pilih.',
      moods: ['intens dan menegangkan', 'menginspirasi', 'hangat dan menenangkan', 'lucu', 'ringan dan menyenangkan', 'gelap dan keras', 'epik dan penuh petualangan', 'membingungkan pikiran', 'menguras air mata', 'romantis', 'penuh nostalgia'],
      formats: ['Rekomendasikan film.', 'Rekomendasikan serial TV.', 'Rekomendasikan serial drama Korea.', 'Rekomendasikan film atau serial anime.', 'Rekomendasikan dokumenter untuk ditonton.'],
      netflix: 'Rekomendasikan film atau serial TV di Netflix.'
    },
    ja: {
      screen: '映画かテレビシリーズをおすすめして。', mood: '雰囲気：', similar: '「{title}」に似た作品を探して。', country: '選択した国で視聴できるか確認して。',
      moods: ['緊迫感とスリルがある', '元気や勇気をもらえる', '心が落ち着く温かさがある', '笑える', '軽やかで気分が明るくなる', '暗く厳しい現実を描く', '壮大な冒険がある', '頭をひねる展開がある', '胸が張り裂けるほど切ない', 'ロマンチック', '懐かしさを感じる'],
      formats: ['映画をおすすめして。', 'テレビシリーズをおすすめして。', '韓国ドラマをおすすめして。', 'アニメ映画かアニメシリーズをおすすめして。', '今度観るドキュメンタリー作品をおすすめして。'],
      netflix: 'Netflixの映画かテレビシリーズをおすすめして。'
    },
    ko: {
      screen: '영화나 TV 시리즈를 추천해 줘.', mood: '분위기:', similar: '“{title}”와 비슷한 작품을 찾아 줘.', country: '내가 선택한 국가에서 시청할 수 있는지 확인해 줘.',
      moods: ['강렬하고 긴장감 있는', '영감을 주는', '아늑하고 편안한', '웃긴', '가볍고 기분 좋아지는', '어둡고 거친', '웅장하고 모험적인', '머리를 쓰게 하는', '가슴 아픈', '로맨틱한', '향수를 불러일으키는'],
      formats: ['영화를 추천해 줘.', 'TV 시리즈를 추천해 줘.', '한국 드라마를 추천해 줘.', '애니메이션 영화나 시리즈를 추천해 줘.', '볼 만한 다큐멘터리를 추천해 줘.'],
      netflix: 'Netflix의 영화나 TV 시리즈를 추천해 줘.'
    },
    zh: {
      screen: '推荐一部电影或电视剧。', mood: '氛围：', similar: '寻找与《{title}》相似的作品。', country: '请确认在我所选的国家是否可以观看。',
      moods: ['紧张刺激', '鼓舞人心', '温馨舒适', '幽默搞笑', '轻松愉快', '阴暗冷峻', '史诗冒险', '烧脑', '令人心碎', '浪漫', '怀旧'],
      formats: ['推荐一部电影。', '推荐一部电视剧。', '推荐一部韩剧。', '推荐一部动画电影或动画剧集。', '推荐一部可以观看的纪录片。'],
      netflix: '推荐一部Netflix上的电影或电视剧。'
    }
  };

  function language() {
    var saved;
    try { saved = w.localStorage.getItem('match_lang'); } catch (_) {}
    var code = String(saved || w.MATCH_LANG || d.documentElement.lang || 'en').toLowerCase().replace(/_/g, '-');
    if (code === 'pt' || code.indexOf('pt-') === 0) return 'pt-BR';
    code = code.split('-')[0];
    return Object.prototype.hasOwnProperty.call(copy, code) ? code : 'en';
  }

  function readIntent() {
    var params = new URLSearchParams(w.location.search);
    // Explicit requests and deliberate new chats retain their existing owners.
    if (['video', 'event', 'title', 'q'].some(function (key) { return (params.get(key) || '').trim(); }) || params.get('new') === '1') return null;
    if (params.getAll('landing').length !== 1 || params.getAll('like').length > 1) return null;
    var landing = params.get('landing') || '';
    var parts = landing.split('/');
    if (parts.length !== 2) return null;
    var index = parts[0] === 'moods' ? moods.indexOf(parts[1]) : parts[0] === 'collections' ? collections.indexOf(parts[1]) : -1;
    if (index < 0 && landing !== 'platforms/netflix') return null;
    var title = (params.get('like') || '').trim();
    if (title.length > 300 || /[\u0000-\u001f\u007f]/.test(title)) return null;
    return { landing: landing, kind: parts[0], index: index, title: title };
  }

  function prompt(intent) {
    var words = copy[language()];
    var parts = [intent.kind === 'collections' ? words.formats[intent.index] : intent.kind === 'platforms' ? words.netflix : words.screen];
    if (intent.kind === 'moods') parts.push(words.mood + ' ' + words.moods[intent.index] + '.');
    if (intent.title) parts.push(words.similar.replace('{title}', function () { return intent.title; }));
    parts.push(words.country);
    return parts.join(' ');
  }

  // The landing facets contain screen works as well as topic-tagged channels
  // and audio. An offline recovery must keep the selected screen format.
  var screenFormats = ['movie', 'series', 'limited series', 'k-drama', 'anime', 'vertical micro-drama', 'novela brasileira', 'telenovela', 'documentary', 'stand-up comedy special', 'reality show', 'european cinema', 'bollywood', 'j-drama', 'short film', 'c-drama', 'turkish dizi', 'nollywood'];
  var otherFormats = ['youtube channel', 'youtube shorts', 'podcast', 'spotify playlist', 'apple music playlist', 'spotify single', 'music album', 'music artist', 'audiobook'];

  function capture(question) {
    var intent = readIntent();
    if (!active || active.edited || !intent || active.field !== d.getElementById('discover-new-input') ||
        active.signature !== intent.landing + '\n' + intent.title ||
        active.field.value !== active.value || question !== active.value) return null;
    // Snapshot before the existing submit action clears the field. This data
    // never changes the visible/AI question or survives in storage/history.
    return Object.freeze({
      mood: intent.kind === 'moods' ? copy.en.moods[intent.index] : '',
      category: intent.kind === 'collections' ? ['movie', 'series', 'K-drama', 'anime', 'documentary'][intent.index] : '',
      requiresLive: !!intent.title || intent.kind === 'platforms'
    });
  }

  function allowsFallback(context, entry) {
    if (!context) return true;
    // Local tags cannot prove title similarity or regional Netflix availability.
    if (context.requiresLive || !entry) return false;
    var cats = Array.isArray(entry.cats) ? entry.cats.map(function (cat) { return String(cat).trim().toLowerCase(); }) : [];
    if (cats.some(function (cat) { return otherFormats.indexOf(cat) >= 0; }) ||
        !cats.some(function (cat) { return screenFormats.indexOf(cat) >= 0; })) return false;
    if (context.category && cats.indexOf(context.category.toLowerCase()) < 0) return false;
    if (context.mood && (!Array.isArray(entry.moods) || entry.moods.indexOf(context.mood) < 0)) return false;
    // Retain the shared heavy/light and comfort-content protections as well as
    // the exact tag. No new score, inferred genre or fallback identity is made.
    return !w.matchPolicy?.genreFits || w.matchPolicy.genreFits(entry, {
      mood: context.mood ? [context.mood] : [], cat: context.category ? [context.category] : []
    });
  }

  var active = null;
  function apply() {
    var intent = readIntent();
    var field = d.getElementById('discover-new-input');
    if (!intent || !field) return false;
    var signature = intent.landing + '\n' + intent.title;
    if (!active) {
      if (field.value) return false;
      active = { field: field, signature: signature, value: '', edited: false };
      field.addEventListener('input', function () { active.edited = true; });
      field.addEventListener('change', function () { active.edited = true; });
    }
    // A typed/dictated edit, sent request or history change owns the composer.
    if (active.edited || active.field !== field || active.signature !== signature || field.value !== active.value) return false;
    active.value = prompt(intent);
    field.value = active.value;
    w.autoGrowComposer?.();
    return true;
  }

  w.MatchAppLandingIntent = Object.freeze({ apply: apply, capture: capture, allowsFallback: allowsFallback });
  d.addEventListener('matchapp:langchange', function () { if (active) apply(); });
  w.addEventListener('storage', function (event) { if (active && event.key === 'match_lang') apply(); });
})(window, document);
