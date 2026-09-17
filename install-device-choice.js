/* MatchApp mobile/tablet install chooser. Wraps the existing install/update engine without changing it. */
(function(){
'use strict';

const LABELS={
 en:{phone:'Add to phone',tablet:'Add to tablet'},
 'pt-BR':{phone:'Adicionar ao celular',tablet:'Adicionar ao tablet'},
 es:{phone:'Añadir al teléfono',tablet:'Añadir a la tablet'},
 fr:{phone:'Ajouter au téléphone',tablet:'Ajouter à la tablette'},
 de:{phone:'Zum Smartphone',tablet:'Zum Tablet'},
 it:{phone:'Aggiungi al telefono',tablet:'Aggiungi al tablet'},
 tr:{phone:'Telefona ekle',tablet:'Tablete ekle'},
 ru:{phone:'Добавить на телефон',tablet:'Добавить на планшет'},
 ar:{phone:'إضافة إلى الهاتف',tablet:'إضافة إلى الجهاز اللوحي'},
 hi:{phone:'फ़ोन में जोड़ें',tablet:'टैबलेट में जोड़ें'},
 id:{phone:'Tambahkan ke ponsel',tablet:'Tambahkan ke tablet'},
 ja:{phone:'スマホに追加',tablet:'タブレットに追加'},
 ko:{phone:'휴대전화에 추가',tablet:'태블릿에 추가'},
 zh:{phone:'添加到手机',tablet:'添加到平板'}
};
const SHEET={
 en:{titlePhone:'Add MatchApp to your phone',titleTablet:'Add MatchApp to your tablet',subtitle:'Choose how you want MatchApp on this device.',appTitle:'Install MatchApp Ai',appBody:'Full app-style install when supported: its own window, app launcher entry and automatic web updates.',protected:'Protected install · no sideloading',shortcutTitle:'Create shortcut',shortcutBody:'A lightweight home-screen link that opens MatchApp in your browser.',shortcutNote:'Shortcut availability is controlled by your browser. Some browsers replace shortcut-only with the full app install for installable PWAs.',notNow:'Not now',shortcutHow:'Shortcut instructions',androidShortcut:'Open your browser menu (⋮), choose “Add to Home screen”, then choose “Create shortcut” if your browser offers it.',iosShortcut:'iPhone and iPad do not expose a separate shortcut-only home-screen mode for an installable web app. “Add to Home Screen” installs MatchApp as an app instead.',genericShortcut:'Open your browser menu and choose “Add to Home screen” or “Create shortcut” if that option is available.',done:'Got it'},
 'pt-BR':{titlePhone:'Adicionar o MatchApp ao celular',titleTablet:'Adicionar o MatchApp ao tablet',subtitle:'Escolha como você quer usar o MatchApp neste dispositivo.',appTitle:'Instalar MatchApp Ai',appBody:'Instalação completa como app quando compatível: janela própria, lista de apps e atualizações automáticas da web.',protected:'Instalação protegida · sem sideload',shortcutTitle:'Criar atalho',shortcutBody:'Um link leve na tela inicial que abre o MatchApp no navegador.',shortcutNote:'A opção de atalho depende do navegador. Alguns navegadores substituem o atalho pela instalação completa do app quando o PWA é instalável.',notNow:'Agora não',shortcutHow:'Como criar o atalho',androidShortcut:'Abra o menu do navegador (⋮), toque em “Adicionar à tela inicial” e escolha “Criar atalho” se essa opção aparecer.',iosShortcut:'iPhone e iPad não oferecem um modo separado de atalho na tela inicial para um web app instalável. “Adicionar à Tela de Início” instala o MatchApp como app.',genericShortcut:'Abra o menu do navegador e escolha “Adicionar à tela inicial” ou “Criar atalho”, se disponível.',done:'Entendi'},
 es:{titlePhone:'Añadir MatchApp al teléfono',titleTablet:'Añadir MatchApp a la tablet',subtitle:'Elige cómo quieres usar MatchApp en este dispositivo.',appTitle:'Instalar MatchApp Ai',appBody:'Instalación completa tipo app cuando sea compatible: ventana propia, lanzador de apps y actualizaciones web automáticas.',protected:'Instalación protegida · sin carga lateral',shortcutTitle:'Crear acceso directo',shortcutBody:'Un enlace ligero en la pantalla de inicio que abre MatchApp en tu navegador.',shortcutNote:'La disponibilidad del acceso directo depende del navegador. Algunos navegadores sustituyen esta opción por la instalación completa del PWA.',notNow:'Ahora no',shortcutHow:'Instrucciones del acceso directo',androidShortcut:'Abre el menú del navegador (⋮), elige “Añadir a pantalla de inicio” y luego “Crear acceso directo” si aparece.',iosShortcut:'iPhone y iPad no ofrecen un modo separado de acceso directo para una web app instalable. “Añadir a pantalla de inicio” instala MatchApp como app.',genericShortcut:'Abre el menú del navegador y elige “Añadir a pantalla de inicio” o “Crear acceso directo” si está disponible.',done:'Entendido'}
};

const lang=()=>String(window.MATCH_LANG||document.documentElement.lang||'en');
const labels=()=>LABELS[lang()]||LABELS[lang().split('-')[0]]||LABELS.en;
const words=()=>SHEET[lang()]||SHEET[lang().split('-')[0]]||SHEET.en;
const esc=v=>String(v||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function track(event,data={}){try{window.dataLayer=window.dataLayer||[];window.dataLayer.push({event,...data});}catch(_){}}

function deviceInfo(){
 const ua=navigator.userAgent||'';
 const iPadOS=/Macintosh/.test(ua)&&navigator.maxTouchPoints>1;
 const isIOS=(/iPad|iPhone|iPod/.test(ua)&&!window.MSStream)||iPadOS;
 const isAndroid=/Android/i.test(ua);
 const isTablet=iPadOS||(isAndroid&&!/Mobile/i.test(ua))||/Tablet|PlayBook|Silk/i.test(ua);
 const coarse=window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;
 const isMobile=isTablet||isIOS||isAndroid||(/Mobi/i.test(ua)&&coarse!==false);
 return {isIOS,isAndroid,isTablet,isMobile};
}

function isUpdateOrInstalled(btn){return Boolean(window.matchAppUpdatePending||btn?.classList.contains('has-app-update')||window.matchAppInstallState?.isInstalled?.()||btn?.classList.contains('is-app-installed'));}
function syncLabel(){
 const d=deviceInfo();if(!d.isMobile)return;
 document.querySelectorAll('.install-btn').forEach(btn=>{
   if(isUpdateOrInstalled(btn))return;
   const label=d.isTablet?labels().tablet:labels().phone;
   const span=btn.querySelector('.install-label');
   if(span)span.textContent=label;else if(!btn.closest('.kids-header'))btn.textContent=label;
   btn.setAttribute('aria-label',label);
 });
}

function installStyle(){
 if(document.getElementById('matchapp-device-choice-style'))return;
 const style=document.createElement('style');style.id='matchapp-device-choice-style';style.textContent=`
 .ma-device-install{position:fixed;inset:0;z-index:2147483600;background:rgba(8,4,15,.68);backdrop-filter:blur(5px);opacity:0;pointer-events:none;transition:opacity .25s ease}
 .ma-device-install.is-open{opacity:1;pointer-events:auto}.ma-device-sheet{position:absolute;left:50%;bottom:0;width:min(100%,580px);max-height:min(88dvh,720px);overflow:auto;transform:translate(-50%,105%);transition:transform .38s cubic-bezier(.2,.8,.2,1);border:1px solid rgba(229,193,88,.3);border-bottom:0;border-radius:24px 24px 0 0;background:linear-gradient(155deg,rgba(27,15,47,.99),rgba(12,9,19,.995));box-shadow:0 -24px 60px rgba(0,0,0,.5);color:#f8f4ff;padding:8px max(16px,env(safe-area-inset-right)) calc(18px + env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));overscroll-behavior:contain}
 .ma-device-install.is-open .ma-device-sheet{transform:translate(-50%,0)}.ma-device-handle{display:block;width:44px;height:5px;border:0;border-radius:999px;background:rgba(255,255,255,.28);margin:2px auto 14px;padding:0;cursor:grab;touch-action:none}
 .ma-device-head{display:flex;align-items:center;gap:12px;padding:0 4px 12px}.ma-device-head img{width:52px;height:52px;border-radius:14px;box-shadow:0 8px 20px rgba(0,0,0,.35)}.ma-device-copy{min-width:0;flex:1}.ma-device-copy h2{margin:0;color:#fff;font:850 clamp(1.08rem,4vw,1.28rem)/1.12 Outfit,Inter,sans-serif}.ma-device-copy p{margin:5px 0 0;color:#bfb3cf;font:550 .82rem/1.35 Inter,Arial,sans-serif}.ma-device-x{display:grid;place-items:center;width:34px;height:34px;min-width:34px;border:1px solid rgba(255,255,255,.12);border-radius:50%;background:rgba(255,255,255,.05);color:#dcd3e8;font-size:20px;cursor:pointer}
 .ma-device-options{display:grid;gap:10px}.ma-device-option{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:11px;width:100%;text-align:left;padding:13px;border:1px solid rgba(255,255,255,.11);border-radius:17px;background:rgba(255,255,255,.045);color:#fff;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease}.ma-device-option:hover,.ma-device-option:focus-visible{outline:none;transform:translateY(-1px);border-color:rgba(229,193,88,.55);background:rgba(229,193,88,.075);box-shadow:0 10px 24px rgba(0,0,0,.18)}.ma-device-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:rgba(229,193,88,.11);font-size:21px}.ma-device-option strong{display:block;font:800 .94rem/1.2 Outfit,Inter,sans-serif}.ma-device-option small{display:block;margin-top:4px;color:#bdb1cb;font:520 .75rem/1.35 Inter,Arial,sans-serif}.ma-device-chevron{color:#e5c158;font-size:22px;line-height:1}
 .ma-device-trust{display:flex;align-items:center;gap:7px;margin:9px 3px 0;color:#a9cfbd;font:700 .69rem/1.3 Inter,Arial,sans-serif}.ma-device-trust svg{width:15px;height:15px;flex:0 0 auto}.ma-device-note{margin:11px 4px 0;color:#8f849d;font:520 .69rem/1.42 Inter,Arial,sans-serif}.ma-device-cancel{display:block;width:100%;margin-top:12px;padding:10px 12px;border:0;background:transparent;color:#aaa0b7;font:750 .78rem/1 Inter,Arial,sans-serif;cursor:pointer}.ma-device-guide{padding:2px 4px 4px}.ma-device-guide h3{margin:0 0 8px;color:#fff;font:850 1rem/1.2 Outfit,Inter,sans-serif}.ma-device-guide p{margin:0;color:#d5cbdf;font:550 .83rem/1.55 Inter,Arial,sans-serif}.ma-device-done{margin-top:14px;width:100%;padding:11px;border:1px solid rgba(229,193,88,.35);border-radius:12px;background:rgba(229,193,88,.08);color:#f5e4a5;font-weight:800;cursor:pointer}
 @media(prefers-reduced-motion:reduce){.ma-device-install,.ma-device-sheet,.ma-device-option{transition:none!important}}
 `;document.head.appendChild(style);
}

function ensureSheet(){
 let overlay=document.getElementById('matchapp-device-install');if(overlay)return overlay;
 installStyle();overlay=document.createElement('div');overlay.id='matchapp-device-install';overlay.className='ma-device-install';overlay.hidden=true;overlay.innerHTML='<section class="ma-device-sheet" role="dialog" aria-modal="true" aria-labelledby="ma-device-title"><button class="ma-device-handle" type="button" aria-label="Close"></button><div class="ma-device-body"></div></section>';document.body.appendChild(overlay);
 overlay.addEventListener('click',e=>{if(e.target===overlay)closeSheet();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('is-open'))closeSheet();});
 const sheet=overlay.querySelector('.ma-device-sheet'),handle=overlay.querySelector('.ma-device-handle');let startY=0,currentY=0,dragging=false;
 const reset=()=>{dragging=false;sheet.style.transition='';sheet.style.transform='';};handle.addEventListener('pointerdown',e=>{dragging=true;startY=e.clientY;currentY=startY;handle.setPointerCapture?.(e.pointerId);sheet.style.transition='none';});handle.addEventListener('pointermove',e=>{if(!dragging)return;currentY=e.clientY;sheet.style.transform=`translate(-50%,${Math.max(0,currentY-startY)}px)`;});handle.addEventListener('pointerup',()=>{if(!dragging)return;if(Math.max(0,currentY-startY)>90)closeSheet();reset();});handle.addEventListener('pointercancel',reset);return overlay;
}
function closeSheet(){const overlay=document.getElementById('matchapp-device-install');if(!overlay)return;overlay.classList.remove('is-open');document.documentElement.style.removeProperty('overflow');setTimeout(()=>{if(!overlay.classList.contains('is-open'))overlay.hidden=true;},260);}
function openOverlay(){const overlay=ensureSheet();overlay.hidden=false;document.documentElement.style.overflow='hidden';requestAnimationFrame(()=>overlay.classList.add('is-open'));return overlay;}

function openChoice(){
 const d=deviceInfo(),c=words(),overlay=openOverlay(),body=overlay.querySelector('.ma-device-body'),title=d.isTablet?c.titleTablet:c.titlePhone;
 body.innerHTML=`<div class="ma-device-head"><img src="/assets/brand/matchapp-icon-192.png" width="52" height="52" alt="MatchApp"><div class="ma-device-copy"><h2 id="ma-device-title">${esc(title)}</h2><p>${esc(c.subtitle)}</p></div><button class="ma-device-x" type="button" aria-label="Close">×</button></div><div class="ma-device-options"><button class="ma-device-option" type="button" data-choice="app"><span class="ma-device-icon" aria-hidden="true">⬇️</span><span><strong>${esc(c.appTitle)}</strong><small>${esc(c.appBody)}</small></span><span class="ma-device-chevron" aria-hidden="true">›</span></button><button class="ma-device-option" type="button" data-choice="shortcut"><span class="ma-device-icon" aria-hidden="true">🔗</span><span><strong>${esc(c.shortcutTitle)}</strong><small>${esc(c.shortcutBody)}</small></span><span class="ma-device-chevron" aria-hidden="true">›</span></button></div><div class="ma-device-trust"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2 4.5 5v5.4c0 5 3.2 9.6 7.5 11.1 4.3-1.5 7.5-6.1 7.5-11.1V5L12 2Zm-1.1 13.1-3-3 1.3-1.3 1.7 1.7 4-4 1.3 1.3-5.3 5.3Z"/></svg><span>${esc(c.protected)}</span></div><p class="ma-device-note">${esc(c.shortcutNote)}</p><button class="ma-device-cancel" type="button">${esc(c.notNow)}</button>`;
 body.querySelector('.ma-device-x').addEventListener('click',closeSheet);body.querySelector('.ma-device-cancel').addEventListener('click',closeSheet);
 body.querySelector('[data-choice="app"]').addEventListener('click',()=>{track('install_device_choice',{install_choice:'app',device_type:d.isTablet?'tablet':'phone'});closeSheet();setTimeout(()=>window.installMatchApp?.(),120);});
 body.querySelector('[data-choice="shortcut"]').addEventListener('click',()=>{track('install_device_choice',{install_choice:'shortcut',device_type:d.isTablet?'tablet':'phone'});showShortcutGuide();});
 body.querySelector('.ma-device-x').focus({preventScroll:true});track('install_device_sheet_open',{device_type:d.isTablet?'tablet':'phone'});
}
function showShortcutGuide(){
 const d=deviceInfo(),c=words(),overlay=openOverlay(),body=overlay.querySelector('.ma-device-body'),instructions=d.isIOS?c.iosShortcut:d.isAndroid?c.androidShortcut:c.genericShortcut;
 body.innerHTML=`<div class="ma-device-head"><div class="ma-device-copy"><h2 id="ma-device-title">${esc(c.shortcutHow)}</h2></div><button class="ma-device-x" type="button" aria-label="Close">×</button></div><div class="ma-device-guide"><h3>${esc(c.shortcutTitle)}</h3><p>${esc(instructions)}</p><button class="ma-device-done" type="button">${esc(c.done)}</button></div>`;body.querySelector('.ma-device-x').addEventListener('click',closeSheet);body.querySelector('.ma-device-done').addEventListener('click',closeSheet);
}
function intercept(e){const btn=e.target?.closest?.('.install-btn');if(!btn||isUpdateOrInstalled(btn)||!deviceInfo().isMobile)return;e.preventDefault();e.stopImmediatePropagation();window.dismissInstallBubble?.();openChoice();}
function boot(){syncLabel();document.addEventListener('click',intercept,true);document.addEventListener('matchapp:langchange',syncLabel);window.addEventListener('matchapp:installstate',syncLabel);window.addEventListener('appinstalled',()=>{closeSheet();syncLabel();});window.addEventListener('resize',syncLabel,{passive:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
