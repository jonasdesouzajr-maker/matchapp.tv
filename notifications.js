/* MatchApp unified notification center */
(function(){
'use strict';
if(window.__MATCHAPP_NOTIFICATIONS_V2)return;
window.__MATCHAPP_NOTIFICATIONS_V2=true;
const VAPID_PUBLIC='BKGucCWkS-YsS6g4HnM9DYTmm1Thj-PxxVkz9hM09tGs29uABDXQgYbnF0Zooi7AnHFv7KlbPSbPErE4J76MOZs';
let state={notifications:[],unread:0,preferences:{inApp:true,device:false,email:false,releases:true,purchases:true,friends:true,availability:true,suggestions:true,timezone:'UTC'},watches:[]};
let button=null,panel=null,poll=null,busy=false,markingRead=false;
const desktopHover=()=>!!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
const $=s=>document.querySelector(s);
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=()=>window.isUserLoggedIn===true;
async function rpc(action,payload={}){
  const sb=window.supabaseClient;if(!sb||!signed())throw new Error('Sign in required');
  const {data,error}=await sb.rpc('notifications_action',{p_action:action,p_payload:payload});
  if(error)throw error;return data||{};
}
function releaseSeenKey(v){return 'match_notification_release_seen_'+String(v||'');}
async function releaseItem(){
  try{
    const r=await fetch('/release.json',{cache:'no-store'});if(!r.ok)return null;
    const rel=await r.json();if(!rel?.version||!rel?.notes?.en)return null;
    if(state.preferences?.releases===false)return null;
    if(localStorage.getItem(releaseSeenKey(rel.version))==='1')return null;
    const lang=window.MATCH_LANG||'en';
    return {id:'release:'+rel.version,kind:'system',title:'MatchApp '+rel.version+' is live',body:rel.notes[lang]||rel.notes.en,href:'/updates.html',createdAt:rel.date||new Date().toISOString(),localRelease:true,version:rel.version};
  }catch(_){return null;}
}
function iconSvg(){
 return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M9.8 20a2.4 2.4 0 004.4 0"/></svg><span class="matchapp-notification-count" hidden></span>';
}
function mount(){
  if(button||!document.body||location.pathname.startsWith('/kids/'))return;
  const nav=document.querySelector('.app-header>nav, header>nav');
  button=document.querySelector('.matchapp-notification-button');
  if(!nav){
    button=document.createElement('button');button.type='button';button.className='matchapp-notification-button matchapp-notification-floating';button.setAttribute('aria-label','Notifications');button.setAttribute('aria-expanded','false');button.innerHTML=iconSvg();document.body.appendChild(button);
  }
  if(!button){button=document.createElement('button');button.type='button';button.className='matchapp-notification-button';button.setAttribute('aria-label','Notifications');button.setAttribute('aria-expanded','false');button.innerHTML=iconSvg();
    const before=document.getElementById('profile-link-tab')||document.getElementById('nav-reg-btn')||null;nav.insertBefore(button,before);
  }else if(!button.querySelector('svg')){button.innerHTML=iconSvg();}
  panel=document.createElement('aside');panel.className='matchapp-notification-panel';panel.hidden=true;panel.setAttribute('aria-label','Notifications');
  panel.innerHTML='<header><div><small>YOUR MATCHAPP</small><h2>Notifications</h2></div><button type="button" class="matchapp-notification-close" aria-label="Close">×</button></header><div class="matchapp-notification-toolbar"><button type="button" data-notify-read-all>Mark all read</button><a href="/updates.html">What’s new</a></div><div class="matchapp-notification-list"></div><details class="matchapp-notification-settings"><summary>Notification settings</summary><div class="matchapp-notification-prefs"></div></details>';
  document.body.appendChild(panel);
  button.addEventListener('click',()=>toggle());
  button.addEventListener('pointerenter',()=>{if(desktopHover()&&state.unread>0)void markAllRead();});
  panel.querySelector('.matchapp-notification-close').addEventListener('click',()=>close());
  panel.querySelector('[data-notify-read-all]').addEventListener('click',()=>{void markAllRead();});
  document.addEventListener('click',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!button.contains(e.target))close();});
  render();
}
function open(){if(!panel)return;panel.hidden=false;button?.setAttribute('aria-expanded','true');render();}
function close(){if(!panel)return;panel.hidden=true;button?.setAttribute('aria-expanded','false');}
function toggle(){panel?.hidden?open():close();}
function categoryEnabled(kind){
 if(kind==='purchase')return state.preferences.purchases!==false;
 if(kind==='friend_request'||kind==='match_together')return state.preferences.friends!==false;
 if(kind==='availability')return state.preferences.availability!==false;
 if(kind==='system')return state.preferences.releases!==false;
 if(kind==='suggestion')return state.preferences.suggestions!==false;
 return true;
}
function fmt(date){try{return new Intl.DateTimeFormat(window.MATCH_LANG||'en',{dateStyle:'medium',timeStyle:'short'}).format(new Date(date));}catch(_){return'';}}

