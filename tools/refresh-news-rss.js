#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const ROOT=path.join(__dirname,'..');
const NEWS=path.join(ROOT,'news');
const ART=path.join(NEWS,'articles');
const SITE='https://matchapp.tv';
const ARCHIVE_LIMIT=1000;

const FEEDS=[
  {url:'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',source:'BBC',domains:['bbc.com','bbc.co.uk'],country:'GB'},
  {url:'https://g1.globo.com/dynamo/pop-arte/rss2.xml',source:'G1',domains:['g1.globo.com'],country:'BR'},
  {url:'https://rss.cnn.com/rss/edition_entertainment.rss',source:'CNN',domains:['cnn.com'],country:'US'},
  {url:'https://www.hollywoodreporter.com/feed/',source:'The Hollywood Reporter',domains:['hollywoodreporter.com'],country:'US'},
  {url:'https://www.reutersagency.com/feed/?best-topics=entertainment&post_type=best',source:'Reuters',domains:['reuters.com','reutersagency.com'],country:'GLOBAL'}
];

const TREND_GEOS=['BR','US','GB'];
const RUMOR=/\b(rumou?r|rumor|boato|reportedly|allegedly|speculation|unconfirmed|supostamente|alegadamente|teria|segundo fontes|fontes dizem|sources say|might be|could be|is said to|insider claims?)\b/i;
const NON_NEWS=/\b(opinion|shopping|coupon|horoscope|quiz|review roundup|opini[aã]o|compras|cupom)\b/i;
const TOPIC=/\b(actor|actress|singer|musician|film|movie|television|tv|streaming|series|album|song|concert|celebrity|award|emmy|oscar|grammy|director|star|music|cinema|atriz|ator|cantor|cantora|filme|cinema|música|musica|álbum|album|série|serie|televisão|televisao)\b/i;
const STOP=new Set('the a an and or of for to in on with from at by as is are was were be this that de da do das dos e em para com por no na nos nas um uma o a os as'.split(' '));

const clean=s=>String(s||'')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/<[^>]*>/g,' ')
  .replace(/&amp;/g,'&')
  .replace(/&quot;/g,'"')
  .replace(/&#39;|&apos;/g,"'")
  .replace(/&lt;/g,'<')
  .replace(/&gt;/g,'>')
  .replace(/\s+/g,' ')
  .trim();

const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>clean(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'news';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,8);
const words=s=>clean(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(w=>w.length>2&&!STOP.has(w));
const uniq=a=>[...new Set(a.filter(Boolean))];

function hostname(u){
  try{return new URL(u).hostname.toLowerCase().replace(/^www\./,'');}
  catch(_){return'';}
}

function origin(u){
  try{return new URL(u).origin;}
  catch(_){return'';}
}

function isAllowed(url,feed){
  const d=hostname(url);
  return feed.domains.some(x=>d===x||d.endsWith('.'+x));
}

function first(block,tag){
  const m=block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));
  return m?clean(m[1]):'';
}

function atomLink(block){
  const m=block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return m?clean(m[1]):'';
}

