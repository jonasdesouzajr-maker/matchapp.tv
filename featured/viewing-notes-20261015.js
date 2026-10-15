/* Original viewing guidance for two existing title guides. No rankings or reviews are implied. */
(function () {
'use strict';
const copy = {
en: {
 heading:'How to decide before you press play', check:'Check the edition and viewing offer', note:'Original MatchApp Ai viewing guidance · 15 October 2026. This is selection advice, not a review based on watching every episode.',
 ahs:[
 'Choose American Horror Story: 13 when you actively want unsettling horror and a continuing series. For a relaxed group evening, ask everyone about their tolerance for disturbing material first. A familiar actor or a popular trailer does not make a horror season a suitable choice for the whole group.',
 'Use FX’s season-specific cast and episode pages to orient yourself. Returning performers can play different characters, so recognize the character name as well as the actor. Read the episode description before starting midway; a season number alone does not tell you whether the story relies on earlier installments.',
 'On the destination service, select season 13 of American Horror Story, not the separate American Horror Stories series. Check the episodes actually available, local age guidance, audio and subtitles. FX and Hulu information describes the U.S. offer; a regional Disney+ listing must be checked separately before subscribing.'
 ],
 agata:[
 'A Gata Comeu suits a viewer looking for a long romantic comedy-drama with recurring characters. The island situation brings Jô and Fábio together, but choose the novela for the developing relationships rather than expecting a short survival thriller. Starting at the first chapter makes the changing relationships easier to follow.',
 'Memória Globo is useful for character and production context; Globoplay is the place to check the current viewing offer. These sources answer different questions. An archive entry can confirm who made the novela without confirming that a subscription in your country includes every chapter.',
 'Match the title with the 1985 production and Ivani Ribeiro before opening a playlist or buying access. Check chapter order, language, accessibility options and the age classification displayed by your local service. For a short evening, try one chapter first and decide whether its pace fits your routine; do not treat the full series as a single movie-length commitment.'
 ]},
'pt-BR':{heading:'Como decidir antes de assistir',check:'Confira a edição e a oferta',note:'Orientação original do MatchApp Ai · 15 de outubro de 2026. São sugestões de escolha, não uma crítica baseada em assistir a todos os episódios.',ahs:[
 'Escolha American Horror Story: 13 quando quiser terror inquietante e uma série para acompanhar. Para uma noite tranquila em grupo, converse antes sobre a tolerância de cada pessoa a temas perturbadores. Um ator conhecido ou trailer popular não torna uma temporada de terror adequada para todo mundo.',
 'Consulte as páginas de elenco e episódios da temporada no FX. Atores que retornam podem interpretar personagens diferentes; confira o nome do personagem, além do intérprete. Leia a descrição antes de começar no meio: o número da temporada não informa sozinho se a história depende de capítulos anteriores.',
 'No serviço escolhido, selecione a temporada 13 de American Horror Story, não a série distinta American Horror Stories. Confira os episódios disponíveis, a classificação etária local, o áudio e as legendas. As informações de FX e Hulu descrevem a oferta dos EUA; confira separadamente a oferta regional do Disney+ antes de assinar.'
 ],agata:[
 'A Gata Comeu combina com quem procura uma comédia romântica com drama, personagens recorrentes e uma história longa. A situação na ilha aproxima Jô e Fábio, mas escolha a novela pelas relações que se desenvolvem, sem esperar um suspense curto de sobrevivência. Começar pelo primeiro capítulo ajuda a acompanhar essas mudanças.',
 'A Memória Globo oferece contexto sobre personagens e produção; o Globoplay permite conferir a oferta atual. Essas fontes respondem a perguntas diferentes. Um registro de acervo pode confirmar a autoria sem garantir que uma assinatura no seu país inclua todos os capítulos.',
 'Confira o título, a produção de 1985 e Ivani Ribeiro antes de abrir uma playlist ou pagar pelo acesso. Verifique a ordem dos capítulos, o idioma, os recursos de acessibilidade e a classificação etária local. Se tiver pouco tempo, experimente um capítulo e avalie se o ritmo cabe na sua rotina; a novela inteira não equivale ao compromisso de um filme.'
 ]},
es:{heading:'Cómo decidir antes de reproducir',check:'Comprueba la edición y la oferta',note:'Orientación original de MatchApp Ai · 15 de octubre de 2026. Son consejos de selección, no una crítica basada en ver todos los episodios.',ahs:[
 'Elige American Horror Story: 13 si buscas terror inquietante y una serie para seguir. Para una noche relajada en grupo, pregunta primero qué temas perturbadores tolera cada persona. Un actor conocido o un tráiler popular no convierte una temporada de terror en una elección adecuada para todos.',
 'Consulta las páginas de reparto y episodios de esa temporada en FX. Los intérpretes que regresan pueden encarnar personajes diferentes: comprueba también sus nombres. Lee la descripción antes de empezar a mitad de temporada; el número no indica por sí solo si necesitas conocer entregas anteriores.',
 'Selecciona la temporada 13 de American Horror Story, no la serie distinta American Horror Stories. Revisa episodios disponibles, clasificación local, audio y subtítulos. FX y Hulu describen la oferta estadounidense; comprueba por separado la disponibilidad regional de Disney+ antes de suscribirte.'
 ],agata:[
 'A Gata Comeu puede encajar si buscas una comedia romántica dramática larga con personajes recurrentes. La isla acerca a Jô y Fábio, pero elige la novela por sus relaciones, sin esperar un breve thriller de supervivencia. Empezar por el primer capítulo facilita seguir su evolución.',
 'Memória Globo aporta contexto de personajes y producción; Globoplay permite comprobar la oferta actual. Son preguntas diferentes: una ficha de archivo puede confirmar la autoría sin garantizar que tu suscripción nacional incluya todos los capítulos.',
 'Comprueba el título, la producción de 1985 e Ivani Ribeiro antes de abrir una lista o pagar. Revisa el orden de capítulos, idioma, accesibilidad y clasificación local. Si tienes poco tiempo, prueba un capítulo y decide si el ritmo encaja en tu rutina; la novela completa exige más tiempo que una película.'
 ]},
fr:{heading:'Choisir avant de lancer la lecture',check:'Vérifier la version et l’offre',note:'Conseils originaux de MatchApp Ai · 15 octobre 2026. Il s’agit d’une aide au choix, pas d’une critique fondée sur le visionnage de tous les épisodes.',ahs:[
 'Choisissez American Horror Story: 13 si vous recherchez une horreur dérangeante et une série à suivre. Pour une soirée détendue en groupe, discutez d’abord de la sensibilité de chacun aux thèmes éprouvants. Un acteur connu ou une bande-annonce populaire ne rend pas cette saison adaptée à tout le monde.',
 'Consultez les pages FX consacrées à la distribution et aux épisodes de cette saison. Un interprète qui revient peut jouer un autre personnage : vérifiez les deux noms. Lisez le résumé avant de commencer en cours de saison ; son numéro ne précise pas si les saisons précédentes sont nécessaires.',
 'Sélectionnez la saison 13 d’American Horror Story, et non la série distincte American Horror Stories. Vérifiez les épisodes proposés, la classification locale, les langues et les sous-titres. Les indications FX et Hulu concernent les États-Unis ; vérifiez séparément l’offre régionale de Disney+ avant de vous abonner.'
 ],agata:[
 'A Gata Comeu convient si vous cherchez une longue comédie romantique dramatique avec des personnages récurrents. L’île rapproche Jô et Fábio, mais choisissez ce feuilleton pour ses relations, sans attendre un court thriller de survie. Commencer au premier chapitre aide à suivre leur évolution.',
 'Memória Globo apporte le contexte des personnages et de la production ; Globoplay renseigne sur l’offre actuelle. Ce sont deux questions différentes : une archive confirme l’auteur sans garantir que votre abonnement local donne accès à tous les chapitres.',
 'Vérifiez le titre, la production de 1985 et Ivani Ribeiro avant d’ouvrir une liste ou de payer. Contrôlez l’ordre des chapitres, les langues, l’accessibilité et la classification locale. Pour une soirée courte, essayez un chapitre et voyez si son rythme vous convient ; l’ensemble demande plus de temps qu’un film.'
 ]},
de:{heading:'Vor dem Start die passende Wahl treffen',check:'Fassung und Angebot prüfen',note:'Eigene Auswahlhilfe von MatchApp Ai · 15. Oktober 2026. Keine Rezension auf Grundlage aller Folgen.',ahs:[
 'American Horror Story: 13 passt, wenn Sie verstörenden Horror und eine fortlaufende Serie suchen. Besprechen Sie für einen entspannten Gruppenabend zuerst, welche belastenden Themen alle vertragen. Ein bekannter Darsteller oder beliebter Trailer macht eine Horrorstaffel nicht für jede Person passend.',
 'Nutzen Sie die Besetzungs- und Episodenseiten der jeweiligen Staffel bei FX. Wiederkehrende Darsteller können andere Figuren spielen; prüfen Sie daher beide Namen. Lesen Sie vor einem Einstieg mitten in der Staffel die Beschreibung. Die Staffelnummer allein verrät nicht, ob frühere Geschichten vorausgesetzt werden.',
 'Wählen Sie Staffel 13 von American Horror Story, nicht die eigenständige Serie American Horror Stories. Prüfen Sie verfügbare Folgen, lokale Altersfreigabe, Ton und Untertitel. Angaben zu FX und Hulu gelten für die USA; das regionale Disney+-Angebot ist vor einem Abonnement gesondert zu prüfen.'
 ],agata:[
 'A Gata Comeu passt zu einer langen romantischen Komödie mit Drama und wiederkehrenden Figuren. Die Inselsituation bringt Jô und Fábio zusammen; im Mittelpunkt Ihrer Auswahl sollten die Beziehungen stehen, kein kurzer Überlebensthriller. Der erste Abschnitt erleichtert den Einstieg in ihre Entwicklung.',
 'Memória Globo liefert Figuren- und Produktionskontext; bei Globoplay prüfen Sie das aktuelle Angebot. Ein Archiveintrag kann die Urheberschaft bestätigen, ohne zu garantieren, dass Ihr Landesabonnement alle Kapitel enthält.',
 'Gleichen Sie Titel, Produktionsjahr 1985 und Ivani Ribeiro ab, bevor Sie eine Liste öffnen oder bezahlen. Prüfen Sie Kapitelreihenfolge, Sprache, Barrierefreiheit und lokale Altersfreigabe. Probieren Sie bei wenig Zeit ein Kapitel aus und beurteilen Sie den Rhythmus; die ganze Serie ist zeitlich kein einzelner Film.'
 ]},
it:{heading:'Come scegliere prima di iniziare',check:'Verifica la versione e l’offerta',note:'Consigli originali di MatchApp Ai · 15 ottobre 2026. Guida alla scelta, non una recensione basata sulla visione di tutti gli episodi.',ahs:[
 'Scegli American Horror Story: 13 se cerchi horror inquietante e una serie da seguire. Per una serata rilassata in gruppo, chiarisci prima la tolleranza di tutti verso temi disturbanti. Un attore familiare o un trailer popolare non rendono una stagione horror adatta a chiunque.',
 'Consulta le pagine FX di cast ed episodi della stagione. Un interprete che ritorna può avere un ruolo diverso: controlla anche il nome del personaggio. Leggi la descrizione prima di iniziare a metà; il numero della stagione non indica da solo se occorre conoscere quelle precedenti.',
 'Seleziona la stagione 13 di American Horror Story, non la serie distinta American Horror Stories. Controlla episodi disponibili, classificazione locale, audio e sottotitoli. FX e Hulu descrivono l’offerta statunitense; verifica separatamente l’offerta regionale Disney+ prima di abbonarti.'
 ],agata:[
 'A Gata Comeu si adatta a chi cerca una lunga commedia romantica con elementi drammatici e personaggi ricorrenti. L’isola avvicina Jô e Fábio, ma scegli la novela per le relazioni, senza aspettarti un breve thriller di sopravvivenza. Partire dal primo capitolo aiuta a seguirne l’evoluzione.',
 'Memória Globo offre contesto su personaggi e produzione; Globoplay permette di verificare l’offerta attuale. Una scheda d’archivio può confermare l’autrice senza garantire che l’abbonamento nel tuo Paese includa tutti i capitoli.',
 'Verifica titolo, produzione del 1985 e Ivani Ribeiro prima di aprire una playlist o pagare. Controlla ordine dei capitoli, lingua, accessibilità e classificazione locale. Se hai poco tempo, prova un capitolo e valuta il ritmo; l’intera serie richiede un impegno diverso da un film.'
 ]},
tr:{heading:'Oynatmadan önce nasıl karar verilir?',check:'Sürümü ve izleme teklifini kontrol edin',note:'MatchApp Ai özgün izleme rehberi · 15 Ekim 2026. Tüm bölümleri izlemeye dayalı bir eleştiri değil, seçim önerisidir.',ahs:[
 'Rahatsız edici korku ve takip edeceğiniz bir dizi istiyorsanız American Horror Story: 13’ü değerlendirin. Rahat bir grup akşamı için önce herkesin zorlayıcı konulara yaklaşımını konuşun. Tanıdık bir oyuncu veya popüler bir fragman, korku sezonunu herkese uygun yapmaz.',
 'FX’in ilgili sezona ait oyuncu ve bölüm sayfalarına bakın. Geri dönen oyuncular farklı karakterleri canlandırabilir; karakter adını da kontrol edin. Ortadan başlamadan önce bölüm açıklamasını okuyun. Sezon numarası tek başına önceki hikâyeleri bilmeniz gerekip gerekmediğini göstermez.',
 'American Horror Stories adlı ayrı diziyi değil, American Horror Story’nin 13. sezonunu seçin. Mevcut bölümleri, yerel yaş sınıflandırmasını, sesi ve altyazıları kontrol edin. FX ve Hulu bilgileri ABD teklifini anlatır; abonelikten önce bölgenizdeki Disney+ teklifini ayrıca doğrulayın.'
 ],agata:[
 'A Gata Comeu, tekrar eden karakterleri olan uzun bir romantik komedi-dram arayanlara uygundur. Ada koşulları Jô ve Fábio’yu yakınlaştırır; ancak kısa bir hayatta kalma gerilimi beklemek yerine gelişen ilişkiler için seçin. İlk bölümden başlamak değişimleri takip etmeyi kolaylaştırır.',
 'Memória Globo karakter ve yapım bağlamını, Globoplay ise güncel izleme teklifini araştırmak için kullanılır. Arşiv kaydı yazarı doğrulayabilir, fakat ülkenizdeki aboneliğin tüm bölümleri içerdiğini garanti etmez.',
 'Bir liste açmadan veya ödeme yapmadan önce adı, 1985 yapım yılını ve Ivani Ribeiro’yu eşleştirin. Bölüm sırasını, dili, erişilebilirliği ve yerel yaş sınıfını kontrol edin. Zamanınız azsa bir bölüm deneyip temposunu değerlendirin; dizinin tamamı tek filmlik bir zaman taahhüdü değildir.'
 ]},
ru:{heading:'Как выбрать перед просмотром',check:'Проверьте версию и условия просмотра',note:'Собственные рекомендации MatchApp Ai · 15 октября 2026 года. Помощь в выборе, а не рецензия на основе просмотра всех серий.',ahs:[
 'Выбирайте American Horror Story: 13, если хотите тревожный хоррор и сериал, за которым будете следить. Для спокойного вечера в компании сначала обсудите отношение всех к тяжёлым темам. Знакомый актёр или популярный трейлер не делают сезон подходящим каждому.',
 'Ориентируйтесь по страницам актёров и эпизодов этого сезона на FX. Вернувшийся исполнитель может играть другую роль: проверяйте также имя персонажа. Прежде чем начать с середины, прочитайте описание. Номер сезона сам по себе не показывает, нужно ли знать прежние истории.',
 'Выберите сезон 13 American Horror Story, а не отдельный сериал American Horror Stories. Проверьте доступные эпизоды, местную возрастную категорию, озвучку и субтитры. Данные FX и Hulu относятся к США; региональное предложение Disney+ проверяйте отдельно до оплаты.'
 ],agata:[
 'A Gata Comeu подойдёт для долгой романтической комедийной драмы с постоянными героями. Остров сближает Жо и Фабиу, но выбирайте теленовеллу ради отношений, не ожидая короткого триллера о выживании. Начало с первой главы помогает следить за переменами.',
 'Memória Globo даёт сведения о героях и производстве, а Globoplay позволяет проверить текущее предложение. Архив может подтвердить авторство, но не гарантирует доступ ко всем главам по подписке в вашей стране.',
 'Перед открытием списка или оплатой сверяйте название, 1985 год и имя Ivani Ribeiro. Проверьте порядок глав, язык, доступность специальных возможностей и местную возрастную категорию. Если времени мало, попробуйте одну главу и оцените темп; весь сериал требует больше времени, чем один фильм.'
 ]},
ar:{heading:'كيف تختار قبل بدء المشاهدة',check:'تحقق من النسخة وخيار المشاهدة',note:'إرشادات أصلية من MatchApp Ai · 15 أكتوبر 2026. نصائح للاختيار، وليست مراجعة مبنية على مشاهدة جميع الحلقات.',ahs:[
 'اختر American Horror Story: 13 عندما ترغب في رعب مقلق ومسلسل تتابعه. لأمسية هادئة مع مجموعة، ناقش أولًا مدى تقبّل الجميع للموضوعات المزعجة. وجود ممثل مألوف أو إعلان شائع لا يجعل موسم الرعب مناسبًا لكل شخص.',
 'استعن بصفحات FX الخاصة بممثلي هذا الموسم وحلقاته. قد يعود الممثل بشخصية مختلفة، لذا تحقق من اسم الشخصية أيضًا. اقرأ وصف الحلقة قبل البدء من منتصف الموسم؛ رقمه وحده لا يوضح إن كانت القصة تحتاج إلى معرفة الأجزاء السابقة.',
 'اختر الموسم 13 من American Horror Story، وليس المسلسل المنفصل American Horror Stories. تحقق من الحلقات المتاحة والتصنيف العمري المحلي والصوت والترجمة. معلومات FX وHulu تخص العرض الأمريكي؛ تحقق منفصلًا من عرض Disney+ في منطقتك قبل الاشتراك.'
 ],agata:[
 'يناسب A Gata Comeu من يبحث عن دراما كوميدية رومانسية طويلة بشخصيات متكررة. تقرّب الجزيرة بين Jô وFábio، لكن اختر المسلسل لتطور العلاقات، دون توقع فيلم تشويق قصير عن النجاة. البدء من الحلقة الأولى يسهّل متابعة التغيرات.',
 'توفر Memória Globo سياق الشخصيات والإنتاج، بينما يُستخدم Globoplay للتحقق من عرض المشاهدة الحالي. قد يثبت سجل الأرشيف هوية المؤلفة دون أن يضمن أن اشتراك بلدك يشمل جميع الحلقات.',
 'طابق العنوان مع إنتاج 1985 وIvani Ribeiro قبل فتح قائمة أو الدفع. تحقق من ترتيب الحلقات واللغة وميزات إمكانية الوصول والتصنيف المحلي. إذا كان وقتك قصيرًا، جرّب حلقة وقيّم الإيقاع؛ متابعة المسلسل كله تختلف عن الالتزام بمدة فيلم واحد.'
 ]},
hi:{heading:'देखना शुरू करने से पहले कैसे चुनें',check:'संस्करण और उपलब्धता जाँचें',note:'MatchApp Ai की मौलिक देखने की सलाह · 15 अक्टूबर 2026। यह चुनाव में मदद है, सभी एपिसोड देखकर लिखी गई समीक्षा नहीं।',ahs:[
 'American Horror Story: 13 तब चुनें जब आप बेचैन करने वाला हॉरर और लगातार देखने के लिए सीरीज़ चाहते हों। समूह में आराम से शाम बिताने से पहले पूछें कि परेशान करने वाले विषयों से सब कितने सहज हैं। जाना-पहचाना कलाकार या लोकप्रिय ट्रेलर किसी हॉरर सीज़न को सभी के लिए उपयुक्त नहीं बनाता।',
 'FX पर इस सीज़न के कलाकारों और एपिसोड के पेज देखें। लौटने वाला कलाकार अलग किरदार निभा सकता है, इसलिए किरदार का नाम भी जाँचें। बीच से शुरू करने से पहले विवरण पढ़ें; केवल सीज़न संख्या से पता नहीं चलता कि पिछली कहानियाँ जानना आवश्यक है या नहीं।',
 'American Horror Story का सीज़न 13 चुनें, अलग सीरीज़ American Horror Stories नहीं। उपलब्ध एपिसोड, स्थानीय आयु वर्गीकरण, ऑडियो और सबटाइटल जाँचें। FX और Hulu की जानकारी अमेरिकी सेवा के लिए है; सदस्यता से पहले अपने क्षेत्र का Disney+ विकल्प अलग से जाँचें।'
 ],agata:[
 'A Gata Comeu उन दर्शकों के लिए है जो बार-बार आने वाले पात्रों वाली लंबी रोमांटिक कॉमेडी-ड्रामा चाहते हैं। द्वीप की स्थिति Jô और Fábio को करीब लाती है, लेकिन इसे रिश्तों के विकास के लिए चुनें, छोटी सर्वाइवल थ्रिलर की उम्मीद में नहीं। पहले अध्याय से शुरू करने पर बदलाव समझना आसान होता है।',
 'Memória Globo पात्रों और निर्माण की पृष्ठभूमि बताता है; Globoplay पर वर्तमान देखने की सुविधा जाँचें। अभिलेख लेखिका की पुष्टि कर सकता है, लेकिन यह नहीं कि आपके देश की सदस्यता में सभी अध्याय शामिल हैं।',
 'प्लेलिस्ट खोलने या भुगतान से पहले शीर्षक, 1985 के निर्माण और Ivani Ribeiro का मिलान करें। अध्याय क्रम, भाषा, सुलभता और स्थानीय आयु वर्गीकरण जाँचें। समय कम हो तो एक अध्याय आज़माकर गति परखें; पूरी सीरीज़ एक फ़िल्म जितने समय की नहीं है।'
 ]},
id:{heading:'Memilih sebelum mulai menonton',check:'Periksa versi dan penawarannya',note:'Panduan menonton orisinal MatchApp Ai · 15 Oktober 2026. Saran memilih, bukan ulasan berdasarkan menonton seluruh episode.',ahs:[
 'Pilih American Horror Story: 13 jika Anda memang mencari horor yang meresahkan dan serial untuk diikuti. Untuk malam santai bersama, tanyakan dahulu toleransi setiap orang terhadap materi mengganggu. Aktor terkenal atau trailer populer tidak membuat musim horor cocok bagi semua orang.',
 'Gunakan halaman pemeran dan episode musim tersebut di FX. Pemeran yang kembali bisa memainkan karakter lain; periksa nama karakternya juga. Baca deskripsi sebelum mulai di tengah musim. Nomor musim saja tidak menjelaskan apakah cerita memerlukan pengetahuan tentang bagian sebelumnya.',
 'Pilih musim 13 American Horror Story, bukan serial terpisah American Horror Stories. Periksa episode tersedia, klasifikasi usia lokal, audio dan takarir. Informasi FX dan Hulu menjelaskan penawaran AS; periksa penawaran regional Disney+ secara terpisah sebelum berlangganan.'
 ],agata:[
 'A Gata Comeu cocok jika Anda mencari drama komedi romantis panjang dengan karakter yang terus muncul. Situasi di pulau mendekatkan Jô dan Fábio, tetapi pilih novela ini untuk perkembangan hubungan, bukan mengharapkan thriller bertahan hidup yang singkat. Memulai dari bab pertama memudahkan mengikuti perubahannya.',
 'Memória Globo memberi konteks karakter dan produksi; Globoplay membantu memeriksa penawaran saat ini. Catatan arsip dapat memastikan penulisnya tanpa menjamin langganan di negara Anda mencakup semua bab.',
 'Cocokkan judul dengan produksi tahun 1985 dan Ivani Ribeiro sebelum membuka daftar atau membayar. Periksa urutan bab, bahasa, aksesibilitas dan klasifikasi lokal. Jika waktu terbatas, coba satu bab dan nilai temponya; menonton seluruh serial berbeda dari komitmen satu film.'
 ]},
ja:{heading:'再生前に選び方を考える',check:'作品の版と視聴条件を確認',note:'MatchApp Ai独自の視聴ガイド · 2026年10月15日。全話を鑑賞した批評ではなく、作品選びのための助言です。',ahs:[
 '不穏なホラーを求め、続けて見るシリーズを探すならAmerican Horror Story: 13を検討してください。グループで気楽に過ごしたい場合は、刺激の強い題材への許容度を先に話し合いましょう。有名な俳優や人気の予告編だけで、全員に向くとは限りません。',
 'FXの当該シーズンのキャスト・エピソードページを参考にしてください。同じ俳優が別の役を演じることもあるので、役名も確認しましょう。途中から見る前にエピソードの説明を読み、以前の物語を知る必要があるかを確認してください。シーズン番号だけでは判断できません。',
 '別作品のAmerican Horror Storiesではなく、American Horror Storyのシーズン13を選んでください。配信話数、地域の年齢区分、音声、字幕を確認しましょう。FXとHuluの案内は米国の提供条件です。Disney+の地域別配信は契約前に別途確認してください。'
 ],agata:[
 'A Gata Comeuは、同じ人物たちを長く追うロマンティック・コメディドラマを探す人向けです。島での状況がJôとFábioを近づけますが、短いサバイバル・スリラーを期待せず、人間関係の発展を楽しむ作品として選びましょう。第1話から見ると変化を追いやすくなります。',
 'Memória Globoでは人物や制作の背景、Globoplayでは現在の視聴条件を確認できます。資料で作者が確認できても、自国の契約で全話見られる保証にはなりません。',
 'リストを開いたり支払ったりする前に、1985年制作、Ivani Ribeiro、作品名を照合してください。話数の順序、言語、アクセシビリティ、地域の年齢区分も確認しましょう。時間が少なければ1話試して、ペースが生活に合うか判断してください。全話の視聴は映画1本とは異なる時間が必要です。'
 ]},
ko:{heading:'재생 전에 선택하는 방법',check:'작품 버전과 시청 조건 확인',note:'MatchApp Ai의 독자적인 시청 안내 · 2026년 10월 15일. 모든 회차를 본 리뷰가 아닌 선택을 위한 조언입니다.',ahs:[
 '불안감을 주는 공포와 계속 따라갈 시리즈를 원한다면 American Horror Story: 13을 고려하세요. 함께 편안한 저녁을 보내려면 먼저 각자가 불편한 소재를 얼마나 받아들일 수 있는지 이야기하세요. 익숙한 배우나 인기 예고편만으로 공포 시즌이 모두에게 적합해지지는 않습니다.',
 'FX의 해당 시즌 출연진과 에피소드 페이지를 확인하세요. 돌아온 배우가 다른 인물을 연기할 수 있으므로 배역 이름도 살펴보세요. 중간부터 보기 전에 설명을 읽으세요. 시즌 번호만으로 이전 이야기를 알아야 하는지 판단할 수는 없습니다.',
 '별도 시리즈 American Horror Stories가 아닌 American Horror Story 시즌 13을 선택하세요. 제공 회차, 현지 연령 등급, 음성과 자막을 확인하세요. FX와 Hulu 안내는 미국 서비스에 해당하므로 지역별 Disney+ 제공 여부는 가입 전에 따로 확인해야 합니다.'
 ],agata:[
 'A Gata Comeu는 반복해서 등장하는 인물들과 긴 로맨틱 코미디 드라마를 원하는 시청자에게 맞습니다. 섬의 상황이 Jô와 Fábio를 가깝게 하지만, 짧은 생존 스릴러보다 관계의 발전을 기대하며 선택하세요. 첫 회부터 시작하면 변화를 따라가기 쉽습니다.',
 'Memória Globo는 인물과 제작 배경을, Globoplay는 현재 시청 조건을 확인하는 데 유용합니다. 기록으로 작가를 확인할 수 있어도 자국 구독으로 모든 회차를 볼 수 있다는 보장은 아닙니다.',
 '목록을 열거나 결제하기 전에 작품명, 1985년 제작, Ivani Ribeiro를 대조하세요. 회차 순서, 언어, 접근성 기능과 현지 등급을 확인하세요. 시간이 짧다면 한 회를 보고 속도가 생활에 맞는지 판단하세요. 전체 시리즈 시청은 영화 한 편과 다른 시간 투자가 필요합니다.'
 ]},
zh:{heading:'播放前如何选择',check:'核对版本和观看条件',note:'MatchApp Ai 原创观看指南 · 2026年10月15日。这是选片建议，并非观看全部剧集后撰写的影评。',ahs:[
 '如果你想看令人不安的恐怖作品，并愿意持续追剧，可以考虑 American Horror Story: 13。若想和朋友轻松度过一晚，先讨论每个人对刺激性题材的接受程度。熟悉的演员或热门预告片并不意味着恐怖季适合所有人。',
 '参考 FX 上这一季的演员和分集页面。回归演员可能饰演不同人物，因此也要核对角色名。从中间开始观看前，请先读分集简介。仅凭季数，无法判断故事是否需要了解此前的内容。',
 '请选择 American Horror Story 第13季，而非另一部剧 American Horror Stories。检查实际可看的集数、当地年龄分级、音轨及字幕。FX 和 Hulu 信息针对美国服务；订阅前应另外核实当地 Disney+ 的供应情况。'
 ],agata:[
 '如果你想看有固定人物、篇幅较长的浪漫喜剧剧情连续剧，A Gata Comeu 是可考虑的选择。岛上的处境让 Jô 和 Fábio 走近，但应期待人物关系的发展，而非短篇生存惊悚片。从第一章开始，更容易理解关系的变化。',
 'Memória Globo 适合了解人物和制作背景，Globoplay 则用于核对目前的观看条件。档案可以证实作者身份，却不能保证你所在国家的订阅包含全部章节。',
 '打开播放列表或付费前，请核对作品名、1985年制作版本与 Ivani Ribeiro。检查章节顺序、语言、无障碍功能和当地年龄分级。时间不多时，可以先看一章，判断节奏是否适合你的日常安排；完整连续剧所需时间与一部电影不同。'
 ]}
};
function apply() {
 const host=document.querySelector('[data-viewing-notes]');
 if(!host)return;
 let raw=window.MATCH_LANG||document.documentElement.lang||'en';
 try{raw=localStorage.getItem('match_lang')||raw}catch(_){}
 raw=String(raw).toLowerCase().replace(/_/g,'-');
 const key=raw.startsWith('pt')?'pt-BR':raw.split('-')[0];
 const row=copy[key]||copy.en;
 host.lang=copy[key]?key:'en';host.dir=key==='ar'?'rtl':'ltr';
 host.querySelectorAll('[data-viewing-copy]').forEach(el=>{
  const field=el.getAttribute('data-viewing-copy');
  el.textContent=/^[0-2]$/.test(field)?row[host.getAttribute('data-viewing-notes')][Number(field)]:row[field];
 });
}
if(typeof module!=='undefined')module.exports=copy;
if(typeof document==='undefined')return;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
document.addEventListener('matchapp:langchange',apply);
})();
