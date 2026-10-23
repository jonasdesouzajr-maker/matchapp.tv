/* ============================================================
   MatchApp — catalogue media enrichment
   ------------------------------------------------------------
   Read-only browser layer over public.catalog_media_metadata.
   It never decides what to recommend. The existing Match/Kids engines remain
   authoritative; this module only enriches a title AFTER the app selected it.

   Safety rules:
   - exact normalized-title lookup; no fuzzy identity swapping
   - remote media is optional and never blocks a result
   - Kids previews require server-derived kids_approved=true
   - only trusted poster/video/audio hosts are rendered
   - every poster failure falls back to metadata art, then local/generated art
   ============================================================ */
(function(){
  'use strict';

  const TABLE='catalog_media_metadata';
  const CACHE=new Map();
  const INFLIGHT=new Map();
  // Do not confuse a real empty catalogue row with a transient SQL failure.
  const NEGATIVE_UNTIL=new Map();
  const LIVE_CACHE=new Map();
  let GENRE_INDEX=null;
  let GENRE_INFLIGHT=null;
  const TRUSTED_POSTER=/^https:\/\/(?:image\.tmdb\.org|is\d+-ssl\.mzstatic\.com)\//i;
  const TRUSTED_AUDIO=/^https:\/\/audio-ssl\.itunes\.apple\.com\//i;
  const TRUSTED_EMBED=/^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{6,32}(?:\?|$)/i;

  function normalise(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');}
  function esc(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  // Authored adult result labels. Source records, provider names and action
  // handlers stay canonical; a language switch only repaints existing text.
  const RESULT_COPY=Object.freeze({
    "en":{"genres":"Genres","streamingNow":"Streaming in {region} now.","cinemaNoStream":"In cinemas in {region}. Streaming is not listed there yet.","notStreaming":"Not currently listed for streaming in {region}.","watchOptions":"Watch options in {region}","rent":"Rent","buy":"Buy","watch":"Watch","availability":"Availability","cinemaNow":"In cinemas{date}","cinemaRelease":"Cinema release · {date}","nearby":"Cinemas & showtimes near me","showtimes":"Cinema release & showtimes","elsewhere":"Streaming in other countries","notify":"🔔 Notify me when it streams in {region}","signIn":"Sign in to follow streaming availability.","following":"✓ You’ll be notified in {region}","titleDetails":"Title details","country":"Country","countries":"Countries","cast":"Cast","rated":"Rated {rating}","minutes":"{n} min","movie":"Movie","series":"TV series","chooseCountry":"Choose your country in your profile to check local viewing options."},
    "pt-BR":{"genres":"Gêneros","streamingNow":"Em streaming agora · {region}","cinemaNoStream":"Nos cinemas · {region}. O streaming ainda não está listado nessa região.","notStreaming":"Ainda não há streaming listado · {region}.","watchOptions":"Onde assistir · {region}","rent":"Alugar","buy":"Comprar","watch":"Assistir","availability":"Disponibilidade","cinemaNow":"Nos cinemas{date}","cinemaRelease":"Estreia nos cinemas · {date}","nearby":"Cinemas e sessões perto de mim","showtimes":"Estreia e sessões de cinema","elsewhere":"Em streaming em outros países","notify":"🔔 Avise-me quando chegar ao streaming · {region}","signIn":"Entre na sua conta para acompanhar a disponibilidade em streaming.","following":"✓ Você será avisado · {region}","titleDetails":"Detalhes do título","country":"País","countries":"Países","cast":"Elenco","rated":"Classificação {rating}","minutes":"{n} min","movie":"Filme","series":"Série","chooseCountry":"Escolha seu país no perfil para consultar onde assistir na sua região."},
    "es":{"genres":"Géneros","streamingNow":"En streaming ahora · {region}","cinemaNoStream":"En cines · {region}. Aún no se ha listado streaming en esta región.","notStreaming":"Actualmente no se ha listado streaming · {region}.","watchOptions":"Dónde ver · {region}","rent":"Alquilar","buy":"Comprar","watch":"Ver","availability":"Disponibilidad","cinemaNow":"En cines{date}","cinemaRelease":"Estreno en cines · {date}","nearby":"Cines y horarios cerca de mí","showtimes":"Estreno y horarios de cine","elsewhere":"En streaming en otros países","notify":"🔔 Avísame cuando esté en streaming · {region}","signIn":"Inicia sesión para seguir la disponibilidad en streaming.","following":"✓ Recibirás un aviso · {region}","titleDetails":"Detalles del título","country":"País","countries":"Países","cast":"Reparto","rated":"Clasificación {rating}","minutes":"{n} min","movie":"Película","series":"Serie","chooseCountry":"Elige tu país en el perfil para consultar dónde ver en tu región."},
    "fr":{"genres":"Genres","streamingNow":"En streaming maintenant · {region}","cinemaNoStream":"Au cinéma · {region}. Aucun streaming n’est encore répertorié dans cette région.","notStreaming":"Aucun streaming actuellement répertorié · {region}.","watchOptions":"Où regarder · {region}","rent":"Louer","buy":"Acheter","watch":"Regarder","availability":"Disponibilité","cinemaNow":"Au cinéma{date}","cinemaRelease":"Sortie au cinéma · {date}","nearby":"Cinémas et séances près de moi","showtimes":"Sortie et séances au cinéma","elsewhere":"En streaming dans d’autres pays","notify":"🔔 M’avertir de la disponibilité en streaming · {region}","signIn":"Connectez-vous pour suivre la disponibilité en streaming.","following":"✓ Vous recevrez une notification · {region}","titleDetails":"Détails du titre","country":"Pays","countries":"Pays","cast":"Distribution","rated":"Classification {rating}","minutes":"{n} min","movie":"Film","series":"Série","chooseCountry":"Choisissez votre pays dans votre profil pour consulter les options de visionnage locales."},
    "de":{"genres":"Genres","streamingNow":"Jetzt im Streaming · {region}","cinemaNoStream":"Im Kino · {region}. Streaming ist dort noch nicht gelistet.","notStreaming":"Derzeit kein Streaming gelistet · {region}.","watchOptions":"Ansehoptionen · {region}","rent":"Leihen","buy":"Kaufen","watch":"Ansehen","availability":"Verfügbarkeit","cinemaNow":"Im Kino{date}","cinemaRelease":"Kinostart · {date}","nearby":"Kinos und Spielzeiten in meiner Nähe","showtimes":"Kinostart und Spielzeiten","elsewhere":"Streaming in anderen Ländern","notify":"🔔 Bei Streaming-Verfügbarkeit benachrichtigen · {region}","signIn":"Melde dich an, um die Streaming-Verfügbarkeit zu verfolgen.","following":"✓ Du wirst benachrichtigt · {region}","titleDetails":"Details zum Titel","country":"Land","countries":"Länder","cast":"Besetzung","rated":"Altersfreigabe {rating}","minutes":"{n} Min.","movie":"Film","series":"Serie","chooseCountry":"Wähle dein Land im Profil, um die verfügbaren Angebote vor Ort zu prüfen."},
    "it":{"genres":"Generi","streamingNow":"Ora in streaming · {region}","cinemaNoStream":"Al cinema · {region}. Lo streaming non è ancora segnalato in questa regione.","notStreaming":"Nessuno streaming attualmente segnalato · {region}.","watchOptions":"Dove guardare · {region}","rent":"Noleggia","buy":"Acquista","watch":"Guarda","availability":"Disponibilità","cinemaNow":"Al cinema{date}","cinemaRelease":"Uscita al cinema · {date}","nearby":"Cinema e spettacoli vicino a me","showtimes":"Uscita e orari al cinema","elsewhere":"In streaming in altri paesi","notify":"🔔 Avvisami quando arriva in streaming · {region}","signIn":"Accedi per seguire la disponibilità in streaming.","following":"✓ Riceverai una notifica · {region}","titleDetails":"Dettagli del titolo","country":"Paese","countries":"Paesi","cast":"Cast","rated":"Classificazione {rating}","minutes":"{n} min","movie":"Film","series":"Serie","chooseCountry":"Scegli il tuo paese nel profilo per verificare le opzioni di visione locali."},
    "tr":{"genres":"Türler","streamingNow":"Şimdi çevrim içi yayında · {region}","cinemaNoStream":"Sinemalarda · {region}. Bu bölgede henüz çevrim içi yayın listelenmiyor.","notStreaming":"Şu anda çevrim içi yayın listelenmiyor · {region}.","watchOptions":"İzleme seçenekleri · {region}","rent":"Kirala","buy":"Satın al","watch":"İzle","availability":"Erişilebilirlik","cinemaNow":"Sinemalarda{date}","cinemaRelease":"Vizyon tarihi · {date}","nearby":"Yakınımdaki sinemalar ve seanslar","showtimes":"Vizyon tarihi ve seanslar","elsewhere":"Diğer ülkelerde çevrim içi yayında","notify":"🔔 Çevrim içi yayına geldiğinde bildir · {region}","signIn":"Çevrim içi yayın durumunu takip etmek için oturum açın.","following":"✓ Bildirim alacaksınız · {region}","titleDetails":"Yapım ayrıntıları","country":"Ülke","countries":"Ülkeler","cast":"Oyuncular","rated":"Yaş sınıflandırması {rating}","minutes":"{n} dk","movie":"Film","series":"Dizi","chooseCountry":"Yerel izleme seçeneklerini görmek için profilinizde ülkenizi seçin."},
    "ru":{"genres":"Жанры","streamingNow":"Сейчас доступно онлайн · {region}","cinemaNoStream":"В кинотеатрах · {region}. Онлайн-показ здесь пока не указан.","notStreaming":"Онлайн-показ сейчас не указан · {region}.","watchOptions":"Где смотреть · {region}","rent":"Арендовать","buy":"Купить","watch":"Смотреть","availability":"Доступность","cinemaNow":"В кинотеатрах{date}","cinemaRelease":"Премьера в кино · {date}","nearby":"Кинотеатры и сеансы рядом","showtimes":"Премьера и сеансы в кино","elsewhere":"Доступно онлайн в других странах","notify":"🔔 Уведомить о появлении онлайн · {region}","signIn":"Войдите, чтобы следить за доступностью онлайн.","following":"✓ Вы получите уведомление · {region}","titleDetails":"Подробнее о произведении","country":"Страна","countries":"Страны","cast":"В ролях","rated":"Возрастной рейтинг {rating}","minutes":"{n} мин","movie":"Фильм","series":"Сериал","chooseCountry":"Выберите страну в профиле, чтобы проверить доступные варианты просмотра."},
    "ar":{"genres":"الأنواع","streamingNow":"متاح للبث الآن · {region}","cinemaNoStream":"في دور السينما · {region}. لم يُدرج البث في هذه المنطقة بعد.","notStreaming":"البث غير مدرج حاليًا · {region}.","watchOptions":"خيارات المشاهدة · {region}","rent":"استئجار","buy":"شراء","watch":"مشاهدة","availability":"التوفر","cinemaNow":"في دور السينما{date}","cinemaRelease":"الإصدار السينمائي · {date}","nearby":"دور السينما ومواعيد العرض بالقرب مني","showtimes":"الإصدار السينمائي ومواعيد العرض","elsewhere":"متاح للبث في دول أخرى","notify":"🔔 أبلغني عند توفره للبث · {region}","signIn":"سجّل الدخول لمتابعة توفر البث.","following":"✓ ستتلقى إشعارًا · {region}","titleDetails":"تفاصيل العمل","country":"البلد","countries":"البلدان","cast":"طاقم التمثيل","rated":"التصنيف العمري {rating}","minutes":"{n} دقيقة","movie":"فيلم","series":"مسلسل","chooseCountry":"اختر بلدك في ملفك الشخصي للاطلاع على خيارات المشاهدة المحلية."},
    "hi":{"genres":"शैलियाँ","streamingNow":"अभी स्ट्रीमिंग पर · {region}","cinemaNoStream":"सिनेमाघरों में · {region}। इस क्षेत्र में स्ट्रीमिंग अभी सूचीबद्ध नहीं है।","notStreaming":"अभी स्ट्रीमिंग सूचीबद्ध नहीं है · {region}।","watchOptions":"देखने के विकल्प · {region}","rent":"किराये पर लें","buy":"खरीदें","watch":"देखें","availability":"उपलब्धता","cinemaNow":"सिनेमाघरों में{date}","cinemaRelease":"सिनेमाघरों में रिलीज़ · {date}","nearby":"मेरे पास के सिनेमाघर और शो का समय","showtimes":"सिनेमा रिलीज़ और शो का समय","elsewhere":"अन्य देशों में स्ट्रीमिंग पर","notify":"🔔 स्ट्रीमिंग पर आने पर सूचित करें · {region}","signIn":"स्ट्रीमिंग की उपलब्धता पर नज़र रखने के लिए साइन इन करें।","following":"✓ आपको सूचना मिलेगी · {region}","titleDetails":"शीर्षक का विवरण","country":"देश","countries":"देश","cast":"कलाकार","rated":"आयु रेटिंग {rating}","minutes":"{n} मिनट","movie":"फ़िल्म","series":"सीरीज़","chooseCountry":"स्थानीय देखने के विकल्प जाँचने के लिए अपनी प्रोफ़ाइल में देश चुनें।"},
    "id":{"genres":"Genre","streamingNow":"Streaming sekarang · {region}","cinemaNoStream":"Di bioskop · {region}. Streaming belum tercantum di wilayah ini.","notStreaming":"Streaming saat ini belum tercantum · {region}.","watchOptions":"Pilihan menonton · {region}","rent":"Sewa","buy":"Beli","watch":"Tonton","availability":"Ketersediaan","cinemaNow":"Di bioskop{date}","cinemaRelease":"Rilis bioskop · {date}","nearby":"Bioskop dan jadwal tayang di dekat saya","showtimes":"Rilis bioskop dan jadwal tayang","elsewhere":"Streaming di negara lain","notify":"🔔 Beri tahu saat tersedia untuk streaming · {region}","signIn":"Masuk untuk mengikuti ketersediaan streaming.","following":"✓ Anda akan diberi tahu · {region}","titleDetails":"Detail judul","country":"Negara","countries":"Negara","cast":"Pemeran","rated":"Rating usia {rating}","minutes":"{n} mnt","movie":"Film","series":"Serial","chooseCountry":"Pilih negara di profil untuk memeriksa pilihan menonton setempat."},
    "ja":{"genres":"ジャンル","streamingNow":"配信中 · {region}","cinemaNoStream":"劇場公開中 · {region}。この地域では配信情報がまだありません。","notStreaming":"現在の配信情報はありません · {region}。","watchOptions":"視聴方法 · {region}","rent":"レンタル","buy":"購入","watch":"視聴","availability":"配信状況","cinemaNow":"劇場公開中{date}","cinemaRelease":"劇場公開日 · {date}","nearby":"近くの映画館と上映時間","showtimes":"劇場公開日と上映時間","elsewhere":"ほかの国で配信中","notify":"🔔 配信開始時に通知する · {region}","signIn":"配信状況をフォローするにはログインしてください。","following":"✓ 通知をお送りします · {region}","titleDetails":"作品の詳細","country":"製作国","countries":"製作国","cast":"キャスト","rated":"年齢区分 {rating}","minutes":"{n}分","movie":"映画","series":"シリーズ","chooseCountry":"地域の視聴方法を確認するには、プロフィールで国を選択してください。"},
    "ko":{"genres":"장르","streamingNow":"현재 스트리밍 중 · {region}","cinemaNoStream":"극장 상영 중 · {region}. 이 지역의 스트리밍 정보는 아직 없습니다.","notStreaming":"현재 스트리밍 정보가 없습니다 · {region}.","watchOptions":"시청 방법 · {region}","rent":"대여","buy":"구매","watch":"시청","availability":"이용 가능 여부","cinemaNow":"극장 상영 중{date}","cinemaRelease":"극장 개봉일 · {date}","nearby":"내 주변 영화관 및 상영 시간","showtimes":"극장 개봉일 및 상영 시간","elsewhere":"다른 국가에서 스트리밍 중","notify":"🔔 스트리밍 시작 시 알림 받기 · {region}","signIn":"스트리밍 이용 가능 여부를 확인하려면 로그인하세요.","following":"✓ 알림을 보내드립니다 · {region}","titleDetails":"작품 상세 정보","country":"제작 국가","countries":"제작 국가","cast":"출연진","rated":"연령 등급 {rating}","minutes":"{n}분","movie":"영화","series":"시리즈","chooseCountry":"지역별 시청 방법을 확인하려면 프로필에서 국가를 선택하세요."},
    "zh":{"genres":"类型","streamingNow":"正在流媒体播放 · {region}","cinemaNoStream":"院线上映中 · {region}。该地区尚未列出流媒体播放信息。","notStreaming":"目前尚未列出流媒体播放信息 · {region}。","watchOptions":"观看方式 · {region}","rent":"租借","buy":"购买","watch":"观看","availability":"播放情况","cinemaNow":"院线上映中{date}","cinemaRelease":"院线上映日期 · {date}","nearby":"附近的电影院和场次","showtimes":"院线上映日期和场次","elsewhere":"其他国家的流媒体播放情况","notify":"🔔 流媒体上线时通知我 · {region}","signIn":"请登录以关注流媒体播放情况。","following":"✓ 届时将通知你 · {region}","titleDetails":"作品详情","country":"制作国家","countries":"制作国家","cast":"演员","rated":"年龄分级 {rating}","minutes":"{n}分钟","movie":"电影","series":"剧集","chooseCountry":"请在个人资料中选择国家，以查看当地的观看选项。"}
  });
  const RESULT_GENRES=Object.freeze({
    "en":["Action","Adventure","Animation","Comedy","Crime","Documentary","Drama","Family","Fantasy","History","Horror","Music","Mystery","Romance","Science Fiction","TV Movie","Thriller","War","Western","Action & Adventure","Kids","News","Reality","Sci-Fi & Fantasy","Soap","Talk","War & Politics"],
    "pt-BR":["Ação","Aventura","Animação","Comédia","Crime","Documentário","Drama","Família","Fantasia","História","Terror","Música","Mistério","Romance","Ficção científica","Filme para TV","Suspense","Guerra","Faroeste","Ação e aventura","Infantil","Notícias","Reality show","Ficção científica e fantasia","Novela","Programa de entrevistas","Guerra e política"],
    "es":["Acción","Aventura","Animación","Comedia","Crimen","Documental","Drama","Familia","Fantasía","Historia","Terror","Música","Misterio","Romance","Ciencia ficción","Película para TV","Suspenso","Guerra","Wéstern","Acción y aventura","Infantil","Noticias","Reality show","Ciencia ficción y fantasía","Telenovela","Programa de entrevistas","Guerra y política"],
    "fr":["Action","Aventure","Animation","Comédie","Crime","Documentaire","Drame","Familial","Fantastique","Histoire","Horreur","Musique","Mystère","Romance","Science-fiction","Téléfilm","Thriller","Guerre","Western","Action et aventure","Jeunesse","Actualités","Téléréalité","Science-fiction et fantastique","Feuilleton","Émission d’entretiens","Guerre et politique"],
    "de":["Action","Abenteuer","Animation","Komödie","Krimi","Dokumentarfilm","Drama","Familie","Fantasy","Geschichte","Horror","Musik","Mystery","Romanze","Science-Fiction","Fernsehfilm","Thriller","Krieg","Western","Action und Abenteuer","Kinder","Nachrichten","Reality-TV","Science-Fiction und Fantasy","Seifenoper","Talkshow","Krieg und Politik"],
    "it":["Azione","Avventura","Animazione","Commedia","Crime","Documentario","Dramma","Famiglia","Fantasy","Storia","Horror","Musica","Mistero","Romantico","Fantascienza","Film TV","Thriller","Guerra","Western","Azione e avventura","Bambini","Notizie","Reality","Fantascienza e fantasy","Soap opera","Talk show","Guerra e politica"],
    "tr":["Aksiyon","Macera","Animasyon","Komedi","Suç","Belgesel","Dram","Aile","Fantastik","Tarih","Korku","Müzik","Gizem","Romantik","Bilim kurgu","TV filmi","Gerilim","Savaş","Vahşi Batı","Aksiyon ve macera","Çocuk","Haber","Gerçeklik programı","Bilim kurgu ve fantastik","Pembe dizi","Söyleşi programı","Savaş ve politika"],
    "ru":["Боевик","Приключения","Мультфильм","Комедия","Криминал","Документальный","Драма","Семейный","Фэнтези","История","Ужасы","Музыка","Детектив","Мелодрама","Фантастика","Телефильм","Триллер","Военный","Вестерн","Боевик и приключения","Детский","Новости","Реалити-шоу","Фантастика и фэнтези","Мыльная опера","Ток-шоу","Война и политика"],
    "ar":["أكشن","مغامرة","رسوم متحركة","كوميديا","جريمة","وثائقي","دراما","عائلي","فانتازيا","تاريخ","رعب","موسيقى","غموض","رومانسية","خيال علمي","فيلم تلفزيوني","إثارة","حرب","أفلام الغرب الأمريكي","أكشن ومغامرة","أطفال","أخبار","تلفزيون الواقع","خيال علمي وفانتازيا","مسلسل يومي","برنامج حواري","حرب وسياسة"],
    "hi":["एक्शन","रोमांच","एनीमेशन","कॉमेडी","अपराध","डॉक्यूमेंट्री","ड्रामा","पारिवारिक","फ़ैंटेसी","इतिहास","हॉरर","संगीत","रहस्य","रोमांस","विज्ञान कथा","टीवी फ़िल्म","थ्रिलर","युद्ध","वेस्टर्न","एक्शन और रोमांच","बच्चों के लिए","समाचार","रियलिटी शो","विज्ञान कथा और फ़ैंटेसी","धारावाहिक","टॉक शो","युद्ध और राजनीति"],
    "id":["Aksi","Petualangan","Animasi","Komedi","Kejahatan","Dokumenter","Drama","Keluarga","Fantasi","Sejarah","Horor","Musik","Misteri","Romansa","Fiksi ilmiah","Film TV","Cerita seru","Perang","Koboi","Aksi dan petualangan","Anak-anak","Berita","Acara realitas","Fiksi ilmiah dan fantasi","Sinetron","Gelar wicara","Perang dan politik"],
    "ja":["アクション","アドベンチャー","アニメーション","コメディ","犯罪","ドキュメンタリー","ドラマ","ファミリー","ファンタジー","歴史","ホラー","音楽","ミステリー","ロマンス","SF","テレビ映画","スリラー","戦争","西部劇","アクション＆アドベンチャー","キッズ","ニュース","リアリティ","SF＆ファンタジー","連続ドラマ","トーク番組","戦争＆政治"],
    "ko":["액션","모험","애니메이션","코미디","범죄","다큐멘터리","드라마","가족","판타지","역사","공포","음악","미스터리","로맨스","SF","TV 영화","스릴러","전쟁","서부극","액션 및 모험","어린이","뉴스","리얼리티","SF 및 판타지","연속극","토크쇼","전쟁 및 정치"],
    "zh":["动作","冒险","动画","喜剧","犯罪","纪录片","剧情","家庭","奇幻","历史","恐怖","音乐","悬疑","爱情","科幻","电视电影","惊悚","战争","西部","动作与冒险","儿童","新闻","真人秀","科幻与奇幻","肥皂剧","脱口秀","战争与政治"]
  });

  const RESULT_GENRE_INDEX=new Map();
  Object.values(RESULT_GENRES).forEach(labels=>labels.forEach((label,index)=>RESULT_GENRE_INDEX.set(normalise(label),index)));
  ['Science-Fiction','Sci-Fi'].forEach(label=>RESULT_GENRE_INDEX.set(normalise(label),14));
  const RESULT_TEXT_RECORDS=new WeakMap(),RESULT_FACT_RECORDS=new WeakMap();
  function resultLanguage(){
    let saved='';try{saved=localStorage.getItem('match_lang')||'';}catch(_){}
    // setLanguage persists the explicit choice before painting. A stale
    // result locale or ambient MATCH_LANG must not override that choice.
    for(const value of [saved,window.MATCH_LANG,document.documentElement.lang]){
      const raw=String(value||'').replace(/_/g,'-');
      const lang=/^pt(?:-|$)/i.test(raw)?'pt-BR':raw.split('-')[0].toLowerCase();
      if(Object.hasOwn(RESULT_COPY,lang))return lang;
    }
    return 'en';
  }
  function resultCountry(value){
    const raw=String(value||'').trim(),code=/^[A-Za-z]{2}$/.test(raw)?raw.toUpperCase():COUNTRY_CODES[raw.toLowerCase()];
    if(!code)return raw;
    try{return new Intl.DisplayNames([resultLanguage()],{type:'region'}).of(code)||code;}catch(_){return code;}
  }
  function resultCopy(key,params={},kids=false){
    const copy=RESULT_COPY[kids?'en':resultLanguage()];
    return String(copy[key]||'').replace(/\{(\w+)\}/g,(_,name)=>name==='region'?(kids?countryName(params[name]):resultCountry(params[name])):String(params[name]??''));
  }
  function paintResultCopy(node,key,params={},kids=false,suffix=''){
    node.textContent=resultCopy(key,params,kids)+suffix;
    if(!kids){node.dataset.maResultCopy=key;RESULT_TEXT_RECORDS.set(node,{key,params,suffix});}
    return node;
  }
  function resultGenre(value){
    const raw=String(value||'').trim(),index=RESULT_GENRE_INDEX.get(normalise(raw));
    return index===undefined?raw:RESULT_GENRES[resultLanguage()][index];
  }
  function resultMetadata(meta){
    const bits=[];
    if(meta.year)bits.push(meta.year);
    if(meta.runtime_minutes)bits.push(resultCopy('minutes',{n:meta.runtime_minutes}));
    if(meta.content_rating)bits.push(resultCopy('rated',{rating:meta.content_rating}));
    if(meta.vote_average)bits.push('TMDB ★ '+Number(meta.vote_average).toFixed(1));
    (Array.isArray(meta.genres)?meta.genres:[]).slice(0,5).forEach(g=>bits.push(resultGenre(g)));
    return bits.join(' · ');
  }
  function resultFact(value,kind='auto'){
    if(kind==='metadata')return resultMetadata(value);
    if(kind==='countries')return value.map(resultCountry).filter(Boolean).join(', ');
    const raw=String(value||'').trim();
    if(kind==='country'||(kind==='auto'&&COUNTRY_CODES[raw.toLowerCase()]))return resultCountry(raw);
    if(kind==='genre')return resultGenre(raw);
    const key=raw.toLowerCase();
    if(key==='movie'||key==='film')return resultCopy('movie');
    if(key==='series'||key==='tv'||key==='tv series')return resultCopy('series');
    const option=[...(document.getElementById('q-category')?.options||[])].find(item=>String(item.value).toLowerCase()===key);
    const i18nKey=option?.getAttribute('data-i18n');let translated='';
    try{if(i18nKey&&typeof window.t==='function')translated=window.t(i18nKey,resultLanguage());}catch(_){}
    if(translated&&translated!==i18nKey)return translated;
    return resultGenre(raw);
  }
  function paintResultFact(node,value,kind='auto'){
    const painted=resultFact(value,kind);
    node.textContent=painted;node.dataset.maResultFact=kind;
    RESULT_FACT_RECORDS.set(node,{value,kind,painted});
    return node;
  }
  function localizeResultFacts(root=document){
    if(document.documentElement.classList.contains('kids-mode')||location.pathname.startsWith('/kids/'))return;
    root.querySelectorAll('#res-factbar > span,[data-ma-result-fact]').forEach(node=>{
      const record=RESULT_FACT_RECORDS.get(node);
      if(!record){paintResultFact(node,node.textContent);return;}
      const value=node.textContent===record.painted||typeof record.value!=='string'?record.value:node.textContent;
      paintResultFact(node,value,record.kind);
    });
  }
  function localizeResultLabels(){
    if(document.documentElement.classList.contains('kids-mode')||location.pathname.startsWith('/kids/'))return;
    document.querySelectorAll('[data-ma-result-copy]').forEach(node=>{
      const record=RESULT_TEXT_RECORDS.get(node);
      if(record)node.textContent=resultCopy(record.key,record.params)+record.suffix;
    });
    localizeResultFacts();
  }

  function localPoster(title){
    try{if(typeof window.generateLocalPosterSVG==='function'){const result=window.generateLocalPosterSVG(title,{cats:[]});if(typeof result==='string'&&result)return result;}}catch(_){}
    const t=esc(String(title||'MatchApp').slice(0,52));
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#130734"/><stop offset="1" stop-color="#402562"/></linearGradient></defs><rect width="600" height="900" fill="url(#g)"/><circle cx="300" cy="300" r="92" fill="none" stroke="#E5C158" stroke-width="10"/><path d="M275 245l110 55-110 55z" fill="#E5C158"/><text x="300" y="510" fill="#fff" font-family="Arial,sans-serif" font-size="38" font-weight="700" text-anchor="middle">${t}</text><text x="300" y="770" fill="#E5C158" font-family="Arial,sans-serif" font-size="25" font-weight="700" text-anchor="middle">MATCHAPP.TV</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  function titleForImage(img){return img?.dataset?.title||img?.dataset?.posterTitle||img?.closest?.('[data-title]')?.dataset?.title||(img?.id==='res-poster-img'?document.getElementById('res-title')?.textContent:'')||img?.alt?.replace(/\s+(?:poster|cover|artwork)$/i,'')||'MatchApp';}

  async function lookup(title,opts={}){
    const sb=window.supabaseClient;if(!sb||!title)return null;
    const key=[normalise(title),opts.year||'',opts.kind||'',opts.kids?'kids':'all'].join('::');
    if(CACHE.has(key))return CACHE.get(key);
    if(NEGATIVE_UNTIL.has(key)){
      if(Date.now()<NEGATIVE_UNTIL.get(key))return null;
      NEGATIVE_UNTIL.delete(key);
    }
    if(INFLIGHT.has(key))return INFLIGHT.get(key);
    const p=(async()=>{try{
      let q=sb.from(TABLE).select('source_key,title,year,media_kind,tmdb_id,poster_url,poster_large_url,poster_original_url,backdrop_url,overview,genres,runtime_minutes,content_rating,vote_average,original_language,origin_countries,cast_members,preview_kind,preview_provider,preview_url,preview_embed_url,availability,kids_approved,kids_age_bands,is_catalog_title,is_trending,updated_at').eq('normalized_title',normalise(title));
      if(opts.year)q=q.eq('year',Number(opts.year));if(opts.kind)q=q.eq('media_kind',opts.kind);if(opts.kids)q=q.eq('kids_approved',true);
      const {data,error}=await q.order('is_catalog_title',{ascending:false}).order('updated_at',{ascending:false}).limit(4);
      if(error||!Array.isArray(data))return null;
      if(!data.length){NEGATIVE_UNTIL.set(key,Date.now()+30000);return null;}
      const exact=data.find(r=>normalise(r.title)===normalise(title))||data[0];
      NEGATIVE_UNTIL.delete(key);CACHE.set(key,exact);return exact;
    }catch(_){return null;}finally{INFLIGHT.delete(key);}})();INFLIGHT.set(key,p);return p;
  }
  async function lookupLive(title,opts={}){
    if(!title||opts.kids)return null;
    const requestedId=Number(opts.tmdbId);
    const requestedKind=['movie','tv'].includes(opts.kind)?opts.kind:'';
    const canUseExact=Number.isSafeInteger(requestedId)&&requestedId>0&&requestedKind&&typeof window.tmdbDetails==='function';
    if(typeof window.tmdbLookup!=='function'&&!canUseExact)return null;
    const key=[normalise(title),opts.year||'',requestedKind,canUseExact?requestedId:''].join('::');
    if(LIVE_CACHE.has(key))return await LIVE_CACHE.get(key);
    const p=(async()=>{try{
      let found=null,details=null;
      if(canUseExact){
        details=await window.tmdbDetails(requestedId,requestedKind,{priority:opts.priority===true});
        if(details&&details.adult!==true&&Number(details.tmdbId)===requestedId&&details.kind===requestedKind)found=details;
      }
      // A pinned ID is more authoritative than title text. If its detail
      // lookup fails, do not swap in unrelated same-name artwork.
      if(canUseExact&&!found)return null;
      if(!found){
        found=await window.tmdbLookup(title,{
          year:opts.year||'',kind:requestedKind,cats:opts.cats||[],
          priority:opts.priority===true
        });
        if(!found||found.adult===true||!Number.isSafeInteger(Number(found.tmdbId))||!['movie','tv'].includes(found.kind))return null;
        details=typeof window.tmdbDetails==='function'
          ? await window.tmdbDetails(Number(found.tmdbId),found.kind,{priority:opts.priority===true})
          : null;
      }
      const src=details||found;
      const tmdbId=Number(src?.tmdbId||found?.tmdbId||requestedId);
      const kind=src?.kind||found?.kind||requestedKind;
      if(!src||src.adult===true||!Number.isSafeInteger(tmdbId)||!['movie','tv'].includes(kind))return null;
      const availability=(src.availability&&typeof src.availability==='object')?src.availability:{
        source:'tmdb',
        source_page_url:'https://www.themoviedb.org/'+kind+'/'+tmdbId
      };
      return {
        source_key:'tmdb-live:'+kind+':'+tmdbId,
        title:String(src.title||found?.title||title),
        normalized_title:normalise(title),
        year:src.year?Number(src.year):(found?.year?Number(found.year):null),
        media_kind:kind,
        tmdb_id:tmdbId,
        imdb_id:/^tt\d{7,10}$/.test(String(src.imdbId||''))?String(src.imdbId):null,
        poster_url:src.poster||found?.poster||null,
        poster_large_url:src.posterLarge||found?.posterLarge||src.poster||found?.poster||null,
        poster_original_url:src.posterOriginal||found?.posterOriginal||null,
        backdrop_url:src.backdrop||found?.backdrop||null,
        overview:String(src.overview||found?.overview||'').trim()||null,
        genres:Array.isArray(src.genres)?src.genres.filter(Boolean).slice(0,24):[],
        runtime_minutes:Number.isFinite(Number(src.runtimeMinutes))?Number(src.runtimeMinutes):null,
        content_rating:src.contentRating||null,
        vote_average:Number.isFinite(Number(src.voteAverage))?Number(src.voteAverage):null,
        original_language:src.originalLanguage||found?.originalLanguage||null,
        origin_countries:Array.isArray(src.originCountries)?src.originCountries.filter(Boolean).slice(0,12):[],
        cast_members:Array.isArray(src.cast)?src.cast.filter(x=>x&&x.name).slice(0,12):[],
        preview_kind:src.previewKind||null,
        preview_provider:src.previewProvider||null,
        preview_url:src.previewUrl||null,
        preview_embed_url:src.previewEmbedUrl||null,
        availability,
        kids_approved:false,
        kids_age_bands:[],
        is_catalog_title:false,
        is_trending:false,
        updated_at:new Date().toISOString()
      };
    }catch(_){return null;}})();
    LIVE_CACHE.set(key,p);
    const result=await p;
    if(result)LIVE_CACHE.set(key,result);else LIVE_CACHE.delete(key);
    return result;
  }

  async function refreshExact(meta){
    if(!meta||!Number.isSafeInteger(Number(meta.tmdb_id))||!['movie','tv'].includes(meta.media_kind)||typeof window.tmdbDetails!=='function')return meta;
    try{
      const d=await window.tmdbDetails(Number(meta.tmdb_id),meta.media_kind);
      if(!d)return meta;
      return {
        ...meta,
        title:String(d.title||meta.title||''),
        imdb_id:/^tt\d{7,10}$/.test(String(d.imdbId||''))?String(d.imdbId):
          /^tt\d{7,10}$/.test(String(meta.imdb_id||''))?String(meta.imdb_id):null,
        year:d.year?Number(d.year):meta.year,
        poster_url:d.poster||meta.poster_url,
        poster_large_url:d.posterLarge||d.poster||meta.poster_large_url||meta.poster_url,
        poster_original_url:d.posterOriginal||meta.poster_original_url,
        backdrop_url:d.backdrop||meta.backdrop_url,
        overview:String(d.overview||meta.overview||'').trim()||null,
        genres:Array.isArray(d.genres)&&d.genres.length?d.genres:meta.genres,
        runtime_minutes:Number.isFinite(Number(d.runtimeMinutes))?Number(d.runtimeMinutes):meta.runtime_minutes,
        content_rating:d.contentRating||meta.content_rating,
        vote_average:Number.isFinite(Number(d.voteAverage))?Number(d.voteAverage):meta.vote_average,
        original_language:d.originalLanguage||meta.original_language,
        origin_countries:Array.isArray(d.originCountries)&&d.originCountries.length?d.originCountries:(meta.origin_countries||[]),
        cast_members:Array.isArray(d.cast)&&d.cast.length?d.cast:(meta.cast_members||[]),
        preview_kind:d.previewKind||meta.preview_kind,
        preview_provider:d.previewProvider||meta.preview_provider,
        preview_url:d.previewUrl||meta.preview_url,
        preview_embed_url:d.previewEmbedUrl||meta.preview_embed_url,
        availability:d.availability&&typeof d.availability==='object'?d.availability:meta.availability,
        updated_at:new Date().toISOString()
      };
    }catch(_){return meta;}
  }

  function safePoster(meta){return [meta?.poster_original_url,meta?.poster_large_url,meta?.poster_url].find(u=>TRUSTED_POSTER.test(String(u||'')))||null;}
  const COUNTRY_CODES={
    argentina:'AR',australia:'AU',belgium:'BE',brazil:'BR',brasil:'BR',canada:'CA',chile:'CL',china:'CN',colombia:'CO',
    denmark:'DK',egypt:'EG',finland:'FI',france:'FR',germany:'DE',greece:'GR','hong kong':'HK',india:'IN',indonesia:'ID',
    ireland:'IE',israel:'IL',italy:'IT',japan:'JP','south korea':'KR',korea:'KR',mexico:'MX',netherlands:'NL','new zealand':'NZ',
    nigeria:'NG',norway:'NO',philippines:'PH',poland:'PL',portugal:'PT',russia:'RU','south africa':'ZA',spain:'ES',sweden:'SE',
    switzerland:'CH',taiwan:'TW',thailand:'TH',turkey:'TR',ukraine:'UA','united kingdom':'GB',uk:'GB','united states':'US',usa:'US',vietnam:'VN'
  };
  // Standalone compatibility for older cached shells and focused consumers.
  // Current adult pages load the shared compact 249-country resolver first.
  const FALLBACK_COUNTRY_IDS=new Set('AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI KH CM CA CV KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR XK KW KG LA LV LB LS LR LY LI LT LU MO MK MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SZ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(' '));
  function resolveCountryCode(value){
    if(typeof window.MatchAppCountry?.resolveCountryCode==='function')
      return window.MatchAppCountry.resolveCountryCode(value)||'';
    const raw=String(value||'').trim(),code=raw.toUpperCase();
    if(FALLBACK_COUNTRY_IDS.has(code))return code;
    try{
      const registered=window.MatchAppGeography?.resolveCountry?.(raw)?.[1];
      if(FALLBACK_COUNTRY_IDS.has(registered))return registered;
    }catch(_){}
    return COUNTRY_CODES[raw.toLowerCase()]||'';
  }
  function viewerRegionCode(){
    if(typeof window.MatchAppCountry?.regionCode==='function')
      return window.MatchAppCountry.regionCode()||'';
    let saved='',preferred='';
    try{
      saved=String(localStorage.getItem('match_user_country')||'').trim();
      preferred=String(localStorage.getItem('match_user_region')||'').trim();
    }catch(_){return '';}
    const country=resolveCountryCode(saved);
    const subdivision=(country==='FJ'&&/^(?:ba|ra)$/i.test(preferred))||
      (country==='SI'&&/^ig$/i.test(preferred));
    if(/^[A-Za-z]{2}$/.test(preferred)&&!subdivision){
      const explicit=resolveCountryCode(preferred);
      if(explicit)return explicit;
    }
    return country;
  }
  function regionCode(){
    // Keep the separately owned Kids location behavior unchanged. Adult
    // availability never infers a country from the selected interface language.
    if(!/^\/kids(?:\/|$)/.test(String(window.location?.pathname||'')))return viewerRegionCode();
    const preferred=String(localStorage.getItem('match_user_region')||'').trim().toUpperCase();
    if(/^[A-Z]{2}$/.test(preferred))return preferred;
    const saved=String(localStorage.getItem('match_user_country')||'').trim();
    if(/^[A-Za-z]{2}$/.test(saved))return saved.toUpperCase();
    const mapped=COUNTRY_CODES[saved.toLowerCase()];
    if(mapped)return mapped;
    const lang=window.MATCH_LANG||'en';
    const fallback={'pt-BR':'BR',es:'MX',fr:'FR',de:'DE',it:'IT',tr:'TR',ru:'RU',ar:'EG',hi:'IN',id:'ID',ja:'JP',ko:'KR',zh:'CN'};
    return fallback[lang]||'US';
  }
  function countryName(code){
    code=String(code||'').toUpperCase();
    try{const dn=new Intl.DisplayNames([window.MATCH_LANG||'en'],{type:'region'});return dn.of(code)||code;}catch(_){return code;}
  }
  function sourcePage(meta){
    const explicit=String(meta?.availability?.source_page_url||'');
    if(/^https:\/\/www\.themoviedb\.org\/(movie|tv)\/\d+$/.test(explicit))return explicit;
    if(Number.isSafeInteger(Number(meta?.tmdb_id))&&['movie','tv'].includes(meta?.media_kind)){
      return 'https://www.themoviedb.org/'+meta.media_kind+'/'+meta.tmdb_id;
    }
    return '';
  }
  function availability(meta,region){
    const pinnedRegion=String(meta?._verified_doc_region||'').toUpperCase();
    const code=region||(/^[A-Z]{2}$/.test(pinnedRegion)?pinnedRegion:regionCode()),root=meta?.availability||{},row=root?.[code]||{};
    const uniq=list=>[...new Set((Array.isArray(list)?list:[]).map(v=>String(v||'').trim()).filter(Boolean))];
    const streams=uniq(row.stream),rent=uniq(row.rent),buy=uniq(row.buy);
    const cinemaDate=/^\d{4}-\d{2}-\d{2}$/.test(String(row.cinema_release_date||''))?String(row.cinema_release_date):'';
    let inCinemas=false;
    if(cinemaDate){
      const start=Date.parse(cinemaDate+'T00:00:00Z'),now=Date.now(),windowMs=120*86400000;
      // Theatrical and streaming windows can overlap. Do not hide cinema
      // availability just because a streaming provider is also present.
      inCinemas=Number.isFinite(start)&&now>=start-7*86400000&&now<=start+windowMs;
    }
    return {region:code,streams,rent,buy,cinemaDate,inCinemas,guide:/^https:\/\//.test(String(row.link||''))?String(row.link):'',sourcePage:sourcePage(meta)};
  }
  function providerSearch(provider,title){
    const raw=String(provider||'').trim();
    const aliases={
      'Amazon Prime Video':'Prime Video','Prime Video':'Prime Video','Amazon Video':'Prime Video',
      'Netflix':'Netflix','Netflix Kids':'Netflix','Netflix Standard with Ads':'Netflix',
      'Disney Plus':'Disney+','HBO Max':'Max','Max':'Max','Apple TV':'Apple TV+','Apple TV Store':'Apple TV+',
      'Paramount Plus':'Paramount+','Paramount Plus Basic with Ads':'Paramount+','Paramount Plus Essential':'Paramount+',
      'Paramount Plus Premium':'Paramount+','Hulu':'Hulu','Peacock Premium':'Peacock','Peacock Premium Plus':'Peacock',
      'Globoplay':'Globoplay','+SBT':'+SBT','SBT+':'+SBT','SBT Plus':'+SBT','Crunchyroll Amazon Channel':'Crunchyroll','Crunchyroll':'Crunchyroll',
      'Rakuten Viki':'Viki','MUBI':'MUBI','Pure Flix':'Pure Flix','Angel Studios':'Angel Studios'
    };
    let mapped=aliases[raw]||raw;
    if(/amazon prime video|amazon channel|amazon video/i.test(raw))mapped='Prime Video';
    else if(/netflix/i.test(raw))mapped='Netflix';
    else if(/hbo max/i.test(raw))mapped='Max';
    else if(/apple tv/i.test(raw))mapped='Apple TV+';
    else if(/paramount/i.test(raw))mapped='Paramount+';
    else if(/crunchyroll/i.test(raw))mapped='Crunchyroll';
    else if(/^\+?sbt(?:\+|\s+plus)?$/i.test(raw))mapped='+SBT';
    try{
      if(typeof platformSearchUrl==='function'&&typeof PLATFORMS!=='undefined'&&PLATFORMS[mapped])return platformSearchUrl(mapped,title);
    }catch(_){}
    const q=encodeURIComponent(String(title||''));
    const direct={
      'Netflix':'https://www.netflix.com/search?q='+q,
      'Prime Video':'https://www.primevideo.com/search?phrase='+q,
      'Disney+':'https://www.disneyplus.com/search?q='+q,
      'Max':'https://www.max.com/search?q='+q,
      'Apple TV+':'https://tv.apple.com/search?term='+q,
      'Paramount+':'https://www.paramountplus.com/search/?q='+q,
      'Hulu':'https://www.hulu.com/search?q='+q,
      'Peacock':'https://www.peacocktv.com/search?q='+q,
      'Globoplay':'https://globoplay.globo.com/busca/?q='+q,
      '+SBT':'https://mais.sbt.com.br/search',
      'Crunchyroll':'https://www.crunchyroll.com/search?q='+q,
      'Viki':'https://www.viki.com/search?q='+q,
      'MUBI':'https://mubi.com/search/'+q,
      'Pure Flix':'https://pureflix.com/search?q='+q,
      'Angel Studios':'https://www.angel.com/search?q='+q,
      'BBC iPlayer':'https://www.bbc.co.uk/iplayer/search?q='+q,
      'ITVX':'https://www.itv.com/watch/search?q='+q,
      'ITVX Premium':'https://www.itv.com/watch/search?q='+q,
      'Channel 4':'https://www.channel4.com/search?q='+q,
      'The Roku Channel':'https://www.roku.com/whats-on/search?q='+q,
      'Tubi TV':'https://tubitv.com/search/'+q,
      'YouTube':'https://www.youtube.com/results?search_query='+q,
      'YouTube TV':'https://tv.youtube.com/search/'+q,
      'Fandango At Home':'https://athome.fandango.com/content/browse/search?searchString='+q
    };
    return direct[mapped]||direct[raw]||'';
  }

  function showtimesUrl(title,coords){
    let query=String(title||'')+' movie showtimes';
    const latitude=coords?.latitude,longitude=coords?.longitude;
    if(Number.isFinite(latitude)&&Math.abs(latitude)<=90&&Number.isFinite(longitude)&&Math.abs(longitude)<=180){
      // A browser may supply precise coordinates even with high accuracy off.
      // Send only the rounded, approximate position to Maps; never store it.
      query+=' near '+latitude.toFixed(2)+','+longitude.toFixed(2);
    }
    return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query);
  }

  function openCinemaSearch(url){
    // Preserve native main-window routing without an asynchronous blank child.
    // Its existing Google allowlist may keep Maps inside the WebView.
    if(!window.MatchAppNativeStartup){
      let popup;
      try{
        // Location permission can outlast browser user activation. If a new
        // tab is still allowed, isolate it before its first external navigation.
        popup=window.open('','_blank');
        if(popup){
          popup.opener=null;
          const referrer=popup.document.createElement('meta');
          referrer.name='referrer';referrer.content='no-referrer';
          popup.document.head.appendChild(referrer);
          popup.location.replace(url);
          return;
        }
      }catch(_){try{popup?.close();}catch(__){}}
    }
    // The same-origin Discover title panel is also embedded by Jonas. Leave
    // that frame for Maps instead of trying to embed the destination inside it.
    window.open(url,window.top===window?'_self':'_top','noopener,noreferrer');
  }

  let cinemaLocationUnavailable=false,cinemaLocationPending=false;
  function bindNearbyCinema(link,title){
    link.addEventListener('click',event=>{
      if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||cinemaLocationUnavailable||typeof navigator.geolocation?.getCurrentPosition!=='function')return;
      event.preventDefault();
      if(cinemaLocationPending)return;
      cinemaLocationPending=true;link.setAttribute('aria-busy','true');
      const fallback=showtimesUrl(title);
      let finished=false;
      const finish=coords=>{
        if(finished)return;
        finished=true;cinemaLocationPending=false;clearTimeout(deadline);link.removeAttribute('aria-busy');
        const url=showtimesUrl(title,coords);
        // A declined or unavailable request must not repeatedly prompt on this
        // page. Subsequent clicks retain the ordinary, title-based Maps anchor.
        if(url===fallback)cinemaLocationUnavailable=true;
        openCinemaSearch(url);
      };
      // The Geolocation timeout excludes permission-prompt time in browsers.
      // Bound the whole action as well, and ignore any late location callback.
      const deadline=setTimeout(()=>finish(),8000);
      try{
        navigator.geolocation.getCurrentPosition(position=>finish(position?.coords),()=>finish(),{
          enableHighAccuracy:false,timeout:6000,maximumAge:300000
        });
      }catch(_){finish();}
    });
  }

  function providerLinks(meta,title,region){
    const a=availability(meta,region),seen=new Set(),out=[];
    const add=(provider,mode)=>{
      const name=String(provider||'').trim();if(!name)return;
      const key=mode+'|'+name.toLowerCase();if(seen.has(key))return;seen.add(key);
      const direct=providerSearch(name,title);
      out.push({provider:name,mode,direct:!!direct,href:direct||a.guide||a.sourcePage});
    };
    a.streams.forEach(p=>add(p,'stream'));
    a.rent.forEach(p=>add(p,'rent'));
    a.buy.forEach(p=>add(p,'buy'));
    return out.filter(x=>/^https:\/\//.test(String(x.href||'')));
  }

  async function ensureGenreIndex(){
    if(GENRE_INDEX)return GENRE_INDEX;
    if(!GENRE_INFLIGHT)GENRE_INFLIGHT=(async()=>{
      try{
        const sb=window.supabaseClient;if(!sb)return new Map();
        const {data,error}=await sb.from(TABLE).select('normalized_title,genres').eq('is_catalog_title',true).limit(5000);
        if(error||!Array.isArray(data))return new Map();
        const idx=new Map();
        data.forEach(row=>{
          const key=String(row?.normalized_title||'');if(!key)return;
          const gs=new Set((Array.isArray(row?.genres)?row.genres:[]).map(g=>String(g||'').trim()).filter(Boolean));
          idx.set(key,gs);
        });
        return idx;
      }catch(_){return new Map();}
    })().then(idx=>{GENRE_INDEX=idx;GENRE_INFLIGHT=null;return idx;});
    GENRE_INDEX=await GENRE_INFLIGHT;
    return GENRE_INDEX;
  }

  async function availableGenres(){
    const idx=await ensureGenreIndex(),set=new Set();
    for(const gs of idx.values())for(const g of gs)if(g)set.add(g);
    return [...set].sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'}));
  }

  async function syncGenreFilter(){
    const sel=document.getElementById('q-genre');if(!sel)return;
    const genres=await availableGenres();if(!genres.length)return;
    const existing=new Set([...sel.options].map(o=>o.value));
    const missing=genres.filter(g=>!existing.has(g));if(!missing.length)return;
    let group=[...sel.querySelectorAll('optgroup')].find(g=>g.dataset.sourceGenres==='1');
    if(!group){group=document.createElement('optgroup');group.label='More verified source genres';group.dataset.sourceGenres='1';sel.appendChild(group);}
    missing.forEach(g=>{const o=document.createElement('option');o.value=g;o.textContent=g;group.appendChild(o);});
    document.dispatchEvent(new CustomEvent('matchapp:optionspruned'));
  }

  async function titleKeysForGenres(genres){
    const wanted=[...new Set((Array.isArray(genres)?genres:[genres]).map(g=>String(g||'').trim().toLowerCase()).filter(Boolean))];
    if(!wanted.length)return null;
    const idx=await ensureGenreIndex();
    const keys=new Set();
    for(const [key,gs] of idx.entries()){
      const lower=new Set([...gs].map(g=>String(g).toLowerCase()));
      if(wanted.some(g=>lower.has(g)))keys.add(key);
    }
    return keys;
  }
  function viewingTarget(meta,title,region){
    const a=availability(meta,region);
    if(a.streams.length){
      const direct=providerSearch(a.streams[0],title);
      return {mode:'stream',href:direct||a.guide,provider:a.streams[0],availability:a};
    }
    if(a.inCinemas)return {mode:'cinema',href:showtimesUrl(title),provider:'',availability:a};
    return {mode:'guide',href:'',provider:'',availability:a};
  }
  function streamingElsewhere(meta,region){
    const root=meta?.availability||{},here=String(region||regionCode()).toUpperCase(),rows=[];
    for(const [code,row] of Object.entries(root)){
      if(!/^[A-Z]{2}$/.test(code)||code===here||!row||typeof row!=='object')continue;
      const streams=[...new Set([...(Array.isArray(row.stream)?row.stream:[]),...(Array.isArray(row.free)?row.free:[])].map(v=>String(v||'').trim()).filter(Boolean))];
      if(streams.length)rows.push({region:code,country:countryName(code),providers:streams.slice(0,8),guide:/^https:\/\//.test(String(row.link||''))?String(row.link):''});
    }
    rows.sort((a,b)=>a.country.localeCompare(b.country));
    return rows;
  }

  // Adults only: exact-title poster recovery for Top Titles, results and saved visual titles.
  // Retry the same TMDB artwork at different image sizes before attempting a
  // different image. Only metadata already bound to this exact title can add
  // another artwork identity; this never searches for unrelated artwork.
  function adultPosterSurface(img){
    return !!(img && (img.id==='res-poster-img'||img.closest?.('#marquee-track')||
      img.dataset?.portfolioPoster==='1'||img.dataset?.watchPoster==='1'));
  }
  function posterVariants(url){
    const safe=String(url||'');
    if(!TRUSTED_POSTER.test(safe))return [];
    const tmdb=/^(https:\/\/image\.tmdb\.org\/t\/p\/)(?:w[0-9]+|original)\/([A-Za-z0-9_.-]+)$/.exec(safe);
    if(!tmdb)return [safe];
    return [...new Set([safe,tmdb[1]+'w780/'+tmdb[2],tmdb[1]+'w500/'+tmdb[2],tmdb[1]+'w342/'+tmdb[2],tmdb[1]+'original/'+tmdb[2]])];
  }
  function exactPosterCandidates(state){
    let registry='';
    try{registry=typeof window.getVerifiedPoster==='function'?window.getVerifiedPoster(state.title):'';}catch(_){}
    const meta=state.meta||{};
    const exactArt=[state.preferred,meta.poster_large_url,meta.poster_url,meta.poster_original_url].filter(Boolean);
    // A title-only registry can describe a same-name remake or TV series.
    // Once an exact numeric identity owns this card, registry art is eligible
    // only when it is another size of that identity's proven original.
    if(state.tmdbId>0&&!exactArt.some(url=>sameOriginalArtwork(url,registry)))registry='';
    // A proven ID for the curated Home row lets fresh exact-source metadata
    // correct a cached poster identity; matches preserve their chosen artwork.
    const sources=state.isRail&&state.meta
      ?[meta.poster_large_url,meta.poster_url,meta.poster_original_url,registry,state.preferred]
      :[state.preferred,registry,meta.poster_large_url,meta.poster_url,meta.poster_original_url];
    return [...new Set(sources.flatMap(posterVariants))];
  }
  function sameOriginalArtwork(a,b){
    const file=url=>String(url||'').match(/^https:\/\/image\.tmdb\.org\/t\/p\/(?:w[0-9]+|original)\/([A-Za-z0-9_.-]+)$/)?.[1]||String(url||'');
    return !!a&&!!b&&file(a)===file(b);
  }
  // Fast recovery may temporarily pin a decoded rendition. Remember the
  // original responsive contract so rotation or a wider window can select a
  // sharper rendition of that exact artwork again. One bounded resize owner;
  // no new poster identities, polling, or eager offscreen image requests.
  const RESPONSIVE_POSTERS=new Set();
  let responsivePosterResizeBound=false,responsivePosterResizeTimer;
  let responsivePosterVisibility=null;
  function forgetResponsivePoster(img){
    RESPONSIVE_POSTERS.delete(img);
    responsivePosterVisibility?.unobserve(img);
  }
  function restoreResponsivePoster(img,state=img.__matchappAdultPoster){
    if(!img.isConnected){forgetResponsivePoster(img);return;}
    if(!state||img.__matchappAdultPoster!==state||!state.responsiveResizePending||!state.responsive){
      responsivePosterVisibility?.unobserve(img);return;
    }
    // Recovery can still remove a healthy srcset, or assign a decoded probe
    // before the destination <img> finishes loading. Its completion/load
    // callbacks retain this resize intent instead of requiring a second turn.
    if(state.repairing||state.fastPaint?.active)return;
    const finish=()=>{state.responsiveResizePending=false;responsivePosterVisibility?.unobserve(img);};
    if(img.getAttribute?.('srcset')){finish();return;}
    if(!img.complete||!img.naturalWidth)return;
    const shown=String(img.currentSrc||img.src||'');
    const choices=state.responsive.choices.filter(([url])=>sameOriginalArtwork(url,shown)&&!state.failed.has(url));
    if(!choices.length){finish();return;}
    if(!adultPosterNearView(img,0)){
      if(typeof IntersectionObserver==='function'){
        if(!responsivePosterVisibility)responsivePosterVisibility=new IntersectionObserver(entries=>{
          for(const entry of entries){
            if(!entry.target.isConnected){forgetResponsivePoster(entry.target);continue;}
            if(entry.isIntersecting)restoreResponsivePoster(entry.target);
          }
        },{rootMargin:'0px'});
        responsivePosterVisibility.observe(img);
      }
      return;
    }
    finish(); // Clear before attributes/load callbacks; never create a retry loop.
    img.setAttribute('sizes',state.responsive.sizes);
    img.setAttribute('srcset',choices.map(choice=>choice.join(' ')).join(', '));
  }
  function rememberResponsivePoster(img,state){
    const srcset=img.getAttribute?.('srcset'),sizes=img.getAttribute?.('sizes');
    if(srcset&&sizes){
      const choices=srcset.split(',').map(part=>part.trim().split(/\s+/));
      const current=String(img.currentSrc||img.src||'');
      if(choices.length&&choices.every(([url,width,...extra])=>!extra.length&&/^[1-9]\d*w$/.test(width||'')&&
        /^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\/[A-Za-z0-9_.-]+$/.test(url)&&sameOriginalArtwork(url,current)))
        state.responsive={choices,sizes};
    }
    if(!state.responsive)return;
    for(const image of RESPONSIVE_POSTERS)if(!image.isConnected)forgetResponsivePoster(image);
    if(RESPONSIVE_POSTERS.size>=200&&!RESPONSIVE_POSTERS.has(img))return;
    RESPONSIVE_POSTERS.add(img);
    if(responsivePosterResizeBound||typeof window.addEventListener!=='function')return;
    responsivePosterResizeBound=true;
    window.addEventListener('resize',()=>{
      clearTimeout(responsivePosterResizeTimer);
      responsivePosterResizeTimer=setTimeout(()=>{
        for(const image of RESPONSIVE_POSTERS){
          if(!image.isConnected){forgetResponsivePoster(image);continue;}
          const active=image.__matchappAdultPoster;
          if(!active?.responsive)continue;
          active.responsiveResizePending=true;
          restoreResponsivePoster(image,active);
        }
      },120);
    },{passive:true});
  }
  function safeSameTitleMedia(row,state){
    if(!row||!row.title)return false;
    const found=Number(row.tmdb_id);
    if(state.tmdbId&&found!==state.tmdbId)return false;
    if(state.kind&&row.media_kind&&row.media_kind!==state.kind)return false;
    if(state.year&&row.year&&Math.abs(Number(row.year)-state.year)>1)return false;
    return normalise(row.title)===normalise(state.title)||(state.tmdbId>0&&found===state.tmdbId);
  }
  const ADULT_IMAGE_PROBES=new Map();
  const ADULT_IMAGE_QUEUE=[],ADULT_IMAGE_PRIORITY=[];
  let adultImageActive=0;
  function drainAdultImageProbes(){
    // Keep two of the six lanes available for art entering view. Background
    // repairs must not hold a new result behind stalled offscreen downloads.
    while(adultImageActive<(ADULT_IMAGE_PRIORITY.length?6:4)&&(ADULT_IMAGE_PRIORITY.length||ADULT_IMAGE_QUEUE.length)){
      const start=(ADULT_IMAGE_PRIORITY.length?ADULT_IMAGE_PRIORITY:ADULT_IMAGE_QUEUE).shift();
      adultImageActive++;
      start();
    }
  }
  function posterImageLoads(url,priority=false){
    if(ADULT_IMAGE_PROBES.has(url))return ADULT_IMAGE_PROBES.get(url);
    const pending=new Promise(resolve=>{
      const start=()=>{
        const probe=new Image();
        let done=false,timeout;
        const finish=valid=>{
          if(done)return;
          done=true;clearTimeout(timeout);
          probe.onload=null;probe.onerror=null;
          adultImageActive--;
          resolve(valid);
          drainAdultImageProbes();
        };
        // Stalled mobile images must release their bounded verification lane.
        timeout=setTimeout(()=>finish(false),6500);
        probe.onload=()=>finish(probe.naturalWidth!==0);
        probe.onerror=()=>finish(false);
        try{probe.src=url;}catch(_){finish(false);}
      };
      (priority?ADULT_IMAGE_PRIORITY:ADULT_IMAGE_QUEUE).push(start);
      drainAdultImageProbes();
    });
    ADULT_IMAGE_PROBES.set(url,pending);
    pending.then(valid=>{
      if(!valid&&ADULT_IMAGE_PROBES.get(url)===pending)ADULT_IMAGE_PROBES.delete(url);
      // Bounded memory: the Home rail shares cached probes between its copies.
      else if(ADULT_IMAGE_PROBES.size>256)ADULT_IMAGE_PROBES.delete(ADULT_IMAGE_PROBES.keys().next().value);
    });
    return pending;
  }
  function adultPosterNearView(img,margin=240){
    if(typeof img.getBoundingClientRect!=='function')return true;
    const r=img.getBoundingClientRect();
    return r.width>0&&r.height>0&&r.bottom>=-margin&&r.right>=-margin&&
      r.top<=(window.innerHeight||document.documentElement.clientHeight)+margin&&
      r.left<=(window.innerWidth||document.documentElement.clientWidth)+margin;
  }
  let adultPosterVisibility=null;
  function deferOffscreenPoster(img,state){
    if(img.loading!=='lazy'||adultPosterNearView(img)||typeof IntersectionObserver!=='function')return false;
    if(!adultPosterVisibility)adultPosterVisibility=new IntersectionObserver(entries=>{
      for(const entry of entries){
        const image=entry.target,current=image.__matchappAdultPoster;
        if(!image.isConnected){adultPosterVisibility.unobserve(image);continue;}
        if(!entry.isIntersecting||!current)continue;
        adultPosterVisibility.unobserve(image);current.waitingForView=false;
        image.loading='eager';image.decoding='async';
        if(adultPosterNearView(image,0))image.fetchPriority='high';
        recoverAdultPoster(image,current.title,current.meta,current.preferred);
      }
    },{rootMargin:'240px'});
    if(!state.waitingForView){state.waitingForView=true;adultPosterVisibility.observe(img);}
    return true;
  }
  function fastVisibleAdultPoster(img,state,url){
    const source=String(url||''),match=/^(https:\/\/image\.tmdb\.org\/t\/p\/)(?:w[0-9]+|original)\/([A-Za-z0-9_.-]+)$/.exec(source);
    if(!match||!adultPosterNearView(img))return false;
    if(state.fastPaint?.active&&state.fastPaint.source===source)return true;
    if(state.fastPaint)state.fastPaint.active=false;
    const size=value=>/\/original\//.test(value)?Infinity:Number(String(value).match(/\/w(\d+)\//)?.[1]||0);
    const compact=match[1]+((state.isRail||state.isPortfolio||state.isWatch)?'w342/':'w500/')+match[2];
    const alternate=compact===source?match[1]+'w780/'+match[2]:compact;
    const urls=[...new Set([source,alternate])],run={active:true,source,shown:false,rank:0,remaining:urls.length};
    state.fastPaint=run;
    const current=()=>run.active&&img.isConnected&&img.__matchappAdultPoster===state&&state.fastPaint===run;
    for(const candidate of urls)posterImageLoads(candidate,true).then(valid=>{
      if(!current())return;
      if(valid){
        const shown=String(img.currentSrc||img.src||'');
        const loaded=img.complete&&img.naturalWidth>0&&sameOriginalArtwork(shown,source);
        if(loaded){run.shown=true;run.rank=Math.max(run.rank,size(shown));}
        if(size(candidate)>=run.rank){
          run.shown=true;run.rank=size(candidate);
          img.dataset.matchappFallbackStage='verified';
          if(shown!==candidate){img.removeAttribute?.('srcset');img.src=candidate;}
          if(img.id==='res-poster-img'&&window.globalMatchTitle===state.title){
            const publish=()=>{if(img.__matchappAdultPoster===state&&img.isConnected&&String(img.currentSrc||img.src||'')===candidate&&img.naturalWidth>0){
              if(typeof window.setLoadedMatchPoster==='function')window.setLoadedMatchPoster(candidate,state.title);else window.globalMatchPoster=candidate;
            }};
            if(img.complete&&img.naturalWidth>0)publish();else img.addEventListener('load',publish,{once:true});
          }
        }
      }else state.failed.add(candidate);
      if(--run.remaining===0){
        run.active=false;if(state.fastPaint===run)state.fastPaint=null;
        if(!run.shown&&img.__matchappAdultPoster===state&&img.isConnected)void repairAdultPoster(img,state);
        if(state.responsiveResizePending)restoreResponsivePoster(img,state);
      }
    });
    return true;
  }
  async function repairAdultPoster(img,state){
    if(state.repairing)return;
    state.repairing=true;
    const title=state.title,identity=state;
    // Alternate TMDB sizes share the same exact source artwork. Race the
    // verified sizes without letting a stalled first size block the card.
    const firstVerified=urls=>new Promise(resolve=>{
      // Two alternate sizes per identity are enough to bypass one stalled
      // rendition. Prefer a compact companion to the requested original.
      const compact=urls.find(url=>(state.isRail||state.isPortfolio? /\/w342\// : /\/w500\//).test(url));
      urls=[...new Set([urls[0],compact,...urls].filter(Boolean))];
      let remaining=urls.length,settled=false,next=0;
      if(!remaining){resolve('');return;}
      const worker=async()=>{
        while(!settled&&next<urls.length){
          const url=urls[next++];let valid=false;
          try{valid=await posterImageLoads(url,!state.isRail||adultPosterNearView(img));}catch(_){}
          if(valid){if(!settled){settled=true;resolve(url);}return;}
          state.failed.add(url);
          if(--remaining===0&&!settled)resolve('');
        }
      };
      for(let i=0;i<Math.min(2,urls.length);i++)void worker();
    });
    const attempt=async()=>{
      const preferredAtStart=state.preferred;
      const candidates=exactPosterCandidates(state).filter(url=>!state.failed.has(url));
      // Do not race a title-only saved poster against the known numeric
      // identity's actual source artwork. The chosen source gets priority.
      const pinned=posterVariants(state.preferred).filter(url=>candidates.includes(url));
      const quick=urls=>urls.filter(url=>!/\/original\//.test(url));
      const huge=urls=>urls.filter(url=>/\/original\//.test(url));
      let winner=await firstVerified(quick(pinned));
      if(!winner)winner=await firstVerified(huge(pinned));
      if(!winner){
        const rest=candidates.filter(url=>!pinned.includes(url));
        winner=await firstVerified(quick(rest));
        if(!winner)winner=await firstVerified(huge(rest));
      }
      if(!winner)return false;
      if(img.__matchappAdultPoster!==identity||!img.isConnected)return true;
      // Exact metadata may correct a cached image while its older probe is
      // decoding. Let the newer original finish instead of publishing stale art.
      if(state.preferred!==preferredAtStart){state.needsRepair=true;return true;}
      img.dataset.matchappFallbackStage='verified';
      img.removeAttribute?.('srcset');
      img.src=winner;
      if(img.id==='res-poster-img'&&window.globalMatchTitle===title){
        if(typeof window.setLoadedMatchPoster==='function')window.setLoadedMatchPoster(winner,title);
        else window.globalMatchPoster=winner;
      }
      return true;
    };
    try{
      // First try the already verified artwork at alternate TMDB sizes.
      // Do not delay every matching result or Top Titles tile with SQL calls.
      if(await attempt()||img.__matchappAdultPoster!==identity)return;
      // Only if every known variant failed, query an exact same-title DB row.
      // Never perform a fuzzy search that might return another film's poster.
      if(!state.meta){
        const found=await lookup(title);
        if(img.__matchappAdultPoster!==identity)return;
        if(!state.meta&&safeSameTitleMedia(found,state))state.meta=found;
        if(await attempt())return;
      }
      // A known numeric ID is decisive for translated title labels whose
      // database row uses the original-language title. Never fuzzy-search.
      if(state.tmdbId&&['movie','tv'].includes(state.kind)&&typeof window.tmdbDetails==='function'){
        let details=null;
        try{details=await window.tmdbDetails(state.tmdbId,state.kind,{priority:!state.isRail});}catch(_){}
        if(img.__matchappAdultPoster!==identity)return;
        if(details&&details.adult!==true&&Number(details.tmdbId)===state.tmdbId&&
           details.kind===state.kind&&(!state.year||!details.year||
             Math.abs(Number(details.year)-state.year)<=1)){
          state.meta={title,tmdb_id:state.tmdbId,media_kind:state.kind,year:details.year,
            poster_url:details.poster||null,poster_large_url:details.posterLarge||null,
            poster_original_url:details.posterOriginal||null};
          if(await attempt())return;
        }
      }
    }finally{
      if(img.__matchappAdultPoster===identity){
        state.repairing=false;
        // An exact, verified URL may arrive during an older title-only
        // lookup. Do not silently discard that late original artwork.
        if(state.needsRepair){
          state.needsRepair=false;
          // If this exact original was already applied while the earlier
          // request finished, avoid re-running the full lookup unnecessarily.
          if(!sameOriginalArtwork(img.src,state.preferred))
            void repairAdultPoster(img,state);
        }
        if(state.responsiveResizePending)restoreResponsivePoster(img,state);
      }
    }
  }
  function recoverAdultPoster(img,title,meta,preferred){
    if(!adultPosterSurface(img)||!title)return;
    const name=String(title);
    const liveIdentity=window.currentMatchIdentity;
    // An officially verified Spotify playlist owns its artwork. Never launch
    // TMDB/movie-poster recovery against the same-named playlist.
    if(img.id==='res-poster-img'&&liveIdentity?.title===name&&liveIdentity.spotifyArtwork&&
       /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(liveIdentity.spotifyArtwork)){
      if(img.src!==liveIdentity.spotifyArtwork)img.src=liveIdentity.spotifyArtwork;
      return;
    }
    const isRail=!!img.closest?.('#marquee-track');
    const isPortfolio=img.dataset?.portfolioPoster==='1';
    const isWatch=img.dataset?.watchPoster==='1';
    const isTile=isRail||isPortfolio||isWatch;
    const currentIdentity=!isTile&&window.currentMatchIdentity&&
      normalise(window.currentMatchIdentity.title)===normalise(name)
      ?window.currentMatchIdentity:{};
    const rawId=isTile?img.dataset.tmdbId:currentIdentity.tmdbId||meta?.tmdb_id;
    const tmdbId=Number(rawId);
    const incomingId=Number.isSafeInteger(tmdbId)&&tmdbId>0?tmdbId:0;
    const incomingKind=isTile?img.dataset.tmdbKind:currentIdentity.kind||meta?.media_kind;
    const generation=isTile?0:Number(window.__matchappMatchRunId)||0;
    let state=img.__matchappAdultPoster;
    if(!state||state.title!==name||state.generation!==generation||
       (incomingId&&state.tmdbId!==incomingId)||
       (incomingKind&&state.kind&&incomingKind!==state.kind)){
      state={title:name,meta:null,preferred:'',failed:new Set(),repairing:false,needsRepair:false,isRail:false,
        tmdbId:0,kind:'',year:0,generation,lastAttemptAt:Date.now()};
      img.__matchappAdultPoster=state;
    }
    state.isRail=isRail;
    state.isPortfolio=isPortfolio;
    state.isWatch=isWatch;
    rememberResponsivePoster(img,state);
    if(Number.isSafeInteger(tmdbId)&&tmdbId>0){
      state.tmdbId=tmdbId;
    }
    if(['movie','tv'].includes(incomingKind))state.kind=incomingKind;
    const year=Number(isTile?img.dataset.tmdbYear:currentIdentity.year||meta?.year);
    if(Number.isSafeInteger(year)&&year>=1880&&year<=2200)state.year=year;
    const previousMeta=state.meta,previousPreferred=state.preferred;
    if(safeSameTitleMedia(meta,state))state.meta=meta;
    // A live record for this exact selected identity can correct an old
    // snapshot (including a backdrop incorrectly saved as a poster). Retain
    // that authority when a later render repeats the snapshot's old URL.
    const exactResultOriginal=img.id==='res-poster-img'&&state.tmdbId>0&&
      Number(state.meta?.tmdb_id)===state.tmdbId&&state.meta?.media_kind===state.kind
      ? [state.meta.poster_large_url,state.meta.poster_url,state.meta.poster_original_url]
          .find(url=>posterVariants(url).length)||'':'';

    // Live TMDB discovery already supplied the exact numeric identity AND its
    // source artwork. Start that original on the very first result event,
    // without waiting for a title-only SQL search or delayed metadata chain.
    const pinnedOriginal=!isTile&&state.tmdbId>0&&['movie','tv'].includes(state.kind)
      ? String(currentIdentity.artwork||''):'';
    const savedOriginal=isPortfolio||isWatch?String(img.dataset.posterPreferredUrl||''):'';
    const shownOriginal=String(img.currentSrc||img.src||'');
    const eligiblePreferred=exactResultOriginal||(posterVariants(preferred).length?preferred:
      posterVariants(savedOriginal).length?savedOriginal:
      pinnedOriginal||(posterVariants(shownOriginal).length?shownOriginal:''));
    if(eligiblePreferred&&posterVariants(eligiblePreferred).length)state.preferred=eligiblePreferred;
    if(state.repairing&&(state.meta!==previousMeta||state.preferred!==previousPreferred))
      state.needsRepair=true;
    img.dataset.matchappMediaTitle=name;
    if(img.dataset.matchappAdultPosterBound!=='1'){
      img.dataset.matchappAdultPosterBound='1';
      img.addEventListener('load',()=>{
        const active=img.__matchappAdultPoster;
        if(active?.responsiveResizePending)restoreResponsivePoster(img,active);
      });
      img.addEventListener('error',()=>{
        const active=img.__matchappAdultPoster;
        if(!active)return;
        const bad=img.currentSrc||img.src;
        if(bad)active.failed.add(bad);
        if(deferOffscreenPoster(img,active))return;
        if(active.fastPaint?.active){active.fastPaint.shown=false;active.fastPaint.rank=0;return;}
        if(!String(img.src||'').startsWith('data:image/svg+xml')){
          img.dataset.matchappFallbackStage='local';
          const cover=localPoster(active.title);
          img.removeAttribute?.('srcset');
          img.src=cover;
          if(img.id==='res-poster-img'&&window.globalMatchTitle===active.title){
            if(typeof window.setLoadedMatchPoster==='function')window.setLoadedMatchPoster(cover,active.title);
            else window.globalMatchPoster=cover;
          }
        }
        void repairAdultPoster(img,active);
      });
    }
    const current=String(img.currentSrc||img.src||'');
    if(exactResultOriginal&&!sameOriginalArtwork(current,exactResultOriginal)){
      // Keep existing pixels until the corrected original decodes. Older
      // rendition probes must not repaint the stale snapshot afterward.
      if(state.fastPaint){state.fastPaint.active=false;state.fastPaint=null;}
      void repairAdultPoster(img,state);
      return;
    }
    // A saved source may be an official publisher CDN outside the film CDN
    // allowlist. Preserve healthy saved pixels; only exact trusted art repairs it.
    const savedLoaded=isPortfolio&&/^https?:\/\//.test(current)&&
      img.dataset.maFallback!=='1';
    const originalLoaded=(TRUSTED_POSTER.test(current)||savedLoaded)&&img.complete&&img.naturalWidth>0;
    if(originalLoaded){
      const catalogOriginal=state.isRail&&state.meta&&
        (state.meta.poster_large_url||state.meta.poster_url||state.meta.poster_original_url);
      if(catalogOriginal&&posterVariants(catalogOriginal).length&&
         !sameOriginalArtwork(current,catalogOriginal))void repairAdultPoster(img,state);
      if(state.responsiveResizePending)restoreResponsivePoster(img,state);
      return; // Never blank a working original while checking fresh artwork.
    }
    if(current&&TRUSTED_POSTER.test(current)&&!img.complete){
      // Native lazy images can stay pending offscreen indefinitely. Arm their
      // exact-art recovery only as they approach view, not 52 rail tiles at once.
      if(deferOffscreenPoster(img,state))return;
      // Race only two renditions of this same verified asset now. A compact
      // result can paint immediately; a later larger rendition only upgrades it.
      if(fastVisibleAdultPoster(img,state,current))return;
      // Android WebView can leave a stalled remote <img> loading forever, with
      // neither load nor error. Keep the title card visible and give it a
      // bounded, exact-identity alternate-poster recovery after 8 seconds.
      if(state.watchingUrl!==current){
        state.watchingUrl=current;
        const watching=state,url=current;
        setTimeout(()=>{
          if(img.__matchappAdultPoster!==watching||!img.isConnected||img.complete)return;
          if(String(img.currentSrc||img.src||'')!==url)return;
          watching.failed.add(url);ADULT_IMAGE_PROBES.delete(url);
          img.dataset.matchappFallbackStage='local';
          img.removeAttribute?.('srcset');
          img.src=localPoster(name);
          watching.watchingUrl='';
          void repairAdultPoster(img,watching);
        },8000);
      }
      return;
    }
    if(current&&TRUSTED_POSTER.test(current)&&img.complete&&img.naturalWidth===0)state.failed.add(current);
    if(!String(img.src||'').startsWith('data:image/svg+xml')&&
       (!img.getAttribute('src')||(img.complete&&img.naturalWidth===0))){
      img.dataset.matchappFallbackStage='local';
      img.removeAttribute?.('srcset');
      img.src=localPoster(name);
    }
    // Retry after reconnect instead of permanently remembering CDN outages.
    if(!state.repairing&&Date.now()-state.lastAttemptAt>120000)state.failed.clear();
    state.lastAttemptAt=Date.now();
    void repairAdultPoster(img,state);
  }

  function localLikePoster(img){
    const raw=String(img?.getAttribute?.('src')||'');
    return !raw||raw.startsWith('data:image/svg+xml')||raw.includes('/kids/covers/');
  }
  function promotePoster(img,url,title){
    if(!img||!TRUSTED_POSTER.test(String(url||'')))return;
    const expected=String(title||'');
    const probe=new Image();
    probe.onload=()=>{
      if(!img.isConnected||img.dataset.matchappMediaTitle!==expected)return;
      img.dataset.matchappFallbackStage='metadata';
      img.src=url;
      if(img.id==='res-poster-img'){
        if(typeof window.setLoadedMatchPoster==='function')window.setLoadedMatchPoster(url,expected);
        else window.globalMatchPoster=url;
      }
    };
    probe.onerror=()=>{};
    probe.src=url;
  }
  function hardenImage(img,title,meta){
    if(!img)return;
    const name=String(title||'');
    const previous=img.dataset.matchappMediaTitle||'';
    if(meta)img.__matchappMediaMeta=meta;
    else if(!img.__matchappMediaMeta)img.__matchappMediaMeta=null;

    if(img.dataset.matchappMediaHardened==='1'){
      if(previous!==name){
        img.dataset.matchappMediaTitle=name;
        img.dataset.matchappFallbackStage='';
        img.__matchappMediaMeta=meta||null;
      }
      const verified=safePoster(meta);
      if(verified&&(localLikePoster(img)||img.dataset.matchappFallbackStage==='local'))promotePoster(img,verified,name);
      return;
    }

    img.dataset.matchappMediaHardened='1';
    img.dataset.matchappMediaTitle=name;
    img.dataset.matchappFallbackStage='';
    const fallback=localPoster(name);
    img.addEventListener('error',async()=>{
      const stage=img.dataset.matchappFallbackStage||'';
      if(stage==='local')return;
      if(stage!=='metadata'){
        const fromMeta=safePoster(img.__matchappMediaMeta||await lookup(img.dataset.matchappMediaTitle||name));
        if(fromMeta&&img.src!==fromMeta){
          img.dataset.matchappFallbackStage='metadata';
          img.src=fromMeta;
          return;
        }
      }
      img.dataset.matchappFallbackStage='local';
      img.src=localPoster(img.dataset.matchappMediaTitle||name)||fallback;
    });

    const verified=safePoster(meta);
    if(!img.getAttribute('src')){
      if(verified){
        img.dataset.matchappFallbackStage='metadata';
        img.src=verified;
      }else{
        img.dataset.matchappFallbackStage='local';
        img.src=fallback;
      }
    }else if(verified&&localLikePoster(img)){
      promotePoster(img,verified,name);
    }
  }

  function ensurePlayerHost(anchor,id){if(!anchor)return null;let host=document.getElementById(id);if(host)return host;host=document.createElement('section');host.id=id;host.className='matchapp-media-preview';host.hidden=true;anchor.insertAdjacentElement('afterend',host);return host;}
  function renderPreview(host,meta,{kids=false,title=''}={}){
    if(!host)return;
    const previewSignature=kids?[
      normalise(title||meta?.title||''),
      String(meta?.source_key||''),
      String(meta?.updated_at||''),
      String(meta?.preview_kind||''),
      String(meta?.preview_embed_url||meta?.preview_url||sourcePage(meta)||''),
      String(window.MATCH_LANG||'en')
    ].join('|'):'';
    // Kids result media used to rewrite this host every time its own
    // MutationObserver noticed the rewrite, creating a self-feeding loop.
    // Make the render idempotent as a second line of defence even if callers
    // accidentally request the same enrichment more than once.
    if(kids&&host.dataset.matchappPreviewSignature===previewSignature)return;
    host.replaceChildren();host.hidden=true;
    if(kids)host.dataset.matchappPreviewSignature=previewSignature;
    if(!meta||(kids&&meta.kids_approved!==true))return;
    const label=document.createElement('div');label.className='matchapp-media-preview-label';label.textContent=(typeof window.t==='function'&&window.t('discover.preview'))||'Preview';
    if(meta.preview_kind==='video'&&TRUSTED_EMBED.test(String(meta.preview_embed_url||''))){const frame=document.createElement('iframe');frame.src=meta.preview_embed_url;frame.title=`${title||meta.title} preview`;frame.loading='lazy';frame.allow='accelerometer; autoplay; encrypted-media; picture-in-picture; web-share';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';host.append(label,frame);host.hidden=false;return;}
    if(meta.preview_kind==='audio'&&TRUSTED_AUDIO.test(String(meta.preview_url||''))){const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=meta.preview_url;audio.setAttribute('aria-label',`${title||meta.title} audio preview`);host.append(label,audio);host.hidden=false;return;}
    // Never embed a guessed/unrelated preview. If the verified metadata has no
    // playable preview, show a clean title-page button instead.
    const page=sourcePage(meta);
    if(page){
      const fallback=document.createElement('a');fallback.className='matchapp-title-page-btn';fallback.href=page;fallback.target='_blank';fallback.rel='noopener noreferrer';
      fallback.textContent=(typeof window.t==='function'&&window.t('discover.titlePage'))||'Open title page';
      host.append(label,fallback);host.hidden=false;
    }
  }

  function renderAvailability(host,meta,{title='',kids=false,region=''}={}){
    if(!host)return;host.replaceChildren();host.hidden=true;
    if(!meta||(kids&&meta.kids_approved!==true))return;
    const actualTitle=title||meta.title||'',a=availability(meta,region),links=providerLinks(meta,actualTitle,a.region);
    const genres=(Array.isArray(meta.genres)?meta.genres:[]).filter(Boolean);
    const wrap=document.createElement('div');wrap.className='matchapp-title-availability';
    if(genres.length){
      const row=document.createElement('div');row.className='matchapp-real-genres';
      const label=document.createElement('strong');paintResultCopy(label,'genres',{},kids);row.appendChild(label);
      genres.slice(0,8).forEach(g=>{const chip=document.createElement('span');if(kids)chip.textContent=g;else paintResultFact(chip,g,'genre');row.appendChild(chip);});
      wrap.appendChild(row);
    }
    const status=document.createElement('div');status.className='matchapp-availability-status';
    if(!a.region&&!kids){
      const choose=document.createElement('a');choose.href='/profile/profile.html';
      paintResultCopy(choose,'chooseCountry');status.appendChild(choose);
    }
    else if(a.streams.length)paintResultCopy(status,'streamingNow',{region:a.region},kids);
    else if(a.inCinemas)paintResultCopy(status,'cinemaNoStream',{region:a.region},kids);
    else paintResultCopy(status,'notStreaming',{region:a.region},kids);
    wrap.appendChild(status);
    if(links.length){
      const row=document.createElement('div');row.className='matchapp-provider-actions';
      const label=document.createElement('strong');paintResultCopy(label,'watchOptions',{region:a.region},kids);row.appendChild(label);
      links.slice(0,16).forEach(link=>{
        const aEl=document.createElement('a');aEl.href=link.href;aEl.target='_blank';aEl.rel='noopener noreferrer';
        const key=link.direct?(link.mode==='rent'?'rent':link.mode==='buy'?'buy':'watch'):'availability';
        paintResultCopy(aEl,key,{},kids,' · '+link.provider);row.appendChild(aEl);
      });
      wrap.appendChild(row);
    }
    if(a.cinemaDate||a.inCinemas){
      const row=document.createElement('div');row.className='matchapp-cinema-actions';
      const when=document.createElement('span');paintResultCopy(when,a.inCinemas?'cinemaNow':'cinemaRelease',{date:a.inCinemas?(a.cinemaDate?' · '+a.cinemaDate:''):a.cinemaDate},kids);row.appendChild(when);
      const nearby=document.createElement('a');nearby.href=showtimesUrl(actualTitle);nearby.target='_blank';nearby.rel='noopener noreferrer';paintResultCopy(nearby,a.inCinemas?'nearby':'showtimes',{},kids);row.appendChild(nearby);
      if(!kids&&a.inCinemas&&!/^\/kids(?:\/|$)/.test(location.pathname)&&!document.documentElement.classList.contains('kids-mode'))bindNearbyCinema(nearby,actualTitle);
      wrap.appendChild(row);
    }
    if(!a.streams.length){
      const elsewhere=streamingElsewhere(meta,a.region);
      if(elsewhere.length){
        const row=document.createElement('div');row.className='matchapp-other-countries';
        const label=document.createElement('strong');paintResultCopy(label,'elsewhere',{},kids);row.appendChild(label);
        elsewhere.slice(0,18).forEach(item=>{
          const line=document.createElement('span');line.className='matchapp-country-availability';
          if(kids)line.textContent=item.country+' · '+item.providers.join(', ');
          else {const country=document.createElement('span');paintResultFact(country,item.region,'country');line.append(country,document.createTextNode(' · '+item.providers.join(', ')));}
          row.appendChild(line);
        });
        wrap.appendChild(row);
      }
      if(a.region&&Number.isSafeInteger(Number(meta.tmdb_id))&&['movie','tv'].includes(meta.media_kind)){
        const follow=document.createElement('button');follow.type='button';follow.className='matchapp-follow-availability';
        paintResultCopy(follow,'notify',{region:a.region},kids);
        follow.addEventListener('click',async()=>{
          if(!window.MatchNotifications?.followTitle){
            window.showToast?.(resultCopy('signIn',{},kids));
            window.openAuthModal?.();return;
          }
          follow.disabled=true;
          const ok=await window.MatchNotifications.followTitle(meta,a.region).catch(()=>false);
          follow.disabled=false;
          if(ok){paintResultCopy(follow,'following',{region:a.region},kids);follow.classList.add('is-following');}
        });
        wrap.appendChild(follow);
      }
    }
    const page=a.sourcePage;
    if(page){
      const row=document.createElement('div');row.className='matchapp-title-page-row';
      const pageLink=document.createElement('a');pageLink.href=page;pageLink.target='_blank';pageLink.rel='noopener noreferrer';paintResultCopy(pageLink,'titleDetails',{},kids);row.appendChild(pageLink);wrap.appendChild(row);
    }
    if(wrap.childElementCount){host.appendChild(wrap);host.hidden=false;}
  }
  function desktopResultInfo(){
    return window.matchMedia?.('(min-width: 1180px) and (hover: hover) and (pointer: fine)')?.matches === true
      && !document.documentElement.classList.contains('matchapp-android');
  }
  function renderTitleFacts(meta,{kids=false}={}){
    const id=kids?'matchapp-kids-title-facts':'res-title-facts';
    let host=document.getElementById(id);
    if(!meta){host?.remove();return;}
    const countries=(Array.isArray(meta.origin_countries)?meta.origin_countries:[])
      .map(countryName).filter(Boolean).slice(0,6);
    const cast=(Array.isArray(meta.cast_members)?meta.cast_members:[])
      .filter(x=>x&&x.name).slice(0,kids?6:10);
    if(!countries.length&&!cast.length){host?.remove();return;}
    if(!host){
      host=document.createElement('div');
      host.id=id;
      host.className='matchapp-title-facts';
      const anchor=kids
        ? (document.getElementById('kids-watch-description')||document.getElementById('kids-watch-name'))
        : (document.getElementById('res-synopsis')||document.getElementById('res-media-meta')||document.getElementById('res-title'));
      if(anchor)anchor.insertAdjacentElement('afterend',host);
    }
    if(!host)return;
    // Desktop keeps country and cast directly after the synopsis, ahead of
    // streaming options and the embedded preview, including on a re-match.
    if(!kids&&desktopResultInfo()){
      const synopsis=document.getElementById('res-synopsis');
      if(synopsis&&host.previousElementSibling!==synopsis)synopsis.insertAdjacentElement('afterend',host);
    }
    host.replaceChildren();
    if(countries.length){
      const row=document.createElement('div');
      row.className='matchapp-title-fact-row';
      const label=document.createElement('strong');
      paintResultCopy(label,countries.length>1?'countries':'country',{},kids);
      const value=document.createElement('span');
      if(kids)value.textContent=countries.join(', ');else paintResultFact(value,(meta.origin_countries||[]).slice(0,6),'countries');
      row.append(label,value);
      host.appendChild(row);
    }
    if(cast.length){
      const row=document.createElement('div');
      row.className='matchapp-title-fact-row';
      const label=document.createElement('strong');
      paintResultCopy(label,'cast',{},kids);
      const value=document.createElement('span');
      value.textContent=cast.map(x=>x.character?x.name+' · '+x.character:x.name).join('  •  ');
      row.append(label,value);
      host.appendChild(row);
    }
  }

  function applyDetails(meta){
    const existing=document.getElementById('res-media-meta');
    if(!meta){existing?.remove();renderTitleFacts(null);return;}
    const synopsis=document.getElementById('res-synopsis');
    if(synopsis&&(!synopsis.textContent||synopsis.textContent.trim().length<24)&&meta.overview)synopsis.textContent=meta.overview;

    const bits=[];
    if(meta.year)bits.push(meta.year);
    if(meta.runtime_minutes)bits.push(`${meta.runtime_minutes} min`);
    if(meta.content_rating)bits.push('Rated '+meta.content_rating);
    if(meta.vote_average)bits.push(`TMDB ★ ${Number(meta.vote_average).toFixed(1)}`);
    (Array.isArray(meta.genres)?meta.genres:[]).slice(0,5).forEach(g=>bits.push(g));

    const badge=document.getElementById('res-platform-badge');
    if(bits.length&&badge){
      const el=existing||document.createElement('span');
      el.id='res-media-meta';
      el.className='matchapp-media-meta';
      paintResultFact(el,meta,'metadata');
      if(!existing)badge.insertAdjacentElement('afterend',el);
    }else existing?.remove();

    if(desktopResultInfo()){
      const bar=document.getElementById('res-factbar');
      if(bar){
        // The exact TMDB identity wins over the matcher's interim hints.
        // A same-named TVMaze result must never leave a conflicting year here.
        const facts=[];
        if(Number(meta.year)>1880)facts.push({value:String(meta.year),kind:'auto'});
        (Array.isArray(meta.origin_countries)?meta.origin_countries:[])
          .filter(Boolean).forEach(value=>facts.push({value,kind:'country'}));
        (Array.isArray(meta.genres)?meta.genres:[])
          .map(value=>String(value||'').trim()).filter(Boolean).forEach(value=>facts.push({value,kind:'genre'}));
        const unique=[...new Map(facts.map(fact=>[fact.kind+'|'+fact.value,fact])).values()];
        bar.replaceChildren(...unique.map(fact=>paintResultFact(document.createElement('span'),fact.value,fact.kind)));
        bar.style.display=facts.length?'flex':'none';
      }
    }
    renderTitleFacts(meta);
  }

  async function enrichTrendingRail(){
    const cards=[...document.querySelectorAll('#marquee-track .marquee-item')];
    let next=0;
    const enrichCard=async card=>{
      const img=card.querySelector('img[data-title]'),title=img?.dataset?.title||'';
      if(!title)return;
      const pinnedId=Number(img.dataset.tmdbId),pinnedKind=img.dataset.tmdbKind;
      const pinnedYear=Number(img.dataset.tmdbYear);
      let meta=await lookup(title,{
        kind:['movie','tv'].includes(pinnedKind)?pinnedKind:'',
        year:Number.isSafeInteger(pinnedYear)&&pinnedYear>1880?pinnedYear:''
      });
      if(Number.isSafeInteger(pinnedId)&&pinnedId>0&&
         meta&&Number(meta.tmdb_id)!==pinnedId)meta=null;
      meta=await refreshExact(meta);
      // Some verified Top Titles use a localized label (e.g. Vermelho Sangue).
      // Their database row may use the original-language title, so an exact
      // normalized-title SQL lookup cannot find it even when the displayed
      // legacy poster still loads. Refresh ONLY their pinned numeric TMDB ID;
      // never perform a fuzzy title search or swap to another work's artwork.
      if(!meta){
        const id=Number(img.dataset.tmdbId),kind=img.dataset.tmdbKind,year=Number(img.dataset.tmdbYear);
        if(Number.isSafeInteger(id)&&id>0&&['movie','tv'].includes(kind)&&
           typeof window.tmdbDetails==='function'){
          try{
            const details=await window.tmdbDetails(id,kind);
            if(details&&details.adult!==true&&Number(details.tmdbId)===id&&
               details.kind===kind&&(!Number.isSafeInteger(year)||year<1880||
               !details.year||Math.abs(Number(details.year)-year)<=1)&&
               posterVariants(details.posterLarge||details.poster||details.posterOriginal).length){
              meta={title,tmdb_id:id,media_kind:kind,year:details.year||year,
                poster_url:details.poster||null,
                poster_large_url:details.posterLarge||null,
                poster_original_url:details.posterOriginal||null};
            }
          }catch(_){/* Existing poster stays visible when metadata is offline. */}
        }
      }
      recoverAdultPoster(img,title,meta);
      const state=availability(meta);
      let ribbon=card.querySelector('.matchapp-cinema-ribbon');
      if(state.inCinemas){
        if(!ribbon){
          ribbon=document.createElement('span');
          ribbon.className='matchapp-cinema-ribbon';
          card.appendChild(ribbon);
        }
        ribbon.textContent=(typeof window.t==='function'&&window.t('discover.inCinemas'))||'In cinemas';
      }else ribbon?.remove();
    };
    const worker=async()=>{
      while(next<cards.length){
        const card=cards[next++];
        try{await enrichCard(card)}catch(_){}
      }
    };
    const TRENDING_CONCURRENCY=2;
    await Promise.all(Array.from({length:Math.min(TRENDING_CONCURRENCY,cards.length)},worker));
  }

  async function resolvePoster(title,opts={}){
    let meta=await lookup(title,opts);
    const pinned=Number(opts.tmdbId);
    if(Number.isSafeInteger(pinned)&&pinned>0&&meta&&
       Number(meta.tmdb_id)!==pinned)meta=null;
    if(meta)meta=await refreshExact(meta);
    if(!safePoster(meta)){
      const live=await lookupLive(title,opts);
      if(live)meta=meta?{...meta,...live}:live;
    }
    return {url:safePoster(meta)||'',meta:meta||null};
  }

  let mainSerial=0;
  async function enrichMain(){
    const titleEl=document.getElementById('res-title');
    const resultRoot=document.getElementById('result-card')||document.getElementById('result-box');
    if(!titleEl||!resultRoot||resultRoot.hidden||resultRoot.style.display==='none')return;
    const title=String(window.globalMatchTitle||titleEl.textContent||'').trim();
    if(!title||title==='Title')return;
    const serial=++mainSerial;
    const matchRun=Number(window.__matchappMatchRunId)||0;
    const current=()=>serial===mainSerial&&(Number(window.__matchappMatchRunId)||0)===matchRun&&
      normalise(window.globalMatchTitle||titleEl.textContent)===normalise(title)&&
      !resultRoot.hidden&&resultRoot.style.display!=='none';
    // On desktop the title, ratings and synopsis must precede lengthy
    // streaming and preview panels. Keep the established compact order on
    // phone, tablet and Android WebView.
    const synopsis=document.getElementById('res-synopsis');
    const desktopInfo=desktopResultInfo()&&!!synopsis;
    const anchor=(desktopInfo&&synopsis)||document.getElementById('res-platform-badge')||synopsis||document.getElementById('res-actions')||titleEl;
    const availabilityHost=ensurePlayerHost(anchor,'matchapp-main-availability');
    const host=ensurePlayerHost(availabilityHost||anchor,'matchapp-main-preview');
    if(desktopInfo&&availabilityHost&&availabilityHost.previousElementSibling!==synopsis)
      synopsis.insertAdjacentElement('afterend',availabilityHost);
    if(desktopInfo&&host&&availabilityHost&&host.previousElementSibling!==availabilityHost)
      availabilityHost.insertAdjacentElement('afterend',host);

    const identity=(window.currentMatchIdentity&&normalise(window.currentMatchIdentity.title)===normalise(title))
      ? window.currentMatchIdentity:{};
    let opts={
      year:identity.year||'',
      cats:Array.isArray(identity.cats)?identity.cats:[],
      kind:identity.kind||'',
      tmdbId:identity.tmdbId||null,
      priority:true
    };
    try{
      const entry=typeof CONTENT_CATALOG!=='undefined'?CONTENT_CATALOG.find(e=>e?.title===title):null;
      if(entry)opts={
        ...opts,
        year:opts.year||entry.year||'',
        cats:opts.cats.length?opts.cats:(entry.cats||[]),
        kind:opts.kind||(window.tmdbKindForCats?.(entry.cats||[])||'')
      };
    }catch(_){}

    if(identity.spotifyArtwork && /^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(identity.spotifyArtwork) &&
       /^https:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9]+$/.test(identity.spotifyPlaylistUrl||'')){
      // Never ask TMDB for a music playlist with the same title as a movie.
      const poster=document.getElementById('res-poster-img');
      if(poster&&poster.src!==identity.spotifyArtwork)poster.src=identity.spotifyArtwork;
      applyDetails(null);
      renderAvailability(availabilityHost,null,{title});
      renderPreview(host,null,{title});
      return;
    }
    if(identity.itunesAudio===true){
      // Do not search TMDB for a same-named movie when the exact Apple result
      // is an album, podcast, audiobook or music track. Its own source art is
      // the only eligible original, and its preview must be on Apple's audio CDN.
      const page=String(identity.appleSourceUrl||'');
      const allowedPage=/^https:\/\/(?:music|podcasts|books)\.apple\.com\//i.test(page)||
        /^https:\/\/itunes\.apple\.com\//i.test(page);
      const rawPreview=String(identity.applePreviewUrl||'');
      const preview=/^https:\/\/audio-ssl\.itunes\.apple\.com\//i.test(rawPreview)&&allowedPage?rawPreview:null;
      if(serial!==mainSerial)return;
      applyDetails(null);
      renderAvailability(availabilityHost,null,{title});
      renderPreview(host,{title,preview_kind:preview?'audio':null,preview_url:preview,
        source_page_url:allowedPage?page:null},{title});
      const image=document.getElementById('res-poster-img');
      if(image&&identity.artwork)recoverAdultPoster(image,title,null,identity.artwork);
      return;
    }
    // The repository snapshot can already pin this curated work. Resolve its
    // ID once before enriching, avoiding a redundant title search when a
    // same-named remake exists or the source search endpoint is throttled.
    if(!opts.tmdbId&&typeof window.getCatalogTmdbIdentity==='function'){
      try{
        const exact=await window.getCatalogTmdbIdentity(title);
        if(!current())return;
        if(Number.isSafeInteger(Number(exact?.tmdbId))&&Number(exact.tmdbId)>0&&
           ['movie','tv'].includes(exact.kind)&&(!opts.kind||opts.kind===exact.kind)&&
           (!opts.year||!exact.year||Math.abs(Number(opts.year)-Number(exact.year))<=1))
          opts={...opts,tmdbId:Number(exact.tmdbId),kind:exact.kind,year:opts.year||exact.year||''};
      }catch(_){}
    }
    const resolved=await resolvePoster(title,opts);
    if(!current())return;
    const meta=resolved.meta;
    if(meta&&!safeSameTitleMedia(meta,{title,tmdbId:Number(opts.tmdbId)||0,kind:opts.kind,
      // A known numeric identity owns corrected source facts, including an
      // old catalogue year that live exact details can legitimately repair.
      year:opts.tmdbId?0:Number(opts.year)||0}))return;
    if(meta&&Number.isSafeInteger(Number(meta.tmdb_id))&&Number(meta.tmdb_id)>0&&['movie','tv'].includes(meta.media_kind)){
      const originalTitle=String(meta.original_title||meta.title||identity.originalTitle||'');
      const imdbId=/^tt\d{7,10}$/.test(String(meta.imdb_id||''))?String(meta.imdb_id):
        Number(identity.tmdbId)===Number(meta.tmdb_id)&&identity.kind===meta.media_kind&&
        /^tt\d{7,10}$/.test(String(identity.imdbId||''))?String(identity.imdbId):'';
      window.currentMatchIdentity={...identity,title,originalTitle,tmdbId:Number(meta.tmdb_id),imdbId,
        kind:meta.media_kind,year:meta.year||identity.year||'',artwork:resolved.url||identity.artwork||''};
      // Record verified aliases and source identity after enrichment. The
      // policy preserves an explicit Save/Not For Me action during this
      // passive update, so a localized spelling cannot reappear as new.
      try{window.matchPolicy?.remember?.({...meta,...window.currentMatchIdentity,
        posterUrl:resolved.url||'',streamUrl:identity.streamUrl||''},'shown');}catch(_){}
    }
    const poster=document.getElementById('res-poster-img');

    if(poster){
      poster.dataset.matchappMediaTitle=title;
      recoverAdultPoster(poster,title,meta,resolved.url);
    }
    if(!meta){
      applyDetails(null);
      renderPreview(host,null,{title});
      return;
    }
    applyDetails(meta);
    renderAvailability(availabilityHost,meta,{title});
    renderPreview(host,meta,{title});
    // Display-only extension event. Optional RapidAPI enhancement never affects the Match.
    if(Number.isSafeInteger(Number(meta.tmdb_id))&&Number(meta.tmdb_id)>0&&
       ['movie','tv'].includes(meta.media_kind))
      document.dispatchEvent(new CustomEvent('matchapp:adult-metadata',{detail:{
        title,tmdbId:Number(meta.tmdb_id),kind:meta.media_kind,
        imdbId:window.currentMatchIdentity?.imdbId||'',country:regionCode()
      }}));
    // Read-only result presentation consumes the same resolved source record;
    // it performs no lookup and cannot interrupt media or matching behavior.
    try { window.MatchAppResultExperience?.setAvailability?.(title,meta,regionCode()); } catch (_) {}
  }

  let kidsSerial=0,kidsEnrichTimer=0;
  async function enrichKids(){
    const dialog=document.getElementById('kids-watch-dialog');
    if(!dialog||!dialog.open)return;
    const name=document.getElementById('kids-watch-name');if(!name)return;const title=name.textContent.trim();if(!title)return;const serial=++kidsSerial;
    const meta=await lookup(title,{kids:true});if(serial!==kidsSerial||!dialog.open)return;
    const host=ensurePlayerHost(document.getElementById('kids-watch-description')||name,'matchapp-kids-preview');
    renderPreview(host,meta,{kids:true,title});
    renderTitleFacts(meta,{kids:true});
    if(meta)dialog.querySelectorAll('img[data-title],img[data-poster-title]').forEach(img=>hardenImage(img,title,meta));
  }
  function queueKidsEnrich(){
    clearTimeout(kidsEnrichTimer);
    kidsEnrichTimer=setTimeout(()=>{
      const dialog=document.getElementById('kids-watch-dialog');
      hardenWithin(dialog||document);
      enrichKids().catch(()=>{});
    },0);
  }

  function installStyle(){if(document.getElementById('matchapp-media-style'))return;const s=document.createElement('style');s.id='matchapp-media-style';s.textContent=`
    .matchapp-media-preview{margin:14px 0 4px;max-width:760px}.matchapp-media-preview[hidden]{display:none!important}
    .matchapp-media-preview-label{margin:0 0 7px;color:#E5C158;font:800 11px/1.2 Inter,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase}
    .matchapp-media-preview iframe,.discover-card-preview video{display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:14px;background:#000}
    .matchapp-media-preview audio{display:block;width:100%;min-height:44px}.discover-card-preview video{margin:0 0 9px}.matchapp-title-page-btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border:1px solid #E5C158;border-radius:999px;color:#E5C158;text-decoration:none;font-weight:800}.matchapp-media-meta{display:inline-flex;margin-left:8px;color:#bdb4ca;font-size:12px}.matchapp-title-facts{display:grid;gap:7px;margin:10px 0 2px;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025)}.matchapp-title-fact-row{display:grid;grid-template-columns:minmax(64px,max-content) minmax(0,1fr);gap:10px;align-items:start;color:#d9d2e2;font-size:12px;line-height:1.5}.matchapp-title-fact-row strong{color:#E5C158;text-transform:uppercase;letter-spacing:.05em;font-size:10px}.matchapp-title-fact-row span{min-width:0;overflow-wrap:anywhere}
    .matchapp-title-availability{display:grid;gap:10px;margin:12px 0 16px;padding:13px;border:1px solid rgba(229,193,88,.18);border-radius:16px;background:linear-gradient(145deg,rgba(229,193,88,.045),rgba(111,71,158,.055))}.matchapp-real-genres,.matchapp-provider-actions,.matchapp-cinema-actions,.matchapp-title-page-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.matchapp-real-genres strong,.matchapp-provider-actions strong,.matchapp-other-countries strong{width:100%;color:#E5C158;font-size:12px;text-transform:uppercase;letter-spacing:.06em}.matchapp-real-genres span,.matchapp-title-availability a{padding:7px 10px;border-radius:999px;border:1px solid rgba(229,193,88,.35);background:rgba(229,193,88,.08);color:#f6e8ad;text-decoration:none;font-size:12px;font-weight:800}.matchapp-title-availability a:hover{background:rgba(229,193,88,.16)}.matchapp-cinema-actions span{color:#fff;font-size:13px;font-weight:800}.matchapp-availability-status{color:#eee;font-size:13px;line-height:1.55;padding:9px 11px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.035)}.matchapp-other-countries{display:grid;gap:6px}.matchapp-country-availability{display:block;color:#cfc6dd;font-size:12px;line-height:1.4}.matchapp-follow-availability{justify-self:start;border:1px solid rgba(229,193,88,.55);background:linear-gradient(135deg,rgba(229,193,88,.18),rgba(117,71,159,.18));color:#ffe9a6;border-radius:999px;padding:10px 14px;font-weight:900;cursor:pointer}.matchapp-follow-availability.is-following{border-color:#48d597;color:#aef7d2}
    #matchapp-kids-preview{max-width:520px;margin-left:auto;margin-right:auto}#matchapp-kids-preview iframe{border-radius:18px}
    #marquee-track .marquee-item{position:relative}
    .matchapp-cinema-ribbon{position:absolute;z-index:8;top:10px;left:-5px;padding:6px 10px 6px 12px;border-radius:4px 8px 8px 4px;background:#d6253f;color:#fff;font:900 10px/1 Inter,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 5px 14px rgba(214,37,63,.4);pointer-events:none}
    .matchapp-cinema-ribbon:after{content:"";position:absolute;left:0;bottom:-6px;border-top:6px solid #871427;border-left:6px solid transparent}
    @media(max-width:640px){.matchapp-media-meta{display:block;margin:6px 0 0}.matchapp-title-fact-row{grid-template-columns:1fr;gap:2px}.matchapp-media-preview{width:100%}.matchapp-cinema-ribbon{top:7px;font-size:9px;padding:5px 8px 5px 10px}}
  `;document.head.appendChild(s);}
  function hardenWithin(root){
    root?.querySelectorAll?.('img[data-title]:not([data-matchapp-media-hardened]),img[data-poster-title]:not([data-matchapp-media-hardened]),#res-poster-img:not([data-matchapp-media-hardened]),.kids-card img:not([data-matchapp-media-hardened])').forEach(img=>{
      const title=titleForImage(img);
      // Saved music and reading editions keep their source-specific owners.
      if(['audio','book'].includes(img.dataset?.posterSourceKind))return;
      if(adultPosterSurface(img))recoverAdultPoster(img,title);
      else hardenImage(img,title);
    });
  }
  function boot(){
    installStyle();syncGenreFilter();hardenWithin(document);localizeResultLabels();
    const result=document.getElementById('result-card')||document.getElementById('result-box');
    const kids=document.getElementById('kids-watch-dialog');
    // Result enrichment is event-driven on BOTH main and Kids surfaces.
    // Never observe either mutable result subtree and then rewrite it from the
    // observer callback: renderPreview()/renderAvailability() replace children
    // and would otherwise feed the observer forever.
    if(result&&result.style.display!=='none'&&!result.hidden)enrichMain();
    const isHome=location.pathname==='/'||location.pathname==='/index.html';
    if(isHome){
      // Do not start network/media enrichment while Home is still settling.
      // Arm it after load and only run when the rail is actually near view.
      const rail=document.getElementById('trending-rail');
      let started=false;
      const start=()=>{
        if(started)return;started=true;
        const later=()=>enrichTrendingRail();
        if('requestIdleCallback' in window)requestIdleCallback(later);
        else setTimeout(later,0);
      };
      const arm=()=>{
        if(!rail){return}
        if('IntersectionObserver' in window){
          const io=new IntersectionObserver(entries=>{
            if(entries.some(entry=>entry.isIntersecting)){io.disconnect();start()}
          },{rootMargin:'0px'});
          io.observe(rail);
        }else setTimeout(start,8000);
      };
      if(document.readyState==='complete')setTimeout(arm,800);
      else window.addEventListener('load',()=>setTimeout(arm,800),{once:true});
    }else enrichTrendingRail();
    document.addEventListener('matchapp:newmatch',()=>{hardenWithin(result||document);enrichMain();});
    document.addEventListener('matchapp:kids-result',queueKidsEnrich);
    document.addEventListener('matchapp:langchange',()=>{
      localizeResultLabels();
      enrichTrendingRail();
      const host=document.getElementById('matchapp-kids-preview');
      if(host)delete host.dataset.matchappPreviewSignature;
      queueKidsEnrich();
    });
  }
  window.MatchAppCatalogMedia=Object.freeze({hardenWithin,localizeResultFacts,localizeResultLabels,resultFact,recoverAdultPoster,posterVariants,lookup,lookupLive,refreshExact,resolvePoster,normalise,localPoster,enrichMain,enrichKids,enrichTrendingRail,renderPreview,renderAvailability,availability,streamingElsewhere,viewingTarget,providerLinks,providerSearch,showtimesUrl,sourcePage,regionCode,resolveCountryCode,countryName,titleKeysForGenres,availableGenres,syncGenreFilter});
  document.dispatchEvent(new Event('matchapp:catalog-media-ready'));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
