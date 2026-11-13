'use strict';
const fs=require('node:fs'),path=require('node:path');
const DIR=path.join(__dirname,'../trending/2026-11-12');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function loadRadar(locales){
  const data=JSON.parse(fs.readFileSync(path.join(DIR,'radar.json')));
  const copies=JSON.parse(fs.readFileSync(path.join(DIR,'radar-copy.json')));
  if(Object.keys(copies).sort().join()!==[...locales].sort().join())throw Error('Incomplete radar languages');
  for(const lang of locales){
    const c=copies[lang];
    if(Object.keys(c).sort().join()!==Object.keys(copies.en).sort().join()||c.facts.length!==data.facts.length||c.notes.length!==data.candidates.length||c.states.length!==4||c.prompts.length!==3)throw Error('Incomplete radar copy: '+lang);
    for(const v of Object.values(c).flat())if(typeof v!=='string'||!v.trim())throw Error('Empty radar copy: '+lang);
  }
  for(const item of [...data.facts,...data.candidates]){
    const u=new URL(item.source);
    if(u.protocol!=='https:'||u.username||u.password)throw Error('Unsafe radar source');
  }
  return {data,copies};
}
function renderRadar(lang,{data,copies},labels){
  const c=copies[lang],date=value=>new Intl.DateTimeFormat(lang,{dateStyle:'long',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
  const button=(href,text)=>`<a class="channel-button ust-button" href="${esc(href)}">${esc(text)}</a>`;
  return `<section class="ust-section" id="radar" data-trend-radar>
<h2>${esc(c.heading)}</h2><p class="ust-date">${esc(c.updated)} <time datetime="${data.checked}">${esc(date(data.checked))}</time></p><p>${esc(c.intro)}</p>
<h3>${esc(c.factsHeading)}</h3><ul>${data.facts.map((f,i)=>`<li><p>${esc(c.facts[i])} <a href="${esc(f.source)}">Netflix Top 10</a></p></li>`).join('')}</ul>
<p>${esc(c.method)}</p><div class="ust-grid">${data.candidates.map((item,i)=>`<article class="ust-card" id="radar-${item.id}" data-radar-id="${item.id}"><p class="ust-badge">${esc(c.states[i])}</p><h3><bdi>${esc(item.title)}</bdi></h3><p class="ust-signal">${item.dates.map(d=>`<time datetime="${d}">${esc(date(d))}</time>`).join(' · ')}</p><p>${esc(c.notes[i])}</p><nav class="ust-card-links">${button(item.source,labels.source+' · '+item.publisher)}${button(lang==='pt-BR'&&item.ptDestination?item.ptDestination:item.destination,c.explore)}</nav></article>`).join('')}</div>
<h3>${esc(c.promptsTitle)}</h3>${c.prompts.map(p=>`<p>${esc(p)}</p>`).join('')}
<nav>${button('/together.html',labels.together)}<button type="button" class="channel-button ust-button" data-radar-share data-share-text="${esc(c.shareText)}" data-share-done="${esc(c.copied)}">${esc(c.share)}</button></nav><p data-radar-share-status role="status" aria-live="polite"></p>
</section>`;
}
module.exports={loadRadar,renderRadar};