function currentTimezone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch(_){return'UTC';}}
function suggestionHref(item){
 const title=String(item?.payload?.title||'').trim();
 return title?'/discover.html?title='+encodeURIComponent(title)+'&focus=start&source=taste-dna':(item?.href||'/discover.html');
}
function isExpiredSuggestion(item){
 return item?.kind==='suggestion'&&!item?.clickedAt&&item?.expiresAt&&new Date(item.expiresAt).getTime()<=Date.now();
}
function localReleaseMark(item){if(item?.localRelease&&item.version)try{localStorage.setItem(releaseSeenKey(item.version),'1')}catch(_){}}
function localReleaseMarkAll(){state.notifications.filter(n=>n.localRelease).forEach(localReleaseMark);}
async function markAllRead(){
 if(markingRead||state.unread<=0)return;
 markingRead=true;
 const previous=state.notifications;
 const now=new Date().toISOString();
 // Clear the visual unread state immediately. Server truth is reconciled below.
 localReleaseMarkAll();
 state.notifications=(state.notifications||[]).map(item=>
   item.localRelease||item.readAt?item:{...item,readAt:now}
 );
 render();
 try{
   if(signed()){
     const data=await rpc('read_all',{});
     state={...state,...data};
   }
 }catch(_){
   // If persistence fails, restore the previous local state and refresh from server.
   state.notifications=previous;
   try{await refresh();}catch(__){render();}
   window.showToast?.('Could not mark notifications as read right now.',true);
 }finally{
   markingRead=false;
   render();
 }
}
async function clickItem(item){
 localReleaseMark(item);
 if(!item.localRelease&&signed()){
   try{await change('clicked',{id:item.id},false);}catch(_){}
 }
 const href=item?.kind==='suggestion'?suggestionHref(item):item.href;
 if(href)location.href=href;else render();
}
async function deleteItem(item){
 if(!item)return;
 if(item.localRelease){
   localReleaseMark(item);
   state.notifications=(state.notifications||[]).filter(n=>n!==item);
   render();
   return;
 }
 const previous=state.notifications;
 state.notifications=(state.notifications||[]).filter(n=>String(n?.id)!==String(item.id));
 render();
 if(!signed())return;
 try{
   const data=await rpc('delete',{id:item.id});
   state={...state,...data};
 }catch(_){
   state.notifications=previous;
   window.showToast?.('Could not remove that notification right now.',true);
 }
 render();
}
function render(){
 if(!button||!panel)return;
 const visible=(state.notifications||[]).filter(n=>categoryEnabled(n.kind)&&!isExpiredSuggestion(n));
 const unread=visible.filter(n=>!n.readAt&&!n.localRelease).length+visible.filter(n=>n.localRelease&&localStorage.getItem(releaseSeenKey(n.version))!=='1').length;
 state.unread=unread;
 const count=button.querySelector('.matchapp-notification-count');
 count.hidden=unread===0;count.textContent=unread>99?'99+':String(unread||'');
 button.classList.toggle('has-notification',unread>0);
 button.setAttribute('aria-label',unread?`Notifications, ${unread} unread`:'Notifications');
 const list=panel.querySelector('.matchapp-notification-list');list.replaceChildren();
 if(!visible.length){const empty=document.createElement('p');empty.className='matchapp-notification-empty';empty.textContent=signed()?'You’re all caught up.':'Sign in to follow titles, purchases and Match Together invitations.';list.appendChild(empty);}
 visible.forEach(item=>{
   const row=document.createElement('article');
   row.className='matchapp-notification-item'+((!item.readAt&&!item.localRelease)||item.localRelease&&localStorage.getItem(releaseSeenKey(item.version))!=='1'?' is-unread':'')+(item.kind==='suggestion'?' is-suggestion':'');
   const openBtn=document.createElement('button');openBtn.type='button';openBtn.className='matchapp-notification-open';
   const icons={availability:'▶',purchase:'✓',friend_request:'♡',match_together:'✦',system:'★',account:'●',suggestion:'✦'};
   const poster=String(item?.payload?.posterUrl||'');
   const media=item.kind==='suggestion'&&/^https:\/\//i.test(poster)
     ?'<img class="matchapp-notification-poster" src="'+esc(poster)+'" alt="'+esc(String(item?.payload?.title||item.title||'Suggested title'))+'" loading="lazy" decoding="async">'
     :'<span class="matchapp-notification-kind">'+(icons[item.kind]||'●')+'</span>';
   const taste=item.kind==='suggestion'?'<small class="matchapp-notification-taste">Taste DNA · today</small>':'';
   openBtn.innerHTML=media+'<span class="matchapp-notification-copy">'+taste+'<strong>'+esc(item.title)+'</strong><span>'+esc(item.body)+'</span><small>'+esc(fmt(item.createdAt))+'</small></span>';
   openBtn.addEventListener('click',()=>clickItem(item));
   const trash=document.createElement('button');trash.type='button';trash.className='matchapp-notification-delete';trash.setAttribute('aria-label','Remove notification');
   trash.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/></svg>';
   trash.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();void deleteItem(item);});
   row.append(openBtn,trash);list.appendChild(row);
   row.querySelector('.matchapp-notification-poster')?.addEventListener('error',e=>{e.currentTarget.style.display='none';});
 });
 renderPrefs();
}
function prefRow(label,key,checked,disabled=false){
 return '<label><span>'+esc(label)+'</span><input type="checkbox" data-notify-pref="'+key+'" '+(checked?'checked ':'')+(disabled?'disabled ':'')+'></label>';
}
async function authEmail(){
 try{const {data:{user}}=await window.supabaseClient.auth.getUser();return user?.email||'';}catch(_){return'';}
}
function renderPrefs(){
 const host=panel?.querySelector('.matchapp-notification-prefs');if(!host)return;
 const p=state.preferences||{};
 host.innerHTML='<p class="matchapp-notification-help">Choose what appears here and which optional delivery channels MatchApp may use.</p>'+
   prefRow('App & feature updates','releases',p.releases!==false)+
   prefRow('Purchases & account changes','purchases',p.purchases!==false)+
   prefRow('Friends & Match Together','friends',p.friends!==false)+
   prefRow('Streaming availability I follow','availability',p.availability!==false)+
   prefRow('Two daily Taste DNA suggestions','suggestions',p.suggestions!==false)+
   '<div class="matchapp-notification-delivery"><button type="button" data-enable-device>'+(p.device?'✓ Device notifications enabled':'Enable device notifications')+'</button><button type="button" data-enable-email>'+(p.email?'✓ Email notifications enabled':'Enable email notifications')+'</button><small>Device and email alerts are optional. In-app notifications stay available here.</small></div>';
 host.querySelectorAll('[data-notify-pref]').forEach(input=>input.addEventListener('change',()=>savePrefs({[input.dataset.notifyPref]:input.checked})));
 host.querySelector('[data-enable-device]')?.addEventListener('click',enableDevice);
 host.querySelector('[data-enable-email]')?.addEventListener('click',enableEmail);
}
async function savePrefs(patch){
 if(!signed()){window.openAuthModal?.();return false;}
 try{await change('preferences',patch);return true}catch(_){window.showToast?.('Notification preference could not be saved.',true);return false;}
}
function b64(bytes){let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function vapidBytes(base64){const p='='.repeat((4-base64.length%4)%4),raw=atob((base64+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));}
async function enableDevice(){
 if(!signed()){window.openAuthModal?.();return;}
 if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window)){window.showToast?.('Device notifications are not supported in this browser.',true);return;}
 try{
   const permission=await Notification.requestPermission();
   if(permission!=='granted'){window.showToast?.('Device notification permission was not granted.');return;}
   const reg=await navigator.serviceWorker.ready;
   let sub=await reg.pushManager.getSubscription();
   if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(VAPID_PUBLIC)});
   const key=sub.getKey('p256dh'),auth=sub.getKey('auth');
   if(!key||!auth)throw new Error('Missing push keys');
   await change('push_subscription',{endpoint:sub.endpoint,p256dh:b64(key),auth:b64(auth)});
   window.showToast?.('🔔 Device notifications enabled.');
 }catch(e){window.showToast?.('Could not enable device notifications on this device.',true);}
}
async function enableEmail(){
 if(!signed()){window.openAuthModal?.();return;}
 const email=await authEmail();if(!email){window.showToast?.('No verified account email is available.',true);return;}
 const ok=confirm('Allow MatchApp to email notification alerts to '+email+'? You can turn this off here later.');
 if(!ok)return;
 if(await savePrefs({email:true}))window.showToast?.('Email notification permission saved.');
}
async function change(action,payload,rerender=true){
 const data=await rpc(action,payload);state={...state,...data};if(rerender)render();return data;
}
async function refresh(){
 mount();
 let server={notifications:[],unread:0,preferences:state.preferences,watches:[]};
 if(signed()){
   try{
     server=await rpc('list',{});
     const tz=currentTimezone();
     if(tz&&server?.preferences?.timezone!==tz){
       server=await rpc('preferences',{timezone:tz});
     }
   }catch(_){}
 }
 state={...state,...server};
 const release=await releaseItem();
 if(release){
   const already=(state.notifications||[]).some(n=>String(n?.payload?.version||'')===String(release.version));
   if(!already)state.notifications=[release,...(state.notifications||[])];
 }
 render();
}
async function followTitle(meta,region){
 if(!signed()){window.openAuthModal?.();window.showToast?.('Sign in to follow this title.');return false;}
 const id=Number(meta?.tmdb_id),kind=String(meta?.media_kind||'');
 if(!Number.isSafeInteger(id)||!['movie','tv'].includes(kind))return false;
 const code=String(region||window.MatchAppCatalogMedia?.regionCode?.()||'').toUpperCase();
 try{
   await change('follow_title',{tmdbId:id,kind,title:String(meta.title||''),year:String(meta.year||''),region:code});
   window.showToast?.('🔔 We’ll watch for streaming availability in '+(window.MatchAppCatalogMedia?.countryName?.(code)||code)+'.');
   open();
   setTimeout(()=>panel?.querySelector('.matchapp-notification-settings')?.setAttribute('open',''),120);
   return true;
 }catch(_){window.showToast?.('Could not follow this title right now.',true);return false;}
}
function authChanged(){refresh();if(poll)clearInterval(poll);poll=setInterval(()=>{if(!document.hidden)refresh();},60000);}
window.MatchNotifications={refresh,open,close,followTitle,enableDevice,savePrefs,markAllRead,deleteItem};
document.addEventListener('matchapp:authchange',authChanged);
document.addEventListener('matchapp:tastechange',()=>{if(signed())void refresh();});
document.addEventListener('matchapp:historychange',()=>{if(signed())void refresh();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mount();setTimeout(refresh,800);});else{mount();setTimeout(refresh,800);}
})();
