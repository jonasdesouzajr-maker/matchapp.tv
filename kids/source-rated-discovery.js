/* Bounded source-rated family discovery, separate from the manually reviewed
 * Kids LIBRARY. Verified source metadata is required before ANY card renders.
 * Never enable a language model to approve age bands or fake watch links. */
(function(){
 'use strict';
 const agePolicy=window.MatchAppKidsAgePolicy;
 const section=document.getElementById('kids-family-expansion');
 if(!section||!agePolicy)return;
 const input=document.getElementById('kids-family-search');
 const kindSel=document.getElementById('kids-family-format');
 const load=document.getElementById('kids-family-more');
 const search=document.getElementById('kids-family-find');
 const status=document.getElementById('kids-family-status');
 const grid=document.getElementById('kids-family-grid');
 const ageSel=document.getElementById('kids-age');
 if(!input||!kindSel||!load||!search||!status||!grid||!ageSel)return;
 const PAGE_BATCH=3,DETAIL_BATCH=3,MAX_CHECKS_PER_CLICK=18,MAX_SHOWN=48;
 const pendingCandidates=[],pendingIds=new Set();
 let nextPage=1,busy=false,version=0;
 const seen=new Set(),verified=new Map(),detailCache=new Map();
 const locale=()=>String(window.MATCH_LANG||document.getElementById('kids-lang')?.value||'en');
 // UI copy only: source verification and the editorial catalogue remain separate.
 const SOURCE_COPY = {
  "en": {
    "idle": "Select Explore to load source-rated titles.",
    "explore": "Explore more verified ratings",
    "coverUnavailable": "A cover was unavailable; that title was hidden.",
    "badge": "Source-rated",
    "caution": "Not individually reviewed by MatchApp Ai KIDS. Ask a grown-up to check this title and each episode. Ratings and availability vary by country.",
    "details": "Check original title details ↗",
    "watch": "Regional viewing guide ↗",
    "catalogUnavailable": "The catalog is unavailable at the moment. Existing Kids picks still work.",
    "titleFirst": "Type an exact movie or series title first.",
    "checkingTitle": "Checking this title’s original classification…",
    "checkingMore": "Checking original ratings and artwork before showing titles…",
    "found": "{count} new source-rated title(s) checked for this age group. A grown-up should review each title.",
    "none": "No additional titles passed every age, identity and artwork check. Try more pages or an exact title.",
    "unavailable": "The source is unavailable. Your approved Kids library is unaffected.",
    "heading": "More source-rated family discoveries",
    "verify": "Verify exact title",
    "lead": "Explore more real, age-classified family movies and shows. Original source identity, rating, family genres and official poster are checked before a title appears. Source-rated discoveries are not individually reviewed by MatchApp Ai KIDS; ask a grown-up to check each title and episode.",
    "note": "Unrated and ambiguous titles never appear. This source-rated shelf is separate from the editorial Kids matcher, Ask AI and saved favorites. This product uses the TMDB API but is not endorsed or certified by TMDB.",
    "formatLabel": "Family discovery format",
    "searchLabel": "Verify a specific family title",
    "placeholder": "Enter the exact movie or show title",
    "eyebrow": "Family discovery",
    "formatsAll": "Movies and shows",
    "movies": "Movies",
    "shows": "Shows",
    "gridLabel": "Exact identity and age-verified source-rated family discoveries"
  },
  "pt-BR": {
    "idle": "Selecione Explorar para buscar títulos classificados.",
    "explore": "Explorar mais classificações verificadas",
    "coverUnavailable": "Uma capa indisponível foi ocultada.",
    "badge": "Classificação de fonte",
    "caution": "Ainda não revisado individualmente pelo MatchApp Ai KIDS. Peça a um responsável para avaliar o título e cada episódio. Classificações e disponibilidade variam por país.",
    "details": "Verificar título na fonte ↗",
    "watch": "Guia de exibição regional ↗",
    "catalogUnavailable": "O catálogo está indisponível. A coleção Kids existente continua funcionando.",
    "titleFirst": "Digite o título exato do filme ou série.",
    "checkingTitle": "Verificando a classificação original…",
    "checkingMore": "Verificando classificação e capas reais antes de exibir títulos…",
    "found": "{count} novo(s) título(s) classificado(s) para esta faixa etária. Um responsável deve revisar cada título.",
    "none": "Nenhum novo título passou todas as verificações. Explore mais páginas ou busque um título exato.",
    "unavailable": "A fonte está indisponível. A coleção Kids aprovada não foi alterada.",
    "heading": "Mais descobertas familiares com classificação",
    "verify": "Verificar título exato",
    "lead": "Descubra mais filmes e séries familiares classificados por idade. Verificamos título, classificação, gêneros familiares e capa oficial antes de exibir cada obra. Essas descobertas não foram revisadas individualmente pelo MatchApp Ai KIDS; peça a um responsável para avaliar cada título e episódio.",
    "note": "Títulos sem classificação ou ambíguos não são exibidos. Esta lista é separada do mecanismo de combinações, do Ask AI e dos favoritos Kids. Este produto utiliza a API TMDB, mas não é endossado nem certificado pelo TMDB.",
    "formatLabel": "Formato de descoberta familiar",
    "searchLabel": "Verificar título familiar específico",
    "placeholder": "Digite o título exato do filme ou série",
    "eyebrow": "Descobertas em família",
    "formatsAll": "Filmes e séries",
    "movies": "Filmes",
    "shows": "Séries",
    "gridLabel": "Descobertas familiares com identidade e classificação etária verificadas"
  },
  "es": {
    "idle": "Selecciona Explorar para buscar títulos clasificados.",
    "explore": "Explorar más clasificaciones verificadas",
    "coverUnavailable": "Una portada no disponible se ocultó.",
    "badge": "Clasificación de fuente",
    "caution": "MatchApp Ai KIDS no lo ha revisado individualmente. Pide a un adulto que revise el título y cada episodio. Las clasificaciones y la disponibilidad varían por país.",
    "details": "Consultar el título original ↗",
    "watch": "Guía regional para verlo ↗",
    "catalogUnavailable": "El catálogo no está disponible. La colección Kids habitual sigue funcionando.",
    "titleFirst": "Escribe el título exacto primero.",
    "checkingTitle": "Comprobando la clasificación original…",
    "checkingMore": "Comprobando clasificaciones y portadas reales antes de mostrar títulos…",
    "found": "{count} títulos clasificados nuevos para esta edad. Un adulto debe revisar cada título.",
    "none": "Ningún título nuevo superó todas las verificaciones. Explora más páginas o busca un título exacto.",
    "unavailable": "La fuente no está disponible. La colección Kids aprobada sigue intacta.",
    "heading": "Más descubrimientos familiares clasificados",
    "verify": "Verificar título exacto",
    "lead": "Descubre más películas y series familiares clasificadas por edad. Se verifican identidad, clasificación, géneros y portada oficial antes de mostrar cada obra. MatchApp Ai KIDS no ha revisado cada título individualmente; pide a un adulto que compruebe cada título y episodio.",
    "note": "No se muestran títulos sin clasificación o ambiguos. Esta selección no modifica las recomendaciones, Ask AI ni los favoritos infantiles. Este producto utiliza la API TMDB, pero no cuenta con su respaldo o certificación.",
    "formatLabel": "Formato de descubrimiento familiar",
    "searchLabel": "Verificar un título familiar concreto",
    "placeholder": "Escribe el título exacto de película o serie",
    "eyebrow": "Descubrimientos en familia",
    "formatsAll": "Películas y series",
    "movies": "Películas",
    "shows": "Series",
    "gridLabel": "Descubrimientos familiares con identidad y clasificación por edad verificadas"
  },
  "fr": {
    "idle": "Choisissez Explorer pour charger les titres classés par les sources.",
    "explore": "Explorer d’autres classifications vérifiées",
    "coverUnavailable": "Une affiche était indisponible ; ce titre a été masqué.",
    "badge": "Classé par la source",
    "caution": "Non examiné individuellement par MatchApp Ai KIDS. Demandez à un adulte de vérifier chaque titre et épisode. Classifications et disponibilité varient selon le pays.",
    "details": "Vérifier les détails du titre original ↗",
    "watch": "Guide de visionnage régional ↗",
    "catalogUnavailable": "Le catalogue est momentanément indisponible. Les choix Kids existants fonctionnent toujours.",
    "titleFirst": "Saisissez d’abord le titre exact du film ou de la série.",
    "checkingTitle": "Vérification de la classification originale…",
    "checkingMore": "Vérification des classifications originales et des affiches…",
    "found": "{count} nouveau(x) titre(s) classé(s) vérifié(s) pour cet âge. Un adulte doit examiner chaque titre.",
    "none": "Aucun titre supplémentaire n’a passé tous les contrôles d’âge, d’identité et d’affiche. Explorez d’autres pages ou un titre exact.",
    "unavailable": "La source est indisponible. Votre bibliothèque Kids approuvée reste intacte.",
    "heading": "D’autres découvertes familiales classées",
    "verify": "Vérifier le titre exact",
    "lead": "Découvrez d’autres films et séries familiaux classés par âge. Identité originale, classification, genres familiaux et affiche officielle sont vérifiés avant affichage. Ces découvertes ne sont pas examinées individuellement par MatchApp Ai KIDS : demandez à un adulte de vérifier chaque titre et épisode.",
    "note": "Les titres non classés ou ambigus restent exclus. Cette sélection est séparée du moteur Kids éditorial, d’Ask AI et des favoris. Ce produit utilise l’API TMDB, mais n’est ni approuvé ni certifié par TMDB.",
    "formatLabel": "Format des découvertes familiales",
    "searchLabel": "Vérifier un titre familial précis",
    "placeholder": "Saisissez le titre exact du film ou de la série",
    "eyebrow": "Découvertes en famille",
    "formatsAll": "Films et séries",
    "movies": "Films",
    "shows": "Séries",
    "gridLabel": "Découvertes familiales vérifiées : identité exacte et classification par âge"
  },
  "de": {
    "idle": "Wähle Entdecken, um von Quellen eingestufte Titel zu laden.",
    "explore": "Weitere geprüfte Einstufungen entdecken",
    "coverUnavailable": "Ein Plakat war nicht verfügbar; der Titel wurde ausgeblendet.",
    "badge": "Von der Quelle eingestuft",
    "caution": "Nicht einzeln von MatchApp Ai KIDS geprüft. Bitte einen Erwachsenen, jeden Titel und jede Folge zu prüfen. Einstufungen und Verfügbarkeit unterscheiden sich je nach Land.",
    "details": "Originalangaben zum Titel prüfen ↗",
    "watch": "Regionaler Streamingführer ↗",
    "catalogUnavailable": "Der Katalog ist derzeit nicht verfügbar. Die vorhandenen Kids-Tipps funktionieren weiterhin.",
    "titleFirst": "Gib zuerst den genauen Film- oder Serientitel ein.",
    "checkingTitle": "Originale Alterseinstufung wird geprüft…",
    "checkingMore": "Originale Einstufungen und Plakate werden geprüft…",
    "found": "{count} neue eingestufte Titel für diese Altersgruppe geprüft. Ein Erwachsener sollte jeden Titel prüfen.",
    "none": "Keine weiteren Titel haben alle Alters-, Identitäts- und Plakatprüfungen bestanden. Versuche weitere Seiten oder einen genauen Titel.",
    "unavailable": "Die Quelle ist nicht verfügbar. Deine freigegebene Kids-Bibliothek bleibt unverändert.",
    "heading": "Weitere eingestufte Familientitel entdecken",
    "verify": "Genauen Titel prüfen",
    "lead": "Entdecke weitere altersklassifizierte Familienfilme und Serien. Originalidentität, Einstufung, Familiengenres und offizielles Plakat werden vor der Anzeige geprüft. Diese Titel werden nicht einzeln von MatchApp Ai KIDS geprüft. Bitte einen Erwachsenen, jeden Titel und jede Folge zu prüfen.",
    "note": "Nicht eingestufte oder mehrdeutige Titel erscheinen nie. Diese Auswahl ist vom redaktionellen Kids-Matcher, Ask AI und Favoriten getrennt. Dieses Produkt nutzt die TMDB-API, wird aber nicht von TMDB unterstützt oder zertifiziert.",
    "formatLabel": "Format der Familientitel",
    "searchLabel": "Einen bestimmten Familientitel prüfen",
    "placeholder": "Genauen Film- oder Serientitel eingeben",
    "eyebrow": "Familientitel entdecken",
    "formatsAll": "Filme und Serien",
    "movies": "Filme",
    "shows": "Serien",
    "gridLabel": "Familientitel mit geprüfter Identität und Alterseinstufung"
  },
  "it": {
    "idle": "Seleziona Esplora per caricare i titoli classificati dalle fonti.",
    "explore": "Esplora altre classificazioni verificate",
    "coverUnavailable": "Una locandina non era disponibile; il titolo è stato nascosto.",
    "badge": "Classificazione della fonte",
    "caution": "Non esaminato singolarmente da MatchApp Ai KIDS. Chiedi a un adulto di controllare ogni titolo ed episodio. Classificazioni e disponibilità variano in base al paese.",
    "details": "Verifica i dettagli del titolo originale ↗",
    "watch": "Guida alla visione nella tua regione ↗",
    "catalogUnavailable": "Il catalogo non è disponibile al momento. I titoli Kids esistenti funzionano ancora.",
    "titleFirst": "Inserisci prima il titolo esatto del film o della serie.",
    "checkingTitle": "Verifica della classificazione originale…",
    "checkingMore": "Verifica delle classificazioni originali e delle locandine…",
    "found": "{count} nuovi titoli classificati verificati per questa età. Un adulto dovrebbe controllare ogni titolo.",
    "none": "Nessun altro titolo ha superato tutti i controlli di età, identità e locandina. Prova altre pagine o un titolo esatto.",
    "unavailable": "La fonte non è disponibile. La tua raccolta Kids approvata resta invariata.",
    "heading": "Altre scoperte per famiglie con classificazione",
    "verify": "Verifica il titolo esatto",
    "lead": "Scopri altri film e serie per famiglie classificati per età. Identità originale, classificazione, generi familiari e locandina ufficiale vengono verificati prima della visualizzazione. Queste scoperte non sono esaminate singolarmente da MatchApp Ai KIDS: chiedi a un adulto di controllare ogni titolo ed episodio.",
    "note": "I titoli senza classificazione o ambigui non compaiono. Questa raccolta è separata dal selettore editoriale Kids, da Ask AI e dai preferiti. Il prodotto usa l’API TMDB, ma non è approvato o certificato da TMDB.",
    "formatLabel": "Formato delle scoperte per famiglie",
    "searchLabel": "Verifica un titolo specifico per famiglie",
    "placeholder": "Inserisci il titolo esatto del film o della serie",
    "eyebrow": "Scoperte per famiglie",
    "formatsAll": "Film e serie",
    "movies": "Film",
    "shows": "Serie",
    "gridLabel": "Scoperte per famiglie con identità esatta e classificazione per età verificate"
  },
  "tr": {
    "idle": "Kaynak sınıflandırmalı yapımları yüklemek için Keşfet’i seç.",
    "explore": "Doğrulanmış başka sınıflandırmaları keşfet",
    "coverUnavailable": "Bir afiş yüklenemedi; o yapım gizlendi.",
    "badge": "Kaynak sınıflandırması",
    "caution": "MatchApp Ai KIDS tarafından tek tek incelenmemiştir. Bir yetişkinden her yapımı ve bölümü kontrol etmesini iste. Sınıflandırmalar ve erişim ülkeye göre değişir.",
    "details": "Orijinal yapım bilgilerini kontrol et ↗",
    "watch": "Bölgesel izleme rehberi ↗",
    "catalogUnavailable": "Katalog şu anda kullanılamıyor. Mevcut Kids önerileri çalışmaya devam eder.",
    "titleFirst": "Önce filmin veya dizinin tam adını yaz.",
    "checkingTitle": "Orijinal yaş sınıflandırması kontrol ediliyor…",
    "checkingMore": "Orijinal sınıflandırmalar ve afişler kontrol ediliyor…",
    "found": "Bu yaş grubu için {count} yeni kaynak sınıflandırmalı yapım kontrol edildi. Bir yetişkin her yapımı incelemelidir.",
    "none": "Başka hiçbir yapım tüm yaş, kimlik ve afiş kontrollerini geçemedi. Başka sayfaları veya tam yapım adını dene.",
    "unavailable": "Kaynağa ulaşılamıyor. Onaylı Kids kütüphanen etkilenmedi.",
    "heading": "Kaynak sınıflandırmalı başka aile keşifleri",
    "verify": "Tam yapım adını doğrula",
    "lead": "Yaşa göre sınıflandırılmış başka aile filmlerini ve dizilerini keşfet. Gösterilmeden önce orijinal kimlik, sınıflandırma, aile türleri ve resmî afiş kontrol edilir. Bu yapımlar MatchApp Ai KIDS tarafından tek tek incelenmemiştir; bir yetişkinden her yapımı ve bölümü kontrol etmesini iste.",
    "note": "Sınıflandırılmamış ve belirsiz yapımlar gösterilmez. Bu bölüm editoryal Kids eşleştiricisinden, Ask AI’dan ve favorilerden ayrıdır. Bu ürün TMDB API’sini kullanır ancak TMDB tarafından onaylanmaz veya sertifikalandırılmaz.",
    "formatLabel": "Aile keşif biçimi",
    "searchLabel": "Belirli bir aile yapımını doğrula",
    "placeholder": "Filmin veya dizinin tam adını gir",
    "eyebrow": "Ailece keşfet",
    "formatsAll": "Filmler ve diziler",
    "movies": "Filmler",
    "shows": "Diziler",
    "gridLabel": "Kimliği ve yaş sınıflandırması doğrulanmış aile yapımları"
  },
  "ru": {
    "idle": "Выбери «Обзор», чтобы загрузить произведения с возрастной классификацией источника.",
    "explore": "Найти другие проверенные возрастные оценки",
    "coverUnavailable": "Постер недоступен; это произведение скрыто.",
    "badge": "Оценка источника",
    "caution": "Не проверено индивидуально командой MatchApp Ai KIDS. Попроси взрослого проверить каждое произведение и серию. Возрастные оценки и доступность зависят от страны.",
    "details": "Проверить оригинальные сведения ↗",
    "watch": "Где смотреть в вашем регионе ↗",
    "catalogUnavailable": "Каталог временно недоступен. Уже одобренные подборки Kids продолжают работать.",
    "titleFirst": "Сначала введи точное название фильма или сериала.",
    "checkingTitle": "Проверяем исходную возрастную классификацию…",
    "checkingMore": "Проверяем исходные возрастные оценки и постеры…",
    "found": "Проверено новых произведений для этого возраста: {count}. Взрослому следует проверить каждое.",
    "none": "Другие произведения не прошли все проверки возраста, идентичности и постера. Попробуй другие страницы или точное название.",
    "unavailable": "Источник недоступен. Одобренная библиотека Kids остаётся без изменений.",
    "heading": "Другие семейные находки с возрастными оценками",
    "verify": "Проверить точное название",
    "lead": "Открой другие семейные фильмы и сериалы с возрастной классификацией. Перед показом проверяются исходная идентичность, возрастная оценка, семейные жанры и официальный постер. MatchApp Ai KIDS не проверяет эти находки индивидуально: попроси взрослого проверить каждое произведение и серию.",
    "note": "Произведения без классификации и неоднозначные совпадения не показываются. Эта подборка отделена от редакционного подбора Kids, Ask AI и избранного. Продукт использует API TMDB, но не одобрен и не сертифицирован TMDB.",
    "formatLabel": "Формат семейных находок",
    "searchLabel": "Проверить конкретное семейное произведение",
    "placeholder": "Введи точное название фильма или сериала",
    "eyebrow": "Семейные находки",
    "formatsAll": "Фильмы и сериалы",
    "movies": "Фильмы",
    "shows": "Сериалы",
    "gridLabel": "Семейные произведения с проверенной идентичностью и возрастной оценкой"
  },
  "ar": {
    "idle": "اختر استكشف لتحميل الأعمال ذات التصنيف الأصلي.",
    "explore": "استكشف المزيد من التصنيفات الموثقة",
    "coverUnavailable": "تعذر تحميل ملصق؛ أُخفي ذلك العمل.",
    "badge": "تصنيف من المصدر",
    "caution": "لم يراجع MatchApp Ai KIDS هذا العمل بشكل فردي. اطلب من شخص بالغ التحقق من كل عمل وحلقة. تختلف التصنيفات وإتاحة المشاهدة حسب البلد.",
    "details": "تحقق من تفاصيل العمل الأصلي ↗",
    "watch": "دليل المشاهدة حسب المنطقة ↗",
    "catalogUnavailable": "الكتالوج غير متاح حاليًا. ما زالت اختيارات Kids المعتمدة تعمل.",
    "titleFirst": "اكتب أولًا الاسم الدقيق للفيلم أو المسلسل.",
    "checkingTitle": "جارٍ التحقق من التصنيف العمري الأصلي…",
    "checkingMore": "جارٍ التحقق من التصنيفات الأصلية والملصقات…",
    "found": "تم التحقق من {count} عمل جديد لهذه الفئة العمرية. ينبغي لشخص بالغ مراجعة كل عمل.",
    "none": "لم تجتز أعمال إضافية جميع فحوص العمر والهوية والملصق. جرّب صفحات أخرى أو اسم عمل دقيقًا.",
    "unavailable": "المصدر غير متاح. مكتبة Kids المعتمدة لم تتأثر.",
    "heading": "المزيد من الاكتشافات العائلية ذات التصنيف الأصلي",
    "verify": "تحقق من الاسم الدقيق",
    "lead": "اكتشف المزيد من الأفلام والمسلسلات العائلية المصنفة عمريًا. نتحقق من هوية العمل الأصلية وتصنيفه وأنواعه العائلية وملصقه الرسمي قبل عرضه. لم يراجع MatchApp Ai KIDS هذه الأعمال بشكل فردي؛ اطلب من شخص بالغ التحقق من كل عمل وحلقة.",
    "note": "لا نعرض الأعمال غير المصنفة أو الملتبسة. هذا القسم مستقل عن اختيارات Kids المحررة وAsk AI والمفضلات. يستخدم هذا المنتج واجهة TMDB البرمجية، لكنه غير معتمد أو مصدّق من TMDB.",
    "formatLabel": "نوع الاكتشافات العائلية",
    "searchLabel": "تحقق من عمل عائلي محدد",
    "placeholder": "أدخل الاسم الدقيق للفيلم أو المسلسل",
    "eyebrow": "اكتشافات عائلية",
    "formatsAll": "أفلام ومسلسلات",
    "movies": "أفلام",
    "shows": "مسلسلات",
    "gridLabel": "اكتشافات عائلية ذات هوية دقيقة وتصنيف عمري موثق"
  },
  "hi": {
    "idle": "स्रोत की आयु रेटिंग वाले शीर्षक लोड करने के लिए खोजें चुनें।",
    "explore": "और सत्यापित आयु रेटिंग खोजें",
    "coverUnavailable": "एक पोस्टर उपलब्ध नहीं था; वह शीर्षक छिपा दिया गया।",
    "badge": "स्रोत की आयु रेटिंग",
    "caution": "MatchApp Ai KIDS ने अलग से इसकी समीक्षा नहीं की है। किसी बड़े से हर शीर्षक और एपिसोड जाँचने को कहें। आयु रेटिंग और उपलब्धता देश के अनुसार बदलती हैं।",
    "details": "मूल शीर्षक की जानकारी जाँचें ↗",
    "watch": "क्षेत्रीय देखने की गाइड ↗",
    "catalogUnavailable": "कैटलॉग अभी उपलब्ध नहीं है। पहले से स्वीकृत Kids सुझाव काम करते रहेंगे।",
    "titleFirst": "पहले फ़िल्म या सीरीज़ का सही पूरा नाम लिखें।",
    "checkingTitle": "मूल आयु रेटिंग जाँची जा रही है…",
    "checkingMore": "मूल आयु रेटिंग और पोस्टर जाँचे जा रहे हैं…",
    "found": "इस आयु वर्ग के लिए {count} नए शीर्षक जाँचे गए। किसी बड़े को हर शीर्षक की समीक्षा करनी चाहिए।",
    "none": "कोई और शीर्षक आयु, पहचान और पोस्टर की सभी जाँचों में सफल नहीं हुआ। अन्य पेज या सही पूरा नाम आज़माएँ।",
    "unavailable": "स्रोत उपलब्ध नहीं है। आपकी स्वीकृत Kids लाइब्रेरी पर कोई असर नहीं पड़ा।",
    "heading": "स्रोत की आयु रेटिंग वाले और पारिवारिक विकल्प",
    "verify": "सही पूरा नाम सत्यापित करें",
    "lead": "आयु के अनुसार वर्गीकृत और पारिवारिक फ़िल्में तथा सीरीज़ खोजें। दिखाने से पहले मूल पहचान, आयु रेटिंग, पारिवारिक शैली और आधिकारिक पोस्टर जाँचे जाते हैं। MatchApp Ai KIDS ने हर विकल्प की अलग से समीक्षा नहीं की है; किसी बड़े से हर शीर्षक और एपिसोड जाँचने को कहें।",
    "note": "बिना आयु रेटिंग या अस्पष्ट पहचान वाले शीर्षक नहीं दिखते। यह सूची संपादकीय Kids चयन, Ask AI और पसंदीदा से अलग है। यह उत्पाद TMDB API का उपयोग करता है, लेकिन TMDB द्वारा अनुमोदित या प्रमाणित नहीं है।",
    "formatLabel": "पारिवारिक विकल्पों का प्रारूप",
    "searchLabel": "किसी खास पारिवारिक शीर्षक को सत्यापित करें",
    "placeholder": "फ़िल्म या सीरीज़ का सही पूरा नाम लिखें",
    "eyebrow": "पारिवारिक खोज",
    "formatsAll": "फ़िल्में और सीरीज़",
    "movies": "फ़िल्में",
    "shows": "सीरीज़",
    "gridLabel": "सही पहचान और आयु रेटिंग वाले सत्यापित पारिवारिक विकल्प"
  },
  "id": {
    "idle": "Pilih Jelajahi untuk memuat judul dengan klasifikasi usia dari sumber.",
    "explore": "Jelajahi klasifikasi terverifikasi lainnya",
    "coverUnavailable": "Sampul tidak tersedia; judul itu disembunyikan.",
    "badge": "Klasifikasi dari sumber",
    "caution": "Belum ditinjau satu per satu oleh MatchApp Ai KIDS. Minta orang dewasa memeriksa setiap judul dan episode. Klasifikasi dan ketersediaan berbeda menurut negara.",
    "details": "Periksa detail judul asli ↗",
    "watch": "Panduan menonton regional ↗",
    "catalogUnavailable": "Katalog sedang tidak tersedia. Pilihan Kids yang ada tetap berfungsi.",
    "titleFirst": "Ketik dahulu judul film atau serial yang tepat.",
    "checkingTitle": "Memeriksa klasifikasi usia asli…",
    "checkingMore": "Memeriksa klasifikasi asli dan poster…",
    "found": "{count} judul baru telah diperiksa untuk kelompok usia ini. Orang dewasa perlu meninjau setiap judul.",
    "none": "Tidak ada judul tambahan yang lolos semua pemeriksaan usia, identitas, dan poster. Coba halaman lain atau judul yang tepat.",
    "unavailable": "Sumber tidak tersedia. Pustaka Kids yang disetujui tidak terpengaruh.",
    "heading": "Penemuan keluarga lain dengan klasifikasi sumber",
    "verify": "Verifikasi judul yang tepat",
    "lead": "Temukan lebih banyak film dan serial keluarga berklasifikasi usia. Identitas asli, klasifikasi, genre keluarga, dan poster resmi diperiksa sebelum ditampilkan. Pilihan ini belum ditinjau satu per satu oleh MatchApp Ai KIDS; minta orang dewasa memeriksa setiap judul dan episode.",
    "note": "Judul tanpa klasifikasi atau dengan identitas ambigu tidak ditampilkan. Daftar ini terpisah dari pemilih editorial Kids, Ask AI, dan favorit. Produk ini memakai API TMDB, tetapi tidak didukung atau disertifikasi oleh TMDB.",
    "formatLabel": "Format penemuan keluarga",
    "searchLabel": "Verifikasi judul keluarga tertentu",
    "placeholder": "Masukkan judul film atau serial yang tepat",
    "eyebrow": "Penemuan keluarga",
    "formatsAll": "Film dan serial",
    "movies": "Film",
    "shows": "Serial",
    "gridLabel": "Penemuan keluarga dengan identitas tepat dan klasifikasi usia terverifikasi"
  },
  "ja": {
    "idle": "「探す」を選ぶと、提供元の年齢区分を確認した作品を読み込みます。",
    "explore": "確認済みの年齢区分をさらに探す",
    "coverUnavailable": "ポスターを読み込めなかったため、その作品を非表示にしました。",
    "badge": "提供元の年齢区分",
    "caution": "MatchApp Aiが個別に審査した作品ではありません。作品と各話を大人に確認してもらいましょう。年齢区分と配信状況は国によって異なります。",
    "details": "原作品の詳細を確認 ↗",
    "watch": "地域別の視聴ガイド ↗",
    "catalogUnavailable": "現在カタログを利用できません。承認済みのKids作品は引き続き利用できます。",
    "titleFirst": "まず映画や番組の正確なタイトルを入力してください。",
    "checkingTitle": "元の年齢区分を確認中…",
    "checkingMore": "元の年齢区分とポスターを確認中…",
    "found": "この年齢向けの新しい作品を{count}件確認しました。各作品を大人に確認してもらいましょう。",
    "none": "年齢・作品の同一性・ポスターのすべての確認を通過する作品はありませんでした。別のページや正確なタイトルを試してください。",
    "unavailable": "提供元を利用できません。承認済みのKidsライブラリには影響しません。",
    "heading": "提供元の年齢区分で探す家族向け作品",
    "verify": "正確なタイトルを確認",
    "lead": "年齢区分のある家族向け映画や番組をさらに探せます。表示前に元の作品情報、年齢区分、家族向けジャンル、公式ポスターを確認します。MatchApp Aiが個別に審査した作品ではないため、作品と各話を大人に確認してもらいましょう。",
    "note": "年齢区分がない作品や同一性が不明確な作品は表示しません。この一覧は編集済みKidsマッチング、Ask AI、お気に入りとは別です。本製品はTMDB APIを使用しますが、TMDBによる推奨や認定を受けていません。",
    "formatLabel": "家族向け作品の種類",
    "searchLabel": "特定の家族向け作品を確認",
    "placeholder": "映画や番組の正確なタイトルを入力",
    "eyebrow": "家族向け作品を探す",
    "formatsAll": "映画と番組",
    "movies": "映画",
    "shows": "番組",
    "gridLabel": "作品の同一性と年齢区分を確認した家族向け作品"
  },
  "ko": {
    "idle": "탐색을 선택하면 출처의 연령 등급을 확인한 작품을 불러와요.",
    "explore": "검증된 연령 등급 더 탐색하기",
    "coverUnavailable": "포스터를 불러올 수 없어 해당 작품을 숨겼어요.",
    "badge": "출처의 연령 등급",
    "caution": "MatchApp Ai가 개별 검토한 작품이 아니에요. 어른에게 각 작품과 에피소드를 확인해 달라고 하세요. 등급과 시청 가능 여부는 국가마다 달라요.",
    "details": "원작 상세 정보 확인 ↗",
    "watch": "지역별 시청 안내 ↗",
    "catalogUnavailable": "현재 카탈로그를 이용할 수 없어요. 기존 Kids 추천은 계속 사용할 수 있어요.",
    "titleFirst": "먼저 영화나 프로그램의 정확한 제목을 입력하세요.",
    "checkingTitle": "원래 연령 등급 확인 중…",
    "checkingMore": "원래 등급과 포스터 확인 중…",
    "found": "이 연령대에 맞는 새 작품 {count}개를 확인했어요. 어른이 각 작품을 검토해야 해요.",
    "none": "연령, 작품 일치, 포스터 검사를 모두 통과한 추가 작품이 없어요. 다른 페이지나 정확한 제목을 시도하세요.",
    "unavailable": "출처를 이용할 수 없어요. 승인된 Kids 라이브러리에는 영향이 없어요.",
    "heading": "출처 등급으로 찾는 더 많은 가족 작품",
    "verify": "정확한 제목 확인",
    "lead": "연령 등급이 있는 가족 영화와 프로그램을 더 찾아보세요. 표시 전에 원작 일치 여부, 등급, 가족 장르와 공식 포스터를 확인해요. MatchApp Ai가 개별 검토한 작품이 아니므로 어른에게 각 작품과 에피소드를 확인해 달라고 하세요.",
    "note": "등급이 없거나 작품 정보가 모호한 경우 표시하지 않아요. 이 목록은 편집된 Kids 매칭, Ask AI, 즐겨찾기와 별개예요. 이 제품은 TMDB API를 사용하지만 TMDB가 보증하거나 인증하지 않았어요.",
    "formatLabel": "가족 작품 형식",
    "searchLabel": "특정 가족 작품 확인",
    "placeholder": "영화나 프로그램의 정확한 제목 입력",
    "eyebrow": "가족 작품 탐색",
    "formatsAll": "영화와 프로그램",
    "movies": "영화",
    "shows": "프로그램",
    "gridLabel": "작품 일치와 연령 등급을 검증한 가족 작품"
  },
  "zh": {
    "idle": "选择探索以加载已核实来源年龄分级的作品。",
    "explore": "探索更多已核实的分级",
    "coverUnavailable": "海报无法加载，因此已隐藏该作品。",
    "badge": "来源分级",
    "caution": "MatchApp Ai KIDS 尚未逐一审核。请让大人检查每部作品及每一集。年龄分级和观看渠道因国家而异。",
    "details": "核对原作品详情 ↗",
    "watch": "地区观看指南 ↗",
    "catalogUnavailable": "目前无法使用目录。现有的 Kids 推荐仍可正常使用。",
    "titleFirst": "请先输入电影或节目的准确名称。",
    "checkingTitle": "正在核实原始年龄分级…",
    "checkingMore": "正在核实原始分级和海报…",
    "found": "已为此年龄组核实 {count} 部新作品。请让大人逐一检查。",
    "none": "没有其他作品通过全部年龄、身份和海报核查。请尝试更多页面或准确名称。",
    "unavailable": "目前无法连接来源。已批准的 Kids 内容库不受影响。",
    "heading": "更多带有来源分级的家庭作品",
    "verify": "核实准确名称",
    "lead": "探索更多按年龄分级的家庭电影和节目。显示前会核实原作品身份、年龄分级、家庭类型及官方海报。MatchApp Ai KIDS 尚未逐一审核这些作品，请让大人检查每部作品及每一集。",
    "note": "没有年龄分级或身份含糊的作品不会显示。此列表与编辑审核的 Kids 匹配、Ask AI 和收藏独立。本产品使用 TMDB API，但未获得 TMDB 的认可或认证。",
    "formatLabel": "家庭作品类型",
    "searchLabel": "核实指定的家庭作品",
    "placeholder": "输入电影或节目的准确名称",
    "eyebrow": "家庭作品探索",
    "formatsAll": "电影和节目",
    "movies": "电影",
    "shows": "节目",
    "gridLabel": "已核实准确身份和年龄分级的家庭作品"
  }
};
 function copy(key,count){const raw=locale(),base=raw.toLowerCase().split('-')[0],language=/^pt/i.test(raw)?'pt-BR':SOURCE_COPY[raw]?raw:base;return (SOURCE_COPY[language]?.[key]||SOURCE_COPY.en[key]||'').replaceAll('{count}',String(count??''))}
 function setStatus(str){status.textContent=str}
 function reset(){
   version++;nextPage=1;seen.clear();verified.clear();pendingCandidates.length=0;pendingIds.clear();grid.replaceChildren();
   setStatus(copy('idle'));
   load.textContent=copy('explore');
 }
 const legalLink=(url)=>{
   try{
     const u=new URL(url);
     return u.protocol==='https:'&&
       (u.hostname==='www.themoviedb.org'||u.hostname==='www.justwatch.com');
   }catch(_){return false}
 };
 function watchGuide(item){
   const region=/^(BR|US)$/.test(String(document.getElementById('kids-watch-region')?.value||''))?
     document.getElementById('kids-watch-region').value:'US';
   const candidate=item.availability?.[region]?.link;
   return legalLink(candidate)?candidate:item.source;
 }
 function card(item){
  if(verified.has(item.identity))return false;
  // Rolling window: the available discovery library can extend over thousands
  // of source candidates without thousands of live DOM nodes or images.
  if(verified.size>=MAX_SHOWN){
    const oldest=verified.keys().next().value;
    verified.delete(oldest);
    grid.firstElementChild?.remove();
  }
  verified.set(item.identity,item);
  const figure=document.createElement('figure');figure.className='kids-source-card';
  figure.dataset.identity=item.identity;
  const wrap=document.createElement('div');wrap.className='kids-source-cover';
  const img=new Image();img.alt=item.title;img.loading='lazy';img.decoding='async';
  img.width=600;img.height=900;
  // Unknown art is never replaced by a wrong-title or text-only poster.
  img.onerror=()=>{img.onerror=null;figure.remove();verified.delete(item.identity);
    setStatus(copy('coverUnavailable'));};
  img.src=item.poster;
  wrap.appendChild(img);figure.appendChild(wrap);
  const body=document.createElement('figcaption');body.className='kids-source-body';
  const badge=document.createElement('span');badge.className='kids-source-badge';
  badge.textContent=copy('badge')+' · '+item.rating;
  const heading=document.createElement('h3');heading.textContent=item.title+' ('+item.year+')';
  const synopsis=document.createElement('p');synopsis.className='kids-source-summary';synopsis.textContent=item.overview;
  const genre=document.createElement('p');genre.className='kids-source-genres';genre.textContent=item.genres.join(' · ');
  const caution=document.createElement('p');caution.className='kids-source-caution';
  caution.textContent=copy('caution');
  const actions=document.createElement('div');actions.className='kids-source-actions';
  const detail=document.createElement('a');detail.href=item.source;
  detail.target='_blank';detail.rel='noopener noreferrer';
  detail.textContent=copy('details');
  detail.setAttribute('aria-label',detail.textContent+': '+item.title);
  actions.append(detail);
  const guide=watchGuide(item);
  if(guide!==item.source){
    const watch=document.createElement('a');watch.href=guide;
    watch.rel='noopener noreferrer';watch.target='_blank';
    watch.textContent=copy('watch');
    watch.setAttribute('aria-label',watch.textContent+': '+item.title);
    actions.append(watch);
  }
  body.append(badge,heading,genre,synopsis,caution,actions);figure.append(body);
  grid.append(figure);
  return true;
 }
 async function safeDetail(candidate,age,token){
   const id=candidate?.tmdbId,kind=candidate?.kind;
   if(!Number.isSafeInteger(id)||!['movie','tv'].includes(kind)||candidate.adult===true)return null;
   const key=kind+':'+id;
   // Cache exact source responses only. Never cache errors or unsafe approvals.
   let detail=detailCache.get(key);
   if(!detail){
    try{detail=await window.tmdbDetails(id,kind);}
    catch(_){return null}
    if(!detail)return null;
    detailCache.set(key,detail);
    if(detailCache.size>180)detailCache.delete(detailCache.keys().next().value);
   }
   if(token!==version)return null;
   return agePolicy.verify(candidate,detail,age);
 }
 async function runFind(exact){
  if(busy)return;
  const token=++version;
  const age=ageSel.value||'all',wanted=kindSel.value||'';
  busy=true;load.disabled=true;search.disabled=true;
  try{
   if(!window.tmdbDetails||!window.tmdbDiscover){
     setStatus(copy('catalogUnavailable'));
     return;
   }
   let candidates=[];
   if(exact){
     const query=input.value.trim().slice(0,90);
     if(query.length<3){setStatus(copy('titleFirst'));return;}
     setStatus(copy('checkingTitle'));
     let hit=null;
     try{hit=await window.tmdbLookup?.(query,{kind:wanted||''});}catch(_){}
     if(hit&&agePolicy.exactRequestedTitle(query,hit))candidates=[hit];
     // A fuzzy nearest-neighbor is not a verified match for a typed exact
     // title. Fail closed, without presenting an unrelated family work.
   }else{
     setStatus(copy('checkingMore'));
     // Keep every sourced identity across taps instead of silently dropping
     // everything beyond the 18 checks in the original first page batch.
     if(!pendingCandidates.length&&nextPage<=500){
       const kinds=wanted?[wanted]:['movie','tv'];
       const pages=await Promise.all(kinds.map(kind=>window.tmdbDiscover({
         kind,genre_ids:kind==='movie'?[10751,16]:[10762,16],
         page_start:nextPage,pages:PAGE_BATCH
       }).catch(()=>[])));
       if(token!==version)return;
       const mixed=[],longest=Math.max(0,...pages.map(p=>Array.isArray(p)?p.length:0));
       for(let n=0;n<longest;n++)for(const page of pages)if(Array.isArray(page)&&page[n])mixed.push(page[n]);
       for(const item of mixed){
         const id=item?.kind+':'+item?.tmdbId;
         if(!item||!['movie','tv'].includes(item.kind)||!Number.isSafeInteger(item.tmdbId)||
           item.adult===true||seen.has(id)||pendingIds.has(id))continue;
         pendingCandidates.push(item);pendingIds.add(id);
       }
       nextPage=Math.min(501,nextPage+PAGE_BATCH);
     }
     candidates=pendingCandidates.splice(0,MAX_CHECKS_PER_CLICK);
     candidates.forEach(item=>pendingIds.delete(item.kind+':'+item.tmdbId));
   }
   if(token!==version)return;
   const current=(Array.isArray(candidates)?candidates:[])
     .filter(c=>c&&c.adult!==true&&['movie','tv'].includes(c.kind)&&Number.isSafeInteger(c.tmdbId))
     .filter(c=>!seen.has(c.kind+':'+c.tmdbId))
     .slice(0,exact?1:MAX_CHECKS_PER_CLICK);
   current.forEach(c=>seen.add(c.kind+':'+c.tmdbId));
   let count=0;
   for(let i=0;i<current.length;i+=DETAIL_BATCH){
      if(token!==version||ageSel.value!==age)break;
      const group=await Promise.all(current.slice(i,i+DETAIL_BATCH).map(c=>safeDetail(c,age,token)));
      for(const item of group){
       if(item&&token===version&&ageSel.value===age&&card(item))count++;
      }
   }
   if(token!==version)return;
   const found=count;
   if(found){
    setStatus(copy('found',found));
   }else{
    setStatus(copy('none'));
   }
   load.hidden=nextPage>499&&!pendingCandidates.length;
  }catch(_){
   if(token===version)setStatus(copy('unavailable'));
  }finally{busy=false;load.disabled=false;search.disabled=false}
 }
 load.addEventListener('click',()=>runFind(false));
 search.addEventListener('click',()=>runFind(true));
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runFind(true)}});
 ageSel.addEventListener('change',reset);
 kindSel.addEventListener('change',reset);
 function localize(){
  const eyebrow=section.querySelector('.kids-eyebrow');if(eyebrow)eyebrow.textContent='✦ '+copy('eyebrow');
  for(const option of kindSel.options)option.textContent=copy(option.value==='movie'?'movies':option.value==='tv'?'shows':'formatsAll');
  grid.setAttribute('aria-label',copy('gridLabel'));
  const heading=document.getElementById('kids-family-heading');
  if(heading)heading.textContent=copy('heading');
  search.textContent=copy('verify');
  const lead=section.querySelector('.kids-source-lead');
  if(lead)lead.textContent=copy('lead');
  const note=section.querySelector('.kids-source-note');
  if(note)note.textContent=copy('note');
  const labels=section.querySelectorAll('.kids-source-controls label');
  if(labels[0])labels[0].firstChild.textContent=copy('formatLabel');
  if(labels[1])labels[1].firstChild.textContent=copy('searchLabel');
  input.placeholder=copy('placeholder');
 }
 document.getElementById('kids-lang')?.addEventListener('change',()=>{localize();reset()});
 // Initialize immediately so a fast click cannot race DOMContentLoaded.
 // Re-localize after Kids boot has restored the saved language; do not erase
 // an in-flight discovery if the document finishes parsing during a lookup.
 localize();reset();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
  localize();if(!busy)reset();
 },{once:true});
})();