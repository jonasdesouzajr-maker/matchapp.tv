/* MatchApp premium contextual walkthrough — manual launch only. */
(function(){
'use strict';

const VERSION='v4';
let stepIndex=0,steps=[],panel=null,spot=null,active=false,repositionRaf=0,touchX=null,lastTarget=null;

const copy={
 en:{
  pick:['Find My Perfect Match','Start here when you want MatchApp to choose one title from your mood, format and platform.'],
  mood:['Choose your mood','Tap the feeling you want right now. MatchApp keeps that mood as part of the match.'],
  format:['Choose a format','Pick movie, series, anime, novela or another format — or leave it open.'],
  platform:['Choose a platform','Choose a service you already use, or leave it open to search more options.'],
  more:['Fine-tune only if you want','Open More Filters for genre, pacing, era and age rating. You can also leave these untouched.'],
  find:['Run your match','Tap here after choosing your preferences. MatchApp will return one title that fits them.'],
  ai:['Ask MatchApp Ai','Prefer to describe it in your own words? Tap this card, then type or use the microphone when you choose.'],
  latest:['Browse what is current','Swipe the latest-title rail or use its arrows to explore what is new right now.'],
  kids:['Open Kids Mode','This opens the separate age-reviewed Kids experience with its own safety rules.'],
  quota:['See what remains today','Your daily allowance lives here so you always know how many included actions remain.'],
  profile:['Your profile','Tap your avatar to open your private profile, preferences and account controls.'],
  next:'Next',back:'Back',finish:'Done',skip:'Close',counter:(a,b)=>a+' / '+b
 },
 'pt-BR':{
  pick:['Encontre meu Match Perfeito','Comece aqui quando quiser que o MatchApp escolha um título pelo seu clima, formato e plataforma.'],
  mood:['Escolha seu clima','Toque na sensação que você quer agora. O MatchApp mantém esse clima como parte do match.'],
  format:['Escolha um formato','Escolha filme, série, anime, novela ou outro formato — ou deixe em aberto.'],
  platform:['Escolha uma plataforma','Escolha um serviço que você já usa ou deixe em aberto para procurar mais opções.'],
  more:['Ajuste só se quiser','Abra Mais Filtros para gênero, ritmo, época e classificação etária. Você também pode deixar tudo como está.'],
  find:['Faça seu match','Toque aqui depois de escolher suas preferências. O MatchApp retorna um título que combina com elas.'],
  ai:['Pergunte à MatchApp iA','Prefere explicar com suas próprias palavras? Toque neste cartão e só então digite ou use o microfone se quiser.'],
  latest:['Veja o que está em alta','Deslize a faixa de títulos recentes ou use as setas para explorar novidades.'],
  kids:['Abra o Modo Kids','Aqui começa a experiência infantil separada, revisada por idade e com regras próprias de segurança.'],
  quota:['Veja o que resta hoje','Seu limite diário fica aqui para você sempre saber quantas ações incluídas ainda restam.'],
  profile:['Seu perfil','Toque no seu avatar para abrir perfil privado, preferências e controles da conta.'],
  next:'Próximo',back:'Voltar',finish:'Concluir',skip:'Fechar',counter:(a,b)=>a+' / '+b
 }
};

const icons={pick:'✦',mood:'◐',format:'▣',platform:'▶',more:'≡',find:'✦',ai:'Ai',latest:'↔',kids:'★',quota:'⚡',profile:'●'};
const tr=()=>{const l=String(window.MATCH_LANG||document.documentElement.lang||'en');return copy[l]||copy[l.split('-')[0]]||copy.en};
const home=()=>location.pathname==='/'||location.pathname==='/index.html';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

function visible(el){
 if(!el||!el.isConnected)return false;
 const cs=getComputedStyle(el),r=el.getBoundingClientRect();
 return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>6&&r.height>6;
}
function visualTarget(el){
 if(!el)return null;
 if(el.matches?.('select,input[type="hidden"]')||!visible(el)){
  const wrap=el.closest?.('.crit-collapsible,.q-field,.q-control');
  const control=wrap?.querySelector?.('.crit-toggle,button,[role="button"]');
  if(visible(control))return control;
  if(visible(wrap))return wrap;
 }
 const details=el.closest?.('details');
 const summary=details?.querySelector?.(':scope > summary');
 if(el!==details&&visible(summary)&&!visible(el))return summary;
 return visible(el)?el:null;
}
function firstVisible(list){
 for(const selector of list.split(',')){
  let nodes=[];
  try{nodes=[...document.querySelectorAll(selector.trim())]}catch(_){continue}
  for(const node of nodes){const target=visualTarget(node);if(target)return target}
 }
 return null;
}
function buildSteps(){return[
 {key:'pick',selector:'#ma-tab-match,#questionnaire-box',mode:'match'},
 {key:'mood',selector:'#q-mood,.crit-row-mood,[data-criterion="mood"],[data-crit-key="mood"]'},
 {key:'format',selector:'#q-category,#q-format,.crit-row-format,[data-criterion="format"],[data-crit-key="format"]'},
 {key:'platform',selector:'#q-platform,.crit-row-platform,[data-criterion="platform"],[data-crit-key="platform"]'},
 {key:'more',selector:'.match-more-filters>summary,.match-more-filters,.crit-collapsible,.crit-toggle',mode:'filters'},
 {key:'find',selector:'#find-match-btn,#match-btn,[data-action="match"],.match-submit,.gold-btn[type="submit"]'},
 {key:'ai',selector:'#ma-tab-ask,.ma-ai-brand-button,[data-ma-tab="ask"]'},
 {key:'latest',selector:'.marquee-viewport,#trending-rail,#latest-news',mode:'details'},
 {key:'kids',selector:'#matchapp-kids-entry,.ma-kids-mode-entry,[href="/kids/"]'},
 {key:'quota',selector:'#quota-badge,#match-counter,#ma-quota,.ma-quota-pill,[data-quota]'},
 {key:'profile',selector:'#profile-link-tab,#nav-reg-btn,[data-avatar-slot],.ma-auth-button'}
].filter(step=>firstVisible(step.selector))}

function ensureUi(){
 if(panel)return;
 spot=document.createElement('div');
 spot.className='matchapp-tour-spotlight';
 spot.hidden=true;
 spot.setAttribute('aria-hidden','true');
 document.body.appendChild(spot);

 panel=document.createElement('aside');
 panel.className='matchapp-tour-card';
 panel.hidden=true;
 panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','false');
 panel.setAttribute('aria-labelledby','matchapp-tour-title');
 panel.innerHTML=
  '<span class="matchapp-tour-pointer" aria-hidden="true"></span>'+
  '<div class="matchapp-tour-top">'+
    '<span class="matchapp-tour-badge"><b>✦</b> MATCHAPP GUIDE</span>'+
    '<button type="button" class="matchapp-tour-skip"></button>'+
  '</div>'+
  '<div class="matchapp-tour-meta">'+
    '<span class="matchapp-tour-icon" aria-hidden="true"></span>'+
    '<small class="matchapp-tour-count"></small>'+
  '</div>'+
  '<h2 id="matchapp-tour-title"></h2>'+
  '<p class="matchapp-tour-copy"></p>'+
  '<div class="matchapp-tour-progress" aria-hidden="true"><span></span></div>'+
  '<div class="matchapp-tour-actions">'+
    '<button type="button" class="matchapp-tour-back"></button>'+
    '<button type="button" class="matchapp-tour-next"></button>'+
  '</div>';
 document.body.appendChild(panel);

 panel.querySelector('.matchapp-tour-skip').onclick=close;
 panel.querySelector('.matchapp-tour-back').onclick=()=>show(stepIndex-1);
 panel.querySelector('.matchapp-tour-next').onclick=()=>stepIndex>=steps.length-1?close():show(stepIndex+1);
 panel.addEventListener('touchstart',e=>{touchX=e.touches?.[0]?.clientX??null},{passive:true});
 panel.addEventListener('touchend',e=>{
  if(touchX==null)return;
  const x=e.changedTouches?.[0]?.clientX??touchX,dx=x-touchX;touchX=null;
  if(Math.abs(dx)<54)return;
  show(stepIndex+(dx<0?1:-1));
 },{passive:true});
}

function prep(step,el){
 // Keep the Match controls visible, but never open/focus Ask AI automatically.
 // The walkthrough explains where to tap; it must not trigger the keyboard.
 if(step.mode==='match')document.getElementById('ma-tab-match')?.click();
 if(step.mode==='filters'){
  const d=el.matches?.('details')?el:el.closest?.('details');
  if(d)d.open=true;
 }
 if(step.mode==='details'){
  const d=el.matches?.('details')?el:el.closest?.('details');
  if(d)d.open=true;
 }
}

function viewport(){
 const vv=window.visualViewport;
 const left=vv?.offsetLeft||0,top=vv?.offsetTop||0;
 const width=vv?.width||innerWidth,height=vv?.height||innerHeight;
 return {left,top,width,height,right:left+width,bottom:top+height};
}
function clamp(n,min,max){return Math.min(Math.max(n,min),max)}
function blurActive(){
 const a=document.activeElement;
 if(a&&a!==document.body&&typeof a.blur==='function')try{a.blur()}catch(_){}
}
function revealTarget(el){
 const vp=viewport(),r=el.getBoundingClientRect();
 const guard=Math.min(96,Math.max(56,vp.height*.09));
 if(r.bottom<vp.top+guard||r.top>vp.bottom-guard||r.left>vp.right-24||r.right<vp.left+24){
  try{el.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center',inline:'nearest'})}catch(_){}
 }
}

function place(){
 if(!active||!steps[stepIndex]||!panel||!spot)return;
 cancelAnimationFrame(repositionRaf);
 repositionRaf=requestAnimationFrame(()=>{
  const step=steps[stepIndex],el=firstVisible(step.selector);
  if(!el)return;
  lastTarget=el;
  const vp=viewport(),r=el.getBoundingClientRect(),pad=8,edge=10,gap=18;

  const sl=clamp(r.left-pad,vp.left+edge,vp.right-edge);
  const st=clamp(r.top-pad,vp.top+edge,vp.bottom-edge);
  const sr=clamp(r.right+pad,vp.left+edge,vp.right-edge);
  const sb=clamp(r.bottom+pad,vp.top+edge,vp.bottom-edge);
  const sw=Math.max(18,sr-sl),sh=Math.max(18,sb-st);
  spot.style.left=sl+'px';spot.style.top=st+'px';spot.style.width=sw+'px';spot.style.height=sh+'px';
  const radius=parseFloat(getComputedStyle(el).borderRadius)||14;
  spot.style.borderRadius=clamp(radius+6,14,30)+'px';

  panel.style.visibility='hidden';
  panel.style.left=vp.left+edge+'px';
  panel.style.top=vp.top+edge+'px';
  panel.hidden=false;
  const box=panel.getBoundingClientRect(),w=box.width,h=box.height;
  const below=vp.bottom-r.bottom,above=r.top-vp.top,right=vp.right-r.right,left=r.left-vp.left;
  const mobile=vp.width<=700;

  let side;
  if(mobile){
   if(below>=h+gap)side='below';
   else if(above>=h+gap)side='above';
   else side=below>=above?'below':'above';
  }else{
   if(right>=w+gap)side='right';
   else if(left>=w+gap)side='left';
   else if(below>=h+gap)side='below';
   else side='above';
  }

  let x,y,arrowX=w/2,arrowY=h/2;
  const cx=clamp(r.left+r.width/2,vp.left+edge,vp.right-edge);
  const cy=clamp(r.top+r.height/2,vp.top+edge,vp.bottom-edge);
  if(side==='below'){
   x=clamp(cx-w/2,vp.left+edge,vp.right-w-edge);
   y=clamp(r.bottom+gap,vp.top+edge,vp.bottom-h-edge);
   arrowX=clamp(cx-x,28,w-28);
  }else if(side==='above'){
   x=clamp(cx-w/2,vp.left+edge,vp.right-w-edge);
   y=clamp(r.top-gap-h,vp.top+edge,vp.bottom-h-edge);
   arrowX=clamp(cx-x,28,w-28);
  }else if(side==='right'){
   x=clamp(r.right+gap,vp.left+edge,vp.right-w-edge);
   y=clamp(cy-h/2,vp.top+edge,vp.bottom-h-edge);
   arrowY=clamp(cy-y,28,h-28);
  }else{
   x=clamp(r.left-gap-w,vp.left+edge,vp.right-w-edge);
   y=clamp(cy-h/2,vp.top+edge,vp.bottom-h-edge);
   arrowY=clamp(cy-y,28,h-28);
  }

  panel.dataset.side=side;
  panel.style.setProperty('--tour-arrow-x',arrowX+'px');
  panel.style.setProperty('--tour-arrow-y',arrowY+'px');
  panel.style.left=x+'px';panel.style.top=y+'px';panel.style.visibility='visible';
 });
}

function show(i){
 if(!steps.length)return close();
 stepIndex=Math.min(Math.max(i,0),steps.length-1);
 const step=steps[stepIndex];
 let el=firstVisible(step.selector);
 if(!el){steps.splice(stepIndex,1);return steps.length?show(Math.min(stepIndex,steps.length-1)):close()}

 blurActive();
 prep(step,el);
 el=firstVisible(step.selector)||el;

 const t=tr(),pair=t[step.key]||copy.en[step.key];
 panel.querySelector('.matchapp-tour-skip').textContent=t.skip;
 panel.querySelector('.matchapp-tour-count').textContent=t.counter(stepIndex+1,steps.length);
 panel.querySelector('.matchapp-tour-icon').textContent=icons[step.key]||'✦';
 panel.querySelector('#matchapp-tour-title').textContent=pair[0];
 panel.querySelector('.matchapp-tour-copy').textContent=pair[1];
 panel.querySelector('.matchapp-tour-back').textContent=t.back;
 panel.querySelector('.matchapp-tour-back').hidden=stepIndex===0;
 panel.querySelector('.matchapp-tour-next').textContent=stepIndex===steps.length-1?t.finish:t.next;
 panel.querySelector('.matchapp-tour-progress span').style.width=((stepIndex+1)/steps.length*100)+'%';

 panel.hidden=false;spot.hidden=false;
 document.documentElement.classList.add('matchapp-tour-active');
 revealTarget(el);
 place();
 setTimeout(place,reduced()?0:180);
 setTimeout(place,reduced()?0:360);
}

function close(){
 if(!active)return;
 active=false;
 blurActive();
 if(panel)panel.hidden=true;
 if(spot)spot.hidden=true;
 document.documentElement.classList.remove('matchapp-tour-active');
 lastTarget=null;
}

function start(){
 if(active||!home())return;
 steps=buildSteps();if(!steps.length)return;
 ensureUi();active=true;show(0);
}

window.MatchAppOnboarding=Object.freeze({start,close,version:VERSION});
addEventListener('resize',place,{passive:true});
addEventListener('scroll',place,{passive:true});
window.visualViewport?.addEventListener('resize',place,{passive:true});
window.visualViewport?.addEventListener('scroll',place,{passive:true});
document.addEventListener('keydown',e=>{
 if(!active)return;
 if(e.key==='Escape')close();
 else if(e.key==='ArrowRight'){e.preventDefault();show(stepIndex+1)}
 else if(e.key==='ArrowLeft'){e.preventDefault();show(stepIndex-1)}
});
})();
