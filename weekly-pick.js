/* MatchApp weekly featured title + AHS13 official trailer.
   The featured title is intentionally configured in one object so the weekly
   choice can be swapped without rebuilding the homepage component. */
(function(){
'use strict';

const LANGS=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
/* ---------------------------------------------------------------------------
   THE FEATURED TITLE.

   Everything title-specific lives in this one object plus PICK_COPY below, so
   swapping the featured title is a data edit and never a component rewrite.
   The contract for future swaps (and for the bot that will do them) is in
   docs/DAILY_EVENT_AND_FEATURED_TITLE_CONTRACT.md.

   Artwork: `poster` is intentionally empty. The cover is resolved at runtime
   from the verified TMDB identity through MatchApp's own tmdb-proxy, the same
   source the rest of the catalogue uses, so the card never ships a guessed
   image URL. Until it resolves, a branded plate holds the exact poster shape.
   --------------------------------------------------------------------------- */
const PICK={
  title:'Antártida',year:2026,country:'Brazil',countryCode:'BR',
  kind:'movie',tmdbId:1401757,imdbId:'tt5691086',
  director:'Bruno Safadi',author:'Claudia Jouvin',
  cast:['Andrea Beltrão','Marina Ruy Barbosa','Leandra Leal','Antonio Calloni','Lázaro Ramos','Tatiana Tiburcio','Renan Monteiro'],
  runtime:94,rating:'16',distributor:'Paris Filmes',releaseDate:'2026-09-17',
  // Theatrical right now. When the streaming window opens, flip `inCinemas`
  // to false and fill `streaming` — the card swaps the cinema ribbon and the
  // showtimes action for a "Where to watch" action on its own, with no other
  // edit anywhere.
  inCinemas:true,
  platform:'Cinemas',
  streaming:null,
  poster:'',
  watchUrl:'',
  sourceUrl:'https://www.imdb.com/title/tt5691086/',
  previewId:'VtxQvbsGNIk',
  synopsis:'A brutal crime inside an isolated Brazilian research station in Antarctica turns a base of scientists and navy personnel into a pressure cooker, and the investigation has to be run from inside it.',
  cats:['movie'],moods:['intense and thrilling','dark and gritty','mind-bending'],
  vibes:['prestige and critically acclaimed','slow burn','award winning'],ratings:['mature adults only R rated']
};

/* Title-specific copy, kept apart from the component's own COPY table so the
   featured title can change without touching the component's strings (and so
   the older featured pages that still read those strings keep working). */
const PICK_COPY={
'en':{desc:'Antártida (2026) is a Brazilian thriller directed by Bruno Safadi and written by Claudia Jouvin. On the first night of the winter season at a Brazilian research station in Antarctica a young scientist is attacked — and every man stationed there becomes a suspect while the investigation runs inside the base. In cinemas in Brazil from 17 September 2026.',cinema:'🎬 In cinemas now',showtimes:'🏟️ Cinemas near me',where:'▶ Where to watch',eyebrow:'This week’s featured film',director:'Director',runtime:'min',preview:'Official trailer',sourceNote:'Title facts, cast and release checked against IMDb and the distributor’s announcement.'},
'pt-BR':{desc:'Antártida (2026) é um suspense brasileiro dirigido por Bruno Safadi, com roteiro de Claudia Jouvin. Na primeira noite da temporada de inverno em uma estação de pesquisa brasileira na Antártida, uma jovem cientista é atacada — e todos os homens da base viram suspeitos enquanto a investigação acontece lá dentro. Nos cinemas do Brasil desde 17 de setembro de 2026.',cinema:'🎬 Em cartaz nos cinemas',showtimes:'🏟️ Cinemas perto de mim',where:'▶ Onde assistir',eyebrow:'O filme em destaque desta semana',director:'Direção',runtime:'min',preview:'Trailer oficial',sourceNote:'Ficha, elenco e estreia conferidos no IMDb e no anúncio da distribuidora.'},
'es':{desc:'Antártida (2026) es un thriller brasileño dirigido por Bruno Safadi y escrito por Claudia Jouvin. En la primera noche de la temporada de invierno en una estación brasileña de investigación en la Antártida una joven científica es atacada, y todos los hombres de la base pasan a ser sospechosos mientras la investigación ocurre dentro. En cines de Brasil desde el 17 de septiembre de 2026.',cinema:'🎬 En cines',showtimes:'🏟️ Cines cerca de mí',where:'▶ Dónde verla',eyebrow:'La película destacada de esta semana',director:'Dirección',runtime:'min',preview:'Tráiler oficial',sourceNote:'Ficha, reparto y estreno verificados en IMDb y en el anuncio de la distribuidora.'},
'fr':{desc:'Antártida (2026) est un thriller brésilien réalisé par Bruno Safadi et écrit par Claudia Jouvin. La première nuit de la saison d’hiver dans une station de recherche brésilienne en Antarctique, une jeune scientifique est agressée — et tous les hommes de la base deviennent suspects, l’enquête se déroulant à l’intérieur. Au cinéma au Brésil depuis le 17 septembre 2026.',cinema:'🎬 Au cinéma',showtimes:'🏟️ Cinémas près de moi',where:'▶ Où le voir',eyebrow:'Le film à la une cette semaine',director:'Réalisation',runtime:'min',preview:'Bande-annonce officielle',sourceNote:'Fiche, distribution et sortie vérifiées sur IMDb et dans l’annonce du distributeur.'},
'de':{desc:'Antártida (2026) ist ein brasilianischer Thriller von Bruno Safadi nach einem Drehbuch von Claudia Jouvin. In der ersten Nacht der Wintersaison auf einer brasilianischen Forschungsstation in der Antarktis wird eine junge Wissenschaftlerin angegriffen — und jeder Mann auf der Station wird zum Verdächtigen, während die Ermittlung im Inneren läuft. Seit 17. September 2026 in brasilianischen Kinos.',cinema:'🎬 Jetzt im Kino',showtimes:'🏟️ Kinos in meiner Nähe',where:'▶ Wo zu sehen',eyebrow:'Der Film der Woche',director:'Regie',runtime:'Min.',preview:'Offizieller Trailer',sourceNote:'Angaben, Besetzung und Start gegen IMDb und die Ankündigung des Verleihs geprüft.'},
'it':{desc:'Antártida (2026) è un thriller brasiliano diretto da Bruno Safadi e scritto da Claudia Jouvin. Nella prima notte della stagione invernale in una stazione di ricerca brasiliana in Antartide una giovane scienziata viene aggredita, e tutti gli uomini della base diventano sospetti mentre l’indagine si svolge là dentro. Nelle sale in Brasile dal 17 settembre 2026.',cinema:'🎬 Al cinema',showtimes:'🏟️ Cinema vicino a me',where:'▶ Dove vederlo',eyebrow:'Il film in evidenza della settimana',director:'Regia',runtime:'min',preview:'Trailer ufficiale',sourceNote:'Scheda, cast e uscita verificati su IMDb e nell’annuncio del distributore.'},
'tr':{desc:'Antártida (2026), Bruno Safadi’nin yönettiği, Claudia Jouvin’in yazdığı bir Brezilya gerilimi. Antarktika’daki bir Brezilya araştırma istasyonunda kış sezonunun ilk gecesinde genç bir bilim insanı saldırıya uğrar ve üsteki tüm erkekler şüpheli hâline gelir; soruşturma da içeride yürütülür. 17 Eylül 2026’dan beri Brezilya sinemalarında.',cinema:'🎬 Sinemalarda',showtimes:'🏟️ Yakınımdaki sinemalar',where:'▶ Nerede izlenir',eyebrow:'Bu haftanın öne çıkan filmi',director:'Yönetmen',runtime:'dk',preview:'Resmî fragman',sourceNote:'Künye, oyuncular ve vizyon tarihi IMDb ve dağıtımcı duyurusuyla doğrulanmıştır.'},
'ru':{desc:'«Антарктида» (2026) — бразильский триллер Бруну Сафади по сценарию Клаудии Жовен. В первую ночь зимнего сезона на бразильской станции в Антарктиде нападают на молодую учёную — и каждый мужчина на базе становится подозреваемым, а расследование идёт внутри. В прокате в Бразилии с 17 сентября 2026 года.',cinema:'🎬 В кинотеатрах',showtimes:'🏟️ Кинотеатры рядом',where:'▶ Где смотреть',eyebrow:'Фильм недели',director:'Режиссёр',runtime:'мин',preview:'Официальный трейлер',sourceNote:'Данные, актёры и дата выхода сверены с IMDb и анонсом прокатчика.'},
'ar':{desc:'«أنتارتيدا» (2026) فيلم إثارة برازيلي من إخراج برونو سافادي وتأليف كلاوديا جوفان. في أول ليلة من موسم الشتاء في محطة أبحاث برازيلية في القطب الجنوبي، تتعرض عالمة شابة لاعتداء، ويصبح كل رجال القاعدة مشتبهًا بهم بينما يجري التحقيق في الداخل. في الصالات البرازيلية منذ 17 سبتمبر 2026.',cinema:'🎬 في دور العرض',showtimes:'🏟️ سينمات قريبة',where:'▶ أين أشاهده',eyebrow:'فيلم الأسبوع',director:'إخراج',runtime:'دقيقة',preview:'الإعلان الرسمي',sourceNote:'تم التحقق من المعلومات والطاقم وموعد العرض عبر IMDb وإعلان الموزع.'},
'hi':{desc:'अंतार्तिदा (2026) ब्रूनो साफादी द्वारा निर्देशित और क्लॉडिया जुविन द्वारा लिखित एक ब्राज़ीली थ्रिलर है। अंटार्कटिका में ब्राज़ीली शोध केंद्र में सर्दियों की पहली रात एक युवा वैज्ञानिक पर हमला होता है और बेस का हर पुरुष संदिग्ध बन जाता है। 17 सितंबर 2026 से ब्राज़ील के सिनेमाघरों में।',cinema:'🎬 सिनेमाघरों में',showtimes:'🏟️ पास के सिनेमाघर',where:'▶ कहाँ देखें',eyebrow:'इस हफ़्ते की फ़ीचर्ड फ़िल्म',director:'निर्देशक',runtime:'मिनट',preview:'आधिकारिक ट्रेलर',sourceNote:'जानकारी, कलाकार और रिलीज़ IMDb और वितरक की घोषणा से मिलाए गए।'},
'id':{desc:'Antártida (2026) adalah film thriller Brasil arahan Bruno Safadi dengan naskah Claudia Jouvin. Pada malam pertama musim dingin di stasiun riset Brasil di Antarktika, seorang ilmuwan muda diserang — dan semua pria di pangkalan itu menjadi tersangka sementara penyelidikan berlangsung di dalam. Tayang di bioskop Brasil sejak 17 September 2026.',cinema:'🎬 Sedang tayang di bioskop',showtimes:'🏟️ Bioskop terdekat',where:'▶ Tempat menonton',eyebrow:'Film pilihan minggu ini',director:'Sutradara',runtime:'mnt',preview:'Trailer resmi',sourceNote:'Data, pemeran dan tanggal rilis dicocokkan dengan IMDb dan pengumuman distributor.'},
'ja':{desc:'『アンタルチダ』（2026）はブルーノ・サファディ監督、クラウディア・ジョヴァン脚本のブラジル製サスペンス。南極のブラジル観測基地で越冬シーズン初日の夜、若い科学者が襲われ、基地の男たち全員が容疑者になる。ブラジルでは2026年9月17日から劇場公開。',cinema:'🎬 劇場公開中',showtimes:'🏟️ 近くの映画館',where:'▶ 視聴方法',eyebrow:'今週の注目作品',director:'監督',runtime:'分',preview:'公式予告編',sourceNote:'作品情報・キャスト・公開日はIMDbと配給元発表で確認。'},
'ko':{desc:'《안타르티다》(2026)는 브루노 사파디 감독, 클라우디아 주벤 각본의 브라질 스릴러다. 남극의 브라질 연구기지에서 결빙기 첫날 밤 젊은 과학자가 습격당하고, 기지의 모든 남자가 용의자가 된다. 2026년 9월 17일 브라질 극장 개봉.',cinema:'🎬 극장 상영 중',showtimes:'🏟️ 근처 극장',where:'▶ 시청처',eyebrow:'이번 주의 추천 영화',director:'감독',runtime:'분',preview:'공식 예고편',sourceNote:'정보·출연·개봉일은 IMDb와 배급사 발표로 확인했습니다.'},
'zh':{desc:'《南极》（2026）是布鲁诺·萨法迪执导、克劳迪娅·乔文编剧的巴西悬疑片。南极一座巴西科考站越冬季的第一个夜晚，一名年轻女科学家遭到袭击，站内所有男性都成了嫌疑人。巴西影院自2026年9月17日起上映。',cinema:'🎬 正在影院上映',showtimes:'🏟️ 附近影院',where:'▶ 在哪里看',eyebrow:'本周主推影片',director:'导演',runtime:'分钟',preview:'官方预告片',sourceNote:'资料、演员和上映日期均对照 IMDb 与发行方公告核实。'}
};
function pickCopy(){return PICK_COPY[lang()]||PICK_COPY.en;}

/* The AI chat is the detail experience for this title: showtimes near the
   visitor, synopsis, cast, country of production and IMDb rating, in their
   own language. Cinema-only titles ask for cinemas; once the streaming window
   opens the same handoff asks where to stream, rent or buy. */
function pickAskUrl(){
  const q=PICK.inCinemas
    ? 'Tell me about the film '+PICK.title+' ('+PICK.year+', '+PICK.country+', directed by '+PICK.director+
      '). Which cinemas near me are showing it, and at what times? Also give the full synopsis, the cast, the country of production, the runtime and age rating, and its IMDb rating and reception.'
    : 'Where can I watch the film '+PICK.title+' ('+PICK.year+', '+PICK.country+')? Give me every streaming, rent and buy option in my country, plus the full synopsis, the cast, the country of production and its IMDb rating and reception.';
  return '/discover.html?q='+encodeURIComponent(q)+'&focus=start';
}
const AHS={title:'American Horror Story: 13',trailerId:'gQf4Vya5PbI',date:'2026-09-24'};

const COPY={
'en':{
 weeklyHeading:'Top MatchApp TV Ai choice this week',weeklyEyebrow:'This week’s featured classic',
 agataDesc:'A 1985 TV Globo romantic comedy-drama by Ivani Ribeiro. Jô Penteado and teacher Fábio Coutinho develop feelings after a sea excursion leaves their group stranded on an island. The 160-episode classic is available on Globoplay.',
 year:'Year',network:'Network',episodes:'episodes',rating:'Age rating',watch:'▶ Watch on Globoplay',save:'⭐ Save to Watch Later',notForMe:'👎 Not For Me',preview:'Official Globoplay preview',sources:'Verified sources',sourceNote:'Title facts and availability checked against Globoplay and Memória Globo.',
 ahsDesc:'American Horror Story season 13 premieres September 24, 2026 on FX and Hulu in the U.S., with Disney+ availability in Latin America.',ahsTrailer:'Official FX trailer',premieres:'Premieres',us:'FX & Hulu (U.S.)',latam:'Disney+ (Latin America)',ahsEpisodes:'13 episodes',openWeekly:'Open this week’s MatchApp choice',openAhs:'Open the AHS13 premiere',
 saved:'Saved to Watch Later.',disliked:'Marked Not For Me.'
},
'pt-BR':{
 weeklyHeading:'Escolha da semana do MatchApp TV Ai',weeklyEyebrow:'Clássico em destaque nesta semana',
 agataDesc:'Comédia romântica dramática da TV Globo de 1985, de Ivani Ribeiro. Jô Penteado e o professor Fábio Coutinho se aproximam depois que uma excursão marítima deixa o grupo preso em uma ilha. O clássico de 160 capítulos está disponível no Globoplay.',
 year:'Ano',network:'Emissora',episodes:'capítulos',rating:'Classificação',watch:'▶ Assistir no Globoplay',save:'⭐ Salvar para depois',notForMe:'👎 Não é para mim',preview:'Prévia oficial do Globoplay',sources:'Fontes verificadas',sourceNote:'Informações do título e disponibilidade conferidas no Globoplay e Memória Globo.',
 ahsDesc:'A 13ª temporada de American Horror Story estreia em 24 de setembro de 2026 no FX e Hulu nos EUA, com disponibilidade no Disney+ na América Latina.',ahsTrailer:'Trailer oficial do FX',premieres:'Estreia',us:'FX e Hulu (EUA)',latam:'Disney+ (América Latina)',ahsEpisodes:'13 episódios',openWeekly:'Abrir a escolha da semana do MatchApp',openAhs:'Abrir a estreia de AHS13',
 saved:'Salvo para assistir depois.',disliked:'Marcado como Não é para mim.'
},
'es':{
 weeklyHeading:'Elección de la semana de MatchApp TV Ai',weeklyEyebrow:'Clásico destacado de esta semana',
 agataDesc:'Comedia dramática romántica de TV Globo de 1985, escrita por Ivani Ribeiro. Jô Penteado y el profesor Fábio Coutinho se acercan después de que una excursión marítima deja al grupo varado en una isla. El clásico de 160 episodios está disponible en Globoplay.',
 year:'Año',network:'Canal',episodes:'episodios',rating:'Clasificación por edad',watch:'▶ Ver en Globoplay',save:'⭐ Guardar para después',notForMe:'👎 No es para mí',preview:'Avance oficial de Globoplay',sources:'Fuentes verificadas',sourceNote:'Datos del título y disponibilidad verificados con Globoplay y Memória Globo.',
 ahsDesc:'La temporada 13 de American Horror Story se estrena el 24 de septiembre de 2026 en FX y Hulu en EE. UU., con disponibilidad en Disney+ en Latinoamérica.',ahsTrailer:'Tráiler oficial de FX',premieres:'Estreno',us:'FX y Hulu (EE. UU.)',latam:'Disney+ (Latinoamérica)',ahsEpisodes:'13 episodios',openWeekly:'Abrir la elección semanal de MatchApp',openAhs:'Abrir el estreno de AHS13',
 saved:'Guardado para ver más tarde.',disliked:'Marcado como No es para mí.'
},
'fr':{
 weeklyHeading:'Choix MatchApp TV Ai de la semaine',weeklyEyebrow:'Classique à l’honneur cette semaine',
 agataDesc:'Comédie dramatique romantique de TV Globo datant de 1985, écrite par Ivani Ribeiro. Jô Penteado et le professeur Fábio Coutinho se rapprochent après une excursion en mer qui laisse leur groupe bloqué sur une île. Ce classique de 160 épisodes est disponible sur Globoplay.',
 year:'Année',network:'Chaîne',episodes:'épisodes',rating:'Classification',watch:'▶ Regarder sur Globoplay',save:'⭐ À regarder plus tard',notForMe:'👎 Pas pour moi',preview:'Extrait officiel Globoplay',sources:'Sources vérifiées',sourceNote:'Informations et disponibilité vérifiées auprès de Globoplay et Memória Globo.',
 ahsDesc:'La saison 13 d’American Horror Story débute le 24 septembre 2026 sur FX et Hulu aux États-Unis, avec une disponibilité sur Disney+ en Amérique latine.',ahsTrailer:'Bande-annonce officielle FX',premieres:'Première',us:'FX et Hulu (États-Unis)',latam:'Disney+ (Amérique latine)',ahsEpisodes:'13 épisodes',openWeekly:'Ouvrir le choix MatchApp de la semaine',openAhs:'Ouvrir la première AHS13',
 saved:'Ajouté à À regarder plus tard.',disliked:'Marqué Pas pour moi.'
},
'de':{
 weeklyHeading:'MatchApp TV Ai Wahl der Woche',weeklyEyebrow:'Klassiker der Woche',
 agataDesc:'Romantische TV-Globo-Dramedy von 1985 von Ivani Ribeiro. Jô Penteado und Lehrer Fábio Coutinho kommen sich näher, nachdem ein Seeausflug ihre Gruppe auf einer Insel stranden lässt. Der Klassiker mit 160 Folgen ist auf Globoplay verfügbar.',
 year:'Jahr',network:'Sender',episodes:'Folgen',rating:'Altersfreigabe',watch:'▶ Auf Globoplay ansehen',save:'⭐ Für später speichern',notForMe:'👎 Nichts für mich',preview:'Offizielle Globoplay-Vorschau',sources:'Verifizierte Quellen',sourceNote:'Titeldaten und Verfügbarkeit mit Globoplay und Memória Globo geprüft.',
 ahsDesc:'American Horror Story Staffel 13 startet am 24. September 2026 bei FX und Hulu in den USA und ist in Lateinamerika auf Disney+ verfügbar.',ahsTrailer:'Offizieller FX-Trailer',premieres:'Start',us:'FX & Hulu (USA)',latam:'Disney+ (Lateinamerika)',ahsEpisodes:'13 Folgen',openWeekly:'MatchApp-Wahl der Woche öffnen',openAhs:'AHS13-Premiere öffnen',
 saved:'Für später gespeichert.',disliked:'Als Nichts für mich markiert.'
},
'it':{
 weeklyHeading:'Scelta MatchApp TV Ai della settimana',weeklyEyebrow:'Classico in evidenza questa settimana',
 agataDesc:'Commedia drammatica romantica di TV Globo del 1985, scritta da Ivani Ribeiro. Jô Penteado e l’insegnante Fábio Coutinho si avvicinano dopo che un’escursione in mare lascia il gruppo bloccato su un’isola. Il classico di 160 episodi è disponibile su Globoplay.',
 year:'Anno',network:'Rete',episodes:'episodi',rating:'Classificazione',watch:'▶ Guarda su Globoplay',save:'⭐ Salva per dopo',notForMe:'👎 Non fa per me',preview:'Anteprima ufficiale Globoplay',sources:'Fonti verificate',sourceNote:'Informazioni e disponibilità verificate con Globoplay e Memória Globo.',
 ahsDesc:'La stagione 13 di American Horror Story debutta il 24 settembre 2026 su FX e Hulu negli Stati Uniti, con disponibilità su Disney+ in America Latina.',ahsTrailer:'Trailer ufficiale FX',premieres:'Debutto',us:'FX e Hulu (USA)',latam:'Disney+ (America Latina)',ahsEpisodes:'13 episodi',openWeekly:'Apri la scelta MatchApp della settimana',openAhs:'Apri la première di AHS13',
 saved:'Salvato per dopo.',disliked:'Contrassegnato come Non fa per me.'
},
'tr':{
 weeklyHeading:'Haftanın MatchApp TV Ai seçimi',weeklyEyebrow:'Bu haftanın öne çıkan klasiği',
 agataDesc:'Ivani Ribeiro’nun yazdığı 1985 yapımı TV Globo romantik komedi-draması. Jô Penteado ile öğretmen Fábio Coutinho, bir deniz gezisinin grubu adada mahsur bırakmasının ardından yakınlaşır. 160 bölümlük klasik Globoplay’de izlenebilir.',
 year:'Yıl',network:'Kanal',episodes:'bölüm',rating:'Yaş sınıflandırması',watch:'▶ Globoplay’de izle',save:'⭐ Sonra izlemek için kaydet',notForMe:'👎 Bana göre değil',preview:'Resmî Globoplay önizlemesi',sources:'Doğrulanmış kaynaklar',sourceNote:'Başlık bilgileri ve erişilebilirlik Globoplay ve Memória Globo ile doğrulandı.',
 ahsDesc:'American Horror Story 13. sezon, ABD’de 24 Eylül 2026’da FX ve Hulu’da başlıyor; Latin Amerika’da Disney+ üzerinden sunuluyor.',ahsTrailer:'Resmî FX fragmanı',premieres:'Başlangıç',us:'FX ve Hulu (ABD)',latam:'Disney+ (Latin Amerika)',ahsEpisodes:'13 bölüm',openWeekly:'Haftanın MatchApp seçimini aç',openAhs:'AHS13 prömiyerini aç',
 saved:'Sonra izlemek için kaydedildi.',disliked:'Bana göre değil olarak işaretlendi.'
},
'ru':{
 weeklyHeading:'Выбор недели MatchApp TV Ai',weeklyEyebrow:'Классика недели',
 agataDesc:'Романтическая комедийная драма TV Globo 1985 года по сценарию Ивани Рибейру. Жо Пентеаду и учитель Фабиу Коутинью сближаются после морской экскурсии, из-за которой группа оказывается на острове. Классический сериал из 160 эпизодов доступен на Globoplay.',
 year:'Год',network:'Канал',episodes:'эпизодов',rating:'Возрастной рейтинг',watch:'▶ Смотреть на Globoplay',save:'⭐ Сохранить на потом',notForMe:'👎 Не для меня',preview:'Официальный ролик Globoplay',sources:'Проверенные источники',sourceNote:'Данные и доступность проверены по Globoplay и Memória Globo.',
 ahsDesc:'13-й сезон American Horror Story выходит 24 сентября 2026 года на FX и Hulu в США и доступен на Disney+ в Латинской Америке.',ahsTrailer:'Официальный трейлер FX',premieres:'Премьера',us:'FX и Hulu (США)',latam:'Disney+ (Латинская Америка)',ahsEpisodes:'13 эпизодов',openWeekly:'Открыть выбор MatchApp недели',openAhs:'Открыть премьеру AHS13',
 saved:'Сохранено на потом.',disliked:'Отмечено как Не для меня.'
},
'ar':{
 weeklyHeading:'اختيار MatchApp TV Ai لهذا الأسبوع',weeklyEyebrow:'كلاسيكية هذا الأسبوع',
 agataDesc:'دراما كوميدية رومانسية من TV Globo عام 1985 للكاتبة Ivani Ribeiro. تتقارب Jô Penteado مع المعلّم Fábio Coutinho بعد رحلة بحرية تترك المجموعة عالقة على جزيرة. العمل الكلاسيكي المكوّن من 160 حلقة متاح على Globoplay.',
 year:'السنة',network:'القناة',episodes:'حلقة',rating:'التصنيف العمري',watch:'▶ المشاهدة على Globoplay',save:'⭐ حفظ للمشاهدة لاحقًا',notForMe:'👎 ليس مناسبًا لي',preview:'معاينة رسمية من Globoplay',sources:'مصادر موثّقة',sourceNote:'تم التحقق من معلومات العمل وتوفّره عبر Globoplay وMemória Globo.',
 ahsDesc:'يُعرض الموسم 13 من American Horror Story في 24 سبتمبر 2026 على FX وHulu في الولايات المتحدة، مع توفره على Disney+ في أمريكا اللاتينية.',ahsTrailer:'الإعلان الرسمي من FX',premieres:'العرض الأول',us:'FX وHulu (الولايات المتحدة)',latam:'Disney+ (أمريكا اللاتينية)',ahsEpisodes:'13 حلقة',openWeekly:'فتح اختيار MatchApp لهذا الأسبوع',openAhs:'فتح عرض AHS13 الأول',
 saved:'تم الحفظ للمشاهدة لاحقًا.',disliked:'تم وضع علامة ليس مناسبًا لي.'
},
'hi':{
 weeklyHeading:'इस सप्ताह की MatchApp TV Ai पसंद',weeklyEyebrow:'इस सप्ताह का चुनिंदा क्लासिक',
 agataDesc:'Ivani Ribeiro द्वारा लिखित 1985 की TV Globo रोमांटिक कॉमेडी-ड्रामा। समुद्री भ्रमण के बाद समूह के एक द्वीप पर फँस जाने से Jô Penteado और शिक्षक Fábio Coutinho करीब आते हैं। 160 एपिसोड वाला यह क्लासिक Globoplay पर उपलब्ध है।',
 year:'वर्ष',network:'नेटवर्क',episodes:'एपिसोड',rating:'आयु रेटिंग',watch:'▶ Globoplay पर देखें',save:'⭐ बाद में देखने के लिए सेव करें',notForMe:'👎 मेरे लिए नहीं',preview:'आधिकारिक Globoplay प्रीव्यू',sources:'सत्यापित स्रोत',sourceNote:'शीर्षक की जानकारी और उपलब्धता Globoplay और Memória Globo से सत्यापित की गई है।',
 ahsDesc:'American Horror Story सीज़न 13 का प्रीमियर 24 सितंबर 2026 को अमेरिका में FX और Hulu पर होगा, और लैटिन अमेरिका में Disney+ पर उपलब्ध होगा।',ahsTrailer:'आधिकारिक FX ट्रेलर',premieres:'प्रीमियर',us:'FX और Hulu (अमेरिका)',latam:'Disney+ (लैटिन अमेरिका)',ahsEpisodes:'13 एपिसोड',openWeekly:'इस सप्ताह की MatchApp पसंद खोलें',openAhs:'AHS13 प्रीमियर खोलें',
 saved:'बाद में देखने के लिए सेव किया गया।',disliked:'मेरे लिए नहीं के रूप में चिह्नित।'
},
'id':{
 weeklyHeading:'Pilihan MatchApp TV Ai minggu ini',weeklyEyebrow:'Klasik pilihan minggu ini',
 agataDesc:'Drama komedi romantis TV Globo tahun 1985 karya Ivani Ribeiro. Jô Penteado dan guru Fábio Coutinho semakin dekat setelah perjalanan laut membuat kelompok mereka terdampar di sebuah pulau. Karya klasik 160 episode ini tersedia di Globoplay.',
 year:'Tahun',network:'Jaringan',episodes:'episode',rating:'Rating usia',watch:'▶ Tonton di Globoplay',save:'⭐ Simpan untuk nanti',notForMe:'👎 Bukan untuk saya',preview:'Pratinjau resmi Globoplay',sources:'Sumber terverifikasi',sourceNote:'Informasi judul dan ketersediaan diverifikasi melalui Globoplay dan Memória Globo.',
 ahsDesc:'American Horror Story musim 13 tayang perdana 24 September 2026 di FX dan Hulu di AS, serta tersedia di Disney+ di Amerika Latin.',ahsTrailer:'Trailer resmi FX',premieres:'Tayang perdana',us:'FX & Hulu (AS)',latam:'Disney+ (Amerika Latin)',ahsEpisodes:'13 episode',openWeekly:'Buka pilihan MatchApp minggu ini',openAhs:'Buka penayangan perdana AHS13',
 saved:'Disimpan untuk ditonton nanti.',disliked:'Ditandai Bukan untuk saya.'
},
'ja':{
 weeklyHeading:'今週のMatchApp TV Aiおすすめ',weeklyEyebrow:'今週の注目クラシック',
 agataDesc:'Ivani Ribeiro脚本による1985年のTV Globoロマンティック・コメディドラマ。海の遠足で一行が島に取り残されたことをきっかけに、Jô Penteadoと教師Fábio Coutinhoが惹かれ合っていきます。全160話の名作はGloboplayで配信されています。',
 year:'年',network:'放送局',episodes:'話',rating:'年齢区分',watch:'▶ Globoplayで見る',save:'⭐ あとで見るに保存',notForMe:'👎 好みではない',preview:'Globoplay公式プレビュー',sources:'確認済み情報源',sourceNote:'作品情報と配信状況はGloboplayとMemória Globoで確認済みです。',
 ahsDesc:'American Horror Storyシーズン13は2026年9月24日に米国のFXとHuluで初公開され、ラテンアメリカではDisney+で配信されます。',ahsTrailer:'FX公式トレーラー',premieres:'初公開',us:'FX・Hulu（米国）',latam:'Disney+（ラテンアメリカ）',ahsEpisodes:'全13話',openWeekly:'今週のMatchAppおすすめを開く',openAhs:'AHS13プレミアを開く',
 saved:'あとで見るに保存しました。',disliked:'好みではないとして記録しました。'
},
'ko':{
 weeklyHeading:'이번 주 MatchApp TV Ai 추천작',weeklyEyebrow:'이번 주 추천 클래식',
 agataDesc:'Ivani Ribeiro가 집필한 1985년 TV Globo 로맨틱 코미디 드라마입니다. 바다 소풍 중 일행이 섬에 고립된 뒤 Jô Penteado와 교사 Fábio Coutinho가 가까워집니다. 160부작 클래식은 Globoplay에서 볼 수 있습니다.',
 year:'연도',network:'방송사',episodes:'회',rating:'연령 등급',watch:'▶ Globoplay에서 보기',save:'⭐ 나중에 보기 저장',notForMe:'👎 내 취향 아님',preview:'Globoplay 공식 미리보기',sources:'확인된 출처',sourceNote:'작품 정보와 시청 가능 여부는 Globoplay와 Memória Globo에서 확인했습니다.',
 ahsDesc:'American Horror Story 시즌 13은 2026년 9월 24일 미국 FX와 Hulu에서 공개되며, 라틴아메리카에서는 Disney+에서 제공됩니다.',ahsTrailer:'FX 공식 예고편',premieres:'공개일',us:'FX 및 Hulu(미국)',latam:'Disney+(라틴아메리카)',ahsEpisodes:'13부작',openWeekly:'이번 주 MatchApp 추천 열기',openAhs:'AHS13 프리미어 열기',
 saved:'나중에 보기에 저장했습니다.',disliked:'내 취향 아님으로 표시했습니다.'
},
'zh':{
 weeklyHeading:'本周 MatchApp TV Ai 精选',weeklyEyebrow:'本周经典推荐',
 agataDesc:'Ivani Ribeiro 编剧的1985年 TV Globo 浪漫喜剧剧情剧。一次海上旅行让一行人被困孤岛后，Jô Penteado 与教师 Fábio Coutinho 的感情逐渐升温。这部160集的经典作品可在 Globoplay 观看。',
 year:'年份',network:'电视网',episodes:'集',rating:'年龄分级',watch:'▶ 在 Globoplay 观看',save:'⭐ 保存到稍后观看',notForMe:'👎 不适合我',preview:'Globoplay 官方预告',sources:'已核实来源',sourceNote:'作品信息和观看可用性已通过 Globoplay 与 Memória Globo 核实。',
 ahsDesc:'American Horror Story 第13季将于2026年9月24日在美国 FX 和 Hulu 首播，并在拉丁美洲通过 Disney+ 提供。',ahsTrailer:'FX 官方预告片',premieres:'首播',us:'FX 与 Hulu（美国）',latam:'Disney+（拉丁美洲）',ahsEpisodes:'13集',openWeekly:'打开本周 MatchApp 精选',openAhs:'打开 AHS13 首播',
 saved:'已保存到稍后观看。',disliked:'已标记为不适合我。'
}
};

function lang(){const raw=(window.MATCH_LANG||document.documentElement.lang||'en').toLowerCase();if(raw.startsWith('pt'))return'pt-BR';const base=raw.split('-')[0];return LANGS.includes(base)?base:'en';}
function c(){return COPY[lang()]||COPY.en;}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function fmtDate(iso){try{return new Intl.DateTimeFormat(lang(),{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(iso+'T12:00:00Z'));}catch(_){return iso;}}
function reduce(){return matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion');}

function addCatalogEntry(){
  try{
    if(typeof CONTENT_CATALOG!=='undefined'&&Array.isArray(CONTENT_CATALOG)&&!CONTENT_CATALOG.some(x=>String(x.title).toLowerCase()===PICK.title.toLowerCase())){
      // A cinema-only title has no streaming destination to promise, so the
      // catalogue entry points at the detail experience that can actually
      // answer "where" — never at a fabricated provider deep link.
      CONTENT_CATALOG.push({title:PICK.title,year:PICK.year,country:PICK.country,countryCode:PICK.countryCode,cast:PICK.cast.slice(),synopsis:PICK.synopsis,platform:PICK.platform,watchUrl:PICK.watchUrl||(PICK.streaming&&PICK.streaming.url)||pickAskUrl(),cats:PICK.cats.slice(),moods:PICK.moods.slice(),vibes:PICK.vibes.slice(),ratings:PICK.ratings.slice()});
    }
    if(typeof VERIFIED_POSTERS!=='undefined'&&VERIFIED_POSTERS&&PICK.poster)VERIFIED_POSTERS[PICK.title]=PICK.poster;
  }catch(e){console.warn('Weekly pick catalog registration skipped',e);}
}

/* The cover comes from the verified TMDB identity through MatchApp's own
   proxy — one request, cached by tmdb.js, and a silent no-op when the proxy
   is unavailable so the branded plate simply stays. */
async function resolveArtwork(){
  if(PICK.poster||!PICK.tmdbId||typeof window.tmdbDetails!=='function')return;
  let record=null;
  try{record=await window.tmdbDetails(PICK.tmdbId,PICK.kind||'movie');}catch(_){record=null;}
  const url=record&&(record.posterLarge||record.poster);
  if(!/^https:\/\/image\.tmdb\.org\/t\/p\/(?:w[0-9]+|original)\/[A-Za-z0-9_.-]+$/.test(String(url||'')))return;
  PICK.poster=url;
  try{if(typeof VERIFIED_POSTERS!=='undefined'&&VERIFIED_POSTERS)VERIFIED_POSTERS[PICK.title]=url;}catch(_){}
  const stage=document.querySelector('#weekly-pick .spotlight-poster');
  if(!stage)return;
  let img=stage.querySelector('img');
  if(!img){
    img=document.createElement('img');
    img.alt=PICK.title+' ('+PICK.year+') official poster';
    img.referrerPolicy='no-referrer';
    img.loading='lazy';img.decoding='async';
    // Only swap the plate out once the real cover has actually decoded, so a
    // slow or failed image never leaves an empty frame behind.
    img.addEventListener('load',()=>{const plate=stage.querySelector('.weekly-pick-plate');if(plate)plate.remove();},{once:true});
    img.addEventListener('error',()=>{img.remove();},{once:true});
    stage.appendChild(img);
  }
  img.src=url;
  const schema=document.getElementById('weekly-pick-schema');
  if(schema)schema.remove();
  enrichSeo();
}

function style(){if(document.getElementById('weekly-pick-style'))return;const s=document.createElement('style');s.id='weekly-pick-style';s.textContent=`
#weekly-pick-disclosure{margin-top:var(--stack-gap,18px)}
#weekly-pick .weekly-pick-video,#spotlight-ahs13 .weekly-pick-video{margin:14px 0 16px;max-width:620px}
.weekly-pick-video-label{display:flex;align-items:center;gap:7px;margin:0 0 7px;color:var(--gold,#E5C158);font-size:12px;font-weight:800}
.weekly-pick-video-frame{position:relative;aspect-ratio:16/9;border-radius:14px;overflow:hidden;border:1px solid rgba(229,193,88,.28);background:#08060d;box-shadow:0 12px 30px rgba(0,0,0,.3)}
.weekly-pick-video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
#weekly-pick .spotlight-poster{display:block;cursor:pointer;position:relative;text-decoration:none}
#weekly-pick .spotlight-poster img{display:block;width:100%;height:auto}
.weekly-pick-plate{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;box-sizing:border-box;width:100%;height:100%;min-height:100%;aspect-ratio:2/3;padding:14px 10px;border-radius:16px;background:radial-gradient(120% 70% at 50% 14%,rgba(120,182,255,.20),transparent 60%),linear-gradient(165deg,#0f1b34,#0a1122 60%,#060a14);box-shadow:inset 0 0 0 1px rgba(229,193,88,.26);text-align:center}
.weekly-pick-plate b{color:#ffe9a6;font-size:clamp(.8rem,2.2vw,1.1rem);line-height:1.2;text-transform:uppercase;letter-spacing:.02em;overflow-wrap:break-word}
.weekly-pick-plate small{color:#b9aecb;font-size:.78rem}
.weekly-pick-ribbon{position:absolute;top:10px;left:10px;z-index:2;display:inline-flex;align-items:center;max-width:calc(100% - 20px);padding:6px 11px;border-radius:999px;background:linear-gradient(135deg,#c8202e,#8d121d);color:#fff;font-size:11px;font-weight:900;letter-spacing:.05em;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 6px 18px rgba(0,0,0,.42)}
.weekly-pick-ribbon.is-streaming{background:linear-gradient(135deg,#f5d976,#dcae3b);color:#20150a}
.weekly-pick-source{font-size:11.5px;line-height:1.5;color:#bdb3cc;margin:8px 0 0}.weekly-pick-source a{color:var(--gold,#E5C158)}
.weekly-pick-actions{display:flex;flex-wrap:wrap;gap:9px;align-items:center}.weekly-pick-actions a,.weekly-pick-actions button{min-height:42px}
.weekly-pick-dislike{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.055);color:#eee;border-radius:999px;padding:10px 15px;font-weight:800;cursor:pointer}
@media(max-width:700px){#weekly-pick .weekly-pick-video,#spotlight-ahs13 .weekly-pick-video{max-width:100%}.weekly-pick-actions{gap:7px}.weekly-pick-actions a,.weekly-pick-actions button{font-size:12px;padding:9px 11px}}
`;document.head.appendChild(s);}

function player(id,label,title){return `<div class="weekly-pick-video"><p class="weekly-pick-video-label">🎬 ${esc(label)}</p><div class="weekly-pick-video-frame"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0" title="${esc(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div></div>`;}

function ensureWeekly(){
  const premiere=document.getElementById('premiere-disclosure');if(!premiere)return;
  let d=document.getElementById('weekly-pick-disclosure');
  if(!d){
    const ask=pickAskUrl(), px=pickCopy();
    const ribbon=PICK.inCinemas?px.cinema:(PICK.streaming?px.where:'');
    d=document.createElement('details');d.id='weekly-pick-disclosure';d.className='premiere-disclosure weekly-pick-disclosure';d.open=true;
    d.innerHTML=`<summary><span data-weekly="weeklyHeading"></span></summary><article id="weekly-pick" class="premium-card spotlight-card"><div class="spotlight-glow" aria-hidden="true"></div><div class="spotlight-inner"><a class="spotlight-poster" href="${esc(ask)}" aria-label="${esc(PICK.title)} (${PICK.year}) — details, cast and where to watch">${ribbon?`<span class="weekly-pick-ribbon${PICK.inCinemas?'':' is-streaming'}">${esc(ribbon)}</span>`:''}<span class="weekly-pick-plate"><b>${esc(PICK.title)}</b><small>${PICK.year} · ${esc(PICK.country)}</small></span></a><div class="spotlight-body"><span class="spotlight-eyebrow weekly-pick-eyebrow"></span><h2 class="spotlight-title"><a href="${esc(ask)}">${esc(PICK.title)}</a></h2><p class="spotlight-desc weekly-pick-desc"></p><div class="spotlight-meta weekly-pick-meta"></div><div class="weekly-pick-preview"></div><div class="weekly-pick-actions"><a class="gold-btn weekly-pick-primary" href="${esc(ask)}"></a><button class="gold-btn weekly-save" type="button" data-weekly="save"></button><button class="weekly-pick-dislike weekly-dislike" type="button" data-weekly="notForMe"></button></div><p class="weekly-pick-source"><strong data-weekly="sources"></strong>: <a href="${esc(PICK.sourceUrl)}" target="_blank" rel="noopener noreferrer">IMDb</a>. <span class="weekly-pick-sourcenote"></span></p></div></div></article>`;
    const swift=document.getElementById('swifties-spotify');(swift||premiere).insertAdjacentElement('afterend',d);
    d.querySelector('.weekly-save').addEventListener('click',()=>record('save'));
    d.querySelector('.weekly-dislike').addEventListener('click',()=>record('dislike'));
    d.addEventListener('toggle',()=>{try{window.track?.('weekly_pick_toggle',{open:d.open,title:PICK.title});}catch(_){}});
  }
}

async function record(type){
  if(typeof window.recordAction!=='function')return;
  let old={};
  try{
    old={title:typeof globalMatchTitle==='undefined'?undefined:globalMatchTitle,poster:typeof globalMatchPoster==='undefined'?undefined:globalMatchPoster,platform:typeof globalPlatform==='undefined'?undefined:globalPlatform,wt:window.globalMatchTitle,wp:window.globalMatchPoster,wpl:window.globalPlatform};
    globalMatchTitle=PICK.title;globalMatchPoster=PICK.poster;globalPlatform=PICK.platform;
    window.globalMatchTitle=PICK.title;window.globalMatchPoster=PICK.poster;window.globalPlatform=PICK.platform;
    await window.recordAction(type);
    window.track?.('weekly_pick_action',{title:PICK.title,action:type});
  }finally{
    try{if(old.title!==undefined)globalMatchTitle=old.title;if(old.poster!==undefined)globalMatchPoster=old.poster;if(old.platform!==undefined)globalPlatform=old.platform;}catch(_){}
    window.globalMatchTitle=old.wt||'';window.globalMatchPoster=old.wp||'';window.globalPlatform=old.wpl||'';
  }
}

function ensureAhsTrailer(){
  const body=document.querySelector('#spotlight-ahs13 .spotlight-body');if(!body)return;
  let host=body.querySelector('.ahs13-official-trailer');if(!host){host=document.createElement('div');host.className='ahs13-official-trailer';const meta=body.querySelector('.spotlight-meta');(meta||body.querySelector('.spotlight-desc'))?.insertAdjacentElement('afterend',host);}
}

function apply(){
  const x=c();document.querySelectorAll('[data-weekly]').forEach(el=>{const k=el.dataset.weekly;if(x[k])el.textContent=x[k];});
  const px=pickCopy();
  const eyebrow=document.querySelector('#weekly-pick .weekly-pick-eyebrow');if(eyebrow)eyebrow.textContent=px.eyebrow;
  const desc=document.querySelector('#weekly-pick .weekly-pick-desc');if(desc)desc.textContent=px.desc;
  const note=document.querySelector('#weekly-pick .weekly-pick-sourcenote');if(note)note.textContent=px.sourceNote;
  const primary=document.querySelector('#weekly-pick .weekly-pick-primary');
  if(primary){
    // Cinema-only titles offer showtimes; once the streaming window opens the
    // same button becomes "Where to watch" and points at that provider.
    if(PICK.inCinemas){primary.textContent=px.showtimes;primary.href=pickAskUrl();primary.removeAttribute('target');primary.removeAttribute('rel');}
    else if(PICK.streaming&&PICK.streaming.url){primary.textContent=px.where+' · '+PICK.streaming.name;primary.href=PICK.streaming.url;primary.target='_blank';primary.rel='noopener noreferrer';}
    else{primary.textContent=px.where;primary.href=pickAskUrl();primary.removeAttribute('target');primary.removeAttribute('rel');}
  }
  const ribbon=document.querySelector('#weekly-pick .weekly-pick-ribbon');
  if(ribbon)ribbon.textContent=PICK.inCinemas?px.cinema:(PICK.streaming?px.where:'');
  const meta=document.querySelector('#weekly-pick .weekly-pick-meta');if(meta)meta.innerHTML=`<span class="spotlight-chip">📅 <strong>${esc(x.year)} ${PICK.year}</strong></span><span class="spotlight-chip">🎬 ${esc(px.director)}: ${esc(PICK.director)}</span><span class="spotlight-chip">🌎 ${esc(PICK.country)}</span><span class="spotlight-chip">⏱️ ${PICK.runtime} ${esc(px.runtime)}</span><span class="spotlight-chip">🔞 ${esc(x.rating)} ${esc(PICK.rating)}</span>`;
  const p=document.querySelector('#weekly-pick .weekly-pick-preview');if(p&&PICK.previewId)p.innerHTML=player(PICK.previewId,px.preview,`${px.preview} — ${PICK.title}`);
  const ahs=document.querySelector('#spotlight-ahs13');if(ahs){const desc=ahs.querySelector('.spotlight-desc');if(desc)desc.textContent=x.ahsDesc;const m=ahs.querySelector('.spotlight-meta');if(m)m.innerHTML=`<span class="spotlight-chip">📅 <strong>${esc(x.premieres)} ${esc(fmtDate(AHS.date))}</strong></span><span class="spotlight-chip">📺 ${esc(x.us)}</span><span class="spotlight-chip">🌎 ${esc(x.latam)}</span><span class="spotlight-chip">🎞️ ${esc(x.ahsEpisodes)}</span>`;const h=ahs.querySelector('.ahs13-official-trailer');if(h)h.innerHTML=player(AHS.trailerId,x.ahsTrailer,`${x.ahsTrailer} — ${AHS.title}`);const poster=ahs.querySelector('.spotlight-poster');if(poster)poster.setAttribute('aria-label',x.openAhs);}
  const sum=document.querySelector('#weekly-pick-disclosure summary');if(sum)sum.setAttribute('aria-label',x.openWeekly);
  document.querySelectorAll('[data-weekly-page]').forEach(page=>{page.querySelectorAll('[data-weekly-page-key]').forEach(el=>{const k=el.dataset.weeklyPageKey;if(x[k])el.textContent=x[k];});});
}

function enrichSeo(){
  /* The standalone featured pages own their own metadata; only the homepage
     card enriches the page it is rendered into. */
  if(document.querySelector('[data-weekly-page]'))return;
  /* Long-tail and short terms for the featured title, added once. When the
     featured title changes, this list changes with PICK — see
     docs/DAILY_EVENT_AND_FEATURED_TITLE_CONTRACT.md. */
  const kw=document.querySelector('meta[name="keywords"]');
  const extra=[
    'Antártida','Antártida 2026','Antártida filme','Antártida filme 2026','filme Antártida Bruno Safadi',
    'Antártida onde assistir','Antártida nos cinemas','Antártida sessões','Antártida horários cinema',
    'Antártida elenco','Antártida sinopse','Antártida Marina Ruy Barbosa','Antártida Andrea Beltrão',
    'Antártida Lázaro Ramos','Antártida Leandra Leal','Antártida Paris Filmes','Antártida IMDb',
    'Antártida trailer oficial','suspense brasileiro 2026','filme brasileiro em cartaz',
    'Antarctic 2026 film','Antarctic Brazilian thriller','where to watch Antártida',
    'Antártida showtimes near me','new Brazilian movie 2026','thriller set in Antarctica',
    'American Horror Story 13','AHS13','American Horror Story season 13 trailer','AHS 13 FX Hulu Disney+'
  ].join(', ');
  if(kw&&!kw.content.includes('Antártida onde assistir'))kw.content+=', '+extra;
  const desc=document.querySelector('meta[name="description"]');
  if(desc&&!desc.content.includes('Featured this week: Antártida'))desc.content=(desc.content.replace(/\s*$/,'')+' Featured this week: Antártida (2026) — in cinemas now, plus American Horror Story 13 and its official trailer.').slice(0,300);
  if(!document.getElementById('weekly-pick-schema')){
    const graph=[{
      '@type':'Movie','@id':'https://matchapp.tv/featured/antartida/#movie',
      name:PICK.title,alternateName:'Antarctic',
      datePublished:PICK.releaseDate,
      genre:['Thriller','Drama','Mystery'],
      countryOfOrigin:{'@type':'Country',name:PICK.country},
      director:{'@type':'Person',name:PICK.director},
      author:{'@type':'Person',name:PICK.author},
      actor:PICK.cast.map(name=>({'@type':'Person',name})),
      contentRating:PICK.rating,
      duration:'PT'+PICK.runtime+'M',
      description:PICK.synopsis,
      url:'https://matchapp.tv/featured/antartida/',
      sameAs:[PICK.sourceUrl,'https://www.themoviedb.org/movie/'+PICK.tmdbId],
      productionCompany:{'@type':'Organization',name:PICK.distributor}
    }];
    if(PICK.poster)graph[0].image=PICK.poster;
    if(PICK.previewId)graph.push({'@type':'VideoObject',name:PICK.title+' — official trailer',uploadDate:'2026-08-26',thumbnailUrl:'https://i.ytimg.com/vi/'+PICK.previewId+'/hqdefault.jpg',contentUrl:'https://www.youtube.com/watch?v='+PICK.previewId,embedUrl:'https://www.youtube-nocookie.com/embed/'+PICK.previewId});
    graph.push({'@type':'VideoObject',name:'American Horror Story: 13 — Official Trailer | FX',uploadDate:'2026-09-10',thumbnailUrl:'https://i.ytimg.com/vi/'+AHS.trailerId+'/hqdefault.jpg',contentUrl:'https://www.youtube.com/watch?v='+AHS.trailerId,embedUrl:'https://www.youtube-nocookie.com/embed/'+AHS.trailerId});
    const node=document.createElement('script');node.id='weekly-pick-schema';node.type='application/ld+json';
    node.textContent=JSON.stringify({'@context':'https://schema.org','@graph':graph});
    document.head.appendChild(node);
  }
}

function hash(){const h=location.hash.toLowerCase();if(!['#weekly-pick','#antartida','#a-gata-comeu','#spotlight-ahs13'].includes(h))return;const isAhs=h==='#spotlight-ahs13';const d=document.getElementById(isAhs?'premiere-disclosure':'weekly-pick-disclosure');const target=document.getElementById(isAhs?'spotlight-ahs13':'weekly-pick');if(d)d.open=true;requestAnimationFrame(()=>target?.scrollIntoView({behavior:reduce()?'auto':'smooth',block:'start'}));}

function boot(){addCatalogEntry();style();ensureWeekly();ensureAhsTrailer();apply();enrichSeo();hash();resolveArtwork();const mo=new MutationObserver(m=>{if(m.some(x=>x.attributeName==='lang'||x.attributeName==='dir'))apply();});mo.observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});window.addEventListener('hashchange',hash);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
