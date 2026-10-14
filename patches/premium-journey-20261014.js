/* Interactive, accessible MatchApp Ai Field Guide. No backend or API requests. */
(function(){'use strict';
var dictionary={"en":{"h":"Find Your Next Experience","deck":"A beautiful world of discovery, without a maze of tools. Follow the journey to explore every part of MatchApp, then return Home to make your next match.","prev":"← Previous","next":"Next discovery →","home":"Find Your Next Experience","soundOff":"Sound off","soundOn":"Sound on","stops":"discoveries","pace":"Explore at your own pace","head":"YOUR JOURNEY","hint":"Explore a chapter, then move to the next.","finish":"Ready to find your next match?","finNote":"Go back Home, explore the latest titles, or choose your mood and let MatchApp help.","titles":["Start at Home","Top Titles","Your streaming match","Your match results","Premieres and this week's pick","Discover with Jonas","Explore Worlds","Music and official videos","Books, audiobooks and magazines","Cooking discoveries","News, events and awareness","Match Together and Friends","Profile, saved picks and plans","Your next experience awaits"],"visitLabel":"Open this experience","related":{"weekly":"Weekly choice","events":"Events","awareness":"Awareness","friends":"Friends","plans":"Plans & credits"}},"pt-BR":{"h":"Encontre Sua Próxima Experiência","deck":"Um universo de descobertas, sem menus complicados. Conheça cada experiência do MatchApp Ai e volte à página inicial para encontrar seu próximo match.","prev":"← Voltar","next":"Próxima descoberta →","home":"Encontrar minha próxima experiência","soundOff":"Som desligado","soundOn":"Som ligado","stops":"descobertas","pace":"Explore no seu ritmo","head":"SUA JORNADA","hint":"Descubra um capítulo e avance quando quiser.","finish":"Pronto para encontrar seu próximo match?","finNote":"Volte ao início, explore os títulos em alta ou escolha seu humor para encontrar algo especial.","titles":["Comece na página inicial","Títulos em alta","Seu match de streaming","Seus resultados","Estreias e escolha da semana","Descubra com Jonas","Explorar mundos","Música e vídeos oficiais","Livros, audiolivros e revistas","Descobertas culinárias","Notícias, eventos e conscientização","Match Together e amigos","Perfil, salvos e planos","Sua próxima experiência começa agora"],"summary":["A página inicial reúne as novidades, a busca por filmes e séries, a estreia em destaque e a escolha da semana. Tudo sem excesso de opções.","Percorra os pôsteres de filmes, séries e vídeos musicais oficiais selecionados. Toque em um título para saber mais sobre ele.","Escolha formato, humor e plataforma. Os critérios ajudam a procurar filmes e séries que combinem com o que você pediu.","Leia sinopse e informações, confira onde assistir no seu país, salve, descarte ou compartilhe. As plataformas variam por região.","Veja uma estreia em destaque e a escolha da semana, com contexto e opções para saber mais antes de assistir.","Converse com Jonas por texto ou voz, quando disponível, para explorar títulos, criadores e ideias. A informação deve ser verificável.","O botão Explorar, ao lado do Perfil, abre áreas específicas para música, livros, notícias, culinária, eventos e outras descobertas.","Visite a área de música para descobrir clipes oficiais, artistas e paradas com datas e fontes identificadas.","Encontre obras para ler ou ouvir. Confira título, autor e fontes oficiais; edições não confirmadas não aparecem como disponíveis.","Descubra receitas, ideias de pratos e vídeos culinários com fontes identificadas sem misturar com sua busca por filmes.","Consulte notícias nos veículos originais, eventos com datas e programas oficiais, além de conteúdos de conscientização confiáveis.","O Match Together combina preferências de duas pessoas. Amigos é uma área independente para explorar conexões e compartilhamentos.","No Perfil, usuários conectados podem encontrar salvos, histórico, preferências e informações sobre créditos e planos.","Agora é com você: volte à página inicial, escolha um humor ou passe pelos títulos até encontrar algo para aproveitar."],"visitLabel":"Explorar esta experiência","related":{"weekly":"Escolha da semana","events":"Eventos","awareness":"Conscientização","friends":"Amigos","plans":"Planos e créditos"}},"es":{"h":"Encuentra Tu Próxima Experiencia","deck":"Un mundo de descubrimientos sin menús complicados. Recorre las experiencias de MatchApp Ai y vuelve al inicio para encontrar tu próximo match.","prev":"← Anterior","next":"Siguiente descubrimiento →","home":"Encontrar mi próxima experiencia","soundOff":"Sonido apagado","soundOn":"Sonido activado","stops":"descubrimientos","pace":"Explora a tu ritmo","head":"TU RECORRIDO","hint":"Explora una etapa y sigue cuando quieras.","finish":"¿Listo para encontrar tu próximo match?","finNote":"Vuelve al inicio, descubre novedades o elige tu estado de ánimo para encontrar algo especial.","titles":["Empieza en Inicio","Títulos destacados","Tu match de streaming","Tus resultados","Estrenos y elección semanal","Descubre con Jonas","Explorar mundos","Música y vídeos oficiales","Libros, audiolibros y revistas","Descubrimientos de cocina","Noticias, eventos y conciencia","Match Together y Amigos","Perfil, guardados y planes","Tu próxima experiencia te espera"],"summary":["Inicio reúne títulos recientes, búsqueda de películas y series, estrenos y la selección semanal en una sola pantalla.","Desliza los carteles de películas, series y vídeos musicales oficiales seleccionados, y abre uno para obtener detalles.","Elige formato, ánimo y plataforma para orientar la búsqueda de películas y series a tus preferencias.","Consulta sinopsis y opciones según tu país. Guarda, descarta o comparte recomendaciones; la disponibilidad depende del proveedor.","Descubre el estreno destacado y la selección de la semana, con detalles para saber si te interesan.","Conversa con Jonas por texto o voz cuando esté disponible para descubrir títulos e ideas. Las fuentes deben verificarse.","El botón Explorar junto al Perfil abre destinos para música, libros, cocina, noticias, eventos y más.","Encuentra artistas, listas con fechas y enlaces a vídeos musicales oficiales identificados.","Busca libros, audiolibros y revistas por título y autor, con ediciones y tiendas verificadas cuando existan.","Descubre platos, recetas y vídeos de cocina con fuentes visibles, sin mezclarlos con las recomendaciones de películas.","Lee noticias de sus editores originales y descubre eventos fechados e información de conciencia de fuentes fiables.","Match Together combina preferencias de dos personas. Amigos es un espacio separado para conexiones y compartir.","Consulta guardados, historial, preferencias, créditos y planes desde tu Perfil al iniciar sesión.","Regresa al inicio, elige un ánimo o explora los carteles hasta encontrar tu próxima experiencia."],"visitLabel":"Explorar esta experiencia","related":{"weekly":"Elección de la semana","events":"Eventos","awareness":"Concienciación","friends":"Amigos","plans":"Planes y créditos"}},"fr":{"h":"Trouvez Votre Prochaine Expérience","deck":"Un univers de découvertes, sans menus compliqués. Découvrez les expériences MatchApp Ai, puis revenez à l'accueil pour votre prochaine sélection.","prev":"← Précédent","next":"Découverte suivante →","home":"Trouver ma prochaine expérience","soundOff":"Son coupé","soundOn":"Son activé","stops":"découvertes","pace":"Explorez à votre rythme","head":"VOTRE PARCOURS","hint":"Découvrez chaque étape, puis continuez.","finish":"Prêt pour votre prochaine découverte ?","finNote":"Retournez à l'accueil, explorez les nouveautés ou choisissez votre humeur.","titles":["Commencer à l'accueil","Titres du moment","Votre sélection streaming","Vos résultats","Premières et choix de la semaine","Découvrir avec Jonas","Explorer les univers","Musique et vidéos officielles","Livres, audiobooks et magazines","Découvertes culinaires","Actualités, événements et sensibilisation","Match Together et amis","Profil, favoris et offres","Votre prochaine expérience vous attend"],"visitLabel":"Explorer cette expérience","related":{"weekly":"Sélection de la semaine","events":"Événements","awareness":"Sensibilisation","friends":"Amis","plans":"Offres et crédits"}},"de":{"h":"Entdecke Dein Nächstes Erlebnis","deck":"Eine Welt voller Entdeckungen ohne komplizierte Menüs. Lerne die MatchApp Ai Erlebnisse kennen und kehre für dein nächstes Match zur Startseite zurück.","prev":"← Zurück","next":"Nächste Entdeckung →","home":"Mein nächstes Erlebnis finden","soundOff":"Ton aus","soundOn":"Ton an","stops":"Entdeckungen","pace":"Entdecke in deinem Tempo","head":"DEINE REISE","hint":"Entdecke einen Abschnitt nach dem anderen.","finish":"Bereit für dein nächstes Match?","finNote":"Zurück zur Startseite: Entdecke neue Titel oder wähle deine Stimmung.","titles":["Auf der Startseite beginnen","Aktuelle Top-Titel","Dein Streaming-Match","Deine Ergebnisse","Premieren und Wochenfavorit","Mit Jonas entdecken","Welten erkunden","Musik und offizielle Videos","Bücher, Hörbücher und Magazine","Kulinarische Entdeckungen","Nachrichten, Events und Awareness","Match Together und Freunde","Profil, Merkliste und Tarife","Dein nächstes Erlebnis wartet"],"visitLabel":"Erlebnis öffnen","related":{"weekly":"Wochenfavorit","events":"Events","awareness":"Aufklärung","friends":"Freunde","plans":"Tarife und Guthaben"}},"it":{"h":"Trova La Tua Prossima Esperienza","deck":"Un mondo di scoperte, senza menu complicati. Esplora MatchApp Ai e torna alla pagina iniziale per trovare il tuo prossimo match.","prev":"← Indietro","next":"Prossima scoperta →","home":"Trova la prossima esperienza","soundOff":"Audio spento","soundOn":"Audio attivo","stops":"scoperte","pace":"Esplora con calma","head":"IL TUO PERCORSO","hint":"Scopri ogni tappa e continua quando vuoi.","finish":"Pronto per il prossimo match?","finNote":"Torna all'inizio, esplora le novità o scegli il tuo umore.","titles":["Inizia dalla Home","Titoli del momento","Il tuo match streaming","I tuoi risultati","Prime visioni e scelta settimanale","Scopri con Jonas","Esplora mondi","Musica e video ufficiali","Libri, audiolibri e riviste","Scoperte in cucina","Notizie, eventi e consapevolezza","Match Together e amici","Profilo, salvati e piani","La prossima esperienza ti aspetta"],"visitLabel":"Esplora questa esperienza","related":{"weekly":"Scelta della settimana","events":"Eventi","awareness":"Sensibilizzazione","friends":"Amici","plans":"Piani e crediti"}},"tr":{"h":"Sıradaki Deneyimini Keşfet","deck":"Karmaşık menüler olmadan bir keşif dünyası. MatchApp Ai deneyimlerini tanı ve bir sonraki eşleşmen için ana sayfaya dön.","prev":"← Önceki","next":"Sonraki keşif →","home":"Sıradaki deneyimimi bul","soundOff":"Ses kapalı","soundOn":"Ses açık","stops":"keşif","pace":"Kendi hızında keşfet","head":"YOLCULUĞUN","hint":"Adımları keşfet ve ilerle.","finish":"Sıradaki eşleşmene hazır mısın?","finNote":"Ana sayfaya dön, yeni başlıklara göz at veya ruh halini seç.","titles":["Ana sayfadan başla","Popüler başlıklar","Yayın eşleşmen","Eşleşme sonuçların","Prömiyerler ve haftanın seçimi","Jonas ile keşfet","Dünyaları keşfet","Müzik ve resmî videolar","Kitaplar, sesli kitaplar ve dergiler","Yemek keşifleri","Haberler, etkinlikler ve farkındalık","Match Together ve arkadaşlar","Profil, kayıtlılar ve planlar","Yeni deneyimin seni bekliyor"],"visitLabel":"Bu deneyimi keşfet","related":{"weekly":"Haftanın seçimi","events":"Etkinlikler","awareness":"Farkındalık","friends":"Arkadaşlar","plans":"Planlar ve krediler"}},"ru":{"h":"Найдите Новое Впечатление","deck":"Мир открытий без сложных меню. Исследуйте возможности MatchApp Ai и вернитесь на главную за следующим совпадением.","prev":"← Назад","next":"Следующее открытие →","home":"Найти следующее впечатление","soundOff":"Звук выключен","soundOn":"Звук включён","stops":"открытий","pace":"Исследуйте в своём темпе","head":"ВАШ МАРШРУТ","hint":"Узнайте о каждом разделе и продолжайте.","finish":"Готовы к новому совпадению?","finNote":"Вернитесь на главную, посмотрите новинки или выберите настроение.","titles":["Начните с главной","Популярные произведения","Ваш стриминговый матч","Результаты подбора","Премьеры и выбор недели","Открывайте с Йонасом","Исследуйте миры","Музыка и официальные видео","Книги, аудиокниги и журналы","Кулинарные открытия","Новости, события и просвещение","Match Together и друзья","Профиль, избранное и тарифы","Следующее открытие ждёт вас"],"visitLabel":"Открыть этот раздел","related":{"weekly":"Выбор недели","events":"События","awareness":"Просвещение","friends":"Друзья","plans":"Тарифы и кредиты"}},"ar":{"h":"اكتشف تجربتك القادمة","deck":"عالم من الاكتشافات دون قوائم معقدة. تعرّف على تجارب MatchApp Ai ثم عد إلى الصفحة الرئيسية للعثور على اختيارك التالي.","prev":"→ السابق","next":"الاكتشاف التالي ←","home":"اكتشف تجربتي القادمة","soundOff":"الصوت مغلق","soundOn":"الصوت يعمل","stops":"اكتشافات","pace":"استكشف بالوتيرة التي تناسبك","head":"رحلتك","hint":"تعرّف على كل خطوة ثم تابع.","finish":"هل أنت مستعد لاختيارك التالي؟","finNote":"عد إلى الرئيسية، تصفح العناوين الجديدة أو اختر مزاجك.","titles":["ابدأ من الرئيسية","أبرز العناوين","اختيار البث المناسب","نتائج المطابقة","العروض الأولى واختيار الأسبوع","اكتشف مع جوناس","استكشف العوالم","الموسيقى والفيديوهات الرسمية","الكتب والكتب الصوتية والمجلات","اكتشافات الطبخ","الأخبار والفعاليات والتوعية","Match Together والأصدقاء","الملف والمحفوظات والخطط","تجربتك القادمة بانتظارك"],"visitLabel":"استكشف هذه التجربة","related":{"weekly":"اختيار الأسبوع","events":"الفعاليات","awareness":"التوعية","friends":"الأصدقاء","plans":"الخطط والأرصدة"}},"hi":{"h":"अपना अगला अनुभव खोजें","deck":"बिना उलझे मेनू के मनोरंजन खोजने की दुनिया। MatchApp Ai की जगहें देखें और अगला मैच पाने के लिए होम पर लौटें।","prev":"← पिछला","next":"अगली खोज →","home":"अगला अनुभव खोजें","soundOff":"आवाज़ बंद","soundOn":"आवाज़ चालू","stops":"खोजें","pace":"अपनी गति से देखें","head":"आपकी यात्रा","hint":"हर पड़ाव देखें और आगे बढ़ें।","finish":"अगले मैच के लिए तैयार हैं?","finNote":"होम पर लौटें, नए शीर्षक देखें या अपना मूड चुनें।","titles":["होम से शुरू करें","टॉप शीर्षक","आपका स्ट्रीमिंग मैच","आपके मैच के नतीजे","प्रीमियर और सप्ताह की पसंद","जोनास के साथ खोजें","दुनिया एक्सप्लोर करें","संगीत और आधिकारिक वीडियो","किताबें, ऑडियोबुक और पत्रिकाएँ","खाना पकाने की खोजें","समाचार, कार्यक्रम और जागरूकता","Match Together और दोस्त","प्रोफ़ाइल, सेव और प्लान","अगला अनुभव आपका इंतज़ार कर रहा है"],"visitLabel":"यह अनुभव देखें","related":{"weekly":"सप्ताह की पसंद","events":"कार्यक्रम","awareness":"जागरूकता","friends":"दोस्त","plans":"प्लान और क्रेडिट"}},"id":{"h":"Temukan Pengalaman Berikutnya","deck":"Dunia penemuan tanpa menu rumit. Jelajahi MatchApp Ai lalu kembali ke Beranda untuk menemukan match berikutnya.","prev":"← Sebelumnya","next":"Penemuan berikutnya →","home":"Temukan pengalaman berikutnya","soundOff":"Suara mati","soundOn":"Suara aktif","stops":"penemuan","pace":"Jelajahi sesukamu","head":"PERJALANANMU","hint":"Jelajahi setiap tahap lalu lanjutkan.","finish":"Siap untuk match berikutnya?","finNote":"Kembali ke Beranda, jelajahi judul baru, atau pilih suasana hati.","titles":["Mulai dari Beranda","Judul terpopuler","Match streamingmu","Hasil match","Premiere dan pilihan minggu ini","Jelajahi bersama Jonas","Jelajahi dunia","Musik dan video resmi","Buku, buku audio, dan majalah","Penemuan memasak","Berita, acara, dan kesadaran","Match Together dan Teman","Profil, simpanan, dan paket","Pengalaman baru menunggumu"],"visitLabel":"Jelajahi pengalaman ini","related":{"weekly":"Pilihan minggu ini","events":"Acara","awareness":"Kesadaran","friends":"Teman","plans":"Paket dan kredit"}},"ja":{"h":"次の体験を見つけよう","deck":"複雑な操作なしで、エンタメの世界を発見。MatchApp Ai の各機能を知り、ホームで次のお気に入りを見つけましょう。","prev":"← 前へ","next":"次の発見 →","home":"次の体験を見つける","soundOff":"サウンドオフ","soundOn":"サウンドオン","stops":"の発見","pace":"自分のペースで探索","head":"ガイド","hint":"各ステップを見て次へ進みましょう。","finish":"次のお気に入りを探しますか？","finNote":"ホームに戻り、新着作品や今の気分から探しましょう。","titles":["ホームからスタート","注目のタイトル","あなたの配信マッチ","マッチ結果","プレミアと今週のおすすめ","ジョナスと発見する","世界を探索","音楽と公式動画","本・オーディオブック・雑誌","料理の発見","ニュース・イベント・啓発","Match Together と友達","プロフィール・保存・プラン","次の体験が待っています"],"visitLabel":"この体験を見る","related":{"weekly":"今週のおすすめ","events":"イベント","awareness":"啓発情報","friends":"友達","plans":"プランとクレジット"}},"ko":{"h":"다음 경험을 찾아보세요","deck":"복잡한 메뉴 없이 즐기는 발견의 세계. MatchApp Ai의 모든 공간을 둘러보고 홈으로 돌아가 다음 매치를 찾아보세요.","prev":"← 이전","next":"다음 발견 →","home":"다음 경험 찾기","soundOff":"소리 끄기","soundOn":"소리 켜기","stops":"개의 발견","pace":"내 속도로 둘러보기","head":"나의 여정","hint":"각 단계를 살펴보고 계속하세요.","finish":"다음 매치를 찾을 준비가 됐나요?","finNote":"홈으로 돌아가 새로운 작품을 살펴보거나 기분을 선택하세요.","titles":["홈에서 시작","인기 타이틀","나만의 스트리밍 매치","매치 결과","프리미어와 이 주의 추천","조나스와 발견하기","세계 둘러보기","음악과 공식 영상","책·오디오북·잡지","요리 탐험","뉴스·행사·인식 개선","Match Together 와 친구","프로필·저장·요금제","다음 경험이 기다립니다"],"visitLabel":"이 경험 둘러보기","related":{"weekly":"이번 주 추천","events":"행사","awareness":"인식 개선","friends":"친구","plans":"요금제와 크레딧"}},"zh":{"h":"发现你的下一段精彩体验","deck":"探索精彩娱乐，无需复杂菜单。了解 MatchApp Ai 的每个空间，再回到首页寻找下一次心动之选。","prev":"← 上一步","next":"下一站 →","home":"发现下一段精彩体验","soundOff":"声音关闭","soundOn":"声音开启","stops":"个发现","pace":"按自己的节奏探索","head":"你的探索旅程","hint":"了解每一站，然后继续。","finish":"准备好寻找下一次心动了吗？","finNote":"返回首页，浏览新作品或选择当前心情。","titles":["从首页开始","热门作品","你的流媒体匹配","匹配结果","首映与本周推荐","与乔纳斯一起探索","探索更多世界","音乐与官方视频","图书、有声书与杂志","美食新发现","新闻、活动与公益科普","Match Together 与朋友","个人资料、收藏与方案","下一段精彩等待你"],"visitLabel":"探索此体验","related":{"weekly":"本周推荐","events":"活动","awareness":"公益科普","friends":"朋友","plans":"方案与额度"}}};
var sections=Array.from(document.querySelectorAll('.journey-chapter'));
if(!sections.length)return;
var navigation=Array.from(document.querySelectorAll('[data-guide-goto]'));
var back=document.getElementById('journey-back'),next=document.getElementById('journey-next');
var progress=document.getElementById('journey-progress-bar'),count=document.getElementById('journey-position');
var sound=document.getElementById('journey-sound');
var current=0, audioEnabled=false,ctx=null;
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function selected(){
 try{
  var from=String(localStorage.getItem('match_lang')||document.documentElement.lang||'en');
  if(/^pt(?:-|$)/i.test(from))return 'pt-BR';
  return dictionary[from]?from:(dictionary[from.split('-')[0]]?from.split('-')[0]:'en');
 }catch(_){return 'en'}
}
var locale=selected();
var en=dictionary.en;
var original=sections.map(function(el){
 return {title:el.querySelector('[data-guide-title]').textContent,
 hook:el.querySelector('[data-guide-hook]').textContent,
 explain:el.querySelector('[data-guide-explain]').textContent,
 note:el.querySelector('[data-guide-note]').textContent,visit:el.querySelector('[data-guide-visit-label]').textContent};
});
function set(attr,value){document.querySelectorAll('['+attr+']').forEach(function(el){el.textContent=value})}
function paint(){
 locale=selected();var d=dictionary[locale]||en;
 document.documentElement.lang=locale;
 document.querySelectorAll('[data-guide-related]').forEach(function(el){var key=el.getAttribute('data-guide-related');el.textContent=((d.related&&d.related[key])||(en.related&&en.related[key])||key)+' ↗';});
 document.documentElement.dir=locale==='ar'?'rtl':'ltr';
 set('data-guide-heading',d.h);
 set('data-guide-deck',d.deck);
 set('data-guide-prev',d.prev);set('data-guide-next',d.next);
 set('data-guide-stops',d.stops);set('data-guide-time',d.pace);
 set('data-guide-chapter-head',d.head);set('data-guide-hint',d.hint);
 set('data-guide-finish-title',d.finish);set('data-guide-finish-note',d.finNote);
 document.querySelector('[data-guide-home]').firstChild.textContent=d.home+' ';
 sections.forEach(function(el,i){
  var title=el.querySelector('[data-guide-title]');
  title.textContent=(d.titles&&d.titles[i])||original[i].title;
  navigation[i].querySelector('.journey-nav-text').textContent=title.textContent;
  el.querySelector('[data-guide-visit-label]').textContent=locale==='en'?original[i].visit:(i===sections.length-1?d.home:d.visitLabel);
  var explain=el.querySelector('[data-guide-explain]');
  var hook=el.querySelector('[data-guide-hook]');
  var note=el.querySelector('[data-guide-note]');
  if(locale==='en'){
   explain.textContent=original[i].explain;hook.textContent=original[i].hook;
   note.textContent=original[i].note;note.hidden=false;
  }else if(d.summary&&d.summary[i]){
   explain.textContent=d.summary[i];
   hook.textContent=(d.titles&&d.titles[i])||original[i].hook;
   note.hidden=true;
  }else{
   /* Mark unlocalized explanatory copy as English rather than implying a translation. */
   explain.textContent=original[i].explain;explain.lang='en';
   hook.textContent=(d.titles&&d.titles[i])||original[i].hook;
   note.textContent=original[i].note;note.lang='en';note.hidden=true;
  }
 });
 sound.querySelector('[data-guide-sound]').textContent=audioEnabled?d.soundOn:d.soundOff;
 sound.setAttribute('aria-pressed',audioEnabled?'true':'false');
 sound.setAttribute('aria-label',audioEnabled?d.soundOn:d.soundOff);
}
function gentleSound(){
 if(!audioEnabled)return;
 try{
  if(localStorage.getItem('match_soundEnabled')==='false')return;
  var A=window.AudioContext||window.webkitAudioContext;
  if(!A)return;
  ctx=ctx||new A();if(ctx.state==='suspended')ctx.resume().catch(function(){});
  [440,554.37,659.25].forEach(function(freq,i){
   var start=ctx.currentTime+.01+i*.075,o=ctx.createOscillator(),g=ctx.createGain();
   o.type='sine';o.frequency.setValueAtTime(freq,start);
   g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(.008,start+.022);
   g.gain.exponentialRampToValueAtTime(.0001,start+.145);
   o.connect(g);g.connect(ctx.destination);o.start(start);o.stop(start+.16);
  });
 }catch(_){}
}
function haptic(){if(reduce)return;try{if(navigator.vibrate)navigator.vibrate(12)}catch(_){}}
function go(index,interactive){
 var n=Math.min(sections.length-1,Math.max(0,index));
 current=n;
 document.body.classList.add('journey-ready');
 sections.forEach(function(el,i){var active=i===n;el.classList.toggle('is-active',active);
  el.hidden=!active;el.setAttribute('aria-hidden',active?'false':'true');
 });
 navigation.forEach(function(el,i){
  if(i===n)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
 });
 back.disabled=n===0;
 var d=dictionary[locale]||en;
 next.textContent=n===sections.length-1?d.home+' ↗':d.next;
 count.textContent=String(n+1).padStart(2,'0')+' / '+String(sections.length).padStart(2,'0');
 progress.style.width=((n+1)*100/sections.length)+'%';
 if(interactive){
  gentleSound();haptic();
  var step=sections[n].querySelector('h2');
  step.setAttribute('tabindex','-1');
  var card=sections[n];
  card.scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'});
  step.focus({preventScroll:true});
  history.replaceState(null,'','#chapter-'+(n+1));
  navigation[n].scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest',inline:'nearest'});
 }
}
navigation.forEach(function(node,i){node.addEventListener('click',function(){go(i,true)})});
back.addEventListener('click',function(){go(current-1,true)});
next.addEventListener('click',function(){
 if(current===sections.length-1){window.location.assign('/');return}
 go(current+1,true);
});
sound.addEventListener('click',function(){
 audioEnabled=!audioEnabled;paint();if(audioEnabled)gentleSound();haptic();
});
document.querySelectorAll('.journey-visit,.journey-home').forEach(function(a){
 a.addEventListener('click',function(){gentleSound();haptic()});
});
var x0=0,y0=0;
document.querySelector('.journey-view').addEventListener('touchstart',function(e){
 if(e.touches.length!==1||e.target.closest('a,button'))return;
 x0=e.touches[0].clientX;y0=e.touches[0].clientY;
},{passive:true});
document.querySelector('.journey-view').addEventListener('touchend',function(e){
 if(!x0||e.changedTouches.length!==1)return;
 var dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=0;
 if(Math.abs(dx)>95&&Math.abs(dx)>Math.abs(dy)*1.6){
  var direction=document.documentElement.dir==='rtl'?1:-1;
  go(current+(dx*direction>0?1:-1),true);
 }
},{passive:true});
window.addEventListener('storage',function(e){if(e.key==='match_lang')paint()});
paint();
var start=Number((location.hash.match(/^#chapter-(\d+)$/)||[])[1]||1)-1;
go(start,false);
})();