(function(){
  'use strict';
  const safeLink = value => {try {const u=new URL(value,location.origin);return u.protocol==='https:' || (u.origin===location.origin) ? u.href : '#';}catch(_){return '#';}};
  function render(){
    const host=document.getElementById('history-list');if(!host)return;
    host.replaceChildren();
    const records=window.matchPolicy?.history() || [];
    if(!records.length){host.innerHTML='<div class="history-empty"><strong>Your private match history is clear.</strong><span>Saved, seen, loved and declined titles will appear here and sync to your account.</span></div>';return;}
    records.forEach(i=>{
      const card=document.createElement('article');card.className='profile-history-card';
      const img=document.createElement('img');img.width=66;img.height=99;img.className='profile-history-poster';img.alt=i.title;img.loading='lazy';
      const fallback=()=>{if(typeof generateLocalPosterSVG==='function')img.src=generateLocalPosterSVG(i.title,{synopsis:i.reason});};
      img.onerror=()=>{img.onerror=null;fallback();};if(i.posterUrl)img.src=safeLink(i.posterUrl);else fallback();
      const body=document.createElement('div');body.className='profile-history-copy';
      const title=document.createElement('h3'),note=document.createElement('p'),actions=document.createElement('div');actions.className='profile-history-actions';
      title.textContent=i.title;note.textContent=({save:'Watch later',seen:'Seen',like:'Loved it',loved:'Loved it',dislike:'Not for me',rated:'Rated',shown:'Matched'})[i.action] || 'In your history';
      if(i.reason)note.textContent+=' · '+i.reason;
      const link=document.createElement('a');link.textContent='Find where to watch';link.href=safeLink(i.streamUrl || 'https://www.google.com/search?q='+encodeURIComponent(i.title+' where to watch'));link.target='_blank';link.rel='noopener noreferrer';
      const remove=document.createElement('button');remove.type='button';remove.className='history-forget-btn';remove.setAttribute('aria-label','Remove '+i.title+' from profile history and allow it in future matches');remove.title='Remove from profile history and allow again';remove.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg><span>Remove & allow again</span>';
      remove.addEventListener('click',async()=>{if(remove.disabled)return;const ok=window.confirm?window.confirm('Remove “'+i.title+'” from your MatchApp history and allow it to be recommended again?'):true;if(!ok)return;remove.disabled=true;const success=window.MatchAudit?.forgetEverywhere?await window.MatchAudit.forgetEverywhere(i.title):await window.matchPolicy?.forget?.(i.title);if(success!==false){window.showToast?.('Removed from your private history. This title can be matched again.');render();}else{remove.disabled=false;window.showToast?.('Could not update your history. Please try again.',true);}});
      actions.append(link,remove);body.append(title,note,actions);card.append(img,body);host.append(card);
    });
  }
  function init(){
    render();const query=new URLSearchParams(location.search);
    if(query.get('tab')==='history')window.switchPortfolioTab?.('history');
    if(query.get('rematch')==='1'){
      const host=document.getElementById('history-rematch');
      if(host){host.innerHTML='<p>This title is saved to history and will never be suggested again. Ready for a rematch?</p><a class="portfolio-tab" href="/?rematch=same#questionnaire-box">Same criteria</a> <a class="portfolio-tab" href="/?rematch=new#questionnaire-box">New criteria</a>';}
    }
  }
  document.addEventListener('matchapp:historychange',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
