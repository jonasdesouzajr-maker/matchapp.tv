(function(){
'use strict';
if(!window.MatchAppNativeVoice&&!window.MATCHAPP_ANDROID&&!document.documentElement.classList.contains('matchapp-ai-android'))return;
// Adult Android header only: persistent CSS also hides entries inserted later.
if(!document.getElementById('matchapp-android-no-kids-entry')){
 var kidsStyle=document.createElement('style');kidsStyle.id='matchapp-android-no-kids-entry';
 kidsStyle.textContent='html #matchapp-kids-entry,html .ma-kids-mode-entry{display:none!important}';
 (document.head||document.documentElement).appendChild(kidsStyle);
}
if(/^\/kids(?:\/|$)/.test(location.pathname))return;
if(window.__matchappAndroidAvatarHomeInstalled){window.matchappAndroidAvatarHome?.refresh?.();return;}
window.__matchappAndroidAvatarHomeInstalled=true;
var ORIGIN='https://appassets.androidplatform.net/assets/avatar-ai/';
var ART=ORIGIN+'approved-reference.jpg';
var avatarState='idle',stateDeadline=null;
var PERSONAS={jonas:{name:'Jonas',img:ORIGIN+'jonas.jpg'}};
var currentUserId='',preview=null,avatar='jonas',lastTitle='',hydratedUser='',lastLoadedUser='',cloudChangeAt=0;
var motion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
function getSession(){
 try{
  var keys=Object.keys(localStorage).filter(function(k){return /^sb-.+-auth-token$/.test(k)});
  for(var i=0;i<keys.length;i++){
   var s=JSON.parse(localStorage.getItem(keys[i])||'null');
   if(s&&s.user&&s.user.id&&s.access_token)return s;
  }
 }catch(_){}
 return null;
}
function key(user){return 'matchapp_android_ai_persona_'+user;}
function preferred(){
 var s=getSession();currentUserId=s&&s.user?s.user.id:'';
 return 'jonas';
}
function locale(){
 var l=(window.MATCH_LANG||document.documentElement.lang||'en').toLowerCase();
 return l.startsWith('pt')?'pt':'en';
}
function words(en,pt){return locale()==='pt'?pt:en}
function signup(){
 // Registration and sign-in happen in MatchApp Ai's existing first-party flow.
 var dialog=document.createElement('div');dialog.className='ma-avatar-dialog';
 dialog.innerHTML='<section role="dialog" aria-modal="true" aria-label="Avatar sign in"><h3>'+words('Meet your AI avatar','Conheça seu avatar de IA')+'</h3><p>'+words('Create your free MatchApp Ai account or sign in to choose Jonas or Aureya and save your AI avatar settings.','Crie sua conta gratuita do MatchApp Ai ou entre para escolher Jonas ou Aureya e salvar as preferências.')+'</p><div class="ma-av-buttons"><button data-av-auth="register">'+words('Create free account','Criar conta grátis')+'</button><button data-av-auth="signin">'+words('Sign in','Entrar')+'</button></div><button class="ma-av-close" aria-label="Close">×</button></section>';
 dialog.querySelector('.ma-av-close').onclick=function(){dialog.remove()};
 dialog.addEventListener('click',function(e){
  if(e.target===dialog){dialog.remove();return}
  var action=e.target.closest('[data-av-auth]');if(!action)return;
  dialog.remove();
  // Existing account page handles both register and sign-in.
  if(typeof window.openAuthModal==='function')window.openAuthModal();
  else location.href='/profile/profile.html?auth='+encodeURIComponent(action.dataset.avAuth);
 });
 document.body.appendChild(dialog);
}
function cloud(){try{return typeof supabaseClient!=='undefined'?supabaseClient:(window.supabaseClient||null)}catch(_){return null}}
async function loadCloudChoice(){
 var session=getSession(),db=cloud();if(!session||!db||session.user.id===hydratedUser)return;
 var id=session.user.id;hydratedUser=id;var since=cloudChangeAt;
 try{
  var response=await db.from('profiles').select('preferred_ai_avatar').eq('id',id).maybeSingle();
  var name=response?.data?.preferred_ai_avatar;
  if(id!==getSession()?.user?.id||cloudChangeAt!==since||!PERSONAS[name])return;
  localStorage.setItem(key(id),name);renderAvatar();
 }catch(_){hydratedUser=''}
}
function save(name){
 if(!PERSONAS[name])return;
 var s=getSession();if(!s){signup();return}
 try{localStorage.setItem(key(s.user.id),name)}catch(_){}
 cloudChangeAt=Date.now();
 if(window.supabaseClient&&typeof window.supabaseClient.from==='function'){
  window.supabaseClient.from('profiles').update({preferred_ai_avatar:name}).eq('id',s.user.id)
   .then(function(result){if(result&&result.error)console.warn('Avatar preference saved on device; account sync unavailable')})
   .catch(function(){console.warn('Avatar preference saved on device; account sync unavailable')});
 }
 avatar=name;renderAvatar();document.dispatchEvent(new CustomEvent('matchapp:android-avatar-choice',{detail:{avatar:name}}));
}
function selector(){
 if(!getSession()){signup();return}
 var dialog=document.createElement('div');dialog.className='ma-avatar-dialog';
 dialog.innerHTML='<section role="dialog" aria-modal="true" aria-label="Choose AI avatar"><h3>'+words('Your AI avatar','Seu avatar de IA')+'</h3><p>'+words('Choose one AI face. Only your selection appears on Home. You can change it at any time.','Escolha um avatar. Apenas o escolhido aparece na página inicial. Você pode alterá-lo a qualquer momento.')+'</p><div class="ma-av-choice"></div><button class="ma-av-close">'+words('Close','Fechar')+'</button></section>';
 var chooser=dialog.querySelector('.ma-av-choice');
 Object.keys(PERSONAS).forEach(function(name){
  var option=document.createElement('button');option.dataset.persona=name;
  option.innerHTML='<span class="ma-choice-art" data-persona="'+name+'"></span><strong>'+PERSONAS[name].name+'</strong>';
  if(name===avatar)option.classList.add('selected');
  option.onclick=function(){save(name);dialog.remove()};chooser.appendChild(option);
 });
 dialog.querySelector('.ma-av-close').onclick=function(){dialog.remove()};
 dialog.onclick=function(e){if(e.target===dialog)dialog.remove()};
 document.body.appendChild(dialog);
}
var css=document.createElement('style');css.id='ma-android-avatar-preview-style';css.textContent=
'.ma-avatar-home{display:flex;align-items:center;gap:13px;min-height:115px;padding:12px;border-radius:19px;border:1px solid rgba(232,193,100,.32);background:linear-gradient(120deg,rgba(23,13,36,.95),rgba(15,25,45,.96));margin:4px auto 14px;max-width:680px;overflow:hidden}' +
'.ma-av-portrait{position:relative;flex:0 0 86px;width:86px;height:101px;border-radius:50% 50% 46% 46%;border:2px solid #dec06c;box-shadow:0 0 23px rgba(226,185,81,.23);overflow:hidden;background:#24142d}' +
'.ma-av-portrait canvas{display:block;width:100%;height:100%;border-radius:inherit}' +
'.ma-av-portrait:after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:linear-gradient(125deg,rgba(255,240,187,.11),transparent 60%)}' +
'.ma-av-copy{flex:1;min-width:0}.ma-av-copy strong{display:block;color:#f3d38a;font:800 15px/1.3 system-ui}.ma-av-copy small{display:block;color:#cfc6d8;font:500 11.5px/1.5 system-ui;margin:3px 0 8px}.ma-av-copy button{margin-right:7px;margin-bottom:3px;padding:6px 10px;border-radius:999px;border:1px solid rgba(225,196,119,.47);color:#f0d891;background:rgba(218,177,81,.08);font:700 11px system-ui;cursor:pointer}' +
'.ma-avatar-dialog{position:fixed;inset:0;z-index:2147483640;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.83)}' +
'.ma-avatar-dialog section{position:relative;width:min(100%,360px);padding:24px 18px 18px;border-radius:20px;background:linear-gradient(150deg,#231333,#0c1222);color:#faf6ff;border:1px solid rgba(238,202,125,.49);box-shadow:0 20px 80px #0009;text-align:center}' +
'.ma-avatar-dialog h3{font-size:19px;color:#f2d18b;margin:0 25px 8px}.ma-avatar-dialog p{font-size:13px;line-height:1.55;color:#d9d1de}.ma-av-buttons,.ma-av-choice{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin:20px 0}.ma-av-buttons button,.ma-av-choice button{min-height:44px;flex:1;padding:10px;border-radius:13px;border:1px solid #a68954;background:#241735;color:#f3dfb1;font-weight:750}' +
'.ma-av-choice button{flex:0 1 135px}.ma-av-choice button.selected{outline:2px solid #efd37f}.ma-av-choice img{display:block;height:96px;width:90px;object-fit:cover;object-position:50% 25%;margin:auto auto 5px;border-radius:15px}.ma-av-choice strong{display:block}.ma-av-close{border:0;background:transparent;color:#fff;font-size:19px;padding:9px}' +
'@media(max-width:380px){.ma-avatar-home{gap:9px;padding:10px}.ma-av-portrait{flex-basis:74px;width:74px;height:88px}}' +
'@media(prefers-reduced-motion:reduce){.ma-av-portrait canvas{animation:none!important}}';
css.textContent+="\n/* Native portrait experience. All rules stay scoped to the installed app. */\nhtml.matchapp-ai-android #ma-avatar-home{display:block;position:relative;isolation:isolate;width:100%;max-width:none;min-height:320px;height:clamp(300px,43vh,440px);padding:0;margin:0 0 12px;overflow:hidden;border-radius:24px;border:1px solid #b59451;background:#120e1b;box-shadow:0 0 25px #cc9a3822}\nhtml.matchapp-ai-android #ma-avatar-home .ma-av-portrait{position:absolute;inset:0;width:100%;height:100%;margin:0;border:0;border-radius:0;box-shadow:none;overflow:hidden;background:#17101d}\n#ma-av-photo{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 26%;animation:maPortraitBreathe 7s ease-in-out infinite;transform-origin:50% 55%}\n#ma-avatar-home:after{content:\"\";position:absolute;inset:0;z-index:0;pointer-events:none;background:linear-gradient(180deg,#07061155,transparent 35%,#080610aa 72%,#080610)}\n#ma-avatar-home .ma-av-topline{position:absolute;z-index:2;left:14px;right:14px;top:12px;display:flex;justify-content:space-between;align-items:center;color:#ffe4a3;font-size:12px;font-weight:750}\n#ma-avatar-home #ma-av-settings{min-width:44px;min-height:44px;border-radius:99px;border:1px solid #dfbc7077;background:#110c20b3;color:#fbe8b7;font:600 12px system-ui;padding:8px 12px}\n#ma-avatar-home .ma-av-copy{position:absolute;bottom:15px;left:18px;right:18px;z-index:2;text-align:left}\n#ma-avatar-home .ma-av-copy strong{font:800 24px/1.2 system-ui;color:#ffe7ad}\n#ma-avatar-home .ma-av-copy small{font:500 13px/1.4 system-ui;color:#eee7f3;margin:7px 0 10px}\n#ma-avatar-home .ma-av-controls{display:flex;gap:9px}\n#ma-avatar-home .ma-av-controls button{min-height:44px;padding:10px 16px;margin:0;font:700 13px system-ui;border-radius:99px;border:1px solid #e7bf70;background:linear-gradient(115deg,#f0d68d,#c39b4e);color:#24182b}\n#ma-avatar-home #ma-av-listen{background:#21182dcc;color:#f4dda7}\n#ma-av-reply{font:500 14px/1.5 system-ui;color:#fff;padding:10px 12px;background:#140e22df;border:1px solid #b9935544;border-radius:12px;margin:8px 0;max-height:100px;overflow:auto}\n#ma-avatar-home [hidden]{display:none!important}\nhtml.matchapp-ai-android #search-box>h2,html.matchapp-ai-android #search-box>p{display:none!important}\nhtml.matchapp-ai-android #search-box{padding:10px!important;background:linear-gradient(160deg,#171120,#0d0915)!important;border-radius:26px!important}\nhtml.matchapp-ai-android #ma-ai-entry{margin-top:12px!important}\nhtml.matchapp-ai-android .ma-avatar-dialog{z-index:2147483647!important}\nhtml.matchapp-ai-android .ma-avatar-dialog button{min-height:44px}\n@keyframes maPortraitBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.018) translateY(-1px)}}\n@media(prefers-reduced-motion:reduce){#ma-av-photo{animation:none!important}}\n";
css.textContent+=`
/* The approved reference layout is preserved; baked-in labels were removed for reusable portrait assets. */
html.matchapp-ai-android #ma-avatar-home{height:auto;min-height:0;max-width:420px;margin:0 auto 12px;display:flex;flex-direction:column;background:#100d16}
html.matchapp-ai-android #ma-avatar-home .ma-av-portrait{position:relative;flex:none;inset:auto;width:100%;height:auto;aspect-ratio:390/500;background:#171015}
#ma-avatar-home .ma-av-portrait:after{display:none}
#ma-avatar-home:after{display:none}
#ma-avatar-home #ma-av-photo{display:none}
#ma-avatar-home .ma-reference-art{position:absolute;inset:0;background-image:url('${ART}');background-repeat:no-repeat;background-size:295.38% 153.6%;background-position:28.05% 0;animation:maPortraitBreathe 7s ease-in-out infinite;transform-origin:50% 60%}

#ma-avatar-home[data-persona="jonas"][data-state="listening"] .ma-reference-art{background-size:auto 445.22%;background-position:19.30% 87.53%}
#ma-avatar-home[data-persona="jonas"][data-state="thinking"] .ma-reference-art{background-size:auto 445.22%;background-position:39.05% 87.53%}
#ma-avatar-home[data-persona="jonas"][data-state="speaking"] .ma-reference-art{background-size:auto 445.22%;background-position:98.09% 87.53%}
#ma-avatar-home .ma-av-topline{top:10px;left:12px;right:12px}
#ma-avatar-home .ma-av-topline>span{padding:5px 9px;border-radius:99px;background:#100b17c9}
#ma-avatar-home .ma-av-copy{position:relative;inset:auto;padding:14px 16px 16px;width:100%;box-sizing:border-box;background:linear-gradient(130deg,#19111f,#0b0910);border-top:1px solid #b9935555}
#ma-avatar-home .ma-av-copy strong{font-size:24px}
#ma-avatar-home .ma-av-controls{flex-wrap:wrap}
#ma-av-state{position:absolute;bottom:10px;left:12px;z-index:2;display:flex;align-items:center;gap:7px;border:1px solid #d1b47488;border-radius:99px;background:#100b17db;padding:7px 11px;font:600 12px system-ui;color:#fce9bc}
#ma-av-state:before{content:"";width:7px;height:7px;border-radius:50%;background:#e5c773}
#ma-avatar-home[data-state="speaking"] #ma-av-state:before{animation:maVoicePulse .7s ease-in-out infinite alternate;background:#cfa0ff}
@keyframes maVoicePulse{to{opacity:.4;transform:scale(1.5)}}
#ma-avatar-home #ma-av-stop{background:#26172b;color:#f4dda7}
.ma-choice-art{display:block;width:100%;height:128px;border-radius:12px;background-image:url('${ART}');background-size:295.38% 153.6%;background-position:28.05% 0}

@media(prefers-reduced-motion:reduce){#ma-avatar-home .ma-reference-art,#ma-av-state:before{animation:none!important}}
`;
document.head.appendChild(css);
function repairShell(){
 document.documentElement.classList.add('matchapp-ai-android');
 document.documentElement.dataset.matchappAvatarUi='20261008-3';
 document.querySelectorAll('#matchapp-kids-entry,.ma-kids-mode-entry').forEach(function(el){
  if(el.style.getPropertyValue('display')!=='none')el.style.setProperty('display','none','important');
  el.hidden=true;el.setAttribute('aria-hidden','true');el.setAttribute('tabindex','-1');
 });
 document.getElementById('matchapp-android-avatar-launcher')?.remove();
}
function install(){
 repairShell();
 var home=document.getElementById('search-box');
 if(!home&&location.pathname==='/discover.html'){
  var row=document.querySelector('.newsearch-row');
  if(row){home=document.getElementById('ma-avatar-discover-host');if(!home){home=document.createElement('section');home.id='ma-avatar-discover-host';row.parentElement.insertBefore(home,row)}}
 }
 if(!home && document.body && !/^\/kids(?:\/|$)/.test(location.pathname)) {
  home=document.getElementById('ma-avatar-global-host');
  if(!home){home=document.createElement('section');home.id='ma-avatar-global-host';document.body.appendChild(home)}
 }
 var entry=document.getElementById('ma-ai-entry'),rail=document.getElementById('trending-rail');
 if(entry&&rail&&entry.parentElement===rail.parentElement&&entry.nextElementSibling!==rail)rail.before(entry);
 if(home&&!document.getElementById('ma-avatar-home')){
  var node=document.createElement('div');node.className='ma-avatar-home';node.id='ma-avatar-home';
  node.innerHTML='<div class="ma-av-portrait"><img id="ma-av-photo" alt="" decoding="async"><div class="ma-reference-art" role="img"></div><span id="ma-av-state" role="status"></span></div><div class="ma-av-topline"><span>MatchApp Ai</span><button type="button" id="ma-av-settings" aria-label="Avatar settings"></button></div><div class="ma-av-copy"><strong id="ma-av-name"></strong><small id="ma-av-help"></small><p id="ma-av-reply" role="status" aria-live="polite" hidden></p><div class="ma-av-controls"><button type="button" id="ma-av-talk"></button><button type="button" id="ma-av-listen" hidden></button><button type="button" id="ma-av-stop" hidden></button></div></div>';
  var composer=home.querySelector('.home-ask-composer');home.insertBefore(node,composer||home.firstChild);
  preview=node;
  node.querySelector('#ma-av-talk').onclick=function(){startConversation('')};
  node.querySelector('#ma-av-settings').onclick=selector;
  node.querySelector('#ma-av-listen').onclick=function(){speakReply(document.getElementById('ma-av-reply')?.textContent||'')};
  renderAvatar();
 }
 preview=document.getElementById('ma-avatar-home');
 // The existing answer controls handle optional playback; the portrait owns the microphone.
 document.getElementById('ma-av-text-to-voice')?.remove();
}
function startConversation(prompt){
 if(prompt){if(typeof window.matchAppNativeVoiceResult==='function')window.matchAppNativeVoiceResult(String(prompt));return}
 var mic=document.getElementById('mic-btn-index')||document.getElementById('mic-btn-discover');
 if(mic){window.MatchAppNativeVoice?.stopSpeaking?.();setAvatarState('listening');mic.click();return}
 showReply(words('The microphone is loading. Please try again in a moment.','O microfone está carregando. Tente novamente em instantes.'));
}
function speakReply(text){
 if(!text)return;
 window.MatchAppNativeVoice?.setPersona?.(preferred());
 if(window.MatchAppNativeVoice&&typeof window.MatchAppNativeVoice.speak==='function'){
  window.MatchAppNativeVoice.speak(text,window.MATCH_LANG||document.documentElement.lang||'en-US');
 }else if(typeof window.readAloud==='function')window.readAloud(text);
}
function showReply(text){
 install();var el=document.getElementById('ma-av-reply');if(!el)return;
 el.textContent=text;el.hidden=false;document.getElementById('ma-av-listen').hidden=false;
}
function greet(input){
 var value=String(input?.value||'').trim();
 if(!/^(?:hello|hi|hey|hey there|hello there|oi|olá|ola|bom dia|boa tarde|boa noite|hola|bonjour|ciao)[.!?\s]*$/i.test(value))return false;
 var name=PERSONAS[preferred()].name;
 var text=words("Hi, I'm "+name+". What would you like to watch, read or listen to?",'Olá, sou '+name+'. O que você gostaria de assistir, ler ou ouvir?');
 var voice=!!window.MatchAppVoiceOrigin?.consume?.(value);
 input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));showReply(text);if(voice)speakReply(text);
 return true;
}
var pictures={};
function renderAvatar(){
 avatar=preferred();
 if(!preview)return;
 preview.querySelector('#ma-av-name').textContent=words('Meet ','Conheça ')+PERSONAS[avatar].name+' ✦';
 preview.dataset.persona=avatar;
 preview.querySelector('.ma-reference-art')?.setAttribute('aria-label',PERSONAS[avatar].name+' — MatchApp Ai');
 window.MatchAppNativeVoice?.setPersona?.(avatar);
 setAvatarState(avatarState);
 preview.querySelector('#ma-av-help').textContent=words('Your entertainment AI • Ready when you are','Sua IA de entretenimento • Pronta para conversar');
 preview.querySelector('#ma-av-talk').textContent=words('Chat with ','Conversar com ')+PERSONAS[avatar].name;
 preview.querySelector('#ma-av-settings').textContent=words('About Jonas','Sobre Jonas');
 var stop=preview.querySelector('#ma-av-stop');if(stop)stop.textContent=words('Stop','Parar');
 var image=preview.querySelector('#ma-av-photo');
 if(image){image.removeAttribute('src');image.alt=''}
 var listen=preview.querySelector('#ma-av-listen');if(listen)listen.textContent=words('Listen','Ouvir');
}
function setAvatarState(state){
 clearTimeout(stateDeadline);
 if(state==='thinking')stateDeadline=setTimeout(function(){setAvatarState('idle')},25000);
 avatarState=state;
 var node=document.getElementById('ma-avatar-home');if(!node)return;
 node.dataset.state=state;
 var labels={idle:words('Ready','Pronto'),listening:words('Listening…','Ouvindo…'),thinking:words('Thinking…','Pensando…'),speaking:words('Speaking','Falando')};
 node.querySelector('#ma-av-state').textContent=labels[state]||labels.idle;
 node.querySelector('#ma-av-stop').hidden=state!=='speaking';
}

