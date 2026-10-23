#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const newsCommerce=require('../news-monetization.js');
const {cinemaAssets}=require('./finalize-brand.js');

const ROOT=path.join(__dirname,'..');
const NEWS=path.join(ROOT,'news');
const ART=path.join(NEWS,'articles');
const SITE='https://matchapp.tv';
const ARCHIVE_LIMIT=1000;
const SPORTS_SNAPSHOT=path.join(NEWS,'sports.json');

const FEEDS=[
  {url:'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',source:'BBC',domains:['bbc.com','bbc.co.uk'],country:'GB',language:'en'},
  {url:'https://feeds.bbci.co.uk/news/world/rss.xml',source:'BBC World',domains:['bbc.com','bbc.co.uk'],country:'GLOBAL',category:'world',language:'en'},
  {url:'https://feeds.bbci.co.uk/news/technology/rss.xml',source:'BBC Technology',domains:['bbc.com','bbc.co.uk'],country:'GLOBAL',category:'world',language:'en'},
  {url:'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',source:'BBC Science',domains:['bbc.com','bbc.co.uk'],country:'GLOBAL',category:'world',language:'en'},
  {url:'https://g1.globo.com/dynamo/pop-arte/rss2.xml',source:'G1',domains:['g1.globo.com'],country:'BR',language:'pt'},
  {url:'https://g1.globo.com/dynamo/mundo/rss2.xml',source:'G1 Mundo',domains:['g1.globo.com'],country:'GLOBAL',category:'world',language:'pt'},
  {url:'https://rss.cnn.com/rss/edition_entertainment.rss',source:'CNN',domains:['cnn.com'],country:'US',language:'en'},
  {url:'https://www.hollywoodreporter.com/feed/',source:'The Hollywood Reporter',domains:['hollywoodreporter.com'],country:'US',language:'en'},
  {url:'https://www.reutersagency.com/feed/?best-topics=entertainment&post_type=best',source:'Reuters',domains:['reuters.com','reutersagency.com'],country:'GLOBAL',language:'en'}
];

const TREND_GEOS=['BR','US','GB','MX','IN'];
const RUMOR=/\b(rumou?r|rumor|boato|reportedly|allegedly|speculation|unconfirmed|supostamente|alegadamente|teria|segundo fontes|fontes dizem|sources say|might be|could be|is said to|insider claims?)\b/i;
const NON_NEWS=/\b(opinion|shopping|coupon|horoscope|quiz|review roundup|opini[aã]o|compras|cupom)\b/i;
const TOPIC=/\b(actor|actress|singer|musician|film|movie|television|tv|streaming|series|album|song|concert|celebrity|award|emmy|oscar|grammy|director|star|music|cinema|atriz|ator|cantor|cantora|filme|cinema|música|musica|álbum|album|série|serie|televisão|televisao)\b/i;
// World headlines need topical relevance and a verified publisher source; do
// not convert unrelated RSS stories or uncertain weather forecasts into news.
const WORLD_TOPIC=/\b(hormuz|shipping|maritime|united nations|un general assembly|diplomacy|climate|hurricane|tropical storm|el ni[nñ]o|artificial intelligence|\bai\b|technology|energy|oil|gas|power grid|international summit|humanitarian|wildfire|flood)\b/i;
const STOP=new Set('the a an and or of for to in on with from at by as is are was were be this that de da do das dos e em para com por no na nos nas um uma o a os as'.split(' '));

const NEWS_ENTITIES=Object.freeze({amp:'&',quot:'"',apos:"'",nbsp:' ',lt:'<',gt:'>'});
const clean=s=>String(s||'')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/<[^>]*>/g,' ')
  // Decode each source entity once; replacement text is not decoded again.
  .replace(/&(amp|quot|apos|nbsp|lt|gt|#(?:[0-9]+|[xX][a-fA-F0-9]+));/g,(entity,name)=>{
    if(name[0]!=='#')return NEWS_ENTITIES[name];
    const hex=name[1]==='x'||name[1]==='X';
    const code=Number.parseInt(name.slice(hex?2:1),hex?16:10);
    return Number.isInteger(code)&&code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)
      ?String.fromCodePoint(code):entity;
  })
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
      const raw=clean(m[1]).replace(/&#0*38;|&#x0*26;/gi,'&');
      const u=new URL(raw,baseUrl);
      if(u.protocol==='https:')return u.href;
    }catch(_){}
  }
  return null;
}