function imageFrom(block){
  for(const re of [
    /<media:content\b[^>]*url=["']([^"']+)["']/i,
    /<media:thumbnail\b[^>]*url=["']([^"']+)["']/i,
    /<enclosure\b[^>]*url=["']([^"']+)["'][^>]*type=["']image\//i,
    /<img\b[^>]*src=["']([^"']+)["']/i
  ]){
    const m=block.match(re);
    if(!m)continue;
    try{
      const u=new URL(clean(m[1]));
      if(u.protocol==='https:')return u.href;
    }catch(_){}
  }
  return null;
}

function imageFromArticleHtml(html,baseUrl){
  for(const re of [
    /<meta\b[^>]*(?:property|name)=["'](?:og:image|og:image:url|twitter:image|twitter:image:src)["'][^>]*content=["']([^"']+)["']/i,
    /<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|og:image:url|twitter:image|twitter:image:src)["']/i,
    /<link\b[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
    /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']image_src["']/i
  ]){
    const m=String(html||'').match(re);
    if(!m)continue;
    try{
      const u=new URL(clean(m[1]),baseUrl);
      if(u.protocol==='https:')return u.href;
    }catch(_){}
  }
  return null;
}

async function enrichMissingImages(items){
  const missing=items.filter(i=>!i.image&&i.url);
  await Promise.all(missing.map(async i=>{
    try{
      const html=await get(i.url,'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5');
      const image=imageFromArticleHtml(html,i.url);
      if(image)i.image=image;
    }catch(e){
      console.warn('[news-image] '+i.source+': '+e.message);
    }
  }));
  return items;
}

function parse(xml,feed){
  const blocks=[
    ...(xml.match(/<item\b[\s\S]*?<\/item>/gi)||[]),
    ...(xml.match(/<entry\b[\s\S]*?<\/entry>/gi)||[])
  ];
  return blocks.map(b=>{
    const title=first(b,'title');
    const link=first(b,'link')||atomLink(b);
    const published=first(b,'pubDate')||first(b,'published')||first(b,'updated');
    const desc=first(b,'description')||first(b,'summary');
    return {title,link,published,desc,image:imageFrom(b),feed};
  }).filter(x=>x.title&&x.link);
}

async function get(url,accept){
  const ac=new AbortController();
  const timer=setTimeout(()=>ac.abort(),10000);
  try{
    const r=await fetch(url,{
      signal:ac.signal,
      redirect:'follow',
      headers:{
        accept:accept||'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
        'user-agent':'MatchAppNewsBot/1.2 (+https://matchapp.tv/)'
      }
    });
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return await r.text();
  }finally{
    clearTimeout(timer);
  }
}

async function fetchFeed(feed){
  try{
    const text=await get(feed.url);
    const rows=parse(text,feed);
    console.log(`[news] ${feed.source}: ${rows.length} feed items`);
    return rows;
  }catch(e){
    console.warn(`[news] ${feed.source}: ${e.message}`);
    return [];
  }
}

async function trendSeeds(geo){
  try{
    const xml=await get(`https://trends.google.com/trending/rss?geo=${geo}`);
    const titles=(xml.match(/<title>([\s\S]*?)<\/title>/gi)||[])
      .map(x=>clean(x.replace(/^<title>|<\/title>$/gi,'')))
      .filter(x=>x&&!/daily search trends/i.test(x));
    console.log(`[news-seo] Google Trends ${geo}: ${titles.length}`);
    return titles.slice(0,40);
  }catch(e){
    console.warn(`[news-seo] Trends ${geo}: ${e.message}`);
    return [];
  }
}

function event(title){
  const t=title.toLowerCase();
  if(/\b(dies|died|dead|death|obituary|morre|morreu)\b/.test(t))return'Obituary';
  if(/\b(cast|joins|role|stars in|to star|elenco|papel)\b/.test(t))return'Casting';
  if(/\b(album|single|song|tour|concert|music video|álbum|musica|música|show|turnê|turne)\b/.test(t))return'Music';
  if(/\b(release|premiere|debut|trailer|launch|estreia|lança|lanca|lançamento|lancamento)\b/.test(t))return'Release';
  if(/\b(award|emmy|oscar|grammy|wins|nominated|nomination|prêmio|premio)\b/.test(t))return'Awards';
  return'Entertainment';
}

function person(title){
  const m=clean(title).match(/^([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][\p{L}'’.-]+(?:\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][\p{L}'’.-]+){1,3})\b/u);
  return m?m[1]:'';
}

function iso(v){
  const d=new Date(v);
  return Number.isNaN(d.valueOf())?new Date().toISOString():d.toISOString();
}

function truncateWords(value,max){
  const s=clean(value);
  if(s.length<=max)return s;
  const cut=s.slice(0,Math.max(1,max-1)).replace(/\s+\S*$/,'').trim();
  return `${cut||s.slice(0,max-1).trim()}…`;
}

function dateParts(value){
  const d=new Date(value);
  const valid=Number.isNaN(d.valueOf())?new Date():d;
  const year=valid.getUTCFullYear();
  const isoDate=valid.toISOString().slice(0,10);
  const monthEn=new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(valid);
  const monthPt=new Intl.DateTimeFormat('pt-BR',{month:'long',timeZone:'UTC'}).format(valid);
  return {year,isoDate,monthEn,monthPt};
}

function seoFor(i,trends,generated){
  const topic=words(`${i.person} ${i.title}`).slice(0,10);
  const trend=trends.filter(t=>{
    const tw=words(t);
    const overlap=tw.filter(w=>topic.includes(w));
    return overlap.length>=Math.min(2,tw.length)||Boolean(i.person&&clean(t).toLowerCase().includes(i.person.toLowerCase()));
  }).slice(0,4);

  const focus=i.person||topic.slice(0,4).join(' ')||'entertainment';
  const local=i.country==='BR';
  const ev=i.event_type.toLowerCase();
  const {year,isoDate,monthEn,monthPt}=dateParts(i.published_at);
  const headlinePhrase=topic.slice(0,6).join(' ');

  const short=uniq([
    focus,
    `${focus} news`,
    ev,
    'latest entertainment news',
    'entertainment news',
    local?'notícias de entretenimento':'celebrity news',
    local?'notícias hoje':'entertainment updates',
    ...trend
  ]).slice(0,12);

  const long=uniq([
    `${focus} latest news ${monthEn} ${year}`,
    `${focus} ${ev} update ${year}`,
    `${focus} news ${isoDate}`,
    `latest ${ev} news about ${focus}`,
    `${headlinePhrase} latest update`,
    `${i.source} ${focus} ${ev}`,
    local?`últimas notícias sobre ${focus} ${monthPt} ${year}`:`latest news about ${focus} ${monthEn} ${year}`,
    local?`${focus} notícia de ${isoDate}`:`${focus} entertainment news ${isoDate}`,
    local?`o que aconteceu com ${focus}`:`what happened with ${focus}`
  ]).slice(0,10);

  const entityKeywords=uniq([i.person,...topic.slice(0,8)]).slice(0,9);
  const freshnessKeywords=uniq([
    `${monthEn} ${year}`,
    isoDate,
    local?`${monthPt} ${year}`:'',
    `${focus} ${year}`
  ]).slice(0,5);
  const sourceKeywords=uniq([
    `${i.source} ${focus}`,
    `${i.source_domain} ${focus}`,
    `${i.source} entertainment news`
  ]).slice(0,4);

  const primary=trend[0]||`${focus} latest news`;
  const metaTitle=truncateWords(`${i.title} | Entertainment News | MatchApp TV`,60);
  const metaDescription=truncateWords(
    `${i.person?i.person+': ':''}${i.event_type} update reported by ${i.source} on ${isoDate}. See verified context, publication time and the original source via MatchApp TV.`,
    158
  );

  return {
    primary_keyword:primary,
    short_tail:short,
    long_tail:long,
    trend_keywords:trend,
    entity_keywords:entityKeywords,
    freshness_keywords:freshnessKeywords,
    source_keywords:sourceKeywords,
    meta_title:metaTitle,
    meta_description:metaDescription,
    keywords:uniq([primary,...short,...long,...trend,...entityKeywords,...freshnessKeywords,...sourceKeywords]).slice(0,32),
    seo_generated_at:generated
  };
}

function sourceCreativeWork(i){
  return {
    '@type':'CreativeWork',
    name:i.title,
    url:i.url,
    datePublished:i.published_at,
    publisher:{
      '@type':'Organization',
      name:i.source,
      url:i.source_home
    }
  };
}

function page(i){
  const t=esc(i.title);
  const d=esc(i.seo.meta_description);
  const src=esc(i.source);
  const sourceDomain=esc(i.source_domain);
  const orig=esc(i.url);
  const landing=esc(i.landing_url);
  const canon=esc(i.matchapp_url);
  const kw=esc(i.seo.keywords.join(', '));
  const publishedLabel=new Date(i.published_at).toLocaleDateString('en-US',{dateStyle:'long'});
  const imageMeta=i.image
    ? `<meta property="og:image" content="${esc(i.image)}"><meta name="twitter:image" content="${esc(i.image)}"><meta name="twitter:card" content="summary_large_image">`
    : '<meta name="twitter:card" content="summary">';

  const schema={
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'WebPage',
        '@id':`${i.matchapp_url}#webpage`,
        name:i.title,
        headline:i.title,
        url:i.matchapp_url,
        datePublished:i.discovered_at,
        dateModified:i.seo.seo_generated_at||i.discovered_at,
        description:i.seo.meta_description,
        keywords:i.seo.keywords.join(', '),
        about:uniq([i.person,i.event_type,...i.seo.short_tail]).slice(0,10).map(name=>({'@type':'Thing',name})),
        mentions:uniq([...i.seo.entity_keywords,...i.seo.trend_keywords]).slice(0,10).map(name=>({'@type':'Thing',name})),
        isBasedOn:i.url,
        citation:i.url,
        mainEntity:sourceCreativeWork(i),
        potentialAction:{'@type':'ViewAction',target:i.landing_url,name:'Open in MatchApp Latest News'},
        publisher:{'@type':'Organization',name:'MatchApp TV',url:SITE,logo:{'@type':'ImageObject',url:`${SITE}/assets/brand/matchapp-icon-512.png`,width:512,height:512}}
      },
      {
        '@type':'BreadcrumbList',
        itemListElement:[
          {'@type':'ListItem',position:1,name:'MatchApp',item:`${SITE}/`},
          {'@type':'ListItem',position:2,name:'Latest News',item:`${SITE}/news/`},
          {'@type':'ListItem',position:3,name:i.title,item:i.matchapp_url}
        ]
      }
    ]
  };

  return `<!doctype html>
<html lang="en">
<head>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>
<!-- End Google Tag Manager -->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(i.seo.meta_title)}</title>
<meta name="description" content="${d}">
<meta name="keywords" content="${kw}">
<meta name="author" content="MatchApp TV">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${canon}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="MatchApp TV">
<meta property="og:title" content="${esc(i.seo.meta_title)}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${canon}">
<meta property="article:published_time" content="${esc(i.discovered_at)}">
<meta property="article:modified_time" content="${esc(i.seo.seo_generated_at||i.discovered_at)}">
<meta property="article:section" content="Entertainment News">
<meta name="twitter:title" content="${esc(i.seo.meta_title)}">
<meta name="twitter:description" content="${d}">
${imageMeta}
<script type="application/ld+json">${JSON.stringify(schema)}</script>
<link rel="icon" href="/assets/brand/matchapp-favicon-32.png" type="image/png">
<link rel="stylesheet" href="/style.css?v=187">
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
<header class="app-header"><a href="/" class="matchapp-brand-link" aria-label="MatchApp TV Ai"><span class="brand-logo brand-logo-placeholder" aria-hidden="true"></span><span class="app-title-main"><img class="matchapp-wordmark" src="/assets/brand/matchapp-tv-ai-v2.svg" alt="MatchApp TV Ai" width="368" height="66" decoding="async"></span></a></header>
<main style="max-width:780px;margin:40px auto;padding:20px">
  <article class="premium-card" style="padding:24px">
    <p style="color:#E5C158;font-weight:800">LATEST NEWS · ${esc(i.event_type)}</p>
    <h1>${t}</h1>
    <p>${esc(i.description)}</p>
    <div style="margin:18px 0;padding:14px;border:1px solid rgba(229,193,88,.25);border-radius:12px">
      <strong>Verified source:</strong> ${src} (${sourceDomain})<br>
      <span>Original publication: <time datetime="${esc(i.published_at)}">${esc(publishedLabel)}</time></span>
    </div>
    <p><a href="${orig}" target="_blank" rel="noopener noreferrer external">Read the original report at ${src} ↗</a></p>
    <p><a href="${landing}">Open this story inside MatchApp Latest News →</a></p>
    <p style="font-size:13px;color:#aaa">MatchApp links directly to the original publisher, identifies the source and publication time, and does not republish the article body.</p>
    <p><a href="/news/">More entertainment news</a> · <a href="/">Back to MatchApp</a></p>
  </article>
</main>
<script src="/build-meta.js?v=203"></script>
</body>
</html>`;
}

