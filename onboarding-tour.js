/* MatchApp premium anchored walkthrough — manual launch only. */
(function(){
'use strict';

const VERSION='v6';
let stepIndex=0,steps=[],panel=null,spot=null,active=false,repositionRaf=0,touchX=null,lastTarget=null;
let focusGuardInstalled=false;

const copy={
 en:{
  pick:['Find My Perfect Match','This is the fast path. Tap this card when you want MatchApp to choose one title from your mood, format and platform.'],
  mood:['Choose your mood','Pick how you want the night to feel. You can change this anytime before matching.'],
  format:['Choose a format','Movie, series, anime, novela or another format — tap the kind of entertainment you want.'],
  platform:['Choose a platform','Choose a service you already use, or leave it open so MatchApp can search more options.'],
  more:['Fine-tune only if you want','Open More Filters for genre, pacing, era and age rating. Everything here is optional.'],
  ai:['Ask MatchApp Ai','Prefer your own words? Tap this card, then choose typing or the microphone. The tour itself will never open your keyboard.'],
  latest:['Browse the latest titles','Swipe these posters or use the arrows. Tap any title to open its details and where-to-watch information.'],
  kids:['Open Kids Mode','Tap here for the separate age-reviewed Kids experience with its own safety rules.'],
  profile:['Your profile or sign in','Tap your avatar for your private profile, preferences and account controls — or sign in here if you are not signed in yet.'],
  tap:'Tap here',next:'Next',back:'Back',finish:'Done',skip:'Close',counter:(a,b)=>a+' of '+b
 },
 'pt-BR':{
  pick:['Encontre meu Match Perfeito','Este é o caminho rápido. Toque aqui quando quiser que o MatchApp escolha um título pelo seu clima, formato e plataforma.'],
  mood:['Escolha seu clima','Escolha como você quer que a noite se sinta. Você pode mudar isso a qualquer momento antes do match.'],
  format:['Escolha um formato','Filme, série, anime, novela ou outro formato — toque no tipo de entretenimento que você quer.'],
  platform:['Escolha uma plataforma','Escolha um serviço que você já usa ou deixe em aberto para o MatchApp procurar mais opções.'],
  more:['Ajuste só se quiser','Abra Mais Filtros para gênero, ritmo, época e classificação etária. Tudo aqui é opcional.'],
  ai:['Pergunte à MatchApp iA','Prefere explicar com suas próprias palavras? Toque aqui e depois escolha digitar ou usar o microfone. O tour nunca abre o teclado sozinho.'],
  latest:['Veja os títulos mais recentes','Deslize pelos pôsteres ou use as setas. Toque em um título para abrir detalhes e onde assistir.'],
  kids:['Abra o Modo Kids','Toque aqui para entrar na experiência infantil separada, revisada por idade e com regras próprias de segurança.'],
  profile:['Seu perfil ou login','Toque no avatar para abrir perfil privado, preferências e controles da conta — ou entre por aqui se ainda não estiver conectado.'],
  tap:'Toque aqui',next:'Próximo',back:'Voltar',finish:'Concluir',skip:'Fechar',counter:(a,b)=>a+' de '+b
 }
};

const icons={pick:'✦',mood:'◐',format:'▣',platform:'▶',more:'≡',ai:'Ai',latest:'↔',kids:'★',profile:'●'};
const tr=()=>{const l=String(window.MATCH_LANG||document.documentElement.lang||'en');return copy[l]||copy[l.split('-')[0]]||copy.en};
const home=()=>location.pathname==='/'||location.pathname==='/index.html';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(n,min,max)=>Math.min(Math.max(n,min),max);

function visible(el){
 if(!el||!el.isConnected)return false;
 const cs=getComputedStyle(el),r=el.getBoundingClientRect();
 return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)!==0&&r.width>8&&r.height>8;
}

function visualTarget(el){
 if(!el)return null;
 if(visible(el))return el;
 if(el.matches?.('select,input[type="hidden"]')){
  const wrap=el.parentElement;
  const control=wrap?.querySelector?.('.crit-toggle,button,[role="button"]');
  if(visible(control))return control;
 }
 return null;
}

function firstVisible(list){
 for(const selector of String(list||'').split(',')){
  let nodes=[];
  try{nodes=[...document.querySelectorAll(selector.trim())]}catch(_){continue}
  for(const node of nodes){const target=visualTarget(node);if(target)return target}
 }
 return null;
}

function buildSteps(){
 const defs=[
  {key:'pick',selector:'#ma-tab-match'},
  {key:'mood',selector:'.ma-quick .ma-filter-row.ma-mood-block'},
  {key:'format',selector:'.ma-quick .ma-filter-row:nth-child(2)'},
  {key:'platform',selector:'.ma-quick .ma-filter-row:nth-child(3)'},
  {key:'more',selector:'.match-more-filters>summary,.match-more-filters',mode:'filters'},
  {key:'ai',selector:'#ma-tab-ask'},
  {key:'latest',selector:'#trending-rail .marquee-item:nth-child(2),#trending-rail .marquee-item,#trending-rail'},
  {key:'kids',selector:'#matchapp-kids-entry,.ma-kids-mode-entry'},
  {key:'profile',selector:'#profile-link-tab,#nav-reg-btn,[data-avatar-slot]'}
 ];
 return defs.filter(step=>firstVisible(step.selector));
}

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
    '<span class="matchapp-tour-badge">MATCHAPP <b>✦</b> HOW IT WORKS</span>'+
    '<button type="button" class="matchapp-tour-skip"></button>'+
  '</div>'+
  '<div class="matchapp-tour-meta">'+
    '<span class="matchapp-tour-icon" aria-hidden="true"></span>'+
    '<small class="matchapp-tour-count"></small>'+
    '<span class="matchapp-tour-tap"><i aria-hidden="true">↗</i><span></span></span>'+
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
  if(Math.abs(dx)<58)return;
  show(stepIndex+(dx<0?1:-1));
 },{passive:true});
}

