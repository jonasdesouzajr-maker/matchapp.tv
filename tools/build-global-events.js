/* Build verified, date-aware MatchApp event guides from official-source records. */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),SITE='https://matchapp.tv';
const events=JSON.parse(fs.readFileSync(path.join(__dirname,'global-events.json'),'utf8'));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const poster=e=>String(e.poster||('/'+e.slug+'.jpg?v=187'));
const date=e=>`<span data-event-date="${esc(e.start)}">${esc(e.start.slice(0,10))}</span> – <span data-event-date="${esc(e.end)}">${esc(e.end.slice(0,10))}</span>`;
const data=e=>`data-event-start="${esc(e.start)}" data-event-end="${esc(e.end)}" data-event-zone="${esc(e.timezone||'UTC')}" data-event-slug="${esc(e.slug)}"`;
const country=e=>`<span class="event-country-chip">${esc(e.flag||'🌍')} ${esc(e.countryLabel||e.location)}</span>`;
const countdown=()=>'<span class="event-countdown" data-event-countdown aria-live="polite"></span>';
const askEvent=e=>'/discover.html?event='+encodeURIComponent('/events/'+e.slug+'/')+'&focus=start';
const askTitle=t=>'/discover.html?title='+encodeURIComponent(t)+'&focus=start&source=event';
const cards=events.map(e=>`<article class="premium-card global-event" ${data(e)}>
<a class="event-poster-link" href="/events/${esc(e.slug)}/"><img src="${esc(poster(e))}" alt="${esc(e.title)} — verified MatchApp event cover" width="1024" height="1536" loading="lazy" decoding="async"></a>
<span data-event-status class="event-badge event-soon">Upcoming</span>
${country(e)}${countdown()}
<h3><a href="/events/${esc(e.slug)}/">${esc(e.title)}</a></h3>
<p>${date(e)}<br>${esc(e.location)}</p>
<p>${esc(e.synopsis)}</p>
<a class="gold-btn" href="${esc(askEvent(e))}">Open event guide</a>
</article>`).join('\n');

function tracker(){return `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-M7J3NNBN');<\/script>`;}
function head({title,description,url,image,keywords,schema,ads=false}){
 return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)} | MatchApp.tv</title><meta name="description" content="${esc(description)}"><meta name="keywords" content="${esc(keywords||'entertainment events, film festivals, comic cons, where to watch, MatchApp event guide')}">
<link rel="canonical" href="${esc(url)}"><meta property="og:site_name" content="MatchApp TV Ai"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(url)}"><meta property="og:type" content="website"><meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(image)}">
<link rel="icon" href="/logo.jpeg?v=2"><link rel="manifest" href="/manifest.json">
<link rel="stylesheet" href="/style.css?v=187"><link rel="stylesheet" href="/themes.css?v=187"><link rel="stylesheet" href="/app-polish.css?v=187"><link rel="stylesheet" href="/app-updates.css?v=187"><link rel="stylesheet" href="/app-install-state.css?v=187"><link rel="stylesheet" href="/brand.css?v=192"><link rel="stylesheet" href="/event-guide.css?v=20260924-event1">
<script src="/i18n.js?v=200"></script><script defer src="/polish-i18n.js?v=191"></script><script defer src="/event-i18n.js?v=187"></script><script defer src="/page-locale.js?v=187"></script><script src="/themes.js?v=187"></script>
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>
${ads?'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.0/dist/umd/supabase.js"></script><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9541435081010948" crossorigin="anonymous"></script>':''}
${tracker()}`;
}
function shell({headHtml,body,archive=false}){
 const ad=archive?'<div class="premium-ad-frame" style="margin:1rem auto;min-height:90px"><ins class="adsbygoogle" style="display:block;min-height:90px" data-ad-client="ca-pub-9541435081010948" data-ad-slot="2595698117" data-ad-format="horizontal" data-full-width-responsive="true"></ins></div>':'';
 return `<!doctype html><html lang="en"><head>${headHtml}</head><body class="event-guide-page"><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<header class="app-header"><a href="/" class="header-brand-area"><img class="brand-logo" src="/logo.jpeg?v=2" width="60" height="60" alt="MatchApp"><span class="app-title-main">MatchApp</span></a><nav><a href="/">Home</a><a href="/events-archive.html">Events</a></nav></header>
