(function(){
'use strict';
if(!/^(?:\/|\/index\.html|\/discover\.html)$/.test(location.pathname))return;
if(window.__matchappAndroidAvatarHomeInstalled)return;
window.__matchappAndroidAvatarHomeInstalled=true;
var ORIGIN='https://appassets.androidplatform.net/assets/avatar-ai/';
var PERSONAS={jonas:{name:'Jonas',img:ORIGIN+'jonas.jpg'},aureya:{name:'Aureya',img:ORIGIN+'aureya.jpg'}};
var currentUserId='',preview=null,avatar='jonas',lastTitle='',hydratedUser='',cloudChangeAt=0;
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
 try{return currentUserId&&localStorage.getItem(key(currentUserId))==='aureya'?'aureya':'jonas'}catch(_){return 'jonas'}
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
 choiceChangedAt=Date.now();
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
  option.innerHTML='<img alt="" src="'+PERSONAS[name].img+'"><strong>'+PERSONAS[name].name+'</strong>';
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
document.head.appendChild(css);
function install(){
 var home=document.getElementById('search-box');
 if(home&&!document.getElementById('ma-avatar-home')){
  var node=document.createElement('div');node.className='ma-avatar-home';node.id='ma-avatar-home';
  node.innerHTML='<div class="ma-av-portrait"><canvas width="180" height="216" aria-label="Animated AI avatar preview"></canvas></div><div class="ma-av-copy"><strong id="ma-av-name"></strong><small id="ma-av-help"></small><button type="button" id="ma-av-talk"></button><button type="button" id="ma-av-settings"></button></div>';
  var composer=home.querySelector('.home-ask-composer');home.insertBefore(node,composer||home.firstChild);
  preview=node;
  node.querySelector('#ma-av-talk').onclick=function(){startConversation('')};
  node.querySelector('#ma-av-settings').onclick=selector;
  renderAvatar();
 }
 // Typed answers stay in the existing text AI interface and retain their
 // per-answer Read Aloud control. Offer an optional conversion to voice chat.
 if(location.pathname==='/discover.html'&&!document.getElementById('ma-av-text-to-voice')){
  var el=document.createElement('button');el.id='ma-av-text-to-voice';el.type='button';
  el.textContent=words('🎙 Voice conversation with your avatar','🎙 Conversar por voz com seu avatar');
  el.style.cssText='display:block;margin:10px auto;padding:10px 16px;border:1px solid #bda367;border-radius:99px;background:#181327;color:#f1d18a;font-weight:700';
  el.onclick=function(){startConversation('')};
  var target=document.querySelector('.newsearch-row');target?.parentElement?.insertBefore(el,target);
 }
}
function startConversation(prompt){
 if(!getSession()){signup();return}
 if(!window.MatchAppNativeExperience||!window.MatchAppNativeExperience.openVoiceAvatarForPersona)return;
 try{window.MatchAppNativeExperience.openVoiceAvatarForPersona(String(prompt||'').slice(0,1000),preferred())}catch(e){console.warn('Avatar voice unavailable',e)}
}
var pictures={};
function renderAvatar(){
 avatar=preferred();
 if(!preview)return;
 preview.querySelector('#ma-av-name').textContent='✦ '+PERSONAS[avatar].name+' Ai';
 preview.querySelector('#ma-av-help').textContent=words('Your entertainment AI • Ready when you are','Sua IA de entretenimento • Pronta para conversar');
 preview.querySelector('#ma-av-talk').textContent=words('Start voice chat','Conversar por voz');
 preview.querySelector('#ma-av-settings').textContent=words('Change avatar','Trocar avatar');
 var image=pictures[avatar];
 if(!image){image=new Image();image.onload=function(){if(preview)drawFace(performance.now())};image.src=PERSONAS[avatar].img;pictures[avatar]=image}
 drawFace(performance.now());
}
function drawFace(t){
 if(!preview||document.hidden)return;
 var img=pictures[avatar],c=preview.querySelector('canvas');if(!img||!img.complete||!img.naturalWidth||!c)return;
 var ctx=c.getContext('2d'),w=c.width,h=c.height;
 var sway=motion?0:Math.sin(t/2200)*1.25;
 var breathing=motion?1:1+Math.sin(t/1600)*.006;
 ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(sway+w/2,h/2);ctx.scale(breathing,breathing);ctx.translate(-w/2,-h/2);
 var iw=img.naturalWidth,ih=img.naturalHeight;
 var crop=Math.min(iw/w,ih/h);var sw=w*crop,sh=h*crop;
 ctx.drawImage(img,(iw-sw)/2,(ih-sh)*.16,sw,sh,0,0,w,h);
 if(!motion){
  var blink=(t%4600<170)?Math.sin(Math.PI*(t%4600)/170):0;
  if(blink>.1){
   // Reproject original eye texture for a subtle, photo-derived blink.
   for(var ex of [.34,.57])ctx.drawImage(img,ex*iw,.31*ih,.115*iw,.048*ih,(ex-.02)*w,.33*h,.12*w,Math.max(1,(1-blink*.9)*.034*h));
  }
 }
 ctx.restore();
}
function frame(t){if(preview)drawFace(t);if(!document.hidden)requestAnimationFrame(frame);else setTimeout(function(){requestAnimationFrame(frame)},1300)}
function syncUser(){
 var next=preferred();if(next!==avatar){avatar=next;renderAvatar()}
 if(currentUserId&&lastLoadedUser!==currentUserId&&window.supabaseClient&&typeof window.supabaseClient.from==='function'){
  var id=currentUserId;lastLoadedUser=id;
  window.supabaseClient.from('profiles').select('preferred_ai_avatar').eq('id',id).maybeSingle()
   .then(function(result){
    if(result&&result.error)return;
    if(id!==currentUserId||Date.now()-choiceChangedAt<1200)return;
    var name=result&&result.data&&result.data.preferred_ai_avatar;
    if(!PERSONAS[name])return;
    try{localStorage.setItem(key(id),name)}catch(_){}
    if(name!==avatar){avatar=name;renderAvatar()}
   }).catch(function(){});
 }
 if(!currentUserId)lastLoadedUser='';
 if(!document.getElementById('ma-avatar-home')||(!preview&&location.pathname==='/'))install();
}
function onMicCapture(){
 document.addEventListener('click',function(e){
  var mic=e.target.closest&&e.target.closest('#mic-btn-index');
  if(!mic)return;
  if(!getSession()){e.preventDefault();e.stopImmediatePropagation();signup()}
 },true);
}
function boot(){install();onMicCapture();window.matchappAndroidAvatarHome={preferred:preferred,showPicker:selector,open:startConversation,render:renderAvatar};requestAnimationFrame(frame);
 document.addEventListener('matchapp:authchange',syncUser);
 document.addEventListener('matchapp:langchange',renderAvatar);
 document.addEventListener('visibilitychange',syncUser);
 setInterval(syncUser,2600);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
