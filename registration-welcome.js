/* Adult guest-quota registration offer. No billing state or credits originate here. */
(function(){
'use strict';
const copy={
 en:{
  eyebrow:'YOUR FREE PREVIEW IS COMPLETE',
  headline:'Enjoy more of what you love.',
  matches:'Extra Matches',ai:'Ask AI prompts',
  sub:'Create your free account and, once verified, get both welcome bonuses. They are yours in addition to your regular daily AI allowance.',
  note:'No credit card. Complete your profile to unlock your full registered daily allowance.',
  button:'Claim my 20 free bonuses'
 },
 'pt-BR':{
  eyebrow:'VOCÊ APROVEITOU SUA DEGUSTAÇÃO GRATUITA',
  headline:'Continue descobrindo o que você ama.',
  matches:'Matches extras',ai:'Perguntas à Ask AI',
  sub:'Crie sua conta grátis e, após a confirmação, receba os dois bônus de boas-vindas, além do limite diário normal.',
  note:'Sem cartão de crédito. Complete o perfil para liberar todo o seu limite diário de usuário cadastrado.',
  button:'Resgatar meus 20 bônus grátis'
 },
 es:{
  eyebrow:'HAS AGOTADO TU PRUEBA GRATUITA',
  headline:'Sigue descubriendo lo que te gusta.',
  matches:'Matches extra',ai:'Preguntas a Ask AI',
  sub:'Crea una cuenta gratis y, tras verificarla, recibe ambos bonos además de tu límite diario normal.',
  note:'Sin tarjeta de crédito. Completa tu perfil para obtener todo tu límite diario de usuario registrado.',
  button:'Obtener mis 20 bonos gratis'
 }
};
const el=id=>document.getElementById(id);
const locale=()=>{let v=window.MATCH_LANG||localStorage.getItem('match_lang')||document.documentElement.lang||'en';return copy[v]||copy[v.split('-')[0]]||copy.en;};
function translate(){
 const t=locale(),ids={eyebrow:'ma-bonus-eyebrow',headline:'ma-bonus-headline',matches:'ma-bonus-matches',ai:'ma-bonus-ai',
  sub:'ma-bonus-description',note:'ma-bonus-note',button:'ma-bonus-register'};
 for(const [k,id] of Object.entries(ids))if(el(id))el(id).textContent=t[k];
}
function showSignup(){
 window.switchAuthTab?.('signup');
 const card=el('main-auth-modal')?.querySelector('.premium-card');
 if(card)card.scrollTop=0;
 const target=el('reg-full-name')||el('reg-email');
 target?.focus({preventScroll:true});
}
function openOffer(){
 // A signed-in user must never be shown a guest registration prompt.
 if(window.isUserLoggedIn)return false;
 const modal=el('main-auth-modal'),offer=el('ma-welcome-offer');
 if(!modal||!offer)return false;
 offer.hidden=false;
 modal.classList.add('ma-welcome-modal');
 translate();
 window.openAuthModal?.();
 showSignup();
 return true;
}
function init(){
 translate();
 el('ma-bonus-register')?.addEventListener('click',showSignup);
 for(const event of ['matchapp:langchange','matchapp:languagechange'])document.addEventListener(event,translate);
 document.addEventListener('matchapp:authchange',event=>{
   if(event.detail?.signedIn){
     if(el('ma-welcome-offer'))el('ma-welcome-offer').hidden=true;
     el('main-auth-modal')?.classList.remove('ma-welcome-modal');
   }
 });
 // For other adult pages (e-book search/discovery), preserve the precise
 // offer across a navigation back to the Home signup modal.
 const url=new URL(window.location.href);
 if(url.searchParams.get('registrationOffer')==='1'){
   url.searchParams.delete('registrationOffer');
   window.history.replaceState(null,'',url.pathname+url.search+url.hash);
   openOffer();
 }
}
window.MatchAppRegistrationWelcome=Object.freeze({openOffer,showSignup});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
