(function(){
 'use strict';
 var home=/^\/(?:index\.html)?$/.test(location.pathname);
 // Existing bookmarked reading/Ask-AI links now land on their dedicated pages.
 if(home){
  var url=new URL(location.href);
  if(url.hash==='#ebook-matcher-root'||url.searchParams.has('reading')){
   url.pathname='/ebooks/';location.replace(url.href);return;
  }
 }
 var labels={en:'Explore more',pt:'Explore mais',es:'Explora más',fr:'Explorer plus',de:'Mehr entdecken',it:'Esplora altro',tr:'Daha fazlası',ru:'Больше возможностей',ar:'اكتشف المزيد',hi:'और खोजें',id:'Jelajahi lainnya',ja:'もっと見る',ko:'더 둘러보기',zh:'探索更多'};
 function paint(){
  document.querySelectorAll('[data-explore-more-label]').forEach(function(el){
   var lang=String(window.MATCH_LANG||document.documentElement.lang||'en').split('-')[0];
   el.textContent=labels[lang]||labels.en;
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint,{once:true});else paint();
 document.addEventListener('matchapp:langchange',paint);window.addEventListener('matchapp:languagechange',paint);
})();
