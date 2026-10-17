/* Preserve only a deliberate Together save/create operation across the existing OAuth return route. */
(function(w,d){'use strict';
if(!/^\/(?:index\.html)?$/.test(w.location.pathname))return;
const KEY='matchapp_growth_pending_v1',CONTEXT='matchapp_growth_context_v1';let running=false;
function read(){try{return JSON.parse(sessionStorage.getItem(KEY)||localStorage.getItem(KEY)||'null');}catch(_){return null;}}
async function check(){
 if(running||d.hidden)return;const pending=read();
 if(!pending||pending.expiresAt<Date.now()||!['save','create'].includes(pending.action)||!pending.context||!['host','invite','resume'].includes(pending.context.kind))return;
 if(pending.context.token&&!/^[a-f0-9]{64}$/.test(pending.context.token))return;
 const sb=w.supabaseClient;if(!sb?.auth)return;running=true;
 try{
  const {data,error}=await sb.auth.getUser();if(error||!data?.user||data.user.is_anonymous)return;
  // No authentication tokens, external destinations or account IDs are copied.
  sessionStorage.setItem(CONTEXT,JSON.stringify(pending.context));
  w.location.replace('/together.html');
 }catch(_){}finally{running=false;}
}
d.addEventListener('matchapp:authchange',check);
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',()=>setTimeout(check,300),{once:true});else setTimeout(check,300);
})(window,document);
