/* MatchApp walkthrough — manual launch only. */
(function(){
'use strict';
const STEP_KEY='matchapp_onboarding_step_v3';
let stepIndex=0,steps=[],panel=null,spot=null,active=false,repositionRaf=0,touchX=null;
const copy={
 en:{
  pick:['Find My Perfect Match','Use the Match System: choose mood, format and platform, then let MatchApp choose for you.'],
  mood:['Choose your mood','Tell MatchApp how you want the night to feel.'],
  format:['Choose a format','Movie, series and other formats stay explicit.'],
  platform:['Choose a platform','Pick a service, or leave it open to more options.'],
  more:['More filters','Fine-tune genre, vibe, era or rating only when you want to.'],
  find:['Find something to watch','This runs the match using the choices you made.'],
  ai:['Ask MatchApp Ai','Describe what you want naturally when you prefer a conversational recommendation.'],
  latest:['Latest titles','Browse current titles with native swipe or the arrow buttons.'],
  kids:['Kids Mode','Open the separate age-reviewed Kids experience here.'],
  quota:['Daily allowance','This shows how many included AI actions remain today.'],
  profile:['Profile or Sign in','Open your private profile, or sign in to keep your activity across devices.'],
  next:'Next',back:'Back',finish:'Done',skip:'Close',counter:(a,b)=>a+' of '+b
 },
 'pt-BR':{
  pick:['Encontre meu Match Perfeito','Use o Sistema de Match: escolha clima, formato e plataforma, e deixe o MatchApp escolher por você.'],
  mood:['Escolha o clima','Diga ao MatchApp como você quer que a noite seja.'],
  format:['Escolha o formato','Filme, série e outros formatos continuam sendo escolhas explícitas.'],
  platform:['Escolha a plataforma','Escolha um serviço ou deixe em aberto para ter mais opções.'],
  more:['Mais filtros','Ajuste gênero, vibe, época ou classificação só quando quiser.'],
  find:['Encontre algo para assistir','Aqui o MatchApp procura usando as escolhas que você fez.'],
  ai:['Pergunte à MatchApp iA','Descreva naturalmente o que quer assistir quando preferir uma recomendação em conversa.'],
  latest:['Títulos em alta','Navegue com gesto nativo ou com as setas.'],
  kids:['Modo Kids','Abra aqui a experiência infantil separada e revisada por idade.'],
  quota:['Limite diário','Aqui você vê quantas ações de IA incluídas ainda restam hoje.'],
  profile:['Perfil ou Entrar','Abra seu perfil privado ou entre para manter sua atividade entre dispositivos.'],
  next:'Próximo',back:'Voltar',finish:'Concluir',skip:'Fechar',counter:(a,b)=>a+' de '+b
 }
};
const tr=()=>{const l=String(window.MATCH_LANG||document.documentElement.lang||'en');return copy[l]||copy[l.split('-')[0]]||copy.en};
const home=()=>location.pathname==='/'||location.pathname==='/index.html';
function first(list){for(const s of list.split(',')){const e=document.querySelector(s.trim());if(e)return e}return null}
function savedStep(){try{return Math.max(0,Number(localStorage.getItem(STEP_KEY)||0)||0)}catch(_){return 0}}
function saveStep(i){try{localStorage.setItem(STEP_KEY,String(i))}catch(_){}}
function buildSteps(){return[
 {key:'pick',selector:'#ma-tab-match,#questionnaire-box',mode:'match'},
 {key:'mood',selector:'#q-mood,[data-criterion="mood"],[data-crit-key="mood"],.crit-row-mood'},
 {key:'format',selector:'#q-category,#q-format,[data-criterion="format"],[data-crit-key="format"],.crit-row-format'},
 {key:'platform',selector:'#q-platform,[data-criterion="platform"],[data-crit-key="platform"],.crit-row-platform'},
 {key:'more',selector:'.match-more-filters,.crit-collapsible,.crit-toggle',mode:'filters'},
 {key:'find',selector:'#find-match-btn,#match-btn,[data-action="match"],.match-submit,.gold-btn[type="submit"]'},
 {key:'ai',selector:'#ma-tab-ask,.ma-ai-brand-button,[data-ma-tab="ask"]',mode:'ask'},
 {key:'latest',selector:'#trending-rail,#latest-news',mode:'details'},
 {key:'kids',selector:'#matchapp-kids-entry,.ma-kids-mode-entry,[href="/kids/"]'},
 {key:'quota',selector:'#match-counter,#ma-quota,.ma-quota-pill,[data-quota]'},
 {key:'profile',selector:'#profile-link-tab,#nav-reg-btn,[data-avatar-slot],.ma-auth-button'}
].filter(s=>first(s.selector))}
function ensureUi(){
 if(panel)return;
 spot=document.createElement('div');spot.className='matchapp-tour-spotlight';spot.hidden=true;document.body.appendChild(spot);
 panel=document.createElement('aside');panel.className='matchapp-tour-card';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','matchapp-tour-title');
 panel.innerHTML='<div class="matchapp-tour-top"><span class="matchapp-tour-badge">MATCHAPP ✦ HOW IT WORKS</span><button type="button" class="matchapp-tour-skip"></button></div><div class="matchapp-tour-progress"><span></span></div><small class="matchapp-tour-count"></small><h2 id="matchapp-tour-title"></h2><p class="matchapp-tour-copy"></p><div class="matchapp-tour-actions"><button type="button" class="matchapp-tour-back"></button><button type="button" class="matchapp-tour-next"></button></div>';
 document.body.appendChild(panel);
 panel.querySelector('.matchapp-tour-skip').onclick=close;
 panel.querySelector('.matchapp-tour-back').onclick=()=>show(stepIndex-1);
 panel.querySelector('.matchapp-tour-next').onclick=()=>stepIndex>=steps.length-1?close():show(stepIndex+1);
 panel.addEventListener('touchstart',e=>{touchX=e.touches?.[0]?.clientX??null},{passive:true});
 panel.addEventListener('touchend',e=>{if(touchX==null)return;const x=e.changedTouches?.[0]?.clientX??touchX,dx=x-touchX;touchX=null;if(Math.abs(dx)<48)return;show(stepIndex+(dx<0?1:-1))},{passive:true});
}
function prep(step,el){
 if(step.mode==='match')document.getElementById('ma-tab-match')?.click();
 if(step.mode==='ask')document.getElementById('ma-tab-ask')?.click();
 if(step.mode==='filters'){const d=el.matches?.('details')?el:el.closest?.('details');if(d)d.open=true}
 if(step.mode==='details'){const d=el.matches?.('details')?el:el.closest?.('details');if(d)d.open=true}
}
function place(){
 if(!active||!steps[stepIndex])return;
 cancelAnimationFrame(repositionRaf);
 repositionRaf=requestAnimationFrame(()=>{
  const el=first(steps[stepIndex].selector);if(!el)return;
  const r=el.getBoundingClientRect(),pad=10;
  spot.style.left=Math.max(8,r.left-pad)+'px';spot.style.top=Math.max(8,r.top-pad)+'px';
  spot.style.width=Math.max(0,Math.min(innerWidth-16,r.width+pad*2))+'px';
  spot.style.height=Math.max(0,Math.min(innerHeight-16,r.height+pad*2))+'px';
 });
}
function show(i){
 if(!steps.length)return close();
 stepIndex=Math.min(Math.max(i,0),steps.length-1);saveStep(stepIndex);
 const step=steps[stepIndex],el=first(step.selector);
 if(!el){steps.splice(stepIndex,1);return show(Math.min(stepIndex,steps.length-1))}
 prep(step,el);
 const t=tr(),pair=t[step.key]||copy.en[step.key];
 panel.querySelector('.matchapp-tour-skip').textContent=t.skip;
 panel.querySelector('.matchapp-tour-count').textContent=t.counter(stepIndex+1,steps.length);
 panel.querySelector('#matchapp-tour-title').textContent=pair[0];
 panel.querySelector('.matchapp-tour-copy').textContent=pair[1];
 panel.querySelector('.matchapp-tour-back').textContent=t.back;panel.querySelector('.matchapp-tour-back').hidden=stepIndex===0;
 panel.querySelector('.matchapp-tour-next').textContent=stepIndex===steps.length-1?t.finish:t.next;
 panel.querySelector('.matchapp-tour-progress span').style.width=((stepIndex+1)/steps.length*100)+'%';
 panel.hidden=false;spot.hidden=false;document.documentElement.classList.add('matchapp-tour-active');
 try{el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center',inline:'nearest'})}catch(_){}
 setTimeout(place,260);
}
function close(){
 if(!active)return;active=false;
 if(panel)panel.hidden=true;if(spot)spot.hidden=true;
 document.documentElement.classList.remove('matchapp-tour-active');
 document.getElementById('ma-tab-match')?.click();
}
function start(){
 if(active||!home())return;
 steps=buildSteps();if(!steps.length)return;
 ensureUi();active=true;show(Math.min(savedStep(),steps.length-1));
}
window.MatchAppOnboarding=Object.freeze({start,close,version:'v3'});
addEventListener('resize',place,{passive:true});addEventListener('scroll',place,{passive:true});
document.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape')close();else if(e.key==='ArrowRight'){e.preventDefault();show(stepIndex+1)}else if(e.key==='ArrowLeft'){e.preventDefault();show(stepIndex-1)}});
})();
