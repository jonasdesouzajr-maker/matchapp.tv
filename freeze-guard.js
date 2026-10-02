/* Stop a stuck load from freezing the homepage. */
(function(){
'use strict';
function release(){
  document.querySelectorAll('#matchapp-launch-intro,#matchapp-update-overlay').forEach(el=>el.remove());
  if(!document.body)return;
  if(window.__matchappMatchPhase!=='searching')document.body.classList.remove('match-searching');
  document.body.style.pointerEvents='';
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(release,4000),{once:true});
window.addEventListener('pageshow',release);
setTimeout(release,8000);
})();
