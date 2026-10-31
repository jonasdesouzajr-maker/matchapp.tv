/* Authored reference Explore labels. Locale is owned by the existing language
   system; this layer never changes locale, routes, quotas or AI state. */
(function () {
  'use strict';
  var keys = ['title','intro','explore','awaited','premiere','weekly','curated','books','recipes','news','events','taylor','ask','more','guide','guideIntro','askDescription'];
  var copy = {
    en: ['Explore more','Discover stories, people and experiences worth your time.','Explore Now','Most Awaited','Premiere guide','Week Top Choice','Curated for you','Books','Recipes','News','Events','Taylor','Ask AI','More to discover','Your guide to MatchApp Ai','Find your next film, book, recipe or experience. Open a topic to explore, or ask Jonas for a little inspiration.','Discover with Jonas.'],
    pt: ['Explore mais','Descubra histórias, pessoas e experiências que valem seu tempo.','Explore agora','Mais aguardado','Guia de estreia','Escolha da semana','Selecionado para você','Livros','Receitas','Notícias','Eventos','Taylor','Pergunte à IA','Mais para descobrir','Seu guia do MatchApp Ai','Encontre seu próximo filme, livro, receita ou experiência. Explore um tema ou peça uma inspiração ao Jonas.','Descubra com Jonas.'],
    es: ['Explora más','Descubre historias, personas y experiencias que merecen tu tiempo.','Explora ahora','Lo más esperado','Guía del estreno','Elección semanal','Elegido para ti','Libros','Recetas','Noticias','Eventos','Taylor','Pregunta a la IA','Más por descubrir','Tu guía de MatchApp Ai','Encuentra tu próxima película, libro, receta o experiencia. Explora un tema o pide inspiración a Jonas.','Descubre con Jonas.'],
    fr: ['Explorer plus','Découvrez des histoires, des personnes et des expériences qui en valent la peine.','Explorer','Les plus attendus','Guide de la première','Choix de la semaine','Sélection pour vous','Livres','Recettes','Actualités','Événements','Taylor','Demander à l’IA','À découvrir aussi','Votre guide MatchApp Ai','Trouvez votre prochain film, livre, recette ou expérience. Explorez un thème ou demandez de l’inspiration à Jonas.','Découvrez avec Jonas.'],
    de: ['Mehr entdecken','Entdecke Geschichten, Menschen und Erlebnisse, die deine Zeit wert sind.','Jetzt entdecken','Sehnsüchtig erwartet','Premierenführer','Tipp der Woche','Für dich ausgewählt','Bücher','Rezepte','Nachrichten','Events','Taylor','KI fragen','Noch mehr entdecken','Dein MatchApp Ai Wegweiser','Finde deinen nächsten Film, dein nächstes Buch, Rezept oder Erlebnis. Entdecke ein Thema oder lass dich von Jonas inspirieren.','Entdecke mit Jonas.'],
    it: ['Esplora altro','Scopri storie, persone ed esperienze che meritano il tuo tempo.','Esplora ora','I più attesi','Guida alla prima','Scelta settimanale','Scelto per te','Libri','Ricette','Notizie','Eventi','Taylor','Chiedi all’IA','Altro da scoprire','La tua guida a MatchApp Ai','Trova il prossimo film, libro, ricetta o esperienza. Esplora un argomento o chiedi un po’ di ispirazione a Jonas.','Scopri con Jonas.'],
    tr: ['Daha fazlası','Zamanınıza değer hikâyeleri, insanları ve deneyimleri keşfedin.','Şimdi keşfet','En çok beklenen','Prömiyer rehberi','Haftanın seçimi','Sizin için seçildi','Kitaplar','Tarifler','Haberler','Etkinlikler','Taylor','Yapay zekâya sor','Keşfedilecek daha çok şey','MatchApp Ai rehberiniz','Bir sonraki filminizi, kitabınızı, tarifinizi veya deneyiminizi bulun. Bir konuyu keşfedin ya da Jonas’tan ilham alın.','Jonas ile keşfet.'],
    ru: ['Откройте больше','Откройте истории, людей и впечатления, достойные вашего времени.','Открыть','Самое ожидаемое','Гид по премьере','Выбор недели','Подобрано для вас','Книги','Рецепты','Новости','События','Тейлор','Спросить ИИ','Ещё больше открытий','Ваш гид по MatchApp Ai','Найдите следующий фильм, книгу, рецепт или впечатление. Откройте тему или попросите Йонаса о вдохновении.','Открывайте с Йонасом.'],
    ar: ['اكتشف المزيد','اكتشف قصصاً وأشخاصاً وتجارب تستحق وقتك.','اكتشف الآن','الأكثر ترقباً','دليل العرض الأول','اختيار الأسبوع','مختار لك','كتب','وصفات','أخبار','فعاليات','تايلور','اسأل الذكاء الاصطناعي','المزيد لاكتشافه','دليلك إلى MatchApp Ai','اعثر على فيلمك أو كتابك أو وصفتك أو تجربتك التالية. استكشف موضوعاً أو اطلب الإلهام من جوناس.','اكتشف مع جوناس.'],
    hi: ['और खोजें','अपने समय के योग्य कहानियाँ, लोग और अनुभव खोजें।','अभी खोजें','सबसे प्रतीक्षित','प्रीमियर गाइड','इस हफ़्ते की पसंद','आपके लिए चुना गया','किताबें','व्यंजन','समाचार','कार्यक्रम','टेलर','एआई से पूछें','और भी खोजें','आपकी MatchApp Ai गाइड','अपनी अगली फ़िल्म, किताब, रेसिपी या अनुभव खोजें। कोई विषय खोलें या जोनास से प्रेरणा लें।','जोनास के साथ खोजें।'],
    id: ['Jelajahi lainnya','Temukan kisah, orang, dan pengalaman yang layak untuk waktu Anda.','Jelajahi sekarang','Paling dinanti','Panduan penayangan','Pilihan minggu ini','Dipilih untuk Anda','Buku','Resep','Berita','Acara','Taylor','Tanya AI','Lebih banyak pilihan','Panduan MatchApp Ai Anda','Temukan film, buku, resep, atau pengalaman berikutnya. Jelajahi topik atau minta inspirasi dari Jonas.','Jelajahi bersama Jonas.'],
    ja: ['もっと見る','あなたの時間を豊かにする物語、人々、体験を見つけましょう。','今すぐ探す','注目の新作','プレミアガイド','今週のおすすめ','あなたへのセレクション','本','レシピ','ニュース','イベント','テイラー','AIに聞く','さらに発見する','MatchApp Ai ガイド','次の映画、本、レシピ、体験を見つけましょう。テーマを探したり、ジョナスにヒントを聞いたりできます。','ジョナスと発見する。'],
    ko: ['더 둘러보기','당신의 시간을 채울 이야기, 사람, 경험을 발견하세요.','지금 둘러보기','가장 기대되는 작품','첫 공개 안내','이번 주의 선택','당신을 위한 추천','책','레시피','뉴스','행사','테일러','AI에게 묻기','더 많은 발견','MatchApp Ai 안내','다음 영화, 책, 레시피, 경험을 찾아보세요. 주제를 둘러보거나 조나스에게 영감을 얻으세요.','조나스와 발견하기.'],
    zh: ['探索更多','发现值得花时间的故事、人物和体验。','立即探索','最受期待','首映指南','本周精选','为你精选','书籍','食谱','新闻','活动','泰勒','问 AI','发现更多精彩','你的 MatchApp Ai 指南','寻找下一部电影、一本书、一份食谱或一次体验。探索主题，或向乔纳斯寻求灵感。','与乔纳斯一起探索。']
  };
  var extraCopy = {
    en:{friends:'Friends',donate:'Help me grow the business'},pt:{friends:'Amigos',donate:'Ajude meu negócio a crescer'},
    es:{friends:'Amigos',donate:'Ayúdame a hacer crecer mi negocio'},fr:{friends:'Amis',donate:'Aidez-moi à développer mon activité'},
    de:{friends:'Freunde',donate:'Hilf mir, mein Unternehmen auszubauen'},it:{friends:'Amici',donate:'Aiutami a far crescere la mia attività'},
    tr:{friends:'Arkadaşlar',donate:'İşimi büyütmeme destek ol'},ru:{friends:'Друзья',donate:'Помогите мне развивать своё дело'},
    ar:{friends:'الأصدقاء',donate:'ساعدني على تنمية مشروعي'},hi:{friends:'दोस्त',donate:'मेरा व्यवसाय बढ़ाने में मदद करें'},
    id:{friends:'Teman',donate:'Bantu saya mengembangkan usaha ini'},ja:{friends:'友達',donate:'事業の成長を応援する'},
    ko:{friends:'친구',donate:'사업 성장을 응원해 주세요'},zh:{friends:'好友',donate:'助我发展这项事业'}
  };
  function locale() {
    var chosen = String(window.MATCH_LANG || document.documentElement.lang || 'en').toLowerCase().split('-')[0];
    return Object.prototype.hasOwnProperty.call(copy, chosen) ? chosen : null;
  }
  function paint() {
    var lang = locale();
    if (!lang || !document.body.classList.contains('page-explore')) return;
    var row = copy[lang];
    document.querySelectorAll('[data-ref-explore]').forEach(function (node) {
      var key = node.getAttribute('data-ref-explore');
      var index = keys.indexOf(key);
      var text = index !== -1 ? row[index] : extraCopy[lang][key];
      if (text && node.textContent !== text) node.textContent = text;
    });
    // Existing hub localization owns the title and language selector.
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint, {once:true});
  else paint();
  document.addEventListener('matchapp:langchange', paint);
  window.addEventListener('matchapp:languagechange', paint);
  window.addEventListener('languagechange', paint);
  document.addEventListener('change', function (event) {
    if (event.target && event.target.closest && event.target.closest('#lang-switcher-host')) queueMicrotask(paint);
  });
})();