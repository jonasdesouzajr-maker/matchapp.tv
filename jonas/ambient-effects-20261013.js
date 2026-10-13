/* Light device vibration on key taps — adult only, no logic changes. */
(function(){
 'use strict';
 if (!navigator.vibrate) return;
 var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if (reduced) return;
 function buzz(ms){
  try { navigator.vibrate(ms); } catch(_){}
 }
 document.addEventListener('click', function(e){
  var t = e.target && e.target.closest && e.target.closest(
    '.gold-btn, .mh-explore-more, #ma-jonas-home-bubble, .ex-card, #trending-rail .marquee-item'
  );
  if (!t) return;
  buzz(t.id === 'ma-jonas-home-bubble' ? 18 : 12);
 }, { passive: true });
})();