function syncUser(){
 var next=preferred();if(next!==avatar){avatar=next;renderAvatar()}
 if(currentUserId&&lastLoadedUser!==currentUserId&&window.supabaseClient&&typeof window.supabaseClient.from==='function'){
  var id=currentUserId;lastLoadedUser=id;
  window.supabaseClient.from('profiles').select('preferred_ai_avatar').eq('id',id).maybeSingle()
   .then(function(result){
    if(result&&result.error)return;
    if(id!==currentUserId||Date.now()-cloudChangeAt<1200)return;
    var name=result&&result.data&&result.data.preferred_ai_avatar;
    if(!PERSONAS[name])return;
    try{localStorage.setItem(key(id),name)}catch(_){}
    if(name!==avatar){avatar=name;renderAvatar()}
   }).catch(function(){});
 }
 if(!currentUserId)lastLoadedUser='';
 install();
}
function onMicCapture(){
 window.addEventListener('click',function(e){
  var target=e.target.closest&&e.target.closest('#ma-av-talk,#ma-av-settings,#ma-av-listen,#ma-av-stop,.home-ask-composer .gold-btn');
  if(!target)return;
  if(target.matches('.home-ask-composer .gold-btn')){
   if(greet(document.getElementById('specific-search-input'))){e.preventDefault();e.stopImmediatePropagation()}
   return;
  }
  e.preventDefault();e.stopImmediatePropagation();
  if(target.id==='ma-av-talk')startConversation('');
  if(target.id==='ma-av-settings')selector();
  if(target.id==='ma-av-stop'){window.MatchAppNativeVoice?.stopSpeaking?.();setAvatarState('idle')}
  if(target.id==='ma-av-listen')speakReply(document.getElementById('ma-av-reply')?.textContent||'');
 },true);
 window.addEventListener('keydown',function(e){
  if(e.target.id==='specific-search-input'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&greet(e.target)){e.preventDefault();e.stopImmediatePropagation()}
 },true);
 document.addEventListener('matchapp:voice-state',function(e){
  setAvatarState(e.detail?.state==='listening'?'listening':e.detail?.state==='processing'?'thinking':'idle');
  var status=document.getElementById('ma-av-help');
  if(status)status.textContent=e.detail?.state==='listening'?words('Listening…','Ouvindo…'):words('Your entertainment companion','Sua companhia de entretenimento');
 });
}
document.addEventListener('matchapp:avatar-state',function(e){setAvatarState(e.detail?.state||'idle')});
document.addEventListener('matchapp:avatar-answer',function(e){if(e.detail?.text)showReply(e.detail.text)});
document.addEventListener('matchapp:avatar-speech',function(e){setAvatarState(e.detail?.speaking?'speaking':'idle')});
document.addEventListener('matchapp:voice-transcript',function(){setAvatarState('thinking')});
document.addEventListener('matchapp:avatar-voice-unavailable',function(){
 setAvatarState('idle');
 var status=document.getElementById('ma-av-help');if(status)status.textContent=words('A '+(preferred()==='jonas'?'male':'female')+' voice is unavailable for this language on your phone. Enable a matching voice in Android Text-to-speech settings and try Listen again.','Não há voz '+(preferred()==='jonas'?'masculina':'feminina')+' disponível neste idioma no aparelho. Ative uma voz correspondente nas configurações de texto para voz do Android e tente Ouvir novamente.');
});
function boot(){install();onMicCapture();window.matchappAndroidAvatarHome={preferred:preferred,showPicker:selector,open:startConversation,speak:speakReply,showReply:showReply,render:renderAvatar,refresh:install};
 document.addEventListener('matchapp:authchange',syncUser);
 document.addEventListener('matchapp:langchange',renderAvatar);
 document.addEventListener('visibilitychange',syncUser);
 setInterval(syncUser,2600);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