async function enrichMissingImages(items){
  const missing=items.filter(i=>i.category!=='sports'&&!i.image&&i.url);
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

function newsRequestTarget(value,policy){
  let url;
  try{url=new URL(value);}catch(_){throw new Error('Invalid news request URL');}
  if(!policy){
    const feed=FEEDS.find(f=>url.hostname===new URL(f.url).hostname||isAllowed(url.href,f));
    policy=feed
      ?{host:new URL(feed.url).hostname,domains:feed.domains}
      :{host:'trends.google.com',domains:[]};
  }
  const approvedHost=url.hostname===policy.host||policy.domains.some(d=>url.hostname===d||url.hostname.endsWith('.'+d));
  if(url.protocol!=='https:'||url.username||url.password||url.port||!approvedHost){
    throw new Error('Untrusted news request URL');
  }
  return {url,policy};
}

async function get(url,accept){
  let target=newsRequestTarget(url);
  const ac=new AbortController();
  const timer=setTimeout(()=>ac.abort(),10000);
  try{
    for(let redirects=0;;redirects++){
      ac.signal.throwIfAborted();
      const r=await fetch(target.url.href,{
        signal:ac.signal,
        redirect:'manual',
        headers:{
          accept:accept||'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
          'user-agent':'MatchAppNewsBot/1.2 (+https://matchapp.tv/)'
        }
      });
      if([301,302,303,307,308].includes(r.status)){
        try{
          if(redirects>=5)throw new Error('News request redirect limit exceeded');
          const location=r.headers.get('location');
          if(!location)throw new Error('News request redirect has no location');
          // Every hop keeps the initial configured publisher/Trends policy.
          target=newsRequestTarget(new URL(location,target.url).href,target.policy);
        }finally{
          if(r.body)await r.body.cancel();
        }
        continue;
      }
      if(!r.ok){
        if(r.body)await r.body.cancel();
        throw new Error(`HTTP ${r.status}`);
      }
      return await r.text();
    }
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

function iso(v,now=Date.now()){
  if(!v||!String(v).trim())return null;
  const d=new Date(v);
  return !Number.isFinite(d.valueOf())||d.valueOf()>now+3600000?null:d.toISOString();
}

// Rebuild SEO on every check, but only advance modification dates when its
// actual terms/metadata change. Run logs record checks of unchanged sources.
function retainSeoTimestamp(item,previous){
  if(!item.seo||!previous?.seo||!Number.isFinite(Date.parse(previous.seo.seo_generated_at)))return;
  const withoutTime=seo=>Object.fromEntries(Object.entries(seo).filter(([key])=>key!=='seo_generated_at'));
  if(JSON.stringify(withoutTime(item.seo))===JSON.stringify(withoutTime(previous.seo)))
    item.seo.seo_generated_at=previous.seo.seo_generated_at;
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
  if(i.category==='world'){
    const {isoDate,monthEn,monthPt,year}=dateParts(i.published_at);
    const topic=words(i.title).slice(0,6);
    const pt=String(i.language||'en').toLowerCase().startsWith('pt');
    const primary=pt?'notícias do mundo '+isoDate:'world news '+isoDate;
    const short=pt?['notícias do mundo','notícias internacionais',...topic]:['world news','global headlines',...topic];
    const long=pt?[i.title+' '+isoDate,'notícias mundiais '+monthPt+' '+year]:[i.title+' '+isoDate,'world news '+monthEn+' '+year];
    return {
      primary_keyword:primary,short_tail:short,long_tail:long,trend_keywords:[],entity_keywords:topic,
      freshness_keywords:[isoDate],source_keywords:[i.source],
      meta_title:truncateWords(i.title+(pt?' | Notícias do Mundo | MatchApp Ai':' | World News | MatchApp Ai'),60),
      meta_description:truncateWords(pt
        ?'Notícia internacional publicada por '+i.source+' em '+isoDate+'. Abra a fonte original para o contexto completo.'
        :'World report published by '+i.source+' on '+isoDate+'. Open the original report for full context.',158),
      keywords:uniq([primary,...short,...long,...topic,isoDate,i.source]),seo_generated_at:generated
    };
  }
  if(i.category==='sports'){
    const topic=words(i.title).slice(0,8),sport=i.sport||'Sports';
    const {year,isoDate,monthEn}=dateParts(i.published_at);
    const focus=topic.slice(0,5).join(' ')||sport.toLowerCase();
    const short=uniq([sport, sport.toLowerCase()+' news','sports news',
      'latest sports news','today sports headlines',...topic.slice(0,6)]);
    const long=uniq([
      focus+' sports news '+year,
      focus+' latest update '+isoDate,
      sport+' latest news '+monthEn+' '+year,
      i.source+' '+sport.toLowerCase()+' news indexed '+isoDate,
      focus+' '+i.source+' original report'
    ]);
    const sourceKeywords=uniq([i.source,sport+' '+i.source,i.source+' sports headlines']);
    const freshnessKeywords=[isoDate,monthEn+' '+year];
    const primary=focus+' sports news';
    return {
      primary_keyword:primary,short_tail:short,long_tail:long,
      trend_keywords:[],entity_keywords:topic,freshness_keywords:freshnessKeywords,
      source_keywords:sourceKeywords,
      meta_title:truncateWords(i.title+' | '+sport+' | MatchApp Ai',60),
      meta_description:truncateWords(sport+' reporting indexed '+isoDate+'. Open the original publisher through MatchApp Latest News.',158),
      keywords:uniq([primary,...short,...long,...sourceKeywords,...freshnessKeywords]).slice(0,32),
      seo_generated_at:generated
    };
  }
  const topic=words(`${i.person} ${i.title}`).slice(0,10);
  const trend=trends.filter(t=>{
    const tw=words(t);
    if(!tw.length)return false;
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

  const itemLanguage=String(i.language||'en').toLowerCase();
  const primary=trend[0]||(itemLanguage.startsWith('pt')?`${focus} últimas notícias`:`${focus} latest news`);
  const metaTitle=truncateWords(itemLanguage.startsWith('pt')
    ?`${i.title} | Notícias de entretenimento | MatchApp Ai`
    :`${i.title} | Entertainment News | MatchApp Ai`,60);
  const metaDescription=truncateWords(
    itemLanguage.startsWith('pt')
      ?`${i.person?i.person+': ':''}Notícia publicada por ${i.source} em ${isoDate}. Veja a fonte, o horário de publicação e o contexto original no MatchApp Ai.`
      :`${i.person?i.person+': ':''}${i.event_type} update reported by ${i.source} on ${isoDate}. See verified context, publication time and the original source via MatchApp Ai.`,
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
    ...(i.category==='sports'?{}:{datePublished:i.published_at}),
    publisher:{
      '@type':'Organization',
      name:i.source,
      url:i.source_home
    }
  };
}

const LEGACY_BRAND_SUFFIXES=['TV Ai','TV','AI','iA','IA'];
const LEGACY_BRAND_RE=new RegExp('MatchApp (?:'+LEGACY_BRAND_SUFFIXES.join('|')+')','g');
function canonicalBrand(s){return String(s??'').replace(LEGACY_BRAND_RE,'MatchApp Ai');}

const NEWS_COMMERCE_ASSETS='<link rel="stylesheet" href="/news-monetization.css?v=20261017-2">\n<script defer src="/news-monetization.js?v=20261017-2"></script>\n';
const NEWS_NATIVE_ASSETS='<link rel="stylesheet" href="/native-news-slot.css?v=20261017-1">\n<script defer src="/native-news-slot.js?v=20261018-1"></script>\n';
function commerceAttributes(item){
  if(!newsCommerce.eligibleArticle(item))return '';
  return ' data-news-commerce-card data-news-category="'+esc(item.category)+'" data-news-title="'+esc(item.title)+'" data-news-event="'+esc(item.event_type)+'" data-news-description="'+esc(item.description)+'" data-news-source-url="'+esc(item.url)+'"';
}
function commerceSlot(item,language){
  if(!newsCommerce.eligibleArticle(item))return '';
  // A publisher's country/language is not the visitor's country. Hydration
  // may read a real user choice; generated links start with no region claim.
  return '<div class="ma-news-commerce-slot" data-news-commerce-slot lang="'+esc(language)+'" dir="'+(language==='ar'?'rtl':'ltr')+'">'+newsCommerce.contextMarkup(item,'',language)+'</div>';
}

function page(i){
  const language=i.language==='pt'?'pt-BR':(i.language||'en');
  const t=esc(i.title);
  const metaTitle=canonicalBrand(i.seo.meta_title);
  const metaDescription=canonicalBrand(i.seo.meta_description);
  const d=esc(metaDescription);
  const src=esc(i.source);
  const sourceDomain=esc(i.source_domain);
  const orig=esc(i.url);
  const landing=esc(i.landing_url);
  const canon=esc(i.matchapp_url);
  const kw=esc(i.seo.keywords.join(', '));
  const publishedLabel=new Date(i.published_at).toLocaleDateString('en-US',{dateStyle:'long'});
  const publishedTitle=i.category==='sports'&&i.timestamp_kind!=='published'?'First indexed by news discovery':'Original publication';
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
        description:metaDescription,
        keywords:i.seo.keywords.join(', '),
        about:uniq([i.person,i.event_type,...i.seo.short_tail]).slice(0,10).map(name=>({'@type':'Thing',name})),
        mentions:uniq([...i.seo.entity_keywords,...i.seo.trend_keywords]).slice(0,10).map(name=>({'@type':'Thing',name})),
        isBasedOn:i.url,
        citation:i.url,
        mainEntity:sourceCreativeWork(i),
        potentialAction:{'@type':'ViewAction',target:i.landing_url,name:'Open in MatchApp Latest News'},
        publisher:{'@type':'Organization',name:'MatchApp Ai',url:SITE,logo:{'@type':'ImageObject',url:`${SITE}/assets/brand/matchapp-official-icon-512.webp`,width:512,height:512}}
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

  return cinemaAssets(`<!doctype html>
<html lang="${i.language==='pt'?'pt-BR':(i.language||'en')}">
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
<title>${esc(metaTitle)}</title>
<meta name="description" content="${d}">
<meta name="keywords" content="${kw}">
<meta name="author" content="MatchApp Ai">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${canon}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="MatchApp Ai">
<meta property="og:title" content="${esc(metaTitle)}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${canon}">
<meta property="article:published_time" content="${esc(i.discovered_at)}">
<meta property="article:modified_time" content="${esc(i.seo.seo_generated_at||i.discovered_at)}">
<meta property="article:section" content="${i.category==='sports'?'Sports News':i.category==='world'?'World News':'Entertainment News'}">
<meta name="twitter:title" content="${esc(metaTitle)}">
<meta name="twitter:description" content="${d}">
${imageMeta}
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>
<link rel="icon" href="/assets/brand/matchapp-ai-favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/assets/brand/matchapp-ai-favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/matchapp-ai-favicon-32.png">
<link rel="icon" type="image/png" sizes="48x48" href="/assets/brand/matchapp-ai-favicon-48.png">
<link rel="stylesheet" href="/style.css?v=187">
<link rel="stylesheet" href="/brand.css?v=20261018-nativeheader1&amp;frame=20261016-rounded1">
<link rel="stylesheet" href="/brand-headline.css?v=20261019-newsui1">
<link rel="stylesheet" href="/news-ui.css?v=20261019-newsui1">
<script defer src="/news-ui.js?v=20261019-newsui1"></script>
${newsCommerce.eligibleArticle(i)?NEWS_COMMERCE_ASSETS:''}<script defer src="/patches/jonas-adult-page.js?v=header20261018-1&amp;resize=20261022-1&amp;corner=20261020-1&amp;stellar=20261020-1&amp;headerface=20261020-1&amp;ui=20261023-4"></script>
<script defer src="/patches/immersive-feedback-20261014.js?v=immersive1&dock=20261020-1"></script>
<style>
/* Keep article navigation clear of the existing top-right Jonas companion. */
.news-article-header{justify-content:left!important;gap:12px!important}
.news-article-header #matchapp-kids-entry{margin-inline-start:0!important}
</style>
</head>
<body class="news-ui-page">
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
<header class="app-header news-article-header ma-news-header"><div class="ma-brand-lockup"><a href="/" class="ma-brand-home-link" data-news-ui-aria="brandHome" aria-label="MatchApp Ai home" dir="ltr"><span class="ma-brand-orb-stage" aria-hidden="true"><img class="ma-brand-orb" src="/assets/brand/matchapp-ai-mark.svg?v=20261022-vector1" alt="" width="52" height="52" decoding="async"></span><span class="ma-brand-copy ebook-text-wordmark" translate="no" lang="en" dir="ltr" aria-hidden="true"><span class="ma-wordmark"><span class="ma-word-match">Match</span><span class="ma-word-app">App</span></span><span class="ma-word-ai" data-ma-brand-ai>Ai</span></span></a></div></header>
<main style="max-width:780px;margin:40px auto;padding:20px">
  <article class="premium-card" style="padding:24px"${commerceAttributes(i)}>
    <p style="color:#E5C158;font-weight:800"><span data-news-ui="latest">Latest News</span> · <span data-news-ui-event="${esc(i.event_type)}">${esc(i.event_type)}</span></p>
    <h1 data-news-source-title lang="${esc(language)}" dir="auto" translate="no">${t}</h1>
    <p data-news-ui="sourceNote" data-news-source="${src}">${esc(i.description)}</p>${commerceSlot(i,language)}
    <div style="margin:18px 0;padding:14px;border:1px solid rgba(229,193,88,.25);border-radius:12px">
      <strong data-news-ui="verifiedSource">Verified source:</strong> ${src} (${sourceDomain})<br>
      <span><span data-news-ui="${publishedTitle==='Original publication'?'published':'discovered'}">${esc(publishedTitle)}:</span> <time data-news-ui-date="long" datetime="${esc(i.published_at)}">${esc(publishedLabel)}</time></span>
    </div>
    <p><a href="${orig}" target="_blank" rel="noopener noreferrer external" data-news-ui="readAt" data-news-source="${src}">Read the original report at ${src} ↗</a></p>
    <p><a href="${landing}" data-news-ui="openStory">Open this story in MatchApp Ai News →</a></p>
    <p style="font-size:13px;color:#aaa" data-news-ui="attribution">MatchApp links to the original publisher without republishing article bodies. Dates identify publisher-supplied publication times or clearly labeled discovery-index timestamps according to each story's data source.</p>
    <p><a href="/news/" data-news-ui="moreNews">More entertainment, world and sports news</a> · <a href="/" data-news-ui="backHome">Back to MatchApp Ai</a></p>
  </article>
</main>
<script src="/build-meta.js?v=203&polish=20261020-ui1&androidqa=20261021-1"></script>
</body>
</html>`,path.relative(ROOT,path.join(currentSlugDir(i),'index.html')));
}

function hub(items,generated){
  const options=newsCommerce.offersMarkup(newsCommerce.offers,'','en');
  const cards=items.slice(0,24).map(i=>`<article style="padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:14px"${commerceAttributes(i)}>
    <p style="font-size:12px;color:#E5C158"><bdi>${esc(i.source)}</bdi> · <span data-news-ui-event="${esc(i.event_type)}">${esc(i.event_type)}</span> · <time data-news-ui-date="numeric" datetime="${esc(i.published_at)}">${esc(new Date(i.published_at).toLocaleDateString('en-US'))}</time></p>
    <h2 style="font-size:19px" data-news-source-title lang="${esc(i.language==='pt'?'pt-BR':i.language||'en')}" dir="auto" translate="no"><a href="${esc(i.matchapp_url)}">${esc(i.title)}</a></h2>
    <p data-news-ui="sourceNote" data-news-source="${esc(i.source)}">${esc(i.description)}</p>${commerceSlot(i,'en')}
    <p><a href="${esc(i.landing_url)}" data-news-ui="openLatest">Open in Latest News →</a></p>
    <a href="${esc(i.url)}" target="_blank" rel="noopener noreferrer external" data-news-ui="sourceLink">Original source ↗</a>
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
        name:'Latest Entertainment, World and Sports News',
        url:`${SITE}/news/`,
        dateModified:generated,
        description:'An hourly refreshed entertainment and world-news index with country-aware and language-aware presentation, twice-daily verified sports updates, original publisher links and source attribution.',
        isPartOf:{'@type':'WebSite','@id':`${SITE}/#website`,url:`${SITE}/`,name:'MatchApp Ai'},
        about:[
          {'@type':'Thing',name:'Entertainment news'},
          {'@type':'Thing',name:'Film and television'},
          {'@type':'Thing',name:'Music and culture'},
          {'@type':'Thing',name:'Sports reporting'},
          {'@type':'Thing',name:'World news and technology'}
        ],
        mainEntity:{'@type':'ItemList',itemListElement:itemList},
        publisher:{'@type':'Organization',name:'MatchApp Ai',url:SITE,logo:{'@type':'ImageObject',url:`${SITE}/assets/brand/matchapp-official-icon-512.webp`,width:512,height:512}}
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

  return cinemaAssets(`<!doctype html>
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
<title>Latest Entertainment &amp; Sports News | MatchApp Ai</title>
<meta name="description" content="Country-aware and language-aware film, TV, music, world and sports headlines from named publishers. News and SEO refresh hourly, with original source links.">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${SITE}/news/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="MatchApp Ai">
<meta property="og:title" content="Latest Entertainment, World and Sports News | MatchApp Ai">
<meta property="og:description" content="Hourly verified entertainment and world reporting plus twice-daily sports updates with original publisher attribution.">
<meta property="og:url" content="${SITE}/news/">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>
<link rel="icon" href="/assets/brand/matchapp-ai-favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/assets/brand/matchapp-ai-favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/matchapp-ai-favicon-32.png">
<link rel="icon" type="image/png" sizes="48x48" href="/assets/brand/matchapp-ai-favicon-48.png">
<link rel="stylesheet" href="/style.css?v=187">
<link rel="stylesheet" href="/brand.css?v=20261018-nativeheader1&amp;frame=20261016-rounded1">
<link rel="stylesheet" href="/brand-headline.css?v=20261019-newsui1">
<link rel="stylesheet" href="/news-ui.css?v=20261019-newsui1">
<script defer src="/news-ui.js?v=20261019-newsui1"></script>
${options||items.slice(0,24).some(newsCommerce.eligibleArticle)?NEWS_COMMERCE_ASSETS:''}${NEWS_NATIVE_ASSETS}<script defer src="/patches/jonas-adult-page.js?v=header20261018-1&amp;resize=20261022-1&amp;corner=20261020-1&amp;stellar=20261020-1&amp;headerface=20261020-1&amp;ui=20261023-4"></script>
<script defer src="/patches/immersive-feedback-20261014.js?v=immersive1&dock=20261020-1"></script>
</head>
<body class="news-ui-page">
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
<header class="app-header ma-news-header"><div class="ma-brand-lockup"><a href="/" class="ma-brand-home-link" data-news-ui-aria="brandHome" aria-label="MatchApp Ai home" dir="ltr"><span class="ma-brand-orb-stage" aria-hidden="true"><img class="ma-brand-orb" src="/assets/brand/matchapp-ai-mark.svg?v=20261022-vector1" alt="" width="52" height="52" decoding="async"></span><span class="ma-brand-copy ebook-text-wordmark" translate="no" lang="en" dir="ltr" aria-hidden="true"><span class="ma-wordmark"><span class="ma-word-match">Match</span><span class="ma-word-app">App</span></span><span class="ma-word-ai" data-ma-brand-ai>Ai</span></span></a></div></header>
<main style="max-width:1120px;margin:36px auto;padding:18px">
  <a href="/#latest-news" data-news-ui="backLatest">← MatchApp Ai — Latest News</a>
  <h1 data-news-ui="hubTitle">Latest Entertainment, World and Sports News</h1>
  <p data-news-ui="hubIntro">Entertainment and world news refresh hourly; sports links update twice daily. Choose your interface language while original headlines keep the publisher’s language. Open the source for the full story.</p>
  <section aria-labelledby="news-guide-title" style="margin:20px 0 28px;padding:20px;border:1px solid rgba(229,193,88,.22);border-radius:14px;background:rgba(24,16,38,.72)">
    <h2 id="news-guide-title" style="margin-top:0" data-news-ui="howTitle">How MatchApp Ai News works</h2>
    <p data-news-ui="howIntro">Browse headlines from named publishers. Each item keeps its original source link and publication or discovery date. MatchApp Ai does not republish full articles.</p>
    <p data-news-ui="howSources">Stories come from publisher feeds. Filters remove unrelated stories and obvious rumors. The original publisher remains responsible for each report; MatchApp Ai helps you discover it.</p>
    <p><span data-news-ui="exploreLead">Explore the films, series and releases behind the news:</span> <a href="/" data-news-ui="matcher">Entertainment matcher</a> · <a href="/discover.html?focus=start" data-news-ui="askAi">Ask MatchApp Ai</a> · <a href="/where-to-watch/" data-news-ui="whereWatch">Where to watch</a></p>
  <p><span data-news-ui="guidesLead">More guides and discovery:</span> <a href="/guides/streaming-music-books-october-2026/" data-news-ui="octoberGuide">October 2026 streaming, music and books guide</a> · <a href="/guides/coffee-music-tv-trends-september-30-2026/" data-news-ui="septemberGuide">September 30 trends guide</a> · <a href="/anime.html" data-news-ui="anime">Anime Finder</a>.</p>
  </section>
  ${options?'<div data-news-local-offers>'+options+'</div>\n  ':''}<section data-native-news-feed data-news-ui-aria="feedLabel" aria-label="Latest verified entertainment, world and sports headlines" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">${cards}</section>
</main>
<script src="/build-meta.js?v=203&polish=20261020-ui1&androidqa=20261021-1"></script>
</body>
</html>`,'news/index.html');
}

function readSports(){
  if(!fs.existsSync(SPORTS_SNAPSHOT))return {updated_at:null,items:[]};
  try{
    const parsed=JSON.parse(fs.readFileSync(SPORTS_SNAPSHOT,'utf8'));
    const updated=Date.parse(parsed.updated_at);
    if(!Number.isFinite(updated)||updated>Date.now()+3600000){
      console.warn('[sports] invalid snapshot timestamp; preserving archive');
      return {updated_at:parsed.updated_at||null,items:[]};
    }
    const items=Array.isArray(parsed.items)?parsed.items.filter(i=>
      i&&i.category==='sports'&&i.title&&i.id&&
      isAllowed(i.url,{domains:['reuters.com','apnews.com','g1.globo.com','espn.com','espn.com.br','theguardian.com','formula1.com','nba.com','theconversation.com']})&&
      Number.isFinite(Date.parse(i.published_at))&&
      Date.parse(i.published_at)<=Date.now()+3600000&&
      Date.now()-Date.parse(i.published_at)<96*3600000).slice(0,12):[];
    return {updated_at:parsed.updated_at,items};
  }catch(e){console.warn('[sports] invalid optional snapshot: '+e.message);return {updated_at:null,items:[]}}
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
  let fd;
  try{fd=fs.openSync(file,'r+');}
  catch(e){if(e.code==='ENOENT')return false;throw e;}
  try{
    let html=fs.readFileSync(fd,'utf8');
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
    if(changed){
      const bytes=Buffer.from(html,'utf8');
      let offset=0;
      while(offset<bytes.length){
        const written=fs.writeSync(fd,bytes,offset,bytes.length-offset,offset);
        if(written<=0)throw new Error('Could not finish article analytics write');
        offset+=written;
      }
      fs.ftruncateSync(fd,bytes.length);
    }
    return changed;
  }finally{fs.closeSync(fd);}
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
  let generated=new Date().toISOString();
  let priorData=null;
  try{priorData=JSON.parse(fs.readFileSync(path.join(NEWS,'data.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  const priorArchive=readArchive();
  const priorById=new Map(priorArchive.map(i=>[i.id,i]));
  const sportsSnapshot=readSports();

  const [rawParts,trendParts]=await Promise.all([
    Promise.all(FEEDS.map(fetchFeed)),
    Promise.all(TREND_GEOS.map(trendSeeds))
  ]);

  const raw=rawParts.flat();
  const trends=trendParts.flat();
  const seen=new Set();
  const collected=[];
  let invalidDates=0;

  for(const r of raw){
    const title=clean(r.title);
    const url=r.link;

    if(!isAllowed(url,r.feed)||title.length<18||title.length>220||RUMOR.test(title)||RUMOR.test(r.desc)||NON_NEWS.test(title))continue;
    const isWorld=r.feed.category==='world';
    // Explicit world feeds are already publisher-curated; keep their top
    // headlines broad instead of forcing entertainment-only topic matching.
    if(!isWorld&&!TOPIC.test(`${title} ${r.desc}`))continue;

    const publishedAt=iso(r.published);
    if(!publishedAt){invalidDates++;continue;}

    const key=title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
    if(seen.has(key))continue;
    seen.add(key);

    const id=hash(url);
    const p=person(title);
    const ev=event(title);
    const matchappUrl=`${SITE}/news/articles/${slug(title)}-${id.slice(0,6)}/`;
    const existing=priorById.get(id);

    const item={
      id,
      title,
      url,
      source:r.feed.source,
      source_domain:hostname(url),
      source_home:origin(url),
      country:r.feed.country,
      language:r.feed.language||'en',
      published_at:publishedAt,
      discovered_at:existing&&existing.discovered_at?existing.discovered_at:generated,
      event_type:ev,
      category:isWorld?'world':'entertainment',
      person:p,
      description:isWorld
        ?`World news reported by ${r.feed.source} on ${publishedAt.slice(0,10)}. MatchApp links to the original report for its complete context and ongoing updates.`
        :(r.feed.language==='pt'
          ?`Notícia de entretenimento publicada por ${r.feed.source}. O MatchApp preserva a fonte e o horário de publicação; abra a reportagem original para o contexto completo.`
          :`${p?p+': ':''}${ev.toLowerCase()} headline reported by ${r.feed.source}. MatchApp verifies the publisher link and publication time; open the original report for full context.`),
      image:r.image,
      matchapp_url:matchappUrl,
      landing_url:`${SITE}/?news=${encodeURIComponent(id)}#latest-news`
    };

    // Rebuild SEO on every scheduled refresh so freshness/trend terms rotate
    // with the current headline set instead of preserving stale metadata.
    item.seo=seoFor(item,trends,generated);
    collected.push(item);
  }

  if(invalidDates)console.warn(`[news] skipped ${invalidDates} publisher items with missing or invalid publication dates`);
  collected.sort((a,b)=>b.published_at.localeCompare(a.published_at));
  const sports=sportsSnapshot.items.map(entry=>{
    const existing=priorById.get(entry.id);
    const item={...entry,
      language:entry.language||(entry.country==='BR'?'pt':'en'),
      discovered_at:existing?.discovered_at||sportsSnapshot.updated_at||generated,
      person:'',
      description:entry.sport+' coverage linked to the original publisher '+entry.source+'. MatchApp records when it was indexed; open the source for full context.',
      matchapp_url:existing?.matchapp_url||`${SITE}/news/articles/${slug(entry.title)}-${entry.id.slice(0,6)}/`,
      landing_url:`${SITE}/?news=${encodeURIComponent(entry.id)}#latest-news`
    };
    item.seo=seoFor(item,[],generated);
    return item;
  });
  // Reserve both world and entertainment reporting without allowing either
  // source group to crowd the other out as developing stories accelerate.
  const entertainment=collected.filter(i=>i.category==='entertainment').slice(0,24);
  const worldPool=collected.filter(i=>i.category==='world');
  const worldLanguages=[...new Set(worldPool.map(i=>i.language||'en'))];
  const world=worldLanguages.flatMap(language=>worldPool.filter(i=>(i.language||'en')===language).slice(0,8));
  const items=[...entertainment,...world,...sports].sort((a,b)=>b.published_at.localeCompare(a.published_at)).slice(0,52);
  await enrichMissingImages(items);
  for(const item of items)retainSeoTimestamp(item,priorById.get(item.id));
  if(priorData&&JSON.stringify(items)===JSON.stringify(priorData.items))generated=priorData.generated_at;

  if(collected.length<5)throw new Error(`trusted publisher feeds returned only ${collected.length} usable news items`);

  // Bell notifications change only when actual headlines change, never because
  // a scheduled sports check merely updated its crawl timestamp.
  const feedVersion=hash(items.slice(0,15).map(i=>`${i.id}:${i.published_at}`).join('|')+'|sports:'+items.filter(i=>i.category==='sports').map(i=>i.id).join(','));

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
      sports_updated_at:sportsSnapshot.updated_at,
      source_policy:'direct-trusted-publisher-rss+google-trends-keyword-signals',
      seo_policy:'rebuilt per check; modification dates advance only with content + source citation + stable archive',
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
    sports:items.filter(i=>i.category==='sports').length,
    sports_updated_at:sportsSnapshot.updated_at,
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
