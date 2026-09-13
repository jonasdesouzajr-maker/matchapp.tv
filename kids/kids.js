/* ============================================================
   MatchApp Kids
   Safety principle: AI never decides what is allowed. The local curated
   library and the selected age band are the allowlist. AI can rank/recognise
   titles, but a result is discarded unless it already exists in this list.
   ============================================================ */
(function () {
  'use strict';

  const MODE_KEY = 'match_kids_mode';
  const AGE_KEY = 'match_kids_age_band';
  const LANG_KEY = 'match_lang';

  const UI = {
    en: {
      safeBrand:'Safe discovery', exit:'Exit Kids Mode', kicker:'Kids-safe by design', heroA:'Big fun.', heroB:'Small-screen safe.',
      heroText:'Find animation, family movies, learning shows and music without mixing in adult entertainment. Kids Mode uses a conservative allowlist and age bands before anything reaches the screen.',
      safe1:'✓ Age-banded picks', safe2:'✓ No adult titles', safe3:'✓ Safe AI results only', safe4:'✓ Parent-friendly exit',
      askTitle:'Ask the Kids Concierge', askSub:'Tell us what sounds fun. We only surface titles that pass Kids Mode safety checks.', ageLabel:'Age group', ageAll:'All-ages safe', age35:'Ages 3–5', age68:'Ages 6–8', age912:'Ages 9–12',
      askPlaceholder:'Something funny with animals...', askButton:'Find safe picks', safeNote:'Safety rule: if a title is uncertain, unrated, adult-oriented or outside the selected age band, Kids Mode leaves it out.',
      browseTitle:'Safe picks to start', browseSub:'Curated first, then artwork is matched against TMDB when available.', trust1Title:'Conservative by default', trust1Text:'Unknown or ambiguous content stays out instead of being guessed safe.', trust2Title:'Age bands matter', trust2Text:'The library narrows before matching, so older-kid titles do not leak into younger profiles.', trust3Title:'AI behind a gate', trust3Text:'AI suggestions are checked against the approved Kids library before we display them.', privacy:'Privacy', terms:'Terms', all:'All', watch:'Find where to watch', noMatch:'I kept this extra-safe and could not find a confident match. Try animals, funny, learning, music, adventure or bedtime.', answer:'Here are safe picks from the approved Kids library.'
    },
    'pt-BR': {
      safeBrand:'Descoberta segura', exit:'Sair do Modo Kids', kicker:'Seguro para crianças por design', heroA:'Diversão grande.', heroB:'Tela pequena, segura.', heroText:'Encontre animações, filmes para a família, programas educativos e música sem misturar conteúdo adulto. O Modo Kids usa uma lista aprovada e faixas etárias antes de mostrar qualquer coisa.', safe1:'✓ Sugestões por idade', safe2:'✓ Sem títulos adultos', safe3:'✓ Só resultados seguros da IA', safe4:'✓ Saída fácil para responsáveis', askTitle:'Pergunte ao Concierge Kids', askSub:'Conte o que parece divertido. Só mostramos títulos aprovados pelos filtros de segurança.', ageLabel:'Faixa etária', ageAll:'Seguro para todas as idades', age35:'3–5 anos', age68:'6–8 anos', age912:'9–12 anos', askPlaceholder:'Algo engraçado com animais...', askButton:'Encontrar opções seguras', safeNote:'Regra de segurança: se um título for incerto, sem classificação, adulto ou fora da faixa escolhida, ele fica de fora.', browseTitle:'Sugestões seguras para começar', browseSub:'Curadoria primeiro; depois buscamos a arte no TMDB quando disponível.', trust1Title:'Conservador por padrão', trust1Text:'Conteúdo desconhecido ou ambíguo fica de fora em vez de ser considerado seguro por suposição.', trust2Title:'A idade importa', trust2Text:'A biblioteca é filtrada antes da busca para evitar títulos de crianças maiores em perfis menores.', trust3Title:'IA atrás de uma barreira', trust3Text:'Sugestões da IA precisam existir na biblioteca Kids aprovada antes de aparecer.', privacy:'Privacidade', terms:'Termos', all:'Todos', watch:'Encontrar onde assistir', noMatch:'Mantive a busca bem segura e não encontrei uma opção confiável. Tente animais, engraçado, aprender, música, aventura ou hora de dormir.', answer:'Aqui estão opções seguras da biblioteca Kids aprovada.'
    },
    es: { safeBrand:'Descubrimiento seguro', exit:'Salir del Modo Kids', kicker:'Seguro para niños por diseño', heroA:'Diversión grande.', heroB:'Pantalla pequeña, segura.', heroText:'Encuentra animación, películas familiares, programas educativos y música sin mezclar entretenimiento adulto. Kids Mode filtra por lista aprobada y edad antes de mostrar nada.', safe1:'✓ Opciones por edad', safe2:'✓ Sin títulos para adultos', safe3:'✓ Solo resultados seguros de IA', safe4:'✓ Salida fácil para adultos', askTitle:'Pregunta al Concierge Kids', askSub:'Dinos qué suena divertido. Solo mostramos títulos que superan los controles de seguridad.', ageLabel:'Grupo de edad', ageAll:'Seguro para todas las edades', age35:'3–5 años', age68:'6–8 años', age912:'9–12 años', askPlaceholder:'Algo divertido con animales...', askButton:'Buscar opciones seguras', safeNote:'Regla de seguridad: si un título es incierto, no clasificado, adulto o queda fuera de la edad elegida, no aparece.', browseTitle:'Opciones seguras para empezar', browseSub:'Primero curadas; después se busca el arte en TMDB cuando existe.', trust1Title:'Conservador por defecto', trust1Text:'El contenido desconocido o ambiguo se excluye en vez de asumir que es seguro.', trust2Title:'La edad importa', trust2Text:'La biblioteca se reduce antes de buscar para evitar títulos de niños mayores en perfiles pequeños.', trust3Title:'IA detrás de un filtro', trust3Text:'Las sugerencias de IA deben estar en la biblioteca Kids aprobada antes de mostrarse.', privacy:'Privacidad', terms:'Términos', all:'Todo', watch:'Ver dónde está disponible', noMatch:'Mantuve la búsqueda muy segura y no encontré una coincidencia fiable. Prueba animales, comedia, aprendizaje, música, aventura o dormir.', answer:'Aquí tienes opciones seguras de la biblioteca Kids aprobada.' },
    fr: { safeBrand:'Découverte sûre', exit:'Quitter le mode Kids', kicker:'Sécurité enfants intégrée', heroA:'Grand plaisir.', heroB:'Petit écran, sûr.', heroText:'Trouvez animations, films familiaux, programmes éducatifs et musique sans contenu adulte. Le mode Kids applique une liste approuvée et des tranches d’âge avant tout affichage.', safe1:'✓ Choix par âge', safe2:'✓ Aucun titre adulte', safe3:'✓ Résultats IA sûrs uniquement', safe4:'✓ Sortie simple pour les parents', askTitle:'Demandez au Concierge Kids', askSub:'Dites-nous ce qui ferait plaisir. Nous n’affichons que les titres validés par les contrôles de sécurité.', ageLabel:'Tranche d’âge', ageAll:'Sûr pour tous les âges', age35:'3–5 ans', age68:'6–8 ans', age912:'9–12 ans', askPlaceholder:'Quelque chose de drôle avec des animaux...', askButton:'Trouver des choix sûrs', safeNote:'Règle de sécurité : un titre incertain, non classé, adulte ou hors tranche d’âge est exclu.', browseTitle:'Choix sûrs pour commencer', browseSub:'D’abord sélectionnés, puis illustrés via TMDB si disponible.', trust1Title:'Prudent par défaut', trust1Text:'Le contenu inconnu ou ambigu est exclu plutôt que supposé sûr.', trust2Title:'L’âge compte', trust2Text:'La bibliothèque est filtrée avant la recherche pour éviter les contenus trop âgés.', trust3Title:'IA derrière un filtre', trust3Text:'Les suggestions IA doivent exister dans la bibliothèque Kids approuvée avant affichage.', privacy:'Confidentialité', terms:'Conditions', all:'Tout', watch:'Trouver où regarder', noMatch:'Je suis resté très prudent et je n’ai pas trouvé de résultat sûr. Essayez animaux, drôle, apprentissage, musique, aventure ou coucher.', answer:'Voici des choix sûrs de la bibliothèque Kids approuvée.' },
    de: { safeBrand:'Sichere Entdeckung', exit:'Kids-Modus verlassen', kicker:'Kindersicher entwickelt', heroA:'Großer Spaß.', heroB:'Kleiner Bildschirm, sicher.', heroText:'Entdecke Animation, Familienfilme, Lernsendungen und Musik ohne Inhalte für Erwachsene. Kids Mode prüft zuerst Freigabeliste und Altersgruppe.', safe1:'✓ Altersgerechte Tipps', safe2:'✓ Keine Erwachsenentitel', safe3:'✓ Nur sichere KI-Ergebnisse', safe4:'✓ Elternfreundlicher Ausgang', askTitle:'Frag den Kids Concierge', askSub:'Sag uns, was Spaß macht. Wir zeigen nur Titel, die die Sicherheitsprüfung bestehen.', ageLabel:'Altersgruppe', ageAll:'Für alle Altersgruppen sicher', age35:'3–5 Jahre', age68:'6–8 Jahre', age912:'9–12 Jahre', askPlaceholder:'Etwas Lustiges mit Tieren...', askButton:'Sichere Tipps finden', safeNote:'Sicherheitsregel: Unsichere, ungeprüfte, erwachsene oder zu alte Inhalte werden nicht gezeigt.', browseTitle:'Sichere Tipps zum Start', browseSub:'Zuerst kuratiert, danach Artwork aus TMDB, wenn verfügbar.', trust1Title:'Standardmäßig vorsichtig', trust1Text:'Unbekannte oder mehrdeutige Inhalte werden ausgeschlossen statt sicher geschätzt.', trust2Title:'Alter zählt', trust2Text:'Die Bibliothek wird vor der Suche nach Altersgruppe eingegrenzt.', trust3Title:'KI hinter einer Schranke', trust3Text:'KI-Vorschläge müssen in der freigegebenen Kids-Bibliothek vorhanden sein.', privacy:'Datenschutz', terms:'Bedingungen', all:'Alle', watch:'Verfügbarkeit finden', noMatch:'Ich habe extra vorsichtig gesucht und keinen sicheren Treffer gefunden. Versuch Tiere, lustig, Lernen, Musik, Abenteuer oder Schlafenszeit.', answer:'Hier sind sichere Tipps aus der freigegebenen Kids-Bibliothek.' },
    it: { safeBrand:'Scoperta sicura', exit:'Esci dalla Modalità Kids', kicker:'Sicuro per i bambini by design', heroA:'Grande divertimento.', heroB:'Piccolo schermo, sicuro.', heroText:'Trova animazione, film per famiglie, programmi educativi e musica senza mescolare contenuti per adulti. Kids Mode filtra prima per elenco approvato ed età.', safe1:'✓ Scelte per età', safe2:'✓ Nessun titolo adulto', safe3:'✓ Solo risultati IA sicuri', safe4:'✓ Uscita semplice per genitori', askTitle:'Chiedi al Concierge Kids', askSub:'Dicci cosa sembra divertente. Mostriamo solo titoli che superano i controlli di sicurezza.', ageLabel:'Fascia d’età', ageAll:'Sicuro per tutte le età', age35:'3–5 anni', age68:'6–8 anni', age912:'9–12 anni', askPlaceholder:'Qualcosa di divertente con animali...', askButton:'Trova scelte sicure', safeNote:'Regola di sicurezza: titoli incerti, non classificati, adulti o fuori fascia vengono esclusi.', browseTitle:'Scelte sicure per iniziare', browseSub:'Prima curate, poi artwork TMDB quando disponibile.', trust1Title:'Prudente per impostazione', trust1Text:'I contenuti sconosciuti o ambigui restano fuori invece di essere presunti sicuri.', trust2Title:'L’età conta', trust2Text:'La libreria viene ristretta prima della ricerca per evitare contenuti troppo grandi.', trust3Title:'IA dietro un filtro', trust3Text:'I suggerimenti IA devono essere presenti nella libreria Kids approvata.', privacy:'Privacy', terms:'Termini', all:'Tutti', watch:'Trova dove guardare', noMatch:'Ho mantenuto la ricerca molto prudente e non ho trovato un risultato sicuro. Prova animali, divertente, imparare, musica, avventura o nanna.', answer:'Ecco scelte sicure dalla libreria Kids approvata.' },
    tr: { safeBrand:'Güvenli keşif', exit:'Çocuk Modundan Çık', kicker:'Çocuk güvenliği için tasarlandı', heroA:'Büyük eğlence.', heroB:'Küçük ekran, güvenli.', heroText:'Yetişkin içeriklerini karıştırmadan animasyon, aile filmleri, eğitici programlar ve müzik bulun. Kids Mode önce onaylı liste ve yaş grubunu uygular.', safe1:'✓ Yaşa göre seçimler', safe2:'✓ Yetişkin içeriği yok', safe3:'✓ Yalnızca güvenli AI sonuçları', safe4:'✓ Ebeveyn dostu çıkış', askTitle:'Kids Concierge’e Sor', askSub:'Neyin eğlenceli olduğunu söyleyin. Yalnızca güvenlik kontrollerini geçen başlıkları gösteririz.', ageLabel:'Yaş grubu', ageAll:'Tüm yaşlar için güvenli', age35:'3–5 yaş', age68:'6–8 yaş', age912:'9–12 yaş', askPlaceholder:'Hayvanlarla komik bir şey...', askButton:'Güvenli seçimler bul', safeNote:'Güvenlik kuralı: belirsiz, derecelendirilmemiş, yetişkin veya seçilen yaşın dışındaki içerik gösterilmez.', browseTitle:'Başlamak için güvenli seçimler', browseSub:'Önce kürasyon, sonra mevcutsa TMDB görseli.', trust1Title:'Varsayılan olarak temkinli', trust1Text:'Bilinmeyen veya belirsiz içerik güvenli varsayılmak yerine dışarıda kalır.', trust2Title:'Yaş önemlidir', trust2Text:'Aramadan önce kütüphane yaşa göre daraltılır.', trust3Title:'AI güvenlik kapısının arkasında', trust3Text:'AI önerileri gösterilmeden önce onaylı Kids kütüphanesinde bulunmalıdır.', privacy:'Gizlilik', terms:'Koşullar', all:'Tümü', watch:'Nerede izlenir', noMatch:'Çok temkinli aradım ve güvenli bir eşleşme bulamadım. Hayvanlar, komik, öğrenme, müzik, macera veya uyku zamanı deneyin.', answer:'Onaylı Kids kütüphanesinden güvenli seçimler.' },
    ru: { safeBrand:'Безопасный поиск', exit:'Выйти из детского режима', kicker:'Безопасность детей по умолчанию', heroA:'Большое веселье.', heroB:'Маленький экран, безопасно.', heroText:'Ищите мультфильмы, семейные фильмы, обучающие программы и музыку без взрослого контента. Kids Mode сначала применяет одобренный список и возраст.', safe1:'✓ По возрасту', safe2:'✓ Без взрослого контента', safe3:'✓ Только безопасные ответы ИИ', safe4:'✓ Удобный выход для родителей', askTitle:'Спросите Kids Concierge', askSub:'Расскажите, что хочется посмотреть. Мы показываем только прошедшие проверку варианты.', ageLabel:'Возраст', ageAll:'Безопасно для всех возрастов', age35:'3–5 лет', age68:'6–8 лет', age912:'9–12 лет', askPlaceholder:'Что-нибудь смешное про животных...', askButton:'Найти безопасное', safeNote:'Правило: сомнительные, без рейтинга, взрослые или слишком возрастные материалы не показываются.', browseTitle:'Безопасные варианты для начала', browseSub:'Сначала ручной отбор, затем обложки TMDB, если доступны.', trust1Title:'Осторожность по умолчанию', trust1Text:'Неизвестный или неоднозначный контент исключается.', trust2Title:'Возраст важен', trust2Text:'Библиотека фильтруется по возрасту до поиска.', trust3Title:'ИИ за защитным фильтром', trust3Text:'Предложение ИИ показывается только если оно есть в одобренной Kids-библиотеке.', privacy:'Конфиденциальность', terms:'Условия', all:'Все', watch:'Где смотреть', noMatch:'Я сохранил строгую безопасность и не нашёл уверенного варианта. Попробуйте животных, юмор, обучение, музыку, приключения или сон.', answer:'Вот безопасные варианты из одобренной Kids-библиотеки.' },
    ar: { safeBrand:'اكتشاف آمن', exit:'الخروج من وضع الأطفال', kicker:'مصمم ليكون آمناً للأطفال', heroA:'مرح كبير.', heroB:'شاشة صغيرة وآمنة.', heroText:'اعثر على الرسوم المتحركة وأفلام العائلة والبرامج التعليمية والموسيقى من دون مزج محتوى للبالغين. يطبّق وضع الأطفال قائمة معتمدة وفئات عمرية قبل عرض أي شيء.', safe1:'✓ اختيارات حسب العمر', safe2:'✓ بدون عناوين للبالغين', safe3:'✓ نتائج ذكاء اصطناعي آمنة فقط', safe4:'✓ خروج سهل للوالدين', askTitle:'اسأل مساعد الأطفال', askSub:'أخبرنا ما يبدو ممتعاً. لا نعرض إلا العناوين التي تجتاز فحوص الأمان.', ageLabel:'الفئة العمرية', ageAll:'آمن لكل الأعمار', age35:'3–5 سنوات', age68:'6–8 سنوات', age912:'9–12 سنة', askPlaceholder:'شيء مضحك مع الحيوانات...', askButton:'ابحث عن خيارات آمنة', safeNote:'قاعدة الأمان: المحتوى غير المؤكد أو غير المصنف أو المخصص للبالغين أو خارج العمر المختار لا يظهر.', browseTitle:'اختيارات آمنة للبداية', browseSub:'اختيار منسق أولاً، ثم صور TMDB عند توفرها.', trust1Title:'الحذر افتراضياً', trust1Text:'المحتوى المجهول أو الملتبس يُستبعد بدلاً من افتراض أمانه.', trust2Title:'العمر مهم', trust2Text:'تُصفّى المكتبة حسب العمر قبل المطابقة.', trust3Title:'الذكاء الاصطناعي خلف بوابة أمان', trust3Text:'لا يظهر اقتراح الذكاء الاصطناعي إلا إذا كان في مكتبة الأطفال المعتمدة.', privacy:'الخصوصية', terms:'الشروط', all:'الكل', watch:'اعثر على مكان المشاهدة', noMatch:'حافظت على أعلى مستوى من الأمان ولم أجد تطابقاً موثوقاً. جرّب الحيوانات أو المرح أو التعلم أو الموسيقى أو المغامرة أو وقت النوم.', answer:'هذه اختيارات آمنة من مكتبة الأطفال المعتمدة.' },
    hi: { safeBrand:'सुरक्षित खोज', exit:'Kids Mode से बाहर जाएँ', kicker:'बच्चों की सुरक्षा के लिए डिज़ाइन', heroA:'बड़ा मज़ा.', heroB:'छोटी स्क्रीन, सुरक्षित.', heroText:'बड़ों की सामग्री मिलाए बिना एनीमेशन, पारिवारिक फ़िल्में, सीखने वाले शो और संगीत खोजें। Kids Mode पहले स्वीकृत सूची और आयु समूह लागू करता है।', safe1:'✓ उम्र के अनुसार', safe2:'✓ वयस्क शीर्षक नहीं', safe3:'✓ केवल सुरक्षित AI परिणाम', safe4:'✓ माता-पिता के लिए आसान निकास', askTitle:'Kids Concierge से पूछें', askSub:'बताइए क्या मज़ेदार लगेगा। हम केवल सुरक्षा जाँच पास करने वाले शीर्षक दिखाते हैं।', ageLabel:'आयु समूह', ageAll:'सभी उम्र के लिए सुरक्षित', age35:'3–5 वर्ष', age68:'6–8 वर्ष', age912:'9–12 वर्ष', askPlaceholder:'जानवरों के साथ कुछ मज़ेदार...', askButton:'सुरक्षित विकल्प खोजें', safeNote:'सुरक्षा नियम: अनिश्चित, बिना रेटिंग, वयस्क या चुनी उम्र से बाहर सामग्री नहीं दिखाई जाती।', browseTitle:'शुरू करने के लिए सुरक्षित विकल्प', browseSub:'पहले क्यूरेटेड, फिर उपलब्ध होने पर TMDB आर्टवर्क।', trust1Title:'डिफ़ॉल्ट रूप से सावधान', trust1Text:'अज्ञात या अस्पष्ट सामग्री को सुरक्षित मानने के बजाय बाहर रखा जाता है।', trust2Title:'उम्र मायने रखती है', trust2Text:'मिलान से पहले लाइब्रेरी उम्र के हिसाब से सीमित होती है।', trust3Title:'AI सुरक्षा द्वार के पीछे', trust3Text:'AI सुझाव तभी दिखता है जब वह स्वीकृत Kids लाइब्रेरी में हो।', privacy:'गोपनीयता', terms:'शर्तें', all:'सभी', watch:'कहाँ देखें', noMatch:'मैंने खोज बहुत सुरक्षित रखी और भरोसेमंद विकल्प नहीं मिला। जानवर, मज़ेदार, सीखना, संगीत, रोमांच या सोने का समय आज़माएँ।', answer:'स्वीकृत Kids लाइब्रेरी से सुरक्षित विकल्प ये रहे।' },
    id: { safeBrand:'Penemuan aman', exit:'Keluar dari Mode Anak', kicker:'Aman untuk anak sejak desain', heroA:'Seru besar.', heroB:'Layar kecil, aman.', heroText:'Temukan animasi, film keluarga, acara belajar, dan musik tanpa mencampur hiburan dewasa. Mode Anak menerapkan daftar aman dan kelompok usia sebelum menampilkan apa pun.', safe1:'✓ Pilihan sesuai usia', safe2:'✓ Tanpa judul dewasa', safe3:'✓ Hanya hasil AI aman', safe4:'✓ Mudah keluar untuk orang tua', askTitle:'Tanya Kids Concierge', askSub:'Ceritakan apa yang terdengar seru. Kami hanya menampilkan judul yang lolos pemeriksaan keselamatan.', ageLabel:'Kelompok usia', ageAll:'Aman untuk semua usia', age35:'Usia 3–5', age68:'Usia 6–8', age912:'Usia 9–12', askPlaceholder:'Sesuatu yang lucu tentang hewan...', askButton:'Cari pilihan aman', safeNote:'Aturan keselamatan: judul yang tidak pasti, tanpa rating, dewasa, atau di luar usia pilihan tidak ditampilkan.', browseTitle:'Pilihan aman untuk mulai', browseSub:'Dikurasi dulu, lalu artwork TMDB bila tersedia.', trust1Title:'Konservatif secara default', trust1Text:'Konten tak dikenal atau ambigu dikeluarkan, bukan diasumsikan aman.', trust2Title:'Usia itu penting', trust2Text:'Perpustakaan dipersempit berdasarkan usia sebelum pencocokan.', trust3Title:'AI di balik gerbang aman', trust3Text:'Saran AI harus ada di perpustakaan Kids yang disetujui sebelum ditampilkan.', privacy:'Privasi', terms:'Ketentuan', all:'Semua', watch:'Cari tempat menonton', noMatch:'Saya menjaga pencarian tetap sangat aman dan tidak menemukan kecocokan yakin. Coba hewan, lucu, belajar, musik, petualangan, atau waktu tidur.', answer:'Berikut pilihan aman dari perpustakaan Kids yang disetujui.' },
    ja: { safeBrand:'安全な発見', exit:'キッズモードを終了', kicker:'子どもの安全を最優先', heroA:'大きな楽しさ。', heroB:'小さな画面でも安心。', heroText:'大人向け作品を混ぜずに、アニメ、ファミリー映画、学習番組、音楽を探せます。キッズモードは承認済みリストと年齢帯を先に適用します。', safe1:'✓ 年齢別の候補', safe2:'✓ 大人向け作品なし', safe3:'✓ 安全確認済みAI結果のみ', safe4:'✓ 保護者が簡単に終了', askTitle:'キッズ・コンシェルジュに聞く', askSub:'見たい気分を教えてください。安全チェックを通った作品だけを表示します。', ageLabel:'年齢グループ', ageAll:'全年齢で安全', age35:'3〜5歳', age68:'6〜8歳', age912:'9〜12歳', askPlaceholder:'動物が出る楽しい作品...', askButton:'安全な候補を探す', safeNote:'安全ルール：不確かな作品、年齢区分不明、大人向け、選択年齢外の作品は表示しません。', browseTitle:'まずは安全なおすすめ', browseSub:'先にキュレーションし、利用できる場合のみTMDB画像を照合します。', trust1Title:'初期設定から慎重', trust1Text:'不明・曖昧な作品は安全と推測せず除外します。', trust2Title:'年齢帯を優先', trust2Text:'検索前に年齢帯でライブラリを絞り込みます。', trust3Title:'AIの前に安全ゲート', trust3Text:'AI候補は承認済みKidsライブラリにある場合のみ表示します。', privacy:'プライバシー', terms:'利用規約', all:'すべて', watch:'視聴先を探す', noMatch:'安全を最優先したため、確実な候補が見つかりませんでした。動物、コメディ、学習、音楽、冒険、寝る前などで試してください。', answer:'承認済みKidsライブラリから安全な候補です。' },
    ko: { safeBrand:'안전한 탐색', exit:'키즈 모드 나가기', kicker:'처음부터 어린이 안전 중심', heroA:'큰 즐거움.', heroB:'작은 화면도 안전하게.', heroText:'성인용 콘텐츠를 섞지 않고 애니메이션, 가족 영화, 학습 프로그램, 음악을 찾으세요. 키즈 모드는 승인 목록과 연령대를 먼저 적용합니다.', safe1:'✓ 연령별 추천', safe2:'✓ 성인용 제목 제외', safe3:'✓ 안전한 AI 결과만', safe4:'✓ 보호자 친화적 종료', askTitle:'키즈 컨시어지에게 물어보기', askSub:'무엇이 재미있을지 알려 주세요. 안전 검사를 통과한 제목만 보여 줍니다.', ageLabel:'연령대', ageAll:'모든 연령 안전', age35:'3–5세', age68:'6–8세', age912:'9–12세', askPlaceholder:'동물이 나오는 재미있는 것...', askButton:'안전한 추천 찾기', safeNote:'안전 규칙: 불확실하거나 등급이 없거나 성인용이거나 선택 연령 밖의 콘텐츠는 표시하지 않습니다.', browseTitle:'안전한 추천부터 시작', browseSub:'먼저 선별한 뒤 가능할 때 TMDB 아트워크를 매칭합니다.', trust1Title:'기본값부터 보수적으로', trust1Text:'알 수 없거나 모호한 콘텐츠는 안전하다고 추정하지 않고 제외합니다.', trust2Title:'연령대가 중요', trust2Text:'매칭 전에 연령대로 라이브러리를 좁힙니다.', trust3Title:'AI 앞의 안전 게이트', trust3Text:'AI 제안은 승인된 Kids 라이브러리에 있어야만 표시됩니다.', privacy:'개인정보', terms:'이용약관', all:'전체', watch:'시청 가능한 곳 찾기', noMatch:'안전을 우선해 확실한 결과를 찾지 못했습니다. 동물, 코미디, 학습, 음악, 모험, 잠자리로 검색해 보세요.', answer:'승인된 Kids 라이브러리의 안전한 추천입니다.' },
    zh: { safeBrand:'安全发现', exit:'退出儿童模式', kicker:'从设计上保障儿童安全', heroA:'大大的乐趣。', heroB:'小小屏幕，也安心。', heroText:'在不混入成人内容的前提下，发现动画、家庭电影、学习节目和音乐。儿童模式会先应用批准清单和年龄段。', safe1:'✓ 按年龄推荐', safe2:'✓ 不含成人标题', safe3:'✓ 仅显示安全AI结果', safe4:'✓ 家长可轻松退出', askTitle:'问问儿童娱乐管家', askSub:'告诉我们什么听起来有趣。只有通过安全检查的标题才会显示。', ageLabel:'年龄段', ageAll:'全年龄安全', age35:'3–5岁', age68:'6–8岁', age912:'9–12岁', askPlaceholder:'有动物的搞笑内容...', askButton:'寻找安全推荐', safeNote:'安全规则：不确定、未分级、成人向或超出所选年龄段的内容不会显示。', browseTitle:'从安全推荐开始', browseSub:'先人工筛选，再在可用时匹配TMDB海报。', trust1Title:'默认保守', trust1Text:'未知或含糊内容会被排除，而不是被猜测为安全。', trust2Title:'年龄很重要', trust2Text:'匹配前先按年龄缩小内容库。', trust3Title:'AI前有安全闸门', trust3Text:'AI推荐必须已存在于批准的儿童内容库中才能显示。', privacy:'隐私', terms:'条款', all:'全部', watch:'查找观看平台', noMatch:'为了保持严格安全，我没有找到足够确定的匹配。可以试试动物、搞笑、学习、音乐、冒险或睡前。', answer:'以下是批准的儿童内容库中的安全推荐。' }
  };

  const CATEGORIES = ['all','animals','funny','learning','adventure','family','music','bedtime'];

  const LIBRARY = [
    {title:'Bluey', year:'2018', type:'series', platform:'Disney+', ages:['all','3-5','6-8'], cats:['family','funny','animals'], desc:'Imaginative family play, gentle humor and everyday adventures.', tmdb:true},
    {title:'Peppa Pig', year:'2004', type:'series', platform:'Netflix', ages:['all','3-5'], cats:['animals','funny','family'], desc:'Short, simple stories about family, friends and playful routines.', tmdb:true},
    {title:'Daniel Tiger\'s Neighborhood', year:'2012', type:'series', platform:'PBS Kids', ages:['all','3-5'], cats:['learning','family'], desc:'Gentle social-emotional lessons about feelings, routines and friendship.', tmdb:true},
    {title:'Sesame Street', year:'1969', type:'series', platform:'PBS Kids', ages:['all','3-5','6-8'], cats:['learning','music','funny'], desc:'Songs, letters, numbers, kindness and classic character comedy.', tmdb:true},
    {title:'Numberblocks', year:'2017', type:'series', platform:'Netflix', ages:['all','3-5','6-8'], cats:['learning','funny'], desc:'Colorful number characters turn early math into tiny adventures.', tmdb:true},
    {title:'Ask the StoryBots', year:'2016', type:'series', platform:'Netflix', ages:['all','3-5','6-8'], cats:['learning','funny','music'], desc:'Big kid questions answered through comedy, songs and science.', tmdb:true},
    {title:'Puffin Rock', year:'2015', type:'series', platform:'Netflix', ages:['all','3-5'], cats:['animals','bedtime','family'], desc:'Soft-spoken island adventures with puffins, nature and family.', tmdb:true},
    {title:'Pocoyo', year:'2005', type:'series', platform:'YouTube', ages:['all','3-5'], cats:['funny','learning'], desc:'Simple visual comedy and curiosity for very young viewers.', tmdb:true},
    {title:'Gabby\'s Dollhouse', year:'2021', type:'series', platform:'Netflix', ages:['all','3-5','6-8'], cats:['adventure','music','family'], desc:'Crafts, songs, cats and imaginative miniature-world adventures.', tmdb:true},
    {title:'Octonauts', year:'2010', type:'series', platform:'Netflix', ages:['all','3-5','6-8'], cats:['animals','learning','adventure'], desc:'Underwater rescue adventures built around real ocean animals.', tmdb:true},
    {title:'Wild Kratts', year:'2011', type:'series', platform:'PBS Kids', ages:['all','6-8','9-12'], cats:['animals','learning','adventure'], desc:'Animal science mixed with energetic exploration and creature powers.', tmdb:true},
    {title:'Shaun the Sheep', year:'2007', type:'series', platform:'Netflix', ages:['all','3-5','6-8'], cats:['animals','funny'], desc:'Wordless farm comedy with clever visual jokes and gentle chaos.', tmdb:true},
    {title:'My Neighbor Totoro', year:'1988', type:'movie', platform:'Max', ages:['all','6-8','9-12'], cats:['family','adventure','bedtime'], desc:'A warm, magical family story about sisters, nature and a forest friend.', tmdb:true},
    {title:'Kiki\'s Delivery Service', year:'1989', type:'movie', platform:'Max', ages:['all','6-8','9-12'], cats:['family','adventure'], desc:'A young witch builds confidence, friendships and a new life in a seaside town.', tmdb:true},
    {title:'Paddington', year:'2014', type:'movie', platform:'Find online', ages:['all','6-8','9-12'], cats:['family','funny','adventure'], desc:'A very polite bear finds a family and a home in London.', tmdb:true},
    {title:'Paddington 2', year:'2017', type:'movie', platform:'Find online', ages:['all','6-8','9-12'], cats:['family','funny','adventure'], desc:'Kindness, comedy and a colorful mystery built around Paddington.', tmdb:true},
    {title:'Winnie the Pooh', year:'2011', type:'movie', platform:'Disney+', ages:['all','3-5','6-8'], cats:['family','funny','bedtime'], desc:'A gentle Hundred Acre Wood adventure with Pooh and friends.', tmdb:true},
    {title:'The Peanuts Movie', year:'2015', type:'movie', platform:'Find online', ages:['all','6-8','9-12'], cats:['family','funny'], desc:'Charlie Brown tries something brave while Snoopy launches his own adventure.', tmdb:true},
    {title:'Luca', year:'2021', type:'movie', platform:'Disney+', ages:['all','6-8','9-12'], cats:['family','adventure','funny'], desc:'Friendship, curiosity and a sunny summer adventure on the Italian coast.', tmdb:true},
    {title:'Ratatouille', year:'2007', type:'movie', platform:'Disney+', ages:['all','6-8','9-12'], cats:['family','funny','adventure'], desc:'A food-loving rat follows his creative dream in a Paris kitchen.', tmdb:true},
    {title:'Super Simple Songs', year:'', type:'music', platform:'YouTube', ages:['all','3-5'], cats:['music','learning','bedtime'], desc:'Simple sing-alongs for routines, vocabulary and early learning.', tmdb:false},
    {title:'The Wiggles', year:'1998', type:'music', platform:'YouTube', ages:['all','3-5'], cats:['music','learning','funny'], desc:'Bright songs, movement and preschool-friendly learning.', tmdb:true},
    {title:'Cosmic Kids Yoga', year:'', type:'series', platform:'YouTube', ages:['all','3-5','6-8'], cats:['learning','bedtime','adventure'], desc:'Story-led yoga, calm-down sessions and movement for kids.', tmdb:false},
    {title:'SciShow Kids', year:'', type:'series', platform:'YouTube', ages:['all','6-8','9-12'], cats:['learning','animals'], desc:'Friendly science explainers built around kids’ everyday questions.', tmdb:false}
  ];

  Object.assign(UI.en, {
    safeBrand:'A little world of wonder', exit:'Grown-ups', kicker:'Little people. Big imaginations.', heroA:'Press play', heroB:'on wonder.', heroText:'Giggles, brave adventures and amazing discoveries. Find your next favorite in a world made just for kids.', safe1:'Handpicked, age-friendly adventures', ageAll:'All approved ages', browseTitle:'What shall we discover?', askTitle:'Dream it. Discover it.', askSub:'Animals in space? A cozy bedtime story? Tell us what sounds fun.', askButton:'Find my adventure', explore:"Let’s explore", surprise:'Surprise me', skip:'Skip to the picks', artLabel:'Your adventure starts here', featuredTitle:'A little inspiration', featuredSub:'Big smiles, tiny explorers', browseEyebrow:'Find your kind of fun', askEyebrow:'A little help choosing', askSafe:'Only picks from our approved Kids collection.', parentInfo:'A note for grown-ups', parentNote:'MatchApp helps you discover titles. Availability varies by region. External viewing sites have their own content and controls; a grown-up should help you open them. Kids Mode is a curated filter, not a parental lock.', watch:'Explore this title', watchDialogTitle:'Bring a grown-up along', watchDialogText:'You’re heading to another website. Ask a grown-up to help you find this title.', watchContinue:'Find where to watch', stay:'Keep exploring', pauseMotion:'Pause magic', resumeMotion:'Resume magic', pickCount:'adventures to explore', empty:'Try another category for more adventures.', movie:'Movie', series:'Show', music:'Music', languageLabel:'Language', categoryLabel:'Kids categories', voiceLabel:'Voice input', closeLabel:'Close', waiting:'Finding your adventure…'
  });
  Object.assign(UI['pt-BR'], {
    safeBrand:'Um mundinho de descobertas', exit:'Responsáveis', kicker:'Pequenos exploradores. Grandes ideias.', heroA:'Dê o play', heroB:'na imaginação.', heroText:'Risadas, aventuras e descobertas incríveis. Encontre seu próximo favorito em um mundo feito para crianças.', safe1:'Aventuras escolhidas para cada idade', ageAll:'Todas as idades aprovadas', browseTitle:'O que vamos descobrir?', askTitle:'Sonhe. Descubra.', askSub:'Animais no espaço? Uma história para dormir? Conte o que parece divertido.', askButton:'Encontrar minha aventura', explore:'Vamos explorar', surprise:'Surpreenda-me', skip:'Ir para as sugestões', artLabel:'Sua aventura começa aqui', featuredTitle:'Um pouco de inspiração', featuredSub:'Grandes sorrisos, pequenos exploradores', browseEyebrow:'Encontre sua diversão', askEyebrow:'Uma ajudinha para escolher', askSafe:'Só sugestões da coleção Kids aprovada.', parentInfo:'Um recado para responsáveis', parentNote:'O MatchApp ajuda a descobrir títulos. A disponibilidade varia por região. Sites externos têm conteúdos e controles próprios; um responsável deve ajudar a abri-los. O Modo Kids é um filtro de curadoria, não um bloqueio parental.', watch:'Explorar este título', watchDialogTitle:'Chame um responsável', watchDialogText:'Você vai abrir outro site. Peça ajuda a um responsável para encontrar este título.', watchContinue:'Encontrar onde assistir', stay:'Continuar explorando', pauseMotion:'Pausar magia', resumeMotion:'Retomar magia', pickCount:'aventuras para explorar', empty:'Tente outra categoria para encontrar aventuras.', movie:'Filme', series:'Programa', music:'Música', languageLabel:'Idioma', categoryLabel:'Categorias Kids', voiceLabel:'Entrada por voz', closeLabel:'Fechar', waiting:'Encontrando sua aventura…'
  });
  Object.assign(UI.es, {
    safeBrand:'Un pequeño mundo de maravillas', exit:'Adultos', kicker:'Pequeños exploradores. Grandes ideas.', heroA:'Dale play', heroB:'a la imaginación.', heroText:'Risas, aventuras y descubrimientos increíbles. Encuentra tu próximo favorito en un mundo hecho para niños.', safe1:'Aventuras elegidas para cada edad', ageAll:'Todas las edades aprobadas', browseTitle:'¿Qué vamos a descubrir?', askTitle:'Sueña. Descubre.', askSub:'¿Animales en el espacio? ¿Una historia para dormir? Dinos qué suena divertido.', askButton:'Encontrar mi aventura', explore:'Vamos a explorar', surprise:'Sorpréndeme', skip:'Ir a las recomendaciones', artLabel:'Tu aventura empieza aquí', featuredTitle:'Un poco de inspiración', featuredSub:'Grandes sonrisas, pequeños exploradores', browseEyebrow:'Encuentra tu diversión', askEyebrow:'Una ayuda para elegir', askSafe:'Solo títulos de nuestra colección Kids aprobada.', parentInfo:'Una nota para adultos', parentNote:'MatchApp ayuda a descubrir títulos. La disponibilidad varía por región. Los sitios externos tienen contenidos y controles propios; un adulto debe ayudar a abrirlos. Kids Mode es un filtro de selección, no un bloqueo parental.', watch:'Explorar este título', watchDialogTitle:'Pide ayuda a un adulto', watchDialogText:'Vas a abrir otro sitio. Pide ayuda a un adulto para encontrar este título.', watchContinue:'Ver dónde está disponible', stay:'Seguir explorando', pauseMotion:'Pausar magia', resumeMotion:'Reanudar magia', pickCount:'aventuras para explorar', empty:'Prueba otra categoría para más aventuras.', movie:'Película', series:'Programa', music:'Música', languageLabel:'Idioma', categoryLabel:'Categorías Kids', voiceLabel:'Entrada por voz', closeLabel:'Cerrar', waiting:'Buscando tu aventura…'
  });
  const read = (key) => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  let requestVersion = 0;
  let chatPicks = [];
  let motionPaused = read('match_kids_pause_motion') === 'true';
  let lang = 'en';
  let category = 'all';

  function normalizeLang(v) {
    if (!v) return 'en';
    if (v.toLowerCase().startsWith('pt')) return 'pt-BR';
    const base = v.split('-')[0];
    return UI[v] ? v : (UI[base] ? base : 'en');
  }

  function tr(key) { return (UI[lang] && UI[lang][key]) || UI.en[key] || key; }

  function setLanguage(next) {
    lang = normalizeLang(next);
    write(LANG_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-k]').forEach(el => { const v = tr(el.dataset.k); if (v) el.textContent = v; });
    document.querySelectorAll('[data-k-placeholder]').forEach(el => { const v = tr(el.dataset.kPlaceholder); if (v) el.placeholder = v; });
    const picker = document.getElementById('kids-lang'); if (picker) picker.value = lang;
    window.MATCH_LANG = lang;
    document.getElementById('kids-lang')?.setAttribute('aria-label', tr('languageLabel'));
    document.getElementById('kids-chips')?.setAttribute('aria-label', tr('categoryLabel'));
    document.getElementById('kids-mic')?.setAttribute('aria-label', tr('voiceLabel'));
    document.querySelector('.kids-dialog-close')?.setAttribute('aria-label', tr('closeLabel'));
    clearChat(); updateMotion(); renderChips(); renderGrid(); renderFeatured();
  }

  function currentAge() { return document.getElementById('kids-age')?.value || read(AGE_KEY) || 'all'; }
  function allowedForAge(item, age) { return age === 'all' ? item.ages.includes('all') : item.ages.includes(age); }
  function allowedLibrary(age) { return LIBRARY.filter(item => allowedForAge(item, age)); }
  function normalizeTitle(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
  const byTitle = new Map(LIBRARY.map(x => [normalizeTitle(x.title), x]));

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function slug(item) { return normalizeTitle(item.title).replace(/\s+/g, '-'); }
  function makePoster(item) { return '/kids/covers/' + slug(item) + '.svg'; }
  const icons = {all:'✦',animals:'🐾',funny:'☺',learning:'💡',adventure:'🚀',family:'🧸',music:'♫',bedtime:'☾'};
  const posterRequests = new Map();
  const posterQueue = [];
  let activePosters = 0;

  function fetchPoster(item) {
    if (posterRequests.has(item.title)) return posterRequests.get(item.title);
    const pending = new Promise(resolve => { posterQueue.push({item, resolve}); pumpPosters(); });
    posterRequests.set(item.title, pending);
    return pending;
  }
  function pumpPosters() {
    while (activePosters < 4 && posterQueue.length) {
      const {item, resolve} = posterQueue.shift(); activePosters++;
      Promise.resolve().then(async () => {
        if (typeof window.tmdbLookup !== 'function') return null;
        const kind = item.type === 'movie' ? 'movie' : 'tv';
        const r = await window.tmdbLookup(item.title, {year:item.year, kind});
        if (!r || r.adult === true || r.kind !== kind) return null;
        if (![r.title,r.originalTitle].some(name => normalizeTitle(name) === normalizeTitle(item.title))) return null;
        if (item.year && (!r.year || Math.abs(Number(r.year) - Number(item.year)) > 1)) return null;
        const source = r.posterLarge || r.poster;
        if (!source || !/^https:\/\/image\.tmdb\.org\/t\/p\//.test(source)) return null;
        return r;
      }).catch(() => null).then(resolve).finally(() => { activePosters--; pumpPosters(); });
    }
  }

  function watchUrl(item) {
    if (item.platform === 'YouTube') return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(item.title + ' official kids');
    const country = String(read('match_user_country') || '').toLowerCase();
    return 'https://www.justwatch.com/' + (/brazil|brasil/.test(country) ? 'br' : 'us') + '/search?q=' + encodeURIComponent(item.title);
  }

  function cardHTML(item, compact, slot) {
    const id = 'kid-' + slot + '-' + slug(item);
    const title = escapeHTML(item.title);
    const ages = item.ages.filter(a => a !== 'all').join(' · ');
    return '<article class="kids-card" data-title="' + title + '"><div class="kids-card-poster"><div class="kids-cover-underlay" aria-hidden="true"><span>' + icons[item.cats[0]] + '</span><strong>' + title + '</strong></div><img id="' + id + '" src="' + makePoster(item) + '" alt="' + title + '" width="600" height="900" loading="lazy" decoding="async"><span class="kids-card-badge">' + ages + '</span></div><div class="kids-card-body"><h3>' + title + '</h3><div class="kids-card-meta"><span>' + escapeHTML(tr(item.type)) + '</span><span>' + escapeHTML(item.year) + '</span></div>' + (compact ? '' : '<p>' + escapeHTML(item.desc) + '</p>') + '<button class="kids-watch" type="button" data-watch="' + slug(item) + '" aria-label="' + escapeHTML(tr('watch') + ': ' + item.title) + '">' + escapeHTML(tr('watch')) + ' <span aria-hidden="true">↗</span></button></div></article>';
  }

  async function hydratePoster(item, slot) {
    const img = document.getElementById('kid-' + slot + '-' + slug(item));
    if (!img) return;
    img.onerror = () => { img.onerror = null; img.style.visibility = 'hidden'; };
    const r = await fetchPoster(item);
    if (!r || !img.isConnected) return;
    const source = r.posterLarge || r.poster;
    const preload = new Image();
    preload.onload = () => {
      if (!img.isConnected) return;
      img.onerror = () => { img.onerror = () => { img.onerror = null; img.style.visibility = 'hidden'; }; img.removeAttribute('srcset'); img.src = makePoster(item); };
      img.style.visibility = 'visible';
      img.src = source;
      // Use the source's actual sizes; 8K layout does not invent 8K movie art.
      if (r.posterOriginal && /^https:\/\/image\.tmdb\.org\/t\/p\/original\//.test(r.posterOriginal)) {
        img.srcset = r.poster + ' 500w, ' + r.posterLarge + ' 780w';
        img.sizes = '(min-width: 6000px) 1000px, (min-width: 3000px) 550px, (min-width: 1920px) 350px, (max-width: 560px) 45vw, 240px';
        // Originals have different native resolutions; never label them as 8K.
        if (matchMedia('(min-width: 3000px)').matches) { img.removeAttribute('srcset'); img.src = r.posterOriginal; }
      }
    };
    preload.src = source;
  }

  function renderFeatured() {
    const host = document.getElementById('kids-featured'); if (!host) return;
    const pool = allowedLibrary(currentAge());
    const picks = [pool[0], pool.find(x => x.cats.includes('learning') && x !== pool[0]), pool.find(x => x.cats.includes('adventure') && x !== pool[0])].filter(Boolean);
    host.innerHTML = picks.map((x,i) => '<a href="#browse" class="kids-feature" data-feature="' + slug(x) + '"><img id="kid-feature-' + i + '-' + slug(x) + '" src="' + makePoster(x) + '" alt="" width="600" height="900"><span><strong>' + escapeHTML(x.title) + '</strong><small>' + escapeHTML(categoryLabel(x.cats[0])) + ' · ' + escapeHTML(tr(x.type)) + '</small></span><span class="kids-feature-arrow" aria-hidden="true">→</span></a>').join('');
    picks.forEach((x,i) => hydratePoster(x, 'feature-' + i));
  }

  function categoryLabel(cat) {
    const labels = {
      en:{all:'All',animals:'Animals',funny:'Funny',learning:'Learning',adventure:'Adventure',family:'Family',music:'Music',bedtime:'Bedtime'},
      'pt-BR':{all:'Todos',animals:'Animais',funny:'Engraçado',learning:'Aprender',adventure:'Aventura',family:'Família',music:'Música',bedtime:'Hora de dormir'},
      es:{all:'Todo',animals:'Animales',funny:'Divertido',learning:'Aprender',adventure:'Aventura',family:'Familia',music:'Música',bedtime:'Dormir'},
      fr:{all:'Tout',animals:'Animaux',funny:'Drôle',learning:'Apprendre',adventure:'Aventure',family:'Famille',music:'Musique',bedtime:'Coucher'},
      de:{all:'Alle',animals:'Tiere',funny:'Lustig',learning:'Lernen',adventure:'Abenteuer',family:'Familie',music:'Musik',bedtime:'Schlafenszeit'},
      it:{all:'Tutto',animals:'Animali',funny:'Divertente',learning:'Imparare',adventure:'Avventura',family:'Famiglia',music:'Musica',bedtime:'Nanna'},
      tr:{all:'Tümü',animals:'Hayvanlar',funny:'Komik',learning:'Öğrenme',adventure:'Macera',family:'Aile',music:'Müzik',bedtime:'Uyku zamanı'},
      ru:{all:'Все',animals:'Животные',funny:'Смешное',learning:'Обучение',adventure:'Приключения',family:'Семья',music:'Музыка',bedtime:'Перед сном'},
      ar:{all:'الكل',animals:'حيوانات',funny:'مضحك',learning:'تعلّم',adventure:'مغامرة',family:'عائلة',music:'موسيقى',bedtime:'وقت النوم'},
      hi:{all:'सभी',animals:'जानवर',funny:'मज़ेदार',learning:'सीखना',adventure:'रोमांच',family:'परिवार',music:'संगीत',bedtime:'सोने का समय'},
      id:{all:'Semua',animals:'Hewan',funny:'Lucu',learning:'Belajar',adventure:'Petualangan',family:'Keluarga',music:'Musik',bedtime:'Waktu tidur'},
      ja:{all:'すべて',animals:'どうぶつ',funny:'おもしろい',learning:'まなぶ',adventure:'ぼうけん',family:'かぞく',music:'おんがく',bedtime:'おやすみ'},
      ko:{all:'전체',animals:'동물',funny:'재미',learning:'학습',adventure:'모험',family:'가족',music:'음악',bedtime:'잠자리'},
      zh:{all:'全部',animals:'动物',funny:'搞笑',learning:'学习',adventure:'冒险',family:'家庭',music:'音乐',bedtime:'睡前'}
    };
    return (labels[lang] && labels[lang][cat]) || labels.en[cat];
  }

  function renderChips() {
    const host = document.getElementById('kids-chips'); if (!host) return;
    const hadFocus = host.contains(document.activeElement);
    host.innerHTML = CATEGORIES.map(c => '<button type="button" class="kids-chip ' + (c === category ? 'active' : '') + '" data-cat="' + c + '" aria-pressed="' + (c === category) + '"><span class="kids-chip-icon" aria-hidden="true">' + icons[c] + '</span>' + escapeHTML(categoryLabel(c)) + '</button>').join('');
    host.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { category = b.dataset.cat; renderChips(); renderGrid(); }));
    if (hadFocus) host.querySelector('[data-cat="' + category + '"]')?.focus({preventScroll:true});
  }

  function renderGrid() {
    const host = document.getElementById('kids-grid'); if (!host) return;
    const items = allowedLibrary(currentAge()).filter(x => category === 'all' || x.cats.includes(category));
    host.innerHTML = items.map((x,i) => cardHTML(x, false, 'grid-' + i)).join('');
    host.querySelectorAll('.kids-card').forEach((el,i) => el.style.setProperty('--card-order', Math.min(i,7)));
    document.getElementById('kids-grid-status').textContent = items.length ? items.length + ' ' + tr('pickCount') : tr('empty');
    items.forEach((x,i) => hydratePoster(x, 'grid-' + i));
  }

  function queryTokens(q) {
    return normalizeTitle(q).split(/\s+/).filter(w => w.length > 2);
  }

  function localMatch(question, age) {
    const tokens = queryTokens(question);
    const pool = allowedLibrary(age);
    const synonyms = {
      animal:['animals'],animais:['animals'],animales:['animals'],funny:['funny'],engraçado:['funny'],divertido:['funny'],comedy:['funny'],learn:['learning'],learning:['learning'],aprender:['learning'],science:['learning'],math:['learning'],music:['music'],música:['music'],song:['music'],songs:['music'],adventure:['adventure'],aventura:['adventure'],family:['family'],família:['family'],familia:['family'],bedtime:['bedtime'],sleep:['bedtime'],dormir:['bedtime'],calm:['bedtime']
    };
    const scored = pool.map(item => {
      const hay = normalizeTitle([item.title,item.desc,item.cats.join(' ')].join(' '));
      let score = 0;
      tokens.forEach(tok => {
        if (hay.includes(tok)) score += 4;
        const cats = synonyms[tok]; if (cats && cats.some(c => item.cats.includes(c))) score += 6;
      });
      if (!tokens.length) score = 1;
      return {item,score};
    }).sort((a,b) => b.score-a.score);
    const positive = scored.filter(x => x.score > 0).slice(0,4).map(x => x.item);
    return positive.length ? positive : pool.slice(0,4);
  }

  async function safeAIRecognise(question, age) {
    if (!window.supabaseClient) return [];
    try {
      const { data, error } = await window.supabaseClient.functions.invoke('gemini-proxy', { body: {
        mode:'discover', question, lang, kidsMode:true, childAgeBand:age,
        country:read('match_user_country') || '', age:''
      }});
      if (error || !data?.candidates?.[0]?.content?.parts?.[0]?.text) return [];
      const raw = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
      const safe = [];
      (parsed.results || []).forEach(r => {
        const approved = byTitle.get(normalizeTitle(r.title));
        if (approved && allowedForAge(approved, age) && !safe.includes(approved)) safe.push(approved);
      });
      return safe.slice(0,4);
    } catch (_) { return []; }
  }

  function clearChat() {
    requestVersion++; chatPicks = [];
    document.getElementById('kids-chat')?.classList.remove('show');
    const results = document.getElementById('kids-chat-results'); if (results) results.replaceChildren();
    const send = document.getElementById('kids-send'); if (send) send.disabled = false;
    document.getElementById('kids-ask-form')?.setAttribute('aria-busy', 'false');
  }
  async function askKids(question) {
    const answer = document.getElementById('kids-answer');
    const results = document.getElementById('kids-chat-results');
    const chat = document.getElementById('kids-chat');
    if (!question.trim() || !answer || !results || !chat) return;
    const version = ++requestVersion; const age = currentAge();
    const send = document.getElementById('kids-send');
    const form = document.getElementById('kids-ask-form');
    chat.classList.add('show'); answer.textContent = tr('waiting'); results.replaceChildren();
    send.disabled = true; form.setAttribute('aria-busy', 'true');
    let timer;
    const aiApproved = await Promise.race([safeAIRecognise(question.trim(), age), new Promise(resolve => { timer = setTimeout(() => resolve([]), 18000); })]);
    clearTimeout(timer);
    if (version !== requestVersion || age !== currentAge()) return;
    // Reapply the CURRENT allowlist, even to locally selected fallback results.
    chatPicks = (aiApproved.length ? aiApproved : localMatch(question.trim(), age)).filter(x => byTitle.get(normalizeTitle(x.title)) === x && allowedForAge(x, currentAge()));
    answer.textContent = chatPicks.length ? tr('answer') : tr('noMatch');
    results.innerHTML = chatPicks.map((x,i) => cardHTML(x, true, 'chat-' + i)).join('');
    chatPicks.forEach((x,i) => hydratePoster(x, 'chat-' + i));
    send.disabled = false; form.setAttribute('aria-busy', 'false');
    chat.scrollIntoView({behavior: reducedMotion() ? 'auto' : 'smooth', block:'nearest'});
  }

  function reducedMotion() { return motionPaused || document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function updateMotion() {
    document.body.classList.toggle('kids-paused', motionPaused);
    const b = document.getElementById('kids-motion');
    if (b) { b.setAttribute('aria-pressed', String(motionPaused)); b.textContent = tr(motionPaused ? 'resumeMotion' : 'pauseMotion'); }
  }
  function highlightTitle(key) {
    const item = allowedLibrary(currentAge()).find(x => slug(x) === key);
    if (!item) return;
    if (category !== 'all') { category = 'all'; renderChips(); renderGrid(); }
    const card = [...document.querySelectorAll('#kids-grid .kids-card')].find(el => el.dataset.title === item.title);
    card?.scrollIntoView({behavior:reducedMotion() ? 'auto' : 'smooth', block:'center'});
    card?.classList.add('is-surprise'); card?.querySelector('button')?.focus({preventScroll:true});
    setTimeout(() => card?.classList.remove('is-surprise'), 2200);
  }
  function openWatch(key) {
    const item = allowedLibrary(currentAge()).find(x => slug(x) === key); if (!item) return;
    const dialog = document.getElementById('kids-watch-dialog');
    document.getElementById('kids-watch-name').textContent = item.title;
    const link = document.getElementById('kids-watch-continue'); link.href = watchUrl(item);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else { document.getElementById('kids-answer').textContent = tr('watchDialogText'); document.getElementById('kids-chat').classList.add('show'); }
  }
  function remoteNavigation(event) {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key) || event.altKey || event.metaKey || event.ctrlKey) return;
    const active = document.activeElement;
    if (active?.matches('input,select,textarea') || document.getElementById('kids-watch-dialog')?.open) return;
    const origin = active?.getBoundingClientRect();
    const candidates = [...document.querySelectorAll('a,button,select,summary')].filter(el => !el.disabled && el.getClientRects().length && el.getBoundingClientRect().width > 0);
    if (!origin || active === document.body) { candidates[0]?.focus(); event.preventDefault(); return; }
    const horizontal = ['ArrowLeft','ArrowRight'].includes(event.key); const sign = ['ArrowRight','ArrowDown'].includes(event.key) ? 1 : -1;
    const x = origin.x + origin.width/2, y = origin.y + origin.height/2;
    const ranked = candidates.filter(el => el !== active).map(el => { const r = el.getBoundingClientRect(); const dx = r.x+r.width/2-x, dy = r.y+r.height/2-y; const forward = (horizontal ? dx : dy)*sign; return {el,forward,score:forward+Math.abs(horizontal ? dy : dx)*4}; }).filter(x => x.forward > 4).sort((a,b) => a.score-b.score);
    if (ranked.length) { event.preventDefault(); ranked[0].el.focus({preventScroll:true}); ranked[0].el.scrollIntoView({block:'nearest',behavior:'auto'}); }
  }

  function exitKids() {
    write(MODE_KEY, 'false');
    location.href = '/';
  }

  function boot() {
    write(MODE_KEY, 'true');
    const params = new URLSearchParams(location.search);
    const requested = params.get('lang') || read(LANG_KEY) || navigator.language || 'en';
    const age = read(AGE_KEY) || 'all';
    const ageSelect = document.getElementById('kids-age'); if (ageSelect) ageSelect.value = ['all','3-5','6-8','9-12'].includes(age) ? age : 'all';
    setLanguage(requested);

    document.getElementById('kids-lang')?.addEventListener('change', e => setLanguage(e.target.value));
    document.getElementById('kids-exit')?.addEventListener('click', exitKids);
    ageSelect?.addEventListener('change', () => { write(AGE_KEY, ageSelect.value); clearChat(); document.getElementById('kids-watch-dialog')?.close?.(); renderGrid(); renderFeatured(); });
    document.getElementById('kids-ask-form')?.addEventListener('submit', e => { e.preventDefault(); askKids(document.getElementById('kids-question')?.value || ''); });

    if (typeof window.initVoiceInput === 'function') {
      try { window.initVoiceInput('kids-question','kids-mic', () => document.getElementById('kids-ask-form')?.requestSubmit()); } catch (_) {}
    }
    updateMotion();
    document.getElementById('kids-motion')?.addEventListener('click', () => { motionPaused = !motionPaused; write('match_kids_pause_motion', String(motionPaused)); updateMotion(); });
    document.getElementById('kids-surprise')?.addEventListener('click', () => { const pool = allowedLibrary(currentAge()); if (pool.length) highlightTitle(slug(pool[Math.floor(Math.random()*pool.length)])); });
    document.addEventListener('click', event => { const feature = event.target.closest('[data-feature]'); const watch = event.target.closest('[data-watch]'); if (feature) { event.preventDefault(); highlightTitle(feature.dataset.feature); } if (watch) openWatch(watch.dataset.watch); });
    document.getElementById('kids-watch-continue')?.addEventListener('click', () => document.getElementById('kids-watch-dialog').close());
    document.addEventListener('keydown', remoteNavigation);
    document.addEventListener('visibilitychange', () => document.body.classList.toggle('kids-hidden', document.hidden));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
