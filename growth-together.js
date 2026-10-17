/* Quick pair flow. Existing ?s= group sessions remain owned by together.js. */
(function(w,d){'use strict';
const bootstrap=w.MatchAppGrowthContext,core=w.MatchAppGrowthCore,copy=w.MatchAppGrowthCopy;
if(!bootstrap||bootstrap.classic||!core||!copy)return;
const root=d.getElementById('growth-root');if(!root)return;
const MOODS=['funny','intense and thrilling','cozy comfort watch','mind-bending','romantic','any'];
const CATS=['movie','series','any'],TIMES=[30,60,120,0],RATINGS=['all ages family friendly','tween PG','teen PG-13'];
const COUNTRIES=['BR','US','GB','PT','CA','AU','JP','KR','IN','DE','FR','ES','IT','TR','ID','MX','AR','CL','CO','PE','RU','CN','SA','AE','ZA','NZ','NL','BE','IE','AT','CH','SE','DK','NO','FI','PL','CZ','GR','IL','TH','MY','SG','PH','VN','TW','HK','EG'];
const PROVIDERS=['Netflix','Amazon Prime Video','Disney Plus','HBO Max','Apple TV Plus','Paramount Plus','Hulu','Globoplay','Peacock','Crunchyroll'];
const PENDING='matchapp_growth_pending_v1',TTL=24*60*60*1000;
let model=bootstrap.state||{kind:'host',expiresAt:Date.now()+TTL};
model.prefs=Object.assign({cat:'any',mood:'any',rating:RATINGS[0],country:initialCountry(),providers:[],maxMinutes:0,includeRentals:false,viewingMode:'shared'},model.prefs||{});
let view=model.result&&core.resultValid(model.result)?'result':model.status==='waiting'?'waiting':model.kind==='host'?'intro':model.kind==='resume'?'loading':'invite';
let step=Number.isInteger(model.step)&&model.step>=1&&model.step<=3?model.step:1;
let busy=false,gate=false,errorKey='',pollTimer=null,pollDeadline=0,request=null,generation=0,accepted=false,saved=false,inviteUrl='';
const text=copy.text;
function initialCountry(){try{const explicit=new URLSearchParams(w.location.search).get('country');if(COUNTRIES.includes(explicit))return explicit;const saved=w.localStorage.getItem('match_user_region')||w.localStorage.getItem('match_user_country');if(COUNTRIES.includes(saved))return saved;if(saved&&w.MatchAppCatalogMedia?.regionCode){const resolved=w.MatchAppCatalogMedia.regionCode();if(COUNTRIES.includes(resolved))return resolved;}return '';}catch(_){return '';}}
function node(tag,label,cls){const n=d.createElement(tag);if(label!==undefined)n.textContent=label;if(cls)n.className=cls;return n;}
function button(label,fn,primary=false){const b=node('button',label,primary?'growth-primary':'');b.type='button';b.disabled=busy;b.addEventListener('click',fn);return b;}
function paragraph(label,cls){return node('p',label,cls);}
function link(label,href,cls){const a=node('a',label,cls);a.href=href;return a;}
function actions(...buttons){const box=node('div',undefined,'growth-actions');box.append(...buttons);return box;}
function persist(){model.step=step;bootstrap.state=model;bootstrap.store(model);}
function announce(label){const n=d.getElementById('growth-announcement');if(n)n.textContent=label;}
function event(name){
 // A privacy-safe local event hook; no analytics SDK, identifier or capability is sent.
 d.dispatchEvent(new CustomEvent('matchapp:growth',{detail:{event:name,surface:'together'}}));
 core.track(w,name,'together');
}
function alignStep(){requestAnimationFrame(()=>{root.querySelector('.growth-panel')?.scrollIntoView?.({block:'start',behavior:'auto'});root.querySelector('h1,h2')?.focus({preventScroll:true});});}
function show(next,focus=true){view=next;render();if(focus)alignStep();}
function noteError(code){errorKey=/expired/.test(code)?'expired':/already_joined/.test(code)?'used':/sign_in_required|different_viewer_required/.test(code)?'needAccount':/limit|try_later/.test(code)?'limitReached':'error';}
function countryLabel(country){try{return new Intl.DisplayNames([copy.lang()],{type:'region'}).of(country)||country;}catch(_){return country;}}
function date(value){try{return new Intl.DateTimeFormat(copy.lang(),{dateStyle:'medium',timeStyle:'long'}).format(new Date(value));}catch(_){return '';}}
function exclusions(){const all=[];for(const key of ['match_savedList','match_dislikedList']){try{const rows=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(rows))for(const item of rows)if(typeof(item?.title||item)==='string')all.push(item.title||item);}catch(_){}}return Array.from(new Set(all)).slice(0,1000);}
async function registeredUser(){try{const sb=w.supabaseClient;if(!sb)return null;const {data,error}=await sb.auth.getUser();return !error&&data?.user&&!data.user.is_anonymous?data.user:null;}catch(_){return null;}}
async function api(action,extra={}){
 const sb=w.supabaseClient;if(!sb)throw Error('service_unavailable');
 const publicKey=typeof SUPABASE_ANON_KEY==='string'?SUPABASE_ANON_KEY:sb.supabaseKey;
 const base=typeof SUPABASE_URL==='string'?SUPABASE_URL:sb.supabaseUrl;
 if(typeof base!=='string'||!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base)||!publicKey)throw Error('service_unavailable');
 const controller=new AbortController();request=controller;const timer=setTimeout(()=>controller.abort(),15000);
 try{
  const {data}=await sb.auth.getSession();const headers={'Content-Type':'application/json',apikey:publicKey};
  if(data?.session?.access_token)headers.Authorization='Bearer '+data.session.access_token;
  const body={action,token:model.token,...(model.guestKey?{guestKey:model.guestKey}:{}),...extra};
  const response=await fetch(base+'/functions/v1/growth-together',{method:'POST',headers,body:JSON.stringify(body),signal:controller.signal,referrerPolicy:'no-referrer'});
  const answer=await response.json();if(!response.ok||!answer?.ok)throw Error(String(answer?.error||'service_unavailable'));
  return answer;
 }finally{clearTimeout(timer);if(request===controller)request=null;}
}
async function perform(fn){if(busy)return;busy=true;errorKey='';render();try{await fn();}catch(e){noteError(e?.message||'');}finally{busy=false;render();}}
function rememberPending(action){persist();const pending={action,context:model,expiresAt:Date.now()+TTL};try{sessionStorage.setItem(PENDING,JSON.stringify(pending));localStorage.setItem(PENDING,JSON.stringify(pending));}catch(_){}}
function clearPending(){try{sessionStorage.removeItem(PENDING);localStorage.removeItem(PENDING);}catch(_){}}
function askSignIn(action){rememberPending(action);model.pending=action;persist();gate=true;render();}
function signIn(){rememberPending(model.pending||'save');if(typeof w.openAuthModal==='function')w.openAuthModal();else w.location.assign('/register.html');}
function expireTimer(){if(pollTimer)clearTimeout(pollTimer);pollTimer=null;}
function armPoll(){
 expireTimer();if(!pollDeadline)pollDeadline=Date.now()+5*60*1000;
 if(d.hidden||Date.now()>pollDeadline||!['waiting','resolving','ready'].includes(model.status))return;
 pollTimer=setTimeout(async()=>{
  if(busy){armPoll();return;}
  try{const answer=await api('status');apply(answer);if(['ready','resolving'].includes(answer.status)){const resolved=await api('resolve');apply(resolved);}}
  catch(e){noteError(e?.message||'');render();return;}
  armPoll();
 },4000);
}
function apply(answer){
 const previousView=view;
 if(answer.role)model.role=answer.role;if(answer.viewerRole)model.role=answer.viewerRole;
 if(answer.expiresAt)model.expiresAt=Math.min(Date.now()+TTL,Date.parse(answer.expiresAt)||Date.now()+TTL);
 if(answer.status)model.status=answer.status;
 if(answer.result){if(!core.resultValid(answer.result))throw Error('invalid_result');model.result=answer.result;model.status='matched';model.readOnly=answer.readOnly===true;view='result';expireTimer();event('shared_result_revealed');}
 else if(['no_match','unavailable'].includes(answer.status)){view='no_match';expireTimer();}
 else view='waiting';persist();render();if(previousView!==view&&['result','no_match'].includes(view))alignStep();
}
function begin(){step=1;model.step=1;view='quiz';persist();event('quiz_started');show('quiz');}
async function submit(){
 if(!COUNTRIES.includes(model.prefs.country)){step=3;show('quiz');root.querySelector('select:not(.growth-language)')?.focus();return;}
 await perform(async()=>{
  if(model.kind==='host'){
   const user=await registeredUser();if(!user){askSignIn('create');return;}
   if(!model.token)model.token=core.randomToken(w.crypto);
   model.role='host';persist();
   const answer=await api('create',{prefs:model.prefs,exclusions:exclusions(),name:model.name||text('friend')});
   model.status=answer.status;clearPending();delete model.pending;gate=false;apply(answer.status==='matched'?await api('status'):answer);
   inviteUrl=w.location.origin+'/together.html#invite='+model.token;pollDeadline=0;armPoll();event('invite_created');
  }else{
   if(!model.guestKey)model.guestKey=core.randomToken(w.crypto);persist();
   const answer=await api(model.joined?'update':'join',{prefs:model.prefs,exclusions:exclusions()});model.joined=true;model.role='guest';apply(answer);armPoll();event('quiz_completed');
  }
 });
}
async function share(native){
 inviteUrl=w.location.origin+'/together.html#invite='+model.token;
 try{if(native&&navigator.share){await navigator.share({title:'MatchApp Ai',text:text('subtitle'),url:inviteUrl});return;}if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(inviteUrl);announce(text('copied'));return;}throw Error('clipboard_unavailable');}
 catch(e){if(e?.name==='AbortError')return;const input=d.getElementById('growth-invite-link');if(input){input.value=inviteUrl;input.hidden=false;input.focus();input.select();}}
}
async function save(){
 await perform(async()=>{
  if(!model.result)return;const user=await registeredUser();if(!user){askSignIn('save');return;}
  const result=model.result,own=result.viewing.find(x=>x.role==='shared'||x.role===(model.role||'guest'))||result.viewing[0];
  const item={title:result.title,action:'save',posterUrl:core.poster(result.posterUrl),streamUrl:core.safeSource(own.sourceUrl,result.tmdbId,result.kind,own.country),addedAt:Date.now()};
  const {error}=await w.supabaseClient.rpc('portfolio_action',{p_action:'remember',p_payload:{items:[item]}});if(error)throw Error('service_unavailable');
  try{w.matchPolicy?.remember(item,'save');}catch(_){}
  saved=true;gate=false;delete model.pending;clearPending();persist();event('shared_match_saved');
 });
}
function newInvite(){
 const prefs={...model.prefs};model={kind:'host',prefs,expiresAt:Date.now()+TTL};step=1;gate=false;saved=false;accepted=false;errorKey='';expireTimer();persist();show('quiz');
}
function field(label,value,options,change){const wrapper=node('div');const id='growth-field-'+label.replace(/\s/g,'').slice(0,20);const title=node('label',label);title.htmlFor=id;const select=node('select');select.id=id;for(const [val,name]of options){const option=node('option',name);option.value=val;select.append(option);}select.value=String(value);select.disabled=busy;select.addEventListener('change',()=>{change(select.value);persist();});wrapper.append(title,select);return wrapper;}
function choices(values,labels,key,onChoose){const grid=node('div',undefined,'growth-grid');values.forEach((value,i)=>{const b=button(labels[i],()=>{model.prefs[key]=value;persist();if(onChoose)onChoose();else render();});b.classList.add('growth-choice');b.setAttribute('aria-pressed',String(model.prefs[key]===value));grid.append(b);});return grid;}
function heading(title){const h=node('h1',title);h.tabIndex=-1;return h;}
function render(){
 const turn=++generation;root.replaceChildren();root.dir=copy.lang()==='ar'?'rtl':'ltr';root.lang=copy.lang();
 const live=node('p','', 'growth-subtle');live.id='growth-announcement';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
 const toolbar=node('div',undefined,'growth-toolbar');toolbar.append(paragraph('MatchApp Ai','growth-eyebrow'));
 const language=node('select');language.className='growth-language';language.setAttribute('aria-label',copy.get().language);
 const languageNames={en:'English','pt-BR':'Português (Brasil)',es:'Español',fr:'Français',de:'Deutsch',it:'Italiano',tr:'Türkçe',ru:'Русский',ar:'العربية',hi:'हिन्दी',id:'Bahasa Indonesia',ja:'日本語',ko:'한국어',zh:'中文'};
 for(const [value,name]of Object.entries(languageNames)){const option=node('option',name);option.value=value;language.append(option);}language.value=copy.lang();
 language.addEventListener('change',()=>{if(typeof w.setLanguage==='function')w.setLanguage(language.value);});toolbar.append(language);root.append(toolbar);
 const panel=node('section',undefined,'growth-panel');root.append(panel);
 if(view==='intro'||view==='invite'){
  panel.append(heading(view==='invite'&&model.hostName?text('inviteTitle',{name:model.hostName}):text('title')),paragraph(view==='invite'?text('inviteDesc'):text('subtitle')),paragraph(text('noAccount'),'growth-subtle'));
  if(!bootstrap.invalid)panel.append(actions(button(text('start'),begin,true)));
 }else if(view==='loading')panel.append(heading(text('working')));
 else if(view==='quiz'){
  panel.append(paragraph(text('step',{step}),'growth-eyebrow'));const progress=node('div',undefined,'growth-progress');progress.setAttribute('aria-hidden','true');for(let i=1;i<=3;i++){const bar=node('span');bar.dataset.done=String(i<=step);progress.append(bar);}panel.append(progress);
  const strings=copy.get();
  if(step===1){panel.append(heading(text('vibe')),paragraph(text('vibeHelp')),choices(MOODS,strings.moods,'mood',()=>{step=2;persist();show('quiz');}));}
  if(step===2){panel.append(heading(text('format')),choices(CATS,strings.formats,'cat'),node('h3',text('time')),choices(TIMES,strings.times,'maxMinutes'),field(text('rating'),model.prefs.rating,RATINGS.map((v,i)=>[v,strings.ratings[i]]),v=>model.prefs.rating=v));}
  if(step===3){
   panel.append(heading(text('services')));
   const sharedGuest=model.kind==='invite'&&model.hostMode==='shared';
   if(sharedGuest){panel.append(paragraph(text('sharedNote')),paragraph(text('hostOptions')+': '+countryLabel(model.hostCountry||model.prefs.country)));}
   else{
    panel.append(field(text('country'),model.prefs.country,[['',text('country')],...COUNTRIES.map(c=>[c,countryLabel(c)]).sort((a,b)=>a[1].localeCompare(b[1],copy.lang()))],v=>{model.prefs.country=v;persist();render();}));
    panel.append(node('h3',text('providers')));const grid=node('div',undefined,'growth-grid');
    PROVIDERS.forEach(provider=>{const b=button(provider,()=>{const list=model.prefs.providers;model.prefs.providers=list.includes(provider)?list.filter(p=>p!==provider):[...list,provider];persist();render();});b.classList.add('growth-choice');b.setAttribute('aria-pressed',String(model.prefs.providers.includes(provider)));grid.append(b);});panel.append(grid);
    const unsure=button(text('unsure'),()=>{model.prefs.providers=[];persist();render();});unsure.setAttribute('aria-pressed',String(!model.prefs.providers.length));panel.append(unsure);
    const check=node('label',undefined,'growth-check'),input=node('input');input.type='checkbox';input.checked=model.prefs.includeRentals;input.disabled=busy;input.addEventListener('change',()=>{model.prefs.includeRentals=input.checked;persist();});check.append(input,node('span',text('rentals')));panel.append(check);
   }
   if(model.kind==='host'){
    panel.append(node('h3',text('screen')),choices(['shared','separate'],[text('shared'),text('separate')],'viewingMode'));
    const label=node('label',text('name'));label.htmlFor='growth-name';const input=node('input');input.id='growth-name';input.type='text';input.maxLength=40;input.autocomplete='given-name';input.value=model.name||'';input.disabled=busy;input.addEventListener('input',()=>{model.name=input.value;persist();});panel.append(label,input);
   }
  }
  panel.append(actions(button(text('back'),()=>{if(step>1)step--;else view=model.kind==='host'?'intro':'invite';persist();show(view);}),step<3?button(text('next'),()=>{step++;persist();show('quiz');},true):button(text(model.kind==='host'?'create':'find'),submit,true)));
 }else if(view==='waiting'){
  panel.append(heading(text(model.kind==='host'?'waiting':'working')));
  if(model.kind==='host'){
   panel.append(paragraph(text('waitingHelp')),actions(button(text('copy'),()=>share(false),true),button(text('share'),()=>share(true))));
   const input=node('input');input.id='growth-invite-link';input.type='text';input.readOnly=true;input.hidden=true;input.setAttribute('aria-label',text('copy'));panel.append(input);
  }
  panel.append(actions(button(text('retry'),()=>perform(async()=>{const answer=await api(model.kind==='host'?'status':'resolve');apply(answer);pollDeadline=0;armPoll();}))));
 }else if(view==='no_match'){
  panel.append(heading(text('review')),paragraph(text('noMatch')),actions(button(text('edit'),()=>{step=1;show('quiz');},true),button(text('retry'),()=>perform(async()=>apply(await api('resolve'))))));
 }else if(view==='result')renderResult(panel,turn);
 if(errorKey||bootstrap.invalid){const box=node('p',text(bootstrap.invalid?'expired':errorKey),'growth-status growth-error');box.setAttribute('role','alert');panel.append(box);}
 if(busy)panel.append(paragraph(text('working'),'growth-status'));
 if(gate){
  const box=node('section',undefined,'growth-panel');box.id='growth-save-gate';box.append(node('h2',text(model.pending==='create'?'needAccount':'gate')),paragraph(text(model.pending==='create'?'noAccount':'gateHelp')),actions(button(text('signin'),signIn,true),button(text(model.pending==='create'?'cancel':'skip'),()=>{gate=false;delete model.pending;clearPending();persist();render();})));
  root.append(box);
 }
 root.append(live,paragraph(text('privacy'),'growth-subtle'));const nav=node('nav',undefined,'growth-links');nav.append(link(text('home'),'/'),link(text('classic'),'/together.html?mode=classic'));root.append(nav);
}
function renderResult(panel,turn){
 const result=model.result;if(!core.resultValid(result)){panel.append(heading(text('error')));return;}
 panel.append(paragraph(text('result'),'growth-eyebrow'));
 const posterWrap=node('div',undefined,'growth-poster-wrap');const imageUrl=core.poster(result.posterUrl);
 if(imageUrl){const image=node('img',undefined,'growth-poster');image.src=imageUrl;image.alt=result.title;image.width=300;image.height=450;image.decoding='async';image.addEventListener('error',()=>posterWrap.replaceChildren(paragraph(text('unknownPoster'))),{once:true});posterWrap.append(image);}else posterWrap.append(paragraph(text('unknownPoster')));
 panel.append(posterWrap,heading(result.title));
 const meta=node('div',undefined,'growth-meta');if(result.year)meta.append(node('span',String(result.year)));if(result.runtime){let minutes='';try{minutes=new Intl.NumberFormat(copy.lang(),{style:'unit',unit:'minute',unitDisplay:'long'}).format(result.runtime);}catch(_){minutes=String(result.runtime);}meta.append(node('span',minutes));}if(result.contentRating)meta.append(node('span',result.contentRating));panel.append(meta);
 if(result.synopsis){
  const synopsis=paragraph(result.synopsis),sourceLabel=paragraph(text('sourceSynopsis'),'growth-subtle');panel.append(sourceLabel,synopsis);
  const translate=w.localizeVerifiedSynopsis||w.localizeMatchSynopsis;
  if(copy.lang()!==(result.sourceLanguage||'en')&&typeof translate==='function'){
   const target=copy.lang();Promise.resolve(translate(result.synopsis,result.sourceLanguage||'en',target,{title:result.title,year:result.year,kind:result.kind})).then(value=>{if(turn===generation&&target===copy.lang()&&typeof value==='string'&&value.trim()&&value!==result.synopsis){synopsis.textContent=value;sourceLabel.hidden=true;}}).catch(()=>{});
  }else sourceLabel.hidden=copy.lang()===(result.sourceLanguage||'en');
 }
 panel.append(paragraph(text('reason')));if(model.readOnly)panel.append(paragraph(text('readOnly'),'growth-subtle'));
 const ordered=[...result.viewing].sort((a,b)=>Number(b.role===model.role)-Number(a.role===model.role));
 for(const viewing of ordered){
  const box=node('section',undefined,'growth-panel');box.append(node('h3',(viewing.role==='shared'?text('shared'):viewing.role===model.role?text('you'):text('friend'))+' · '+countryLabel(viewing.country)));
  const providers=node('ul',undefined,'growth-provider-list');const access=['subscription','rental','purchase','free','free_with_ads'];for(const option of viewing.offers)providers.append(node('li',option.provider+' · '+copy.get().access[access.indexOf(option.access)]));
  const source=link(text('options'),core.safeSource(viewing.sourceUrl,result.tmdbId,result.kind,viewing.country),'growth-button growth-primary');source.target='_blank';source.rel='noopener noreferrer';source.addEventListener('click',()=>event('viewing_options_selected'));
  box.append(providers,source,paragraph(text('checked')+': '+date(viewing.checkedAt),'growth-subtle'),paragraph(text('source'),'growth-subtle'));panel.append(box);
 }
 if(Array.isArray(result.cast)&&result.cast.length){const names=result.cast.map(x=>typeof x==='string'?x:x?.name).filter(Boolean).slice(0,8);if(names.length)panel.append(paragraph(names.join(' · '),'growth-subtle'));}
 panel.append(actions(button(text(saved?'saved':'save'),save,true),button(text(accepted?'thanks':'accept'),()=>{accepted=true;event('shared_match_accepted');render();})));
 panel.append(actions(button(text('another'),newInvite)));
 if(!gate&&w.MatchAppGrowthInstall){const slot=node('div');slot.id='growth-result-install';panel.append(slot);w.MatchAppGrowthInstall.mount(slot,{campaign:'together_after_aha',contextKey:model.kind+':'+model.token+':'+copy.lang(),handoff:async()=>{if(model.kind==='resume'&&core.TOKEN.test(model.token))return {resume:model.token,language:copy.lang()};const response=await api('handoff',{language:copy.lang()});if(!core.TOKEN.test(response.resumeToken))throw Error('invalid_context');return {resume:response.resumeToken,language:copy.lang()};}});}
}
async function restorePending(){
 if(busy)return;let pending=null;try{pending=JSON.parse(sessionStorage.getItem(PENDING)||localStorage.getItem(PENDING)||'null');}catch(_){}
 if(!pending||pending.expiresAt<Date.now()||!['save','create'].includes(pending.action))return;
 const user=await registeredUser();if(!user)return;
 if(pending.context?.token!==model.token||pending.context?.kind!==model.kind)return;
 model.pending=pending.action;
 if(pending.action==='save'&&model.result)await save();else if(pending.action==='create'&&model.kind==='host')await submit();
}
async function initialize(){
 if(bootstrap.invalid){view='invite';render();return;}
 // Restore only this user-initiated, unexpired operation after the existing OAuth flow.
 try{const pending=JSON.parse(sessionStorage.getItem(PENDING)||localStorage.getItem(PENDING)||'null');if(!bootstrap.state&&pending?.expiresAt>Date.now()&&pending.context){model=pending.context;model.prefs=model.prefs||{};step=model.step||3;view=model.result?'result':'quiz';persist();}}catch(_){}
 render();
 if(model.kind==='resume'&&model.token){await perform(async()=>{const answer=await api('resume');model.role=answer.viewerRole||'guest';apply(answer);});}
 else if(model.kind==='invite'&&model.token){
  await perform(async()=>{
   const preview=await api('preview');model.hostName=preview.hostName;model.hostMode=preview.viewingMode;model.hostCountry=preview.viewingCountry;
   if(model.hostMode==='shared'&&COUNTRIES.includes(model.hostCountry))model.prefs.country=model.hostCountry;
   if(preview.joined&&model.guestKey){const state=await api('status');apply(state);armPoll();}
   else if(preview.joined){noteError('already_joined');view='invite';}
   else view=model.result?'result':'invite';persist();
  });
 }else if(model.status==='waiting'&&model.token){pollDeadline=0;armPoll();}
 await restorePending();
}
d.addEventListener('matchapp:langchange',()=>render());
d.addEventListener('matchapp:authchange',()=>{restorePending().catch(()=>{});});
d.addEventListener('visibilitychange',()=>{if(d.hidden)expireTimer();else armPoll();});
w.addEventListener('pagehide',()=>{expireTimer();request?.abort();persist();});
w.MatchAppGrowthTogether=Object.freeze({start:begin,retry:()=>perform(async()=>apply(await api('resolve')))});
initialize().catch(()=>{errorKey='error';render();});
})(window,document);