function hub(items,generated){
  const hubKeywords=uniq(items.flatMap(i=>[
    i.seo.primary_keyword,
    ...i.seo.short_tail.slice(0,3),
    ...i.seo.trend_keywords.slice(0,2)
  ])).slice(0,30);

  const cards=items.slice(0,24).map(i=>`<article style="padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:14px">
    <p style="font-size:12px;color:#E5C158">${esc(i.source)} · ${esc(i.event_type)} · ${esc(new Date(i.published_at).toLocaleDateString('en-US'))}</p>
    <h2 style="font-size:19px"><a href="${esc(i.matchapp_url)}">${esc(i.title)}</a></h2>
    <p>${esc(i.description)}</p>
    <p><a href="${esc(i.landing_url)}">Open in Latest News →</a></p>
    <a href="${esc(i.url)}" target="_blank" rel="noopener noreferrer external">Original source ↗</a>
  </article>`).join('');

  const itemList=items.slice(0,24).map((i,index)=>({
    '@type':'ListItem',
    position:index+1,
    url:i.matchapp_url,
    name:i.title
  }));

  const schema={
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'CollectionPage',
        '@id':`${SITE}/news/#collection`,
        name:'Latest Entertainment News',
        url:`${SITE}/news/`,
        dateModified:generated,
        description:'Verified entertainment headlines linked to original publishers and refreshed hourly.',
        keywords:hubKeywords.join(', '),
        mainEntity:{'@type':'ItemList',itemListElement:itemList},
        publisher:{'@type':'Organization',name:'MatchApp TV',url:SITE,logo:{'@type':'ImageObject',url:`${SITE}/assets/brand/matchapp-icon-512.png`,width:512,height:512}}
      },
      {
        '@type':'BreadcrumbList',
        itemListElement:[
          {'@type':'ListItem',position:1,name:'MatchApp',item:`${SITE}/`},
          {'@type':'ListItem',position:2,name:'Latest News',item:`${SITE}/news/`}
        ]
      }
    ]
  };

  return `<!doctype html>
<html lang="en">
<head>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>
<!-- End Google Tag Manager -->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Latest Entertainment News | MatchApp TV</title>
<meta name="description" content="Verified entertainment headlines about actors, singers, film, TV and music from trusted publishers, refreshed hourly by MatchApp TV.">
<meta name="keywords" content="${esc(hubKeywords.join(', '))}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${SITE}/news/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MatchApp TV">
<meta property="og:title" content="Latest Entertainment News | MatchApp TV">
<meta property="og:description" content="Verified actor, singer, film, TV and music headlines linked to original trusted publishers and refreshed hourly.">
<meta property="og:url" content="${SITE}/news/">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
<link rel="icon" href="/assets/brand/matchapp-favicon-32.png" type="image/png">
<link rel="stylesheet" href="/style.css?v=187">
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
<header class="app-header"><a href="/" class="matchapp-brand-link" aria-label="MatchApp TV Ai"><span class="brand-logo brand-logo-placeholder" aria-hidden="true"></span><span class="app-title-main"><img class="matchapp-wordmark" src="/assets/brand/matchapp-tv-ai-v2.svg" alt="MatchApp TV Ai" width="368" height="66" decoding="async"></span></a></header>
<main style="max-width:1120px;margin:36px auto;padding:18px">
  <a href="/#latest-news">← MatchApp Latest News</a>
  <h1>Latest Entertainment News</h1>
  <p>Verified actor, singer, film, TV and music updates from trusted publishers. Updated hourly, with direct links to every original source.</p>
  <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">${cards}</section>
</main>
<script src="/build-meta.js?v=203"></script>
</body>
</html>`;
}

