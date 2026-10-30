'use strict';
// Owns only the dated section and its contextual link; never refreshes live feeds.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=require('../data/october-trends-editorial.json');
const route='/guides/streaming-music-books-october-2026/';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(key,tag='p')=>`<${tag} data-october-copy="${key}">${esc(data.copy.en[key])}</${tag}>`;
const link=(href,key,suffix='')=>`<a href="${esc(href)}"><span data-october-copy="${key}">${esc(data.copy.en[key])}</span>${suffix?' — '+esc(suffix):''}</a>`;
const ask=title=>link('/discover.html?q='+encodeURIComponent(title),'ask',title);
const section=`<!-- october-trends:start -->
<section id="october-15-trends" lang="en" aria-labelledby="october-trends-heading">
<h2 id="october-trends-heading" data-october-copy="heading">${esc(data.copy.en.heading)}</h2>
<time datetime="${data.checked}">${data.checked}</time>
${text('context')}
${text('searchTrends')}<p>${link(data.sources.frightgeist,'source','Google Frightgeist · 2026-10-14')}</p>
<h3>Hocus Pocus (1993) · The Nightmare Before Christmas (1993)</h3>
${text('classics')}<p>${link(data.sources.classics,'source','Disney / Freeform')}</p>
<p>${ask('Hocus Pocus 1993')}<br>${ask('The Nightmare Before Christmas 1993')}</p>
<h3>Passenger (2026) · Other Mommy (2026)</h3>
${text('horror')}<p>${link(data.sources.passenger,'source','Passenger (2026)')}<br>${link(data.sources.otherMommy,'source','Other Mommy')}</p>
<p>${ask('Passenger 2026')}<br>${ask('Other Mommy 2026')}</p>
<h3>East of Eden (2026)</h3>
${text('eden')}<p>${link(data.sources.eden,'source','Netflix Tudum')}<br>${ask('East of Eden 2026 series')}</p>
<h3>Narnia: The Magician's Nephew (2027)</h3>
${text('narnia')}<p>${link(data.sources.narnia,'trailer')}</p>
${text('choose')}<p>${link('/ebooks/','reading')} · ${link('/collections/series/','series')}</p>
</section>
<!-- october-trends:end -->`;
const bookSection=`<!-- october-book-screen:start -->
<section id="october-30-book-screen" lang="en" aria-labelledby="october-book-heading">
<h2 id="october-book-heading" data-october-copy="bookHeading">${esc(data.copy.en.bookHeading)}</h2>
<time datetime="${data.bookScreen.checked}">${data.bookScreen.checked}</time>
${text('bookContext')}
${[['East of Eden (2026)','bookEden','eden'],['Bridgerton','bookBridgerton','bridgerton'],['The Love Hypothesis','bookLove','love'],['Carrie','bookCarrie','carrie']].map(([title,key,source])=>`<h3>${esc(title)}</h3>\n${text(key)}<p>${link(data.bookScreen.sources[source],'source',title)}</p>`).join('\n')}
${text('bookChoose')}<p>${link('/ebooks/','reading')} · ${link('/collections/series/','series')}</p>
</section>
<!-- october-book-screen:end -->`;
const runtime=`/* Authored copy for the dated October editorial sections. No catalog or Kids changes. */
(function(){'use strict';
var copy=${JSON.stringify(data.copy).replace(/</g,'\\u003c')};
function paint(event){
 var saved='';try{saved=localStorage.getItem('match_lang')||''}catch(_){}
 var lang=(event&&event.detail&&event.detail.lang)||saved||window.MATCH_LANG||'en';
 if(lang==='pt'||lang.toLowerCase()==='pt-br')lang='pt-BR';
 var row=copy[lang];if(!row)return;
 document.querySelectorAll('[data-october-copy]').forEach(function(el){var key=el.getAttribute('data-october-copy');if(row[key]){el.textContent=row[key];el.lang=lang;el.dir=lang==='ar'?'rtl':'ltr'}});
 document.querySelectorAll('#october-15-trends, #october-30-book-screen').forEach(function(section){section.lang=lang;section.dir=lang==='ar'?'rtl':'ltr'});
}
document.addEventListener('matchapp:langchange',paint);
window.addEventListener('storage',function(event){if(event.key==='match_lang')paint()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paint,{once:true});else paint();
})();
`;
fs.writeFileSync(path.join(root,'patches/october-trends-locales.js'),runtime);
const script='<script defer src="/patches/october-trends-locales.js?v=20261030-1"></script>';
const refreshScript=src=>src.replace(/\/patches\/october-trends-locales\.js\?v=\d{8}-\d+/g,'/patches/october-trends-locales.js?v=20261030-1');
const monthly=path.join(root,route,'index.html');
let html=fs.readFileSync(monthly,'utf8');
if(html.includes('<!-- october-trends:start -->'))html=html.replace(/<!-- october-trends:start -->[\s\S]*?<!-- october-trends:end -->/,section);
else html=html.replace('<h2>Streaming: Netflix global movies</h2>',section+'\n<h2>Streaming: Netflix global movies</h2>');
if(html.includes('<!-- october-book-screen:start -->'))html=html.replace(/<!-- october-book-screen:start -->[\s\S]*?<!-- october-book-screen:end -->/,bookSection);
else html=html.replace('<!-- october-trends:start -->',bookSection+'\n<!-- october-trends:start -->');
html=refreshScript(html);
if(!html.includes(script))html=html.replace('</head>',script+'\n</head>');
const anchorStyle='<style id="october-trends-anchor-style">#october-15-trends,#october-30-book-screen{scroll-margin-top:112px}</style>';
if(html.includes('id="october-trends-anchor-style"'))html=html.replace(/<style id="october-trends-anchor-style">[\s\S]*?<\/style>/,anchorStyle);
else html=html.replace('</head>',anchorStyle+'\n</head>');
html=html.replace(/"dateModified":"[^"]*"/,'"dateModified":"'+data.bookScreen.checked+'"');
const title='October 2026: Halloween Movies, Books & Music | MatchApp Ai';
const desc='Book or screen first? Compare family drama, slow-burn romance and adult horror, with dated US search context, official sources and country-specific access checks.';
html=html.replace(/<title>[^<]*<\/title>/,'<title>'+esc(title)+'</title>')
 .replace(/(<meta name="description" content=")[^"]*/,(_,prefix)=>prefix+esc(desc))
 .replace(/(<meta property="og:title" content=")[^"]*/,(_,prefix)=>prefix+esc(title))
 .replace(/(<meta property="og:description" content=")[^"]*/,(_,prefix)=>prefix+esc(desc));