<main class="event-guide-main">${body}${ad}</main><footer class="seo-footer"><a href="/events-archive.html">Upcoming global events</a> · <a href="/">MatchApp TV Ai</a> · <a href="mailto:support@matchapp.tv">support@matchapp.tv</a><p>© 2026 MatchApp.tv</p></footer>
<script src="/settings.js?v=20260916-open1"></script><script src="/global-events.js?v=20260924-event1"></script><script src="/build-meta.js?v=20260922-install2"></script><script src="/app-install-state.js?v=20260923-icon4"></script><script src="/install.js?v=20260923-icon4"></script><script src="/app-updates.js?v=191"></script><script src="/tv.js?v=187"></script>${archive?'<script src="/match-localization.js?v=187"></script><script src="/app.js?v=20260924-poster1"></script><script src="/ads-init.js?v=1"></script>':''}</body></html>`;
}
const urls=[];
for(const e of events){
 const url=SITE+'/events/'+e.slug+'/';urls.push(url);
 const image=poster(e).startsWith('http')?poster(e):SITE+poster(e).split('?')[0];
 const schema={'@context':'https://schema.org','@graph':[
  {'@type':'WebPage',name:e.title+' event guide',url,description:e.synopsis,keywords:e.keywords,dateModified:'2026-09-24',isPartOf:{'@type':'WebSite',name:'MatchApp.tv',url:SITE}},
  {'@type':'Event',name:e.title,startDate:e.start,endDate:e.end,eventStatus:'https://schema.org/EventScheduled',eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',location:{'@type':'Place',name:e.location,address:e.address},description:e.synopsis,image,keywords:e.keywords,url:e.official,organizer:{'@type':'Organization',name:e.organizer,url:e.official}},
  {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'MatchApp.tv',item:SITE+'/'},{'@type':'ListItem',position:2,name:'Global events',item:SITE+'/events-archive.html'},{'@type':'ListItem',position:3,name:e.title,item:url}]}
 ]};
 const related=(e.featuredTitles||[]).length?`<section class="premium-card event-title-shelf"><h2>Titles to explore from this event</h2><p>Open a title in MatchApp Ai for synopsis, cast, preview and verified where-to-watch information.</p><div class="event-title-links">${e.featuredTitles.map(t=>`<a href="${esc(askTitle(t))}">${esc(t)}</a>`).join('')}</div></section>`:'';
 const body=`<article class="event-guide" ${data(e)}><div class="event-detail-hero"><div class="event-hero-art"><img src="${esc(poster(e))}" alt="${esc(e.title)} event cover" width="1024" height="1536" fetchpriority="high"></div><div class="event-hero-copy"><div class="event-guide-flags">${country(e)}<span class="event-category">${esc(e.category)}</span></div><span data-event-status class="event-badge event-soon">Upcoming</span>${countdown()}<h1>${esc(e.title)}</h1><p class="event-date-line">${date(e)}<br>${esc(e.location)}</p><p class="event-synopsis">${esc(e.synopsis)}</p><p class="event-art-credit">${esc(e.posterCredit||'MatchApp editorial event cover')}</p><div class="event-primary-actions"><a class="gold-btn" href="${esc(askEvent(e))}">Open in MatchApp Ai</a><a class="event-secondary-btn" href="${esc(e.official)}" target="_blank" rel="noopener noreferrer">Official event</a></div></div></div>
<section id="where-to-watch" class="premium-card event-info-card"><h2>Official programme & viewing information</h2><p>${esc(e.watchInfo)}</p><div class="global-event-links"><a href="${esc(e.watch)}" target="_blank" rel="noopener noreferrer">Official programme / tickets</a><a href="${esc(e.recorded)}" target="_blank" rel="noopener noreferrer">Official media / highlights</a><a href="${esc(e.official)}" target="_blank" rel="noopener noreferrer">Official event</a><a href="${esc(e.source)}" target="_blank" rel="noopener noreferrer">Verified source</a></div></section>
${related}<section class="premium-card event-source-card"><h2>Why it is on MatchApp</h2><p>MatchApp includes this event because it can help people discover films, series, games or screen culture through verified official sources. Dates and event status are date-aware; expired events leave the Home events rail automatically while their public guide remains available for search and reference.</p></section></article>`;
 const dir=path.join(ROOT,'events',e.slug);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'index.html'),shell({headHtml:head({title:e.title+' — event guide, programme & highlights',description:e.synopsis+' '+e.watchInfo,url,image,keywords:e.keywords,schema}),body}));
}
const archiveSchema={'@context':'https://schema.org','@type':'CollectionPage',name:'Upcoming global entertainment events',url:SITE+'/events-archive.html',mainEntity:{'@type':'ItemList',itemListElement:events.map((e,i)=>({'@type':'ListItem',position:i+1,name:e.title,url:urls[i]}))}};
const archiveBody=`<section class="event-archive-hero"><p class="event-eyebrow">MATCHAPP VERIFIED EVENTS</p><h1>Upcoming global entertainment events</h1><p>Film festivals, pop-culture conventions, gaming, sports and esports across the United States, United Kingdom, Canada, Brazil and beyond — with date-aware status, official sources and MatchApp Ai handoff.</p></section><div class="global-event-grid event-archive-grid">${cards}</div>`;
fs.writeFileSync(path.join(ROOT,'events-archive.html'),shell({headHtml:head({title:'Upcoming entertainment events — US, UK, Canada & Brazil',description:'Verified MatchApp guides to current and upcoming entertainment events in the United States, United Kingdom, Canada, Brazil and beyond, with dates, official programmes and title discovery.',url:SITE+'/events-archive.html',image:SITE+'/event-posters/new-york-film-festival-2026.svg',keywords:events.map(e=>e.keywords).join(', '),schema:archiveSchema,ads:true}),body:archiveBody,archive:true}));

const homeSection=`<section id="global-events" class="events-wrapper"><details class="global-events-fold" open><summary class="global-events-summary"><span class="ge-sum-label"><span aria-hidden="true">🌍</span> <span data-i18n="global.heading">Upcoming global events</span></span><span class="ge-sum-count">${events.length}</span><span class="ge-sum-chev" aria-hidden="true">⌄</span></summary><div class="global-events-body"><p class="ge-help">Tap a poster for a MatchApp Ai event guide, official programme links and title discovery.</p><div class="global-event-grid">${cards}</div><a class="ge-archive gold-btn" href="/events-archive.html">All event guides</a></div></details></section>`;
let index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
index=index.replace(/<section id="global-events"[^]*?<\/section>/,homeSection);
fs.writeFileSync(path.join(ROOT,'index.html'),index);
fs.writeFileSync(path.join(__dirname,'event-urls.json'),JSON.stringify(urls,null,2)+'\n');
console.log('Built '+urls.length+' verified event guides.');

// Preserve the shared MatchApp brand on regenerated guides.
require('./finalize-brand.js').finalizeBrand();
