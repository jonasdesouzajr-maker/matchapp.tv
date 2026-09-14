(function(){
  'use strict';
  const safeLink = value => {try {const u=new URL(value,location.origin);return u.protocol==='https:' || (u.origin===location.origin) ? u.href : '#';}catch(_){return '#';}};
  function render(){
    const host=document.getElementById('history-list');if(!host)return;
    host.replaceChildren();
    const records=window.matchPolicy?.history() || [];
    if(!records.length){host.textContent='Your saved, seen, loved and declined matches will appear here.';return;}
    records.forEach(i=>{
      const card=document.createElement('article');card.style.cssText='display:flex;gap:1rem;padding:1rem 0;border-bottom:1px solid #6e6472;align-items:center';
      const img=document.createElement('img');img.width=66;img.height=99;img.style.objectFit='cover';img.alt=i.title;img.loading='lazy';
      const fallback=()=>{if(typeof generateLocalPosterSVG==='function')img.src=generateLocalPosterSVG(i.title,{synopsis:i.reason});};
      img.onerror=()=>{img.onerror=null;fallback();};if(i.posterUrl)img.src=safeLink(i.posterUrl);else fallback();
      const body=document.createElement('div'),title=document.createElement('h3'),note=document.createElement('p'),link=document.createElement('a');
      title.textContent=i.title;note.textContent=({save:'Watch later',seen:'Seen',like:'Loved it',dislike:'Not for me',rated:'Rated'})[i.action] || 'In your history';
      if(i.reason)note.textContent+=' · '+i.reason;
      link.textContent='Find where to watch';link.href=safeLink(i.streamUrl || 'https://www.google.com/search?q='+encodeURIComponent(i.title+' where to watch'));
      body.append(title,note,link);card.append(img,body);host.append(card);
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