function readArchive(){
  const file=path.join(NEWS,'archive.json');
  if(!fs.existsSync(file))return [];
  try{
    const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
    return Array.isArray(parsed.items)?parsed.items:[];
  }catch(_){
    return [];
  }
}

function currentSlugDir(i){
  return path.join(ART,new URL(i.matchapp_url).pathname.split('/').filter(Boolean).pop());
}

function ensureArticleAnalyticsFile(file){
  if(!fs.existsSync(file))return false;
  let html=fs.readFileSync(file,'utf8');
  let changed=false;
  if(!html.includes('GTM-M7J3NNBN')){
    const gtmHead=`<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>
<!-- End Google Tag Manager -->`;
    const gtmBody=`<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
    html=html.replace(/<head>/i,'<head>\n'+gtmHead);
    html=html.replace(/<body>/i,'<body>\n'+gtmBody);
    changed=true;
  }else{
    if(!html.includes('googletagmanager.com/gtm.js?id=')){
      const gtmHead=`<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>
<!-- End Google Tag Manager -->`;
      html=html.replace(/<head>/i,'<head>\n'+gtmHead);
      changed=true;
    }
    if(!html.includes('googletagmanager.com/ns.html?id=GTM-M7J3NNBN')){
      const gtmBody=`<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
      html=html.replace(/<body>/i,'<body>\n'+gtmBody);
      changed=true;
    }
  }
  if(changed)fs.writeFileSync(file,html);
  return changed;
}

