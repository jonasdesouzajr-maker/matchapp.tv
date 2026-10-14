/* Adult presentation and legacy discovery navigation. Reuses existing engines. */
(function(){
 'use strict';
 if(/^\/kids(?:\/|$)/i.test(location.pathname)||document.body?.matches('.page-kids,.kids-body,.kids-mode'))return;
 if(window.__maAdultUiFinish)return;window.__maAdultUiFinish=true;
 var labels={
  en:'Explore more from your Ai',pt:'Explore mais com sua Ai',es:'Explora más con tu Ai',fr:'Explorez davantage avec votre Ai',de:'Entdecke mehr mit deiner Ai',it:'Esplora di più con la tua Ai',tr:'Ai ile daha fazlasını keşfet',ru:'Откройте больше с вашей Ai',ar:'اكتشف المزيد مع Ai',hi:'अपनी Ai के साथ और खोजें',id:'Jelajahi lebih banyak bersama Ai',ja:'Aiともっと探そう',ko:'Ai와 더 알아보세요',zh:'与您的 Ai 探索更多'
 };
 var routes={ '#cooking-home':'/cooking/','#global-events':'/events/','#billboard':'/explore.html#explore-destinations','#spotify-videos':'/platforms/spotify/','#swifties-spotify':'/explore.html#explore-taylor','#premiere-disclosure':'/explore.html#explore-premiere','#weekly-pick-disclosure':'/explore.html#explore-weekly' };
 function localize(event){
  var lang=String(event?.detail?.lang||window.MATCH_LANG||document.documentElement.lang||'en').toLowerCase().split('-')[0];
  var text=labels[lang]||labels.en;
  document.querySelectorAll('body.page-home :is(.mh-explore-more,.home-hero .approved-design-cta)').forEach(function(el){el.textContent=text;el.setAttribute('aria-label',text)});
 }
 function legacy(){
  if(!document.body.classList.contains('page-home'))return;
  var params=new URLSearchParams(location.search);
  var destination=(location.hash==='#latest-news'||params.has('news'))?'/news/':routes[location.hash];
  if(destination){var target=new URL(destination,location.origin);target.search=location.search;location.replace(target.href);}
  // Reading selections keep the original, metered matcher on deliberate targets.
 }
 function newsContext(){
  if(!/^\/news(?:\/|$)/.test(location.pathname))return;
  var id=new URLSearchParams(location.search).get('news');if(!id)return;
  for(var link of document.querySelectorAll('a[href]')){
   var url=new URL(link.href,location.origin);
   if(url.origin!==location.origin||url.searchParams.get('news')!==id)continue;
   var article=link.closest('article');if(!article)continue;
   article.classList.add('ma-current-news');article.tabIndex=-1;
   article.scrollIntoView({block:'center',behavior:'instant'});article.focus({preventScroll:true});break;
  }
 }
 function boot(){localize();legacy();newsContext();}
 document.addEventListener('matchapp:langchange',localize);
 window.addEventListener('hashchange',legacy);
 window.addEventListener('pageshow',localize);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