function prep(step,el){
 // Only the Match tab is activated for context. Ask AI is deliberately never
 // activated by the tour because its normal click behavior focuses the input.
 if(step.key==='pick')document.getElementById('ma-tab-match')?.click();
 if(step.mode==='filters'){
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

function blurActive(){
 const a=document.activeElement;
 if(a&&a!==document.body&&typeof a.blur==='function')try{a.blur()}catch(_){}
}

function isTextInput(node){
 return !!node?.matches?.('input,textarea,[contenteditable="true"],[contenteditable=""]');
}

function guardFocus(e){
 if(!active)return;
 const node=e?.target||document.activeElement;
 if(!isTextInput(node))return;
 setTimeout(()=>{try{node.blur()}catch(_){}},0);
}

function installFocusGuard(){
 if(focusGuardInstalled)return;
 focusGuardInstalled=true;
 document.addEventListener('focusin',guardFocus,true);
}

function removeFocusGuard(){
 if(!focusGuardInstalled)return;
 focusGuardInstalled=false;
 document.removeEventListener('focusin',guardFocus,true);
}

function revealTarget(el){
 const vp=viewport(),r=el.getBoundingClientRect();
 const guardTop=vp.top+18,guardBottom=vp.bottom-18;
 const outside=r.bottom<guardTop||r.top>guardBottom||r.right<vp.left+12||r.left>vp.right-12;
 if(outside){
  try{el.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center',inline:'nearest'})}catch(_){}
  return;
 }
 if(vp.width>700||!panel)return;
 const h=Math.min(panel.getBoundingClientRect().height||210,vp.height*.48);
 const gap=24;
 const roomBelow=vp.bottom-r.bottom;
 const roomAbove=r.top-vp.top;
 if(roomBelow>=h+gap||roomAbove>=h+gap)return;

 // On a phone, put the highlighted control in the upper third so the speech
 // bubble has real room underneath instead of becoming a bottom sheet.
 const targetCenter=r.top+r.height/2;
 const desired=vp.top+Math.min(vp.height*.31,230);
 const delta=targetCenter-desired;
 if(Math.abs(delta)>18){
  try{window.scrollBy({top:delta,behavior:reduced()?'auto':'smooth'})}catch(_){}
 }
}

function overflowScore(x,y,w,h,vp,edge){
 const l=Math.max(0,(vp.left+edge)-x);
 const t=Math.max(0,(vp.top+edge)-y);
 const r=Math.max(0,(x+w)-(vp.right-edge));
 const b=Math.max(0,(y+h)-(vp.bottom-edge));
 return l+t+r+b;
}

function place(){
 if(!active||!steps[stepIndex]||!panel||!spot)return;
 cancelAnimationFrame(repositionRaf);
 repositionRaf=requestAnimationFrame(()=>{
  const step=steps[stepIndex],el=firstVisible(step.selector);
  if(!el)return;
  lastTarget=el;
  const vp=viewport(),r=el.getBoundingClientRect(),pad=7,edge=12,gap=20;

  // Never clamp an off-screen target into a tiny fake spotlight at the edge
  // of the phone. During smooth scrolling, keep the coachmark invisible and
  // let the scroll/settle callbacks position it only once the true control is
  // actually inside the visual viewport.
  const visibleWidth=Math.max(0,Math.min(r.right,vp.right-edge)-Math.max(r.left,vp.left+edge));
  const visibleHeight=Math.max(0,Math.min(r.bottom,vp.bottom-edge)-Math.max(r.top,vp.top+edge));
  const targetReady=visibleWidth>=Math.min(32,r.width*.45)&&visibleHeight>=Math.min(24,r.height*.45);
  if(!targetReady){
   spot.hidden=true;
   panel.hidden=false;
   panel.style.visibility='hidden';
   return;
  }
  spot.hidden=false;

  const sl=clamp(r.left-pad,vp.left+edge,vp.right-edge);
  const st=clamp(r.top-pad,vp.top+edge,vp.bottom-edge);
  const sr=clamp(r.right+pad,vp.left+edge,vp.right-edge);
  const sb=clamp(r.bottom+pad,vp.top+edge,vp.bottom-edge);
  spot.style.left=sl+'px';spot.style.top=st+'px';
  spot.style.width=Math.max(20,sr-sl)+'px';spot.style.height=Math.max(20,sb-st)+'px';
  const radius=parseFloat(getComputedStyle(el).borderRadius)||14;
  spot.style.borderRadius=clamp(radius+6,15,32)+'px';

  panel.hidden=false;
  panel.style.visibility='hidden';
  panel.style.left=(vp.left+edge)+'px';
  panel.style.top=(vp.top+edge)+'px';

  const box=panel.getBoundingClientRect(),w=box.width,h=box.height;
  const cx=clamp(r.left+r.width/2,vp.left+edge,vp.right-edge);
  const cy=clamp(r.top+r.height/2,vp.top+edge,vp.bottom-edge);
  const candidates=[
   {side:'below',x:cx-w/2,y:r.bottom+gap},
   {side:'above',x:cx-w/2,y:r.top-gap-h},
   {side:'right',x:r.right+gap,y:cy-h/2},
   {side:'left',x:r.left-gap-w,y:cy-h/2}
  ];
  const order=vp.width<=700?['below','above','right','left']:['right','left','below','above'];
  candidates.sort((a,b)=>{
   const ao=overflowScore(a.x,a.y,w,h,vp,edge),bo=overflowScore(b.x,b.y,w,h,vp,edge);
   if(ao!==bo)return ao-bo;
   return order.indexOf(a.side)-order.indexOf(b.side);
  });

  const best=candidates[0];
  const x=clamp(best.x,vp.left+edge,vp.right-w-edge);
  const y=clamp(best.y,vp.top+edge,vp.bottom-h-edge);
  const arrowX=clamp(cx-x,30,w-30);
  const arrowY=clamp(cy-y,30,h-30);

  panel.dataset.side=best.side;
  panel.style.setProperty('--tour-arrow-x',arrowX+'px');
  panel.style.setProperty('--tour-arrow-y',arrowY+'px');
  panel.style.left=x+'px';panel.style.top=y+'px';
  panel.style.visibility='visible';
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
 panel.querySelector('.matchapp-tour-tap span').textContent=t.tap;
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

 // Reposition after smooth scrolling settles and re-blur any input that a
 // normal target click tried to focus while the tour is still open.
 [90,220,420].forEach(ms=>setTimeout(()=>{blurActive();place()},reduced()?0:ms));
}

function close(){
 if(!active)return;
 active=false;
 blurActive();
 removeFocusGuard();
 if(panel)panel.hidden=true;
 if(spot)spot.hidden=true;
 document.documentElement.classList.remove('matchapp-tour-active');
 lastTarget=null;
}

function start(){
 if(active||!home())return;
 steps=buildSteps();
 if(!steps.length)return;
 ensureUi();
 active=true;
 installFocusGuard();
 show(0);
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