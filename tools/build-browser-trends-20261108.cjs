'use strict';

// A manually reviewed, dated SEO edition. No scheduler or live chart is changed.
const fs = require('node:fs');
const path = require('node:path');
const {cinemaAssets, canonicalFavicons, versionBrandStylesheet} = require('./finalize-brand.js');
const ROOT = path.join(__dirname, '..');
const ORIGIN = 'https://matchapp.tv';
const EDITION = '2026-11-08';
const LANGUAGES = ['en', 'pt-BR'];
const SOURCE = 'data/browser-trends-20261108.json';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, c => ({'<':'\\u003c','>':'\\u003e','&':'\\u0026','\u2028':'\\u2028','\u2029':'\\u2029'}[c]));
const ui = {
  en: {language:'Language',name:'English',checked:'Sources checked',date:'November 8, 2026',onPage:'In this guide',sources:'Sources and dates',sourceNote:'This is a dated editorial guide. A release announcement, a search-interest signal and a weekly viewing chart describe different things. Availability can change by country and account; check the official service before paying.',related:'Keep exploring',motor:'Where to watch Motor City (2026)',picks:'Streaming and music picks for November 8',watch:'Find your next movie or series',music:'Explore music',region:'U.S. streaming guide',regionRoute:'/us/',home:'Home',about:'About',privacy:'Privacy',terms:'Terms',copyright:'Copyright',author:'By MatchApp Ai',faq:'Before you watch',snapshot:'Information checked on the date shown; this page does not claim to be a live ranking.'},
  'pt-BR': {language:'Idioma',name:'Português do Brasil',checked:'Fontes consultadas',date:'8 de novembro de 2026',onPage:'Neste guia',sources:'Fontes e datas',sourceNote:'Este é um guia editorial datado. Um anúncio de estreia, um sinal de interesse nas buscas e um ranking semanal de audiência medem coisas diferentes. A disponibilidade pode mudar conforme o país e a conta; confira o serviço oficial antes de pagar.',related:'Continue explorando',motor:'Motor City (2026): onde assistir',picks:'Streaming e música em 8 de novembro',watch:'Encontre seu próximo filme ou série',music:'Explore música',region:'Guia de streaming no Brasil',regionRoute:'/br/',home:'Início',about:'Sobre',privacy:'Privacidade',terms:'Termos',copyright:'Direitos autorais',author:'Por MatchApp Ai',faq:'Antes de assistir',snapshot:'Informações verificadas na data indicada; esta página não apresenta um ranking ao vivo.'}
};

function safeHref(href) {
  const url = new URL(href, ORIGIN);
  if (url.protocol !== 'https:' || url.username || url.password || (href.startsWith('//'))) throw new Error('Unsafe guide URL: '+href);
  return href;
}

function loadInputs() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, SOURCE), 'utf8'));
  if (data.edition !== EDITION || data.guides.length !== 2) throw new Error('Unexpected edition');
  const routes = new Set();
  for (const guide of data.guides) {
    if (!['motor-city','november-picks'].includes(guide.id)) throw new Error('Unknown guide');
    for (const lang of LANGUAGES) {
      const copy = guide.versions[lang];
      for (const key of ['route','title','description','eyebrow','heading','intro','scope']) {
        if (typeof copy?.[key] !== 'string' || !copy[key].trim()) throw new Error('Missing '+lang+' '+key);
      }
      if (!/^\/(?:guides|pt-br\/guias)\/[a-z0-9-]+\/$/.test(copy.route) || routes.has(copy.route)) throw new Error('Invalid guide route');
      routes.add(copy.route);
      if (copy.description.length < 50 || !copy.sections.length || !copy.sources.length) throw new Error('Incomplete guide');
      const ids = new Set();
      for (const section of copy.sections) {
        if (!/^[a-z0-9-]+$/.test(section.id) || ids.has(section.id) || !section.title || !section.paragraphs?.length) throw new Error('Invalid section');
        ids.add(section.id);
        (section.links || []).forEach(link => safeHref(link.href));
      }
      copy.sources.forEach(source => safeHref(source.url));
    }
    if (guide.versions.en.sections.map(s=>s.id).join('|') !== guide.versions['pt-BR'].sections.map(s=>s.id).join('|')) throw new Error('Translation anchor mismatch');
  }
  return data;
}

