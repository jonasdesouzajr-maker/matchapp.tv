/* MatchApp Ai · Android-only unfolding header controls.
   Uses first-party actions; never recreates authentication, notification, or billing logic. */
(function(){
'use strict';
if(!window.MATCHAPP_ANDROID || /^\/kids(?:\/|$)/.test(location.pathname))return;
if(window.matchappAndroidCloseHeaderPanel)return;
var style=document.createElement('style');style.id='ma-android-unfold-style';
style.textContent=`
.ma-unfold-veil{position:fixed!important;inset:0!important;z-index:2147482700!important;display:flex!important;
 align-items:flex-end!important;justify-content:center!important;padding:12px 12px max(15px,env(safe-area-inset-bottom))!important;
 background:#08040dba!important;backdrop-filter:blur(9px);opacity:1;transition:opacity .26s ease,backdrop-filter .26s ease}
.ma-unfold-veil.is-closing{opacity:0;pointer-events:none;backdrop-filter:blur(0)}
.ma-unfold-box{position:relative;isolation:isolate;box-sizing:border-box;width:min(520px,100%)!important;max-height:min(75dvh,750px)!important;
 display:flex;flex-direction:column;overflow:hidden;border-radius:27px;border:1px solid #f4db9b99;
 background:radial-gradient(ellipse at 95% 0%,#533374,#271734 55%,#120d1e 100%)!important;
 box-shadow:0 25px 85px #000b,0 0 0 1px #e4c68c35 inset,0 0 42px #bc80f033;
 color:#f9f4fc;font:500 14px/1.45 system-ui;opacity:1;transform:translate3d(0,0,0) scale(1);filter:blur(0);
 transition:transform .42s cubic-bezier(.2,1.14,.2,1),opacity .27s ease,filter .34s ease}
.ma-unfold-box.is-opening{opacity:.16;transform:translate3d(var(--ma-from-x,0),var(--ma-from-y,0),0) scale(.14);filter:blur(6px)}
.ma-unfold-box.is-closing{opacity:0;transform:translate3d(0,17px,0) scale(.89);filter:blur(7px)}
.ma-unfold-box::before{content:"";position:absolute;z-index:-1;pointer-events:none;inset:-70% -90%;
 background:linear-gradient(115deg,transparent 39%,#fde3a42c 50%,transparent 61%);animation:maPanelGlint 8s linear infinite}
@keyframes maPanelGlint{0%,15%{transform:translateX(-25%)}80%,100%{transform:translateX(25%)}}
.ma-unfold-head{display:flex;align-items:center;gap:12px;padding:16px 16px 13px;border-bottom:1px solid #d9b77745;flex-shrink:0}
.ma-unfold-icon{display:grid;place-items:center;width:45px;height:45px;flex:none;font-size:24px;border-radius:17px;
 border:1px solid #e6bd7877;color:#ffe3a9;background:linear-gradient(150deg,#57346d,#251833);
 box-shadow:0 0 22px #c28fff44;animation:maIconArrival .5s both}
@keyframes maIconArrival{from{opacity:0;transform:rotate(-20deg) scale(.45)}to{opacity:1;transform:none}}
.ma-unfold-head h2{flex:1;min-width:0;font:780 clamp(18px,5vw,23px)/1.22 system-ui;
 letter-spacing:-.025em;margin:0;color:#ffebba}
.ma-unfold-x{flex:none;width:43px;height:43px;padding:0;border-radius:50%;border:1px solid #c9aa87aa;
 background:#261936;color:#ffe5ac;font:400 29px system-ui;display:grid;place-items:center;cursor:pointer}
.ma-unfold-x:active{transform:scale(.87) rotate(90deg)}
.ma-unfold-body{padding:17px 16px 20px;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;
 gap:10px;min-width:0;flex:1;scrollbar-width:thin}
.ma-unfold-subtitle{margin:0 0 8px;color:#d9c8e3;font:480 13px/1.55 system-ui}
.ma-unfold-status{margin:3px 0;color:#f8d996;font-weight:650}
.ma-unfold-choice{box-sizing:border-box;width:100%;min-height:47px;border:1px solid #edcf8d9c;
 background:linear-gradient(110deg,#f9de9f,#cc9c53);color:#21102c;border-radius:15px;padding:11px 15px;
 font:750 14px system-ui;text-align:left;cursor:pointer;transition:transform .18s ease,box-shadow .2s ease,filter .2s ease;
 animation:maUnfoldOption .35s both}
@keyframes maUnfoldOption{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.ma-unfold-choice:nth-child(2){animation-delay:.045s}.ma-unfold-choice:nth-child(3){animation-delay:.08s}
.ma-unfold-choice:hover{box-shadow:0 5px 21px #d0a3634a;filter:brightness(1.09)}
.ma-unfold-choice:active{transform:scale(.975)}
.ma-unfold-choice.is-secondary{background:#32203d;color:#f6e4c9}
.ma-unfold-choice.is-danger{background:#5e2d3e;color:#ffe4e3;border-color:#e9a1af}
.ma-unfold-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;max-height:48dvh;overflow-y:auto}
.ma-unfold-grid .ma-unfold-choice{font-size:12px;min-width:0;overflow-wrap:break-word}
.ma-unfold-grid .ma-unfold-choice[aria-pressed="true"]{outline:2px solid #aa79f5;outline-offset:-4px}
.ma-unfold-note{font:450 11px/1.45 system-ui;flex-shrink:0;margin:0;padding:11px 16px;
 border-top:1px solid #edcb8b35;color:#c2accb;text-align:center}
.ma-unfold-box .ma-unfold-original-menu{position:static!important;display:grid!important;width:100%!important;
 height:auto!important;max-height:48dvh!important;overflow-y:auto!important;visibility:visible!important;
 opacity:1!important;transform:none!important;border:0!important;box-shadow:none!important;background:transparent!important;
 padding:0!important;margin:0!important;gap:7px!important}
.ma-unfold-box .ma-unfold-original-menu[hidden]{display:none!important}
.ma-unfold-original-menu>a,.ma-unfold-original-menu>button{box-sizing:border-box!important;
 display:flex!important;align-items:center!important;width:100%!important;min-height:44px!important;
 border-radius:13px!important;border:1px solid #eccb8580!important;background:#33213e!important;
 color:#fff0cc!important;text-align:left!important;padding:10px 14px!important;font:600 13px system-ui!important}
.ma-unfold-x:focus-visible,.ma-unfold-choice:focus-visible,.ma-unfold-original-menu>*:focus-visible{
 outline:2px solid #fff3c6;outline-offset:2px}
@media(min-width:720px){.ma-unfold-veil{align-items:center!important}}
@media(prefers-reduced-motion:reduce){
 .ma-unfold-veil,.ma-unfold-box,.ma-unfold-choice,.ma-unfold-icon,
 .ma-unfold-box::before{transition:none!important;animation:none!important}}
`;
(document.head||document.documentElement).appendChild(style);
var current=null, previousFocus=null, relocated=null, restoreTo=null, closing=false;
var pt=()=>/^pt/i.test(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en');
var t=(en,br)=>pt()?br:en;
var reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true||
 document.documentElement.classList.contains('reduce-motion');
var tone=(kind)=>{try{window.playMatchAppSound?.(kind)}catch(_){}};
function button(label,handler,secondary){
 var b=document.createElement('button');b.type='button';b.className='ma-unfold-choice'+(secondary?' is-secondary':'');
 b.textContent=label;b.addEventListener('click',handler);return b;
}
function restore(){
 if(previousFocus?.isConnected)previousFocus.setAttribute('aria-expanded','false');
 if(relocated&&restoreTo){relocated.hidden=true;restoreTo.appendChild(relocated);}
 var toggle=document.querySelector('#mh-topbox .ma-menu-button');
 if(toggle)toggle.setAttribute('aria-expanded','false');
 relocated=null;restoreTo=null;
}
function close(){
 if(!current||closing)return false;
 closing=true;tone('back');
 var {veil,box}=current;
 box.classList.add('is-closing');veil.classList.add('is-closing');
 var finish=()=>{if(current&&current.box===box)current=null;restore();veil.remove();
  closing=false; if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});};
 if(reduce())finish();else setTimeout(finish,270);
 return true;
}
window.matchappAndroidCloseHeaderPanel=close;
function playOrigin(box,source){
 if(reduce())return;
 var s=source.getBoundingClientRect(), b=box.getBoundingClientRect();
 var x=(s.left+s.width/2)-(b.left+b.width/2);
 var y=(s.top+s.height/2)-(b.top+b.height/2);
 box.style.setProperty('--ma-from-x',Math.round(x)+'px');
 box.style.setProperty('--ma-from-y',Math.round(y)+'px');
 box.classList.add('is-opening');
 requestAnimationFrame(()=>requestAnimationFrame(()=>box.classList.remove('is-opening')));
}
function clickOriginal(control){
 if(!control||!control.isConnected)return;
 control.dataset.maUnfoldPass='1';
 try{control.click()}finally{delete control.dataset.maUnfoldPass}
}
function activateOriginal(control){
 if(!control)return;
 // Dispatch the original trusted UI handler, never a custom replacement.
 close();
 setTimeout(()=>clickOriginal(control),reduce()?0:290);
}
function makePanel(source,kind){
 if(current){
  if(current.source===source){close();return;}
  close();setTimeout(function(){makePanel(source,kind)},reduce()?0:285);return;
 }
 previousFocus=source;
 var veil=document.createElement('div');veil.className='ma-unfold-veil';
 var box=document.createElement('section');box.className='ma-unfold-box';box.id='ma-android-unfold-box';
 source.setAttribute('aria-expanded','true');source.setAttribute('aria-controls',box.id);
 box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
 var head=document.createElement('header');head.className='ma-unfold-head';
 var icon=document.createElement('span');icon.className='ma-unfold-icon';icon.setAttribute('aria-hidden','true');
 var title=document.createElement('h2');title.id='ma-unfold-title';box.setAttribute('aria-labelledby',title.id);
 var x=button('×',close,true);x.className='ma-unfold-x';x.setAttribute('aria-label',t('Close panel','Fechar painel'));
 head.append(icon,title,x);
 var body=document.createElement('div');body.className='ma-unfold-body';
 var foot=document.createElement('p');foot.className='ma-unfold-note';
 foot.textContent=t('MatchApp Ai · Your choices stay yours.','MatchApp Ai · Suas escolhas são suas.');
 box.append(head,body,foot);veil.append(box);document.body.append(veil);
 current={source,veil,box};tone('open');
 veil.addEventListener('click',ev=>{if(ev.target===veil)close()});
 var data={
  language:[t('Language','Idioma'),'文'],
  sound:[t('Sound and feedback','Som e efeitos'),'♫'],
  notifications:[t('Notifications','Notificações'),'♧'],
  signin:[t('Your account','Sua conta'),'✦'],
  profile:[t('Your profile','Seu perfil'),'◉'],
  logout:[t('Sign out','Sair da conta'),'↪'],
  guide:[t('How it works','Como funciona'),'✧'],
  settings:[t('Settings and preferences','Ajustes e preferências'),'⚙'],
  credits:[t('Match credits','Créditos de matches'),'✦']
 }[kind]||[t('Options','Opções'),'✧'];
 title.textContent=data[0];icon.textContent=data[1];
 function note(v){var p=document.createElement('p');p.className='ma-unfold-subtitle';p.textContent=v;body.appendChild(p);}
 switch(kind){
  case 'language': {
   note(t('Choose your language. The app updates immediately.','Escolha seu idioma. O app será atualizado imediatamente.'));
   var select=document.querySelector('#lang-switcher-host select');
   if(select) {
    var grid=document.createElement('div');grid.className='ma-unfold-grid';
    [...select.options].filter(o=>!o.disabled&&o.value).forEach(o=>{
     var b=button(o.textContent.trim()||o.label,()=>{
      select.value=o.value;
      select.dispatchEvent(new Event('input',{bubbles:true}));
      select.dispatchEvent(new Event('change',{bubbles:true}));
      close();
     });b.setAttribute('aria-pressed',String(o.value===select.value));grid.appendChild(b);
    });body.appendChild(grid);
   } else note(t('Language choices are loading.','As opções de idioma estão carregando.'));
   break;
  }
  case 'sound': {
   note(t('Sounds play only when enabled. Your device controls the volume.','Os efeitos tocam apenas se ativados. O volume segue o dispositivo.'));
   var state=document.createElement('p');state.className='ma-unfold-status';body.appendChild(state);
   var toggle=button('',()=>{clickOriginal(source);tone('select');update()});body.appendChild(toggle);
   function update(){
    var on;try{on=localStorage.getItem('match_soundEnabled')!=='false'}catch(_){on=true}
    state.textContent=on?t('Sound effects enabled','Efeitos sonoros ativados'):t('Sound effects muted','Efeitos sonoros silenciados');
    toggle.textContent=on?t('Mute effects','Silenciar efeitos'):t('Enable sound effects','Ativar efeitos sonoros');
   }update();break;
  }
  case 'settings': {
   note(t('Personalize your MatchApp experience.','Personalize sua experiência MatchApp.'));
   var menu=document.querySelector('#mh-topbox .ma-menu-wrap .ma-menu');
   if(menu){
    restoreTo=menu.parentElement;relocated=menu;box.appendChild(menu);
    menu.hidden=false;menu.classList.add('ma-unfold-original-menu');
    menu.addEventListener('click',()=>{setTimeout(close,30)},{once:true});
   }else note(t('Settings are loading.','Os ajustes estão carregando.'));
   break;
  }
  case 'guide':
   note(t('See how matching and Jonas work.','Veja como os matches e Jonas funcionam.'));
   body.appendChild(button(t('Start guided tour','Iniciar o guia'),()=>activateOriginal(source)));break;
  case 'notifications':
   note(t('View your latest alerts and updates.','Veja seus alertas e novidades.'));
   body.appendChild(button(t('Open notifications','Abrir notificações'),()=>activateOriginal(source)));
   break;
  case 'signin':
   note(t('Sign in or create an account using the secure MatchApp flow.','Entre ou crie sua conta pelo sistema seguro do MatchApp.'));
   body.appendChild(button(t('Sign in / Join','Entrar / Cadastrar'),()=>activateOriginal(source)));break;
  case 'profile':
   note(t('Manage your saved profile and avatar.','Gerencie seu perfil e avatar.'));
   body.appendChild(button(t('Open profile','Abrir meu perfil'),()=>activateOriginal(source)));break;
  case 'credits':
   note(t('Review your match allowances and plans.','Consulte seus créditos e planos.'));
   body.appendChild(button(t('View plans','Ver planos'),()=>activateOriginal(source)));break;
  case 'logout': {
   note(t('This ends your current sign-in session. Nothing is deleted.','Isso encerra sua sessão. Nenhum dado será apagado.'));
   var confirm=button(t('Sign out…','Sair da conta…'),()=>{
    confirm.replaceWith(button(t('Confirm sign out','Confirmar saída'),()=>activateOriginal(source)));
   });body.appendChild(confirm);break;
  }
 }
 playOrigin(box,source);setTimeout(()=>x.focus({preventScroll:true}),reduce()?0:280);
}
function typeFor(el){
 if(el.matches('#lang-switcher-host,#lang-switcher-host *'))return 'language';
 if(el.matches('.sound-toggle-btn,.sound-toggle-btn *'))return 'sound';
 if(el.matches('.matchapp-notification-button,.matchapp-notification-button *'))return 'notifications';
 if(el.matches('#nav-reg-btn,#nav-reg-btn *'))return 'signin';
 if(el.matches('#profile-link-tab,#profile-link-tab *'))return 'profile';
 if(el.matches('#nav-logout-btn,#nav-logout-btn *'))return 'logout';
 if(el.matches('.ma-how-button,.ma-how-button *'))return 'guide';
 if(el.matches('.ma-menu-button,.ma-menu-button *'))return 'settings';
 if(el.matches('#quota-badge,#quota-badge *'))return 'credits';
 return null;
}
document.addEventListener('click',function(ev){
 if(!window.MATCHAPP_ANDROID||!document.body.classList.contains('page-home'))return;
 var nav=ev.target.closest?.('#mh-topbox > nav.mh-deck');
 if(!nav)return;
 var target=ev.target.closest?.('button,a,#lang-switcher-host,select');
 if(!target)return;
 var kind=typeFor(target);
 if(!kind)return;
 // Calls from a panel are passed directly to the existing native/website handler.
 if(target.dataset.maUnfoldPass==='1')return;
 ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
 makePanel(target.closest('#lang-switcher-host')||target,kind);
},true);
document.addEventListener('keydown',ev=>{
 if(!current)return;
 if(ev.key==='Escape'){ev.preventDefault();close();return;}
 if(ev.key!=='Tab')return;
 var items=Array.from(current.box.querySelectorAll('button:not([disabled]),a[href],select'));
 if(!items.length)return;
 var first=items[0],last=items[items.length-1];
 if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus()}
 else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus()}
});
})();