function enforceArticleAnalyticsOnDisk(){
  if(!fs.existsSync(ART))return 0;
  let changed=0;
  for(const entry of fs.readdirSync(ART,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const file=path.join(ART,entry.name,'index.html');
    if(ensureArticleAnalyticsFile(file))changed++;
  }
  return changed;
}

(async()=>{
  const generated=new Date().toISOString();
  const priorArchive=readArchive();
  const priorById=new Map(priorArchive.map(i=>[i.id,i]));

  const [rawParts,trendParts]=await Promise.all([
    Promise.all(FEEDS.map(fetchFeed)),
    Promise.all(TREND_GEOS.map(trendSeeds))
  ]);

  const raw=rawParts.flat();
  const trends=trendParts.flat();
  const seen=new Set();
  const collected=[];

  for(const r of raw){
    const title=clean(r.title);
    const url=r.link;

    if(!isAllowed(url,r.feed)||title.length<18||title.length>220||RUMOR.test(title)||RUMOR.test(r.desc)||NON_NEWS.test(title))continue;
    if(!TOPIC.test(`${title} ${r.desc}`))continue;

    const key=title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
    if(seen.has(key))continue;
    seen.add(key);

    const id=hash(url);
    const p=person(title);
    const ev=event(title);
    const matchappUrl=`${SITE}/news/articles/${slug(title)}-${id.slice(0,6)}/`;
    const publishedAt=iso(r.published);
    const existing=priorById.get(id);

    const item={
      id,
      title,
      url,
      source:r.feed.source,
      source_domain:hostname(url),
      source_home:origin(url),
      country:r.feed.country,
      published_at:publishedAt,
      discovered_at:existing&&existing.discovered_at?existing.discovered_at:generated,
      event_type:ev,
      person:p,
      description:`${p?p+': ':''}${ev.toLowerCase()} headline reported by ${r.feed.source}. MatchApp verifies the publisher link and publication time; open the original report for full context.`,
      image:r.image,
      matchapp_url:matchappUrl,
      landing_url:`${SITE}/?news=${encodeURIComponent(id)}#latest-news`
    };

    item.seo=existing&&existing.seo?existing.seo:seoFor(item,trends,generated);
    collected.push(item);
  }

  collected.sort((a,b)=>b.published_at.localeCompare(a.published_at));
  const items=collected.slice(0,40);
  await enrichMissingImages(items);

  if(items.length<5)throw new Error(`trusted publisher feeds returned only ${items.length} usable items`);

  const feedVersion=hash(items.slice(0,10).map(i=>`${i.id}:${i.published_at}`).join('|'));

  fs.mkdirSync(NEWS,{recursive:true});
  fs.mkdirSync(ART,{recursive:true});

  const archiveMap=new Map(priorArchive.map(i=>[i.id,i]));
  for(const i of items)archiveMap.set(i.id,i);
  const archive=[...archiveMap.values()]
    .sort((a,b)=>String(b.published_at||'').localeCompare(String(a.published_at||'')))
    .slice(0,ARCHIVE_LIMIT);

  const archiveIds=new Set(archive.map(i=>i.id));

  // Re-render the entire retained archive, not only the newest feed slice.
  // This keeps generator/template fixes (analytics, metadata, accessibility)
  // consistent across every article that still exists on disk.
  for(const i of archive){
    const dir=currentSlugDir(i);
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),page(i));
  }

  for(const old of priorArchive){
    if(archiveIds.has(old.id))continue;
    try{fs.rmSync(currentSlugDir(old),{recursive:true,force:true});}catch(_){}
  }

  // Legacy article directories can outlive the archive manifest. Sweep every
  // public article file on disk so analytics never depends on manifest parity.
  const analyticsRepaired=enforceArticleAnalyticsOnDisk();

  fs.writeFileSync(
    path.join(NEWS,'data.json'),
    JSON.stringify({
      generated_at:generated,
      feed_version:feedVersion,
      source_policy:'direct-trusted-publisher-rss+google-trends-keyword-signals',
      seo_policy:'per-story keyword snapshot at first discovery + source citation + stable archive',
      items
    },null,2)+'\n'
  );

  fs.writeFileSync(
    path.join(NEWS,'archive.json'),
    JSON.stringify({generated_at:generated,limit:ARCHIVE_LIMIT,items:archive},null,2)+'\n'
  );

  fs.writeFileSync(path.join(NEWS,'index.html'),hub(items,generated));

  const newsUrls=[`${SITE}/news/`,...archive.map(i=>i.matchapp_url)];
  fs.writeFileSync(path.join(ROOT,'tools','news-urls.json'),JSON.stringify(newsUrls,null,2)+'\n');

  const sitemapMeta=Object.fromEntries([
    [`${SITE}/news/`,generated],
    ...archive.map(i=>[i.matchapp_url,i.seo&&i.seo.seo_generated_at?i.seo.seo_generated_at:i.discovered_at||i.published_at])
  ]);
  fs.writeFileSync(path.join(ROOT,'tools','news-sitemap-meta.json'),JSON.stringify(sitemapMeta,null,2)+'\n');

  console.log(JSON.stringify({
    ok:true,
    items:items.length,
    archived:archive.length,
    feed_version:feedVersion,
    sources:[...new Set(items.map(i=>i.source))],
    countries:[...new Set(items.map(i=>i.country))],
    analytics_repaired:analyticsRepaired
  }));
})().catch(err=>{
  console.error(`[news] ${err.stack||err.message}`);
  process.exit(1);
});
