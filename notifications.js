/* MatchApp unified notification center */
(function(){
'use strict';
if(window.__MATCHAPP_NOTIFICATIONS_V2)return;
window.__MATCHAPP_NOTIFICATIONS_V2=true;
const VAPID_PUBLIC='BKGucCWkS-YsS6g4HnM9DYTmm1Thj-PxxVkz9hM09tGs29uABDXQgYbnF0Zooi7AnHFv7KlbPSbPErE4J76MOZs';
let state={notifications:[],unread:0,preferences:{inApp:true,device:false,email:false,releases:true,purchases:true,friends:true,availability:true,suggestions:true,timezone:'UTC'},watches:[]};
let button=null,panel=null,poll=null,busy=false,markingRead=false,deletingAll=false,localItems=[];
let notificationAudio=null,notificationSoundUnlocked=false,knownUnreadKeys=null,arrivalPulseTimer=null;
const desktopHover=()=>!!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
const $=s=>document.querySelector(s);
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=()=>window.isUserLoggedIn===true;
function notificationKey(item){return String(item?.id||item?.localKey||item?.version||'');}
function visibleNotifications(){
  return (state.notifications||[]).filter(n=>categoryEnabled(n.kind)&&!isExpiredSuggestion(n));
}
function unreadKeys(){
  return new Set(visibleNotifications().filter(n=>(n.localRelease||n.localKey)?!localSeen(n):!n.readAt).map(notificationKey).filter(Boolean));
}
function notificationSoundAllowed(){
  try{return localStorage.getItem('match_soundEnabled')!=='false';}catch(_){return true;}
}
function unlockNotificationSound(){
  if(notificationSoundUnlocked)return;
  const AudioContextCtor=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextCtor)return;
  try{
    notificationAudio=notificationAudio||new AudioContextCtor();
    const resumed=notificationAudio.state==='suspended'?notificationAudio.resume():Promise.resolve();
    Promise.resolve(resumed).then(()=>{notificationSoundUnlocked=notificationAudio?.state==='running';}).catch(()=>{});
  }catch(_){}
}
function playNotificationSound(){
  if(!notificationSoundAllowed()||document.hidden||!notificationSoundUnlocked||!notificationAudio||notificationAudio.state!=='running')return false;
  try{
    const ctx=notificationAudio,now=ctx.currentTime,master=ctx.createGain();
    master.gain.setValueAtTime(.0001,now);
    master.gain.exponentialRampToValueAtTime(.115,now+.018);
    master.gain.exponentialRampToValueAtTime(.0001,now+.92);
    master.connect(ctx.destination);
    [
      [783.99,0,.42,'sine',.72],
      [1174.66,.075,.5,'sine',.55],
      [1567.98,.16,.58,'triangle',.24]
    ].forEach(([freq,delay,duration,type,level])=>{
      const osc=ctx.createOscillator(),gain=ctx.createGain(),start=now+delay,end=start+duration;
      osc.type=type;osc.frequency.setValueAtTime(freq,start);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(level,start+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,end);
      osc.connect(gain);gain.connect(master);osc.start(start);osc.stop(end+.02);
    });
    return true;
  }catch(_){return false;}
}
function signalNotificationArrival(){
  if(button){
    button.classList.remove('notification-arrived');
    void button.offsetWidth;
    button.classList.add('notification-arrived');
    if(arrivalPulseTimer)clearTimeout(arrivalPulseTimer);
    arrivalPulseTimer=setTimeout(()=>button?.classList.remove('notification-arrived'),1250);
  }
  playNotificationSound();
  try{if(!document.hidden&&typeof navigator.vibrate==='function')navigator.vibrate([45,35,80]);}catch(_){}
}
function syncArrivalSignal(){
  if(knownUnreadKeys===null)return;
  const next=unreadKeys();
  const added=[...next].some(key=>!knownUnreadKeys.has(key));
  knownUnreadKeys=next;
  if(added)signalNotificationArrival();
}
async function rpc(action,payload={}){
  const sb=window.supabaseClient;if(!sb||!signed())throw new Error('Sign in required');
  const {data,error}=await sb.rpc('notifications_action',{p_action:action,p_payload:payload});
  if(error)throw error;return data||{};
}
function releaseSeenKey(v){return 'match_notification_release_seen_'+String(v||'');}
function localSeenKey(item){
  if(item?.localKey)return 'match_notification_local_seen_'+String(item.localKey);
  if(item?.localRelease&&item.version)return releaseSeenKey(item.version);
  return '';
}
function localSeen(item){const key=localSeenKey(item);if(!key)return false;try{return localStorage.getItem(key)==='1'}catch(_){return false}}
function localMark(item){const key=localSeenKey(item);if(!key)return;try{localStorage.setItem(key,'1')}catch(_){}}
function localMarkAll(){(state.notifications||[]).filter(n=>n.localRelease||n.localKey).forEach(localMark);}
async function releaseItem(){
  try{
    const r=await fetch('/release.json',{cache:'no-store'});if(!r.ok)return null;
    const rel=await r.json();if(!rel?.version||!rel?.notes?.en)return null;
    if(state.preferences?.releases===false)return null;
    if(localStorage.getItem(releaseSeenKey(rel.version))==='1')return null;
    const lang=window.MATCH_LANG||'en';
    return {id:'release:'+rel.version,kind:'system',title:rel.title?.[lang]||rel.title?.en||('MatchApp '+rel.version+' is live'),body:rel.notes[lang]||rel.notes.en,href:String(rel.href||'/updates.html'),createdAt:rel.date||new Date().toISOString(),localRelease:true,version:rel.version};
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
  panel.innerHTML='<header><div><small>YOUR MATCHAPP</small><h2>Notifications</h2></div><button type="button" class="matchapp-notification-close" aria-label="Close">×</button></header><div class="matchapp-notification-toolbar"><button type="button" data-notify-read-all>Mark all read</button><button type="button" data-notify-delete-all>Delete all</button><a href="/updates.html">What’s new</a></div><div class="matchapp-notification-list"></div><details class="matchapp-notification-settings"><summary>Notification settings</summary><div class="matchapp-notification-prefs"></div></details>';
  document.body.appendChild(panel);
  button.addEventListener('click',()=>toggle());
  button.addEventListener('pointerenter',()=>{if(desktopHover()&&state.unread>0)void markAllRead();});
  panel.querySelector('.matchapp-notification-close').addEventListener('click',()=>close());
  panel.querySelector('[data-notify-read-all]').addEventListener('click',()=>{void markAllRead();});
  panel.querySelector('[data-notify-delete-all]').addEventListener('click',()=>{void deleteAll();});
  document.addEventListener('click',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!button.contains(e.target))close();});
  document.addEventListener('pointerdown',unlockNotificationSound,{once:true,capture:true});
  document.addEventListener('keydown',unlockNotificationSound,{once:true,capture:true});
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
async function markAllRead(){
 if(markingRead||state.unread<=0)return;
 markingRead=true;
 const previous=state.notifications;
 const now=new Date().toISOString();
 // Clear the visual unread state immediately. Server truth is reconciled below.
 localMarkAll();
 state.notifications=(state.notifications||[]).map(item=>
   item.localRelease||item.localKey||item.readAt?item:{...item,readAt:now}
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
 localMark(item);
 if(item?.action==='install'){
   render();
   if(typeof window.installMatchApp==='function')window.installMatchApp();
   return;
 }
 if(!item.localRelease&&!item.localKey&&signed()){
   try{await change('clicked',{id:item.id},false);}catch(_){}
 }
 const href=item?.kind==='suggestion'?suggestionHref(item):item.href;
 if(href)location.href=href;else render();
}
async function deleteItem(item){
 if(!item)return;
 if(item.localRelease||item.localKey){
   localMark(item);
   localItems=localItems.filter(n=>String(n?.id)!==String(item.id));
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
async function deleteAll(){
 if(deletingAll)return false;
 const current=state.notifications||[];
 if(!current.length)return false;
 const ok=window.confirm?.('Delete all notifications? This cannot be undone.');
 if(ok===false)return false;
 deletingAll=true;
 const previousNotifications=current.slice();
 const previousLocalItems=localItems.slice();
 localMarkAll();
 localItems=[];
 state.notifications=[];
 render();
 try{
   if(signed()){
     const sb=window.supabaseClient;
     if(!sb)throw new Error('Notification service unavailable');
     const {error}=await sb.rpc('notifications_delete_all');
     if(error)throw error;
   }
   knownUnreadKeys=new Set();
   window.showToast?.('Notifications deleted.');
   return true;
 }catch(_){
   localItems=previousLocalItems;
   state.notifications=previousNotifications;
   try{await refresh();}catch(__){render();}
   window.showToast?.('Could not delete all notifications right now.',true);
   return false;
 }finally{
   deletingAll=false;
   render();
 }
}
function render(){
 if(!button||!panel)return;
 const visible=visibleNotifications();
 const unread=visible.filter(n=>(n.localRelease||n.localKey)?!localSeen(n):!n.readAt).length;
 state.unread=unread;
 const count=button.querySelector('.matchapp-notification-count');
 count.hidden=unread===0;count.textContent=unread>99?'99+':String(unread||'');
 button.classList.toggle('has-notification',unread>0);
 button.setAttribute('aria-label',unread?`Notifications, ${unread} unread`:'Notifications');
 const readAll=panel.querySelector('[data-notify-read-all]');if(readAll)readAll.disabled=unread===0||markingRead;
 const deleteAllButton=panel.querySelector('[data-notify-delete-all]');if(deleteAllButton)deleteAllButton.disabled=visible.length===0||deletingAll;
 syncArrivalSignal();
 const list=panel.querySelector('.matchapp-notification-list');list.replaceChildren();
 if(!visible.length){const empty=document.createElement('p');empty.className='matchapp-notification-empty';empty.textContent=signed()?'You’re all caught up.':'Sign in to follow titles, purchases and Match Together invitations.';list.appendChild(empty);}
 visible.forEach(item=>{
   const row=document.createElement('article');
   row.className='matchapp-notification-item'+(((item.localRelease||item.localKey)?!localSeen(item):!item.readAt)?' is-unread':'')+(item.kind==='suggestion'?' is-suggestion':'');
   const openBtn=document.createElement('button');openBtn.type='button';openBtn.className='matchapp-notification-open';
   const icons={availability:'▶',purchase:'✓',friend_request:'♡',match_together:'✦',system:'★',account:'●',suggestion:'✦',install:'↓'};
   const poster=String(item?.payload?.posterUrl||'');
   const media=item.kind==='suggestion'&&/^https:\/\//i.test(poster)
     ?'<img class="matchapp-notification-poster" src="'+esc(poster)+'" alt="'+esc(String(item?.payload?.title||item.title||'Suggested title'))+'" loading="lazy" decoding="async">'
     :'<span class="matchapp-notification-kind">'+(icons[item.kind]||'●')+'</span>';
   const taste=item.kind==='suggestion'?'<small class="matchapp-notification-taste">Taste DNA · today</small>':'';
   const body=item.kind==='suggestion'?String(item.body||'').slice(0,280):String(item.body||'');
   openBtn.innerHTML=media+'<span class="matchapp-notification-copy">'+taste+'<strong>'+esc(item.title)+'</strong><span>'+esc(body)+'</span><small>'+esc(fmt(item.createdAt))+'</small></span>';
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
 const queuedLocal=localItems.filter(item=>!localSeen(item));
 if(queuedLocal.length){
   const ids=new Set(queuedLocal.map(item=>String(item.id)));
   state.notifications=[...queuedLocal,...(state.notifications||[]).filter(item=>!ids.has(String(item?.id)))];
 }
 const release=await releaseItem();
 if(release){
   const already=(state.notifications||[]).some(n=>String(n?.payload?.version||'')===String(release.version));
   if(!already)state.notifications=[release,...(state.notifications||[])];
 }
 render();
 if(knownUnreadKeys===null)knownUnreadKeys=unreadKeys();
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
function pushLocal(item){
 if(!item||!item.id||!item.localKey)return false;
 if(localSeen(item))return false;
 const next={kind:'system',createdAt:new Date().toISOString(),...item,localOnly:true};
 const existing=localItems.findIndex(n=>String(n?.id)===String(next.id));
 if(existing>=0)localItems[existing]=next;else localItems.unshift(next);
 const ids=new Set(localItems.map(n=>String(n.id)));
 state.notifications=[...localItems.filter(n=>!localSeen(n)),...(state.notifications||[]).filter(n=>!ids.has(String(n?.id)))];
 render();
 return true;
}
function authChanged(){knownUnreadKeys=null;refresh();if(poll)clearInterval(poll);poll=setInterval(()=>{if(!document.hidden)refresh();},60000);}
window.MatchNotifications={refresh,open,close,followTitle,enableDevice,savePrefs,markAllRead,deleteItem,deleteAll,pushLocal,playNotificationSound};
document.addEventListener('matchapp:authchange',authChanged);
document.addEventListener('matchapp:tastechange',()=>{if(signed())void refresh();});
document.addEventListener('matchapp:historychange',()=>{if(signed())void refresh();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mount();setTimeout(refresh,800);});else{mount();setTimeout(refresh,800);}
})();
