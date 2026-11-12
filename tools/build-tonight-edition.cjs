'use strict';
// Manually researched, dated edition. Never refreshes source data or resumes jobs.
const fs=require('node:fs'),path=require('node:path');
const {cinemaAssets,canonicalFavicons,versionBrandStylesheet,SCRIPT}=require('./finalize-brand.js');
const ROOT=path.join(__dirname,'..'),DATE='2026-11-12',BASE='/trending/'+DATE+'/';
const LOCALES=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh','zh-TW'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=s=>JSON.stringify(s).replace(/</g,'\\u003c');
const route=lang=>BASE+(lang==='en'?'':lang.toLowerCase()+'/');
function load(){
 const data=JSON.parse(fs.readFileSync(path.join(ROOT,BASE,'edition.json')));
 const copies=Object.fromEntries(LOCALES.map(l=>[l,JSON.parse(fs.readFileSync(path.join(ROOT,BASE,'copy',l+'.json')))]));
 const labels=Object.fromEntries(LOCALES.map(l=>[l,JSON.parse(fs.readFileSync(path.join(ROOT,'trending/us/copy',l+'.json')))]));
 for(const [lang,c] of Object.entries(copies)){
  if(Object.keys(c).sort().join()!==Object.keys(copies.en).sort().join()||c.notes.length!==data.items.length||c.choose.length!==3)throw Error('Incomplete edition: '+lang);
  for(const v of Object.values(c).flat())if(typeof v!=='string'||!v.trim())throw Error('Missing copy: '+lang);
 }
 if(data.date!==DATE||new Set(data.items.map(i=>i.id)).size!==6)throw Error('Invalid edition');
 for(const item of data.items){
  if(!data.sources[item.source]||!Number.isInteger(item.rank)||item.rank<1)throw Error('Missing evidence');
  if(item.previous && item.previous<=item.rank)throw Error('Invalid chart rise');
  for(const href of [item.details,data.sources[item.source].url].filter(Boolean)){const u=new URL(href);if(u.protocol!=='https:'||u.username||u.password)throw Error('Unsafe source');}
 }
 return {data,copies,labels};
}
function render(lang,input=load()){
 const {data,copies,labels}=input,c=copies[lang],l=labels[lang],url='https://matchapp.tv'+route(lang),title=c.title+' | MatchApp Ai';
 const button=(href,text)=>`<a class="channel-button ust-button" href="${esc(href)}">${esc(text)}</a>`;
 const schema={'@context':'https://schema.org','@graph':[
  {'@type':'Article',headline:c.title,description:c.description,url,mainEntityOfPage:url,inLanguage:lang,datePublished:DATE,dateModified:DATE,author:{'@type':'Organization',name:'MatchApp Ai',url:'https://matchapp.tv/about.html'},publisher:{'@type':'Organization',name:'MatchApp Ai',url:'https://matchapp.tv/',logo:{'@type':'ImageObject',url:'https://matchapp.tv/assets/brand/matchapp-official-icon-512.webp',width:512,height:512}},image:'https://matchapp.tv/assets/brand/matchapp-official-icon-512.webp',citation:Object.values(data.sources).map(s=>s.url)},
  {'@type':'ItemList',name:c.picksTitle,itemListOrder:'https://schema.org/ItemListUnordered',numberOfItems:6,itemListElement:data.items.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.title,url:url+'#'+item.id}))},
  {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'MatchApp Ai',item:'https://matchapp.tv/'},{'@type':'ListItem',position:2,name:c.title,item:url}]}
 ]};
 const cards=data.items.map((item,i)=>{
  const s=data.sources[item.source],signal=item.previous?l.rise.replace('{previous}',item.previous).replace('{rank}',item.rank):l.rank.replace('{rank}',item.rank);
  return `<article class="ust-card" id="${item.id}" data-trend-id="${item.id}"><h3><bdi>${esc(item.title)}</bdi></h3><p class="ust-signal">${esc(signal)}</p><p>${esc(c.notes[i])}</p><p class="ust-evidence"><a href="#source-${item.source}">${esc(s.name)}</a><span>${esc(s.period)}</span></p><nav class="ust-card-links">${button(s.url,l.source)}${item.details?button(item.details,l.details):''}</nav></article>`;
 }).join('\n');
 const section=(id,heading,text)=>`<section class="ust-section" id="${id}"><h2>${esc(heading)}</h2><p>${esc(text)}</p></section>`;
 let html=`<!doctype html>
<html lang="${lang}" dir="${lang==='ar'?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(c.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}">
${LOCALES.map(other=>`<link rel="alternate" hreflang="${other}" href="https://matchapp.tv${route(other)}">`).join('\n')}<link rel="alternate" hreflang="x-default" href="https://matchapp.tv${route('en')}">
<meta property="og:type" content="article"><meta property="og:site_name" content="MatchApp Ai"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(c.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="https://matchapp.tv/assets/brand/matchapp-official-icon-512.webp"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(c.description)}"><meta name="twitter:image" content="https://matchapp.tv/assets/brand/matchapp-official-icon-512.webp">
${SCRIPT}
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>
<link rel="stylesheet" href="/brand.css"><link rel="stylesheet" href="/channels/channel.css?v=2"><link rel="stylesheet" href="/trending/us/guide.css?v=20261105-1"><script type="application/ld+json">${json(schema)}</script>
<script defer src="/channels/reader.js?v=1"></script><script defer src="/trending/us/guide.js?v=20261105-1"></script><script defer src="/patches/jonas-adult-page.js?v=header20261018-1&subtle=20261101-4"></script></head>
<body class="channel-page us-trends-page" data-us-trends-language="${lang}"><main class="channel-layout ust-layout"><header class="channel-header"><a class="matchapp-brand-link" href="/" aria-label="MatchApp Ai"><img class="matchapp-wordmark ma-playai-mark" width="48" height="48" alt="" src="/assets/brand/matchapp-ai-mark.svg">MatchApp Ai</a><details><summary>${esc(l.language)} · ${esc(l.name)}</summary><nav class="channel-language-list" aria-label="${esc(l.language)}">${LOCALES.map(other=>`<a class="channel-button" lang="${other}" hreflang="${other}" href="${route(other)}"${lang===other?' aria-current="page"':''}>${esc(labels[other].name)}</a>`).join('')}</nav></details></header>
<section class="channel-hero ust-hero"><p class="ust-eyebrow">MatchApp Ai · <time datetime="${DATE}">${new Intl.DateTimeFormat(lang,{dateStyle:'long',timeZone:'UTC'}).format(new Date(DATE+'T12:00:00Z'))}</time></p><h1>${esc(c.heading)}</h1><p class="ust-lede">${esc(c.intro)}</p><p class="ust-archive">${esc(c.archive)}</p><nav>${button('#picks',c.picksTitle)}${button('#choose',c.chooseTitle)}</nav></section>
<section class="ust-section" id="choose"><h2>${esc(c.chooseTitle)}</h2>${c.choose.map(t=>`<p>${esc(t)}</p>`).join('')}<nav>${button('/guides/choose-what-to-watch/',c.guide)}${button('/together.html',c.together)}</nav></section>
<section class="ust-section" id="picks"><h2>${esc(c.picksTitle)}</h2><div class="ust-grid">${cards}</div></section>
${section('access',c.accessTitle,c.access)}${section('next',c.nextTitle,c.next)}
<nav>${button('/discover.html',l.watchLink)}${button('/music.html',l.musicLink)}${button('/ebooks/',l.booksLink)}</nav>
<section class="ust-section ust-method" id="sources"><h2>${esc(c.methodTitle)}</h2><p>${esc(c.method)}</p><ul>${Object.entries(data.sources).map(([id,s])=>`<li id="source-${id}"><a href="${esc(s.url)}">${esc(s.name)}</a><span>${esc(s.period)}</span></li>`).join('')}</ul><nav>${button('/trending/us/2026-11-05/'+(lang==='en'?'':lang.toLowerCase()+'/'),c.previous)}</nav></section>
<footer class="ust-footer"><nav>${button('/',l.home)}${button('/about.html',l.about)}${button('/privacy.html',l.privacy)}${button('/terms.html',l.terms)}</nav><p>© 2026 MatchApp Ai</p></footer></main></body></html>\n`;
 return cinemaAssets(versionBrandStylesheet(canonicalFavicons(html)),route(lang).slice(1)+'index.html');
}
function build(){
 const input=load();
 for(const lang of LOCALES){const dir=path.join(ROOT,route(lang));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),render(lang,input));}
 fs.writeFileSync(path.join(ROOT,'tools/tonight-edition-urls.json'),JSON.stringify(LOCALES.map(l=>'https://matchapp.tv'+route(l)),null,2)+'\n');
 const labels=Object.fromEntries(LOCALES.map(l=>[l,{label:input.copies[l].label,intro:input.copies[l].description,href:route(l)}]));
 fs.writeFileSync(path.join(ROOT,'trending/tonight-labels.js'),'/* Generated by tools/build-tonight-edition.cjs */\nwindow.MatchAppTonight = '+json(labels)+';\n');
 console.log('Built 15 sourced November 12 editions.');
}
if(require.main===module)build();
module.exports={load,render,route,LOCALES,DATE};
