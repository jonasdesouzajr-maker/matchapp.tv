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
    remove.addEventListener('click',async()=>{if(remove.disabled)return;const ok=window.confirm?window.confirm('Remove “'+(i.title||i.detail)+'” from your history?'):true;if(!ok)return;remove.disabled=true;
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
