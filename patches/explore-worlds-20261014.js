/* Explore Worlds: adult Home navigation only. Reuses official pages, no new AI requests. */
(function(){'use strict';
var translations={"en":["Explore more","Choose your next experience. Each topic has its own page.","Cooking & recipes","Find dishes and trusted cooking videos.","Music & official videos","Discover official videos and music charts.","Books, audiobooks & magazines","Find reading and listening with legal sources.","Latest news","Read headlines and visit original publishers.","Events & international days","Browse event guides and official programmes.","Awareness","Read awareness information from trusted sources.","Entertainment guides","Explore more ways to choose your entertainment."],"pt-BR":["Explore mais","Escolha sua próxima experiência. Cada tema tem sua própria página.","Culinária e receitas","Encontre pratos e vídeos de canais confiáveis.","Música e vídeos oficiais","Descubra vídeos oficiais e paradas musicais.","Livros, audiolivros e revistas","Encontre o que ler e ouvir em fontes legais.","Últimas notícias","Leia manchetes e visite os veículos originais.","Eventos e dias internacionais","Veja guias de eventos e programas oficiais.","Conscientização","Leia informações de fontes confiáveis.","Guias de entretenimento","Explore mais formas de escolher seu entretenimento."],"es":["Explora más","Elige tu próxima experiencia. Cada tema tiene su propia página.","Cocina y recetas","Encuentra platos y vídeos de cocina fiables.","Música y vídeos oficiales","Descubre vídeos oficiales y listas musicales.","Libros, audiolibros y revistas","Encuentra lecturas y audios en fuentes legales.","Últimas noticias","Lee titulares y visita las fuentes originales.","Eventos y días internacionales","Consulta guías y programas oficiales.","Concienciación","Lee información de fuentes fiables.","Guías de entretenimiento","Explora más formas de elegir tu entretenimiento."],"fr":["Explorer plus","Choisissez votre prochaine expérience. Chaque thème a sa page.","Cuisine et recettes","Trouvez des plats et des vidéos de cuisine fiables.","Musique et vidéos officielles","Découvrez les vidéos officielles et les classements.","Livres, livres audio et magazines","Trouvez des lectures et des écoutes légales.","Actualités","Lisez les titres et consultez les sources originales.","Événements et journées internationales","Consultez les guides et programmes officiels.","Sensibilisation","Consultez des informations de sources fiables.","Guides de divertissement","Explorez d’autres façons de choisir vos loisirs."],"de":["Mehr entdecken","Wähle dein nächstes Erlebnis. Jedes Thema hat eine eigene Seite.","Kochen und Rezepte","Finde Gerichte und vertrauenswürdige Kochvideos.","Musik und offizielle Videos","Entdecke offizielle Videos und Musikcharts.","Bücher, Hörbücher und Zeitschriften","Finde Lese- und Hörstoff aus legalen Quellen.","Neueste Nachrichten","Lies Schlagzeilen und besuche die Originalquellen.","Veranstaltungen und internationale Tage","Entdecke Veranstaltungsführer und offizielle Programme.","Aufklärung","Lies Informationen aus vertrauenswürdigen Quellen.","Unterhaltungsratgeber","Entdecke weitere Wege zu deiner Unterhaltung."],"it":["Esplora altro","Scegli la prossima esperienza. Ogni argomento ha la sua pagina.","Cucina e ricette","Trova piatti e video di cucina affidabili.","Musica e video ufficiali","Scopri video ufficiali e classifiche musicali.","Libri, audiolibri e riviste","Trova letture e ascolti da fonti legali.","Ultime notizie","Leggi i titoli e visita le fonti originali.","Eventi e giornate internazionali","Consulta guide e programmi ufficiali.","Sensibilizzazione","Leggi informazioni da fonti affidabili.","Guide all’intrattenimento","Esplora altri modi per scegliere il tuo intrattenimento."],"tr":["Daha fazlası","Bir sonraki deneyiminizi seçin. Her konunun kendi sayfası vardır.","Yemek ve tarifler","Yemekler ve güvenilir yemek videoları bulun.","Müzik ve resmî videolar","Resmî videoları ve müzik listelerini keşfedin.","Kitaplar, sesli kitaplar ve dergiler","Yasal kaynaklardan okuma ve dinleme içeriği bulun.","Son haberler","Başlıkları okuyun ve asıl yayıncıları ziyaret edin.","Etkinlikler ve uluslararası günler","Rehberleri ve resmî programları inceleyin.","Farkındalık","Güvenilir kaynaklardan bilgi edinin.","Eğlence rehberleri","Eğlencenizi seçmenin başka yollarını keşfedin."],"ru":["Больше возможностей","Выберите следующее занятие. У каждой темы своя страница.","Кулинария и рецепты","Находите блюда и видео проверенных кулинаров.","Музыка и официальные видео","Открывайте официальные клипы и чарты.","Книги, аудиокниги и журналы","Находите чтение и аудио в легальных источниках.","Последние новости","Читайте заголовки и переходите к первоисточникам.","События и международные дни","Изучайте путеводители и официальные программы.","Просвещение","Читайте информацию из надёжных источников.","Путеводители по развлечениям","Узнайте, как ещё выбрать развлечения."],"ar":["اكتشف المزيد","اختر تجربتك التالية. لكل موضوع صفحة خاصة.","الطهي والوصفات","اعثر على أطباق وفيديوهات طهي موثوقة.","الموسيقى والفيديوهات الرسمية","اكتشف الفيديوهات الرسمية وقوائم الموسيقى.","الكتب والكتب الصوتية والمجلات","اعثر على القراءة والاستماع من مصادر قانونية.","آخر الأخبار","اقرأ العناوين وزر المصادر الأصلية.","الفعاليات والأيام الدولية","تصفح الأدلة والبرامج الرسمية.","التوعية","اقرأ معلومات من مصادر موثوقة.","أدلة الترفيه","اكتشف طرقاً أخرى لاختيار الترفيه."],"hi":["और खोजें","अपना अगला अनुभव चुनें। हर विषय का अपना पेज है।","खाना और व्यंजन","व्यंजन और भरोसेमंद पाक वीडियो खोजें।","संगीत और आधिकारिक वीडियो","आधिकारिक वीडियो और संगीत चार्ट खोजें।","किताबें, ऑडियोबुक और पत्रिकाएँ","कानूनी स्रोतों से पढ़ने और सुनने के विकल्प खोजें।","ताज़ा समाचार","सुर्खियाँ पढ़ें और मूल प्रकाशक के पास जाएँ।","कार्यक्रम और अंतरराष्ट्रीय दिवस","जानकारी और आधिकारिक कार्यक्रम देखें।","जागरूकता","भरोसेमंद स्रोतों से जानकारी पढ़ें।","मनोरंजन मार्गदर्शिकाएँ","मनोरंजन चुनने के और तरीके खोजें।"],"id":["Jelajahi lainnya","Pilih pengalaman berikutnya. Setiap topik memiliki halaman sendiri.","Memasak dan resep","Temukan hidangan dan video memasak tepercaya.","Musik dan video resmi","Temukan video resmi dan tangga lagu.","Buku, buku audio dan majalah","Temukan bacaan dan audio dari sumber legal.","Berita terbaru","Baca judul berita dan kunjungi penerbit aslinya.","Acara dan hari internasional","Jelajahi panduan dan program resmi.","Kesadaran","Baca informasi dari sumber tepercaya.","Panduan hiburan","Jelajahi cara lain memilih hiburan Anda."],"ja":["もっと見る","次の体験を選びましょう。各テーマに専用ページがあります。","料理とレシピ","料理や信頼できる料理動画を探せます。","音楽と公式動画","公式動画や音楽チャートを楽しめます。","本・オーディオブック・雑誌","正規の提供元から読む本や音声作品を探せます。","最新ニュース","見出しを読み、元の配信元を確認できます。","イベントと国際デー","イベントガイドや公式プログラムを確認できます。","啓発情報","信頼できる情報源から学べます。","エンタメガイド","楽しみを選ぶためのヒントを探せます。"],"ko":["더 둘러보기","다음 경험을 고르세요. 주제마다 전용 페이지가 있어요.","요리와 레시피","음식과 믿을 수 있는 요리 영상을 찾아보세요.","음악과 공식 영상","공식 영상과 음악 차트를 둘러보세요.","책, 오디오북과 잡지","합법적인 출처에서 읽고 들을 작품을 찾으세요.","최신 뉴스","기사를 읽고 원래 매체를 방문하세요.","행사와 국제 기념일","행사 안내와 공식 프로그램을 확인하세요.","인식 개선","믿을 수 있는 출처의 정보를 읽어보세요.","엔터테인먼트 안내","즐길 거리를 고르는 더 많은 방법을 찾아보세요."],"zh":["探索更多","选择下一种体验。每个主题都有专属页面。","烹饪与食谱","寻找菜肴和可信的烹饪视频。","音乐与官方视频","探索官方视频和音乐榜单。","书籍、有声书与杂志","通过合法来源寻找阅读和收听内容。","最新新闻","阅读标题并访问原始发布方。","活动与国际纪念日","浏览活动指南和官方日程。","公益科普","阅读可信来源的信息。","娱乐指南","探索更多选择娱乐内容的方法。"]};
var closeLabel={en:'Close Explore Worlds', 'pt-BR':'Fechar Explorar mundos',es:'Cerrar exploración',fr:"Fermer l'exploration",de:'Entdecken schließen',it:'Chiudi esplora'};
function language(){var code=String(window.MATCH_LANG||document.documentElement.lang||'en');
 if(/^pt(?:-|$)/i.test(code))return 'pt-BR';var short=code.split('-')[0];return translations[code]?code:translations[short]?short:'en';}
function paint(){
 var row=translations[language()]||translations.en;
 document.querySelectorAll('[data-world-copy]').forEach(function(el){
  var n=Number(el.getAttribute('data-world-copy'));if(row[n])el.textContent=row[n];
 });
 var close=document.querySelector('[data-worlds-dismiss="close"]');
 if(close)close.setAttribute('aria-label',closeLabel[language()]||closeLabel.en);
 document.querySelectorAll('[data-world-local]').forEach(function(el){
  var key=el.getAttribute('data-world-local');
  var fromApp=typeof window.t==='function'?window.t(key):null;
  if(fromApp && fromApp!==key)el.textContent=fromApp;
 });
}
function cue(){
 try{if(typeof window.playMatchAppSound==='function')window.playMatchAppSound('tap');}catch(_){}
 try{if(navigator.vibrate)navigator.vibrate(12);}catch(_){}
}
function init(){
 var trigger=document.getElementById('ma-worlds-trigger');
 var region=document.getElementById('ma-explore-worlds-panel');
 if(!trigger||!region)return;
 var focusTarget=region.querySelector('.ma-worlds-panel');
 function close(){
  region.hidden=true;
  trigger.setAttribute('aria-expanded','false');
  trigger.focus({preventScroll:true});
 }
 function open(){
  region.hidden=false;
  trigger.setAttribute('aria-expanded','true');paint();
  try{
   if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&focusTarget.animate){
    focusTarget.animate([{opacity:0,transform:'translateY(-7px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:240,easing:'cubic-bezier(.2,.75,.25,1)'});
   }
  }catch(_){}
  focusTarget.focus({preventScroll:true});
 }
 trigger.addEventListener('click',function(){cue();region.hidden?open():close();});
 region.addEventListener('click',function(event){
  if(event.target.closest('[data-worlds-dismiss]')){cue();close()}
  else if(event.target.closest('a'))cue();
 });
 document.addEventListener('keydown',function(event){
  if(!region.hidden&&event.key==='Escape'){event.preventDefault();close()}
 });
 paint();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
document.addEventListener('matchapp:langchange',paint);
window.addEventListener('matchapp:languagechange',paint);
})();
