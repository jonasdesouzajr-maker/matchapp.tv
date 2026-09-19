/* MatchApp first-visitor guided walkthrough — v2. */
(function(){
'use strict';
const VERSION='v2',META_DONE='matchapp_onboarding_main_v2',LOCAL_DONE='matchapp_onboarding_main_v2_done';
let user=null,stepIndex=0,steps=[],panel=null,spot=null,active=false,repositionRaf=0;
const copy={
 en:{match:['Start with a Match','Pick the format, mood and platform you want. Example: Movie + Funny + Netflix. MatchApp keeps hard safety and exclusion rules while finding the closest stocked result.'],filters:['Fine-tune only when you want to','Open a filter row to add genre, vibe, era or age rating. The walkthrough opens one so you can see how every field folds back away.'],ai:['Or just ask MatchApp Ai','Tap Chat with Ai and type naturally — for example: “something clever under two hours” or “where can I watch this in Brazil?”'],latest:['Explore what is current','News, trending titles and foldable sections can open without leaving Home. This example unfolds the current section automatically.'],together:['Match Together','Two people can combine tastes and get one shared recommendation without either person giving up their preferences.'],kids:['Kids Mode is always one tap away','Use the Kids Mode button for the separate age-reviewed Kids experience. Its safety rules stay isolated from normal MatchApp.'],alerts:['Follow releases and activity','The bell keeps title alerts, Match Together activity, purchases and other useful notifications together.'],profile:['Your private taste profile','Your avatar opens saved titles, history, Loved It / Not For Me and personal taste controls. The text label is intentionally removed — the avatar is the control.'],settings:['Everything else stays tidy','Settings holds theme, Lazy Mode, Daily Check-in, pricing and other utilities without crowding the header.'],next:'Next',back:'Back',finish:'Got it',skip:'Skip',counter:(a,b)=>a+' of '+b},
 'pt-BR':{match:['Comece com um Match','Escolha formato, clima e plataforma. Exemplo: Filme + Engraçado + Netflix. O MatchApp mantém regras de segurança e exclusões enquanto encontra o resultado disponível mais próximo.'],filters:['Ajuste só quando quiser','Abra uma linha de filtros para adicionar gênero, vibe, época ou classificação. O tour abre uma para mostrar como cada campo também pode ser recolhido.'],ai:['Ou pergunte ao MatchApp Ai','Toque em Fale com a Ai e escreva naturalmente — por exemplo: “algo inteligente com menos de duas horas” ou “onde assistir isso no Brasil?”.'],latest:['Explore o que está em alta','Notícias, títulos em alta e seções recolhíveis podem abrir sem sair da Home. Este exemplo abre a seção automaticamente.'],together:['Match Together','Duas pessoas combinam gostos e recebem uma recomendação em comum sem abrir mão das preferências.'],kids:['Kids Mode sempre a um toque','Use o botão Kids Mode para a experiência infantil separada e revisada por idade. As regras de segurança continuam isoladas do MatchApp normal.'],alerts:['Acompanhe lançamentos e atividade','O sino reúne alertas de títulos, Match Together, compras e outras notificações úteis.'],profile:['Seu perfil privado de gosto','Seu avatar abre títulos salvos, histórico, Amei / Não é para mim e controles pessoais. O texto ao lado foi removido — o avatar é o controle.'],settings:['O restante fica organizado','Configurações guarda tema, Lazy Mode, Check-in Diário, preços e outras utilidades sem lotar o cabeçalho.'],next:'Próximo',back:'Voltar',finish:'Entendi',skip:'Pular',counter:(a,b)=>a+' de '+b},
 es:{match:['Empieza con un Match','Elige formato, ánimo y plataforma. Ejemplo: Película + Divertida + Netflix. MatchApp mantiene las reglas de seguridad y exclusiones al buscar la opción disponible más cercana.'],filters:['Afina solo cuando quieras','Abre una fila para añadir género, estilo, época o clasificación. El recorrido abre una para mostrar cómo cada campo vuelve a plegarse.'],ai:['O pregunta a MatchApp Ai','Pulsa Chatea con Ai y escribe con naturalidad — por ejemplo: “algo inteligente de menos de dos horas” o “¿dónde puedo verlo en Brasil?”.'],latest:['Explora lo más reciente','Noticias, tendencias y secciones plegables se abren sin salir del inicio. Este ejemplo abre la sección automáticamente.'],together:['Match Together','Dos personas combinan gustos y reciben una recomendación compartida sin renunciar a sus preferencias.'],kids:['Kids Mode siempre a un toque','Usa Kids Mode para la experiencia infantil separada y revisada por edad. Sus reglas de seguridad siguen aisladas del MatchApp normal.'],alerts:['Sigue estrenos y actividad','La campana reúne alertas de títulos, Match Together, compras y otras notificaciones útiles.'],profile:['Tu perfil privado de gustos','El avatar abre guardados, historial, Me encantó / No es para mí y tus controles personales. No necesita una etiqueta de texto al lado.'],settings:['Todo lo demás queda ordenado','Configuración reúne tema, Lazy Mode, check-in diario, precios y otras utilidades sin llenar el encabezado.'],next:'Siguiente',back:'Atrás',finish:'Entendido',skip:'Saltar',counter:(a,b)=>a+' de '+b}
};
const tr=()=>{const l=window.MATCH_LANG||document.documentElement.lang||'en';return copy[l]||copy[l.split('-')[0]]||copy.en};
const sb=()=>window.supabaseClient,home=()=>location.pathname==='/'||location.pathname==='/index.html';
function localDone(){try{return localStorage.getItem(LOCAL_DONE)==='1'}catch(_){return false}}
function markDone(){try{localStorage.setItem(LOCAL_DONE,'1')}catch(_){}}
async function currentUser(){try{const c=sb();if(!c)return null;return (await c.auth.getUser())?.data?.user||null}catch(_){return null}}
async function persistDone(){if(!user||!sb())return;try{await sb().auth.updateUser({data:{[META_DONE]:true}})}catch(_){}}
async function eligible(){if(!home()||localDone())return false;user=await currentUser();if(user?.user_metadata?.[META_DONE]===true){markDone();return false}return true}
function first(selectorList){for(const s of selectorList.split(',')){const e=document.querySelector(s.trim());if(e)return e}return null}
function buildSteps(){return[
 {key:'match',selector:'#ma-tab-match,#questionnaire-box',mode:'match'},
 {key:'filters',selector:'#questionnaire-box .crit-collapsible,#questionnaire-box .crit-toggle',mode:'filters'},
 {key:'ai',selector:'#ma-tab-ask,.ma-ai-brand-button',mode:'ask'},
 {key:'latest',selector:'#latest-news,#trending-rail',mode:'details'},
 {key:'together',selector:'.ma-together-link,.tg-entry'},
 {key:'kids',selector:'#matchapp-kids-entry,.ma-kids-mode-entry'},
 {key:'alerts',selector:'.matchapp-notification-button'},
 {key:'profile',selector:'#profile-link-tab,#nav-reg-btn,[data-avatar-slot]'},
 {key:'settings',selector:'.ma-menu-button'}
].filter(s=>first(s.selector))}
function ensureUi(){
 if(panel)return;
 spot=document.createElement('div');spot.className='matchapp-tour-spotlight';spot.hidden=true;document.body.appendChild(spot);
 panel=document.createElement('aside');panel.className='matchapp-tour-card';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','matchapp-tour-title');
 panel.innerHTML='<div class="matchapp-tour-top"><span class="matchapp-tour-badge">MATCHAPP ✦ WALKTHROUGH</span><button type="button" class="matchapp-tour-skip"></button></div><div class="matchapp-tour-progress"><span></span></div><small class="matchapp-tour-count"></small><h2 id="matchapp-tour-title"></h2><p class="matchapp-tour-copy"></p><div class="matchapp-tour-actions"><button type="button" class="matchapp-tour-back"></button><button type="button" class="matchapp-tour-next"></button></div>';
 document.body.appendChild(panel);panel.querySelector('.matchapp-tour-skip').onclick=()=>finish(true);panel.querySelector('.matchapp-tour-back').onclick=()=>show(Math.max(0,stepIndex-1));panel.querySelector('.matchapp-tour-next').onclick=()=>stepIndex>=steps.length-1?finish(false):show(stepIndex+1);
}
function prep(step,el){
 if(step.mode==='match')document.getElementById('ma-tab-match')?.click();
 if(step.mode==='ask')document.getElementById('ma-tab-ask')?.click();
 if(step.mode==='filters'){const row=el.classList.contains('crit-collapsible')?el:el.closest('.crit-collapsible');if(row){row.classList.add('crit-open');row.querySelector('.crit-toggle')?.setAttribute('aria-expanded','true')}}
 if(step.mode==='details'){const d=el.matches('details')?el:el.closest('details');if(d)d.open=true;if(el.tagName==='DETAILS')el.open=true}
 const d=el.closest?.('details');if(d)d.open=true;
}
function place(){if(!active||!spot||!steps[stepIndex])return;cancelAnimationFrame(repositionRaf);repositionRaf=requestAnimationFrame(()=>{const el=first(steps[stepIndex].selector);if(!el)return;const r=el.getBoundingClientRect(),pad=10;spot.style.left=Math.max(8,r.left-pad)+'px';spot.style.top=Math.max(8,r.top-pad)+'px';spot.style.width=Math.max(0,Math.min(innerWidth-16,r.width+pad*2))+'px';spot.style.height=Math.max(0,Math.min(innerHeight-16,r.height+pad*2))+'px'})}
function reveal(step,el){prep(step,el);try{el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center',inline:'nearest'})}catch(_){el.scrollIntoView()}setTimeout(place,460)}
function show(i){
 if(!steps.length)return finish(true);stepIndex=Math.min(Math.max(i,0),steps.length-1);const step=steps[stepIndex],el=first(step.selector);if(!el){steps.splice(stepIndex,1);return show(Math.min(stepIndex,steps.length-1))}
 const t=tr(),pair=t[step.key]||copy.en[step.key];panel.querySelector('.matchapp-tour-skip').textContent=t.skip;panel.querySelector('.matchapp-tour-count').textContent=t.counter(stepIndex+1,steps.length);panel.querySelector('#matchapp-tour-title').textContent=pair[0];panel.querySelector('.matchapp-tour-copy').textContent=pair[1];panel.querySelector('.matchapp-tour-back').textContent=t.back;panel.querySelector('.matchapp-tour-back').hidden=stepIndex===0;panel.querySelector('.matchapp-tour-next').textContent=stepIndex===steps.length-1?t.finish:t.next;panel.querySelector('.matchapp-tour-progress span').style.width=((stepIndex+1)/steps.length*100)+'%';panel.hidden=false;spot.hidden=false;document.documentElement.classList.add('matchapp-tour-active');reveal(step,el);
}
async function finish(skipped){
 if(!active)return;active=false;panel.hidden=true;spot.hidden=true;document.documentElement.classList.remove('matchapp-tour-active');markDone();await persistDone();
 if(!skipped&&!user){location.href='/register.html?from=tour';return}
 document.getElementById('ma-tab-match')?.click();document.querySelector('#ma-concierge,#questionnaire-box')?.scrollIntoView({behavior:'smooth',block:'center'});
}
async function waitIntro(){const started=Date.now();while(Date.now()-started<16000){const intro=document.getElementById('matchapp-tiktok-intro');const blocked=document.documentElement.dataset.tiktokIntro==='1'||(intro&&!intro.hidden&&getComputedStyle(intro).display!=='none');if(!blocked)return;await new Promise(r=>setTimeout(r,450))}}
async function start(){if(active||!await eligible())return;await waitIntro();await new Promise(r=>setTimeout(r,650));steps=buildSteps();if(!steps.length)return;ensureUi();active=true;window.MatchAppScrollGate?.unlock?.();show(0)}
window.MatchAppOnboarding={start,version:VERSION};addEventListener('resize',place,{passive:true});addEventListener('scroll',place,{passive:true});document.addEventListener('matchapp:authchange',()=>setTimeout(start,600));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,1500),{once:true});else setTimeout(start,1500);
})();