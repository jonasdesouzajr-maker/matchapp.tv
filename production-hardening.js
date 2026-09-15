/* MatchApp production hardening — title identity, media integrity and no-repeat UX.
   Runtime rule: integrity checks must never become the thing that makes the app feel broken. */
(function(){
'use strict';
const AUDIO=/\b(podcast|music|song|album|playlist|single|audiobook|spotify|listen|radio)\b/i;
const key=t=>window.matchPolicy?.key?.(t)||String(t||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const catalog=()=>{try{return typeof CONTENT_CATALOG!=='undefined'&&Array.isArray(CONTENT_CATALOG)?CONTENT_CATALOG:[]}catch(_){return[]}};
const findEntry=title=>{const k=key(title);return catalog().find(e=>key(e.title)===k)||null};
const language=()=>String(window.MATCH_LANG||document.documentElement.lang||'en');

function canonicalType(entry){
 const cats=(entry?.cats||[]).map(v=>String(v).toLowerCase());
 // Kingdom-class fix: visual work types win over incidental music/audio tags.
 if(cats.some(c=>['movie','short film','film','cinema'].includes(c)))return'movie';
 if(cats.some(c=>['series','limited series','k-drama','j-drama','c-drama','novela brasileira','telenovela','turkish dizi','anime','reality tv','documentary series'].includes(c)))return'series';
 if(cats.some(c=>c==='podcast'))return'podcast';
 if(cats.some(c=>c==='audiobook'))return'audiobook';
 if(cats.some(c=>/spotify|music album|classical music|music single|playlist/.test(c)))return'music';
 if(cats.some(c=>/youtube channel|youtube shorts/.test(c)))return'video';
 return String(entry?.type||'').toLowerCase()||'video';
}
function localizedType(type){
 const map={
  en:{series:'TV Series',movie:'Movie',music:'Music',podcast:'Podcast',audiobook:'Audiobook',video:'Video'},
  'pt-BR':{series:'Série de TV',movie:'Filme',music:'Música',podcast:'Podcast',audiobook:'Audiolivro',video:'Vídeo'},
  es:{series:'Serie de TV',movie:'Película',music:'Música',podcast:'Podcast',audiobook:'Audiolibro',video:'Vídeo'},
  fr:{series:'Série TV',movie:'Film',music:'Musique',podcast:'Podcast',audiobook:'Livre audio',video:'Vidéo'},
  de:{series:'TV-Serie',movie:'Film',music:'Musik',podcast:'Podcast',audiobook:'Hörbuch',video:'Video'},
  it:{series:'Serie TV',movie:'Film',music:'Musica',podcast:'Podcast',audiobook:'Audiolibro',video:'Video'},
  tr:{series:'TV Dizisi',movie:'Film',music:'Müzik',podcast:'Podcast',audiobook:'Sesli Kitap',video:'Video'},
  ru:{series:'Сериал',movie:'Фильм',music:'Музыка',podcast:'Подкаст',audiobook:'Аудиокнига',video:'Видео'},
  ar:{series:'مسلسل تلفزيوني',movie:'فيلم',music:'موسيقى',podcast:'بودكاست',audiobook:'كتاب صوتي',video:'فيديو'},
  hi:{series:'टीवी सीरीज़',movie:'फ़िल्म',music:'संगीत',podcast:'पॉडकास्ट',audiobook:'ऑडियोबुक',video:'वीडियो'},
  id:{series:'Serial TV',movie:'Film',music:'Musik',podcast:'Podcast',audiobook:'Buku Audio',video:'Video'},
  ja:{series:'TVシリーズ',movie:'映画',music:'音楽',podcast:'ポッドキャスト',audiobook:'オーディオブック',video:'動画'},
  ko:{series:'TV 시리즈',movie:'영화',music:'음악',podcast:'팟캐스트',audiobook:'오디오북',video:'비디오'},
  zh:{series:'电视剧',movie:'电影',music:'音乐',podcast:'播客',audiobook:'有声书',video:'视频'}
 };
 const lang=language();const row=map[lang]||map[lang.split('-')[0]]||map.en;return row[type]||type;
}
function typeFromRaw(raw){const t=String(raw||'').toLowerCase();if(/podcast/.test(t))return'podcast';if(/audiobook/.test(t))return'audiobook';if(/music|song|album|playlist|single/.test(t))return'music';if(/movie|film/.test(t))return'movie';if(/series|tv|show|drama|anime|novela|documentary|reality/.test(t))return'series';return'video';}
function isAudioType(type){return['music','podcast','audiobook'].includes(typeFromRaw(type));}
function platformUrl(entry){
 if(entry?.watchUrl)return entry.watchUrl;
 try{if(entry?.platform&&entry.platform!=='any'&&typeof platformSearchUrl==='function')return platformSearchUrl(entry.platform,entry.title)}catch(_){}
 return entry&&isAudioType(canonicalType(entry))?`https://open.spotify.com/search/${encodeURIComponent(entry.title)}`:`https://www.justwatch.com/us/search?q=${encodeURIComponent(entry?.title||'')}`;
}
function bounded(task,ms,fallback=null){
 let timer;const safe=Promise.resolve(task).catch(()=>fallback);const timeout=new Promise(resolve=>{timer=setTimeout(()=>resolve(fallback),ms)});
 return Promise.race([safe,timeout]).finally(()=>clearTimeout(timer));
}
async function verifyAIItem(raw,question){
 if(!raw||!raw.title)return null;
 const title=String(raw.title).trim();if(!title)return null;
 const known=window.matchPolicy?.known?.();if(known?.has(key(title)))return null;
 const exact=findEntry(title);
 if(exact)return {...raw,title:exact.title,year:exact.year||raw.year||'',type:canonicalType(exact),platform:exact.platform||'any',synopsis:exact.synopsis||raw.synopsis||'',_meta:null,_verified:'catalog'};
 const audioIntent=AUDIO.test(question||''),rawType=typeFromRaw(raw.type);
 if(audioIntent&&!isAudioType(rawType))return null;
 let tmdb=null;
 if(!audioIntent&&typeof window.tmdbLookup==='function'){
  const kind=rawType==='movie'?'movie':rawType==='series'?'tv':'';
  tmdb=await bounded(window.tmdbLookup(title,{year:raw.year||'',kind}),1800,null);
 }
 if(tmdb){
  const fixedType=tmdb.kind==='movie'?'movie':'series';
  return {...raw,title:tmdb.title||title,year:tmdb.year||raw.year||'',type:fixedType,platform:'any',synopsis:tmdb.overview||raw.synopsis||'',_meta:{artwork:tmdb.posterLarge||tmdb.poster||'',year:tmdb.year||'',overview:tmdb.overview||'',tmdbId:tmdb.tmdbId,kind:tmdb.kind,source:'tmdb'},_verified:'tmdb'};
 }
 if(!audioIntent&&isAudioType(rawType))return null;
 return {...raw,title,type:rawType,platform:audioIntent?(raw.platform||'any'):'any',_meta:null,_verified:'title-only'};
}
async function hardenPayload(payload,question){
 if(!payload||!Array.isArray(payload.results))return payload;
 const out=[],seen=new Set(),source=payload.results.slice(0,8);
 // Verify at most four items at once. The old serial loop could turn a few slow
 // TMDB calls into a long apparent freeze even after the AI answer was ready.
 for(let i=0;i<source.length&&out.length<12;i+=4){
  const verified=await Promise.all(source.slice(i,i+4).map(raw=>verifyAIItem(raw,question)));
  for(const item of verified){if(!item)continue;const k=key(item.title);if(!k||seen.has(k)||window.matchPolicy?.known?.().has(k))continue;seen.add(k);out.push(item);if(out.length>=12)break;}
 }
 if(!out.length&&typeof window.fallbackSearch==='function'){
  try{const fallback=await bounded(window.fallbackSearch(question,false),2200,{results:[]});for(const raw of fallback?.results||[]){const k=key(raw.title);if(k&&!seen.has(k)&&!window.matchPolicy?.known?.().has(k)){seen.add(k);out.push(raw);if(out.length>=12)break;}}}catch(_){}
 }
 payload.results=out;return payload;
}
function patchAI(){
 const fn=window.askAIConversational;if(typeof fn!=='function'||fn.__integrityPatched)return false;
 const wrapped=async function(question,history){const payload=await fn.call(this,question,history);return hardenPayload(payload,question)};
 wrapped.__integrityPatched=true;wrapped.__original=fn;window.askAIConversational=wrapped;return true;
}
function rememberShown(title,extra={}){const k=key(title);if(!k||window.matchPolicy?.known?.().has(k))return;window.matchPolicy?.remember?.({title,...extra,reason:'Shown by MatchApp'},'shown');}
function criteriaSatisfied(entry,c){
 if(!entry||!c)return true;const arr=v=>(Array.isArray(v)?v:[v]).filter(x=>x&&x!=='any');
 const checks=[['cat','cats'],['plat','platform'],['mood','moods'],['vibe','vibes'],['rating','ratings']];
 for(const [f,p] of checks){const want=arr(c[f]);if(!want.length)continue;const have=arr(entry[p]);if(!have.some(v=>want.includes(v)))return false;}
 const dec=arr(c.decade);if(dec.length&&!dec.some(d=>{const s=Number(String(d).match(/\d{4}/)?.[0]);return s&&Number(entry.year)>=s&&Number(entry.year)<s+10}))return false;return true;
}
function ensureFormatBadge(entry){
 const platform=document.getElementById('res-platform-badge');if(!platform||!entry)return;
 let badge=document.getElementById('res-format-verified');if(!badge){badge=document.createElement('span');badge.id='res-format-verified';badge.className='matchapp-format-badge';platform.insertAdjacentElement('afterend',badge);}
 const type=canonicalType(entry),text='✓ '+localizedType(type);if(badge.textContent!==text)badge.textContent=text;if(badge.dataset.kind!==type)badge.dataset.kind=type;
}
let mainSignature='';
function repairMainResult(){
 const title=window.globalMatchTitle||document.getElementById('res-title')?.textContent?.trim();if(!title)return;
 const signature=key(title)+'|'+language();if(signature===mainSignature)return;mainSignature=signature;
 const entry=findEntry(title);
 if(entry){
  ensureFormatBadge(entry);
  if(window.lastMatchCriteria&&!criteriaSatisfied(entry,window.lastMatchCriteria)){const box=document.getElementById('result-box');if(box)box.style.display='none';renderRecovery('integrity');return;}
  const direct=document.getElementById('res-direct-link'),type=canonicalType(entry);
  if(direct){const href=platformUrl(entry);if(direct.href!==href)direct.href=href;const next=['music','podcast','audiobook'].includes(type)?(window.t?.('res.listennow')||'🎧 Listen Now'):(/listen/i.test(direct.textContent||'')?(window.t?.('res.findwhere')||'▶ Find Where To Stream'):null);if(next&&direct.textContent!==next)direct.textContent=next;}
 }
 rememberShown(title,{posterUrl:window.globalMatchPoster||'',streamUrl:document.getElementById('res-direct-link')?.href||''});
}
function repairDiscoverCard(card){
 if(!card)return;const title=card.querySelector('h3')?.textContent?.trim();if(!title)return;
 const lang=language();if(card.dataset.integrityLang===lang)return;card.dataset.integrityLang=lang;
 const entry=findEntry(title);
 if(entry){
  const type=canonicalType(entry),meta=card.querySelector('.discover-meta'),metaText=[entry.year,localizedType(type)].filter(Boolean).join(' · ');if(meta&&meta.textContent!==metaText)meta.textContent=metaText;
  const link=card.querySelector('.discover-play');if(link){const href=platformUrl(entry),label=['music','podcast','audiobook'].includes(type)?(window.t?.('res.listennow')||'🎧 Listen'):(window.t?.('discover.watchNow')||'▶ Watch Now');if(link.href!==href)link.href=href;if(link.textContent!==label)link.textContent=label;}
 }
 if(card.dataset.integrityRemembered!=='1'){card.dataset.integrityRemembered='1';rememberShown(entry?.title||title,{posterUrl:card.querySelector('img')?.src||'',streamUrl:card.querySelector('.discover-play')?.href||''});}
}
function canMatch(criteria){const p=window.matchPolicy;if(!p)return false;return catalog().some(e=>{try{return p.matches(e,criteria)&&(!(typeof isBlockedEntry==='function')||!isBlockedEntry(e))}catch(_){return false}});}
function recoveryText(){const l=language(),m={en:'No unseen title fits every filter at once. Keep the important choices and broaden one filter for a fresh result.','pt-BR':'Nenhum título ainda não mostrado combina com todos os filtros ao mesmo tempo. Mantenha as escolhas importantes e amplie um filtro para receber um resultado novo.',es:'Ningún título no mostrado encaja con todos los filtros a la vez. Mantén lo importante y amplía un filtro para obtener un resultado nuevo.',fr:'Aucun titre inédit ne correspond à tous les filtres à la fois. Gardez l’essentiel et élargissez un filtre pour un résultat nouveau.',de:'Kein noch nicht gezeigter Titel erfüllt gerade alle Filter. Behalte die wichtigen Vorgaben und erweitere einen Filter für ein neues Ergebnis.'};return m[l]||m[l.split('-')[0]]||m.en;}
function renderRecovery(reason){
 if(!document.body)return;let box=document.getElementById('match-fresh-recovery');if(!box){box=document.createElement('section');box.id='match-fresh-recovery';box.className='match-fresh-recovery';const host=document.getElementById('questionnaire-box')||document.querySelector('main')||document.body;host.appendChild(box);}
 const current=window.getMatchCriteria?.()||{},choices=[],tests=[{label:'Any platform',patch:{plat:[]}},{label:'Any mood & vibe',patch:{mood:[],vibe:[]}},{label:'Any decade',patch:{decade:[]}}];
 for(const t of tests){const next={...current,...t.patch};if(canMatch(next))choices.push(t);}
 if(!choices.length){const next={...current,plat:[],mood:[],vibe:[],decade:[]};if(canMatch(next))choices.push({label:'Keep format + age; broaden the rest',patch:{plat:[],mood:[],vibe:[],decade:[]}});}
 box.innerHTML='';const p=document.createElement('p');p.textContent=recoveryText();box.appendChild(p);const row=document.createElement('div');
 choices.forEach(choice=>{const b=document.createElement('button');b.type='button';b.textContent=choice.label;b.addEventListener('click',()=>{window.setMatchCriteria?.(choice.patch);box.remove();setTimeout(()=>window.triggerMatch?.(false),0)});row.appendChild(b);});box.appendChild(row);box.hidden=false;box.dataset.reason=reason||'empty';
}
function patchToast(){const fn=window.showToast;if(typeof fn!=='function'||fn.__freshPatched)return false;const wrapped=function(text,...rest){const s=String(text||'');if(/no fresh|no titles|no matches|couldn.t find|could not find|in history/i.test(s)){renderRecovery('empty');return fn.call(this,recoveryText(),...rest)}return fn.call(this,text,...rest)};wrapped.__freshPatched=true;wrapped.__original=fn;window.showToast=wrapped;return true;}
function scan(){document.querySelectorAll('.discover-card').forEach(repairDiscoverCard);repairMainResult();}
let scanTimer=0;
function scheduleScan(delay=50){clearTimeout(scanTimer);scanTimer=setTimeout(scan,delay);}
function boot(){
 let attempts=0;const patchLoop=()=>{patchAI();patchToast();if(++attempts<40&&(!window.askAIConversational?.__integrityPatched||!window.showToast?.__freshPatched))setTimeout(patchLoop,125)};patchLoop();scan();
 // IMPORTANT: observe only added element containers that can contain results.
 // The previous document-wide characterData observer reacted to the badge text
 // that scan() itself changed, creating a self-sustaining requestAnimationFrame
 // loop and eventually pegging the browser. This observer cannot see its own
 // harmless text rewrites, so it cannot feed back into itself.
 const root=document.body||document.documentElement;
 if(root&&window.MutationObserver){new MutationObserver(mutations=>{for(const m of mutations){for(const n of m.addedNodes||[]){if(n.nodeType!==1)continue;const el=n;if(el.matches?.('.discover-card,#result-box')||el.querySelector?.('.discover-card,#result-box')){scheduleScan();return;}}}}).observe(root,{subtree:true,childList:true});}
 document.addEventListener('matchapp:langchange',()=>{mainSignature='';document.querySelectorAll('.discover-card').forEach(c=>delete c.dataset.integrityLang);scheduleScan();});
 document.addEventListener('matchapp:newmatch',()=>{mainSignature='';scheduleScan(80);setTimeout(()=>{mainSignature='';scheduleScan(0)},850);});
}
window.MatchTitleIntegrity=Object.freeze({canonicalType,findEntry,criteriaSatisfied,hardenPayload,renderRecovery});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
