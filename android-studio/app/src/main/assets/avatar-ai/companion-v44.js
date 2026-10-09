(function(){
'use strict';
if(!window.MatchAppNativeVoice&&!window.MATCHAPP_ANDROID)return;
if(/^\/kids(?:\/|$)/.test(location.pathname))return;
if(window.__matchappCompanionV44){window.__matchappCompanionV44.refresh();return}
var key='matchapp_android_chat_open',node,photo,copy,content,close,opened=false,greeting=false,speechStarted=false,greetingTimer;
function loc(en,pt){return /^pt/i.test(window.MATCH_LANG||document.documentElement.lang||'en')?pt:en}
function remember(value){try{sessionStorage.setItem(key,value?'1':'0')}catch(_){}}
function remembered(){try{return sessionStorage.getItem(key)==='1'}catch(_){return false}}
var css=document.createElement('style');css.id='ma-companion-v44-style';
css.textContent=`
html.matchapp-ai-android body #ma-avatar-home{--bubble:96px;--face:148px;box-sizing:border-box!important;position:fixed!important;inset:auto 12px var(--ma-companion-bottom,16px) auto!important;display:block!important;width:var(--bubble)!important;height:var(--bubble)!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;padding:0!important;margin:0!important;border:0!important;border-radius:50%!important;overflow:visible!important;background:transparent!important;box-shadow:none!important;z-index:10050!important;isolation:isolate;transition:width .32s ease,height .32s ease,border-radius .32s ease}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"]{width:min(440px,calc(100vw - 24px))!important;height:min(710px,calc(var(--ma-chat-vh,100dvh) - 30px))!important;border-radius:26px!important}
html.matchapp-ai-android body #ma-avatar-home .ma-av-portrait{box-sizing:border-box!important;position:absolute!important;inset:auto!important;top:0!important;left:0!important;right:auto!important;bottom:auto!important;display:block!important;flex:none!important;width:var(--bubble)!important;height:var(--bubble)!important;min-width:var(--bubble)!important;min-height:var(--bubble)!important;max-width:var(--bubble)!important;max-height:var(--bubble)!important;aspect-ratio:1/1!important;margin:0!important;padding:0!important;border:3px solid #edcc83!important;border-radius:50%!important;overflow:hidden!important;clip-path:circle(50%);box-shadow:0 4px 24px #0008!important;background:#180f23!important;transform:none!important;z-index:3;cursor:pointer;touch-action:manipulation;transition:width .32s ease,height .32s ease,left .32s ease,top .32s ease,min-width .32s ease,min-height .32s ease,max-width .32s ease,max-height .32s ease}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-portrait{--bubble:var(--face);top:14px!important;left:calc(50% - var(--face)/2)!important}
#ma-avatar-home .ma-reference-art{border-radius:50%!important;animation:maCompanionBreath 5.6s ease-in-out infinite!important}
#ma-avatar-home .ma-av-portrait:after,#ma-avatar-home:after,#ma-avatar-home .ma-av-topline{display:none!important}
html.matchapp-ai-android body #ma-avatar-home .ma-av-copy{box-sizing:border-box!important;position:absolute!important;inset:0!important;width:100%!important;max-width:none!important;min-width:0!important;height:100%!important;display:flex!important;flex-direction:column!important;gap:6px;padding:calc(var(--face) + 27px) 14px 14px!important;margin:0!important;border:1px solid #dab675!important;border-radius:26px!important;background:linear-gradient(155deg,#2c1937fa,#100b20fc)!important;box-shadow:0 15px 50px #0009!important;overflow:hidden!important;opacity:0;visibility:hidden;pointer-events:none;transform:scale(.93);transform-origin:bottom right;transition:opacity .25s ease,transform .32s ease,visibility .32s;z-index:1}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"] .ma-av-copy{opacity:1;visibility:visible;pointer-events:auto;transform:scale(1)}
#ma-avatar-home .ma-av-copy strong{font:750 17px/1.25 system-ui!important;color:#ffe5ab!important;text-align:center}
#ma-avatar-home #ma-av-help{font:400 12px/1.4 system-ui!important;color:#ddd1e6!important;margin:0!important;text-align:center}
#ma-avatar-home .ma-av-chat-content{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;padding:4px 1px}
#ma-avatar-home #ma-av-reply{font:400 14px/1.5 system-ui!important;max-height:none!important;overflow:visible!important;margin:6px 0!important;padding:10px!important}
#ma-avatar-home #ma-av-state{box-sizing:border-box;position:absolute!important;z-index:4!important;bottom:-10px!important;top:auto!important;left:50%!important;transform:translateX(-50%)!important;white-space:nowrap!important;max-width:none!important;font:600 11px/1.25 system-ui!important;padding:5px 9px!important;border:1px solid #d6b77b!important;border-radius:99px!important;background:#201229!important;color:#ffe7ba!important;pointer-events:none}
#ma-avatar-home[data-open="true"] #ma-av-state{top:calc(var(--face) + 2px)!important;bottom:auto!important}
#ma-avatar-home #ma-av-menu,#ma-avatar-home #ma-av-dismiss{position:absolute!important;top:-7px;right:-5px;z-index:5!important;display:grid;place-items:center;box-sizing:border-box!important;min-width:36px!important;min-height:36px!important;width:36px!important;height:36px!important;border:1px solid #dbba77!important;border-radius:50%!important;margin:0!important;padding:0!important;background:#291736!important;color:#ffe6ab!important;font:700 23px/1 system-ui!important;cursor:pointer}
#ma-avatar-home #ma-av-dismiss{top:10px;right:10px;width:44px!important;height:44px!important;visibility:hidden;opacity:0;transition:opacity .2s}
#ma-avatar-home[data-open="true"] #ma-av-dismiss{visibility:visible;opacity:1}
#ma-avatar-home[data-open="true"] #ma-av-menu{display:none!important}
#ma-avatar-home .ma-av-controls{display:flex!important;flex-wrap:wrap!important;gap:6px!important;justify-content:center}
#ma-avatar-home .ma-av-controls button,#ma-avatar-home #ma-av-settings{min-height:40px!important;padding:7px 12px!important;margin:0!important;border:1px solid #d9b775!important;border-radius:999px!important;background:#271631!important;color:#ffe5a9!important;font:600 12px system-ui!important;position:static!important}
#ma-avatar-home #ma-av-settings{order:3}
#ma-avatar-home [hidden]{display:none!important}
#ma-avatar-home .home-ask-composer,#ma-avatar-home .newsearch-row{display:flex!important;flex-wrap:wrap!important;gap:8px!important;margin:10px 0 0!important;width:100%!important;min-width:0!important;padding:10px!important;box-sizing:border-box!important;border:1px solid #997751!important;border-radius:19px!important;background:#140d23!important}
#ma-avatar-home .home-ask-composer textarea,#ma-avatar-home .composer textarea{box-sizing:border-box!important;flex:1 1 100%!important;width:100%!important;min-width:0!important;min-height:52px!important;max-height:100px!important;height:auto!important;padding:9px!important;font:400 15px/1.4 system-ui!important;border:0!important;border-radius:12px!important;background:#22152e!important;color:#fff!important;resize:none!important}
#ma-avatar-home .home-ask-composer button,#ma-avatar-home .composer-send,#ma-avatar-home .mic-btn{box-sizing:border-box!important;flex:0 0 auto!important;min-width:44px!important;min-height:44px!important;height:44px!important;padding:8px 14px!important;border-radius:999px!important;border:1px solid #dbb679!important;background:linear-gradient(130deg,#5c327d,#2e1b48)!important;color:#ffe1a0!important;font-size:14px!important;margin:0!important}
#ma-avatar-home .composer-send{width:auto!important;min-width:100px!important;white-space:nowrap!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important}
#ma-avatar-home .mic-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:44px!important;padding:8px!important}
#ma-avatar-home .mic-btn svg{display:block!important;width:26px!important;height:26px!important;flex:none!important}
#ma-avatar-home .composer{width:100%!important;min-width:0!important;margin:0!important}
#ma-avatar-home #chat-log{margin:0!important;padding:0!important;width:100%!important;max-width:none!important}
#ma-avatar-home .chat-bubble{max-width:100%!important;box-sizing:border-box!important;margin:8px 0!important;padding:10px!important}
#ma-avatar-home .chat-avatar{display:none!important}
#ma-avatar-home .chat-answer-text{font-size:14px!important;line-height:1.5!important}
#ma-avatar-home .chat-results-grid{grid-template-columns:minmax(0,1fr)!important;min-width:0!important}
#ma-avatar-home .composer-hint{font-size:11px!important}
html.ma-avatar-chat-installed #ma-ai-entry,html.ma-avatar-chat-installed #search-box{display:none!important}
html.ma-avatar-chat-discover .discover-head{display:none!important}
#ma-avatar-home[data-state="listening"] .ma-av-portrait{border-color:#75ead2!important}
#ma-avatar-home[data-state="thinking"] .ma-av-portrait{border-color:#bf9bff!important}
#ma-avatar-home[data-state="speaking"] .ma-av-portrait{border-color:#ffe59c!important}
#ma-avatar-home[data-open="true"][data-state="speaking"] .ma-reference-art{animation:maCompanionSpeak .9s ease-in-out infinite!important}
@keyframes maCompanionBreath{50%{transform:scale(1.025)}}
@keyframes maCompanionSpeak{50%{transform:scale(1.045) translateY(-1px)}}
@media(max-height:650px){#ma-avatar-home{--face:108px!important}}
@media(prefers-reduced-motion:reduce){#ma-avatar-home,#ma-avatar-home *{animation:none!important;transition:none!important}}
html.reduce-motion #ma-avatar-home,html.reduce-motion #ma-avatar-home *{animation:none!important;transition:none!important}
html.matchapp-ai-android body #ma-avatar-home[data-placed="true"]:not([data-open="true"]){left:var(--ma-bubble-x)!important;top:var(--ma-bubble-y)!important;right:auto!important;bottom:auto!important}
html.matchapp-ai-android body #ma-avatar-home[data-open="true"]{left:auto!important;top:auto!important;right:12px!important;bottom:max(16px,env(safe-area-inset-bottom))!important}
`;
(document.head||document.documentElement).appendChild(css);
function state(s){document.dispatchEvent(new CustomEvent('matchapp:avatar-state',{detail:{state:s}}))}
function cancelGreeting(){clearTimeout(greetingTimer);greeting=false;speechStarted=false}
function listen(){
 if(!opened)return;
 cancelGreeting();
 window.matchappAndroidAvatarHome?.open?.('');
}
function open(shouldGreet){
 if(!attach())return;
 var wasOpen=opened;opened=true;node.dataset.open='true';remember(true);copy.inert=false;
 photo.setAttribute('aria-expanded','true');
 photo.setAttribute('aria-label',loc('Talk to your AI avatar','Falar com seu avatar de IA'));
 if(wasOpen||!shouldGreet)return;
 var name='Jonas';
 var text=loc("Hi, I'm "+name+". What can I help you watch, read or listen to today?",'Olá, sou '+name+'. O que você quer assistir, ler ou ouvir hoje?');
 window.MatchAppNativeVoice?.stopSpeaking?.();
 window.matchappAndroidAvatarHome?.showReply?.(text);
 greeting=true;speechStarted=false;
 window.matchappAndroidAvatarHome?.speak?.(text);
 greetingTimer=setTimeout(function(){if(greeting&&opened){cancelGreeting();state('idle');window.matchappAndroidAvatarHome?.showReply?.(loc('Tap the microphone to speak, or type below.','Toque no microfone para falar ou digite abaixo.'));}},15000);
}
function dismiss(){
 opened=false;remember(false);cancelGreeting();
 node.dataset.open='false';copy.inert=true;photo.setAttribute('aria-expanded','false');
 window.MatchAppNativeVoice?.stopListening?.();window.MatchAppNativeVoice?.stopSpeaking?.();state('idle');photo.focus({preventScroll:true});
 if(location.pathname==='/discover.html')setTimeout(function(){if(!opened)location.href='/'},340);
}
function wireChat(){
 if(!content)return;
 if(location.pathname==='/discover.html'){
  ['chat-log','discover-loading','discover-empty'].forEach(function(id){var el=document.getElementById(id);if(el&&!content.contains(el))content.appendChild(el)});
  var row=document.querySelector('.newsearch-row');if(row&&!content.contains(row))content.appendChild(row);
  if(document.getElementById('chat-log'))document.documentElement.classList.add('ma-avatar-chat-discover');
 }else{
  var composer=document.querySelector('.home-ask-composer');if(composer&&!content.contains(composer))content.appendChild(composer);
  if(composer&&content.contains(composer)){
   document.documentElement.classList.add('ma-avatar-chat-installed');
   // Native shell recovery has stronger display rules than the shared stylesheet.
   ['ma-ai-entry','search-box'].forEach(function(id){var legacy=document.getElementById(id);if(legacy){legacy.hidden=true;legacy.style.setProperty('display','none','important')}});
  }
 }
}

var positionKey='matchapp-jonas-global-position-v1',moving=null,ignoreTapUntil=0;
function setBubblePosition(x,y,save){
 if(!node||opened)return;
 var w=node.offsetWidth||96,h=node.offsetHeight||96;
 x=Math.max(8,Math.min(window.innerWidth-w-8,x));
 y=Math.max(48,Math.min(window.innerHeight-h-8,y));
 node.dataset.placed='true';node.style.setProperty('--ma-bubble-x',x+'px');
 node.style.setProperty('--ma-bubble-y',y+'px');
 if(save)try{localStorage.setItem(positionKey,JSON.stringify({x:x,y:y}))}catch(_){}
}
function restoreBubblePosition(){
 try{var p=JSON.parse(localStorage.getItem(positionKey)||'null');
  if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))setBubblePosition(p.x,p.y,false);
 }catch(_){}
}
function dragStart(e){
 if(opened||(!e.isPrimary&&e.pointerType==='touch'))return;
 var rect=node.getBoundingClientRect();
 moving={id:e.pointerId,x:rect.left,y:rect.top,sx:e.clientX,sy:e.clientY,moved:false};
 try{photo.setPointerCapture(e.pointerId)}catch(_){}
}
function dragMove(e){
 if(!moving||moving.id!==e.pointerId||opened)return;
 var dx=e.clientX-moving.sx,dy=e.clientY-moving.sy;
 if(Math.hypot(dx,dy)>10)moving.moved=true;
 if(moving.moved)setBubblePosition(moving.x+dx,moving.y+dy,false);
}
function dragEnd(e){
 if(!moving||moving.id!==e.pointerId)return;
 if(moving.moved){ignoreTapUntil=Date.now()+420;var r=node.getBoundingClientRect();
  setBubblePosition(r.left,r.top,true)}
 moving=null;
}
function attach(){
 var el=document.getElementById('ma-avatar-home');if(!el)return false;
 if(el.parentElement!==document.body)document.body.appendChild(el);
 if(el.dataset.companionV44==='1'){wireChat();return true}
 node=el;photo=node.querySelector('.ma-av-portrait');copy=node.querySelector('.ma-av-copy');if(!photo||!copy)return false;
 node.dataset.companionV44='1';node.dataset.open='false';copy.inert=true;
 var badge=node.querySelector('#ma-av-state');if(badge)node.appendChild(badge);
 content=document.createElement('div');content.className='ma-av-chat-content';
 var reply=node.querySelector('#ma-av-reply');if(reply)content.appendChild(reply);
 copy.appendChild(content);
 var controls=node.querySelector('.ma-av-controls'),settings=node.querySelector('#ma-av-settings');if(settings)controls.appendChild(settings);
 close=document.createElement('button');close.id='ma-av-dismiss';close.type='button';close.textContent='×';close.setAttribute('aria-label',loc('Close chat','Fechar conversa'));node.appendChild(close);close.onclick=dismiss;
 var menu=document.createElement('button');menu.id='ma-av-menu';menu.type='button';menu.textContent='⋯';menu.setAttribute('aria-label',loc('Open chat','Abrir conversa'));node.appendChild(menu);menu.onclick=function(){open(false)};
 photo.setAttribute('role','button');photo.setAttribute('tabindex','0');photo.setAttribute('aria-expanded','false');photo.setAttribute('aria-label',loc('Talk to your AI avatar','Falar com seu avatar de IA'));
 photo.addEventListener('click',function(){if(Date.now()<ignoreTapUntil)return;if(opened)listen();else open(true)});
 photo.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();if(opened)listen();else open(true)}});
 photo.style.touchAction='none';photo.addEventListener('pointerdown',dragStart);photo.addEventListener('pointermove',dragMove);photo.addEventListener('pointerup',dragEnd);photo.addEventListener('pointercancel',dragEnd);restoreBubblePosition();
 var cancel=document.createElement('button');cancel.id='ma-av-cancel-mic';cancel.type='button';cancel.textContent=loc('Cancel microphone','Cancelar microfone');cancel.hidden=true;controls.appendChild(cancel);
 cancel.onclick=function(){cancelGreeting();window.MatchAppNativeVoice?.stopListening?.();state('idle');cancel.hidden=true};
 document.addEventListener('matchapp:voice-state',function(e){cancel.hidden=e.detail?.state!=='listening'});
 wireChat();
 if(remembered()||location.pathname==='/discover.html')open(false);
 return true;
}
document.addEventListener('matchapp:avatar-speech',function(e){
 if(!greeting||!opened)return;
 if(e.detail?.speaking)speechStarted=true;
 else if(speechStarted){cancelGreeting();setTimeout(listen,180)}
});
document.addEventListener('matchapp:avatar-voice-unavailable',function(){if(greeting&&opened){cancelGreeting();setTimeout(listen,180)}});
document.addEventListener('matchapp:voice-error',function(e){
 if(!opened)return;cancelGreeting();state('idle');
 var messages={
  'no-speech':loc("I didn't catch that. Tap the microphone and try again.",'Não entendi. Toque no microfone e tente novamente.'),
  'network':loc('Speech recognition could not connect. Check your connection, then retry or type below.','O reconhecimento de voz não conseguiu conectar. Verifique sua conexão ou digite abaixo.'),
  'audio':loc('The microphone is busy or unavailable. Close other recording apps, then retry.','O microfone está ocupado ou indisponível. Feche outros aplicativos de gravação e tente novamente.'),
  'busy':loc('The microphone is still finishing. Tap it again in a moment.','O microfone ainda está finalizando. Toque novamente em instantes.'),
  'language':loc('This speech language is not installed. Choose another language or type below.','Este idioma de voz não está instalado. Escolha outro idioma ou digite abaixo.'),
  'permission-denied':loc('Allow microphone access in Android app settings, then tap the microphone.','Permita acesso ao microfone nas configurações do Android e toque no microfone.')
 };
 window.matchappAndroidAvatarHome?.showReply?.(messages[e.detail?.code]||loc('Android could not start speech recognition. You can type below, or enable a speech recognition service in Android settings.','O Android não iniciou o reconhecimento de voz. Digite abaixo ou ative um serviço de reconhecimento de voz nas configurações.'));
});
document.addEventListener('matchapp:voice-partial',function(e){
 if(!opened)return;var input=document.getElementById('specific-search-input')||document.getElementById('discover-new-input');
 if(input&&e.detail?.text){input.value=e.detail.text;window.autoGrowComposer?.()}
});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&opened)dismiss()});
document.addEventListener('visibilitychange',function(){if(document.hidden){cancelGreeting();window.MatchAppNativeVoice?.stopListening?.();window.MatchAppNativeVoice?.stopSpeaking?.();state('idle')}});
function avatarCommand(text){
 var input=String(text||'').trim();
 if(!/(?:change|switch|wrong|different|male|female|mudar|trocar|errad[ao]|masculin[ao]|feminin[ao])/i.test(input)||!/(?:voice|avatar|voz|personagem|assistente)/i.test(input))return false;
 open(false);
 window.matchappAndroidAvatarHome?.showReply?.(loc('Jonas is your sole AI companion. Speech language follows your Android text-to-speech settings.','Jonas é seu único assistente de IA. O idioma de voz segue as configurações de fala do Android.'));
 return true;
}
window.matchappAvatarVoiceCommand=avatarCommand;
window.addEventListener('click',function(e){
 var btn=e.target.closest?.('.home-ask-composer .gold-btn');if(!btn)return;
 var input=document.getElementById('specific-search-input');if(!avatarCommand(input?.value))return;
 input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));e.preventDefault();e.stopImmediatePropagation();
},true);
function viewport(){
 if(!node)return;
 var v=window.visualViewport,h=v?.height||window.innerHeight,offset=v?.offsetTop||0;
 node.style.setProperty('--ma-chat-vh',h+'px');
 node.style.setProperty('--ma-companion-bottom',Math.max(16,window.innerHeight-h-offset+16)+'px');
}
function refresh(){attach();wireChat();viewport()}
window.__matchappCompanionV44={refresh:refresh,open:open,close:dismiss,listen:listen};
window.visualViewport?.addEventListener('resize',viewport);window.addEventListener('resize',function(){viewport();restoreBubblePosition()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
var attempts=0,check=setInterval(function(){if(attach()||++attempts>30)clearInterval(check)},300);
setInterval(refresh,1200);
})();
