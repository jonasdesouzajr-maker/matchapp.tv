'use strict';

// An explicitly dated editorial edition. This does not run or resume any scheduler.
const fs = require('node:fs');
const path = require('node:path');
const {cinemaAssets, canonicalFavicons, versionBrandStylesheet} = require('./finalize-brand.js');
const ROOT = path.join(__dirname, '..');
const ORIGIN = 'https://matchapp.tv';
const EDITION = '2026-11-05';
const VERSION = '20261105-1';
const LOCALES = Object.freeze(['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh','zh-TW']);
const GROUPS = Object.freeze(['movies','tv','music','podcasts','books','audiobooks']);
const OG = {en:'en_US','pt-BR':'pt_BR',es:'es_ES',fr:'fr_FR',de:'de_DE',it:'it_IT',tr:'tr_TR',ru:'ru_RU',ar:'ar_SA',hi:'hi_IN',id:'id_ID',ja:'ja_JP',ko:'ko_KR',zh:'zh_CN','zh-TW':'zh_TW'};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, c => ({'<':'\\u003c','>':'\\u003e','&':'\\u0026','\u2028':'\\u2028','\u2029':'\\u2029'}[c]));
const route = lang => {
  if (!LOCALES.includes(lang)) throw new Error('Unsupported trends locale');
  return '/trending/us/' + EDITION + '/' + (lang === 'en' ? '' : lang.toLowerCase() + '/');
};
const languageTag = lang => lang === 'en' ? 'en-US' : lang;
function loadInputs() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT,'trending/us/edition-'+EDITION+'.json'),'utf8'));
  const copies = Object.fromEntries(LOCALES.map(lang => [lang, JSON.parse(fs.readFileSync(path.join(ROOT,'trending/us/copy',lang+'.json'),'utf8'))]));
  function parity(source, target, at) {
    if (typeof source === 'string') {
      if (typeof target !== 'string' || !target.trim()) throw new Error('Missing translation: '+at);
      for (const token of source.match(/\{[a-z]+\}/g) || []) if (!target.includes(token)) throw new Error('Missing placeholder: '+at);
    } else if (Array.isArray(source)) {
      if (!Array.isArray(target) || source.length !== target.length) throw new Error('Translation array mismatch: '+at);
      source.forEach((value,index) => parity(value,target[index],at+'.'+index));
    } else {
      if (!target || Object.keys(source).sort().join('|') !== Object.keys(target).sort().join('|')) throw new Error('Translation keys mismatch: '+at);
      for (const key of Object.keys(source)) parity(source[key],target[key],at+'.'+key);
    }
  }
  for (const [lang,copy] of Object.entries(copies)) parity(copies.en,copy,lang);
  if (data.edition !== EDITION || data.country !== 'US' || data.items.length !== 30 || new Set(data.items.map(i=>i.id)).size !== data.items.length) throw new Error('Invalid U.S. edition');
  for (const item of data.items) {
    if (!/^[a-z0-9-]+$/.test(item.id) || !GROUPS.includes(item.group) || !data.sources[item.source] || !copies.en.notes[item.id]) throw new Error('Invalid trend entry');
    if (item.status === 'rising' && (!Number.isSafeInteger(item.previous) || !(item.previous > item.rank))) throw new Error('Chart climb lacks a valid comparison');
    if (item.rank && (!Number.isSafeInteger(item.rank) || item.rank < 1)) throw new Error('Invalid chart rank');
    if (!['rising','new','popular','interest'].includes(item.status)) throw new Error('Unsupported evidence signal');
    for (const link of [data.sources[item.source].url,item.details].filter(Boolean)) {
      const url = new URL(link);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Unsafe editorial source');
    }
  }
  return {data,copies};
}
function date(value,lang) {
  return new Intl.DateTimeFormat(languageTag(lang),{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
}
function period(source,copy,lang) {
  if (source.start) return copy.period+': '+date(source.start,lang)+' – '+date(source.end,lang);
  if (source.chartDate) return copy.chartDated+': '+date(source.chartDate,lang);
  if (source.weekEnding) return copy.weekEnding+': '+date(source.weekEnding,lang);
  return copy.checked+': '+date(source.snapshot,lang);
}
function signal(item,copy,lang) {
  const number = n => new Intl.NumberFormat(languageTag(lang)).format(n);
  return item.previous ? copy.rise.replace('{previous}',number(item.previous)).replace('{rank}',number(item.rank)) : item.rank ? copy.rank.replace('{rank}',number(item.rank)) : copy.charted;
}
function render(lang,inputs=loadInputs()) {
  const {data,copies}=inputs,copy=copies[lang],url=ORIGIN+route(lang),title=copy.seoTitle+' | MatchApp Ai';
  const image=ORIGIN+'/assets/brand/matchapp-official-icon-512.webp';
  const organizationLogo={'@type':'ImageObject',url:image,width:512,height:512};
  const button=(href,label)=>'<a class="channel-button ust-button" href="'+escape(href)+'">'+escape(label)+'</a>';
  const links={movies:['/discover.html',copy.watchLink],tv:['/discover.html',copy.watchLink],music:['/music.html',copy.musicLink],podcasts:['/catalog-trails/'+(lang==='en'?'':lang.toLowerCase()+'/'),copy.podcastLink],books:['/ebooks/',copy.booksLink],audiobooks:['/ebooks/',copy.booksLink]};
  function card(item) {
    const source=data.sources[item.source];
    return `<article class="ust-card" id="${item.id}" data-trend-id="${item.id}" data-signal="${item.status}"><p class="ust-badge" data-status="${item.status}">${escape(copy[item.status])}</p><h3><bdi>${escape(item.title)}</bdi></h3>${item.creator?'<p class="ust-creator"><bdi>'+escape(item.creator)+'</bdi></p>':''}<p class="ust-signal">${escape(signal(item,copy,lang))}</p><p>${escape(copy.notes[item.id])}</p><p class="ust-evidence"><a href="#source-${item.source}">${escape(copy.sourceLabels[item.source])}</a><span>${escape(period(source,copy,lang))}</span></p><nav class="ust-card-links">${button(source.url,copy.source)}${item.details?button(item.details,copy.details):''}</nav></article>`;
  }
  const schema={'@context':'https://schema.org','@graph':[
    {'@type':'CollectionPage','@id':url+'#page',url,name:copy.heading,description:copy.description,inLanguage:languageTag(lang),datePublished:EDITION,dateModified:EDITION,spatialCoverage:{'@type':'Country',name:'United States'},isPartOf:{'@type':'WebSite',name:'MatchApp Ai',url:ORIGIN+'/'},mainEntity:{'@id':url+'#discoveries'}},
    {'@type':'Article','@id':url+'#article',mainEntityOfPage:{'@id':url+'#page'},headline:copy.heading,description:copy.description,inLanguage:languageTag(lang),datePublished:EDITION,dateModified:EDITION,author:{'@type':'Organization',name:'MatchApp Ai',url:ORIGIN+'/about.html',logo:organizationLogo},publisher:{'@type':'Organization',name:'MatchApp Ai',url:ORIGIN+'/',logo:organizationLogo},image:[image],citation:Object.values(data.sources).map(s=>s.url)},
    {'@type':'ItemList','@id':url+'#discoveries',name:copy.heading,itemListOrder:'https://schema.org/ItemListUnordered',numberOfItems:data.items.length,itemListElement:data.items.map((item,index)=>({'@type':'ListItem',position:index+1,url:url+'#'+item.id,name:item.title+(item.creator?' — '+item.creator:''),description:copy.notes[item.id]}))},
    {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'MatchApp Ai',item:ORIGIN+'/'},{'@type':'ListItem',position:2,name:copy.heading,item:url}]}
  ]};
  const html=`<!doctype html>
<html lang="${languageTag(lang)}" dir="${lang==='ar'?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escape(title)}</title><meta name="description" content="${escape(copy.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}">
${LOCALES.map(other=>'<link rel="alternate" hreflang="'+languageTag(other)+'" href="'+ORIGIN+route(other)+'">').join('\n')}
<link rel="alternate" hreflang="x-default" href="${ORIGIN+route('en')}">
<meta property="og:type" content="article"><meta property="og:site_name" content="MatchApp Ai"><meta property="og:locale" content="${OG[lang]}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(copy.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="article:published_time" content="${EDITION}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(copy.description)}"><meta name="twitter:image" content="${image}">
<link rel="icon" href="/assets/brand/matchapp-ai-favicon.svg"><link rel="stylesheet" href="/brand.css"><link rel="stylesheet" href="/channels/channel.css?v=2"><link rel="stylesheet" href="/trending/us/guide.css?v=${VERSION}">
<script type="application/ld+json">${json(schema)}</script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>
<script defer src="/channels/reader.js?v=1"></script><script defer src="/trending/us/guide.js?v=${VERSION}"></script><script defer src="/patches/jonas-adult-page.js?v=header20261018-1&subtle=20261101-4"></script><script defer src="/patches/immersive-feedback-20261014.js?v=immersive1&dock=20261020-1"></script>
</head><body class="channel-page us-trends-page" data-us-trends-language="${languageTag(lang)}"><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<main class="channel-layout ust-layout"><header class="channel-header"><a class="matchapp-brand-link" href="/" aria-label="MatchApp Ai"><img class="matchapp-wordmark ma-playai-mark" width="48" height="48" alt="" src="/assets/brand/matchapp-ai-mark.svg">MatchApp Ai</a><details><summary>${escape(copy.language)} · ${escape(copy.name)}</summary><nav class="channel-language-list" aria-label="${escape(copy.language)}">${LOCALES.map(other=>'<a class="channel-button" lang="'+other+'" hreflang="'+other+'" href="'+route(other)+'"'+(other===lang?' aria-current="page"':'')+'>'+escape(copies[other].name)+'</a>').join('')}</nav></details></header>
<section class="channel-hero ust-hero" aria-labelledby="ust-title"><p class="ust-eyebrow">${escape(copy.eyebrow)}</p><h1 id="ust-title">${escape(copy.heading)}</h1><p class="ust-lede">${escape(copy.intro)}</p><p class="ust-date">${escape(copy.snapshot)} · <time datetime="${EDITION}">${escape(date(EDITION,lang))}</time></p><p class="ust-archive">${escape(copy.archiveNote)}</p><nav aria-label="${escape(copy.onThisPage)}">${GROUPS.map(group=>button('#'+group,copy.sections[group].title)).join('')}</nav></section>
${GROUPS.map(group=>'<section class="ust-section" id="'+group+'" aria-labelledby="ust-'+group+'"><div class="ust-section-head"><h2 id="ust-'+group+'">'+escape(copy.sections[group].title)+'</h2><p>'+escape(copy.sections[group].intro)+'</p></div><div class="ust-grid">'+data.items.filter(i=>i.group===group).map(card).join('\n')+'</div><nav class="ust-section-next">'+button(...links[group])+'</nav></section>').join('\n')}
<section class="ust-section" aria-labelledby="ust-next"><h2 id="ust-next">${escape(copy.nextHeading)}</h2><div class="ust-ideas">${copy.ideas.map(idea=>'<article><h3>'+escape(idea.title)+'</h3><p>'+escape(idea.text)+'</p></article>').join('')}</div><nav>${button('/discover.html',copy.watchLink)}${button('/music.html',copy.musicLink)}${button('/ebooks/',copy.booksLink)}</nav></section>
<section class="ust-section ust-method" id="sources" aria-labelledby="ust-sources"><h2 id="ust-sources">${escape(copy.sourcesHeading)}</h2><p>${escape(copy.method)}</p><p>${escape(copy.riseNote)}</p><p>${escape(copy.availability)}</p><ul>${Object.entries(data.sources).map(([key,source])=>'<li id="source-'+key+'"><a href="'+escape(source.url)+'">'+escape(copy.sourceLabels[key])+'</a><span>'+escape(period(source,copy,lang))+'</span></li>').join('')}</ul></section>
<footer class="ust-footer"><nav>${button('/',copy.home)}${button('/about.html',copy.about)}${button('/privacy.html',copy.privacy)}${button('/terms.html',copy.terms)}</nav><p>© 2026 MatchApp Ai</p></footer></main></body></html>\n`;
  return cinemaAssets(versionBrandStylesheet(canonicalFavicons(html)),route(lang).slice(1)+'index.html');
}
function build() {
  const inputs=loadInputs(),urls=[];
  for (const lang of LOCALES) {
    const directory=path.join(ROOT,route(lang));
    fs.mkdirSync(directory,{recursive:true});
    fs.writeFileSync(path.join(directory,'index.html'),render(lang,inputs));
    urls.push(ORIGIN+route(lang));
  }
  fs.writeFileSync(path.join(ROOT,'tools/us-trends-urls.json'),JSON.stringify(urls,null,2)+'\n');
  const labels=Object.fromEntries(LOCALES.map(lang=>[lang,{label:inputs.copies[lang].entryLabel,intro:inputs.copies[lang].entryIntro,href:route(lang)}]));
  fs.writeFileSync(path.join(ROOT,'trending/us/labels.js'),'/* Generated by tools/build-us-trends.cjs */\nwindow.MatchAppUSTrends = '+json(labels)+';\n');
  console.log('Built '+LOCALES.length+' translations of the dated U.S. guide with '+inputs.data.items.length+' verified topic entries.');
}
if(require.main===module) build();
module.exports={build,render,route,loadInputs,LOCALES,GROUPS,EDITION,signal,period};
