/* MatchApp Ai: premium compact Android Jonas chat.
 * Preserves the existing authenticated matching, AI, credits and native voice handlers. */
(function(){
'use strict';
if(window.__matchappJonasPremium47||(!window.MatchAppNativeVoice&&!window.MATCHAPP_ANDROID))return;
if(/^\/kids(?:\/|$)/.test(location.pathname))return;
window.__matchappJonasPremium47=true;
var style=document.createElement('style');
style.id='ma-jonas-premium-47';
style.textContent=`
html.matchapp-ai-android body #ma-avatar-home{
 --bubble:74px!important;--face:70px!important;
 width:74px!important;height:74px!important;
 right:18px!important;bottom:max(86px,env(safe-area-inset-bottom))!important;
 border:0!important;border-radius:50%!important;
 box-shadow:none!important;background:transparent!important;
 transition:width .32s cubic-bezier(.22,1,.36,1),height .32s cubic-bezier(.22,1,.36,1)!important
}
html.matchapp-ai-android body #ma-avatar-home:not([data-open="true"]) .ma-av-portrait{
 width:74px!important;height:74px!important;min-width:74px!important;min-height:74px!important;
 max-width:74px!important;max-height:74px!important;top:0!important;left:0!important;
 border:2px solid #e5c781!important;border-radius:50%!important;
 box-shadow:0 10px 26px #0503088a,0 0 0 4px #bc995132!important
}
html.matchapp-ai-android body #ma-avatar-home:not([data-open="true"]) .ma-av-copy{
 visibility:hidden!important;opacity:0!important;pointer-events:none!important
}
html.matchapp-ai-android body #ma-avatar-home:not([data-open="true"]) #ma-av-state{
 top:auto!important;right:-3px!important;left:auto!important;bottom:2px!important;
 transform:none!important;width:17px!important;height:17px!important;
 min-width:17px!important;max-width:17px!important;overflow:hidden!important;
 text-indent:-999px!important;font-size:0!important;padding:0!important;
 background:#65d3a8!important;border:3px solid #1d1228!important;
 border-radius:50%!important;box-shadow:0 0 0 2px #e7c77a88!important
}
html.matchapp-ai-android body #ma-avatar-home[data-state="thinking"] #ma-av-state{background:#b79cff!important}
html.matchapp-ai-android body #ma-avatar-home[data-state="listening"] #ma-av-state{background:#68ded5!important}
html.matchapp-ai-android body #ma-avatar-home[data-state="speaking"] #ma-av-state{background:#ffe2a4!important;animation:maPremiumPulse 1.4s infinite!important}
html.matchapp-ai-android body #ma-avatar-home #ma-av-menu{display:none!important}
/* Compact premium conversation sheet, positioned safely above native ads. */
html.matchapp-ai-android body #ma-avatar-home[data-open="true"]{
 --bubble:70px!important;--face:70px!important;
 right:12px!important;left:auto!important;top:auto!important;
 bottom:max(86px,var(--ma-companion-bottom,16px))!important;
 width:min(420px,calc(100vw - 24px))!important;
 height:min(625px,calc(var(--ma-chat-vh,100dvh) - 115px))!important;
 min-height:240px!important;border-radius:25px!important;overflow:visible!important
}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy{
 position:absolute!important;inset:0!important;
 border-radius:25px!important;box-sizing:border-box!important;
 padding:105px 14px 13px!important;display:flex!important;flex-direction:column!important;gap:0!important;
 background:radial-gradient(ellipse 100% 55% at 15% -12%,#754b9055,transparent 75%),linear-gradient(160deg,#2a1b37,#1b1429 46%,#110e1e)!important;
 border:1px solid #cfaa6ca8!important;box-shadow:0 24px 55px #06030b9c,0 0 0 1px #e7cc8b22 inset!important;
 opacity:1!important;visibility:visible!important;pointer-events:auto!important;
 transform:none!important;overflow:hidden!important
}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-portrait{
 position:absolute!important;top:17px!important;left:17px!important;right:auto!important;
 width:70px!important;height:70px!important;min-width:70px!important;min-height:70px!important;
 max-width:70px!important;max-height:70px!important;border-radius:50%!important;
 border:2px solid #e8c780!important;box-shadow:0 9px 25px #06020a94,0 0 0 4px #ba935d33!important;z-index:4!important
}
html.matchapp-ai-android body #ma-avatar-home .ma-reference-art{
 border-radius:50%!important;animation:maPremiumBreath 7s ease-in-out infinite!important
}
html.matchapp-ai-android body #ma-avatar-home[data-state="speaking"] .ma-reference-art{animation:maPremiumSpeak 1.5s ease-in-out infinite!important}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy>strong{
 position:absolute!important;top:22px!important;left:104px!important;right:58px!important;
 margin:0!important;font:750 18px/1.18 system-ui!important;letter-spacing:-.02em!important;
 text-align:left!important;color:#ffe9b2!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important
}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy>small{
 position:absolute!important;top:49px!important;left:104px!important;right:58px!important;
 margin:0!important;font:450 11px/1.3 system-ui!important;color:#cfc0dc!important;
 text-align:left!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important
}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] #ma-av-state{
 top:73px!important;left:104px!important;right:auto!important;bottom:auto!important;
 transform:none!important;font:650 10px/1.2 system-ui!important;
 color:#e9d3a4!important;background:transparent!important;border:0!important;padding:0!important;box-shadow:none!important
}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] #ma-av-state:before{
 content:"";display:inline-block;width:6px;height:6px;margin-right:6px;vertical-align:1px;
 border-radius:50%;background:#78dfb9
}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] #ma-av-dismiss{
 top:16px!important;right:16px!important;width:39px!important;height:39px!important;
 min-width:39px!important;min-height:39px!important;border-radius:50%!important;
 border:1px solid #89718f!important;background:#392743!important;
 color:#ffebbb!important;box-shadow:none!important;font:400 23px/1 system-ui!important;z-index:7!important
}
html.matchapp-ai-android body #ma-avatar-home .ma-av-copy .ma-av-controls{display:none!important}
/* Conversation viewport and pinned composer. */
html.matchapp-ai-android body #ma-avatar-home .ma-av-chat-content{
 flex:1 1 auto!important;min-height:0!important;max-height:none!important;
 display:flex!important;flex-direction:column!important;gap:10px!important;
 padding:0 1px!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain!important
}
html.matchapp-ai-android body #ma-avatar-home #ma-av-reply:not([hidden]){
 align-self:flex-start!important;width:fit-content!important;max-width:96%!important;
 border:1px solid #9675a552!important;border-left:2px solid #ebce8d!important;
 border-radius:15px 15px 15px 5px!important;
 background:linear-gradient(125deg,#3a294a,#281e35)!important;
 color:#f0e7f4!important;padding:11px 13px!important;
 font:430 13px/1.52 system-ui!important;box-shadow:none!important;
 margin:0!important;overflow-wrap:anywhere!important
}
html.matchapp-ai-android body #ma-avatar-home #ma-av-reply:not([hidden]):before{
 display:block;content:"JONAS";color:#e9cd91;font:750 9px/1.3 system-ui;letter-spacing:.13em;margin-bottom:5px
}
html.matchapp-ai-android body #ma-avatar-home .home-ask-composer,
html.matchapp-ai-android body #ma-avatar-home .newsearch-row,
html.matchapp-ai-android body #ma-avatar-home #ma-jonas-continue{
 position:sticky!important;bottom:0!important;z-index:3!important;
 display:flex!important;align-items:center!important;justify-content:flex-start!important;
 gap:7px!important;flex-wrap:wrap!important;width:100%!important;
 max-width:100%!important;box-sizing:border-box!important;
 margin:auto 0 0!important;padding:9px!important;flex-shrink:0!important;
 border:1px solid #91769c92!important;border-radius:17px!important;
 background:linear-gradient(150deg,#261b36,#181425)!important;
 box-shadow:0 6px 17px #08030d54!important
}
html.matchapp-ai-android body #ma-avatar-home #ma-jonas-continue p{
 font:450 11px/1.42 system-ui!important;color:#cbbcd6!important;margin:0!important
}
html.matchapp-ai-android body #ma-avatar-home .home-ask-composer textarea,
html.matchapp-ai-android body #ma-avatar-home .newsearch-row textarea,
html.matchapp-ai-android body #ma-avatar-home #ma-jonas-global-input{
 min-height:48px!important;height:52px!important;max-height:90px!important;
 width:100%!important;flex:1 1 100%!important;margin:0!important;
 box-sizing:border-box!important;padding:12px!important;
 border:1px solid #6856778c!important;border-radius:12px!important;
 background:#100d1dc9!important;color:#fff4fb!important;font:450 13px/1.4 system-ui!important;
 box-shadow:none!important;resize:none!important
}
html.matchapp-ai-android body #ma-avatar-home .home-ask-composer button,
html.matchapp-ai-android body #ma-avatar-home .newsearch-row button,
html.matchapp-ai-android body #ma-avatar-home #ma-jonas-continue button{
 min-height:40px!important;height:40px!important;width:auto!important;
 padding:8px 14px!important;margin:0!important;border-radius:100px!important;
 border:1px solid #9881a6!important;background:#3d2b4c!important;
 color:#ffe9b7!important;box-shadow:none!important;font:700 12px system-ui!important
}
html.matchapp-ai-android body #ma-avatar-home .composer-send,
html.matchapp-ai-android body #ma-avatar-home .home-ask-composer .gold-btn,
html.matchapp-ai-android body #ma-avatar-home #ma-jonas-continue button{
 background:linear-gradient(110deg,#efd69d,#d7ac67)!important;
 border-color:#edd49d!important;color:#24152c!important;font-weight:800!important
}
html.matchapp-ai-android body #ma-avatar-home #chat-log{
 flex:1 1 auto!important;min-height:0!important;overflow:auto!important
}
html.matchapp-ai-android body #ma-avatar-home .chat-bubble{
 max-width:98%!important;border-radius:14px!important;margin:7px 0!important;
 padding:10px 12px!important;font:440 13px/1.5 system-ui!important
}
html.matchapp-ai-android body #ma-avatar-home .chat-answer-text{font:440 13px/1.55 system-ui!important}
html.matchapp-ai-android body #ma-avatar-home #ma-jonas-voice-notice{
 position:absolute!important;bottom:105px!important;left:13px!important;right:13px!important;
 z-index:8!important;padding:9px 11px!important;margin:0!important;
 border-radius:12px!important;border:1px solid #c6a266!important;
 background:#3d2749!important;color:#f7e8d0!important;
 box-shadow:0 10px 22px #0007!important;font:500 11px/1.4 system-ui!important
}
@keyframes maPremiumBreath{50%{transform:scale(1.015)}}
@keyframes maPremiumSpeak{50%{transform:scale(1.05) translateY(-1px)}}
@keyframes maPremiumPulse{50%{opacity:.55;transform:scale(1.12)}}
@media(max-height:570px){
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"]{
 height:calc(var(--ma-chat-vh,100dvh) - 90px)!important;
 bottom:max(54px,var(--ma-companion-bottom,16px))!important
 }
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy{padding-top:94px!important}
}
@media(prefers-reduced-motion:reduce){
 html.matchapp-ai-android body #ma-avatar-home,
 html.matchapp-ai-android body #ma-avatar-home *{animation:none!important;transition:none!important}
}
html.reduce-motion body #ma-avatar-home *{animation:none!important;transition:none!important}
`;
(document.head||document.documentElement).appendChild(style);
function polish(){
 var root=document.getElementById('ma-avatar-home');
 if(!root)return;
 var dismiss=root.querySelector('#ma-av-dismiss');
 if(dismiss){dismiss.textContent='×';dismiss.title='Close Jonas';}
 var menu=root.querySelector('#ma-av-menu');
 if(menu)menu.hidden=true;
 var talk=root.querySelector('#ma-av-talk');
 if(talk)talk.onclick=function(){
  var input=document.getElementById('specific-search-input')||
    document.getElementById('discover-new-input')||
    document.getElementById('ma-jonas-global-input');
  if(input)input.focus({preventScroll:true});
 };
 var photo=root.querySelector('.ma-av-portrait');
 if(photo)photo.setAttribute('aria-label','Open Jonas conversation; drag to move');
}
window.__matchappJonasPremium47={refresh:polish};
polish();
document.addEventListener('DOMContentLoaded',polish,{once:true});
var retries=0,timer=setInterval(function(){
 polish();
 if(document.getElementById('ma-avatar-home')||++retries>30)clearInterval(timer);
},240);
})();