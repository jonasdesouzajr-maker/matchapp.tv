/* Final-release progressive result UX. Keeps explicit filters authoritative. */
(function(){'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];let last='';
function result(){return $('#result-box')||$('#result')||$('.result-card')||$('.match-result')}
function title(r){return $('h2,h3,.result-title,#res-title',r)?.textContent?.trim()||''}
function enhance(){const r=result();if(!r)return;const t=title(r);if(!t||t===last)return;last=t;
 if(!r.querySelector('.match-reason-panel')){const selected=$$('select').filter(x=>x.value&&!/^(any|all|)$/i.test(x.value)).slice(0,3).map(x=>x.options?.[x.selectedIndex]?.text||x.value);const p=document.createElement('aside');p.className='match-reason-panel';p.setAttribute('aria-label','Why this Match');p.innerHTML='<strong>Why this Match</strong><p></p><div class="match-reason-chips"></div>';p.querySelector('p').textContent=selected.length?'It fits the choices you made. Your selected filters stay hard constraints; MatchApp does not silently loosen them.':'Matched from the title catalog and your available preference signals.';const chips=p.querySelector('.match-reason-chips');selected.forEach(v=>{const s=document.createElement('span');s.textContent=v;chips.appendChild(s)});r.appendChild(p)}
 if(!r.querySelector('.match-freshness')){const p=document.createElement('p');p.className='match-freshness';p.textContent='Title metadata and artwork may refresh from verified sources. Streaming providers vary by country and can change; open the provider before subscribing or paying.';r.appendChild(p)}
 try{const a=JSON.parse(localStorage.getItem('match_recent_discovery')||'[]').filter(x=>x?.title!==t);a.unshift({title:t,at:Date.now()});localStorage.setItem('match_recent_discovery',JSON.stringify(a.slice(0,12)))}catch(_){}
}
function continuation(){if(document.querySelector('.continue-discovering'))return;let items=[];try{items=JSON.parse(localStorage.getItem('match_recent_discovery')||'[]').slice(0,4)}catch(_){}if(!items.length)return;const anchor=$('#result-box')||$('.match-result')||$('.container');if(!anchor)return;const d=document.createElement('details');d.className='continue-discovering';d.innerHTML='<summary>Continue discovering <span>Recent matches</span></summary><div></div>';items.forEach(x=>{const b=document.createElement('button');b.type='button';b.textContent=x.title;b.addEventListener('click',()=>{window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});const input=$('#title-search,input[type="search"]');if(input){input.value=x.title;input.focus()}});d.lastElementChild.appendChild(b)});anchor.insertAdjacentElement('afterend',d)}
function run(){enhance();continuation()}
function boot(){
  run();
  const box=result();
  if(box&&window.MutationObserver){
    let queued=false;
    new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;run();},80);}).observe(box,{childList:true,subtree:false,attributes:true,attributeFilter:['style','class']});
  }
  document.addEventListener('matchapp:newmatch',run);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
