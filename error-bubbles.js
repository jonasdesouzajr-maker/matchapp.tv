/* Shared, in-flow error notices. No message text or user data enters diagnostics. */
(function(){'use strict';
if(window.MatchAppErrors)return;
const CLOSE={en:'Close message',pt:'Fechar mensagem',es:'Cerrar mensaje',fr:'Fermer le message',de:'Meldung schließen',it:'Chiudi messaggio',tr:'Mesajı kapat',ru:'Закрыть сообщение',ar:'إغلاق الرسالة',hi:'संदेश बंद करें',id:'Tutup pesan',ja:'メッセージを閉じる',ko:'메시지 닫기',zh:'关闭消息'};
const RETRY={en:'Something went wrong. Please try again.',pt:'Algo deu errado. Tente novamente.',es:'Algo salió mal. Inténtalo de nuevo.',fr:'Une erreur est survenue. Réessayez.',de:'Etwas ist schiefgelaufen. Bitte versuche es erneut.',it:'Qualcosa è andato storto. Riprova.',tr:'Bir sorun oluştu. Lütfen tekrar deneyin.',ru:'Произошла ошибка. Попробуйте ещё раз.',ar:'حدث خطأ. يرجى المحاولة مرة أخرى.',hi:'कुछ गलत हुआ। कृपया फिर से कोशिश करें।',id:'Terjadi kesalahan. Silakan coba lagi.',ja:'エラーが発生しました。もう一度お試しください。',ko:'오류가 발생했습니다. 다시 시도해 주세요.',zh:'出现错误。请重试。'};
const CODES=new Set(['ui-error','runtime-error','unhandled-rejection','match-recovery','kids-quota','kids-history','kids-service']);
const sent=new Set();let total=0;
const decorations=new WeakMap();
function language(){return String(window.MATCH_LANG||document.documentElement.lang||'en').toLowerCase().split('-')[0]}
function kids(){return location.pathname.startsWith('/kids/')||document.documentElement.classList.contains('kids-mode')}
function page(){const p=location.pathname;return kids()?'kids':p.startsWith('/ebooks')?'reading':p.includes('discover')?'chat':p.includes('profile')?'profile':p.includes('explore')?'explore':p==='/'||p==='/index.html'?'home':'other'}
function report(code){
 if(!CODES.has(code)||sent.has(code)||total>=5)return;
 // Preview/fixture errors never enter the production queue.
 if(!['matchapp.tv','www.matchapp.tv'].includes(location.hostname))return;
 if(typeof window.fetch!=='function')return;
 sent.add(code);total++;
 const width=window.visualViewport?.width||innerWidth;
 const data={p_code:code,p_surface:kids()?'kids':/MatchAppAiAndroid/i.test(navigator.userAgent)?'android':'web',p_page:page(),p_viewport:width<480?'phone':width<1024?'tablet':'desktop'};
 // Never send error text, stacks, URLs, identifiers, prompts or storage contents.
 try{window.fetch('https://zkymvqrmbabngsqblyye.supabase.co/rest/v1/rpc/record_ui_error_20261027',{
   method:'POST',credentials:'omit',referrerPolicy:'no-referrer',keepalive:true,
   // Existing public anonymous key; never attach a signed-in session or token.
   headers:{'Content-Type':'application/json',apikey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreW12cXJtYmFibmdzcWJseXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDUyNDIsImV4cCI6MjEwMjM4MTI0Mn0._yEVFMfwVU6GBqQ8m3ljfOgA0HSLEDiKMOfYae6ZD8Q',Authorization:'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreW12cXJtYmFibmdzcWJseXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDUyNDIsImV4cCI6MjEwMjM4MTI0Mn0._yEVFMfwVU6GBqQ8m3ljfOgA0HSLEDiKMOfYae6ZD8Q'},
   body:JSON.stringify(data)
 }).then(async response=>({error:!response.ok,data:response.ok?await response.json():false})).then(result=>{
   document.dispatchEvent(new CustomEvent('matchapp:error-report-status',{detail:{code,accepted:!result?.error&&result?.data===true}}));
 }).catch(()=>{});}catch(_){}
}
function style(){
 if(document.getElementById('ma-error-bubble-style'))return;
 const s=document.createElement('style');s.id='ma-error-bubble-style';s.textContent=`
 .ma-error-bubble{position:static!important;display:grid!important;grid-template-columns:minmax(0,1fr) 44px!important;align-items:start!important;gap:8px!important;box-sizing:border-box!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:12px 0!important;padding:12px!important;border:1px solid var(--gold,#d7b775)!important;border-radius:16px!important;background:#211c2c!important;color:#f4d7a4!important;font:inherit!important;line-height:1.5!important;text-align:start!important;transform:none!important;animation:none!important;overflow:visible!important;scroll-margin-block:160px 120px}
 .ma-error-bubble>.ma-error-copy{display:block!important;min-width:0!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;font:inherit!important;line-height:inherit!important}
 .ma-error-bubble>.ma-error-copy>strong{display:block}
 .ma-error-bubble>button.ma-error-close{position:static!important;display:grid!important;place-items:center!important;box-sizing:border-box!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;margin:0!important;padding:0!important;flex:none!important;border:1px solid currentColor!important;border-radius:50%!important;background:rgba(146,111,214,.18)!important;color:inherit!important;font:700 24px/1 sans-serif!important;cursor:pointer!important;transform:none!important;pointer-events:auto!important}
 .ma-error-close:focus-visible{outline:3px solid currentColor!important;outline-offset:2px!important}
 .kids-mode .ma-error-bubble,.page-kids .ma-error-bubble{background:#201943!important;color:#fff5c9!important;border-color:#bba7ef!important}
 #ma-error-notice{max-width:720px!important;margin-inline:auto!important}
 `;document.head.appendChild(s);
}
function decorate(node,opts={}){
 if(!node)return null;style();
 const prior=node.querySelector(':scope > .ma-error-close');if(prior)return node;
 const previous=decorations.get(node);
 previous?.observer.disconnect();
 const originalRole=previous?previous.originalRole:node.getAttribute('role');
 const restoreRole=()=>{if(originalRole)node.setAttribute('role',originalRole);else node.removeAttribute('role');};
 const copy=document.createElement('span');copy.className='ma-error-copy';
 while(node.firstChild)copy.appendChild(node.firstChild);
 const close=document.createElement('button');close.type='button';close.className='ma-error-close';close.textContent='×';close.setAttribute('aria-label',CLOSE[language()]||CLOSE.en);
 node.classList.add('ma-error-bubble');node.setAttribute('role','alert');node.append(copy,close);
 const clear=()=>{observer.disconnect();if(decorations.get(node)?.close!==close)return;decorations.delete(node);node.classList.remove('ma-error-bubble');restoreRole();};
 close.addEventListener('click',()=>{clear();node.removeAttribute('data-ma-error');if(opts.onClose)opts.onClose();else{node.replaceChildren();if(node.id==='ma-error-notice')node.remove();}});
 if(opts.code)report(opts.code);
 // Existing owners may replace a status with progress/success. Remove only our decoration.
 const observer=new MutationObserver(()=>{if(!node.contains(close))clear();});
 decorations.set(node,{observer,originalRole,close,clear,copy});
 observer.observe(node,{childList:true});
 return node;
}
function show(message,opts={}){
 document.getElementById('ma-error-notice')?.remove();
 const n=document.createElement('div');n.id='ma-error-notice';
 if(opts.heading){const strong=document.createElement('strong');strong.textContent=opts.heading;n.append(strong);}
 n.append(document.createTextNode(String(message||RETRY[language()]||RETRY.en)));
 const active=document.activeElement;
 const container=opts.container||active?.closest?.('dialog[open],form')||document.querySelector('main')||document.body;
 n.style.gridColumn='1 / -1';
 container.prepend(n);decorate(n,{code:opts.code||'ui-error'});
 try{n.scrollIntoView({block:'nearest',behavior:'auto'});}catch(_){}
 return n;
}
// Owners mark semantic error state explicitly. Never infer failures from message
// text, colors, input contents or authentication state. The marker also survives
// a delayed shared-script load without changing the owner's retry behavior.
function sync(node){
 if(node.getAttribute('data-ma-error')==='true'&&node.textContent.trim())decorate(node,{code:'ui-error'});
 else{const old=decorations.get(node);if(old){old.clear();if(node.contains(old.close)){old.close.remove();old.copy.replaceWith(...old.copy.childNodes);}}}
}
window.MatchAppErrors=Object.freeze({show,decorate,report,sync});
document.querySelectorAll('[data-ma-error]').forEach(sync);
new MutationObserver(records=>{for(const record of records)sync(record.target);}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['data-ma-error']});
if(!window.showToast)window.showToast=(text,isError)=>{if(isError)show(text)};
document.addEventListener('matchapp:kids-ai-error',e=>{
 const node=document.getElementById('kids-answer');
 if(node&&node.textContent)decorate(node,{code:e.detail?.code==='quota-error'?'kids-quota':null});
});
// Third-party media/ad failures must not announce that the app itself failed.
window.addEventListener('error',e=>{
 if(!(e instanceof ErrorEvent)||!e.message||!e.filename)return;
 try{if(new URL(e.filename,location.href).origin!==location.origin)return;}catch(_){return;}
 show(RETRY[language()]||RETRY.en,{code:'runtime-error'});
});
window.addEventListener('unhandledrejection',e=>{
 if(!String(e.reason?.stack||'').includes(location.origin+'/'))return;
 show(RETRY[language()]||RETRY.en,{code:'unhandled-rejection'});
});
document.addEventListener('matchapp:langchange',()=>document.querySelectorAll('.ma-error-close').forEach(b=>b.setAttribute('aria-label',CLOSE[language()]||CLOSE.en)));
})();
