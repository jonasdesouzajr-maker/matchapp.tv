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

  Object.assign(UI.en,{nostalgiaTitle:'Nostalgia favorites',nostalgiaSub:'Classic cartoons from the 1950s to the 2000s. Tap a title to open its viewing guide. Ask a grown-up before visiting another site.',nostalgiaYoung:'Our nostalgia picks are for older children. Try Winnie the Pooh, Little Bear or Franklin in the collection below.',dub:'Woody Woodpecker language',nostalgiaGuide:'Explore the classic cartoon guide'});
  Object.assign(UI['pt-BR'],{nostalgiaTitle:'Clássicos para matar a saudade',nostalgiaSub:'Pica-Pau, DuckTales, Garfield e desenhos dos anos 50 aos 2000. Toque no título para ver onde assistir. Peça ajuda a um adulto ao abrir outro site.',nostalgiaYoung:'Estes clássicos são para crianças maiores. Explore Pooh, Little Bear e Franklin no catálogo.',dub:'Idioma do Pica-Pau',nostalgiaGuide:'Guia de desenhos clássicos'});
  Object.assign(UI.es,{nostalgiaTitle:'Clásicos para recordar',nostalgiaSub:'El Pájaro Loco, Garfield y dibujos de los años 50 a los 2000. Toca un título para ver dónde verlo. Pide ayuda a un adulto.',nostalgiaYoung:'Estos clásicos son para niños mayores. Explora Pooh, Little Bear y Franklin.',dub:'Idioma del Pájaro Loco',nostalgiaGuide:'Guía de dibujos clásicos'});
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
    {title:'SciShow Kids', year:'', type:'series', platform:'YouTube', ages:['all','6-8','9-12'], cats:['learning','animals'], desc:'Friendly science explainers built around kids’ everyday questions.', tmdb:false},
    {"title":"The Jetsons","year":"1962","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["family","funny","adventure"],"desc":"A futuristic family, flying cars and playful space-age mishaps.","tmdb":true,"note":"classic"},
    {"title":"The Yogi Bear Show","year":"1961","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["animals","funny"],"desc":"Picnic baskets, park adventures and classic bear comedy.","tmdb":true,"note":"classic"},
    {"title":"The Flintstones","year":"1960","type":"series","platform":"Regional viewing guide","ages":["all","9-12"],"cats":["family","funny"],"desc":"Stone-age family comedy for older kids to enjoy with a grown-up.","tmdb":true,"note":"classic"},
    {"title":"Scooby-Doo, Where Are You!","year":"1969","type":"series","platform":"Regional viewing guide","ages":["all","9-12"],"cats":["adventure","funny","animals"],"desc":"A friendly dog and a team of young detectives solve spooky mysteries.","tmdb":true,"note":"spooky"},
    {"title":"Schoolhouse Rock!","year":"1973","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["learning","music"],"desc":"Catchy animated songs introduce numbers, grammar, science and history.","tmdb":true,"note":"classic"},
    {"title":"The Many Adventures of Winnie the Pooh","year":"1977","type":"movie","platform":"Regional viewing guide","ages":["all","3-5","6-8"],"cats":["family","animals","bedtime"],"desc":"Honey, friendship and little adventures in the Hundred Acre Wood.","tmdb":true,"note":"peril"},
    {"title":"The Rescuers","year":"1977","type":"movie","platform":"Regional viewing guide","ages":["all","9-12"],"cats":["adventure","animals","family"],"desc":"Two brave mice team up to rescue a child in an adventurous classic.","tmdb":true,"note":"peril"},
    {"title":"The Smurfs","year":"1981","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["family","adventure"],"desc":"Little blue friends learn teamwork in a magical forest village.","tmdb":true,"note":"peril"},
    {"title":"Inspector Gadget","year":"1983","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["funny","adventure"],"desc":"A bumbling detective, a clever niece and a helpful dog solve cases.","tmdb":true,"note":"classic"},
    {"title":"DuckTales","year":"1987","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["adventure","animals","family"],"desc":"A duck family explores treasure stories and faraway adventures.","tmdb":true,"note":"peril"},
    {"title":"Chip 'n Dale Rescue Rangers","year":"1989","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["animals","adventure","funny"],"desc":"Tiny detectives tackle big mysteries with teamwork and clever inventions.","tmdb":true,"note":"peril"},
    {"title":"Disney's Adventures of the Gummi Bears","year":"1985","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["adventure","family"],"desc":"Magical bears bounce into medieval adventures and work together.","tmdb":true,"note":"peril"},
    {"title":"The Care Bears","year":"1985","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["family","adventure"],"desc":"Colorful bears share caring lessons and imaginative adventures.","tmdb":true,"note":"peril"},
    {"title":"Arthur","year":"1996","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["learning","family","funny"],"desc":"School, friendship and thoughtful everyday lessons with Arthur and friends.","tmdb":true},
    {"title":"Rugrats","year":"1991","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["funny","family","adventure"],"desc":"Imaginative baby adventures turn ordinary places into big discoveries.","tmdb":true,"note":"peril"},
    {"title":"The Magic School Bus","year":"1994","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["learning","adventure"],"desc":"A curious class takes extraordinary field trips into science.","tmdb":true},
    {"title":"Franklin","year":"1997","type":"series","platform":"Regional viewing guide","ages":["all","3-5","6-8"],"cats":["animals","family","learning"],"desc":"A young turtle learns about kindness, friendship and daily routines.","tmdb":true},
    {"title":"Little Bear","year":"1995","type":"series","platform":"Regional viewing guide","ages":["all","3-5","6-8"],"cats":["animals","bedtime","family"],"desc":"Gentle woodland stories about friendship, family and imagination.","tmdb":true},
    {"title":"Dora the Explorer","year":"2000","type":"series","platform":"Regional viewing guide","ages":["all","3-5","6-8"],"cats":["learning","adventure"],"desc":"Join Dora and Boots for map-reading, songs and friendly learning adventures.","tmdb":true},
    {"title":"Clifford the Big Red Dog","year":"2000","type":"series","platform":"Regional viewing guide","ages":["all","3-5","6-8"],"cats":["animals","family","learning"],"desc":"A very big dog and his friends practice kindness and community.","tmdb":true},
    {"title":"Kim Possible","year":"2002","type":"series","platform":"Regional viewing guide","ages":["all","9-12"],"cats":["adventure","funny"],"desc":"A resourceful teen and her friends tackle action-filled missions.","tmdb":true,"note":"peril"},
    {"title":"Phineas and Ferb","year":"2007","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["funny","adventure","music"],"desc":"Two inventive brothers fill summer days with spectacular ideas.","tmdb":true},
    {"title":"The Backyardigans","year":"2004","type":"series","platform":"Regional viewing guide","ages":["all","3-5","6-8"],"cats":["music","adventure","family"],"desc":"Backyard friends dance and sing through make-believe worlds.","tmdb":true},
    {"title":"Doc McStuffins","year":"2012","type":"series","platform":"Regional viewing guide","ages":["all","3-5","6-8"],"cats":["learning","family"],"desc":"A caring toy doctor helps friends understand health and empathy.","tmdb":true},
    {"title":"Sofia the First","year":"2013","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["family","adventure","music"],"desc":"A young princess discovers kindness, courage and magical friendships.","tmdb":true,"note":"peril"},
    {"title":"Sarah & Duck","year":"2013","type":"series","platform":"Regional viewing guide","ages":["all","3-5","6-8"],"cats":["bedtime","animals","funny"],"desc":"Quiet, quirky little adventures with Sarah and her duck friend.","tmdb":true},
    {"title":"Hilda","year":"2018","type":"series","platform":"Regional viewing guide","ages":["all","9-12"],"cats":["adventure","family"],"desc":"A brave explorer discovers folklore, friendship and magical creatures.","tmdb":true,"note":"spooky"},
    {"title":"Stillwater","year":"2020","type":"series","platform":"Regional viewing guide","ages":["all","3-5","6-8"],"cats":["bedtime","family","learning"],"desc":"A wise panda helps children find calm, perspective and kindness.","tmdb":true},
    {"title":"Ada Twist, Scientist","year":"2021","type":"series","platform":"Regional viewing guide","ages":["all","3-5","6-8"],"cats":["learning","adventure"],"desc":"Curious friends ask questions, experiment and explore everyday science.","tmdb":true},
    {"title":"Spidey and His Amazing Friends","year":"2021","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["adventure","family"],"desc":"Young heroes use teamwork to solve problems and help their community.","tmdb":true,"note":"peril"},
    {"title":"Molly of Denali","year":"2019","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["learning","adventure","family"],"desc":"An Alaska Native girl explores her community through questions and discovery.","tmdb":true},
    {"title":"The New Adventures of Winnie the Pooh","year":"1988","type":"series","platform":"Regional viewing guide","ages":["all","3-5","6-8"],"cats":["family","animals","bedtime"],"desc":"Pooh and friends enjoy warm, imaginative adventures together.","tmdb":true,"note":"peril"},
    {"title":"The Woody Woodpecker Show","year":"1957","type":"series","platform":"Regional viewing guide","ages":["all","9-12"],"cats":["animals","funny"],"desc":"Classic woodpecker slapstick from the original television collection. Older kids should watch selected shorts with a grown-up.","tmdb":true,"note":"classic"},
    {"title":"The New Woody Woodpecker Show","year":"1999","type":"series","platform":"Regional viewing guide","ages":["all","9-12"],"cats":["animals","funny"],"desc":"Woody, Chilly Willy and their friends cause playful cartoon chaos. Choose Portuguese, Spanish or English viewing links.","tmdb":true,"note":"classic"},
    {"title":"Garfield and Friends","year":"1988","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["animals","funny"],"desc":"Lasagna-loving Garfield, Odie and farmyard friends turn ordinary days into silly stories.","tmdb":true,"note":"classic"},
    {"title":"Doug","year":"1991","type":"series","platform":"Regional viewing guide","ages":["all","6-8","9-12"],"cats":["family","funny"],"desc":"An imaginative schoolboy navigates friendship, confidence and everyday school challenges.","tmdb":true,"note":"classic"},
    {"title":"Recess","year":"1997","type":"series","platform":"Regional viewing guide","ages":["all","9-12"],"cats":["family","funny","adventure"],"desc":"A group of school friends explores teamwork, fairness and playground adventures.","tmdb":true,"note":"classic"},
    {"title":"Hey Arnold!","year":"1996","type":"series","platform":"Regional viewing guide","ages":["all","9-12"],"cats":["family","funny"],"desc":"A thoughtful city kid learns about friendship, empathy and growing up in his neighborhood.","tmdb":true,"note":"classic"},
    {"title":"Ben 10","year":"2005","type":"series","platform":"Regional viewing guide","ages":["all","9-12"],"cats":["adventure"],"desc":"An alien-transforming watch turns a summer road trip into superhero rescues. Contains animated fighting.","tmdb":true,"note":"peril"},
    {"title":"Lilo & Stitch: The Series","year":"2003","type":"series","platform":"Regional viewing guide","ages":["all","9-12"],"cats":["family","adventure","funny"],"desc":"Lilo and Stitch find a home for unusual alien experiments through teamwork and family.","tmdb":true,"note":"peril"}
  ];

  Object.assign(UI.en, {
    safeBrand:'A little world of wonder', exit:'Grown-ups', kicker:'Little people. Big imaginations.', heroA:'Press play', heroB:'on wonder.', heroText:'Giggles, brave adventures and amazing discoveries. Find your next favorite in a world made just for kids.', safe1:'Handpicked, age-friendly adventures', ageAll:'All approved ages', browseTitle:'What shall we discover?', askTitle:'Dream it. Discover it.', askSub:'Animals in space? A cozy bedtime story? Tell us what sounds fun.', askButton:'Find my adventure', explore:"Let’s explore", surprise:'Surprise me', skip:'Skip to the picks', artLabel:'Your adventure starts here', featuredTitle:'A little inspiration', featuredSub:'Big smiles, tiny explorers', browseEyebrow:'Find your kind of fun', askEyebrow:'A little help choosing', askSafe:'Only picks from our approved Kids collection.', parentInfo:'A note for grown-ups', parentNote:'MatchApp helps you discover titles. Availability varies by region. External viewing sites have their own content and controls; a grown-up should help you open them. Kids Mode is a curated filter, not a parental lock.', watch:'Explore this title', watchDialogTitle:'Bring a grown-up along', watchDialogText:'You’re heading to another website. Ask a grown-up to help you find this title.', watchContinue:'Find where to watch', stay:'Keep exploring', pauseMotion:'Pause magic', resumeMotion:'Resume magic', pickCount:'adventures to explore', empty:'Try another category for more adventures.', movie:'Movie', series:'Show', music:'Music', languageLabel:'Language', categoryLabel:'Kids categories', voiceLabel:'Voice input', closeLabel:'Close', waiting:'Finding your adventure…', navHome:'Home', navFind:'Find', navClassic:'Classics'
  });
  Object.assign(UI['pt-BR'], {
    safeBrand:'Um mundinho de descobertas', exit:'Responsáveis', kicker:'Pequenos exploradores. Grandes ideias.', heroA:'Dê o play', heroB:'na imaginação.', heroText:'Risadas, aventuras e descobertas incríveis. Encontre seu próximo favorito em um mundo feito para crianças.', safe1:'Aventuras escolhidas para cada idade', ageAll:'Todas as idades aprovadas', browseTitle:'O que vamos descobrir?', askTitle:'Sonhe. Descubra.', askSub:'Animais no espaço? Uma história para dormir? Conte o que parece divertido.', askButton:'Encontrar minha aventura', explore:'Vamos explorar', surprise:'Surpreenda-me', skip:'Ir para as sugestões', artLabel:'Sua aventura começa aqui', featuredTitle:'Um pouco de inspiração', featuredSub:'Grandes sorrisos, pequenos exploradores', browseEyebrow:'Encontre sua diversão', askEyebrow:'Uma ajudinha para escolher', askSafe:'Só sugestões da coleção Kids aprovada.', parentInfo:'Um recado para responsáveis', parentNote:'O MatchApp ajuda a descobrir títulos. A disponibilidade varia por região. Sites externos têm conteúdos e controles próprios; um responsável deve ajudar a abri-los. O Modo Kids é um filtro de curadoria, não um bloqueio parental.', watch:'Explorar este título', watchDialogTitle:'Chame um responsável', watchDialogText:'Você vai abrir outro site. Peça ajuda a um responsável para encontrar este título.', watchContinue:'Encontrar onde assistir', stay:'Continuar explorando', pauseMotion:'Pausar magia', resumeMotion:'Retomar magia', pickCount:'aventuras para explorar', empty:'Tente outra categoria para encontrar aventuras.', movie:'Filme', series:'Programa', music:'Música', languageLabel:'Idioma', categoryLabel:'Categorias Kids', voiceLabel:'Entrada por voz', closeLabel:'Fechar', waiting:'Encontrando sua aventura…', navHome:'Início', navFind:'Buscar', navClassic:'Clássicos'
  });
  Object.assign(UI.es, {
    safeBrand:'Un pequeño mundo de maravillas', exit:'Adultos', kicker:'Pequeños exploradores. Grandes ideas.', heroA:'Dale play', heroB:'a la imaginación.', heroText:'Risas, aventuras y descubrimientos increíbles. Encuentra tu próximo favorito en un mundo hecho para niños.', safe1:'Aventuras elegidas para cada edad', ageAll:'Todas las edades aprobadas', browseTitle:'¿Qué vamos a descubrir?', askTitle:'Sueña. Descubre.', askSub:'¿Animales en el espacio? ¿Una historia para dormir? Dinos qué suena divertido.', askButton:'Encontrar mi aventura', explore:'Vamos a explorar', surprise:'Sorpréndeme', skip:'Ir a las recomendaciones', artLabel:'Tu aventura empieza aquí', featuredTitle:'Un poco de inspiración', featuredSub:'Grandes sonrisas, pequeños exploradores', browseEyebrow:'Encuentra tu diversión', askEyebrow:'Una ayuda para elegir', askSafe:'Solo títulos de nuestra colección Kids aprobada.', parentInfo:'Una nota para adultos', parentNote:'MatchApp ayuda a descubrir títulos. La disponibilidad varía por región. Los sitios externos tienen contenidos y controles propios; un adulto debe ayudar a abrirlos. Kids Mode es un filtro de selección, no un bloqueo parental.', watch:'Explorar este título', watchDialogTitle:'Pide ayuda a un adulto', watchDialogText:'Vas a abrir otro sitio. Pide ayuda a un adulto para encontrar este título.', watchContinue:'Ver dónde está disponible', stay:'Seguir explorando', pauseMotion:'Pausar magia', resumeMotion:'Reanudar magia', pickCount:'aventuras para explorar', empty:'Prueba otra categoría para más aventuras.', movie:'Película', series:'Programa', music:'Música', languageLabel:'Idioma', categoryLabel:'Categorías Kids', voiceLabel:'Entrada por voz', closeLabel:'Cerrar', waiting:'Buscando tu aventura…', navHome:'Inicio', navFind:'Buscar', navClassic:'Clásicos'
  });
  Object.assign(UI.en,{matchTitle:'Make a Kids match',matchText:'Pick your kind of fun. We’ll find three age-approved adventures.',mood:'What sounds fun?',format:'What shall we watch?',era:'When is it from?',anyEra:'Every decade',matchButton:'Match my adventure',matchAgain:'Find another match',matchReady:'Your Kids matches are ready!',matchEmpty:'Finding the closest age-approved adventures for these choices…',savedTitle:'My little treasure chest',savedText:'Save favorites on this device. No account needed.',savedEmpty:'Tap a heart to keep a favorite here.',save:'Save favorite',saved:'Saved favorite',search:'Find a title in our Kids collection',searchPlaceholder:'Bluey, Pooh, cartoons…',region:'Viewing region',brazil:'Brazil',usa:'United States',watchGuide:'Open this title’s viewing guide',watchFallback:'Find other viewing options',channel:'Open the official channel',watchHelp:'This guide lists viewing options for the selected region. Availability and subscriptions can change. If it has no option, try the other link.',classic:'Grown-ups: classic cartoons can include dated attitudes or slapstick. Preview together.',peril:'Grown-ups: contains mild action or moments of danger. Preview for sensitive children.',spooky:'Grown-ups: contains spooky creatures or mysteries. Preview for sensitive children.',matchFree:'Kids matching is free. Purchases are handled in the grown-ups area.'});
  Object.assign(UI['pt-BR'],{matchTitle:'Faça um match Kids',matchText:'Escolha sua diversão. Vamos encontrar três aventuras aprovadas para a idade.',mood:'O que parece divertido?',format:'O que vamos assistir?',era:'De qual época?',anyEra:'Todas as décadas',matchButton:'Encontrar meu match',matchAgain:'Encontrar outro match',matchReady:'Seus matches Kids estão prontos!',matchEmpty:'Buscando as aventuras aprovadas mais próximas destas escolhas…',savedTitle:'Meu baú de tesouros',savedText:'Guarde favoritos neste dispositivo. Não precisa de conta.',savedEmpty:'Toque no coração para guardar um favorito aqui.',save:'Guardar favorito',saved:'Favorito guardado',search:'Encontrar um título na coleção Kids',searchPlaceholder:'Bluey, Pooh, desenhos…',region:'Região de exibição',brazil:'Brasil',usa:'Estados Unidos',watchGuide:'Abrir guia deste título',watchFallback:'Encontrar outras opções',channel:'Abrir canal oficial',watchHelp:'O guia mostra opções para a região escolhida. A disponibilidade e as assinaturas podem mudar. Se não houver opções, tente o outro link.',classic:'Responsáveis: desenhos antigos podem ter atitudes datadas ou humor físico. Assistam juntos.',peril:'Responsáveis: contém ação leve ou momentos de perigo. Verifique antes para crianças sensíveis.',spooky:'Responsáveis: contém criaturas ou mistérios assustadores. Verifique antes para crianças sensíveis.',matchFree:'O match Kids é gratuito. Compras ficam na área de responsáveis.'});
  Object.assign(UI.es,{matchTitle:'Haz un match Kids',matchText:'Elige tu diversión. Encontraremos tres aventuras aprobadas para tu edad.',mood:'¿Qué suena divertido?',format:'¿Qué vamos a ver?',era:'¿De qué época?',anyEra:'Todas las décadas',matchButton:'Encontrar mi match',matchAgain:'Encontrar otro match',matchReady:'¡Tus matches Kids están listos!',matchEmpty:'Buscando las aventuras aprobadas más cercanas para estas opciones…',savedTitle:'Mi cofre de tesoros',savedText:'Guarda favoritos en este dispositivo. No necesitas cuenta.',savedEmpty:'Toca un corazón para guardar un favorito.',save:'Guardar favorito',saved:'Favorito guardado',search:'Buscar un título en la colección Kids',searchPlaceholder:'Bluey, Pooh, dibujos…',region:'Región de reproducción',brazil:'Brasil',usa:'Estados Unidos',watchGuide:'Abrir la guía de este título',watchFallback:'Encontrar otras opciones',channel:'Abrir canal oficial',watchHelp:'La guía muestra opciones para la región elegida. La disponibilidad y las suscripciones pueden cambiar. Si no hay opciones, prueba el otro enlace.',classic:'Adultos: los dibujos clásicos pueden tener actitudes anticuadas o humor físico. Mirad juntos.',peril:'Adultos: contiene acción leve o momentos de peligro. Revisa para niños sensibles.',spooky:'Adultos: contiene criaturas o misterios que pueden asustar. Revisa para niños sensibles.',matchFree:'El match Kids es gratuito. Las compras están en la zona de adultos.'});
  const keysForExtra=["explore","surprise","skip","pauseMotion","resumeMotion","closeLabel","languageLabel","nostalgiaTitle","era","anyEra","matchTitle","savedTitle","save","saved","search","region","watchGuide","watchFallback","channel","parentNote"];
  for(const [l,values] of Object.entries({"fr":["Explorer","Surprends-moi","Passer aux choix","Pause des animations","Reprendre les animations","Fermer","Langue","Favoris nostalgiques","Décennie","Toutes les décennies","Créer un match Kids","Mes favoris","Enregistrer","Enregistré","Rechercher un titre","Région de visionnage","Ouvrir le guide","Autres options","Chaîne officielle","Demandez à un adulte avant d’ouvrir un autre site. Les prix, le doublage et la disponibilité varient."],"de":["Entdecken","Überrasch mich","Zu den Tipps","Animationen pausieren","Animationen fortsetzen","Schließen","Sprache","Nostalgische Favoriten","Jahrzehnt","Alle Jahrzehnte","Kids-Match erstellen","Meine Favoriten","Speichern","Gespeichert","Titel suchen","Region zum Schauen","Übersicht öffnen","Andere Optionen","Offizieller Kanal","Bitte einen Erwachsenen um Hilfe, bevor du andere Seiten öffnest. Preise, Synchronisation und Verfügbarkeit variieren."],"it":["Esplora","Sorprendimi","Vai alle scelte","Pausa animazioni","Riprendi animazioni","Chiudi","Lingua","Preferiti nostalgici","Decennio","Tutti i decenni","Crea un match Kids","I miei preferiti","Salva","Salvato","Cerca un titolo","Regione di visione","Apri la guida","Altre opzioni","Canale ufficiale","Chiedi aiuto a un adulto prima di aprire altri siti. Prezzi, doppiaggio e disponibilità variano."],"tr":["Keşfet","Beni şaşırt","Seçimlere geç","Animasyonları duraklat","Animasyonları sürdür","Kapat","Dil","Nostaljik favoriler","On yıl","Tüm dönemler","Çocuk eşleşmesi oluştur","Favorilerim","Kaydet","Kaydedildi","Yapım ara","İzleme bölgesi","Rehberi aç","Diğer seçenekler","Resmî kanal","Başka siteyi açmadan önce bir yetişkinden yardım iste. Fiyat, dublaj ve erişim değişebilir."],"ru":["Исследовать","Удиви меня","К подборке","Остановить анимацию","Возобновить анимацию","Закрыть","Язык","Любимая классика","Десятилетие","Все десятилетия","Детский подбор","Мои любимые","Сохранить","Сохранено","Найти произведение","Регион просмотра","Открыть обзор","Другие варианты","Официальный канал","Попроси взрослого помочь открыть другой сайт. Цены, дубляж и доступность могут меняться."],"ar":["استكشف","فاجئني","انتقل إلى الاختيارات","إيقاف الحركة","استئناف الحركة","إغلاق","اللغة","كلاسيكيات محبوبة","العقد","كل العقود","اختيار للأطفال","مفضلاتي","حفظ","محفوظ","ابحث عن عمل","منطقة المشاهدة","افتح الدليل","خيارات أخرى","القناة الرسمية","اطلب مساعدة شخص بالغ قبل فتح موقع آخر. قد تختلف الأسعار والدبلجة والتوفر."],"hi":["खोजें","मुझे चौंकाएँ","सुझावों पर जाएँ","एनिमेशन रोकें","एनिमेशन जारी करें","बंद करें","भाषा","पुराने पसंदीदा","दशक","सभी दशक","बच्चों का मैच बनाएँ","मेरे पसंदीदा","सहेजें","सहेजा गया","शीर्षक खोजें","देखने का क्षेत्र","जानकारी खोलें","अन्य विकल्प","आधिकारिक चैनल","दूसरी साइट खोलने से पहले बड़े की मदद लें। कीमत, डबिंग और उपलब्धता बदल सकती हैं।"],"id":["Jelajahi","Kejutkan aku","Ke pilihan","Jeda animasi","Lanjutkan animasi","Tutup","Bahasa","Favorit nostalgia","Dekade","Semua dekade","Buat match anak","Favoritku","Simpan","Tersimpan","Cari judul","Wilayah tontonan","Buka panduan","Pilihan lainnya","Kanal resmi","Minta bantuan orang dewasa sebelum membuka situs lain. Harga, sulih suara dan ketersediaan dapat berubah."],"ja":["探検しよう","おまかせ","おすすめへ","アニメーションを止める","アニメーションを再開","閉じる","言語","懐かしいお気に入り","年代","すべての年代","キッズマッチを作る","お気に入り","保存","保存済み","作品を検索","視聴する地域","ガイドを開く","ほかの選択肢","公式チャンネル","別のサイトを開くときは大人に手伝ってもらおう。料金、吹替、配信状況は変わることがあります。"],"ko":["탐험하기","깜짝 추천","추천으로 이동","애니메이션 멈춤","애니메이션 재개","닫기","언어","추억의 즐겨찾기","시대","모든 시대","키즈 매치 만들기","내 즐겨찾기","저장","저장됨","작품 검색","시청 지역","안내 열기","다른 선택","공식 채널","다른 사이트를 열기 전에 어른에게 도움을 요청하세요. 가격, 더빙과 제공 여부는 달라질 수 있어요."],"zh":["开始探索","随机推荐","跳到推荐","暂停动画","继续动画","关闭","语言","怀旧佳作","年代","所有年代","创建儿童匹配","我的收藏","收藏","已收藏","搜索作品","观看地区","打开指南","其他选项","官方频道","打开其他网站前请向大人求助。价格、配音和可用性可能变化。"]})){const u=UI[l];keysForExtra.forEach((k,i)=>u[k]=values[i]);Object.assign(u,{artLabel:u.browseTitle,featuredTitle:u.browseTitle,featuredSub:u.askSub,browseEyebrow:u.browseTitle,askEyebrow:u.askTitle,askSafe:u.safeNote,parentInfo:u.trust1Title,watchDialogTitle:u.trust1Title,watchDialogText:u.parentNote,watchContinue:u.watch,stay:u.explore,pickCount:u.browseTitle,empty:u.noMatch,categoryLabel:u.browseTitle,voiceLabel:u.askTitle,waiting:u.askTitle,nostalgiaSub:u.parentNote,nostalgiaYoung:u.safeNote,dub:u.languageLabel,nostalgiaGuide:u.nostalgiaTitle,matchText:u.askSub,mood:u.askSub,format:u.browseTitle,matchButton:u.askButton,matchAgain:u.askButton,matchReady:u.answer,matchEmpty:u.noMatch,savedText:u.savedTitle,savedEmpty:u.save,searchPlaceholder:'Bluey, Pooh…',watchHelp:u.parentNote,classic:u.safeNote,peril:u.safeNote,spooky:u.safeNote,matchFree:u.safeNote});u.brazil=new Intl.DisplayNames([l],{type:'region'}).of('BR');u.usa=new Intl.DisplayNames([l],{type:'region'}).of('US');}
  const localizedTypes={"en":["Movie","Show","Music"],"pt-BR":["Filme","Programa","Música"],"es":["Película","Programa","Música"],"fr":["Film","Émission","Musique"],"de":["Film","Sendung","Musik"],"it":["Film","Programma","Musica"],"tr":["Film","Program","Müzik"],"ru":["Фильм","Передача","Музыка"],"ar":["فيلم","برنامج","موسيقى"],"hi":["फ़िल्म","कार्यक्रम","संगीत"],"id":["Film","Acara","Musik"],"ja":["映画","番組","音楽"],"ko":["영화","프로그램","음악"],"zh":["电影","节目","音乐"]};
  for(const [locale,values] of Object.entries(localizedTypes))Object.assign(UI[locale],{movie:values[0],series:values[1],music:values[2]});
  const read = (key) => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  let requestVersion = 0;
  let chatPicks = [];
  let motionPaused = read('match_kids_pause_motion') === 'true';
  let lang = 'en';
  let category = 'all';
  let matchPicks = [];
  let previousMatch = [];
  const SAVED_KEY = 'match_kids_saved_titles';
  let savedTitles;
  try { const raw = JSON.parse(read(SAVED_KEY) || '[]'); savedTitles = new Set(Array.isArray(raw) ? raw.filter(x => typeof x === 'string').slice(0,100) : []); }
  catch (_) { savedTitles = new Set(); }

  function normalizeLang(v) {
    if (!v) return 'en';
    if (v.toLowerCase().startsWith('pt')) return 'pt-BR';
    const base = v.toLowerCase().split('-')[0];
    return UI[v] ? v : (UI[base] ? base : 'en');
  }

  function tr(key) { return (UI[lang] && UI[lang][key]) || UI.en[key] || key; }

  Object.assign(UI.en,{voiceOn:'Hear me',voiceOff:'Voice off'});
  Object.assign(UI['pt-BR'],{voiceOn:'Ouvir',voiceOff:'Mudo',navHome:'Início',navFind:'Buscar',navClassic:'Clássicos'});
  Object.assign(UI.es,{voiceOn:'Escuchar',voiceOff:'Silencio',navHome:'Inicio',navFind:'Buscar',navClassic:'Clásicos'});
  Object.assign(UI.fr,{navHome:'Accueil',navFind:'Chercher',navClassic:'Classiques',voiceOn:'Écouter',voiceOff:'Muet'});
  Object.assign(UI.de,{navHome:'Start',navFind:'Suchen',navClassic:'Klassiker',voiceOn:'Hören',voiceOff:'Stumm'});

  const matchCopy={
    en:{resultTitle:'Your next adventure',matchFree:'Opening a title uses one match from your account, or your daily guest allowance. Watching, sharing and saving this result do not use another match.',opening:'Getting your adventure ready…',quotaEmpty:'All your matches are used for today. Ask a grown-up to help with your account, or come back tomorrow.',quotaError:'We could not check your matches. Please try again.',quotaUsed:'1 match used',synopsis:'The story',share:'Share this adventure',copy:'Copy link',copied:'Link copied!',saveLater:'Watch later',seenIt:'Seen it',lovedIt:'Loved it',notForMe:'Not for me',historySaved:'Saved to your history.',historyError:'Could not save this choice. Please try again.',sameCriteria:'Another with these choices',newCriteria:'Choose a new adventure',account:'Grown-ups: account & matches'},
    'pt-BR':{resultTitle:'Sua próxima aventura',matchFree:'Abrir um título usa um match da sua conta ou da cota diária de visitante. Assistir, compartilhar e salvar este resultado não usam outro match.',opening:'Preparando sua aventura…',quotaEmpty:'Seus matches de hoje acabaram. Peça ajuda a um adulto com sua conta ou volte amanhã.',quotaError:'Não foi possível verificar seus matches. Tente novamente.',quotaUsed:'1 match usado',synopsis:'A história',share:'Compartilhar esta aventura',copy:'Copiar link',copied:'Link copiado!',saveLater:'Assistir depois',seenIt:'Já assisti',lovedIt:'Adorei',notForMe:'Não é pra mim',historySaved:'Salvo no seu histórico.',historyError:'Não foi possível salvar. Tente novamente.',sameCriteria:'Outra com estas escolhas',newCriteria:'Escolher uma nova aventura',account:'Adultos: conta e matches'},
    es:{resultTitle:'Tu próxima aventura',matchFree:'Abrir un título usa un match de tu cuenta o de tu cupo diario de visitante. Ver, compartir y guardar este resultado no usa otro match.',opening:'Preparando tu aventura…',quotaEmpty:'Usaste tus matches de hoy. Pide ayuda a un adulto con tu cuenta o vuelve mañana.',quotaError:'No pudimos comprobar tus matches. Inténtalo de nuevo.',quotaUsed:'1 match usado',synopsis:'La historia',share:'Compartir esta aventura',copy:'Copiar enlace',copied:'¡Enlace copiado!',saveLater:'Ver después',seenIt:'Ya lo vi',lovedIt:'Me encantó',notForMe:'No es para mí',historySaved:'Guardado en tu historial.',historyError:'No se pudo guardar. Inténtalo de nuevo.',sameCriteria:'Otro con estas opciones',newCriteria:'Elegir una nueva aventura',account:'Adultos: cuenta y matches'}
  };
  Object.entries(matchCopy).forEach(([locale,copy])=>Object.assign(UI[locale],copy));
  Object.entries(window.KidsMatchCopy||{}).forEach(([locale,copy])=>Object.assign(UI[locale],copy));
  let openingMatch=false, matchedUserId=null, currentWatchShared=false, pendingKidsShareNetwork='';

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
    clearChat(); updateMotion(); renderChips(); renderGrid(); renderFeatured();renderNostalgia(); renderMatchControls(); renderMatchResults(); renderSaved();
    if(currentWatchItem)paintMatch(currentWatchItem);
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
  let posterWindow = Date.now(), posterCount = 0, posterTimer = null;

  function fetchPoster(item) {
    if (posterRequests.has(item.title)) return posterRequests.get(item.title);
    const pending = new Promise(resolve => { posterQueue.push({item, resolve}); pumpPosters(); });
    posterRequests.set(item.title, pending);
    return pending;
  }
  function pumpPosters() {
    if (Date.now()-posterWindow >= 60000) { posterWindow=Date.now();posterCount=0; }
    if (posterCount >= 48 && posterQueue.length) {
      if(!posterTimer)posterTimer=setTimeout(()=>{posterTimer=null;pumpPosters();},Math.max(1,60000-(Date.now()-posterWindow)));
      return;
    }
    while (activePosters < 4 && posterQueue.length && posterCount < 48) {
      const {item, resolve} = posterQueue.shift(); activePosters++; if(item.tmdb!==false)posterCount++;
      Promise.resolve().then(async () => {
        if (item.tmdb === false || typeof window.tmdbLookup !== 'function') return null;
        const kind = item.type === 'movie' ? 'movie' : 'tv';
        const r = await window.tmdbLookup(item.title, {year:item.year, kind, lang:'en-US'});
        if (!r || r.adult === true || r.kind !== kind) return null;
        if (![r.title,r.originalTitle].some(name => normalizeTitle(name) === normalizeTitle(item.title))) return null;
        if (item.year && (!r.year || Math.abs(Number(r.year) - Number(item.year)) > 1)) return null;
        const source = r.posterLarge || r.poster;
        if (!source || !/^https:\/\/image\.tmdb\.org\/t\/p\//.test(source)) return null;
        return r;
      }).catch(() => null).then(resolve).finally(() => { activePosters--; pumpPosters(); });
    }
  }

  const officialChannels = {'Pocoyo':'https://www.youtube.com/@pocoyo','Super Simple Songs':'https://www.youtube.com/@SuperSimpleSongs','The Wiggles':'https://www.youtube.com/@thewiggles','Cosmic Kids Yoga':'https://www.youtube.com/@CosmicKidsYoga','SciShow Kids':'https://www.youtube.com/@SciShowKids'};
  const woodyChannels={pt:'https://www.youtube.com/channel/UCiFg-2CjsG_xcSsHNjDeLpw',es:'https://www.youtube.com/channel/UCHtZ2_7hd1zy9aCqrrcaqcQ',en:'https://www.youtube.com/channel/UCB2aeGGPNj7l5Z71bYNqX-Q'};
  const isWoody=item=>item.title.includes('Woody Woodpecker');
  let backupArtwork={};
  const backupArtworkReady=(typeof fetch==='function'?fetch('/kids/artwork.json?v=5'):Promise.resolve(null)).then(r=>r?.ok?r.json():null).then(data=>{backupArtwork=data?.titles||{};}).catch(()=>{});
  let watchLinks = {};
  let currentWatchItem = null;
  let watchOpener = null;
  (typeof fetch==='function'?fetch('/kids/watch-links.json?v=5'):Promise.resolve(null)).then(r=>r?.ok?r.json():null).then(data=>{watchLinks=data?.titles||{};if(currentWatchItem)renderWatchLinks();updateDirectLinks();}).catch(()=>{});
  function watchFallback(item) { return 'https://www.google.com/search?q='+encodeURIComponent('where to watch '+item.title+' '+item.year+' '+(document.getElementById('kids-watch-region')?.value==='BR'?'Brasil':'United States')); }
  function watchUrl(item) {
    if(isWoody(item))return woodyChannels[document.getElementById('kids-watch-dub')?.value] || woodyChannels.en;
    if (officialChannels[item.title]) return officialChannels[item.title];
    const region = document.getElementById('kids-watch-region')?.value || 'US';
    const entry = watchLinks[slug(item)], value = entry?.regions?.[region];
    if (entry?.title === item.title && String(entry.year) === item.year && entry.type === item.type && typeof value === 'string' && new RegExp('^https://www\\.justwatch\\.com/'+region.toLowerCase()+'/(tv-show|serie|movie|filme)/[a-z0-9-]+$').test(value)) return value;
    return watchFallback(item);
  }
  function renderWatchLinks() {
    const item=currentWatchItem;if(!item||!allowedForAge(item,currentAge()))return;
    const link=document.getElementById('kids-watch-continue');link.href=watchUrl(item);link.textContent=tr(officialChannels[item.title]?'channel':link.href.includes('justwatch.com')?'watchGuide':'watchFallback');
    document.getElementById('kids-watch-fallback').href=watchFallback(item);
    document.getElementById('kids-watch-note').textContent=item.note?tr(item.note):'';
  }

  function cardHTML(item, compact, slot) {
    const id = 'kid-' + slot + '-' + slug(item);
    const title = escapeHTML(item.title);
    const ages = item.ages.filter(a => a !== 'all').join(' · ');
    return '<article class="kids-card" data-title="' + title + '"><button type="button" class="kids-card-poster" aria-label="' + title + '"><div class="kids-cover-underlay" aria-hidden="true"><span>' + icons[item.cats[0]] + '</span><strong>' + title + '</strong></div><img id="' + id + '" src="' + makePoster(item) + '" alt="' + title + '" width="600" height="900" loading="lazy" decoding="async"><span class="kids-card-badge">' + ages + '</span></button><div class="kids-card-body"><h3><a class="kids-title-link" data-title-watch="'+slug(item)+'" href="#kids-watch-dialog">' + title + '</a></h3><div class="kids-card-meta"><span>' + escapeHTML(tr(item.type)) + '</span><span>' + escapeHTML(item.year) + '</span><button class="kids-heart" type="button" data-save="'+slug(item)+'" aria-pressed="'+savedTitles.has(slug(item))+'" aria-label="'+escapeHTML(tr(savedTitles.has(slug(item))?'saved':'save')+': '+item.title)+'">'+(savedTitles.has(slug(item))?'♥':'♡')+'</button></div>' + (compact ? '' : '<p>' + escapeHTML(description(item)) + '</p>') + (item.note ? '<p class="kids-title-note">'+escapeHTML(tr(item.note))+'</p>' : '') + '<button class="kids-watch" type="button" data-watch="' + slug(item) + '" aria-label="' + escapeHTML(tr('watch') + ': ' + item.title) + '">' + escapeHTML(tr('watch')) + ' <span aria-hidden="true">↗</span></button></div></article>';
  }

  const captionCallbacks = new WeakMap();
  const captionObserver = typeof IntersectionObserver==='function' ? new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){captionObserver.unobserve(e.target);captionCallbacks.get(e.target)?.();captionCallbacks.delete(e.target);}}),{rootMargin:'900px 200px'}) : null;
  function localizeCaption(item,img,record) {
    if(!record||!window.localizedTitle)return;
    const selectedLanguage=lang;
    const paint=async()=>{const name=await window.localizedTitle(item.title,{year:item.year,record});if(!img.isConnected||lang!==selectedLanguage)return;
      const card=img.closest('.kids-card'),feature=img.closest('.kids-feature');
      if(card){card.querySelector('h3 a').textContent=name;img.alt=name;card.querySelector('[data-watch]').setAttribute('aria-label',tr('watch')+': '+name);card.querySelector('[data-save]').setAttribute('aria-label',tr(savedTitles.has(slug(item))?'saved':'save')+': '+name);}
      if(feature)feature.querySelector('strong').textContent=name;
    };
    if(captionObserver){captionCallbacks.set(img,paint);captionObserver.observe(img);}else paint();
  }
  async function hydratePoster(item, slot) {
    const img = document.getElementById('kid-' + slot + '-' + slug(item));
    if (!img) return;
    img.onerror = () => { img.onerror = null; img.style.visibility = 'hidden'; };
    const lookup = fetchPoster(item);
    // The registry was itself built through the secure proxy; it keeps every
    // verified cover visible while fresh lookups respect the proxy rate limit.
    await backupArtworkReady;
    const cached=backupArtwork[slug(item)];
    if(img.isConnected && cached?.title===item.title && String(cached.year)===item.year && cached.type===item.type && typeof cached.poster==='string' && /^https:\/\/(static\.tvmaze\.com|is[1-5]-ssl\.mzstatic\.com|image\.tmdb\.org)\//.test(cached.poster)){
      img.onerror=()=>{img.onerror=null;img.src=makePoster(item);};img.src=cached.poster;
    }
    const r = await lookup;
    if (!img.isConnected) return;
    localizeCaption(item,img,r);
    if (!r) {
      const entry=backupArtwork[slug(item)];
      if(entry?.title===item.title && String(entry.year)===item.year && typeof entry.poster==='string' && /^https:\/\/(static\.tvmaze\.com|is[1-5]-ssl\.mzstatic\.com|image\.tmdb\.org)\//.test(entry.poster)) {
        img.onerror=()=>{img.onerror=null;img.src=makePoster(item);};img.src=entry.poster;
      }
      return;
    }
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

  function updateDirectLinks(){
    document.querySelectorAll('[data-title-watch]').forEach(link=>link.href='#kids-watch-dialog');
  }
  function renderNostalgia(){
    const host=document.getElementById('kids-nostalgia');if(!host)return;
    const names=['The Woody Woodpecker Show','The New Woody Woodpecker Show','Garfield and Friends','DuckTales','Doug','Recess','Hey Arnold!','Ben 10','Lilo & Stitch: The Series','The Magic School Bus','Chip \'n Dale Rescue Rangers','The Jetsons'];
    const picks=names.map(name=>LIBRARY.find(i=>i.title===name)).filter(i=>i && allowedForAge(i,currentAge()));
    host.innerHTML=picks.map(i=>cardHTML(i,false,'nostalgia')).join('') || '<p>'+escapeHTML(tr('nostalgiaYoung'))+'</p>';
    picks.forEach(i=>hydratePoster(i,'nostalgia'));updateDirectLinks();
  }
  function renderFeatured() {
    const host = document.getElementById('kids-featured'); if (!host) return;
    const pool = allowedLibrary(currentAge());
    const picks = [pool[0], pool.find(x => x.cats.includes('learning') && x !== pool[0]), pool.find(x => x.cats.includes('adventure') && x !== pool[0])].filter(Boolean);
    host.innerHTML = picks.map((x,i) => '<a href="#browse" class="kids-feature" data-feature="' + slug(x) + '"><img id="kid-feature-' + i + '-' + slug(x) + '" src="' + makePoster(x) + '" alt="" width="600" height="900"><span><strong>' + escapeHTML(x.title) + '</strong><small>' + escapeHTML(categoryLabel(x.cats[0])) + ' · ' + escapeHTML(tr(x.type)) + '</small></span><span class="kids-feature-arrow" aria-hidden="true">→</span></a>').join('');
    picks.forEach((x,i) => hydratePoster(x, 'feature-' + i));
  }

  function description(item) {
    if (lang === 'en') return item.desc;
    const translated = window.KidsDescriptions?.[lang]?.[item.title];
    // Localized, specific catalog facts remain useful offline without showing English.
    return translated || [item.title, item.year, tr(item.type), ...item.cats.map(categoryLabel)].filter(Boolean).join(' · ');
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
    const search=normalizeTitle(document.getElementById('kids-search')?.value || ''),era=document.getElementById('kids-era')?.value || 'all';
    const items = allowedLibrary(currentAge()).filter(x => (category === 'all' || x.cats.includes(category)) && normalizeTitle(x.title).includes(search) && (era==='all' || Math.floor(Number(x.year)/10)*10===Number(era)));
    host.innerHTML = items.map((x,i) => cardHTML(x, false, 'grid-' + i)).join('');
    host.querySelectorAll('.kids-card').forEach((el,i) => el.style.setProperty('--card-order', Math.min(i,7)));
    document.getElementById('kids-grid-status').textContent = items.length ? items.length + ' ' + tr('pickCount') : tr('empty');
    items.forEach((x,i) => hydratePoster(x, 'grid-' + i));
  }

  function renderMatchControls() {
    const mood=document.getElementById('kids-match-mood');if(mood){const value=mood.value||'all';mood.innerHTML=Object.keys(icons).map(key=>'<option value="'+key+'">'+icons[key]+' '+escapeHTML(categoryLabel(key))+'</option>').join('');mood.value=value;}
  }
  function renderCards(hostId,items,slot) {
    const host=document.getElementById(hostId);if(!host)return;
    const safe=items.filter(x=>allowedForAge(x,currentAge()));
    host.innerHTML=safe.map((x,i)=>cardHTML(x,false,slot+'-'+i)).join('');safe.forEach((x,i)=>hydratePoster(x,slot+'-'+i));
  }
  function renderMatchResults() {
    matchPicks=matchPicks.filter(x=>allowedForAge(x,currentAge()));
    renderCards('kids-match-results',matchPicks,'match');
    document.getElementById('kids-match-status').textContent=matchPicks.length?tr('matchReady'):'';
  }
  function clearMatch() { matchPicks=[];renderMatchResults(); }
  async function makeKidsMatch() {
    if(openingMatch)return;
    try{await window.KidsAccount?.prepare();}catch(_){document.getElementById('kids-match-status').textContent=tr('quotaError');return;}
    const mood=document.getElementById('kids-match-mood').value,format=document.getElementById('kids-match-format').value,era=document.getElementById('kids-match-era').value;
    const safePool=allowedLibrary(currentAge());
    const fits=(item,stage)=>{
      if(stage.mood&&mood!=='all'&&!item.cats.includes(mood))return false;
      if(stage.format&&format!=='all'&&item.type!==format)return false;
      if(stage.era&&era!=='all'&&Math.floor(Number(item.year)/10)*10!==Number(era))return false;
      return true;
    };
    // Age approval is NEVER relaxed. Secondary taste constraints are widened
    // only as needed so a valid Kids selection can never end in a dead-end.
    const stages=[
      {mood:true,format:true,era:true},
      {mood:true,format:true,era:false},
      {mood:true,format:false,era:false},
      {mood:false,format:true,era:false},
      {mood:false,format:false,era:false}
    ];
    const chosen=[],seen=new Set();
    for(const stage of stages){
      const source=safePool.filter(item=>
        fits(item,stage) &&
        !seen.has(slug(item)) &&
        !window.matchPolicy?.known().has(window.matchPolicy.key(item.title))
      );
      const ranked=source.map(item=>({item,score:(previousMatch.includes(item.title)?0:2)+Math.random()})).sort((a,b)=>b.score-a.score);
      for(const row of ranked){
        const key=slug(row.item);if(seen.has(key))continue;seen.add(key);chosen.push(row.item);if(chosen.length>=3)break;
      }
      if(chosen.length>=3)break;
    }
    // Final invariant: if any age-approved titles exist, fill remaining slots
    // from that same safe pool. This is intentionally after the staged search:
    // mood/format/era are preferences; age approval is the hard boundary.
    if(chosen.length<Math.min(3,safePool.length)){
      const remainder=safePool.filter(item=>
          !seen.has(slug(item)) &&
          !window.matchPolicy?.known().has(window.matchPolicy.key(item.title))
        )
        .map(item=>({item,score:(previousMatch.includes(item.title)?0:2)+Math.random()}))
        .sort((a,b)=>b.score-a.score);
      for(const row of remainder){
        const key=slug(row.item);if(seen.has(key))continue;seen.add(key);chosen.push(row.item);
        if(chosen.length>=Math.min(3,safePool.length))break;
      }
    }
    matchPicks=chosen.slice(0,3);previousMatch=matchPicks.map(x=>x.title);
    renderMatchResults();
    document.getElementById('kids-match-status').textContent=matchPicks.length?tr('matchReady'):tr('noMatch');
    document.getElementById('kids-match-submit').textContent=tr('matchAgain');
    if(matchPicks.length)await openWatch(slug(matchPicks[0]),document.getElementById('kids-match-submit'));
  }
  function renderSaved() {
    const picks=allowedLibrary(currentAge()).filter(x=>savedTitles.has(slug(x)));
    renderCards('kids-saved-results',picks,'saved');
    document.getElementById('kids-saved-empty').hidden=picks.length>0;
  }
  function toggleSaved(key) {
    const item=allowedLibrary(currentAge()).find(x=>slug(x)===key);if(!item)return;
    if(savedTitles.has(key))savedTitles.delete(key);else savedTitles.add(key);
    // Persist only keys of curated titles, never arbitrary content from storage.
    savedTitles=new Set(LIBRARY.filter(x=>savedTitles.has(slug(x))).map(slug));write(SAVED_KEY,JSON.stringify([...savedTitles]));
    document.querySelectorAll('[data-save]').forEach(button=>{const saved=savedTitles.has(button.dataset.save);const entry=LIBRARY.find(x=>slug(x)===button.dataset.save);button.textContent=saved?'♥':'♡';button.setAttribute('aria-pressed',String(saved));button.setAttribute('aria-label',tr(saved?'saved':'save')+': '+entry.title);});
    const removingFocused=document.activeElement?.closest('#kids-saved-results');renderSaved();if(removingFocused)document.getElementById('kids-saved-title').focus();
  }

  function queryTokens(q) {
    return normalizeTitle(q).split(/\s+/).filter(w => w.length > 2);
  }

  function localMatch(question, age) {
    const tokens = queryTokens(question);
    const known=window.matchPolicy?.known?.()||new Set();
    const pool = allowedLibrary(age).filter(item=>!known.has(window.matchPolicy?.key?.(item.title)||normalizeTitle(item.title)));
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
    const known=window.matchPolicy?.known?.()||new Set();
    chatPicks = (aiApproved.length ? aiApproved : localMatch(question.trim(), age)).filter(x =>
      byTitle.get(normalizeTitle(x.title)) === x &&
      allowedForAge(x, currentAge()) &&
      !known.has(window.matchPolicy?.key?.(x.title)||normalizeTitle(x.title))
    );
    const lead = chatPicks[0];
    const syn = lead && String(lead.synopsis || '').replace(/\s+/g, ' ').trim();
    answer.textContent = chatPicks.length
      ? (syn ? lead.title + ' — ' + syn : lead.title)
      : tr('noMatch');
    results.innerHTML = chatPicks.map((x,i) => cardHTML(x, true, 'chat-' + i)).join('');
    chatPicks.forEach((x,i) => hydratePoster(x, 'chat-' + i));
    send.disabled = false; form.setAttribute('aria-busy', 'false');
    chat.scrollIntoView({behavior: reducedMotion() ? 'auto' : 'smooth', block:'nearest'});
  }

  let kidsCelebrateTimer=0,kidsCelebratePopTimer=0;
  function clearKidsCelebrate(){
    clearTimeout(kidsCelebrateTimer);clearTimeout(kidsCelebratePopTimer);
    kidsCelebrateTimer=0;kidsCelebratePopTimer=0;
    document.querySelectorAll('.kids-celebrate').forEach(el=>el.remove());
  }
  function playKidsCelebrate(){
    clearKidsCelebrate();
    if(reducedMotion())return;
    const layer=document.createElement('div');
    layer.className='kids-celebrate';
    layer.setAttribute('aria-hidden','true');
    const compact=matchMedia('(max-width: 820px)').matches || document.documentElement.classList.contains('matchapp-android');
    const confetti=document.createElement('div'); confetti.className='kids-confetti';
    const colors=['#ffcf72','#9ee8e6','#ffabcb','#ffffff','#b48cff','#7dffb3','#ff8a5c'];
    const confettiCount=compact?10:16;
    for(let i=0;i<confettiCount;i++){
      const bit=document.createElement('i');
      bit.style.setProperty('--x',(Math.random()*100)+'vw');
      bit.style.setProperty('--delay',(Math.random()*0.24)+'s');
      bit.style.setProperty('--rot',(Math.random()*360)+'deg');
      bit.style.setProperty('--c',colors[i%colors.length]);
      bit.style.setProperty('--w',(6+Math.random()*6)+'px');
      bit.style.setProperty('--h',(8+Math.random()*8)+'px');
      bit.style.setProperty('--dur',(0.85+Math.random()*0.4)+'s');
      bit.style.setProperty('--drift',((Math.random()*54)-27)+'px');
      confetti.appendChild(bit);
    }
    const balloons=document.createElement('div'); balloons.className='kids-balloons';
    const balloonColors=['#ff6b9d','#ffcf72','#6ecbff','#b48cff','#7dffb3','#ff8a5c'];
    const balloonCount=compact?3:4;
    for(let i=0;i<balloonCount;i++){
      const b=document.createElement('span');
      b.className='kids-balloon';
      b.style.setProperty('--x',(8+i*(84/Math.max(1,balloonCount-1)))+'vw');
      b.style.setProperty('--delay',(0.05*i)+'s');
      b.style.setProperty('--c',balloonColors[i%balloonColors.length]);
      b.innerHTML='<b></b><em></em>';
      balloons.appendChild(b);
    }
    layer.appendChild(confetti);layer.appendChild(balloons);document.body.appendChild(layer);
    kidsCelebratePopTimer=setTimeout(()=>{if(layer.isConnected)layer.classList.add('is-popping');},700);
    kidsCelebrateTimer=setTimeout(clearKidsCelebrate,1120);
  }
  function reducedMotion() { return motionPaused || document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function updateMotion() {
    document.body.classList.toggle('kids-paused', motionPaused);
    const b = document.getElementById('kids-motion');
    if (b) {
      const label = tr(motionPaused ? 'resumeMotion' : 'pauseMotion');
      b.setAttribute('aria-pressed', String(motionPaused));
      b.setAttribute('aria-label', label);
      const text = b.querySelector('[data-motion-label]');
      if (text) {
        text.textContent = label;
        text.dataset.k = motionPaused ? 'resumeMotion' : 'pauseMotion';
      }
    }
  }
  function highlightTitle(key) {
    const item = allowedLibrary(currentAge()).find(x => slug(x) === key);
    if (!item) return;
    category='all';document.getElementById('kids-search').value='';document.getElementById('kids-era').value='all';renderChips();renderGrid();
    const card = [...document.querySelectorAll('#kids-grid .kids-card')].find(el => el.dataset.title === item.title);
    card?.scrollIntoView({behavior:reducedMotion() ? 'auto' : 'smooth', block:'center'});
    card?.classList.add('is-surprise'); card?.querySelector('button')?.focus({preventScroll:true});
    setTimeout(() => card?.classList.remove('is-surprise'), 2200);
  }
  function paintMatch(item){
    document.getElementById('kids-watch-name').textContent=item.title;
    const sourceCategories=item.cats.map(categoryLabel).filter(Boolean).join(' · ');
    document.getElementById('kids-match-detail').innerHTML='<div class="kids-result-art"><img id="kid-detail-'+slug(item)+'" src="'+makePoster(item)+'" width="600" height="900" alt="'+escapeHTML(item.title)+'"></div><div><p class="kids-result-meta">'+escapeHTML([item.year,tr(item.type),sourceCategories,tr('quotaUsed')].filter(Boolean).join(' · '))+'</p><h3>'+escapeHTML(tr('synopsis'))+'</h3><p>'+escapeHTML(description(item))+'</p><p class="kids-title-note">'+escapeHTML(item.note?tr(item.note):'')+'</p></div>';
    hydratePoster(item,'detail');renderWatchLinks();
    const shareLink='https://matchapp.tv/kids/?title='+encodeURIComponent(slug(item));
    document.getElementById('kids-share-link').value=shareLink;
  }
  async function openWatch(key,opener) {
    const item = allowedLibrary(currentAge()).find(x => slug(x) === key); if (!item) return;
    const dialog = document.getElementById('kids-watch-dialog');
    if(openingMatch || (dialog.open && currentWatchItem===item))return;
    openingMatch=true;const band=currentAge();const status=document.getElementById('kids-match-status');status.textContent=tr('opening');
    document.getElementById('kids-match-submit').disabled=true;
    try{
      if(!window.KidsAccount)throw Error('connection');
      const result=await window.KidsAccount.consume(()=>band===currentAge());
      if(!result.allowed){status.textContent=tr('quotaEmpty');document.getElementById('kids-account-help').hidden=false;status.scrollIntoView({block:'center'});return;}
      if(band!==currentAge() || !allowedForAge(item,currentAge()))return;
      matchedUserId=result.userId;currentWatchItem=item;currentWatchShared=false;pendingKidsShareNetwork='';watchOpener=opener;paintMatch(item);document.querySelectorAll('[data-match-choice]').forEach(button=>button.disabled=false);
      const shareConfirm=document.getElementById('kids-share-confirm');if(shareConfirm)shareConfirm.hidden=true;
      document.getElementById('kids-result-status').textContent='';
      document.getElementById('kids-rematch-actions').hidden=true;
      status.textContent=tr('quotaUsed');
      // Open the usable result first. Celebration is decorative and must never
      // block the result, input, timers or Android WebView rendering.
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
        dialog.scrollTop=0;
      } else {
        dialog.setAttribute('open','');
        dialog.scrollIntoView({behavior:reducedMotion()?'auto':'smooth',block:'start'});
      }
      // Persist every actual shown Match. Guests keep this locally; signed-in
      // families also sync through the shared private portfolio history.
      window.matchPolicy?.remember({title:item.title,posterUrl:makePoster(item),streamUrl:watchUrl(item)},'shown');
      document.dispatchEvent(new CustomEvent('matchapp:kids-result',{detail:{title:item.title}}));
      // Wait one paint before decorative effects so the usable result wins the
      // frame. This avoids stacking modal/backdrop/layout work in one task.
      requestAnimationFrame(()=>{ if(dialog.open&&currentWatchItem===item) playKidsCelebrate(); });
    }catch(_){clearKidsCelebrate();status.textContent=tr('quotaError');status.scrollIntoView({block:'center'});}
    finally{openingMatch=false;document.getElementById('kids-match-submit').disabled=false;}
  }

  async function saveMatchChoice(action,button){
    const item=currentWatchItem;if(!item||button.disabled)return;
    button.disabled=true;const status=document.getElementById('kids-result-status');
    try{
      const poster=document.getElementById('kid-detail-'+slug(item));
      await window.KidsAccount.remember({title:item.title,posterUrl:poster?.currentSrc||makePoster(item),streamUrl:watchUrl(item)},action,matchedUserId);
      status.textContent=tr('historySaved');document.getElementById('kids-rematch-actions').hidden=false;
      if(action==='save'){savedTitles.add(slug(item));write(SAVED_KEY,JSON.stringify([...savedTitles]));renderSaved();}
    }catch(_){status.textContent=tr('historyError');button.disabled=false;}
  }
  async function awardKidsShareReward(){
    const status=document.getElementById('kids-result-status');
    if(currentWatchShared)return;
    try{
      const reward=await window.KidsAccount?.claimShareReward?.();
      if(reward?.granted){
        currentWatchShared=true;
        const balance=Math.max(0,Number(reward.purchased_matches??reward.matches)||0);
        status.textContent=tr('shareReward').replace('{count}',String(balance));
      }else if(reward?.reason==='window_full'){
        status.textContent=tr('shareLimit');
      }else status.textContent=tr('quotaError');
    }catch(_){status.textContent=tr('quotaError');}
  }
  async function shareMatch(copyOnly){
    if(!currentWatchItem)return;
    const url=document.getElementById('kids-share-link').value;
    const text=currentWatchItem.title+' · '+description(currentWatchItem)+' #MatchAppTVAi #KidsMode';
    const status=document.getElementById('kids-result-status');
    try{
      if(!copyOnly&&navigator.share){
        await navigator.share({title:currentWatchItem.title,text,url});
        await awardKidsShareReward();
      }else{
        await navigator.clipboard.writeText(text+' '+url);
        status.textContent=tr('copied');
      }
    }
    catch(e){if(e.name!=='AbortError'){const field=document.getElementById('kids-share-link');field.hidden=false;field.focus();field.select();status.textContent=tr('quotaError');}}
  }
  function shareKidsTo(network){
    if(!currentWatchItem)return;
    const url=document.getElementById('kids-share-link').value;
    const text=currentWatchItem.title+' · '+description(currentWatchItem)+' #MatchAppTVAi #KidsMode';
    const encodedUrl=encodeURIComponent(url),encodedText=encodeURIComponent(text);
    const targets={
      whatsapp:'https://wa.me/?text='+encodeURIComponent(text+' '+url),
      facebook:'https://www.facebook.com/sharer/sharer.php?u='+encodedUrl,
      x:'https://twitter.com/intent/tweet?text='+encodedText+'&url='+encodedUrl,
      telegram:'https://t.me/share/url?url='+encodedUrl+'&text='+encodedText
    };
    const target=targets[network];if(!target)return;
    pendingKidsShareNetwork=network;
    window.open(target,'_blank','noopener,noreferrer');
    const confirm=document.getElementById('kids-share-confirm');
    if(confirm)confirm.hidden=false;
    const status=document.getElementById('kids-result-status');
    if(status)status.textContent=tr('shareFinish');
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
  }

  function boot() {
    write(MODE_KEY, 'true');
    const params = new URLSearchParams(location.search);
    const requested = read(LANG_KEY) || params.get('lang') || navigator.language || 'en';
    const age = read(AGE_KEY) || 'all';
    const ageSelect = document.getElementById('kids-age'); if (ageSelect) ageSelect.value = ['all','3-5','6-8','9-12'].includes(age) ? age : 'all';
    const region=read('match_kids_watch_region');const country=String(read('match_user_country')||'').toLowerCase();
    document.getElementById('kids-watch-region').value=['BR','US'].includes(region)?region:(/brasil|brazil|^br$/.test(country)||normalizeLang(requested)==='pt-BR'?'BR':'US');
    setLanguage(requested);

    document.getElementById('kids-lang')?.addEventListener('change', e => setLanguage(e.target.value));
    document.getElementById('kids-exit')?.addEventListener('click', exitKids);
    ageSelect?.addEventListener('change', () => { write(AGE_KEY, ageSelect.value); clearChat();clearMatch(); document.getElementById('kids-watch-dialog')?.close?.(); renderChips();renderGrid(); renderFeatured();renderNostalgia();renderSaved(); });
    document.getElementById('kids-match-form').addEventListener('submit',event=>{event.preventDefault();makeKidsMatch();});
    document.querySelectorAll('#kids-match-form select').forEach(select=>select.addEventListener('change',clearMatch));
    document.getElementById('kids-search').addEventListener('input',renderGrid);
    document.getElementById('kids-era').addEventListener('change',renderGrid);
    document.getElementById('kids-watch-region').addEventListener('change',event=>{write('match_kids_watch_region',event.target.value);renderWatchLinks();updateDirectLinks();});
    document.getElementById('kids-ask-form')?.addEventListener('submit', e => { e.preventDefault(); askKids(document.getElementById('kids-question')?.value || ''); });

    if (typeof window.initVoiceInput === 'function') {
      try { window.initVoiceInput('kids-question','kids-mic', () => document.getElementById('kids-ask-form')?.requestSubmit()); } catch (_) {}
    }
    updateMotion();
    document.getElementById('kids-watch-dub')?.addEventListener('change',event=>{write('match_kids_dub',event.target.value);updateDirectLinks();renderWatchLinks();});
    const residence=(read('match_user_country') || '').toLowerCase();
    const dub=document.getElementById('kids-watch-dub');
    if(dub)dub.value=read('match_kids_dub') || (/brasil|brazil|portugal|^br$|^pt$/.test(residence) || lang==='pt-BR'?'pt':/spain|espa|mex|argentin|colomb|chile|peru|uruguay|ecuador|venezuela/.test(residence) || lang==='es'?'es':'en');
    updateDirectLinks();
    document.getElementById('kids-motion')?.addEventListener('click', () => { motionPaused = !motionPaused; write('match_kids_pause_motion', String(motionPaused)); updateMotion(); });
    document.getElementById('kids-surprise')?.addEventListener('click', () => { const pool = allowedLibrary(currentAge()).filter(item=>!window.matchPolicy?.known().has(window.matchPolicy.key(item.title))); if (pool.length)openWatch(slug(pool[Math.floor(Math.random()*pool.length)]),document.getElementById('kids-surprise')); });
    document.addEventListener('click', event => {
      const choice=event.target.closest('[data-match-choice]');if(choice){saveMatchChoice(choice.dataset.matchChoice,choice);return;}
      const save=event.target.closest('[data-save]');if(save){toggleSaved(save.dataset.save);return;}
      const title=event.target.closest('[data-feature],[data-watch],[data-title-watch],.kids-card-poster');
      if(title){event.preventDefault();const item=title.closest('.kids-card')?.dataset.title;openWatch(title.dataset.feature||title.dataset.watch||title.dataset.titleWatch||slug(LIBRARY.find(x=>x.title===item)),title);}
    });
    document.getElementById('kids-share').addEventListener('click',()=>shareMatch(false));
    document.getElementById('kids-copy').addEventListener('click',()=>shareMatch(true));
    document.querySelectorAll('[data-kids-social]').forEach(button=>button.addEventListener('click',()=>shareKidsTo(button.dataset.kidsSocial)));
    document.getElementById('kids-share-confirm')?.addEventListener('click',async()=>{
      if(!pendingKidsShareNetwork)return;
      pendingKidsShareNetwork='';
      document.getElementById('kids-share-confirm').hidden=true;
      await awardKidsShareReward();
    });
    document.getElementById('kids-rematch-same').addEventListener('click',()=>{document.getElementById('kids-watch-dialog').close();makeKidsMatch();});
    document.getElementById('kids-rematch-new').addEventListener('click',()=>{document.getElementById('kids-watch-dialog').close();document.getElementById('kids-match-form').scrollIntoView({block:'center'});document.getElementById('kids-match-mood').focus();});
    window.KidsAccount?.prepare().catch(()=>{});
    const sharedTitle=params.get('title');if(sharedTitle)highlightTitle(sharedTitle);
    document.getElementById('kids-watch-dialog').addEventListener('close',()=>{clearKidsCelebrate();currentWatchItem=null;currentWatchShared=false;pendingKidsShareNetwork='';const confirm=document.getElementById('kids-share-confirm');if(confirm)confirm.hidden=true;watchOpener?.focus({preventScroll:true});});
    addEventListener('pagehide',clearKidsCelebrate);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKidsCelebrate();});
    document.addEventListener('keydown', remoteNavigation);
    document.addEventListener('visibilitychange', () => document.body.classList.toggle('kids-hidden', document.hidden));
  }

  window.KidsVoiceLabel = function(key){ return tr(key); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
