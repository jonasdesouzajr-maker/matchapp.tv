/* User-initiated sharing; no social posting, tracking or recommendation changes. */
(function(){
  'use strict';
  const button=document.querySelector('[data-radar-share]');
  if(!button)return;
  const status=document.querySelector('[data-radar-share-status]');
  const canonical=document.querySelector('link[rel="canonical"]');
  const url=canonical?canonical.href+'#radar':location.href;
  if(!navigator.share&&!navigator.clipboard?.writeText){button.hidden=true;return;}
  button.addEventListener('click',async()=>{
    if(button.disabled)return;
    button.disabled=true;
    if(status)status.textContent='';
    try{
      if(navigator.share){await navigator.share({title:document.title,text:button.dataset.shareText,url});return;}
      await navigator.clipboard.writeText(url);
      if(status)status.textContent=button.dataset.shareDone;
    }catch(error){
      // Cancellation is normal. If sharing is unavailable, expose a selectable
      // canonical link instead of reporting that anything was copied or sent.
      if(error.name!=='AbortError'&&status){const link=document.createElement('a');link.href=url;link.textContent=url;status.append(link);}
    }finally{button.disabled=false;}
  });
})();
