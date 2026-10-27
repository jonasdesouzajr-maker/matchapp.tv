/* Optional in-flow Android invitation, shown only after a useful result. */
(function(w,d){'use strict';const core=w.MatchAppGrowthCore,copy=w.MatchAppGrowthCopy;if(!core||!copy)return;
const DISMISS='matchapp_growth_install_dismissed_v1',shown=new Set(),handoffs=new Map();
function dismissed(){try{return Number(localStorage.getItem(DISMISS))>Date.now();}catch(_){return false;}}
function eligible(){try{return core.androidBrowser(w)&&!dismissed();}catch(_){return false;}}
function node(tag,text,cls){const n=d.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
function mount(container,context){
 if(!container||!eligible())return;
 const surface=context.campaign==='together_after_aha'?'together':'title';const exposure=surface+':'+w.location.pathname;if(!shown.has(exposure)){shown.add(exposure);core.track(w,'app_prompt_viewed',surface);}
 const box=node('section',null,'growth-install');box.dir=copy.lang()==='ar'?'rtl':'ltr';box.lang=copy.lang();
 const title=node('h3',copy.text('installTitle')),body=node('p',copy.text('installText')),actions=node('div',null,'growth-actions');
 const install=node('button',copy.text('installCTA'),'growth-button growth-primary'),stay=node('button',copy.text('stay'),'growth-button'),open=node('button',copy.text('openApp'),'growth-button growth-link'),status=node('p','');
 install.type=stay.type=open.type='button';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 let running=false,prepared=null,flight=null;
 function target(){
  if(typeof context.handoff!=='function'){
   const path=core.titlePath(context.path||w.location.pathname);if(!path)throw Error('invalid_context');
   return Promise.resolve({path,country:context.country||'',language:copy.lang()});
  }
  const key=context.contextKey;
  for(const [id,row]of handoffs)if(row.until<Date.now())handoffs.delete(id);
  if(key&&handoffs.has(key))return handoffs.get(key).promise;
  const promise=Promise.resolve().then(()=>context.handoff()).catch(error=>{if(key)handoffs.delete(key);throw error;});
  if(key){if(handoffs.size>=16)handoffs.delete(handoffs.keys().next().value);handoffs.set(key,{until:Date.now()+10*60*1000,promise});}return promise;
 }
 function prepare(){
  if(prepared)return Promise.resolve(prepared);if(flight)return flight;open.disabled=true;
  flight=Promise.resolve().then(target).then(value=>{core.appUrl(value);prepared=value;return value;}).finally(()=>{flight=null;open.disabled=false;});return flight;
 }
 async function store(){if(running)return;running=true;install.disabled=true;status.textContent='';status.setAttribute('data-ma-error',String(false));window.MatchAppErrors?.sync(status);
  try{const destination=await prepare();core.track(w,'app_store_clicked',surface);w.location.assign(core.playUrl(destination));}
  catch(_){status.textContent=copy.text('error');status.setAttribute('data-ma-error',String(true));window.MatchAppErrors?.sync(status);}finally{running=false;install.disabled=false;}
 }
 // Keep the app launch synchronous inside the explicit button gesture. Preparing
 // a read-only handoff never opens an app, emits analytics or exposes an auth token.
 open.addEventListener('click',()=>{
  if(!prepared){status.textContent=copy.text('working');status.setAttribute('data-ma-error',String(false));window.MatchAppErrors?.sync(status);prepare().then(()=>{status.textContent='';status.setAttribute('data-ma-error',String(false));window.MatchAppErrors?.sync(status);}).catch(()=>{status.textContent=copy.text('error');status.setAttribute('data-ma-error',String(true));window.MatchAppErrors?.sync(status);});return;}
  core.track(w,'open_app_clicked',surface);w.location.assign(core.androidIntent(prepared));
 });
 install.addEventListener('click',store);
 stay.addEventListener('click',()=>{core.track(w,'app_prompt_dismissed',surface);try{localStorage.setItem(DISMISS,String(Date.now()+7*24*60*60*1000));}catch(_){}box.remove();});
 actions.append(install,stay);box.append(title,body,actions,open,status);container.replaceChildren(box);
 prepare().catch(()=>{});
}
function mountTitles(){for(const slot of d.querySelectorAll('[data-growth-app-slot]')){
 const regions=[...d.querySelectorAll('[data-availability-state="available"]')];if(!regions.length)continue;
 const country=(slot.dataset.country||w.location.hash.match(/^#availability-([a-z]{2})$/)?.[1]||'').toUpperCase();mount(slot,{path:w.location.pathname,country});
}}
w.MatchAppGrowthInstall=Object.freeze({mount,eligible});
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mountTitles,{once:true});else mountTitles();
d.addEventListener('matchapp:langchange',mountTitles);
})(window,document);
