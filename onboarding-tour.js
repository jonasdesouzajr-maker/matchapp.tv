/* MatchApp first-account onboarding — only newly registered accounts. */
(function(){
'use strict';
const VERSION='v1';
const META_ELIGIBLE='matchapp_first_time_onboarding_v1';
const META_DONE='matchapp_onboarding_main_v1';
let user=null,stepIndex=0,steps=[],panel=null,spot=null,active=false,repositionRaf=0;

const copy={
 en:{
  welcome:['Your Match starts here','Choose format, mood, platform, era and rating. Your choices stay requirements — MatchApp does not quietly swap them just to fill a result.'],
  ai:['Talk to MatchApp Ai','Ask naturally: “something funny for tonight”, “where can I stream this?”, or keep a real entertainment conversation going.'],
  together:['Match Together','Two people, two tastes, one title. Start a session and MatchApp finds the overlap without either person giving up their preferences.'],
  alerts:['Never miss where it lands','The bell keeps releases, purchases, friend requests, Match Together and titles you follow in one place. Follow a title and MatchApp can alert you when streaming appears.'],
  profile:['Make MatchApp learn your taste','Save titles, mark what you saw, use Loved It or Not For Me, and your private profile becomes more useful every time you return.'],
  next:'Next',back:'Back',finish:'Start matching',skip:'Skip tour',counter:(a,b)=>a+' of '+b
 },
 'pt-BR':{
  welcome:['Seu Match começa aqui','Escolha formato, humor, plataforma, época e classificação. Suas escolhas continuam sendo regras — o MatchApp não troca silenciosamente os critérios só para preencher um resultado.'],
  ai:['Converse com o MatchApp Ai','Pergunte naturalmente: “algo engraçado para hoje”, “onde posso assistir isso?” ou continue uma conversa de entretenimento de verdade.'],
  together:['Match Together','Duas pessoas, dois gostos, um título. Comece uma sessão e o MatchApp encontra o ponto em comum sem ignorar as preferências de ninguém.'],
  alerts:['Não perca quando chegar ao streaming','O sino reúne lançamentos, compras, amizades, Match Together e títulos que você acompanha. Siga um título e o MatchApp pode avisar quando surgir streaming.'],
  profile:['Faça o MatchApp aprender seu gosto','Salve títulos, marque o que viu, use Amei ou Não é para mim e seu perfil privado fica mais útil a cada visita.'],
  next:'Próximo',back:'Voltar',finish:'Começar a escolher',skip:'Pular tour',counter:(a,b)=>a+' de '+b
 },
 es:{
  welcome:['Tu Match empieza aquí','Elige formato, estado de ánimo, plataforma, época y clasificación. Tus elecciones siguen siendo requisitos: MatchApp no cambia silenciosamente los criterios para llenar un resultado.'],
  ai:['Habla con MatchApp Ai','Pregunta de forma natural: “algo divertido para esta noche”, “¿dónde puedo verlo?” o continúa una conversación real de entretenimiento.'],
  together:['Match Together','Dos personas, dos gustos, un título. Empieza una sesión y MatchApp encuentra el punto en común sin ignorar las preferencias de nadie.'],
  alerts:['No te pierdas dónde aparece','La campana reúne estrenos, compras, amigos, Match Together y títulos que sigues. Sigue un título y MatchApp puede avisarte cuando aparezca en streaming.'],
  profile:['Haz que MatchApp aprenda tus gustos','Guarda títulos, marca lo que viste, usa Me encantó o No es para mí y tu perfil privado será más útil cada vez que vuelvas.'],
  next:'Siguiente',back:'Atrás',finish:'Empezar a buscar',skip:'Saltar tour',counter:(a,b)=>a+' de '+b
 }
};
function tr(){const l=window.MATCH_LANG||document.documentElement.lang||'en';return copy[l]||copy[l.split('-')[0]]||copy.en;}
function sb(){return window.supabaseClient;}
function home(){return location.pathname==='/'||location.pathname==='/index.html';}
function freshOAuthCandidate(u){
 const a=Date.parse(u?.created_at||''),b=Date.parse(u?.last_sign_in_at||'');
 return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(b-a)<10*60*1000;
}
function localDone(u){try{return localStorage.getItem('matchapp_onboarding_main_'+VERSION+'_'+u.id)==='1';}catch(_){return false;}}
async function persist(fields){
 if(!user||!sb())return;
 try{await sb().auth.updateUser({data:fields});user.user_metadata={...(user.user_metadata||{}),...fields};}catch(_){}
}
async function eligible(){
 if(!home()||!sb())return false;
 try{
  const {data:{user:u}}=await sb().auth.getUser();if(!u)return false;user=u;
  if(localDone(u)||u.user_metadata?.[META_DONE]===true)return false;
  if(u.user_metadata?.[META_ELIGIBLE]===true)return true;
  if(freshOAuthCandidate(u)){
   await persist({[META_ELIGIBLE]:true});
   return true;
  }
 }catch(_){}
 return false;
}
function buildSteps(){
 return [
  {key:'welcome',selector:'#questionnaire-box'},
  {key:'ai',selector:'.top-ai-launch'},
  {key:'together',selector:'.tg-entry'},
  {key:'alerts',selector:'.matchapp-notification-button'},
  {key:'profile',selector:'#profile-link-tab,[data-avatar-slot]'}
 ].filter(s=>document.querySelector(s.selector));
}
function ensureUi(){
 if(panel)return;
 spot=document.createElement('div');spot.className='matchapp-tour-spotlight';spot.hidden=true;document.body.appendChild(spot);
 panel=document.createElement('aside');panel.className='matchapp-tour-card';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','matchapp-tour-title');
 panel.innerHTML='<div class="matchapp-tour-top"><span class="matchapp-tour-badge">MATCHAPP ✦ TOUR</span><button type="button" class="matchapp-tour-skip"></button></div><div class="matchapp-tour-progress"><span></span></div><small class="matchapp-tour-count"></small><h2 id="matchapp-tour-title"></h2><p class="matchapp-tour-copy"></p><div class="matchapp-tour-actions"><button type="button" class="matchapp-tour-back"></button><button type="button" class="matchapp-tour-next"></button></div>';
 document.body.appendChild(panel);
 panel.querySelector('.matchapp-tour-skip').addEventListener('click',()=>finish(true));
 panel.querySelector('.matchapp-tour-back').addEventListener('click',()=>show(Math.max(0,stepIndex-1)));
 panel.querySelector('.matchapp-tour-next').addEventListener('click',()=>stepIndex>=steps.length-1?finish(false):show(stepIndex+1));
}
function place(){
 if(!active||!spot||!steps[stepIndex])return;
 cancelAnimationFrame(repositionRaf);repositionRaf=requestAnimationFrame(()=>{
  const el=document.querySelector(steps[stepIndex].selector);if(!el)return;
  const r=el.getBoundingClientRect(),pad=10;
  spot.style.left=Math.max(8,r.left-pad)+'px';
  spot.style.top=Math.max(8,r.top-pad)+'px';
  spot.style.width=Math.min(innerWidth-16,r.width+pad*2)+'px';
  spot.style.height=Math.min(innerHeight-16,r.height+pad*2)+'px';
 });
}
function revealTarget(el){
 try{el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center',inline:'nearest'});}catch(_){el.scrollIntoView();}
 setTimeout(place,420);
}
function show(i){
 if(!steps.length)return finish(true);
 stepIndex=Math.min(Math.max(i,0),steps.length-1);const s=steps[stepIndex],el=document.querySelector(s.selector);
 if(!el){steps.splice(stepIndex,1);return show(Math.min(stepIndex,steps.length-1));}
 const t=tr(),pair=t[s.key];
 panel.querySelector('.matchapp-tour-skip').textContent=t.skip;
 panel.querySelector('.matchapp-tour-count').textContent=t.counter(stepIndex+1,steps.length);
 panel.querySelector('#matchapp-tour-title').textContent=pair[0];
 panel.querySelector('.matchapp-tour-copy').textContent=pair[1];
 panel.querySelector('.matchapp-tour-back').textContent=t.back;
 panel.querySelector('.matchapp-tour-back').hidden=stepIndex===0;
 panel.querySelector('.matchapp-tour-next').textContent=stepIndex===steps.length-1?t.finish:t.next;
 panel.querySelector('.matchapp-tour-progress span').style.width=((stepIndex+1)/steps.length*100)+'%';
 panel.hidden=false;spot.hidden=false;document.documentElement.classList.add('matchapp-tour-active');
 revealTarget(el);place();
}
async function finish(skipped){
 active=false;panel.hidden=true;spot.hidden=true;document.documentElement.classList.remove('matchapp-tour-active');
 try{localStorage.setItem('matchapp_onboarding_main_'+VERSION+'_'+user.id,'1');}catch(_){}
 await persist({[META_ELIGIBLE]:true,[META_DONE]:true});
 if(!skipped){const q=document.querySelector('#questionnaire-box');q?.scrollIntoView({behavior:'smooth',block:'center'});}
}
async function start(){
 if(active||!await eligible())return;
 // New accounts get the richer guided tour instead of immediately receiving
 // a second overlapping release notice for the same features.
 try{
  const res=await fetch('/release.json',{cache:'no-store'});
  if(res.ok){const rel=await res.json();if(rel?.version)localStorage.setItem('match_release_seen',rel.version);}
  const notice=document.getElementById('app-release-notice');if(notice)notice.hidden=true;
 }catch(_){}
 // Let dynamic header controls (notification bell/profile) finish mounting.
 await new Promise(r=>setTimeout(r,1400));
 steps=buildSteps();if(!steps.length)return;
 ensureUi();active=true;show(0);
}
window.MatchAppOnboarding={start};
addEventListener('resize',place,{passive:true});addEventListener('scroll',place,{passive:true});
document.addEventListener('matchapp:authchange',()=>setTimeout(start,500));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,1800),{once:true});else setTimeout(start,1800);
})();