fs.writeFileSync(monthly,html);
const guideLink='<p class="intro" data-october-guide-link>'+link(route+'#october-30-book-screen','bookLink')+'</p>';
const weekly=path.join(root,'trending/this-week/index.html');
let trend=fs.readFileSync(weekly,'utf8');
if(trend.includes('data-october-guide-link'))trend=trend.replace(/<p class="intro" data-october-guide-link>[\s\S]*?<\/p>/,guideLink);
else trend=trend.replace('<section class="grid">',guideLink+'<section class="grid">');
trend=refreshScript(trend);
if(!trend.includes(script))trend=trend.replace('</head>',script+'</head>');
fs.writeFileSync(weekly,trend);
// Preserve the link when the existing single publisher next regenerates its page.
const generator=path.join(root,'tools/refresh-trending.mjs');
let src=fs.readFileSync(generator,'utf8');
if(src.includes('data-october-guide-link'))src=src.replace(/<p class="intro" data-october-guide-link>[\s\S]*?<\/p>/,guideLink);
else src=src.replace('<section class="grid">${cards}',guideLink+'<section class="grid">${cards}');
src=refreshScript(src);
if(!src.includes(script))src=src.replace('</style></head>','</style>'+script+'</head>');
fs.writeFileSync(generator,src);
console.log('Updated dated October editorial and persistent weekly guide link in 14 languages.');
