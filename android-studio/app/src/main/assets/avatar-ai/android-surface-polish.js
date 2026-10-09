/* MatchApp Ai Android-only, compact interactive Home chrome.
 * Does not move controls, change their handlers, or affect the website/Kids. */
(function(){
'use strict';
if (!window.MATCHAPP_ANDROID || /^\/kids(?:\/|$)/.test(location.pathname)) return;
if (window.__matchappAndroidSurface20261009) return;
window.__matchappAndroidSurface20261009 = true;
var css = document.createElement('style');
css.id = 'matchapp-android-surface-20261009';
css.textContent = `
@media(max-width:720px){
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header{
  box-sizing:border-box!important;position:relative!important;isolation:isolate!important;
  overflow:hidden!important;display:flex!important;flex-direction:column!important;
  gap:8px!important;padding:10px 12px 12px!important;min-height:0!important;
  border-radius:23px!important;margin:5px auto 9px!important;
  background:linear-gradient(145deg,#634472e8,#2b1746f5 72%,#241536fa)!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox .mh-head{
  width:100%!important;min-height:66px!important;margin:0!important;
  display:flex!important;justify-content:center!important;align-items:center!important;
  padding:2px 0 8px!important;flex:0 0 auto!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox .mh-head #home-brand-lockup{
  max-width:100%!important;min-width:0!important;margin:0 auto!important;
  justify-content:center!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox .ma-brand-home-link{
  display:flex!important;justify-content:center!important;align-items:center!important;
  max-width:100%!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck{
  display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;
  grid-auto-rows:42px!important;grid-auto-flow:row dense!important;
  column-gap:6px!important;row-gap:7px!important;align-items:stretch!important;
  justify-content:stretch!important;width:100%!important;max-width:100%!important;
  margin:0!important;padding:0!important;min-height:0!important;flex:none!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck > :is(
  #lang-switcher-host,.sound-toggle-btn,.matchapp-notification-button,#nav-reg-btn,
  #nav-logout-btn,#profile-link-tab,.ma-how-button,.ma-menu-wrap){
  box-sizing:border-box!important;margin:0!important;min-width:0!important;
  max-width:100%!important;width:100%!important;height:42px!important;
  min-height:42px!important;max-height:42px!important;
  border-radius:13px!important;align-self:stretch!important;
  font-size:clamp(11px,2.9vw,14px)!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck > #lang-switcher-host{
  grid-column:1/5!important;grid-row:1!important;display:flex!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck > #lang-switcher-host > select{
  box-sizing:border-box!important;width:100%!important;min-width:0!important;
  max-width:100%!important;height:42px!important;min-height:42px!important;
  padding:0 10px!important;border-radius:13px!important;font-size:clamp(11px,3vw,14px)!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck > .sound-toggle-btn{
  grid-column:5/7!important;grid-row:1!important;padding:0!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck > .matchapp-notification-button{
  grid-column:7/9!important;grid-row:1!important;padding:0!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck > #nav-reg-btn{
  grid-column:9/13!important;grid-row:1!important;padding:0 8px!important;
  white-space:nowrap!important;text-overflow:ellipsis!important;overflow:hidden!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck > #profile-link-tab{
  grid-column:9/13!important;grid-row:1!important;padding:0!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck > #nav-logout-btn{
  grid-column:9/13!important;grid-row:3!important;padding:0 8px!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck > #quota-badge{
  grid-column:1/9!important;grid-row:3!important;max-width:100%!important;min-width:0!important;
  margin:0!important;min-height:42px!important;height:42px!important;overflow:hidden!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck > .ma-how-button{
  grid-column:1/10!important;grid-row:2!important;
  display:flex!important;justify-content:center!important;align-items:center!important;
  overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;
  padding:0 10px!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck > .ma-menu-wrap{
  grid-column:10/13!important;grid-row:2!important;padding:0!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck > .ma-menu-wrap > .ma-menu-button{
  box-sizing:border-box!important;width:100%!important;min-width:0!important;
  height:42px!important;min-height:42px!important;margin:0!important;
  border-radius:13px!important;display:flex!important;justify-content:center!important;align-items:center!important
 }
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > nav.mh-deck > :is(
  .ma-kids-mode-entry,.install-wrap){display:none!important}
}
html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header::before{
 content:"";position:absolute;inset:-45% -65%;z-index:0;pointer-events:none;
 background:linear-gradient(112deg,transparent 35%,#f4dca00d 44%,#f8e1b631 50%,#d7a8ff1b 53%,transparent 63%);
 transform:translate3d(-42%,0,0);animation:maAndroidHeaderSweep 8s ease-in-out infinite;
}
html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header > :is(.mh-head,.mh-deck){
 position:relative!important;z-index:1!important
}
html.matchapp-ai-android body.page-home #mh-topbox .ma-word-ai{
 animation:maAndroidAiTwinkle 4.7s ease-in-out infinite
}
html.matchapp-ai-android body.page-home #mh-topbox .ma-brand-orb-stage{
 filter:drop-shadow(0 0 7px #e0be6a55)
}
html.matchapp-ai-android body.page-home #mh-topbox .mh-deck :is(button,select,a):focus-visible{
 outline:2px solid #ffe6aa!important;outline-offset:2px!important
}
@keyframes maAndroidHeaderSweep{
 0%,13%{transform:translate3d(-42%,0,0);opacity:.35}
 48%{opacity:.95}
 79%,100%{transform:translate3d(42%,0,0);opacity:.35}
}
@keyframes maAndroidAiTwinkle{
 0%,100%{text-shadow:0 0 1px #f3d59a33}
 50%{text-shadow:0 0 12px #f2ca8e95,0 0 25px #ca81ff55}
}
@media(prefers-reduced-motion:reduce){
 html.matchapp-ai-android body.page-home #mh-topbox.app-header.ma-home-header::before,
 html.matchapp-ai-android body.page-home #mh-topbox .ma-word-ai{animation:none!important}
}
`;
(document.head||document.documentElement).appendChild(css);
// Reuse the site's original licensed, quiet synthesis and its sound preference;
// no autoplay audio, no duplicated listener on repeated native injections.
document.addEventListener('click', function(event){
 var nav = event.target.closest?.('#mh-topbox .mh-deck');
 if(!nav || !window.MATCHAPP_ANDROID) return;
 var control = event.target.closest?.('button,a');
 if(!control || control.matches('.sound-toggle-btn')) return;
 if(typeof window.playMatchAppSound === 'function')
  window.playMatchAppSound(control.matches('.ma-how-button,.ma-menu-button')?'open':'nav');
}, {capture:true,passive:true});
})();