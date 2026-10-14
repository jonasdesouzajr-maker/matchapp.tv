/* Adult presentation and legacy discovery navigation. Reuses existing engines. */
(function(){
 'use strict';
 if(/^\/kids(?:\/|$)/i.test(location.pathname)||document.body?.matches('.page-kids,.kids-body,.kids-mode'))return;
 if(window.__maAdultUiFinish)return;window.__maAdultUiFinish=true;
 var labels={
  en:'Explore more from your Ai',pt:'Explore mais com sua Ai',es:'Explora más con tu Ai',fr:'Explorez davantage avec votre Ai',de:'Entdecke mehr mit deiner Ai',it:'Esplora di più con la tua Ai',tr:'Ai ile daha fazlasını keşfet',ru:'Откройте больше с вашей Ai',ar:'اكتشف المزيد مع Ai',hi:'अपनी Ai के साथ और खोजें',id:'Jelajahi lebih banyak bersama Ai',ja:'Aiともっと探そう',ko:'Ai와 더 알아보세요',zh:'与您的 Ai 探索更多'
 };
 var routes={ '#cooking-home':'/cooking/','#global-events':'/events/','#billboard':'/explore.html#explore-destinations','#spotify-videos':'/platforms/spotify/','#swifties-spotify':'/platforms/spotify/','#premiere-disclosure':'/explore.html','#weekly-pick-disclosure':'/explore.html' };
 function localize(event){
  var lang=String(event?.detail?.lang||window.MATCH_LANG||document.documentElement.lang||'en').toLowerCase().split('-')[0];
  var text=labels[lang]||labels.en;
  document.querySelectorAll('body.page-home :is(.mh-explore-more,.home-hero .approved-design-cta)').forEach(function(el){el.textContent=text;el.setAttribute('aria-label',text)});
 }
 function legacy(){
  if(!document.body.classList.contains('page-home'))return;
  var destination=routes[location.hash];
  if(destination)location.replace(destination+ (location.search||''));
  // News IDs and reading selections need their original runtime and query.
  // Keep those deliberate deep links working without displaying them at Home.
 }
 function boot(){localize();legacy();}
 document.addEventListener('matchapp:langchange',localize);
 window.addEventListener('hashchange',legacy);
 window.addEventListener('pageshow',localize);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
