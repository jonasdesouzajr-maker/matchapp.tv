(function(){
 'use strict';
 var home=/^\/(?:index\.html)?$/.test(location.pathname);
 // Existing bookmarked reading/Ask-AI links now land on their dedicated pages.
 if(home){
  var url=new URL(location.href);
  if(url.hash==='#ebook-matcher-root'||url.searchParams.has('reading')){
   url.pathname='/ebooks/';location.replace(url.href);return;
  }
  // Old Home bookmarks must reach the dedicated destination, not a hidden section.
  // Leave the active watch matcher and Top Titles anchors on Home untouched.
  var moved={
   '#cooking-home':'/cooking/',
   '#latest-news':'/news/',
   '#global-events':'/events-archive.html',
   '#international-day':'/events-archive.html',
   '#billboard':'/music.html#billboard',
   '#spotify-videos':'/music.html#spotify-videos',
   '#swifties-spotify':'/music.html#swifties-spotify',
   '#premiere-disclosure':'/featured/american-horror-story-13/',
   '#awareness-spotlight':'/awareness/breast-cancer-awareness-month-2026/',
   '#how-it-works':'/how-it-works.html',
   '#ai-concierge-section':'/discover.html',
   '#search-box':'/discover.html',
   '#ma-ai-entry':'/discover.html'
  };
  if(Object.prototype.hasOwnProperty.call(moved,url.hash)){
   var destination=new URL(moved[url.hash],url.origin);
   destination.search=url.search;
   location.replace(destination.href);return;
  }
 }
 var labels={en:'Explore more',pt:'Explore mais',es:'Explora más',fr:'Explorer plus',de:'Mehr entdecken',it:'Esplora altro',tr:'Daha fazlası',ru:'Больше возможностей',ar:'اكتشف المزيد',hi:'और खोजें',id:'Jelajahi lainnya',ja:'もっと見る',ko:'더 둘러보기',zh:'探索更多'};
 var descriptions={"en":"Cooking, music, current news, books, events and more — each with a dedicated discovery page.","pt":"Culinária, música, notícias atuais, livros, eventos e muito mais — cada tema com sua própria página.","es":"Cocina, música, noticias, libros, eventos y más, cada tema en su propia página.","fr":"Cuisine, musique, actualités, livres, événements et bien plus, avec une page pour chaque thème.","de":"Kochen, Musik, Nachrichten, Bücher, Veranstaltungen und mehr – jedes Thema auf einer eigenen Seite.","it":"Cucina, musica, notizie, libri, eventi e altro ancora: una pagina dedicata a ogni tema.","tr":"Yemek, müzik, haberler, kitaplar, etkinlikler ve daha fazlası — her biri kendi sayfasında.","ru":"Кулинария, музыка, новости, книги, события и многое другое — каждому разделу своя страница.","ar":"الطهي والموسيقى والأخبار والكتب والفعاليات والمزيد، لكل موضوع صفحته الخاصة.","hi":"खाना, संगीत, समाचार, किताबें, कार्यक्रम और भी बहुत कुछ — हर विषय के लिए अलग पेज।","id":"Kuliner, musik, berita terkini, buku, acara, dan lainnya — masing-masing di halaman tersendiri.","ja":"料理、音楽、ニュース、本、イベントなど、各テーマの専用ページをご覧ください。","ko":"요리, 음악, 최신 뉴스, 책, 행사 등 다양한 주제를 전용 페이지에서 만나보세요.","zh":"烹饪、音乐、新闻、书籍、活动等精彩内容，每个主题都有专属页面。"};
 function paint(){
  document.querySelectorAll('[data-explore-more-label]').forEach(function(el){
   var lang=String(window.MATCH_LANG||document.documentElement.lang||'en').split('-')[0];
   if(Object.prototype.hasOwnProperty.call(labels,lang))el.textContent=labels[lang];
  });
  var chosen=String(window.MATCH_LANG||document.documentElement.lang||'en').split('-')[0];
  if(Object.prototype.hasOwnProperty.call(descriptions,chosen))document.querySelectorAll('[data-home-explore-description]').forEach(function(el){el.textContent=descriptions[chosen]});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint,{once:true});else paint();
 document.addEventListener('matchapp:langchange',paint);window.addEventListener('matchapp:languagechange',paint);
})();
