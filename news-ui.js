/* News presentation only: selected-language copy, original-source identity intact. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.MatchAppNewsUI = api; api.init(root); }
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const COPY = {
    en: {
      brandHome: 'MatchApp Ai home', backLatest: '← MatchApp Ai — Latest News',
      hubTitle: 'Latest Entertainment, World and Sports News',
      hubIntro: "Browse separate entertainment, world and sports headlines. Dates belong to the publisher; an older report is not made new by a feed check. Choose your interface language; original headlines keep the source language.",
      howTitle: 'How MatchApp Ai News works',
      howIntro: "Start with the category and date. A storm or election report belongs to world news, not an entertainment award. An album, casting or premiere announcement is a discovery lead; it is not a review or proof that a title is available to you.",
      howSources: "Before choosing a film, open its country-specific viewing options: a release announcement does not mean it is included in your subscription. For a concert or album, check the artist or venue for dates and availability. Open the named publisher for the reporting and any corrections.",
      exploreLead: 'Explore the films, series and releases behind the news:', matcher: 'Entertainment matcher', askAi: 'Ask MatchApp Ai', whereWatch: 'Where to watch',
      guideChoice: "For a whole evening, the October guide compares films, music and books by the time and attention they need. For one title, the Roma guide explains how country, language and rental or subscription options change the decision.", romaGuide: "Roma: country and viewing-option guide",
      guidesLead: 'More guides and discovery:', octoberGuide: 'October 2026 streaming, music and books guide', septemberGuide: 'September 30 trends guide', anime: 'Anime Finder',
      feedLabel: 'Latest entertainment, world and sports headlines with original sources', latest: 'Latest News',
      eventEntertainment: 'Entertainment', eventObituary: 'In memoriam', eventCasting: 'Casting', eventMusic: 'Music', eventRelease: 'Releases', eventAwards: 'Awards', eventSports: 'Sports', eventWorld: 'World',
      openLatest: 'Open in Latest News →', sourceLink: 'Original source ↗', verifiedSource: 'Verified source:', published: 'Original publication:', discovered: 'First indexed by news discovery:',
      readAt: 'Read the original report at {source} ↗', openStory: 'Open this story in MatchApp Ai News →',
      attribution: 'MatchApp Ai links to the original publisher without republishing article bodies. Dates show the publisher’s publication time or a clearly labeled discovery time.',
      moreNews: 'More entertainment, world and sports news', backHome: 'Back to MatchApp Ai',
      sourceNote: 'Reported by {source}. Open the original report for full context and updates.', kidsMode: 'Kids Mode', kidsOpen: 'Open Kids Mode'
    },
    'pt-BR': {
      brandHome: 'Página inicial do MatchApp Ai', backLatest: '← MatchApp Ai — Últimas notícias',
      hubTitle: 'Últimas notícias de entretenimento, mundo e esportes',
      hubIntro: "Explore manchetes separadas de entretenimento, mundo e esportes. As datas são do veículo; consultar o feed não torna uma reportagem antiga nova. Escolha o idioma da interface; as manchetes mantêm o idioma da fonte.",
      howTitle: 'Como funcionam as notícias do MatchApp Ai',
      howIntro: "Comece pela categoria e pela data. Uma tempestade ou eleição é notícia do mundo, não um prêmio de entretenimento. O anúncio de um álbum, elenco ou estreia é uma pista para descobrir algo; não é uma crítica nem prova de disponibilidade.",
      howSources: "Antes de escolher um filme, confira as opções para o seu país: uma estreia não significa inclusão na assinatura. Para shows ou álbuns, confirme datas e disponibilidade com o artista ou local. Abra o veículo identificado para ler a reportagem e possíveis correções.",
      exploreLead: 'Explore os filmes, as séries e os lançamentos por trás das notícias:', matcher: 'Encontre o que assistir', askAi: 'Pergunte ao MatchApp Ai', whereWatch: 'Onde assistir',
      guideChoice: "Para planejar a noite, o guia de outubro compara filmes, música e livros pelo tempo e atenção necessários. Para um título, o guia de Roma explica como país, idioma, aluguel e assinatura influenciam a escolha.", romaGuide: "Roma: guia por país e opção de acesso",
      guidesLead: 'Mais guias e descobertas:', octoberGuide: 'Guia de streaming, música e livros de outubro de 2026', septemberGuide: 'Guia de tendências de 30 de setembro', anime: 'Encontre animes',
      feedLabel: 'Últimas manchetes de entretenimento, mundo e esportes com as fontes originais', latest: 'Últimas notícias',
      eventEntertainment: 'Entretenimento', eventObituary: 'Em memória', eventCasting: 'Elenco', eventMusic: 'Música', eventRelease: 'Lançamentos', eventAwards: 'Prêmios', eventSports: 'Esportes', eventWorld: 'Mundo',
      openLatest: 'Abrir nas últimas notícias →', sourceLink: 'Fonte original ↗', verifiedSource: 'Fonte verificada:', published: 'Publicação original:', discovered: 'Primeiro registro na descoberta de notícias:',
      readAt: 'Leia a reportagem original em {source} ↗', openStory: 'Abra esta notícia no MatchApp Ai →',
      attribution: 'O MatchApp Ai direciona ao veículo original sem republicar o texto das reportagens. As datas indicam a publicação informada pelo veículo ou o momento da descoberta, claramente identificado.',
      moreNews: 'Mais notícias de entretenimento, mundo e esportes', backHome: 'Voltar ao MatchApp Ai',
      sourceNote: 'Notícia publicada por {source}. Abra a reportagem original para ver o contexto completo e as atualizações.', kidsMode: 'Modo Kids', kidsOpen: 'Abrir o Modo Kids'
    },
    es: {
      brandHome: 'Inicio de MatchApp Ai', backLatest: '← MatchApp Ai — Últimas noticias',
      hubTitle: 'Últimas noticias de entretenimiento, mundo y deportes',
      hubIntro: "Explora titulares separados de entretenimiento, mundo y deportes. Las fechas son del medio; consultar el feed no renueva una noticia antigua. Elige el idioma de la interfaz; los titulares conservan el idioma original.",
      howTitle: 'Cómo funcionan las noticias de MatchApp Ai',
      howIntro: "Empieza por la categoría y la fecha. Una tormenta o elección es noticia mundial, no un premio de entretenimiento. Un anuncio de álbum, reparto o estreno es una pista para descubrir algo; no es una reseña ni prueba de disponibilidad.",
      howSources: "Antes de elegir una película, comprueba las opciones en tu país: un estreno no implica que esté incluido en tu suscripción. Para conciertos o álbumes, confirma fechas y disponibilidad con el artista o recinto. Abre el medio para leer el reportaje y sus correcciones.",
      exploreLead: 'Explora las películas, series y estrenos detrás de las noticias:', matcher: 'Encuentra entretenimiento', askAi: 'Pregunta a MatchApp Ai', whereWatch: 'Dónde ver',
      guideChoice: "Para una noche completa, la guía de octubre compara películas, música y libros por el tiempo y atención que requieren. La guía de Roma explica cómo país, idioma, alquiler y suscripción cambian la elección.", romaGuide: "Roma: guía por país y opción de acceso",
      guidesLead: 'Más guías y descubrimientos:', octoberGuide: 'Guía de streaming, música y libros de octubre de 2026', septemberGuide: 'Guía de tendencias del 30 de septiembre', anime: 'Buscador de anime',
      feedLabel: 'Últimos titulares de entretenimiento, mundo y deportes con sus fuentes originales', latest: 'Últimas noticias',
      eventEntertainment: 'Entretenimiento', eventObituary: 'En memoria', eventCasting: 'Reparto', eventMusic: 'Música', eventRelease: 'Estrenos', eventAwards: 'Premios', eventSports: 'Deportes', eventWorld: 'Mundo',
      openLatest: 'Abrir en últimas noticias →', sourceLink: 'Fuente original ↗', verifiedSource: 'Fuente verificada:', published: 'Publicación original:', discovered: 'Primer registro en el descubrimiento de noticias:',
      readAt: 'Lee la noticia original en {source} ↗', openStory: 'Abre esta noticia en MatchApp Ai →',
      attribution: 'MatchApp Ai enlaza al medio original sin republicar el texto de sus artículos. Las fechas indican la publicación del medio o un momento de descubrimiento claramente identificado.',
      moreNews: 'Más noticias de entretenimiento, mundo y deportes', backHome: 'Volver a MatchApp Ai',
      sourceNote: 'Noticia de {source}. Abre el artículo original para conocer todo el contexto y las actualizaciones.', kidsMode: 'Modo infantil', kidsOpen: 'Abrir el modo infantil'
    },
    fr: {
      brandHome: 'Accueil de MatchApp Ai', backLatest: '← MatchApp Ai — Dernières actualités',
      hubTitle: 'Dernières actualités culturelles, mondiales et sportives',
      hubIntro: "Parcourez les rubriques culture, monde et sport. Les dates viennent du média ; une consultation du flux ne rajeunit pas un ancien article. Choisissez la langue de l’interface ; les titres gardent la langue de la source.",
      howTitle: 'Comment fonctionnent les actualités de MatchApp Ai',
      howIntro: "Commencez par la rubrique et la date. Une tempête ou une élection relève du monde, pas des prix culturels. Une annonce d’album, de casting ou de sortie est une piste de découverte, pas une critique ni une preuve de disponibilité.",
      howSources: "Avant de choisir un film, vérifiez les options dans votre pays : une sortie ne signifie pas une inclusion dans votre abonnement. Pour un concert ou album, confirmez dates et disponibilité auprès de l’artiste ou du lieu. Consultez le média pour le reportage et ses corrections.",
      exploreLead: 'Explorez les films, séries et sorties qui font l’actualité :', matcher: 'Trouvez quoi regarder', askAi: 'Demandez à MatchApp Ai', whereWatch: 'Où regarder',
      guideChoice: "Pour une soirée entière, le guide d’octobre compare films, musique et livres selon le temps et l’attention nécessaires. Le guide de Roma explique le rôle du pays, de la langue, de la location et de l’abonnement.", romaGuide: "Roma : guide par pays et mode d’accès",
      guidesLead: 'D’autres guides et découvertes :', octoberGuide: 'Guide du streaming, de la musique et des livres d’octobre 2026', septemberGuide: 'Guide des tendances du 30 septembre', anime: 'Recherche d’anime',
      feedLabel: 'Derniers titres culturels, mondiaux et sportifs avec leurs sources originales', latest: 'Dernières actualités',
      eventEntertainment: 'Culture', eventObituary: 'En mémoire', eventCasting: 'Distribution', eventMusic: 'Musique', eventRelease: 'Sorties', eventAwards: 'Récompenses', eventSports: 'Sport', eventWorld: 'Monde',
      openLatest: 'Ouvrir dans les dernières actualités →', sourceLink: 'Source originale ↗', verifiedSource: 'Source vérifiée :', published: 'Publication originale :', discovered: 'Première détection de l’actualité :',
      readAt: 'Lire l’article original sur {source} ↗', openStory: 'Ouvrir cette actualité dans MatchApp Ai →',
      attribution: 'MatchApp Ai renvoie au média original sans republier le texte des articles. Les dates indiquent la publication du média ou un moment de découverte clairement signalé.',
      moreNews: 'Plus d’actualités culturelles, mondiales et sportives', backHome: 'Retour à MatchApp Ai',
      sourceNote: 'Information publiée par {source}. Ouvrez l’article original pour le contexte complet et les mises à jour.', kidsMode: 'Mode enfants', kidsOpen: 'Ouvrir le mode enfants'
    },
    de: {
      brandHome: 'MatchApp Ai Startseite', backLatest: '← MatchApp Ai — Aktuelle Nachrichten',
      hubTitle: 'Aktuelle Nachrichten aus Unterhaltung, Welt und Sport',
      hubIntro: "Entdecke getrennte Meldungen aus Unterhaltung, Welt und Sport. Die Daten stammen vom Verlag; ein Abruf macht ältere Berichte nicht neu. Wähle die Oberflächensprache; Überschriften bleiben in der Quellsprache.",
      howTitle: 'So funktionieren die Nachrichten von MatchApp Ai',
      howIntro: "Beginne mit Kategorie und Datum. Ein Sturm oder eine Wahl gehört zu Weltnachrichten, nicht zu Unterhaltungspreisen. Eine Album-, Besetzungs- oder Premiereankündigung ist ein Entdeckungshinweis, keine Kritik und kein Verfügbarkeitsnachweis.",
      howSources: "Prüfe vor der Filmauswahl die Angebote in deinem Land: Ein Start bedeutet nicht, dass der Film im Abo enthalten ist. Bestätige Konzert- und Albumtermine beim Künstler oder Veranstaltungsort. Lies den Bericht und Korrekturen beim genannten Verlag.",
      exploreLead: 'Entdecke Filme, Serien und Neuerscheinungen hinter den Nachrichten:', matcher: 'Unterhaltung finden', askAi: 'MatchApp Ai fragen', whereWatch: 'Wo ansehen',
      guideChoice: "Für einen ganzen Abend vergleicht der Oktober-Ratgeber Filme, Musik und Bücher nach Zeit und Aufmerksamkeit. Der Roma-Ratgeber erklärt den Einfluss von Land, Sprache, Leihe und Abo.", romaGuide: "Roma: Länder und Zugangsoptionen",
      guidesLead: 'Weitere Ratgeber und Entdeckungen:', octoberGuide: 'Streaming-, Musik- und Bücherratgeber für Oktober 2026', septemberGuide: 'Trendratgeber vom 30. September', anime: 'Anime finden',
      feedLabel: 'Aktuelle Schlagzeilen aus Unterhaltung, Welt und Sport mit Originalquellen', latest: 'Aktuelle Nachrichten',
      eventEntertainment: 'Unterhaltung', eventObituary: 'Zum Gedenken', eventCasting: 'Besetzung', eventMusic: 'Musik', eventRelease: 'Neuerscheinungen', eventAwards: 'Auszeichnungen', eventSports: 'Sport', eventWorld: 'Welt',
      openLatest: 'In aktuellen Nachrichten öffnen →', sourceLink: 'Originalquelle ↗', verifiedSource: 'Geprüfte Quelle:', published: 'Ursprüngliche Veröffentlichung:', discovered: 'Erstmals in der Nachrichtensuche erfasst:',
      readAt: 'Originalbericht bei {source} lesen ↗', openStory: 'Diese Nachricht in MatchApp Ai öffnen →',
      attribution: 'MatchApp Ai verlinkt auf das ursprüngliche Medium und veröffentlicht keine Artikeltexte erneut. Datumsangaben zeigen die Veröffentlichung des Mediums oder einen klar gekennzeichneten Entdeckungszeitpunkt.',
      moreNews: 'Weitere Nachrichten aus Unterhaltung, Welt und Sport', backHome: 'Zurück zu MatchApp Ai',
      sourceNote: 'Berichtet von {source}. Öffne den Originalbericht für den vollständigen Kontext und Aktualisierungen.', kidsMode: 'Kindermodus', kidsOpen: 'Kindermodus öffnen'
    },
    it: {
      brandHome: 'Pagina iniziale di MatchApp Ai', backLatest: '← MatchApp Ai — Ultime notizie',
      hubTitle: 'Ultime notizie di spettacolo, mondo e sport',
      hubIntro: "Esplora notizie separate di spettacolo, mondo e sport. Le date sono della fonte; un controllo del feed non rende nuova una vecchia notizia. Scegli la lingua dell’interfaccia; i titoli mantengono la lingua originale.",
      howTitle: 'Come funzionano le notizie di MatchApp Ai',
      howIntro: "Inizia da categoria e data. Una tempesta o elezione è una notizia dal mondo, non un premio dello spettacolo. Un annuncio di album, cast o uscita è uno spunto, non una recensione né una prova di disponibilità.",
      howSources: "Prima di scegliere un film, controlla le opzioni nel tuo paese: un’uscita non implica l’inclusione nell’abbonamento. Per concerti o album, conferma date e disponibilità con l’artista o la sede. Apri la fonte per il servizio e le correzioni.",
      exploreLead: 'Esplora i film, le serie e le uscite dietro le notizie:', matcher: 'Trova cosa guardare', askAi: 'Chiedi a MatchApp Ai', whereWatch: 'Dove guardare',
      guideChoice: "Per un’intera serata, la guida di ottobre confronta film, musica e libri in base a tempo e attenzione. La guida di Roma spiega come paese, lingua, noleggio e abbonamento cambiano la scelta.", romaGuide: "Roma: guida per paese e accesso",
      guidesLead: 'Altre guide e scoperte:', octoberGuide: 'Guida a streaming, musica e libri di ottobre 2026', septemberGuide: 'Guida alle tendenze del 30 settembre', anime: 'Trova anime',
      feedLabel: 'Ultimi titoli di spettacolo, mondo e sport con le fonti originali', latest: 'Ultime notizie',
      eventEntertainment: 'Spettacolo', eventObituary: 'In memoria', eventCasting: 'Cast', eventMusic: 'Musica', eventRelease: 'Uscite', eventAwards: 'Premi', eventSports: 'Sport', eventWorld: 'Mondo',
      openLatest: 'Apri nelle ultime notizie →', sourceLink: 'Fonte originale ↗', verifiedSource: 'Fonte verificata:', published: 'Pubblicazione originale:', discovered: 'Prima rilevazione della notizia:',
      readAt: 'Leggi l’articolo originale su {source} ↗', openStory: 'Apri questa notizia in MatchApp Ai →',
      attribution: 'MatchApp Ai rimanda alla testata originale senza ripubblicare il testo degli articoli. Le date indicano la pubblicazione della testata o un momento di scoperta chiaramente segnalato.',
      moreNews: 'Altre notizie di spettacolo, mondo e sport', backHome: 'Torna a MatchApp Ai',
      sourceNote: 'Notizia pubblicata da {source}. Apri l’articolo originale per il contesto completo e gli aggiornamenti.', kidsMode: 'Modalità bambini', kidsOpen: 'Apri la modalità bambini'
    },
    tr: {
      brandHome: 'MatchApp Ai ana sayfa', backLatest: '← MatchApp Ai — Son haberler',
      hubTitle: 'Son eğlence, dünya ve spor haberleri',
      hubIntro: "Eğlence, dünya ve spor başlıklarını ayrı inceleyin. Tarihler yayıncıya aittir; akışı kontrol etmek eski haberi yenilemez. Arayüz dilini seçin; başlıklar kaynak dilinde kalır.",
      howTitle: 'MatchApp Ai haberleri nasıl çalışır?',
      howIntro: "Kategori ve tarihle başlayın. Fırtına veya seçim dünya haberidir, eğlence ödülü değildir. Albüm, oyuncu kadrosu veya gala duyurusu keşif ipucudur; inceleme veya erişilebilirlik kanıtı değildir.",
      howSources: "Film seçmeden önce ülkenizdeki seçenekleri kontrol edin: çıkış haberi aboneliğinize dahil olduğu anlamına gelmez. Konser ve albüm tarihlerini sanatçı veya mekândan doğrulayın. Haberi ve düzeltmeleri adı belirtilen yayıncıdan okuyun.",
      exploreLead: 'Haberlerin ardındaki filmleri, dizileri ve yeni yapımları keşfedin:', matcher: 'İzleyecek bir şey bul', askAi: 'MatchApp Ai’a sor', whereWatch: 'Nerede izlenir',
      guideChoice: "Bir akşam için ekim rehberi film, müzik ve kitapları gereken süre ve dikkate göre karşılaştırır. Roma rehberi ülke, dil, kiralama ve abonelik seçeneklerinin etkisini açıklar.", romaGuide: "Roma: ülke ve izleme seçenekleri rehberi",
      guidesLead: 'Diğer rehberler ve keşifler:', octoberGuide: 'Ekim 2026 dijital yayın, müzik ve kitap rehberi', septemberGuide: '30 Eylül trend rehberi', anime: 'Anime bul',
      feedLabel: 'Özgün kaynaklarıyla son eğlence, dünya ve spor başlıkları', latest: 'Son haberler',
      eventEntertainment: 'Eğlence', eventObituary: 'Anısına', eventCasting: 'Oyuncu seçimi', eventMusic: 'Müzik', eventRelease: 'Yeni çıkanlar', eventAwards: 'Ödüller', eventSports: 'Spor', eventWorld: 'Dünya',
      openLatest: 'Son haberlerde aç →', sourceLink: 'Özgün kaynak ↗', verifiedSource: 'Doğrulanmış kaynak:', published: 'Özgün yayın tarihi:', discovered: 'Haber keşfinde ilk kaydedilme:',
      readAt: 'Özgün haberi {source} üzerinden oku ↗', openStory: 'Bu haberi MatchApp Ai’da aç →',
      attribution: 'MatchApp Ai, makale metinlerini yeniden yayımlamadan özgün yayıncıya bağlantı verir. Tarihler yayıncının yayın zamanını veya açıkça belirtilen keşif zamanını gösterir.',
      moreNews: 'Daha fazla eğlence, dünya ve spor haberi', backHome: 'MatchApp Ai’a dön',
      sourceNote: 'Haber kaynağı: {source}. Tüm bağlam ve güncellemeler için özgün haberi açın.', kidsMode: 'Çocuk Modu', kidsOpen: 'Çocuk Modunu aç'
    },
    ru: {
      brandHome: 'Главная MatchApp Ai', backLatest: '← MatchApp Ai — Последние новости',
      hubTitle: 'Последние новости развлечений, мира и спорта',
      hubIntro: "Читайте отдельные разделы развлечений, мира и спорта. Даты указаны издателем; проверка ленты не делает старую статью новой. Выберите язык интерфейса; заголовки сохраняют язык источника.",
      howTitle: 'Как работают новости MatchApp Ai',
      howIntro: "Начните с категории и даты. Буря или выборы — мировая новость, а не награда в сфере развлечений. Анонс альбома, актёрского состава или премьеры — повод для поиска, а не рецензия или доказательство доступности.",
      howSources: "Перед выбором фильма проверьте варианты в своей стране: премьера не означает включение в подписку. Даты концертов и альбомов уточняйте у исполнителя или площадки. Репортаж и исправления читайте у указанного издателя.",
      exploreLead: 'Откройте фильмы, сериалы и новинки, о которых говорят в новостях:', matcher: 'Подобрать развлечение', askAi: 'Спросить MatchApp Ai', whereWatch: 'Где смотреть',
      guideChoice: "Для целого вечера октябрьский гид сравнивает фильмы, музыку и книги по времени и вниманию. Гид по Roma объясняет влияние страны, языка, аренды и подписки.", romaGuide: "Roma: гид по странам и вариантам просмотра",
      guidesLead: 'Другие путеводители и открытия:', octoberGuide: 'Путеводитель по стримингу, музыке и книгам на октябрь 2026 года', septemberGuide: 'Обзор трендов от 30 сентября', anime: 'Поиск аниме',
      feedLabel: 'Последние заголовки развлечений, мира и спорта с первоисточниками', latest: 'Последние новости',
      eventEntertainment: 'Развлечения', eventObituary: 'Памяти', eventCasting: 'Актёрский состав', eventMusic: 'Музыка', eventRelease: 'Новинки', eventAwards: 'Награды', eventSports: 'Спорт', eventWorld: 'Мир',
      openLatest: 'Открыть в последних новостях →', sourceLink: 'Первоисточник ↗', verifiedSource: 'Проверенный источник:', published: 'Исходная публикация:', discovered: 'Впервые обнаружено в поиске новостей:',
      readAt: 'Читать исходный материал на {source} ↗', openStory: 'Открыть эту новость в MatchApp Ai →',
      attribution: 'MatchApp Ai ссылается на исходное издание, не перепечатывая тексты статей. Даты показывают время публикации издателя или явно обозначенное время обнаружения.',
      moreNews: 'Больше новостей развлечений, мира и спорта', backHome: 'Вернуться в MatchApp Ai',
      sourceNote: 'Материал издания {source}. Откройте первоисточник, чтобы узнать весь контекст и обновления.', kidsMode: 'Детский режим', kidsOpen: 'Открыть детский режим'
    },
    ar: {
      brandHome: 'الصفحة الرئيسية في MatchApp Ai', backLatest: '← MatchApp Ai — آخر الأخبار',
      hubTitle: 'آخر أخبار الترفيه والعالم والرياضة',
      hubIntro: "تصفح عناوين الترفيه والعالم والرياضة في فئات منفصلة. التواريخ من الناشر؛ فحص الخلاصة لا يجعل الخبر القديم جديدًا. اختر لغة الواجهة؛ تبقى العناوين بلغة المصدر.",
      howTitle: 'كيف تعمل أخبار MatchApp Ai',
      howIntro: "ابدأ بالفئة والتاريخ. العاصفة أو الانتخابات خبر عالمي وليست جائزة ترفيهية. إعلان ألبوم أو طاقم تمثيل أو عرض أول هو دليل للاكتشاف، لا مراجعة ولا إثبات للتوفر.",
      howSources: "قبل اختيار فيلم تحقق من خيارات بلدك: إعلان الإصدار لا يعني أنه مشمول باشتراكك. أكد مواعيد الحفلات والألبومات مع الفنان أو المكان. افتح الناشر المذكور لقراءة التقرير وتصحيحاته.",
      exploreLead: 'اكتشف الأفلام والمسلسلات والإصدارات التي تتناولها الأخبار:', matcher: 'اعثر على ما يناسبك', askAi: 'اسأل MatchApp Ai', whereWatch: 'أين تشاهد',
      guideChoice: "لأمسية كاملة يقارن دليل أكتوبر الأفلام والموسيقى والكتب حسب الوقت والانتباه المطلوبين. يوضح دليل Roma أثر البلد واللغة والاستئجار والاشتراك في الاختيار.", romaGuide: "Roma: دليل البلدان وخيارات المشاهدة",
      guidesLead: 'المزيد من الأدلة والاكتشافات:', octoberGuide: 'دليل البث والموسيقى والكتب لشهر أكتوبر 2026', septemberGuide: 'دليل الاتجاهات ليوم 30 سبتمبر', anime: 'البحث عن الأنمي',
      feedLabel: 'آخر عناوين الترفيه والعالم والرياضة مع مصادرها الأصلية', latest: 'آخر الأخبار',
      eventEntertainment: 'ترفيه', eventObituary: 'في الذكرى', eventCasting: 'اختيار الممثلين', eventMusic: 'موسيقى', eventRelease: 'إصدارات', eventAwards: 'جوائز', eventSports: 'رياضة', eventWorld: 'العالم',
      openLatest: 'افتح في آخر الأخبار →', sourceLink: 'المصدر الأصلي ↗', verifiedSource: 'المصدر الموثّق:', published: 'تاريخ النشر الأصلي:', discovered: 'أول تسجيل عند اكتشاف الخبر:',
      readAt: 'اقرأ التقرير الأصلي لدى {source} ↗', openStory: 'افتح هذا الخبر في MatchApp Ai →',
      attribution: 'يربط MatchApp Ai بالناشر الأصلي دون إعادة نشر نصوص المقالات. تشير التواريخ إلى وقت النشر لدى الناشر أو إلى وقت اكتشاف محدد بوضوح.',
      moreNews: 'المزيد من أخبار الترفيه والعالم والرياضة', backHome: 'العودة إلى MatchApp Ai',
      sourceNote: 'خبر من {source}. افتح التقرير الأصلي للاطلاع على السياق الكامل والتحديثات.', kidsMode: 'وضع الأطفال', kidsOpen: 'فتح وضع الأطفال'
    },
    hi: {
      brandHome: 'MatchApp Ai का होम पेज', backLatest: '← MatchApp Ai — ताज़ा खबरें',
      hubTitle: 'मनोरंजन, दुनिया और खेल की ताज़ा खबरें',
      hubIntro: "मनोरंजन, दुनिया और खेल के शीर्षक अलग-अलग देखें। तारीखें प्रकाशक की हैं; फ़ीड जाँचने से पुरानी खबर नई नहीं हो जाती। इंटरफ़ेस की भाषा चुनें; शीर्षक स्रोत की भाषा में रहते हैं।",
      howTitle: 'MatchApp Ai की खबरें कैसे काम करती हैं',
      howIntro: "पहले श्रेणी और तारीख देखें। तूफ़ान या चुनाव दुनिया की खबर है, मनोरंजन पुरस्कार नहीं। एल्बम, कलाकारों या प्रीमियर की घोषणा खोज का संकेत है; समीक्षा या उपलब्धता का प्रमाण नहीं।",
      howSources: "फ़िल्म चुनने से पहले अपने देश के विकल्प देखें: रिलीज़ की घोषणा का अर्थ सदस्यता में शामिल होना नहीं है। कॉन्सर्ट या एल्बम की तारीख और उपलब्धता कलाकार या आयोजन स्थल से जाँचें। रिपोर्ट और सुधार के लिए बताए गए प्रकाशक को खोलें।",
      exploreLead: 'खबरों में शामिल फ़िल्में, सीरीज़ और नई रिलीज़ खोजें:', matcher: 'मनोरंजन खोजें', askAi: 'MatchApp Ai से पूछें', whereWatch: 'कहाँ देखें',
      guideChoice: "पूरी शाम के लिए अक्टूबर गाइड फ़िल्म, संगीत और किताबों की तुलना ज़रूरी समय और ध्यान के आधार पर करती है। Roma गाइड बताती है कि देश, भाषा, किराया और सदस्यता चुनाव को कैसे बदलते हैं।", romaGuide: "Roma: देश और देखने के विकल्पों की गाइड",
      guidesLead: 'और गाइड व खोजें:', octoberGuide: 'अक्टूबर 2026 की स्ट्रीमिंग, संगीत और किताबों की गाइड', septemberGuide: '30 सितंबर के रुझानों की गाइड', anime: 'ऐनिमे खोजें',
      feedLabel: 'मूल स्रोतों के साथ मनोरंजन, दुनिया और खेल की ताज़ा सुर्खियाँ', latest: 'ताज़ा खबरें',
      eventEntertainment: 'मनोरंजन', eventObituary: 'स्मृति में', eventCasting: 'कलाकारों का चयन', eventMusic: 'संगीत', eventRelease: 'नई रिलीज़', eventAwards: 'पुरस्कार', eventSports: 'खेल', eventWorld: 'दुनिया',
      openLatest: 'ताज़ा खबरों में खोलें →', sourceLink: 'मूल स्रोत ↗', verifiedSource: 'सत्यापित स्रोत:', published: 'मूल प्रकाशन:', discovered: 'खबर की खोज में पहली बार दर्ज:',
      readAt: '{source} पर मूल रिपोर्ट पढ़ें ↗', openStory: 'यह खबर MatchApp Ai में खोलें →',
      attribution: 'MatchApp Ai लेखों का पूरा पाठ दोबारा प्रकाशित किए बिना मूल प्रकाशक से जोड़ता है। तारीखें प्रकाशक का प्रकाशन समय या स्पष्ट रूप से बताया गया खोज का समय दिखाती हैं।',
      moreNews: 'मनोरंजन, दुनिया और खेल की और खबरें', backHome: 'MatchApp Ai पर वापस जाएँ',
      sourceNote: '{source} की रिपोर्ट। पूरा संदर्भ और अपडेट जानने के लिए मूल रिपोर्ट खोलें।', kidsMode: 'बच्चों का मोड', kidsOpen: 'बच्चों का मोड खोलें'
    },
    id: {
      brandHome: 'Beranda MatchApp Ai', backLatest: '← MatchApp Ai — Berita terbaru',
      hubTitle: 'Berita hiburan, dunia, dan olahraga terbaru',
      hubIntro: "Jelajahi judul hiburan, dunia, dan olahraga secara terpisah. Tanggal berasal dari penerbit; memeriksa feed tidak membuat berita lama menjadi baru. Pilih bahasa antarmuka; judul tetap dalam bahasa sumber.",
      howTitle: 'Cara kerja berita MatchApp Ai',
      howIntro: "Mulai dari kategori dan tanggal. Badai atau pemilu adalah berita dunia, bukan penghargaan hiburan. Pengumuman album, pemeran, atau pemutaran perdana adalah petunjuk penemuan, bukan ulasan atau bukti ketersediaan.",
      howSources: "Sebelum memilih film, periksa opsi di negara Anda: kabar rilis tidak berarti termasuk dalam langganan. Konfirmasikan tanggal konser atau album kepada artis atau tempat acara. Buka penerbit yang disebutkan untuk laporan dan koreksinya.",
      exploreLead: 'Jelajahi film, serial, dan rilisan di balik berita:', matcher: 'Temukan hiburan', askAi: 'Tanya MatchApp Ai', whereWatch: 'Tempat menonton',
      guideChoice: "Untuk satu malam penuh, panduan Oktober membandingkan film, musik, dan buku berdasarkan waktu dan perhatian. Panduan Roma menjelaskan pengaruh negara, bahasa, sewa, dan langganan.", romaGuide: "Roma: panduan negara dan opsi menonton",
      guidesLead: 'Panduan dan penemuan lainnya:', octoberGuide: 'Panduan streaming, musik, dan buku Oktober 2026', septemberGuide: 'Panduan tren 30 September', anime: 'Cari anime',
      feedLabel: 'Judul berita hiburan, dunia, dan olahraga terbaru beserta sumber asli', latest: 'Berita terbaru',
      eventEntertainment: 'Hiburan', eventObituary: 'Mengenang', eventCasting: 'Pemeran', eventMusic: 'Musik', eventRelease: 'Rilisan', eventAwards: 'Penghargaan', eventSports: 'Olahraga', eventWorld: 'Dunia',
      openLatest: 'Buka di berita terbaru →', sourceLink: 'Sumber asli ↗', verifiedSource: 'Sumber terverifikasi:', published: 'Publikasi asli:', discovered: 'Pertama dicatat dalam penemuan berita:',
      readAt: 'Baca laporan asli di {source} ↗', openStory: 'Buka berita ini di MatchApp Ai →',
      attribution: 'MatchApp Ai menautkan ke penerbit asli tanpa menerbitkan ulang isi artikel. Tanggal menunjukkan waktu publikasi penerbit atau waktu penemuan yang diberi keterangan jelas.',
      moreNews: 'Berita hiburan, dunia, dan olahraga lainnya', backHome: 'Kembali ke MatchApp Ai',
      sourceNote: 'Dilaporkan oleh {source}. Buka laporan asli untuk konteks lengkap dan pembaruan.', kidsMode: 'Mode Anak', kidsOpen: 'Buka Mode Anak'
    },
    ja: {
      brandHome: 'MatchApp Ai ホーム', backLatest: '← MatchApp Ai — 最新ニュース',
      hubTitle: 'エンタメ・世界・スポーツの最新ニュース',
      hubIntro: "エンタメ・世界・スポーツの見出しを分けて表示します。日付は配信元のものです。フィードの確認で古い記事が新しくなることはありません。表示言語を選べますが、見出しは原文のままです。",
      howTitle: 'MatchApp Ai ニュースの仕組み',
      howIntro: "まず分類と日付を確認しましょう。嵐や選挙は世界ニュースであり、エンタメの受賞ではありません。アルバム、配役、公開の発表は発見の手がかりで、レビューや視聴可能の証明ではありません。",
      howSources: "映画を選ぶ前に自分の国の視聴方法を確認してください。公開の発表は契約に含まれることを意味しません。コンサートやアルバムの日程はアーティストや会場で確認し、報道と訂正は配信元で読みましょう。",
      exploreLead: 'ニュースに登場する映画、シリーズ、新作を探しましょう：', matcher: 'エンタメを探す', askAi: 'MatchApp Ai に質問', whereWatch: '視聴できる場所',
      guideChoice: "一晩の計画には、必要な時間と集中力から映画・音楽・本を比較する10月ガイドを。Romaガイドでは国、言語、レンタル、定額契約が選択に与える違いを説明します。", romaGuide: "Roma：国別の視聴方法ガイド",
      guidesLead: 'その他のガイドと作品探し：', octoberGuide: '2026年10月の配信・音楽・書籍ガイド', septemberGuide: '9月30日のトレンドガイド', anime: 'アニメを探す',
      feedLabel: '元の配信元を明記したエンタメ・世界・スポーツの最新見出し', latest: '最新ニュース',
      eventEntertainment: 'エンタメ', eventObituary: '追悼', eventCasting: 'キャスト', eventMusic: '音楽', eventRelease: '新作', eventAwards: '受賞', eventSports: 'スポーツ', eventWorld: '世界',
      openLatest: '最新ニュースで開く →', sourceLink: '元の配信元 ↗', verifiedSource: '確認済みの配信元：', published: '元の記事の公開日：', discovered: 'ニュースとして初めて検出した日時：',
      readAt: '{source} で元の記事を読む ↗', openStory: 'このニュースを MatchApp Ai で開く →',
      attribution: 'MatchApp Ai は記事の本文を転載せず、元の配信元へリンクします。日付は配信元の公開日時、または明記された発見日時を示します。',
      moreNews: 'エンタメ・世界・スポーツのニュースをもっと見る', backHome: 'MatchApp Ai に戻る',
      sourceNote: '{source} の報道です。詳しい背景と更新情報は元の記事をご覧ください。', kidsMode: 'キッズモード', kidsOpen: 'キッズモードを開く'
    },
    ko: {
      brandHome: 'MatchApp Ai 홈', backLatest: '← MatchApp Ai — 최신 뉴스',
      hubTitle: '최신 연예·세계·스포츠 뉴스',
      hubIntro: "연예·세계·스포츠 제목을 구분해 살펴보세요. 날짜는 발행처가 제공하며 피드 확인이 오래된 기사를 새롭게 만들지 않습니다. 표시 언어를 선택해도 제목은 원문을 유지합니다.",
      howTitle: 'MatchApp Ai 뉴스 이용 안내',
      howIntro: "분류와 날짜부터 확인하세요. 폭풍이나 선거는 세계 뉴스이며 연예 시상 소식이 아닙니다. 앨범·출연진·개봉 발표는 발견의 단서이지 리뷰나 이용 가능 증거가 아닙니다.",
      howSources: "영화를 고르기 전에 해당 국가의 시청 옵션을 확인하세요. 개봉 소식이 구독 포함을 뜻하지 않습니다. 공연이나 앨범 일정은 아티스트나 공연장에서 확인하고 보도와 정정은 명시된 발행처에서 읽으세요.",
      exploreLead: '뉴스에 등장하는 영화, 시리즈, 신작을 찾아보세요:', matcher: '취향에 맞는 콘텐츠 찾기', askAi: 'MatchApp Ai에 질문', whereWatch: '시청 가능한 곳',
      guideChoice: "저녁 전체를 계획하려면 시간과 집중도를 기준으로 영화·음악·책을 비교하는 10월 가이드를 보세요. Roma 가이드는 국가·언어·대여·구독이 선택에 미치는 영향을 설명합니다.", romaGuide: "Roma: 국가별 시청 옵션 가이드",
      guidesLead: '더 많은 가이드와 작품 탐색:', octoberGuide: '2026년 10월 스트리밍·음악·도서 가이드', septemberGuide: '9월 30일 트렌드 가이드', anime: '애니메이션 찾기',
      feedLabel: '원 출처가 명시된 최신 연예·세계·스포츠 뉴스 제목', latest: '최신 뉴스',
      eventEntertainment: '연예', eventObituary: '추모', eventCasting: '출연진', eventMusic: '음악', eventRelease: '신작', eventAwards: '시상식', eventSports: '스포츠', eventWorld: '세계',
      openLatest: '최신 뉴스에서 열기 →', sourceLink: '원 출처 ↗', verifiedSource: '확인된 출처:', published: '원문 발행일:', discovered: '뉴스 탐색에서 처음 기록된 시각:',
      readAt: '{source}에서 원문 읽기 ↗', openStory: '이 뉴스를 MatchApp Ai에서 열기 →',
      attribution: 'MatchApp Ai는 기사 본문을 재게시하지 않고 원 발행사로 연결합니다. 날짜는 발행사가 제공한 발행 시각 또는 명확하게 표시된 발견 시각을 나타냅니다.',
      moreNews: '연예·세계·스포츠 뉴스 더 보기', backHome: 'MatchApp Ai로 돌아가기',
      sourceNote: '{source}의 보도입니다. 전체 배경과 업데이트는 원문에서 확인하세요.', kidsMode: '키즈 모드', kidsOpen: '키즈 모드 열기'
    },
    zh: {
      brandHome: 'MatchApp Ai 首页', backLatest: '← MatchApp Ai — 最新新闻',
      hubTitle: '最新娱乐、国际与体育新闻',
      hubIntro: "分别浏览娱乐、国际与体育标题。日期来自发布方；检查信息流不会让旧报道变成新消息。可选择界面语言，标题保留来源语言。",
      howTitle: 'MatchApp Ai 新闻如何运作',
      howIntro: "先看分类与日期。风暴或选举属于国际新闻，并非娱乐奖项。专辑、选角或首映公告是发现线索，不是评论，也不能证明你可以观看。",
      howSources: "选电影前请确认所在国家的观看方式：上映公告不代表已包含在订阅中。演唱会或专辑日期应向艺人或场地方确认。完整报道及更正请查看署名发布方。",
      exploreLead: '探索新闻背后的电影、剧集与新作：', matcher: '寻找合适的娱乐内容', askAi: '询问 MatchApp Ai', whereWatch: '在哪里观看',
      guideChoice: "若规划整晚，十月指南按所需时间与注意力比较电影、音乐和图书。Roma指南解释国家、语言、租赁及订阅方式如何影响选择。", romaGuide: "Roma：国家与观看方式指南",
      guidesLead: '更多指南与探索：', octoberGuide: '2026年10月流媒体、音乐与图书指南', septemberGuide: '9月30日趋势指南', anime: '查找动漫',
      feedLabel: '附有原始来源的最新娱乐、国际与体育新闻标题', latest: '最新新闻',
      eventEntertainment: '娱乐', eventObituary: '缅怀', eventCasting: '演员阵容', eventMusic: '音乐', eventRelease: '新作', eventAwards: '奖项', eventSports: '体育', eventWorld: '国际',
      openLatest: '在最新新闻中打开 →', sourceLink: '原始来源 ↗', verifiedSource: '已核实的来源：', published: '原始发布日期：', discovered: '新闻发现中的首次收录时间：',
      readAt: '在 {source} 阅读原始报道 ↗', openStory: '在 MatchApp Ai 中打开此新闻 →',
      attribution: 'MatchApp Ai 链接至原发布方，不转载文章正文。日期表示发布方提供的发布时间，或明确标注的发现时间。',
      moreNews: '更多娱乐、国际与体育新闻', backHome: '返回 MatchApp Ai',
      sourceNote: '由 {source} 报道。打开原始报道，了解完整背景与最新进展。', kidsMode: '儿童模式', kidsOpen: '打开儿童模式'
    }
  };
  const LANGUAGES = Object.freeze(Object.keys(COPY));
  const KEYS = Object.freeze(Object.keys(COPY.en));
  for (const catalog of Object.values(COPY)) Object.freeze(catalog);
  Object.freeze(COPY);
  function normalizeLanguage(value) {
    const code = String(value || '').replace(/_/g, '-').toLowerCase().split('-')[0];
    return code === 'pt' ? 'pt-BR' : Object.prototype.hasOwnProperty.call(COPY, code) ? code : '';
  }
  function language(win) {
    let saved = '';
    try { saved = win.localStorage.getItem('match_lang') || ''; } catch (_) {}
    return [win.MATCH_LANG, saved, win.document.documentElement.lang].map(normalizeLanguage).find(Boolean) || 'en';
  }
  function text(lang, key, values) {
    const catalog = COPY[normalizeLanguage(lang)];
    const value = catalog && Object.prototype.hasOwnProperty.call(catalog, key) ? catalog[key] : '';
    return value.replace(/\{(source)\}/g, (_, name) => String(values && values[name] != null ? values[name] : ''));
  }
  function putText(node, value) { if (value && node.textContent !== value) node.textContent = value; }
  function putAttribute(node, name, value) { if (value && node.getAttribute(name) !== value) node.setAttribute(name, value); }
  function paint(win) {
    const doc = win.document;
    if (!doc.body?.classList.contains('news-ui-page')) return;
    const lang = language(win);
    putAttribute(doc.documentElement, 'lang', lang);
    putAttribute(doc.documentElement, 'dir', lang === 'ar' ? 'rtl' : 'ltr');
    doc.querySelectorAll('[data-news-ui]').forEach(node => {
      putText(node, text(lang, node.dataset.newsUi, { source: node.dataset.newsSource || '' }));
    });
    doc.querySelectorAll('[data-news-ui-aria]').forEach(node => {
      putAttribute(node, 'aria-label', text(lang, node.dataset.newsUiAria));
    });
    doc.querySelectorAll('[data-news-ui-event]').forEach(node => {
      putText(node, text(lang, 'event' + node.dataset.newsUiEvent));
    });
    doc.querySelectorAll('time[data-news-ui-date]').forEach(node => {
      const raw = node.getAttribute('datetime'), date = new Date(raw);
      if (!Number.isFinite(date.getTime())) return;
      const options = node.dataset.newsUiDate === 'long' ? { dateStyle: 'long' } : {};
      // Migrated hub dates contain only the original displayed calendar day.
      // They must not move a day when the visitor's time zone is west of UTC.
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) options.timeZone = 'UTC';
      putText(node, new Intl.DateTimeFormat(lang, options).format(date));
    });
    const kids = doc.querySelector('header.ma-news-header #matchapp-kids-entry');
    if (kids) {
      const label = kids.querySelector('span');
      if (label) putText(label, text(lang, 'kidsMode'));
      putAttribute(kids, 'aria-label', text(lang, 'kidsOpen'));
      putAttribute(kids, 'title', text(lang, 'kidsMode'));
      putAttribute(kids, 'lang', lang);
      putAttribute(kids, 'dir', lang === 'ar' ? 'rtl' : 'ltr');
    }
  }
  function init(win) {
    const doc = win.document;
    if (win.__matchappNewsUIStarted || !/^\/news(?:\/|$)/.test(win.location.pathname)) return;
    const start = () => {
      if (win.__matchappNewsUIStarted || !doc.body?.classList.contains('news-ui-page')) return;
      win.__matchappNewsUIStarted = true;
      paint(win);
      for (const name of ['matchapp:langchange', 'matchapp:languagechange']) doc.addEventListener(name, () => paint(win));
      win.addEventListener('storage', event => { if (event.key === 'match_lang') paint(win); });
      // build-meta adds this existing navigation link after the News template.
      // Observe only the header's child list; do not watch article/ad mutations.
      const header = doc.querySelector('header.ma-news-header');
      if (header && typeof win.MutationObserver === 'function') {
        const observer = new win.MutationObserver(records => {
          if (records.some(record => Array.from(record.addedNodes).some(node => node.nodeType === 1 && (node.id === 'matchapp-kids-entry' || node.querySelector?.('#matchapp-kids-entry'))))) paint(win);
        });
        observer.observe(header, { childList: true, subtree: true });
      }
    };
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  }
  return Object.freeze({ languages: LANGUAGES, keys: KEYS, normalizeLanguage, language, text, paint, init });
});
