'use strict';

// Shared evidence policy for generated pages. Never turn a failed request into
// a fresh observation, and never mistake a regional aggregator URL for a
// provider's exact playable title URL.
const SITE = 'https://matchapp.tv';
const MAX_AGE_MS = 72 * 60 * 60 * 1000;
const REGION_NAMES = Object.freeze({BR:'Brazil',US:'United States',GB:'United Kingdom',PT:'Portugal'});
const ACCESS = Object.freeze({stream:'subscription',rent:'rental',buy:'purchase',free:'free',ads:'free with ads'});
const safeJson = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
function httpsUrl(value) {
  try {
    const u = new URL(String(value || ''));
    if (u.protocol !== 'https:' || u.username || u.password) return '';
    return u.href;
  } catch (_) { return ''; }
}
function observationTime(...values) {
  for (const value of values) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) continue;
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  return '';
}
function names(value) {
  return Array.isArray(value) ? [...new Set(value.filter(v=>typeof v==='string' && v.trim()).map(v=>v.trim().slice(0,120)))] : [];
}
function regionEvidence(info, code, generated, now = Date.now()) {
  const raw = info?.regions?.[code];
  const checkedAt = observationTime(raw?.checkedAt,info?.checkedAt,generated);
  const checkedMs = Date.parse(checkedAt);
  const currentMs = typeof now === 'number' ? now : Date.parse(now);
  const options = Object.entries(ACCESS).flatMap(([key,access])=>names(raw?.[key]).map(provider=>({provider,access,key})));
  const explicitFailure = raw?.status === 'unknown' || raw?.refreshStatus === 'failed' || info?.refreshStatus === 'failed';
  let state = 'unknown';
  if (raw && Number.isFinite(checkedMs) && Number.isFinite(currentMs) && checkedMs <= currentMs + 5*60*1000 && !explicitFailure) {
    state = currentMs - checkedMs > MAX_AGE_MS ? 'stale' : options.length ? 'available' : raw.status === 'not_reported' ? 'not_reported' : 'unknown';
  }
  const country = REGION_NAMES[code] || code;
  const grouped = Object.entries(ACCESS).map(([key,access])=>{
    const providers=names(raw?.[key]);
    return providers.length ? `${access} via ${providers.join(', ')}` : '';
  }).filter(Boolean).join('; ');
  const dateLabel = checkedAt ? checkedAt.replace('T',' ').replace(/\.\d{3}Z$/,' UTC') : '';
  let answer;
  if (state==='available') answer=`The source snapshot for ${country} lists ${grouped}. Checked ${dateLabel}. Confirm the current terms with the provider.`;
  else if(state==='not_reported') answer=`No provider options were reported by this source for ${country} when checked ${dateLabel}. This does not establish that the title is unavailable everywhere.`;
  else if(state==='stale') answer=`Current availability in ${country} needs reconfirmation. The last source check was ${dateLabel}${grouped ? ` and reported ${grouped}` : ''}. These older listings are not a current availability guarantee.`;
  else answer=`We could not confirm current availability in ${country}.${dateLabel ? ` Last source observation: ${dateLabel}.` : ''}${grouped ? ` Earlier reported options: ${grouped}.` : ''} Open the source to verify.`;
  return {code,country,state,checkedAt,options,answer,sourceUrl:httpsUrl(raw?.link),raw:raw||null};
}
function directWatchActions(info,evidence) {
  if(evidence.state!=='available' || !Array.isArray(evidence.raw?.offers))return [];
  return evidence.raw.offers.flatMap(offer=>{
    if(offer?.verified!==true || typeof offer.provider!=='string')return [];
    const target=httpsUrl(offer.watchUrl),providerUrl=httpsUrl(offer.providerUrl);
    if(!target || !providerUrl)return [];
    const host=new URL(target).hostname.replace(/^www\./,'');
    const providerHost=new URL(providerUrl).hostname.replace(/^www\./,'');
    if(host!==providerHost || /(^|\.)(themoviedb\.org|justwatch\.com|matchapp\.tv)$/.test(host))return [];
    const category=ACCESS[offer.accessType] || ({subscription:'subscription',rental:'rental',purchase:'purchase',free:'free',ads:'free with ads'})[offer.accessType];
    if(!category)return [];
    const spec={'@type':'ActionAccessSpecification',eligibleRegion:evidence.code,category};
    if(category==='subscription')spec.requiresSubscription=true;
    // Subscription requirements, prices, licensing dates and season coverage
    // are absent unless actually verified by an upstream source.
    if(offer.requiresSubscription===false && category!=='subscription')spec.requiresSubscription=false;
    const action={'@type':'WatchAction',target,provider:{'@type':'Organization',name:offer.provider,url:providerUrl},actionAccessibilityRequirement:spec};
    // A series-wide action cannot stand in for one season's access.
    if(info.kind==='tv' && offer.scope!=='series')return [];
    return [action];
  });
}
function buildAvailabilityGraph({title,info,entry,url,generated,now=Date.now(),regionCode=null}) {
  const canonical=httpsUrl(url);
  const parsed=canonical?new URL(canonical):null;
  if(!parsed||parsed.origin!==SITE||parsed.search||parsed.hash||!require('../growth-core.js').titlePath(parsed.pathname))throw new Error('Invalid availability canonical');
  if(!['movie','tv'].includes(info?.kind) || !Number.isSafeInteger(info?.tmdbId) || info.tmdbId<=0)throw new Error('Resolved title identity required');
  const codes=regionCode ? [regionCode] : Object.keys(info.regions||{});
  const evidence=codes.filter(code=>/^[A-Z]{2}$/.test(code)).map(code=>regionEvidence(info,code,generated,now));
  const entityId=`${SITE}/#tmdb-${info.kind}-${info.tmdbId}`;
  const source=`https://www.themoviedb.org/${info.kind}/${info.tmdbId}`;
  const titleNode={'@type':info.kind==='movie'?'Movie':'TVSeries','@id':entityId,name:String(title),sameAs:source,identifier:{'@type':'PropertyValue',propertyID:'TMDB',value:`${info.kind}:${info.tmdbId}`}};
  if(entry?.synopsis)titleNode.description=String(entry.synopsis);
  const actions=evidence.flatMap(e=>directWatchActions(info,e));
  if(actions.length)titleNode.potentialAction=actions;
  const pageName=`Where to watch ${title}${info.year?` (${info.year})`:''}${regionCode?` in ${REGION_NAMES[regionCode]||regionCode}`:''}`;
  const page={'@type':'WebPage','@id':url+'#webpage',url,name:pageName,inLanguage:'en',isAccessibleForFree:true,publisher:{'@id':SITE+'/#organization'},mainEntity:{'@id':entityId},description:evidence.map(e=>e.answer).join(' '),citation:[{'@type':'WebPage',name:'Exact title record on TMDB',url:source},...evidence.filter(e=>e.sourceUrl).map(e=>({'@type':'WebPage',name:`TMDB / JustWatch source listing for ${e.country}`,url:e.sourceUrl}))],hasPart:evidence.map(e=>({'@type':'WebPageElement','@id':url+'#availability-'+e.code.toLowerCase(),name:`Availability in ${e.country}`,text:e.answer}))};
  const nowMs=typeof now==='number'?now:Date.parse(now);
  const dates=evidence.map(e=>e.checkedAt).filter(d=>d && Date.parse(d)<=nowMs+5*60*1000).sort();
  if(dates.length)page.dateModified=dates[dates.length-1];
  return {'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':SITE+'/#organization',name:'MatchApp Ai',url:SITE+'/'},page,titleNode]};
}
module.exports={MAX_AGE_MS,REGION_NAMES,ACCESS,safeJson,httpsUrl,observationTime,regionEvidence,buildAvailabilityGraph,directWatchActions};