function render(guide, lang, data=loadInputs()) {
  const copy = guide.versions[lang], labels = ui[lang], url = ORIGIN + copy.route;
  const title = copy.title + ' | MatchApp Ai';
  const image = ORIGIN + '/assets/brand/matchapp-official-icon-512.webp';
  const button = (href,label) => '<a class="channel-button ust-button" href="'+escape(safeHref(href))+'">'+escape(label)+'</a>';
  const organization = {'@type':'Organization',name:'MatchApp Ai',url:ORIGIN+'/about.html',logo:{'@type':'ImageObject',url:image,width:512,height:512}};
  const schema = {'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':url+'#page',url,name:copy.heading,description:copy.description,inLanguage:lang,isPartOf:{'@type':'WebSite',name:'MatchApp Ai',url:ORIGIN+'/'},mainEntity:{'@id':url+'#article'}},
    {'@type':'Article','@id':url+'#article',mainEntityOfPage:{'@id':url+'#page'},headline:copy.heading,description:copy.description,inLanguage:lang,datePublished:EDITION,dateModified:EDITION,author:organization,publisher:organization,image:[image],citation:copy.sources.map(source=>source.url)},
    {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'MatchApp Ai',item:ORIGIN+'/'},{'@type':'ListItem',position:2,name:labels.region,item:ORIGIN+labels.regionRoute},{'@type':'ListItem',position:3,name:copy.heading,item:url}]}
  ]};
  const sections = copy.sections.map(section => `<section class="ust-section" id="${section.id}" aria-labelledby="heading-${section.id}"><article class="ust-card">${section.badge?'<p class="ust-badge">'+escape(section.badge)+'</p>':''}<h2 id="heading-${section.id}">${escape(section.title)}</h2>${section.paragraphs.map(p=>'<p>'+escape(p)+'</p>').join('\n')}${section.links?.length?'<nav class="ust-card-links" aria-label="'+escape(section.title)+'">'+section.links.map(link=>button(link.href,link.label)).join('')+'</nav>':''}</article></section>`).join('\n');
  const faq = copy.faq?.length ? '<section class="ust-section" aria-labelledby="guide-faq"><h2 id="guide-faq">'+escape(labels.faq)+'</h2>'+copy.faq.map(q=>'<details><summary>'+escape(q.question)+'</summary><p>'+escape(q.answer)+'</p></details>').join('')+'</section>' : '';
  const html = `<!doctype html>
<html lang="${lang}" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escape(title)}</title><meta name="description" content="${escape(copy.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}">
${LANGUAGES.map(other=>'<link rel="alternate" hreflang="'+other+'" href="'+ORIGIN+guide.versions[other].route+'">').join('\n')}
<link rel="alternate" hreflang="x-default" href="${ORIGIN+guide.versions.en.route}">
<meta property="og:type" content="article"><meta property="og:site_name" content="MatchApp Ai"><meta property="og:locale" content="${lang==='en'?'en_US':'pt_BR'}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(copy.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="article:published_time" content="${EDITION}"><meta property="article:modified_time" content="${EDITION}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(copy.description)}"><meta name="twitter:image" content="${image}">
<link rel="stylesheet" href="/brand.css"><link rel="stylesheet" href="/channels/channel.css?v=2"><link rel="stylesheet" href="/trending/us/guide.css?v=20261105-1">
<script type="application/ld+json">${json(schema)}</script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>
<script defer src="/channels/reader.js?v=1"></script><script defer src="/trending/us/guide.js?v=20261105-1"></script><script defer src="/patches/jonas-adult-page.js?v=header20261018-1&subtle=20261101-4"></script><script defer src="/patches/immersive-feedback-20261014.js?v=immersive1&dock=20261020-1"></script>
</head><body class="channel-page us-trends-page" data-us-trends-language="${lang}"><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<main class="channel-layout ust-layout"><header class="channel-header"><a class="matchapp-brand-link" href="/" aria-label="MatchApp Ai"><img class="matchapp-wordmark ma-playai-mark" width="48" height="48" alt="" src="/assets/brand/matchapp-ai-mark.svg">MatchApp Ai</a><details><summary>${escape(labels.language)} · ${escape(labels.name)}</summary><nav class="channel-language-list" aria-label="${escape(labels.language)}">${LANGUAGES.map(other=>'<a class="channel-button" lang="'+other+'" hreflang="'+other+'" href="'+guide.versions[other].route+'"'+(other===lang?' aria-current="page"':'')+'>'+escape(ui[other].name)+'</a>').join('')}</nav></details></header>
<section class="channel-hero ust-hero" aria-labelledby="guide-title"><p class="ust-eyebrow">${escape(copy.eyebrow)}</p><h1 id="guide-title">${escape(copy.heading)}</h1><p class="ust-lede">${escape(copy.intro)}</p><p class="ust-date">${escape(labels.checked)} · <time datetime="${EDITION}">${escape(labels.date)}</time></p><p class="channel-byline">${escape(labels.author)}</p><p class="ust-archive">${escape(copy.scope)} ${escape(labels.snapshot)}</p><nav aria-label="${escape(labels.onPage)}">${copy.sections.map(section=>button('#'+section.id,section.title)).join('')}</nav></section>
${sections}
${faq}
<section class="ust-section" aria-labelledby="guide-related"><h2 id="guide-related">${escape(labels.related)}</h2><nav>${data.guides.filter(peer=>peer.id!==guide.id).map(peer=>button(peer.versions[lang].route,peer.id==='motor-city'?labels.motor:labels.picks)).join('')}${button('/discover.html',labels.watch)}${button('/music.html',labels.music)}${button(labels.regionRoute,labels.region)}</nav></section>
<section class="ust-section ust-method" id="sources" aria-labelledby="guide-sources"><h2 id="guide-sources">${escape(labels.sources)}</h2><p>${escape(labels.sourceNote)}</p><ul>${copy.sources.map((source,index)=>'<li id="source-'+(index+1)+'"><a href="'+escape(source.url)+'">'+escape(source.label)+'</a><span>'+escape(source.period)+'</span></li>').join('')}</ul></section>
<footer class="ust-footer"><nav>${button('/',labels.home)}${button('/about.html',labels.about)}${button('/privacy.html',labels.privacy)}${button('/terms.html',labels.terms)}${button('/copyright.html',labels.copyright)}</nav><p>© 2026 MatchApp Ai</p></footer></main></body></html>\n`;
  return cinemaAssets(versionBrandStylesheet(canonicalFavicons(html)),copy.route.slice(1)+'index.html');
}

function build() {
  const data = loadInputs();
  const files = [];
  for (const guide of data.guides) for (const lang of LANGUAGES) {
    const relative = guide.versions[lang].route.slice(1)+'index.html';
    const file = path.join(ROOT,relative);
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,render(guide,lang,data));
    files.push(relative);
  }
  console.log('Built '+files.length+' dated, source-linked browser guides.');
}

if (require.main === module) build();
module.exports = {EDITION,LANGUAGES,loadInputs,render};
