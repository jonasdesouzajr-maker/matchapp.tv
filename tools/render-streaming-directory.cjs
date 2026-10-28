'use strict';
const {OFFER_TYPES}=require('./streaming-registry.cjs');

function renderStreamingDirectory({registry,services,copy,esc}) {
  const text=(tag,key,cls='')=>`<${tag}${cls?` class="${cls}"`:''} data-mp="${key}">${esc(copy[key])}</${tag}>`;
  const label=key=>`<span data-mp="${key}">${esc(copy[key])}</span>`;
  const names=new Intl.DisplayNames(['en'],{type:'region'});
  const markets=[...new Set(services.flatMap(s=>s.markets))].sort((a,b)=>names.of(a).localeCompare(names.of(b)));
  const countryNames=codes=>codes.map(code=>`<span data-market-code="${code}">${esc(names.of(code))}</span>`).join(' · ');
  const sourceDate=service=>`<p class="mp-note">${label('directoryChecked')}: <time datetime="${service.checked_on}" data-service-checked="${service.checked_on}">${new Intl.DateTimeFormat('en',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(service.checked_on+'T12:00:00Z'))}</time></p>`;
  const evidence=service=>`<details class="mp-service-evidence"><summary>${label('directoryEvidence')}</summary><ul>${service.official_sources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer" translate="no">${esc(new URL(source.url).hostname)}</a></li>`).join('')}</ul></details>`;
  const aliasLine=service=>service.aliases.length?`<p class="mp-note">${label('directoryAliases')}: <span translate="no">${esc(service.aliases.join(' · '))}</span></p>`:'';
  const cards=services.map(service=>`<article class="mp-service" id="service-${service.id}" data-markets="${service.markets.join(' ')}" data-offers="${service.offer_types.join(' ')}" data-search="${esc([service.name,...service.aliases].join(' '))}">
<h3 translate="no">${esc(service.name)}</h3>
<p class="mp-market">${service.markets.length?countryNames(service.markets):label('directoryUnmapped')}</p>
<p class="mp-service-focus">${service.focus.length?service.focus.map(value=>label('focus_'+value)).join(' · '):label(service.kind)}</p>
<p class="mp-service-offers">${service.offer_types.map(value=>label('offer_'+value)).join(' · ')}</p>
${aliasLine(service)}${sourceDate(service)}${evidence(service)}
${text('p','access','mp-note')}
${service.destinations?Object.entries(service.destinations).map(([code,url])=>`<a class="mp-pill secondary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label('open')} · <span data-market-code="${code}">${esc(names.of(code))}</span></a>`).join(''):`<a class="mp-pill secondary" href="${esc(service.url)}" target="_blank" rel="noopener noreferrer" data-mp="open">${esc(copy.open)}</a>`}
</article>`).join('\n');
  const legacy=registry.services.filter(service=>service.status==='legacy');
  const history=legacy.map(service=>{
    const successor=registry.services.find(row=>row.id===service.successor_id);
    return `<article class="mp-legacy-service" data-markets="${service.representative_markets.join(' ')}" data-search="${esc([service.name,...service.aliases].join(' '))}"><h3 translate="no">${esc(service.name)}</h3>${aliasLine(service)}${successor?`<p>${label('directorySuccessor')}: <a href="#service-${successor.id}" data-current-service="${successor.id}" translate="no">${esc(successor.name)}</a></p>`:''}${sourceDate(service)}${evidence(service)}</article>`;
  }).join('\n');
  return `<section class="mp-card mp-hero">${text('p','dirKicker','mp-kicker')}${text('h1','dirTitle')}${text('p','dirIntro','mp-lede')}${text('p','updated','mp-note')}</section>
<section class="mp-card">${text('h2','guide')}${text('p','guideText')}${text('h3','rights')}${text('p','rightsText')}</section>
<section class="mp-card" id="mp-directory">${text('h2','directory')}${text('p','directoryRepresentative','mp-note')}${text('p','directoryOfferScope','mp-note')}
<div id="mp-directory-controls" class="mp-grid">
<label class="mp-field">${label('directorySearch')}<input type="search" id="mp-service-query" maxlength="120" autocomplete="off" aria-controls="mp-service-list"></label>
<label class="mp-field">${label('filter')}<select id="mp-market" aria-controls="mp-service-list"><option value="" data-mp="all">${esc(copy.all)}</option>${markets.map(code=>`<option value="${code}" data-market-code="${code}">${esc(names.of(code))}</option>`).join('')}</select></label>
<label class="mp-field">${label('directoryOffer')}<select id="mp-offer" aria-controls="mp-service-list"><option value="" data-mp="directoryAnyOffer">${esc(copy.directoryAnyOffer)}</option>${OFFER_TYPES.filter(value=>services.some(service=>service.offer_types.includes(value))).map(value=>`<option value="${value}" data-mp="offer_${value}">${esc(copy['offer_'+value])}</option>`).join('')}</select></label>
</div>
<p id="mp-directory-status" role="status" aria-live="polite" aria-atomic="true">${label('directoryResults')}: <span id="mp-results-count">${services.length}</span></p>
<p id="mp-directory-empty" data-mp="directoryEmpty" hidden>${esc(copy.directoryEmpty)}</p>
<div class="mp-services mp-grid" id="mp-service-list">${cards}</div>
</section>
<details class="mp-card" id="mp-legacy-services"><summary>${label('directoryLegacy')}</summary>${text('p','directoryLegacyNote','mp-note')}<div class="mp-grid">${history}</div></details>
<section class="mp-card">${text('h2','directoryExplore')}<div class="mp-actions"><a class="mp-pill secondary" href="/where-to-watch/" data-mp="directoryWatch">${esc(copy.directoryWatch)}</a><a class="mp-pill secondary" href="/together.html" data-mp="directoryTogether">${esc(copy.directoryTogether)}</a><a class="mp-pill secondary" href="/discover.html" data-mp="directoryAsk">${esc(copy.directoryAsk)}</a></div></section>`;
}

module.exports={renderStreamingDirectory};
