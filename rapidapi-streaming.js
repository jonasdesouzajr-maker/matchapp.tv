/* Optional, display-only links. Never changes selected titles or fallback logic. */
(function () {
'use strict';
let generation=0, disabled=false;
const cache=new Map(), host=document.createElement('aside');
host.id='matchapp-rapidapi-links';host.hidden=true;
host.setAttribute('aria-label','Additional verified streaming links');
host.style.cssText='gap:8px;margin:9px 0 13px;padding:11px 12px;border:1px solid rgba(229,193,88,.25);border-radius:13px;background:rgba(29,25,36,.96)';
function clear(){generation++;host.hidden=true;host.style.display='';host.replaceChildren();}
function render(data){
  const heading=document.createElement('strong');
  heading.textContent='More streaming links · '+data.country;
  heading.style.cssText='font:800 12px Inter,Arial,sans-serif;color:#E5C158';
  const label=document.createElement('small');
  label.textContent='Source: Streaming Availability · Availability may change.';
  label.style.cssText='display:block;font-size:11px;color:#bbb4c5';
  const links=document.createElement('div');
  links.style.cssText='display:flex;flex-wrap:wrap;gap:7px';
  for(const p of data.providers.slice(0,8)){
    const el=document.createElement(p.link?'a':'span');
    el.textContent=p.name+(p.type==='free'?' · Free':p.type==='rent'?' · Rent':
      p.type==='buy'?' · Buy':p.type==='addon'?' · Add-on':'');
    if(p.link){try{
      if(new URL(p.link).protocol!=='https:')continue;
      el.href=p.link;el.target='_blank';el.rel='noopener noreferrer';
    }catch{continue;}}
    el.style.cssText='padding:7px 10px;border:1px solid rgba(229,193,88,.35);border-radius:999px;color:#f6e8ad;font:700 12px Inter,Arial,sans-serif;text-decoration:none';
    links.appendChild(el);
  }
  if(!links.childNodes.length)return;
  host.replaceChildren(heading,links,label);host.hidden=false;host.style.display='grid';
}
async function update(detail){
  const title=String(detail?.title||'').trim(),tmdbId=Number(detail?.tmdbId),
    kind=detail?.kind,country=String(detail?.country||'').toUpperCase();
  const anchor=document.getElementById('matchapp-main-availability');
  if(disabled||!title||!Number.isSafeInteger(tmdbId)||tmdbId<1||
    !['movie','tv'].includes(kind)||!/^[A-Z]{2}$/.test(country)||
    !window.supabaseClient?.functions||!anchor?.parentElement)return;
  anchor.insertAdjacentElement('afterend',host);
  const mine=generation,body={tmdbId,kind,country},key=JSON.stringify(body);
  let response=cache.get(key);
  if(!response){
    response=await Promise.race([
      window.supabaseClient.functions.invoke('rapidapi-streaming',{body}),
      new Promise(resolve=>setTimeout(()=>resolve({error:true}),4800))
    ]).catch(()=>({error:true}));
    if(!response?.error&&response?.data?.providers?.length)cache.set(key,response);
  }
  if(mine!==generation||!host.isConnected||
    String(document.getElementById('res-title')?.textContent||'').trim()!==title)return;
  if(['feature_disabled','not_configured'].includes(response?.data?.code))disabled=true;
  const data=response?.data;
  if(response?.error||!data||data.unavailable||data.kind!==kind||
    data.verifiedTmdbId!==tmdbId||data.country!==country||
    !Array.isArray(data.providers)||!data.providers.length)return;
  render(data);
}
document.addEventListener('matchapp:newmatch',clear);
document.addEventListener('matchapp:adult-metadata',e=>{clear();void update(e.detail);});
document.getElementById('result-dismiss')?.addEventListener('click',clear);
})();
