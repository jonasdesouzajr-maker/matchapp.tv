'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {cinemaAssets} = require('./finalize-brand.js');
const copy = require('../channels/copy.json');
const shelves = require('../channels/shelves.json');
const localMedia = require('../channels/local-media.json');
const root = path.join(__dirname, '..');
const origin = 'https://matchapp.tv';
const pages = {tech:['video','podcast','book','audiobook','press'], trail:['screen','album','fiction']};
function route(page, lang) {
  return '/' + (page === 'tech' ? 'tech' : 'catalog-trails') + '/' + (lang === 'en' ? '' : lang.toLowerCase() + '/');
}
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gitLocales = {'pt-BR':'pt-br',es:'es',fr:'fr',de:'de',ja:'ja',ko:'ko',ru:'ru',tr:'tr',zh:'zh'};
function picks(section, lang) {
  const local = localMedia[lang][section];
  const entries = local ? [local, ...shelves[section]] : shelves[section];
  return entries.map(([title, byline, href]) => {
    if (title === 'Pro Git' && gitLocales[lang]) href=href.replace('/en/', '/'+gitLocales[lang]+'/');
    if (title === 'CS50x · Scratch · YouTube' && ['pt-BR','es'].includes(lang)) {
      const pt = lang === 'pt-BR';
      title = pt ? 'CS50x · Aula 0 · Scratch' : 'CS50x · Clase 0 · Scratch';
      href = 'https://www.youtube.com/watch?v='+(pt?'GHZzYAy4NKA':'nfYOp3_SyqM');
      byline = 'Harvard CS50 · YouTube · '+lang;
    }
    return {title,byline,href};
  });
}
function render(page, lang) {
  const t = copy[lang], url = origin + route(page,lang), groups = pages[page];
  const title = t[page] + ' · ' + (page === 'tech' ? t.book : t.screen) + ' | MatchApp Ai';
  const intro = t[page+'Intro'];
  const description = intro.length >= 55 ? intro : intro + ' ' + t[groups[0]+'Note'];
  const others = Object.entries(copy);
  const button = (href,label) => '<a class="channel-button" href="'+esc(href)+'">'+esc(label)+'</a>';
  const section = id => '<article id="'+id+'"><h2>'+esc(t[id])+'</h2><p>'+esc(t[id+'Note'])+'</p><ul>'+picks(id,lang).map(p=>'<li><a rel="external" href="'+esc(p.href)+'"><strong><bdi>'+esc(p.title)+'</bdi></strong><span class="channel-byline"><bdi>'+esc(p.byline)+'</bdi></span></a></li>').join('')+'</ul></article>';
  const listed = groups.flatMap(g=>picks(g,lang));
  const schema = {'@context':'https://schema.org','@type':'CollectionPage',url,name:t[page],description,inLanguage:lang,isPartOf:{'@type':'WebSite',name:'MatchApp Ai',url:origin+'/'}, mainEntity:{'@type':'ItemList',numberOfItems:listed.length,itemListElement:listed.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.title,url:p.href}))}};
  const peer = page === 'tech' ? 'trail' : 'tech';
  const html = `<!doctype html>
<html lang="${lang}" dir="${lang==='ar'?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="keywords" content="${esc(groups.map(g=>t[g]).join(', '))}"><link rel="canonical" href="${url}">
${others.map(([l])=>'<link rel="alternate" hreflang="'+l+'" href="'+origin+route(page,l)+'">').join('\n')}
<link rel="alternate" hreflang="x-default" href="${origin+route(page,'en')}">
<meta property="og:type" content="website"><meta property="og:site_name" content="MatchApp Ai"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${origin}/og-image-v3.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${origin}/og-image-v3.png">
<link rel="icon" href="/assets/brand/matchapp-ai-favicon.svg"><link rel="stylesheet" href="/brand.css"><link rel="stylesheet" href="/channels/channel.css?v=1">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>
<script defer src="/channels/reader.js?v=1"></script><script defer src="/patches/jonas-adult-page.js?v=header20261018-1&amp;subtle=20261101-4"></script>
</head><body class="channel-page"><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript><main class="channel-layout"><header class="channel-header"><a class="matchapp-brand-link" href="/" aria-label="MatchApp Ai"><img width="48" height="48" alt="" src="/assets/brand/matchapp-ai-mark.svg">MatchApp Ai</a><details><summary>${esc(t.language)} · ${esc(t.name)}</summary><nav class="channel-language-list" aria-label="${esc(t.language)}">${others.map(([l,c])=>'<a class="channel-button" lang="'+l+'" hreflang="'+l+'" href="'+route(page,l)+'"'+(lang===l?' aria-current="page"':'')+'>'+esc(c.name)+'</a>').join('')}</nav></details></header>
<div class="channel-hero"><h1>${esc(t[page])}</h1><p>${esc(description)}</p></div>
<nav aria-label="${esc(t[page])}">${groups.map(g=>button('#'+g,t[g])).join('')}</nav><div class="channel-grid">${groups.map(section).join('')}</div>
<p>${esc(t.note)}</p><nav>${button(route(peer,lang),t[peer])}${page==='trail'?button('/where-to-watch/',t.screen)+button('/music.html',t.album)+button('/ebooks/',t.fiction):''}${button('/discover.html','Jonas')}${button('/','MatchApp Ai')}</nav>
</main></body></html>\n`;
  return cinemaAssets(html,route(page,lang).slice(1)+'index.html');
}
function build() {
  const urls=[];
  for (const page of Object.keys(pages)) for (const lang of Object.keys(copy)) {
    urls.push(origin+route(page,lang));
    const dir = path.join(root,route(page,lang));
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),render(page,lang));
  }
  fs.writeFileSync(path.join(root,'tools/discovery-channel-urls.json'),JSON.stringify(urls,null,2)+'\n');
  const labels = Object.fromEntries(Object.entries(copy).map(([lang,t])=>[lang,Object.fromEntries(['tech','trail',...pages.tech].map(key=>[key,t[key]]))]));
  fs.writeFileSync(path.join(root,'channels/labels.js'),'/* Generated by tools/build-discovery-channels.cjs */\nwindow.MatchAppChannelLabels = '+JSON.stringify(labels,null,2)+';\n');
}
if(require.main===module) build();
module.exports={route,pages,render};
