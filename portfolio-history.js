(function(){
  'use strict';
  const safeLink = value => {try {const u=new URL(value,location.origin);return u.protocol==='https:' || (u.origin===location.origin) ? u.href : '#';}catch(_){return '#';}};
  const cleanTitle = value => {
    const raw=String(value||'').trim();
    if(!raw) return '';
    const text=(typeof window.sanitizeDisplayText==='function')?window.sanitizeDisplayText(raw,['title']):raw;
    if(!text || /^\s*[{\[]/.test(text) || /"[a-zA-Z_]+"\s*:/.test(text)) return '';
    return text;
  };
  function confirmHistoryRemoval(label,returnFocus){
    return new Promise(resolve=>{
      const overlay=document.createElement('div');
      overlay.className='ma-confirm-overlay';
      overlay.setAttribute('role','presentation');

      const dialog=document.createElement('div');
      dialog.className='ma-confirm-dialog';
      dialog.setAttribute('role','alertdialog');
      dialog.setAttribute('aria-modal','true');
      dialog.setAttribute('aria-labelledby','ma-confirm-title');
      dialog.setAttribute('aria-describedby','ma-confirm-copy');

      const title=document.createElement('h2');
      title.id='ma-confirm-title';
      title.textContent='Remove from history?';

      const copy=document.createElement('p');
      copy.id='ma-confirm-copy';
      copy.textContent='Remove “'+String(label||'this title')+'” from your private MatchApp history?';

      const actions=document.createElement('div');
      actions.className='ma-confirm-actions';
      const cancel=document.createElement('button');
      cancel.type='button';
      cancel.className='ma-confirm-cancel';
      cancel.textContent='Cancel';
      const remove=document.createElement('button');
      remove.type='button';
      remove.className='ma-confirm-danger';
      remove.textContent='Remove';

      actions.append(cancel,remove);
      dialog.append(title,copy,actions);
      overlay.append(dialog);
      document.body.append(overlay);

      let settled=false;
      const finish=value=>{
        if(settled)return;
        settled=true;
        document.removeEventListener('keydown',onKey,true);
        overlay.remove();
        try{returnFocus?.focus?.({preventScroll:true});}catch(_){}
        resolve(value);
      };
      const onKey=event=>{
        if(event.key==='Escape'){event.preventDefault();finish(false);return;}
        if(event.key!=='Tab')return;
        const focusable=[cancel,remove];
        const index=focusable.indexOf(document.activeElement);
        const next=event.shiftKey?(index<=0?focusable.length-1:index-1):(index===focusable.length-1?0:index+1);
        event.preventDefault();
        focusable[next].focus();
      };
      cancel.addEventListener('click',()=>finish(false));
      remove.addEventListener('click',()=>finish(true));
      overlay.addEventListener('click',event=>{if(event.target===overlay)finish(false);});
      document.addEventListener('keydown',onKey,true);
      cancel.focus({preventScroll:true});
    });
  }

  function cardFor(i){
    const card=document.createElement('article');card.className='profile-history-card';
    const img=document.createElement('img');img.width=66;img.height=99;img.className='profile-history-poster';img.alt=i.title||'';img.loading='lazy';
    const fallback=()=>{if(typeof generateLocalPosterSVG==='function')img.src=generateLocalPosterSVG(i.title||'MatchApp',{synopsis:i.reason});};
    img.onerror=()=>{img.onerror=null;fallback();};if(i.posterUrl)img.src=safeLink(i.posterUrl);else fallback();
    const body=document.createElement('div');body.className='profile-history-copy';
    const title=document.createElement('h3'),note=document.createElement('p'),actions=document.createElement('div');actions.className='profile-history-actions';
    title.textContent=i.title||i.detail||'Untitled';
    const labels={save:'Watch later',seen:'Seen',like:'Loved it',loved:'Loved it',dislike:'Not for me',rated:'Rated',shown:'Matched',ai:'Ask AI',match:'Matched'};
    note.textContent=labels[i.action] || labels[i.type] || 'In your history';
    if(i.reason)note.textContent+=' · '+i.reason;
    const link=document.createElement('a');link.textContent='Find where to watch';link.href=safeLink(i.streamUrl || 'https://www.google.com/search?q='+encodeURIComponent((i.title||'')+' where to watch'));link.target='_blank';link.rel='noopener noreferrer';
    const remove=document.createElement('button');remove.type='button';remove.className='history-forget-btn';remove.setAttribute('aria-label','Remove '+(i.title||'')+' from history');remove.title='Remove from history';remove.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg><span>Remove</span>';
    remove.addEventListener('click',async()=>{if(remove.disabled)return;const ok=await confirmHistoryRemoval(i.title||i.detail,remove);if(!ok)return;remove.disabled=true;
      if(i.ts) window.MatchActivity?.removeAt?.(i.ts);
      if(i.title){const success=window.MatchAudit?.forgetEverywhere?await window.MatchAudit.forgetEverywhere(i.title):await window.matchPolicy?.forget?.(i.title);if(success===false){remove.disabled=false;window.showToast?.('Could not update your history. Please try again.',true);return;}}
      window.showToast?.('Removed from your private history.');render();
    });
    actions.append(link,remove);body.append(title,note,actions);card.append(img,body);return card;
  }
  function render(){
    const host=document.getElementById('history-list');if(!host)return;
    host.replaceChildren();
    const records=window.matchPolicy?.history() || [];
    const activity=(window.MatchActivity?.all?.()||[]).filter(e=>e && (e.type==='match'||e.type==='ai'||e.type==='save'||e.type==='seen'));
    const seen=new Set();
    const merged=[];
    const push=item=>{
      const title=cleanTitle(item.title||item.detail);
      if(!title)return;
      const key=title.toLowerCase();
      if(seen.has(key))return;
      seen.add(key);
      merged.push({...item,title});
    };
    records.forEach(push);
    activity.forEach(e=>push({title:e.detail,action:e.type,type:e.type,ts:e.ts,reason:e.type==='ai'?'Ask AI':'',posterUrl:e.meta?.posterUrl||'',addedAt:e.ts}));
    merged.sort((a,b)=>(Number(b.addedAt||b.ts||0)-Number(a.addedAt||a.ts||0)));
    const count=document.getElementById('count-history');
    if(count) count.textContent=String(merged.length);
    if(!merged.length){host.innerHTML='<div class="history-empty"><strong>Your private history is clear.</strong><span>Matches, Ask AI titles, saves and seen titles stay here until you remove them.</span></div>';return;}
    merged.forEach(i=>host.append(cardFor(i)));
  }
  function init(){
    render();
    const query=new URLSearchParams(location.search);
    const tab=query.get('tab')||'history';
    window.switchPortfolioTab?.(tab);
    if(query.get('rematch')==='1'){
      const host=document.getElementById('history-rematch');
      if(host){host.innerHTML='<p>This title is saved to history. Ready for a rematch?</p><a class="portfolio-tab" href="/?rematch=same#questionnaire-box">Same criteria</a> <a class="portfolio-tab" href="/?rematch=new#questionnaire-box">New criteria</a>';}
    }
  }
  document.addEventListener('matchapp:historychange',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
