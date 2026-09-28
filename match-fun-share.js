/* Adults result-sharing invitation; the original button keeps its share flow. */
(function(){
  'use strict';
  const button=document.getElementById('btn-share-match');
  if(!button)return;
  const heading=document.querySelector('.match-fun-share__copy strong');
  const hint=document.querySelector('.match-fun-share__copy span');
  function localize(){
    const lang=String(window.MATCH_LANG||document.documentElement.lang||'en').toLowerCase();
    if(lang.startsWith('pt')){
    heading.textContent='Gostou da indicação? Mostre aos amigos.';
    hint.textContent='Compartilhe 3 resultados diferentes e ganhe 1 Match grátis.';
    }else if(lang.startsWith('es')){
    heading.textContent='¿Te gustó esta elección? Muéstrala a tus amigos.';
    hint.textContent='Comparte 3 resultados diferentes y gana 1 Match gratis.';
    }else{
      heading.textContent='Love this pick? Show your friends.';
      hint.textContent='Share 3 different match results to earn 1 free Match.';
    }
  }
  localize();
  document.addEventListener('matchapp:langchange',localize);
})();
