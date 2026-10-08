(function(){
'use strict';
if(!window.MatchAppNativeVoice&&!window.MATCHAPP_ANDROID)return;
if(!/^(?:\/|\/index\.html|\/discover\.html)$/.test(location.pathname))return;
if(window.__matchappCompanionV44){window.__matchappCompanionV44.refresh();return}
var css=document.createElement('style');css.id='ma-companion-v44-style';
css.textContent="\nhtml.matchapp-ai-android body #ma-avatar-home{position:fixed!important;top:auto!important;left:auto!important;right:var(--ma-companion-right,14px)!important;bottom:var(--ma-companion-bottom,16px)!important;width:118px!important;height:118px!important;min-width:0!important;min-height:0!important;max-width:none!important;margin:0!important;padding:0!important;display:block!important;overflow:visible!important;border:0!important;border-radius:50%!important;box-shadow:none!important;background:transparent!important;z-index:10050!important;isolation:isolate}\nhtml.matchapp-ai-android body #ma-avatar-home .ma-av-portrait{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;aspect-ratio:1!important;border:3px solid #ebc775!important;outline:2px solid #3a2245;border-radius:50%!important;overflow:hidden!important;box-sizing:border-box!important;box-shadow:0 5px 28px #07030ab8,0 0 23px #cbab6070!important;cursor:pointer;touch-action:none;background:#180e23!important}\n#ma-avatar-home .ma-reference-art{border-radius:50%!important;animation:maCompanionBreath 5.6s ease-in-out infinite!important}\n#ma-avatar-home .ma-av-portrait:after,#ma-avatar-home:after{display:none!important}\n#ma-avatar-home .ma-av-topline{display:none!important}\n#ma-avatar-home .ma-av-copy{position:absolute!important;top:auto!important;left:auto!important;right:0!important;bottom:calc(100% + 16px)!important;width:min(82vw,304px)!important;min-width:230px!important;max-width:calc(100vw - 24px)!important;height:auto!important;max-height:min(53vh,370px);overflow-y:auto!important;box-sizing:border-box!important;padding:16px!important;display:none!important;z-index:5!important;border-radius:20px!important;border:1px solid #caa96088!important;box-shadow:0 16px 48px #000b!important;background:linear-gradient(145deg,#271430fa,#0d0b1bf8)!important;backdrop-filter:blur(14px)}\n#ma-avatar-home[data-open=\"true\"] .ma-av-copy{display:block!important}\n#ma-avatar-home .ma-av-copy strong{font-size:16px!important;line-height:1.3!important}\n#ma-avatar-home .ma-av-copy small{font-size:12px!important}\n#ma-avatar-home .ma-av-controls button{min-height:40px!important;font-size:12px!important;padding:9px 12px!important}\n#ma-avatar-home #ma-av-settings{display:block!important;position:relative!important;min-height:40px!important;width:100%!important;margin:8px 0!important;padding:8px 12px!important;border:1px solid #d8b874!important;border-radius:999px!important;background:#1b1229!important;color:#ffdea4!important}\n#ma-avatar-home #ma-av-reply{font-size:12px!important;line-height:1.45!important;max-height:102px!important}\n#ma-avatar-home #ma-av-state{position:absolute!important;bottom:-10px!important;left:50%!important;transform:translateX(-50%)!important;max-width:135px!important;white-space:nowrap!important;justify-content:center!important;z-index:4!important;pointer-events:none!important;font-size:10px!important;padding:5px 9px!important;background:#180e24f5!important;border-color:#dab46799!important}\n#ma-avatar-home #ma-av-state:before{flex:none!important}\n#ma-avatar-home #ma-av-menu{position:absolute;z-index:5;right:-4px;top:-7px;display:grid;place-items:center;width:35px;height:35px;min-height:35px;border-radius:50%;border:2px solid #d9b86c;background:#241332;color:#f9e5b2;font-size:20px;line-height:1;box-shadow:0 3px 10px #0804119e;cursor:pointer}\n#ma-avatar-home #ma-av-cancel-mic[hidden]{display:none!important}\n#ma-avatar-home #ma-av-cancel-mic{border:1px solid #d8b874!important;border-radius:99px!important;padding:8px 11px!important;color:#ffe9bb!important;background:#271831!important}\n#ma-avatar-home #ma-av-dismiss{float:right;margin:-7px -6px 0 5px;border:0;background:transparent;color:#f8d994;font-size:23px}\n#ma-avatar-home[data-state=\"listening\"] .ma-av-portrait{border-color:#74ecd7!important;box-shadow:0 0 0 5px #55d5ba39,0 0 33px #55d5babb!important;animation:maCompanionListen 1.1s ease-in-out infinite alternate}\n#ma-avatar-home[data-state=\"thinking\"] .ma-av-portrait{border-color:#bda2ff!important;box-shadow:0 0 28px #ab83ffbb!important;animation:maCompanionThink 1.7s linear infinite}\n#ma-avatar-home[data-state=\"speaking\"] .ma-av-portrait{border-color:#ebc66b!important;box-shadow:0 0 0 5px #e7b54a45,0 0 28px #dfb657bb!important;animation:maCompanionSpeak .65s ease-in-out infinite alternate}\n@keyframes maCompanionBreath{50%{transform:scale(1.025) translateY(-1px)}}\n@keyframes maCompanionListen{to{box-shadow:0 0 0 10px #55d5ba20,0 0 40px #55d5bacc}}\n@keyframes maCompanionThink{50%{filter:brightness(1.17)}}\n@keyframes maCompanionSpeak{to{box-shadow:0 0 0 9px #e7b54a20,0 0 39px #dfb657cc}}\n@media(max-width:380px){html.matchapp-ai-android body #ma-avatar-home{width:100px!important;height:100px!important}}\n@media(prefers-reduced-motion:reduce){#ma-avatar-home .ma-reference-art,#ma-avatar-home .ma-av-portrait{animation:none!important}}\n";
(document.head||document.documentElement).appendChild(css);
function loc(en,pt){var s=String(window.MATCH_LANG||document.documentElement.lang||'en').toLowerCase();return s.startsWith('pt')?pt:en}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function locate(node,right,bottom){
 var w=window.innerWidth||360,h=window.innerHeight||700;
 var size=node.getBoundingClientRect().width||118;
 node.style.setProperty('--ma-companion-right',clamp(right,6,Math.max(6,w-size-6))+'px');
 node.style.setProperty('--ma-companion-bottom',clamp(bottom,16,Math.max(16,h-size-32))+'px');
}
function attach(){
 var node=document.getElementById('ma-avatar-home');
 if(!node)return false;
 if(node.parentElement!==document.body)document.body.appendChild(node);
 if(node.dataset.companionV44==='1')return true;
 node.dataset.companionV44='1';node.dataset.open='false';
 var photo=node.querySelector('.ma-av-portrait'),copy=node.querySelector('.ma-av-copy');
 if(!photo||!copy)return false;
 // Avatar settings must be reachable from the compact expanded companion panel.
 var settings=node.querySelector('#ma-av-settings');
 if(settings)copy.insertBefore(settings,copy.querySelector('.ma-av-controls'));
 photo.setAttribute('role','button');photo.setAttribute('tabindex','0');
 photo.setAttribute('aria-label',loc('Talk to your AI avatar','Falar com seu avatar de IA'));
 var toggle=document.createElement('button');toggle.id='ma-av-menu';toggle.type='button';
 toggle.textContent='⋯';toggle.setAttribute('aria-label',loc('Avatar options','Opções do avatar'));toggle.setAttribute('aria-expanded','false');
 node.appendChild(toggle);
 var close=document.createElement('button');close.type='button';close.id='ma-av-dismiss';close.textContent='×';
 close.setAttribute('aria-label',loc('Close options','Fechar opções'));copy.prepend(close);
 function panel(open){node.dataset.open=open?'true':'false';toggle.setAttribute('aria-expanded',String(open))}
 toggle.addEventListener('click',function(e){e.stopPropagation();panel(node.dataset.open!=='true')});
 close.addEventListener('click',function(){panel(false);toggle.focus()});
 var cancel=document.createElement('button');cancel.type='button';cancel.id='ma-av-cancel-mic';
 cancel.textContent=loc('Cancel microphone','Cancelar microfone');cancel.hidden=true;
 copy.querySelector('.ma-av-controls')?.appendChild(cancel);
 cancel.addEventListener('click',function(){window.MatchAppNativeVoice?.stopListening?.();cancel.hidden=true});
 document.addEventListener('matchapp:voice-state',function(e){
  var active=e.detail?.state==='listening';
  cancel.hidden=!active;
 });
 document.addEventListener('keydown',function(e){if(e.key==='Escape')panel(false)});
 photo.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();node.querySelector('#ma-av-talk')?.click()}});
 var drag=null,suppressClick=false;
 photo.addEventListener('pointerdown',function(e){
  if(e.button!==0)return;
  var rect=node.getBoundingClientRect();
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,right:window.innerWidth-rect.right,bottom:window.innerHeight-rect.bottom,moved:false};
  try{photo.setPointerCapture(e.pointerId)}catch(_){}
 });
 photo.addEventListener('pointermove',function(e){
  if(!drag||e.pointerId!==drag.id)return;
  var dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.abs(dx)+Math.abs(dy)>13)drag.moved=true;
  if(drag.moved)locate(node,drag.right-dx,drag.bottom-dy);
 });
 photo.addEventListener('pointerup',function(e){
  if(!drag||e.pointerId!==drag.id)return;
  suppressClick=drag.moved;if(suppressClick)node.dataset.dragged='true';drag=null;
  if(suppressClick){setTimeout(function(){suppressClick=false},300);return}
  node.querySelector('#ma-av-talk')?.click();
 });
 photo.addEventListener('click',function(e){if(suppressClick){e.preventDefault();e.stopPropagation()}});
 photo.addEventListener('pointercancel',function(){drag=null});
 window.addEventListener('resize',function(){
  var rect=node.getBoundingClientRect();
  locate(node,window.innerWidth-rect.right,window.innerHeight-rect.bottom);
 });
 document.addEventListener('click',function(e){
  if(node.dataset.open==='true'&&!node.contains(e.target)&&!e.target.closest?.('.ma-avatar-dialog'))panel(false);
 });
 document.addEventListener('matchapp:langchange',function(){
  photo.setAttribute('aria-label',loc('Talk to your AI avatar','Falar com seu avatar de IA'));
  toggle.setAttribute('aria-label',loc('Avatar options','Opções do avatar'));
 });
 return true;
}
function avatarCommand(text){
 var input=String(text||'').trim();
 if(!/(?:change|switch|wrong|different|male|female|mudar|trocar|errad[ao]|masculin[ao]|feminin[ao])/i.test(input)||
    !/(?:voice|avatar|voz|personagem|assistente)/i.test(input))return false;
 attach();
 var node=document.getElementById('ma-avatar-home');if(!node)return false;
 var message=loc(
  'You can change Jonas or Aureya using Avatar options → Change avatar. Jonas uses a male Android text-to-speech voice; Aureya uses a female voice. If your phone does not have a compatible voice installed, the app will ask you to enable one rather than silently use the wrong voice.',
  'Você pode escolher Jonas ou Aureya em Opções do avatar → Trocar avatar. Jonas usa voz masculina do Android e Aureya voz feminina. Se o telefone não tiver uma voz compatível, o aplicativo pedirá para ativá-la em vez de usar a voz errada.');
 document.dispatchEvent(new CustomEvent('matchapp:avatar-answer',{detail:{text:message}}));
 if(node.dataset.open!=='true')node.querySelector('#ma-av-menu')?.click();
 return true;
}
window.matchappAvatarVoiceCommand=avatarCommand;
window.addEventListener('click',function(e){
 var btn=e.target.closest?.('.home-ask-composer .gold-btn');if(!btn)return;
 var input=document.getElementById('specific-search-input'),text=String(input?.value||'').trim();
 if(!avatarCommand(text))return;
 input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
 e.preventDefault();e.stopImmediatePropagation();
},true);
function keepClearOfConsent(){
 var node=document.getElementById('ma-avatar-home');
 if(!node||node.dataset.dragged==='true')return;
 var bottom=16,h=window.innerHeight||700,w=window.innerWidth||360;
 document.querySelectorAll('[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i]').forEach(function(el){
  var r=el.getBoundingClientRect(),style=window.getComputedStyle(el);
  if((style.position==='fixed'||style.position==='sticky')&&
     r.height>=32&&r.height<170&&r.width>w*.65&&
     r.top>h-190&&r.bottom>h-14){
   bottom=Math.max(bottom,Math.ceil(h-r.top+14));
  }
 });
 node.style.setProperty('--ma-companion-bottom',bottom+'px');
}
function refresh(){attach();keepClearOfConsent()}
setInterval(keepClearOfConsent,1350);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
var attempts=0,check=setInterval(function(){if(attach()||++attempts>20)clearInterval(check)},400);
window.__matchappCompanionV44={refresh:refresh};
})();