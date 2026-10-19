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
      hubIntro: 'Entertainment and world news refresh hourly; sports links update twice daily. Choose your interface language while original headlines keep the publisher’s language. Open the source for the full story.',
      howTitle: 'How MatchApp Ai News works',
      howIntro: 'Browse headlines from named publishers. Each item keeps its original source link and publication or discovery date. MatchApp Ai does not republish full articles.',
      howSources: 'Stories come from publisher feeds. Filters remove unrelated stories and obvious rumors. The original publisher remains responsible for each report; MatchApp Ai helps you discover it.',
      exploreLead: 'Explore the films, series and releases behind the news:', matcher: 'Entertainment matcher', askAi: 'Ask MatchApp Ai', whereWatch: 'Where to watch',
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
      hubIntro: 'As notícias de entretenimento e do mundo são atualizadas a cada hora; os links de esportes, duas vezes ao dia. Escolha o idioma da interface; as manchetes mantêm o idioma da fonte. Abra a fonte para ler a reportagem completa.',
      howTitle: 'Como funcionam as notícias do MatchApp Ai',
      howIntro: 'Explore manchetes de veículos identificados. Cada notícia mantém o link original e a data de publicação ou descoberta. O MatchApp Ai não republica reportagens completas.',
      howSources: 'As notícias vêm dos feeds dos veículos. Filtros removem assuntos sem relação e rumores evidentes. O veículo original continua responsável por cada reportagem; o MatchApp Ai ajuda você a encontrá-la.',
      exploreLead: 'Explore os filmes, as séries e os lançamentos por trás das notícias:', matcher: 'Encontre o que assistir', askAi: 'Pergunte ao MatchApp Ai', whereWatch: 'Onde assistir',
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
      hubIntro: 'Las noticias de entretenimiento y del mundo se actualizan cada hora; los enlaces deportivos, dos veces al día. Elige el idioma de la interfaz; los titulares conservan el idioma del medio. Abre la fuente para leer la noticia completa.',
      howTitle: 'Cómo funcionan las noticias de MatchApp Ai',
      howIntro: 'Explora titulares de medios identificados. Cada noticia conserva su enlace original y su fecha de publicación o descubrimiento. MatchApp Ai no republica artículos completos.',
      howSources: 'Las noticias proceden de los canales de los medios. Los filtros eliminan temas ajenos y rumores evidentes. El medio original sigue siendo responsable de cada noticia; MatchApp Ai te ayuda a descubrirla.',
      exploreLead: 'Explora las películas, series y estrenos detrás de las noticias:', matcher: 'Encuentra entretenimiento', askAi: 'Pregunta a MatchApp Ai', whereWatch: 'Dónde ver',
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
      hubIntro: 'Les actualités culturelles et mondiales sont actualisées chaque heure ; les liens sportifs, deux fois par jour. Choisissez la langue de l’interface ; les titres restent dans la langue du média. Ouvrez la source pour lire l’article complet.',
      howTitle: 'Comment fonctionnent les actualités de MatchApp Ai',
      howIntro: 'Parcourez les titres de médias clairement identifiés. Chaque actualité conserve son lien original et sa date de publication ou de découverte. MatchApp Ai ne republie pas les articles complets.',
      howSources: 'Les actualités proviennent des flux des médias. Des filtres retirent les sujets sans rapport et les rumeurs évidentes. Le média original reste responsable de chaque article ; MatchApp Ai vous aide à le découvrir.',
      exploreLead: 'Explorez les films, séries et sorties qui font l’actualité :', matcher: 'Trouvez quoi regarder', askAi: 'Demandez à MatchApp Ai', whereWatch: 'Où regarder',
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
      hubIntro: 'Unterhaltungs- und Weltnachrichten werden stündlich aktualisiert, Sportlinks zweimal täglich. Wähle deine Sprache für die Oberfläche; Überschriften behalten die Sprache des Verlags. Öffne die Quelle für den vollständigen Bericht.',
      howTitle: 'So funktionieren die Nachrichten von MatchApp Ai',
      howIntro: 'Entdecke Schlagzeilen namentlich genannter Medien. Jeder Eintrag behält den Original-Link sowie das Veröffentlichungs- oder Entdeckungsdatum. MatchApp Ai veröffentlicht keine vollständigen Artikel erneut.',
      howSources: 'Die Nachrichten stammen aus den Feeds der Medien. Filter entfernen themenfremde Meldungen und offensichtliche Gerüchte. Das ursprüngliche Medium bleibt für seinen Bericht verantwortlich; MatchApp Ai hilft dir, ihn zu entdecken.',
      exploreLead: 'Entdecke Filme, Serien und Neuerscheinungen hinter den Nachrichten:', matcher: 'Unterhaltung finden', askAi: 'MatchApp Ai fragen', whereWatch: 'Wo ansehen',
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
      hubIntro: 'Le notizie di spettacolo e dal mondo si aggiornano ogni ora; i link sportivi, due volte al giorno. Scegli la lingua dell’interfaccia; i titoli mantengono quella della fonte. Apri la fonte per leggere la notizia completa.',
      howTitle: 'Come funzionano le notizie di MatchApp Ai',
      howIntro: 'Esplora i titoli di testate chiaramente identificate. Ogni notizia conserva il link originale e la data di pubblicazione o scoperta. MatchApp Ai non ripubblica articoli completi.',
      howSources: 'Le notizie provengono dai feed delle testate. I filtri eliminano contenuti non pertinenti e voci evidenti. La testata originale resta responsabile di ogni articolo; MatchApp Ai ti aiuta a scoprirlo.',
      exploreLead: 'Esplora i film, le serie e le uscite dietro le notizie:', matcher: 'Trova cosa guardare', askAi: 'Chiedi a MatchApp Ai', whereWatch: 'Dove guardare',
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
      hubIntro: 'Eğlence ve dünya haberleri saat başı, spor bağlantıları günde iki kez güncellenir. Arayüz dilinizi seçin; özgün başlıklar yayıncının dilinde kalır. Haberin tamamı için kaynağı açın.',
      howTitle: 'MatchApp Ai haberleri nasıl çalışır?',
      howIntro: 'Adı belirtilen yayıncıların başlıklarına göz atın. Her haber özgün bağlantısını ve yayın ya da keşif tarihini korur. MatchApp Ai makalelerin tamamını yeniden yayımlamaz.',
      howSources: 'Haberler yayıncıların akışlarından gelir. Filtreler ilgisiz haberleri ve belirgin söylentileri kaldırır. Her haberin sorumluluğu özgün yayıncıya aittir; MatchApp Ai onu keşfetmenize yardımcı olur.',
      exploreLead: 'Haberlerin ardındaki filmleri, dizileri ve yeni yapımları keşfedin:', matcher: 'İzleyecek bir şey bul', askAi: 'MatchApp Ai’a sor', whereWatch: 'Nerede izlenir',
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
      hubIntro: 'Новости развлечений и мира обновляются каждый час, спортивные ссылки — дважды в день. Выберите язык интерфейса; заголовки сохраняют язык издателя. Откройте источник, чтобы прочитать полный материал.',
      howTitle: 'Как работают новости MatchApp Ai',
      howIntro: 'Читайте заголовки из названных изданий. Каждая новость сохраняет исходную ссылку и дату публикации или обнаружения. MatchApp Ai не перепечатывает статьи целиком.',
      howSources: 'Новости поступают из лент издателей. Фильтры удаляют посторонние темы и явные слухи. За каждый материал отвечает исходное издание; MatchApp Ai помогает его найти.',
      exploreLead: 'Откройте фильмы, сериалы и новинки, о которых говорят в новостях:', matcher: 'Подобрать развлечение', askAi: 'Спросить MatchApp Ai', whereWatch: 'Где смотреть',
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
      hubIntro: 'تُحدَّث أخبار الترفيه والعالم كل ساعة، وروابط الرياضة مرتين يوميًا. اختر لغة الواجهة؛ وتبقى العناوين الأصلية بلغة الناشر. افتح المصدر لقراءة الخبر كاملًا.',
      howTitle: 'كيف تعمل أخبار MatchApp Ai',
      howIntro: 'تصفّح عناوين من ناشرين محددين بالاسم. يحتفظ كل خبر برابطه الأصلي وتاريخ نشره أو اكتشافه. لا يعيد MatchApp Ai نشر المقالات كاملة.',
      howSources: 'تأتي الأخبار من خلاصات الناشرين. تستبعد المرشحات الأخبار غير المرتبطة والشائعات الواضحة. يبقى الناشر الأصلي مسؤولًا عن كل تقرير؛ ويساعدك MatchApp Ai على اكتشافه.',
      exploreLead: 'اكتشف الأفلام والمسلسلات والإصدارات التي تتناولها الأخبار:', matcher: 'اعثر على ما يناسبك', askAi: 'اسأل MatchApp Ai', whereWatch: 'أين تشاهد',
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
      hubIntro: 'मनोरंजन और दुनिया की खबरें हर घंटे, और खेल के लिंक दिन में दो बार अपडेट होते हैं। इंटरफ़ेस की भाषा चुनें; मूल सुर्खियाँ प्रकाशक की भाषा में रहती हैं। पूरी खबर के लिए स्रोत खोलें।',
      howTitle: 'MatchApp Ai की खबरें कैसे काम करती हैं',
      howIntro: 'स्पष्ट रूप से पहचाने गए प्रकाशकों की सुर्खियाँ देखें। हर खबर में मूल लिंक और प्रकाशन या खोज की तारीख बनी रहती है। MatchApp Ai पूरे लेख दोबारा प्रकाशित नहीं करता।',
      howSources: 'खबरें प्रकाशकों की फ़ीड से आती हैं। फ़िल्टर असंबंधित खबरें और स्पष्ट अफ़वाहें हटाते हैं। हर रिपोर्ट की ज़िम्मेदारी मूल प्रकाशक की रहती है; MatchApp Ai उसे खोजने में मदद करता है।',
      exploreLead: 'खबरों में शामिल फ़िल्में, सीरीज़ और नई रिलीज़ खोजें:', matcher: 'मनोरंजन खोजें', askAi: 'MatchApp Ai से पूछें', whereWatch: 'कहाँ देखें',
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
      hubIntro: 'Berita hiburan dan dunia diperbarui setiap jam; tautan olahraga dua kali sehari. Pilih bahasa antarmuka; judul asli tetap menggunakan bahasa penerbit. Buka sumber untuk membaca berita lengkap.',
      howTitle: 'Cara kerja berita MatchApp Ai',
      howIntro: 'Jelajahi judul berita dari penerbit yang disebutkan dengan jelas. Setiap berita mempertahankan tautan asli serta tanggal publikasi atau penemuan. MatchApp Ai tidak menerbitkan ulang artikel lengkap.',
      howSources: 'Berita berasal dari umpan penerbit. Filter menghapus berita yang tidak relevan dan rumor yang jelas. Penerbit asli tetap bertanggung jawab atas setiap laporan; MatchApp Ai membantu Anda menemukannya.',
      exploreLead: 'Jelajahi film, serial, dan rilisan di balik berita:', matcher: 'Temukan hiburan', askAi: 'Tanya MatchApp Ai', whereWatch: 'Tempat menonton',
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
      hubIntro: 'エンタメと世界のニュースは毎時、スポーツのリンクは1日2回更新されます。画面の表示言語を選べますが、元の見出しは配信元の言語を保ちます。全文は配信元でご覧ください。',
      howTitle: 'MatchApp Ai ニュースの仕組み',
      howIntro: '配信元が明記された見出しを閲覧できます。各ニュースには元のリンクと公開日または発見日が保持されます。MatchApp Ai は記事の全文を転載しません。',
      howSources: 'ニュースは配信元のフィードから取得します。無関係な記事や明らかな噂はフィルターで除きます。各報道の責任は元の配信元にあり、MatchApp Ai は発見をお手伝いします。',
      exploreLead: 'ニュースに登場する映画、シリーズ、新作を探しましょう：', matcher: 'エンタメを探す', askAi: 'MatchApp Ai に質問', whereWatch: '視聴できる場所',
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
      hubIntro: '연예와 세계 뉴스는 매시간, 스포츠 링크는 하루 두 번 업데이트됩니다. 화면 언어를 선택해도 원래 제목은 발행사의 언어로 유지됩니다. 전체 기사는 원문에서 확인하세요.',
      howTitle: 'MatchApp Ai 뉴스 이용 안내',
      howIntro: '발행사가 명시된 뉴스 제목을 살펴보세요. 각 뉴스는 원문 링크와 발행일 또는 발견일을 유지합니다. MatchApp Ai는 기사 전문을 재게시하지 않습니다.',
      howSources: '뉴스는 발행사의 피드에서 가져옵니다. 필터는 무관한 기사와 명백한 소문을 제외합니다. 각 보도에 대한 책임은 원 발행사에 있으며, MatchApp Ai는 뉴스를 찾도록 돕습니다.',
      exploreLead: '뉴스에 등장하는 영화, 시리즈, 신작을 찾아보세요:', matcher: '취향에 맞는 콘텐츠 찾기', askAi: 'MatchApp Ai에 질문', whereWatch: '시청 가능한 곳',
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
      hubIntro: '娱乐和国际新闻每小时更新，体育链接每天更新两次。你可以选择界面语言，原始标题仍保留发布方的语言。打开来源即可阅读完整报道。',
      howTitle: 'MatchApp Ai 新闻如何运作',
      howIntro: '浏览明确标注发布方的新闻标题。每条新闻保留原始链接及发布日期或发现日期。MatchApp Ai 不转载完整文章。',
      howSources: '新闻来自发布方的信息源。筛选机制会移除无关内容和明显传闻。原发布方对每篇报道负责，MatchApp Ai 帮助你发现它们。',
      exploreLead: '探索新闻背后的电影、剧集与新作：', matcher: '寻找合适的娱乐内容', askAi: '询问 MatchApp Ai', whereWatch: '在哪里观看',
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
