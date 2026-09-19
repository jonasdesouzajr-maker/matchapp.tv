/* MatchApp Kids first-account tour — safe, short and grown-up aware. */
(function(){
'use strict';
const VERSION='v1',ELIGIBLE='matchapp_first_time_onboarding_v1',DONE='matchapp_onboarding_kids_v1';
let user=null,steps=[],i=0,card=null,spot=null,active=false,raf=0;
const copy={
 en:{steps:[
  ['Pick the adventure rules','Start with the age group, then choose a mood, show/movie/music and decade. Kids Mode only searches its reviewed, age-approved collection.'],
  ['Ask the Kids helper','Type or speak what sounds fun. The helper can recommend only from the approved Kids collection — unknown titles stay out.'],
  ['Explore safely','Browse categories or search the Kids collection. Every result keeps the selected age band as a hard safety rule.'],
  ['Keep favorites in the treasure chest','Save something fun so it is easy to find again. Saving, sharing and opening details do not spend another match.'],
  ['Grown-ups stay in control','Viewing links use a grown-up handoff, external sites are clearly identified, and the safety notes explain how Kids Mode makes choices.']
 ],next:'Next',back:'Back',finish:'Let’s explore!',skip:'Skip',label:'KIDS TOUR'},
 'pt-BR':{steps:[
  ['Escolha as regras da aventura','Comece pela idade e escolha humor, série/filme/música e década. O Kids Mode pesquisa apenas a coleção revisada e aprovada para a idade.'],
  ['Pergunte ao ajudante Kids','Digite ou fale o que parece divertido. O ajudante só pode recomendar títulos da coleção Kids aprovada — títulos desconhecidos ficam de fora.'],
  ['Explore com segurança','Navegue pelas categorias ou pesquise a coleção Kids. A faixa etária escolhida continua sendo uma regra de segurança obrigatória.'],
  ['Guarde favoritos no baú','Salve algo divertido para encontrar de novo. Salvar, compartilhar e abrir detalhes não gasta outro match.'],
  ['Adultos continuam no controle','Links para assistir passam por uma etapa para adultos, sites externos são indicados claramente e as notas explicam as regras de segurança.']
 ],next:'Próximo',back:'Voltar',finish:'Vamos explorar!',skip:'Pular',label:'TOUR KIDS'},
 es:{steps:[
  ['Elige las reglas de la aventura','Empieza por la edad y elige ánimo, serie/película/música y década. Kids Mode solo busca en su colección revisada y aprobada por edad.'],
  ['Pregunta al ayudante Kids','Escribe o di qué suena divertido. El ayudante solo recomienda títulos de la colección Kids aprobada; los títulos desconocidos quedan fuera.'],
  ['Explora con seguridad','Navega por categorías o busca en la colección Kids. La franja de edad elegida sigue siendo una regla de seguridad obligatoria.'],
  ['Guarda favoritos en el tesoro','Guarda algo divertido para encontrarlo de nuevo. Guardar, compartir y abrir detalles no gasta otro match.'],
  ['Los adultos siguen al mando','Los enlaces para ver contenido pasan por una entrega para adultos, los sitios externos se identifican y las notas explican las reglas de seguridad.']
 ],next:'Siguiente',back:'Atrás',finish:'¡A explorar!',skip:'Saltar',label:'TOUR KIDS'}
};
function t(){const l=window.MATCH_LANG||document.documentElement.lang||'en';return copy[l]||copy[l.split('-')[0]]||copy.en;}
function fresh(u){const a=Date.parse(u?.created_at||''),b=Date.parse(u?.last_sign_in_at||'');return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<10*60*1000;}
async function meta(fields){try{await window.supabaseClient?.auth.updateUser({data:fields});user.user_metadata={...(user.user_metadata||{}),...fields};}catch(_){}}
async function eligible(){
 try{const {data:{user:u}}=await window.supabaseClient.auth.getUser();if(!u)return false;user=u;
  if(u.user_metadata?.[DONE]===true)return false;
  try{if(localStorage.getItem('matchapp_onboarding_kids_'+VERSION+'_'+u.id)==='1')return false;}catch(_){}
  if(u.user_metadata?.[ELIGIBLE]===true)return true;
  if(fresh(u)){await meta({[ELIGIBLE]:true});return true;}
 }catch(_){}
 return false;
}
function selectors(){return['.kids-match','.kids-panel','#kids-chips','.kids-saved','.kids-parent-info'];}
function ensure(){
 if(card)return;
 spot=document.createElement('div');spot.className='kids-tour-spotlight';spot.hidden=true;document.body.appendChild(spot);
 card=document.createElement('aside');card.className='kids-tour-card';card.hidden=true;card.setAttribute('role','dialog');card.setAttribute('aria-labelledby','kids-tour-title');
 card.innerHTML='<div class="kids-tour-top"><strong></strong><button type="button" data-skip></button></div><div class="kids-tour-stars" aria-hidden="true">✦ ★ ✦</div><small data-count></small><h2 id="kids-tour-title"></h2><p data-copy></p><div class="kids-tour-actions"><button type="button" data-back></button><button type="button" data-next></button></div>';
 document.body.appendChild(card);
 card.querySelector('[data-skip]').onclick=()=>finish();
 card.querySelector('[data-back]').onclick=()=>show(Math.max(0,i-1));
 card.querySelector('[data-next]').onclick=()=>i>=steps.length-1?finish():show(i+1);
}
function place(){
 if(!active||!steps[i])return;cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const el=document.querySelector(steps[i]);if(!el)return;const r=el.getBoundingClientRect(),p=9;spot.style.left=Math.max(6,r.left-p)+'px';spot.style.top=Math.max(6,r.top-p)+'px';spot.style.width=Math.min(innerWidth-12,r.width+p*2)+'px';spot.style.height=Math.min(innerHeight-12,r.height+p*2)+'px';});
}
function show(n){
 i=n;const el=document.querySelector(steps[i]);if(!el){steps.splice(i,1);return steps.length?show(Math.min(i,steps.length-1)):finish();}
 const x=t(),pair=x.steps[selectors().indexOf(steps[i])]||x.steps[i];
 card.querySelector('.kids-tour-top strong').textContent=x.label;card.querySelector('[data-skip]').textContent=x.skip;card.querySelector('[data-count]').textContent=(i+1)+' / '+steps.length;card.querySelector('h2').textContent=pair[0];card.querySelector('[data-copy]').textContent=pair[1];card.querySelector('[data-back]').textContent=x.back;card.querySelector('[data-back]').hidden=i===0;card.querySelector('[data-next]').textContent=i===steps.length-1?x.finish:x.next;
 card.hidden=false;spot.hidden=false;document.documentElement.classList.add('kids-tour-active');if(window.MatchAppScrollGate?.canAutoScroll?.())el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});setTimeout(place,380);place();
}
async function finish(){
 active=false;if(card)card.hidden=true;if(spot)spot.hidden=true;document.documentElement.classList.remove('kids-tour-active');
 if(user){try{localStorage.setItem('matchapp_onboarding_kids_'+VERSION+'_'+user.id,'1');}catch(_){}await meta({[ELIGIBLE]:true,[DONE]:true});}
}
async function start(){
 if(active||!window.supabaseClient||!await eligible())return;steps=selectors().filter(s=>document.querySelector(s));if(!steps.length)return;ensure();active=true;show(0);
}
addEventListener('resize',place,{passive:true});addEventListener('scroll',place,{passive:true});
window.addEventListener('load',()=>setTimeout(start,1300),{once:true});
})();
