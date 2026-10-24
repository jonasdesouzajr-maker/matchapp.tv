/* MatchApp Ai hands-on guide (coach marks) + upfront permission primer.
 * Presentation-only: never calls matching/AI code, never prevents a real tap,
 * never runs in Kids. Progress advances only on trusted user taps. */
(function(){
'use strict';
const VERSION='coach-20261022-1';
const KEY='matchapp.coach.v1',PKEY='matchapp.permissions.v1';
const path=location.pathname;
if(/^\/kids(\/|$)/.test(path)||document.documentElement.classList.contains('kids-mode')||document.body?.classList.contains('kids-mode'))return;

const dock=r=>'.ma-cinema-dock [data-cinema-route="'+r+'"]';
const GO='#questionnaire-box [onclick*="triggerMatch(false)"]';
const STEPS=[
 {id:'welcome',page:'home',kind:'card'},
 {id:'explore',page:'home',target:dock('explore'),wait:'tap',t:'exploreT',b:'exploreB'},
 {id:'exploreHere',page:'explore',target:dock('home'),wait:'tap',t:'exploreHereT',b:'exploreHereB'},
 {id:'list',page:'home',target:dock('list'),wait:'tap',t:'listT',b:'listB'},
 {id:'listHere',page:'profile',target:dock('home'),wait:'tap',t:'listHereT',b:'listHereB'},
 {id:'profile',page:'home',target:dock('profile'),wait:'tap',t:'profileT',b:'profileB'},
 {id:'profileHere',page:'profile',target:dock('home'),wait:'tap',t:'profileHereT',b:'profileHereB'},
 {id:'matches',page:'home',target:dock('matches'),wait:'tap',t:'matchesT',b:'matchesB',same:true},
 {id:'mood',page:'home',target:'#questionnaire-box .ma-cinema-mood',wait:'choice',t:'moodT',b:'moodB'},
 {id:'format',page:'home',target:'#questionnaire-box .ma-cinema-format',wait:'choice',t:'formatT',b:'formatB'},
 {id:'go',page:'home',target:GO,wait:'tap',t:'goT',b:'goB',later:'goLater',same:true},
 {id:'jonas',page:'home',target:'#ma-jonas-home-bubble,.jh-bubble',wait:'none',t:'jonasT',b:'jonasB',final:true}
];
const TOTAL=STEPS.length-1;

function pageKind(){
 if(path==='/'||path==='/index.html')return'home';
 if(path==='/explore.html'||path==='/explore')return'explore';
 if(/^\/profile\/(profile\.html)?$/.test(path))return'profile';
 return'other';
}
function load(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}
function lang(){return String(window.MATCH_LANG||document.documentElement.lang||'en').trim()}
function t(key){
 const all=window.MatchAppCoachLocales||{},l=lang();
 const set=all[l]||all[l.split('-')[0]]||(l.split('-')[0]==='pt'?all['pt-BR']:null)||all.en||{};
 return set[key]||key;
}
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion');
const native=()=>!!window.MatchAppNativeStartup||document.documentElement.classList.contains('matchapp-ai-android');
function visible(el){if(!el||!el.isConnected)return false;const r=el.getBoundingClientRect(),c=getComputedStyle(el);return r.width>4&&r.height>4&&c.visibility!=='hidden'&&c.display!=='none'}
function find(sel){for(const s of String(sel).split(',')){for(const n of document.querySelectorAll(s.trim()))if(visible(n))return n}return null}

let ui=null,active=false,cur=null,raf=0,ro=null,target=null;
function el(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n}
function btn(cls,txt,fn){const b=el('button','ma-coach-btn '+cls,txt);b.type='button';b.addEventListener('click',e=>{e.stopPropagation();fn()});return b}
function ensureUi(){
 if(ui)return ui;
 const root=el('div','ma-coach');root.setAttribute('data-coach-version',VERSION);root.hidden=true;
 const blocks=['t','r','b','l'].map(s=>{const d=el('div','ma-coach-block ma-coach-block-'+s);d.addEventListener('click',nudge);return d});
 const ring=el('div','ma-coach-ring');ring.setAttribute('aria-hidden','true');
 const arrow=el('div','ma-coach-arrow');arrow.setAttribute('aria-hidden','true');arrow.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 3v15m0 0-6-6m6 6 6-6"/></svg>';
 const card=el('section','ma-coach-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','false');card.setAttribute('aria-live','polite');card.setAttribute('aria-labelledby','ma-coach-title');
 root.append(...blocks,ring,arrow,card);document.body.appendChild(root);
 ui={root,blocks,ring,arrow,card};return ui;
}
function nudge(){if(!ui)return;ui.ring.classList.remove('is-nudge');void ui.ring.offsetWidth;ui.ring.classList.add('is-nudge')}

function renderCard(step,idx){
 const c=ui.card;c.textContent='';c.lang=lang();c.dir=lang().startsWith('ar')?'rtl':'ltr';
 c.dataset.step=step.id;
 const top=el('div','ma-coach-top');top.append(el('span','ma-coach-badge','MatchApp Ai'));
 if(idx>0)top.append(el('small','ma-coach-count',t('count').replace('{a}',idx).replace('{b}',TOTAL)));
 c.append(top);
 const h=el('h2','ma-coach-title',step.kind==='card'?t('welcomeT'):step.resume?t('resumeT'):t(step.t));h.id='ma-coach-title';
 c.append(h,el('p','ma-coach-body',step.kind==='card'?t('welcomeB'):step.resume?t('resumeB'):t(step.b)));
 if(step.wait==='tap'||step.wait==='choice'){const hint=el('p','ma-coach-hint',step.wait==='tap'?t('tapHint'):t('chooseHint'));c.append(hint)}
 const row=el('div','ma-coach-actions');
 if(step.kind==='card'){row.append(btn('ma-coach-ghost',t('skip'),skip),btn('ma-coach-primary',t('start'),()=>go(1)))}
 else if(step.final){row.append(btn('ma-coach-primary',t('finish'),finish))}
 else{
  row.append(btn('ma-coach-ghost',t('skip'),skip));
  if(step.later)row.append(btn('ma-coach-ghost',t(step.later),()=>go(cur.i+1)));
  else row.append(btn('ma-coach-ghost',t('later'),pause));
 }
 c.append(row);
 if(idx>0){const bar=el('div','ma-coach-progress');const fill=el('span');fill.style.width=Math.round(idx/TOTAL*100)+'%';bar.append(fill);c.append(bar)}
}

function layout(){
 if(!active||!ui)return;
 const vw=innerWidth,vh=innerHeight,step=cur.step;
 target=step.target?find(step.target):null;
 const [bt,br,bb,bl]=ui.blocks;
 if(!target){
  // Full dim, centered card (welcome or a target that is not mounted yet).
  bt.style.cssText='left:0;top:0;width:100%;height:100%';br.style.cssText=bb.style.cssText=bl.style.cssText='display:none';
  ui.ring.hidden=true;ui.arrow.hidden=true;
  const cr=ui.card.getBoundingClientRect();
  ui.card.style.left=Math.max(12,(vw-cr.width)/2)+'px';ui.card.style.top=Math.max(12,(vh-cr.height)/2)+'px';
  return;
 }
 const r=target.getBoundingClientRect(),pad=6;
 const x=Math.max(0,r.left-pad),y=Math.max(0,r.top-pad),x2=Math.min(vw,r.right+pad),y2=Math.min(vh,r.bottom+pad);
 bt.style.cssText=`left:0;top:0;width:100%;height:${y}px`;
 bb.style.cssText=`left:0;top:${y2}px;width:100%;height:${Math.max(0,vh-y2)}px`;
 bl.style.cssText=`left:0;top:${y}px;width:${x}px;height:${Math.max(0,y2-y)}px`;
 br.style.cssText=`left:${x2}px;top:${y}px;width:${Math.max(0,vw-x2)}px;height:${Math.max(0,y2-y)}px`;
 ui.ring.hidden=false;
 Object.assign(ui.ring.style,{left:x+'px',top:y+'px',width:(x2-x)+'px',height:(y2-y)+'px'});
 const cr=ui.card.getBoundingClientRect(),gap=56;
 const below=vh-y2,above=y;
 let top,side;
 if(above>=cr.height+gap||above>below){top=Math.max(12,y-gap-cr.height);side='above'}else{top=Math.min(vh-cr.height-12,y2+gap);side='below'}
 const cx=(x+x2)/2;
 ui.card.style.left=Math.min(Math.max(12,cx-cr.width/2),vw-cr.width-12)+'px';ui.card.style.top=top+'px';
 ui.arrow.hidden=false;ui.arrow.dataset.side=side;
 ui.arrow.style.left=(cx-20)+'px';ui.arrow.style.top=(side==='above'?y-46:y2+6)+'px';
}
function loop(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{layout();if(active)loop()})}

function reveal(){
 if(!target)return;
 const r=target.getBoundingClientRect();
 const header=document.getElementById('ma-reference-header');
 const topClearance=Math.max(70,header?header.getBoundingClientRect().bottom+8:0);
 if(r.top<topClearance||r.bottom>innerHeight-110){try{target.scrollIntoView({block:'center',behavior:reduced()?'auto':'smooth'})}catch(_){}}
}

function show(i,opts){
 const step=STEPS[i];if(!step)return finish();
 const here=pageKind();
 let view=step;
 if(step.page!==here){
  // Wrong page for this step: point to Home in the dock so the user resumes there.
  if(here==='home'){return go(i+1)}
  view={id:'resume',resume:true,target:dock('home'),wait:'tap',page:here};
 }
 cur={i,step:view};active=true;
 ensureUi();ui.root.hidden=false;ui.root.dataset.step=view.id;
 ui.root.style.setProperty('--coach-level',String(Math.min(i,TOTAL)));
 ui.root.classList.toggle('is-final',!!view.final);
 ui.root.classList.toggle('is-open-target',view.wait==='none');
 document.documentElement.classList.add('ma-coach-active');
 renderCard(view,view.kind==='card'?0:Math.min(i,TOTAL));
 save(KEY,{i,status:'active',v:1});
 target=view.target?find(view.target):null;reveal();
 if(ro)ro.disconnect();
 loop();
 setTimeout(()=>{const f=ui.card.querySelector('.ma-coach-actions .ma-coach-primary');if(f)f.focus({preventScroll:true});else{ui.card.tabIndex=-1;ui.card.focus({preventScroll:true})}},reduced()?0:120);
}
function go(i){if(i>=STEPS.length)return finish();show(i)}
function hide(){active=false;cancelAnimationFrame(raf);if(ui)ui.root.hidden=true;document.documentElement.classList.remove('ma-coach-active')}
function pause(){const s=load(KEY)||{};save(KEY,{i:s.i||1,status:'paused',v:1});hide()}
function skip(){save(KEY,{i:0,status:'skipped',v:1});hide()}
function finish(){save(KEY,{i:0,status:'done',v:1});hide()}

// Advance only on genuine taps on the highlighted control; the tap itself is never blocked.
document.addEventListener('click',e=>{
 if(!active||!cur||!e.isTrusted)return;
 const step=cur.step;
 if(!step.target||!step.wait)return;
 const hit=e.target.closest?.(step.target);
 if(!hit)return;
 if(step.wait==='none'){finish();return}
 if(step.wait==='tap'){
  if(step.resume){save(KEY,{i:cur.i,status:'active',v:1});return}
  const next=cur.i+1;save(KEY,{i:next,status:'active',v:1});
  // Same-page targets (anchor scroll / real match): continue in place after the tap settles.
  if(step.same||!(hit.closest('a')?.href)){setTimeout(()=>go(next),reduced()?60:520)}
  else hide();
  return;
 }
 if(step.wait==='choice'){
  const chip=e.target.closest('.crit-chip:not(.crit-more),[role="option"],[data-value]');
  if(chip){setTimeout(()=>go(cur.i+1),reduced()?60:420)}
 }
},true);
document.addEventListener('change',e=>{
 if(!active||!cur||cur.step.wait!=='choice'||!e.isTrusted)return;
 if(e.target.closest?.(cur.step.target))setTimeout(()=>go(cur.i+1),reduced()?60:420);
},true);
document.addEventListener('keydown',e=>{if(active&&e.key==='Escape')pause()});
document.addEventListener('matchapp:langchange',()=>{document.querySelectorAll('[data-coach-start]').forEach(b=>{b.textContent=t('start')});if(active&&cur)renderCard(cur.step,cur.step.kind==='card'?0:Math.min(cur.i,TOTAL))});

/* ---------- Upfront permission primer (web only; native Android owns its OS prompts) ---------- */
const PERMS=[
 {id:'microphone',t:'micT',b:'micB',icon:'🎙',supported:()=>!!(navigator.mediaDevices?.getUserMedia)&&!!(window.SpeechRecognition||window.webkitSpeechRecognition),
  ask:async()=>{const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(tr=>tr.stop())}},
 {id:'geolocation',t:'locT',b:'locB',icon:'📍',supported:()=>!!navigator.geolocation,
  ask:()=>new Promise(res=>navigator.geolocation.getCurrentPosition(()=>res(),()=>res(),{enableHighAccuracy:false,timeout:15000,maximumAge:600000}))},
 {id:'notifications',t:'notifT',b:'notifB',icon:'🔔',supported:()=>'Notification'in window&&'serviceWorker'in navigator&&'PushManager'in window,
  ask:()=>Notification.requestPermission()}
];
async function state(p){
 try{if(p.id==='notifications'&&'Notification'in window){const v=Notification.permission;return v==='default'?'prompt':v}
  const q=await navigator.permissions?.query({name:p.id});return q?.state||'prompt'}catch(_){return'prompt'}
}
async function permissionPrimer(force){
 if(native())return false; // Android WebView: native MainActivity setup handles runtime permissions.
 const saved=load(PKEY);if(saved&&!force)return false;
 const list=[];for(const p of PERMS)if(p.supported())list.push([p,await state(p)]);
 if(!list.some(([,s])=>s==='prompt')){save(PKEY,{done:true,v:1});return false}
 return new Promise(resolve=>{
  ensureUi();active=false;
  const {root,blocks,ring,arrow,card}=ui;
  root.hidden=false;root.dataset.step='permissions';ring.hidden=true;arrow.hidden=true;
  blocks[0].style.cssText='left:0;top:0;width:100%;height:100%';blocks.slice(1).forEach(b=>b.style.cssText='display:none');
  document.documentElement.classList.add('ma-coach-active');
  card.textContent='';card.lang=lang();card.dir=lang().startsWith('ar')?'rtl':'ltr';card.dataset.step='permissions';
  const top=el('div','ma-coach-top');top.append(el('span','ma-coach-badge','MatchApp Ai'));card.append(top);
  const h=el('h2','ma-coach-title',t('permT'));h.id='ma-coach-title';card.append(h,el('p','ma-coach-body',t('permB')));
  const ul=el('ul','ma-coach-perms');const choice={};
  for(const [p,s] of list){
   const li=el('li','ma-coach-perm');li.dataset.permission=p.id;
   const txt=el('div','ma-coach-perm-copy');txt.append(el('strong','',p.icon+' '+t(p.t)),el('small','',t(p.b)));
   const acts=el('div','ma-coach-perm-actions');
   const status=el('span','ma-coach-perm-status');
   const setStatus=v=>{status.textContent=v==='granted'?t('granted'):v==='denied'?t('blocked'):'';li.dataset.state=v;acts.hidden=v!=='prompt';choice[p.id]=v};
   const allow=btn('ma-coach-primary ma-coach-small',t('allow'),async()=>{allow.disabled=true;try{await p.ask()}catch(_){}setStatus(await state(p))});
   const no=btn('ma-coach-ghost ma-coach-small',t('notNow'),()=>setStatus('later'));
   acts.append(no,allow);li.append(txt,acts,status);ul.append(li);setStatus(s);
  }
  card.append(ul);
  const row=el('div','ma-coach-actions');
  row.append(btn('ma-coach-primary',t('cont'),()=>{save(PKEY,{done:true,choice,v:1});root.hidden=true;document.documentElement.classList.remove('ma-coach-active');resolve(true)}));
  card.append(row);
  requestAnimationFrame(()=>{const cr=card.getBoundingClientRect();card.style.left=Math.max(12,(innerWidth-cr.width)/2)+'px';card.style.top=Math.max(12,(innerHeight-cr.height)/2)+'px'});
 });
}

/* ---------- Entry points ---------- */
async function start(opts){
 opts=opts||{};
 if(pageKind()!=='home'){location.href='/?tour=1';return}
 const s=load(KEY);
 await permissionPrimer(false);
 if(!opts.restart&&s&&s.status!=='done'&&s.status!=='skipped'&&s.i>0)return show(s.i);
 show(0);
}
// The existing How it works / How to use entry now launches the hands-on guide on Home.
document.addEventListener('click',e=>{
 const how=e.target.closest?.('.ma-how-button,.ma-cinema-help,[data-coach-start]');
 if(!how||pageKind()==='other'&&!how.hasAttribute('data-coach-start'))return;
 e.preventDefault();e.stopImmediatePropagation();
 const s=load(KEY);start({restart:!s||s.status==='done'||s.status==='skipped'});
},true);

function boot(){
 document.querySelectorAll('[data-coach-start]').forEach(b=>{b.textContent=t('start')});
 const s=load(KEY),q=new URLSearchParams(location.search);
 const forced=q.get('tour')==='1';
 // Automated browsers only see the guide when explicitly requested (keeps existing smoke tests stable).
 if(navigator.webdriver&&!forced&&!(s&&s.status==='active'))return;
 const kind=pageKind();
 if(kind==='home'){
  if(forced){start({restart:!s||s.status==='done'||s.status==='skipped'});return}
  if(!s){setTimeout(()=>{if(!document.querySelector('dialog[open],[aria-modal="true"]:not([hidden]):not(.ma-coach-card)'))start({restart:true})},3200);return}
  if(s.status==='active'&&s.i>0)setTimeout(()=>show(s.i),700);
 }else if((kind==='explore'||kind==='profile')&&s&&s.status==='active'&&s.i>0){
  setTimeout(()=>show(s.i),900);
 }
}
addEventListener('resize',()=>active&&layout(),{passive:true});
window.MatchAppCoach=Object.freeze({start,version:VERSION,permissions:()=>permissionPrimer(true),
 reset(){try{localStorage.removeItem(KEY);localStorage.removeItem(PKEY)}catch(_){}}});
if(document.readyState==='complete')boot();else addEventListener('load',boot,{once:true});
})();
