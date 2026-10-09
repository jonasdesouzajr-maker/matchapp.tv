/* MatchApp Ai: premium compact Android Jonas chat.
 * Preserves the existing authenticated matching, AI, credits and native voice handlers. */
(function(){
'use strict';
if(window.__matchappJonasPremium47||(!window.MatchAppNativeVoice&&!window.MATCHAPP_ANDROID))return;
if(/^\/kids(?:\/|$)/.test(location.pathname))return;
window.__matchappJonasPremium47=true;
var FACE='https://appassets.androidplatform.net/assets/jonas/faces/jonas/';
var style=document.createElement('style');
style.id='ma-jonas-premium-47';
style.textContent=`
html.matchapp-ai-android body #ma-avatar-home{
 --bubble:78px!important;--face:72px!important;
 width:78px!important;height:78px!important;
 right:max(16px,env(safe-area-inset-right))!important;
 bottom:max(86px,env(safe-area-inset-bottom))!important;
 border:0!important;border-radius:50%!important;
 box-shadow:none!important;background:transparent!important;
 transition:width .34s cubic-bezier(.22,1,.36,1),height .34s cubic-bezier(.22,1,.36,1),border-radius .34s cubic-bezier(.22,1,.36,1)!important
}
html.matchapp-ai-android body #ma-avatar-home:not([data-open="true"]) .ma-av-portrait{
 width:78px!important;height:78px!important;min-width:78px!important;min-height:78px!important;
 max-width:78px!important;max-height:78px!important;top:0!important;left:0!important;
 border:2px solid #f0d7a0!important;border-radius:50%!important;overflow:hidden!important;
 aspect-ratio:1/1!important;clip-path:circle(50%)!important;
 box-shadow:0 14px 28px #050308a6,0 0 0 5px #c9a15c2e,inset 0 0 0 1px #fff3!important;
 background:#140c1c!important
}
html.matchapp-ai-android body #ma-avatar-home:not([data-open="true"]) .ma-av-copy{
 visibility:hidden!important;opacity:0!important;pointer-events:none!important
}
html.matchapp-ai-android body #ma-avatar-home:not([data-open="true"]) #ma-av-state{
 top:auto!important;right:-2px!important;left:auto!important;bottom:2px!important;
 transform:none!important;width:16px!important;height:16px!important;
 min-width:16px!important;max-width:16px!important;overflow:hidden!important;
 text-indent:-999px!important;font-size:0!important;padding:0!important;
 background:#6ee0b4!important;border:3px solid #1b1026!important;
 border-radius:50%!important;box-shadow:0 0 0 2px #e7c77a88!important
}
html.matchapp-ai-android body #ma-avatar-home[data-state="thinking"] #ma-av-state{background:#c4b0ff!important}
html.matchapp-ai-android body #ma-avatar-home[data-state="listening"] #ma-av-state{background:#7de7df!important}
html.matchapp-ai-android body #ma-avatar-home[data-state="speaking"] #ma-av-state{background:#ffe3ad!important}
html.matchapp-ai-android body #ma-avatar-home #ma-av-menu{display:none!important}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"]{
 --bubble:72px!important;--face:72px!important;
 right:max(12px,env(safe-area-inset-right))!important;left:auto!important;
 width:min(440px,calc(100vw - 24px))!important;
 height:min(455px,calc(var(--ma-chat-vh,100dvh) - max(120px,var(--ma-companion-bottom,86px)) - 12px))!important;
 max-height:calc(var(--ma-chat-vh,100dvh) - 16px)!important;
 min-height:240px!important;border-radius:28px!important;overflow:hidden!important;
 border:1px solid #e4c78a99!important;
 box-shadow:0 28px 70px #05020ccc,0 0 0 1px #f3ddaa22 inset!important;
 background:linear-gradient(165deg,#2a1838,#120e1c)!important
}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"][data-has-conversation="true"]{
 height:min(620px,calc(var(--ma-chat-vh,100dvh) - max(120px,var(--ma-companion-bottom,86px)) - 12px))!important
}
html.matchapp-ai-android body #jonas-plus-box{
 inset:auto max(12px,env(safe-area-inset-right)) max(86px,env(safe-area-inset-bottom)) auto!important;
 width:min(440px,calc(100vw - 24px))!important;
 height:min(590px,calc(100dvh - 120px))!important;
 max-height:calc(100dvh - 108px)!important;border-radius:28px!important;
 border:1px solid #e6cb90b8!important;
 background:linear-gradient(168deg,#2c1a3c 0%,#16101f 48%,#100c18 100%)!important;
 box-shadow:0 28px 70px #05020ccc!important
}
html.matchapp-ai-android body #jonas-plus-shade{
 background:#05020a78!important;backdrop-filter:blur(6px)!important
}
html.matchapp-ai-android body #jonas-plus-head{
 gap:12px!important;padding:14px 14px 12px!important;align-items:center!important
}
html.matchapp-ai-android body #jonas-plus-head strong{font:750 17px/1.2 system-ui!important;color:#ffe7b4!important}
html.matchapp-ai-android body .jp-live-face{
 width:52px!important;height:52px!important;border-radius:50%!important;object-fit:cover!important;
 object-position:center 16%!important;border:2px solid #f0d7a0!important;flex:none!important;
 box-shadow:0 8px 18px #0008!important;background:#140c1c!important
}
html.matchapp-ai-android body #jonas-plus-messages{padding:14px 14px 8px!important;gap:10px!important}
html.matchapp-ai-android body #jonas-plus-messages .jp-msg{
 border-radius:16px 16px 16px 6px!important;background:#2c213c!important;
 border:1px solid #ffffff14!important;font:440 14px/1.55 system-ui!important
}
html.matchapp-ai-android body #jonas-plus-messages .jp-msg.self{
 border-radius:16px 16px 6px 16px!important;background:#4a3566!important
}
html.matchapp-ai-android body #jonas-plus-remaining,#jonas-plus-plan{
 margin:0 12px!important;padding:8px 10px!important;border-radius:12px!important;
 background:#1a1326!important;border:1px solid #d7b56a44!important;
 color:#f3e4c4!important;font:560 12px/1.45 system-ui!important
}
html.matchapp-ai-android body #jonas-plus-plan{margin-top:8px!important;color:#d9cbe4!important}
html.matchapp-ai-android body #jonas-plus-refresh{
 min-height:36px!important;margin:8px 12px 0!important;border-radius:999px!important;
 border:1px solid #c9a56a!important;background:transparent!important;color:#ffe7b8!important;
 font:700 12px system-ui!important;padding:0 14px!important
}
html.matchapp-ai-android body #jonas-plus-form{padding:12px!important;gap:8px!important}
html.matchapp-ai-android body #jonas-plus-input{
 min-height:48px!important;border-radius:14px!important;background:#120e1b!important;
 border:1px solid #8d7a9a66!important;font:450 14px/1.4 system-ui!important
}
html.matchapp-ai-android body .jp-card{
 border-radius:24px!important;border:1px solid #e4c78a88!important;
 background:linear-gradient(160deg,#2a1836,#120d1b)!important;
 box-shadow:0 18px 40px #0006!important
}
html.matchapp-ai-android body #jonas-plus-play-note{
 margin:12px 0 0!important;padding:10px 12px!important;border-radius:14px!important;
 background:#1a1324!important;border:1px dashed #d7b56a77!important;
 color:#f0e2c8!important;font:450 12px/1.5 system-ui!important
}
html.matchapp-ai-android body #jonas-plus-buy:disabled{
 opacity:1!important;cursor:not-allowed!important;
 background:#24182f!important;color:#f6e7c8!important;
 border:1px dashed #e0c48a!important
}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy{
 position:absolute!important;inset:0!important;
 border-radius:28px!important;box-sizing:border-box!important;
 padding:96px 14px 12px!important;display:flex!important;flex-direction:column!important;gap:8px!important;
 background:
  radial-gradient(ellipse 90% 42% at 12% -8%,#7a4e9655,transparent 70%),
  linear-gradient(165deg,#2c1b3a 0%,#1a1428 42%,#110e1c 100%)!important;
 border:0!important;box-shadow:none!important;
 opacity:1!important;visibility:visible!important;pointer-events:auto!important;
 transform:none!important;overflow:hidden!important
}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-portrait{
 position:absolute!important;top:14px!important;left:14px!important;right:auto!important;
 width:72px!important;height:72px!important;min-width:72px!important;min-height:72px!important;
 max-width:72px!important;max-height:72px!important;border-radius:50%!important;overflow:hidden!important;
 aspect-ratio:1/1!important;clip-path:circle(50%)!important;
 border:2px solid #f0d7a0!important;
 box-shadow:0 10px 24px #06020a99,0 0 0 4px #c9a15c33!important;
 background:#140c1c!important;z-index:6!important
}
html.matchapp-ai-android body #ma-avatar-home .ma-reference-art{opacity:0!important;visibility:hidden!important}
html.matchapp-ai-android body #ma-avatar-home .ma-jonas-live{
 position:absolute!important;inset:0!important;border-radius:inherit!important;overflow:hidden!important;z-index:1!important
}
html.matchapp-ai-android body #ma-avatar-home :is(.ma-jonas-base,.ma-jonas-frame){
 position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
 object-fit:cover!important;object-position:center 16%!important;border-radius:50%!important;
 pointer-events:none!important
}
html.matchapp-ai-android body #ma-avatar-home .ma-jonas-base{opacity:1!important;z-index:1!important}
html.matchapp-ai-android body #ma-avatar-home .ma-jonas-frame{
 z-index:2!important;clip-path:ellipse(25% 17% at 50% 72%)!important;
 opacity:0!important;transition:opacity .14s ease-out!important;
}
html.matchapp-ai-android body #ma-avatar-home .ma-jonas-frame.is-blink{
 clip-path:ellipse(38% 16% at 50% 42%)!important
}
html.matchapp-ai-android body #ma-avatar-home .ma-jonas-frame.is-show{opacity:1!important}
html.matchapp-ai-android body #ma-avatar-home.ma-face-fallback .ma-reference-art{
 opacity:1!important;visibility:visible!important
}
html.matchapp-ai-android body #ma-avatar-home.ma-face-fallback .ma-jonas-live{display:none!important}
html.matchapp-ai-android body #ma-avatar-home[data-state="idle"] .ma-av-portrait{
 animation:none!important
}
html.matchapp-ai-android body #ma-avatar-home[data-state="speaking"] .ma-av-portrait{
 border-color:#ffe3ad!important;animation:none!important
}
html.matchapp-ai-android body #ma-avatar-home[data-state="listening"] .ma-av-portrait{border-color:#8ef0e4!important}
html.matchapp-ai-android body #ma-avatar-home[data-state="thinking"] .ma-av-portrait{border-color:#c9b6ff!important}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy>strong{
 position:absolute!important;top:20px!important;left:98px!important;right:56px!important;
 margin:0!important;font:750 20px/1.15 system-ui!important;letter-spacing:-.03em!important;
 text-align:left!important;color:#ffe9b6!important;overflow:hidden!important;
 text-overflow:ellipsis!important;white-space:nowrap!important
}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy>small{
 position:absolute!important;top:46px!important;left:98px!important;right:56px!important;
 margin:0!important;font:450 12px/1.35 system-ui!important;color:#d5c6e2!important;
 text-align:left!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important
}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] #ma-av-state{
 top:68px!important;left:98px!important;right:auto!important;bottom:auto!important;
 transform:none!important;width:auto!important;max-width:calc(100% - 160px)!important;
 height:auto!important;min-width:0!important;text-indent:0!important;overflow:hidden!important;
 font:650 11px/1.2 system-ui!important;letter-spacing:.01em!important;
 color:#f0ddb4!important;background:transparent!important;border:0!important;
 padding:0!important;box-shadow:none!important;white-space:nowrap!important;
 text-overflow:ellipsis!important
}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] #ma-av-state:before{
 content:"";display:inline-block;width:7px;height:7px;margin-right:6px;vertical-align:1px;
 border-radius:50%;background:#78dfb9
}
html.matchapp-ai-android body #ma-avatar-home[data-state="thinking"] #ma-av-state:before{background:#c4b0ff}
html.matchapp-ai-android body #ma-avatar-home[data-state="listening"] #ma-av-state:before{background:#7de7df}
html.matchapp-ai-android body #ma-avatar-home[data-state="speaking"] #ma-av-state:before{background:#ffe3ad}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] #ma-av-dismiss{
 top:14px!important;right:14px!important;width:40px!important;height:40px!important;
 min-width:40px!important;min-height:40px!important;border-radius:50%!important;
 border:1px solid #9a849f!important;background:#3a2846!important;
 color:#ffefc8!important;box-shadow:none!important;font:400 22px/1 system-ui!important;z-index:8!important
}
html.matchapp-ai-android body #ma-avatar-home .ma-av-copy .ma-av-controls{
 display:flex!important;flex-wrap:wrap!important;gap:8px!important;align-items:center!important;
 justify-content:flex-start!important;margin:0!important;padding:0!important;flex-shrink:0!important
}
html.matchapp-ai-android body #ma-avatar-home #ma-av-talk{display:none!important}
html.matchapp-ai-android body #ma-avatar-home .ma-av-controls button{
 min-height:36px!important;height:36px!important;padding:0 12px!important;margin:0!important;
 border-radius:999px!important;border:1px solid #b9a0c4!important;background:#32243f!important;
 color:#ffe9b8!important;font:700 12px system-ui!important;box-shadow:none!important
}
html.matchapp-ai-android body #ma-avatar-home #ma-av-stop{
 background:#4a2433!important;border-color:#e0a0b0!important;color:#ffd7df!important
}
html.matchapp-ai-android body #ma-avatar-home .ma-av-chat-content{
 flex:1 1 auto!important;min-height:0!important;min-width:0!important;width:100%!important;max-width:100%!important;max-height:none!important;
 display:flex!important;flex-direction:column!important;gap:10px!important;
 padding:2px 2px 4px!important;overflow-y:auto!important;overflow-x:hidden!important;
 overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important
}
/* Prevent min-content shrink from turning AI responses into vertical letters. */
html.matchapp-ai-android body #ma-avatar-home .ma-av-chat-content #chat-log{
 box-sizing:border-box!important;display:block!important;flex:1 1 auto!important;
 width:100%!important;max-width:100%!important;min-width:0!important;
}
html.matchapp-ai-android body #ma-avatar-home .ma-av-chat-content .chat-results-grid{
 box-sizing:border-box!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;
 width:100%!important;max-width:100%!important;min-width:0!important;
}
html.matchapp-ai-android body #ma-avatar-home .ma-av-chat-content #chat-log :is(
 .chat-bubble:not(.self),.chat-answer-text,.chat-answer,.chat-message,.chat-entry.bot){
 box-sizing:border-box!important;display:block!important;float:none!important;
 flex:1 1 auto!important;min-width:0!important;width:100%!important;max-width:100%!important;
 white-space:pre-wrap!important;overflow-wrap:break-word!important;word-break:normal!important;
 line-height:1.55!important
}
html.matchapp-ai-android body #ma-avatar-home #ma-av-reply:not([hidden]){
 align-self:flex-start!important;width:fit-content!important;max-width:92%!important;
 border:1px solid #9675a544!important;border-left:2px solid #ebce8d!important;
 border-radius:16px 16px 16px 6px!important;
 background:linear-gradient(145deg,#3a294c,#261c36)!important;
 color:#f6eef8!important;padding:11px 13px!important;
 font:440 14px/1.55 system-ui!important;box-shadow:none!important;
 margin:0!important;overflow-wrap:anywhere!important
}
html.matchapp-ai-android body #ma-avatar-home #ma-av-reply:not([hidden]):before{
 display:block;content:"JONAS";color:#e9cd91;font:750 9px/1.3 system-ui;letter-spacing:.14em;margin-bottom:5px
}
html.matchapp-ai-android body #ma-avatar-home .home-ask-composer,
html.matchapp-ai-android body #ma-avatar-home .newsearch-row,
html.matchapp-ai-android body #ma-avatar-home #ma-jonas-continue{
 position:relative!important;bottom:auto!important;z-index:3!important;
 display:flex!important;align-items:center!important;justify-content:flex-start!important;
 gap:8px!important;flex-wrap:wrap!important;width:100%!important;
 max-width:100%!important;box-sizing:border-box!important;
 margin:0!important;padding:8px!important;flex-shrink:0!important;
 border:1px solid #8d759a80!important;border-radius:18px!important;
 background:linear-gradient(160deg,#241832,#161222)!important;
 box-shadow:0 -8px 24px #08030d33!important
}
html.matchapp-ai-android body #ma-avatar-home #ma-jonas-continue p{
 font:450 12px/1.45 system-ui!important;color:#d2c3dc!important;margin:0!important
}
html.matchapp-ai-android body #ma-avatar-home .home-ask-composer textarea,
html.matchapp-ai-android body #ma-avatar-home .newsearch-row textarea,
html.matchapp-ai-android body #ma-avatar-home #ma-jonas-global-input{
 min-height:46px!important;height:48px!important;max-height:96px!important;
 width:100%!important;flex:1 1 100%!important;margin:0!important;
 box-sizing:border-box!important;padding:12px 12px!important;
 border:1px solid #6d5a7866!important;border-radius:14px!important;
 background:#100d1ae6!important;color:#fff6fb!important;font:450 15px/1.4 system-ui!important;
 box-shadow:none!important;resize:none!important
}
html.matchapp-ai-android body #ma-avatar-home .home-ask-composer button,
html.matchapp-ai-android body #ma-avatar-home .newsearch-row button,
html.matchapp-ai-android body #ma-avatar-home #ma-jonas-continue button{
 min-height:40px!important;height:40px!important;width:auto!important;
 padding:0 14px!important;margin:0!important;border-radius:999px!important;
 border:1px solid #a08cb0!important;background:#3a2948!important;
 color:#ffe9b7!important;box-shadow:none!important;font:700 13px system-ui!important
}
html.matchapp-ai-android body #ma-avatar-home .mic-btn{
 width:40px!important;min-width:40px!important;padding:0!important
}
html.matchapp-ai-android body #ma-avatar-home .composer-send,
html.matchapp-ai-android body #ma-avatar-home .home-ask-composer .gold-btn,
html.matchapp-ai-android body #ma-avatar-home #ma-jonas-continue button{
 background:linear-gradient(120deg,#ffe3ae,#d7ac62)!important;
 border-color:#f3ddb0!important;color:#24152c!important;font-weight:800!important;
 margin-left:auto!important
}
html.matchapp-ai-android body #ma-avatar-home #chat-log{
 flex:1 1 auto!important;min-height:0!important;overflow:visible!important;
 display:flex!important;flex-direction:column!important;gap:8px!important
}
html.matchapp-ai-android body #ma-avatar-home .chat-bubble{
 max-width:92%!important;border-radius:16px!important;margin:0!important;
 padding:11px 13px!important;font:440 14px/1.55 system-ui!important;
 overflow-wrap:anywhere!important
}
html.matchapp-ai-android body #ma-avatar-home .chat-user{
 align-self:flex-end!important;border-radius:16px 16px 6px 16px!important;
 background:linear-gradient(160deg,#53406e,#3a2a52)!important;color:#fff!important;
 border:1px solid #b297d055!important
}
html.matchapp-ai-android body #ma-avatar-home .chat-assistant{
 align-self:flex-start!important;border-radius:16px 16px 16px 6px!important;
 background:linear-gradient(145deg,#382746,#261b34)!important;color:#f4ecf8!important;
 border:1px solid #ffffff12!important;border-left:2px solid #ebce8d!important
}
html.matchapp-ai-android body #ma-avatar-home .chat-answer-text{font:440 14px/1.55 system-ui!important;color:#f4ecf8!important}
html.matchapp-ai-android body #ma-avatar-home #ma-jonas-voice-notice{
 position:absolute!important;left:14px!important;right:14px!important;bottom:118px!important;
 z-index:8!important;padding:10px 12px!important;margin:0!important;
 border-radius:14px!important;border:1px solid #e0c48a!important;
 background:#3d2748f2!important;color:#f8ead4!important;
 box-shadow:0 12px 28px #0008!important;font:500 12px/1.45 system-ui!important
}
@keyframes maPremiumBreath{50%{transform:scale(1.02)}}
@keyframes maPremiumSpeak{50%{transform:scale(1.035)}}
@media(min-width:720px){
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"],
 html.matchapp-ai-android body #jonas-plus-box{
  width:min(480px,46vw)!important;
  right:max(24px,env(safe-area-inset-right))!important
 }
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-portrait{
  width:80px!important;height:80px!important;min-width:80px!important;min-height:80px!important;
  max-width:80px!important;max-height:80px!important
 }
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy{padding-top:104px!important}
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy>strong{left:108px!important;font-size:22px!important}
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy>small,
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"] #ma-av-state{left:108px!important}
}
@media(min-width:1000px){
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"],
 html.matchapp-ai-android body #jonas-plus-box{width:min(520px,38vw)!important}
}
@media(max-height:570px){
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"]{
  height:min(455px,calc(var(--ma-chat-vh,100dvh) - 28px))!important
 }
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-portrait{
  width:56px!important;height:56px!important;min-width:56px!important;min-height:56px!important;
  max-width:56px!important;max-height:56px!important;top:10px!important
 }
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy{padding-top:76px!important}
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy>strong{top:12px!important;font-size:16px!important}
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy>small{top:34px!important}
 html.matchapp-ai-android body #ma-avatar-home[data-open="true"] #ma-av-state{top:52px!important}
}
@media(prefers-reduced-motion:reduce){
 html.matchapp-ai-android body #ma-avatar-home,
 html.matchapp-ai-android body #ma-avatar-home *{animation:none!important;transition:none!important}
}
html.reduce-motion body #ma-avatar-home *{animation:none!important;transition:none!important}
`;
(document.head||document.documentElement).appendChild(style);
var faceSlot=0,faceName='rest',faceRequest=0,speakTimer=0,blinkTimer=0,shownState='';
function reduced(){
 try{
  if(document.documentElement.classList.contains('reduce-motion'))return true;
  return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 }catch(e){return false}
}
function loc(en,pt){return /^pt/i.test(document.documentElement.lang||'')?pt:en}
function mountFaces(portrait){
 if(!portrait||portrait.querySelector('.ma-jonas-live'))return;
 var live=document.createElement('span');
 live.className='ma-jonas-live';
 var base=document.createElement('img');
 base.className='ma-jonas-base';base.alt='Jonas';base.decoding='async';base.src=FACE+'rest.jpg';
 live.appendChild(base);
 for(var i=0;i<2;i++){
  var img=document.createElement('img');
  img.className='ma-jonas-frame';
  img.alt=i===0?'Jonas':'';
  if(i)img.setAttribute('aria-hidden','true');
  img.decoding='async';
  img.src=FACE+'rest.jpg';
  img.addEventListener('error',function(){
   var home=document.getElementById('ma-avatar-home');
   if(home)home.classList.add('ma-face-fallback');
  });
  live.appendChild(img);
 }
 portrait.appendChild(live);
}
function alive(){return typeof document!=='undefined'&&document&&typeof document.getElementById==='function'}
function showFace(name){
 if(!alive())return;
 if(!name||reduced())name='rest';
 var frames=document.querySelectorAll('#ma-avatar-home .ma-jonas-frame');
 if(frames.length<2||name===faceName)return;
 var request=++faceRequest;
 if(name==='rest'){
  faceName=name;
  frames.forEach(function(frame){frame.classList.remove('is-show')});
  return;
 }
 // Keep the base face and border absolutely steady. Only the expressive
 // mouth/eyes region overlays it, and only once its new image has loaded.
 var probe=new Image();var url=FACE+name+'.jpg',drawn=false;
 function display(){
  if(drawn||request!==faceRequest||!alive())return;
  drawn=true;
  faceName=name;
  var next=1-faceSlot,incoming=frames[next],outgoing=frames[faceSlot];
  incoming.src=url;
  incoming.classList.toggle('is-blink',name==='blink');
  incoming.classList.remove('is-show');
  requestAnimationFrame(function(){
   if(request!==faceRequest)return;
   incoming.classList.add('is-show');
   setTimeout(function(){if(request===faceRequest)outgoing.classList.remove('is-show')},155);
  });
  faceSlot=next;
 }
 probe.onload=display;
 probe.onerror=function(){if(request===faceRequest){faceName='rest';frames.forEach(function(f){f.classList.remove('is-show')})}};
 probe.src=url;
 if(probe.complete&&probe.naturalWidth)display();
}
function syncExpression(){
 if(!alive())return;
 var root=document.getElementById('ma-avatar-home');
 if(!root)return;
 var state=root.dataset.state||'idle';
 if(state===shownState)return;
 shownState=state;
 clearInterval(speakTimer);speakTimer=0;
 if(state==='speaking'&&!reduced()){
  var shapes=['oh','aa','ee','smile'];
  var step=0;
  showFace(shapes[0]);
  speakTimer=setInterval(function(){
   var current=document.getElementById('ma-avatar-home');
   if(!current||current.dataset.state!=='speaking'){clearInterval(speakTimer);speakTimer=0;return}
   step=(step+1)%shapes.length;showFace(shapes[step]);
  },360);
  return;
 }
 showFace(state==='listening'?'smile':'rest');
}
function placeSheet(){
 if(!alive())return;
 var root=document.getElementById('ma-avatar-home');
 if(!root)return;
 if(root.dataset.open!=='true'){
  ['top','bottom','height','max-height'].forEach(function(prop){root.style.removeProperty(prop)});
  return;
 }
 var vv=window.visualViewport;
 var vTop=vv?vv.offsetTop:0;
 var vH=vv?vv.height:window.innerHeight;
 var keyboard=Math.max(0,window.innerHeight-(vTop+vH));
 var bottomGap=keyboard>48?10:86;
 var cap=root.dataset.hasConversation==='true'?620:455;
 var h=Math.min(cap,Math.max(220,vH-bottomGap-14));
 var top=vTop+Math.max(8,vH-bottomGap-h);
 root.style.setProperty('top',Math.round(top)+'px','important');
 root.style.setProperty('bottom','auto','important');
 root.style.setProperty('height',Math.round(h)+'px','important');
 root.style.setProperty('max-height',Math.round(h)+'px','important');
}
function pinComposer(root){
 var content=root.querySelector('.ma-av-chat-content');
 var composer=root.querySelector('.home-ask-composer,.newsearch-row,#ma-jonas-continue');
 var copy=root.querySelector('.ma-av-copy');
 if(content&&composer&&copy&&composer.parentElement===content)copy.appendChild(composer);
}
function polishPlus(){
 var head=document.getElementById('jonas-plus-head');
 if(head&&!head.querySelector('.jp-live-face')){
  var face=document.createElement('img');
  face.className='jp-live-face';
  face.alt='';
  face.decoding='async';
  face.src=FACE+'smile.jpg';
  head.insertBefore(face,head.firstChild);
 }
 var box=document.getElementById('jonas-plus-box');
 if(box&&!document.getElementById('jonas-plus-plan')){
  var plan=document.createElement('div');
  plan.id='jonas-plus-plan';
  plan.textContent=loc(
   'Jonas Plus · 30 chats / 24h · 150 / 7 days · 450 / paid cycle. Status is read from your account. It does not unlock chat by itself.',
   'Jonas Plus · 30 chats / 24h · 150 / 7 dias · 450 / ciclo pago. O status vem da sua conta e não libera o chat sozinho.'
  );
  var remain=document.getElementById('jonas-plus-remaining');
  if(remain&&remain.parentElement)remain.parentElement.insertBefore(plan,remain);
  else box.appendChild(plan);
 }
 if(box&&!document.getElementById('jonas-plus-refresh')){
  var refresh=document.createElement('button');
  refresh.id='jonas-plus-refresh';
  refresh.type='button';
  refresh.textContent=loc('Refresh status','Atualizar status');
  refresh.onclick=function(){
   var plus=window.MatchAppJonasPlus;
   if(plus&&typeof plus.refresh==='function')plus.refresh();
  };
  var form=document.getElementById('jonas-plus-form');
  if(form)box.insertBefore(refresh,form);
  else box.appendChild(refresh);
 }
 var card=document.getElementById('jonas-plus-card');
 if(card&&!document.getElementById('jonas-plus-play-note')){
  var note=document.createElement('p');
  note.id='jonas-plus-play-note';
  note.textContent=loc(
   'Google Play billing is not active in this build. Purchase, restore, and manage stay off here, and Stripe checkout is blocked in the Android app. Jonas Plus still follows the server entitlement on your MatchApp account.',
   'A cobrança do Google Play ainda não está ativa neste build. Comprar, restaurar e gerenciar ficam indisponíveis aqui, e o checkout Stripe fica bloqueado no app Android. O Jonas Plus continua seguindo a autorização do servidor na sua conta MatchApp.'
  );
  card.appendChild(note);
 }
}
function polish(){
 if(!alive())return;
 var root=document.getElementById('ma-avatar-home');
 if(!root)return;
 var hasConversation=!!root.querySelector('#chat-log .chat-bubble, #chat-log .chat-answer-text');
 if(root.dataset.hasConversation!==String(hasConversation))root.dataset.hasConversation=String(hasConversation);
 var dismiss=root.querySelector('#ma-av-dismiss');
 if(dismiss){
  // Replacing textContent on every MutationObserver callback creates an
  // unbounded childList feedback loop that can freeze the Android WebView.
  if(dismiss.textContent!=='×')dismiss.textContent='×';
  var dismissTitle=loc('Close Jonas','Fechar Jonas');
  if(dismiss.title!==dismissTitle)dismiss.title=dismissTitle;
 }
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
 if(photo){
  photo.setAttribute('aria-label',loc('Open Jonas conversation. Drag to move.','Abrir a conversa do Jonas. Arraste para mover.'));
  mountFaces(photo);
 }
 pinComposer(root);
 polishPlus();
 syncExpression();
 placeSheet();
}
var watched=false;
function watchConversation(){
 if(watched)return;
 var root=document.getElementById('ma-avatar-home');
 if(!root)return;
 watched=true;
 var observer=new MutationObserver(function(mutations){
  if(!alive()){observer.disconnect();return}
  if(mutations.some(function(m){return m.type==='childList'||m.attributeName==='data-state'||m.attributeName==='data-open'}))polish();
 });
 observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-state','data-open']});
}
window.__matchappJonasPremium47={refresh:polish,placeSheet:placeSheet};
polish();watchConversation();
document.addEventListener('DOMContentLoaded',function(){polish();watchConversation()},{once:true});
document.addEventListener('matchapp:avatar-state',function(){syncExpression();placeSheet()});
window.visualViewport&&window.visualViewport.addEventListener('resize',placeSheet);
window.visualViewport&&window.visualViewport.addEventListener('scroll',placeSheet);
window.addEventListener('resize',placeSheet);
if(!reduced()){
 blinkTimer=setInterval(function(){
  if(!alive()){clearInterval(blinkTimer);return}
  var root=document.getElementById('ma-avatar-home');
  if(!root||root.dataset.state&&root.dataset.state!=='idle')return;
  showFace('blink');
  setTimeout(function(){
   var now=document.getElementById('ma-avatar-home');
   if(now&&(!now.dataset.state||now.dataset.state==='idle'))showFace('rest');
  },140);
 },5200);
}
var retries=0,timer=setInterval(function(){
 if(!alive()){clearInterval(timer);return}
 polish();watchConversation();
 if(document.getElementById('ma-avatar-home')||++retries>30)clearInterval(timer);
},240);
})();
