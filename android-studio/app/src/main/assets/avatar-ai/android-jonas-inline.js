/* MatchApp Ai Android: replace the adult Ask AI field with the native Jonas portrait.
   Uses the existing #ma-avatar-home, native voice and server-metered conversation. */
(function(){
'use strict';
if(!window.MATCHAPP_ANDROID||!/^\/(?:index\.html)?$/.test(location.pathname))return;
if(window.__matchappJonasInline20261009)return;
window.__matchappJonasInline20261009=true;
var s=document.createElement('style');
s.id='ma-native-jonas-inline-style';
s.textContent=`
html.matchapp-ai-android body.page-home #ma-ai-entry{display:block!important;min-width:0!important;margin:12px 0 21px!important;overflow:visible!important;border:0!important;background:transparent!important;box-shadow:none!important}
html.matchapp-ai-android body.page-home #ma-ai-entry .ma-tabs,
html.matchapp-ai-android body.page-home #ma-ai-entry .ma-quota-line,
html.matchapp-ai-android body.page-home #ma-ai-entry .search-examples,
html.matchapp-ai-android body.page-home .lazy-head[data-fold-key="askai"],
html.matchapp-ai-android body.page-home #ma-ai-entry #search-box>h2,
html.matchapp-ai-android body.page-home #ma-ai-entry #search-box>p,
html.matchapp-ai-android body.page-home .ma-jonas-web-entry,
html.matchapp-ai-android body.page-home .ma-jonas-legacy-head,
html.matchapp-ai-android body.page-home .lazy-head:has(+ #ma-ai-entry){display:none!important}
html.matchapp-ai-android body.page-home #ma-ai-entry #ma-panel-ask{display:block!important}
html.matchapp-ai-android body.page-home #ma-ai-entry #search-box{
 box-sizing:border-box!important;position:relative!important;display:grid!important;
 grid-template-columns:96px minmax(0,1fr)!important;align-items:center!important;gap:14px!important;
 min-height:142px!important;padding:16px 19px!important;margin:0!important;
 border:1px solid #e8cc8f9f!important;border-radius:24px!important;
 background:radial-gradient(ellipse at 15% 30%,#70418a44,transparent 50%),linear-gradient(132deg,#30203d,#160e23)!important;
 box-shadow:inset 0 1px 0 #fff5d328,0 16px 36px #0005!important;overflow:visible!important
}
html.matchapp-ai-android body.page-home #search-box>.home-ask-composer,
html.matchapp-ai-android body.page-home #search-box>.search-examples{display:none!important}
html.matchapp-ai-android body.page-home #search-box #ma-avatar-home:not([data-open="true"]){
 --bubble:88px!important;--face:88px!important;
 box-sizing:border-box!important;position:relative!important;
 inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;
 grid-column:1!important;display:block!important;width:88px!important;height:88px!important;
 min-width:88px!important;min-height:88px!important;max-width:88px!important;max-height:88px!important;
 margin:0!important;padding:0!important;border:0!important;border-radius:50%!important;
 overflow:visible!important;background:transparent!important;box-shadow:none!important;transform:none!important;
 z-index:2!important
}
html.matchapp-ai-android body.page-home #search-box #ma-avatar-home:not([data-open="true"]) .ma-av-portrait{
 position:absolute!important;inset:0!important;left:0!important;top:0!important;
 width:88px!important;height:88px!important;min-width:88px!important;min-height:88px!important;
 max-width:88px!important;max-height:88px!important;clip-path:circle(50%)!important;
 overflow:hidden!important;border:3px solid #f1d697!important;border-radius:50%!important;
 box-shadow:0 0 0 5px #e4b66a27,0 8px 26px #0009,0 0 28px #ac77c44f!important
}
html.matchapp-ai-android body.page-home #search-box #ma-avatar-home:not([data-open="true"]) #ma-av-state{right:0!important;bottom:0!important}
html.matchapp-ai-android body.page-home #search-box #ma-avatar-home:not([data-open="true"]) .ma-av-copy{display:none!important;pointer-events:none!important}
html.matchapp-ai-android body.page-home #search-box #ma-jonas-inline-caption{
 grid-column:2!important;display:flex!important;flex-direction:column!important;
 gap:4px!important;min-width:0!important;padding:0!important;color:#dfc9e9!important;
 font:480 13px/1.42 system-ui!important;pointer-events:none!important
}
html.matchapp-ai-android body.page-home #search-box #ma-jonas-inline-caption .ma-jonas-eyebrow{color:#dfbf89;font:760 10px/1.35 system-ui;letter-spacing:.09em}
html.matchapp-ai-android body.page-home #search-box #ma-jonas-inline-caption strong{color:#fff0ca;font:850 24px/1.14 system-ui;letter-spacing:-.025em}
html.matchapp-ai-android body.page-home #search-box #ma-avatar-home[data-open="true"]{
 position:fixed!important;z-index:2147483500!important;grid-column:auto!important
}
@media(max-width:385px){
 html.matchapp-ai-android body.page-home #ma-ai-entry #search-box{grid-template-columns:82px minmax(0,1fr)!important;gap:10px!important;padding:13px!important;min-height:126px!important}
 html.matchapp-ai-android body.page-home #search-box #ma-avatar-home:not([data-open="true"]),
 html.matchapp-ai-android body.page-home #search-box #ma-avatar-home:not([data-open="true"]) .ma-av-portrait{
  --bubble:78px!important;--face:78px!important;width:78px!important;height:78px!important;min-width:78px!important;min-height:78px!important;max-width:78px!important;max-height:78px!important
 }
 html.matchapp-ai-android body.page-home #search-box #ma-jonas-inline-caption strong{font-size:21px}
}
`;
(document.head||document.documentElement).appendChild(s);
function localize(){
 var caption=document.getElementById('ma-jonas-inline-caption');if(!caption)return;
 var pt=/^pt/i.test(window.MATCH_LANG||document.documentElement.lang||'');
 caption.querySelector('.ma-jonas-eyebrow').textContent=pt?'SEU ASSISTENTE DE ENTRETENIMENTO':'YOUR ENTERTAINMENT COMPANION';
 caption.querySelector('strong').textContent='Jonas';
 caption.querySelector('small').textContent=pt?'Toque no rosto do Jonas para conversar.':'Tap Jonas to chat.';
}
function place(){
 if(!document.body||!document.body.classList.contains('page-home'))return;
 var heading=document.getElementById('ma-ai-entry')?.previousElementSibling;
 if(heading&&heading.classList.contains('lazy-head')){
  heading.classList.add('ma-jonas-legacy-head');
  heading.style.setProperty('display','none','important');
  heading.setAttribute('aria-hidden','true');heading.tabIndex=-1;
 }
 var source=document.getElementById('search-box');
 var avatar=document.getElementById('ma-avatar-home');
 if(!source||!avatar)return;
 if(!source.contains(avatar))source.insertBefore(avatar,source.firstChild);
 var caption=document.getElementById('ma-jonas-inline-caption');
 if(!caption){
  caption=document.createElement('div');caption.id='ma-jonas-inline-caption';
  caption.innerHTML='<span class="ma-jonas-eyebrow"></span><strong>Jonas</strong><small></small>';
  source.insertBefore(caption,avatar.nextSibling);
 }
 document.body.classList.add('ma-jonas-inline');
 localize();
}
place();
document.addEventListener('DOMContentLoaded',place,{once:true});
document.addEventListener('matchapp:langchange',localize);
var host=document.getElementById('ma-ai-entry')?.parentElement;
if(host&&window.MutationObserver)new MutationObserver(place).observe(host,{childList:true,subtree:false});
var count=0,timer=setInterval(function(){
 place();
 if((document.getElementById('ma-jonas-inline-caption')&&document.querySelector('.ma-jonas-legacy-head'))||++count>30)clearInterval(timer);
},250);
})();
