// Public editorial pages use only the same reviewed Kids allowlist, never AI-invented titles.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const SITE='https://matchapp.tv';
const SEO_REVISION='2026-09-17';
const src=fs.readFileSync(path.join(root,'kids/kids.js'),'utf8'),a=src.indexOf('  const LIBRARY = [')+'  const LIBRARY = '.length,b=src.indexOf('\n  ];',a)+4;
const titles=vm.runInNewContext(src.slice(a,b));
const links=JSON.parse(fs.readFileSync(path.join(root,'kids/watch-links.json'),'utf8')).titles;
const escape=t=>String(t||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const slug=t=>String(t).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,'-');
const uniq=a=>[...new Set(a.filter(Boolean))];
const style=`:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#21113e;color:#fcf7ff;font:18px/1.65 system-ui}header,main,footer{width:min(1050px,92%);margin:auto}header{padding:24px 0;display:flex;gap:24px;align-items:center}header img{width:64px;border-radius:50%}a{color:#ffda8c}h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.1}h2{line-height:1.3}.title-hero{display:grid;grid-template-columns:minmax(150px,280px) 1fr;gap:32px;align-items:start;margin:32px 0}.title-hero img{width:100%;border-radius:24px}.watch{display:inline-block;background:#ffda8c;color:#21113e;border-radius:14px;padding:14px 20px;margin:8px;text-decoration:none;font-weight:700}.list{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:24px}.list article{background:#362052;border-radius:20px;padding:20px}.list img{width:100%;max-width:160px;aspect-ratio:2/3;object-fit:cover;border-radius:16px}footer{padding:48px 0}.note{color:#e5d8f1}.seo-facts{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}.seo-facts span{padding:6px 10px;border-radius:999px;background:#362052;color:#f4e9ff;font-size:.86rem}.source-note{padding:14px 16px;border-left:4px solid #ffda8c;background:#2d1848;border-radius:10px}.matcher-link{display:inline-block;margin:14px 0 6px;font-weight:800}a:focus-visible{outline:3px solid #a0e9ed;outline-offset:4px}[hidden]{display:none!important}@media(max-width:600px){.title-hero{grid-template-columns:1fr}.title-hero img{max-width:200px}}`;

function ageText(i){
  const bands=i.ages.filter(v=>v!=='all');
  return bands.length?bands.join(', '):'all approved ages';
}
function ageBounds(i){
  const bands=i.ages.filter(v=>v!=='all');
  if(!bands.length)return {min:3,max:12};
  const nums=bands.flatMap(v=>String(v).split('-').map(Number)).filter(Number.isFinite);
  return {min:Math.min(...nums),max:Math.max(...nums)};
}
function typeLabel(i){return i.type==='movie'?'movie':i.type==='music'?'music title':'show';}
function schemaType(i){return i.type==='movie'?'Movie':i.type==='series'?'TVSeries':'CreativeWork';}
function keywordSet(i){
  const year=Number(i.year)||'';
  const decade=year?`${Math.floor(year/10)*10}s`:'';
  const cats=(i.cats||[]).map(String);
  const ages=i.ages.filter(v=>v!=='all');
  return uniq([
    i.title,
    `${i.title} kids`,
    `${i.title} where to watch`,
    `${i.title} age guide`,
    `${i.title} family viewing guide`,
    year?`${i.title} ${year}`:'',
    decade?`${decade} ${typeLabel(i)} for kids`:'',
    ...ages.map(v=>`kids ${typeLabel(i)} ages ${v}`),
    ...cats.map(c=>`${c} kids ${typeLabel(i)}`),
    ...cats.map(c=>`${i.title} ${c}`),
    'safe kids entertainment',
    'age appropriate kids shows',
    'family entertainment finder',
    'MatchApp Kids Mode'
  ]).slice(0,28);
}
function titleName(i){return `${i.title}${i.year?' ('+i.year+')':''} for Kids · Age Guide & Where to Watch`;}
function metaDescription(i){
  const core=`${i.title}${i.year?' ('+i.year+')':''}: ${i.desc}`;
  const suffix=` Kids age bands ${ageText(i)}. Find family-safe discovery context, similar picks and regional viewing guides.`;
  return (core+suffix).slice(0,158).replace(/\s+\S*$/,'').trim()+((core+suffix).length>158?'…':'');
}
function page(title,description,url,body,data,keywords,image){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | MatchApp TV Kids</title><meta name="description" content="${escape(description)}"><meta name="keywords" content="${escape(keywords.join(', '))}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><meta name="author" content="MatchApp TV"><link rel="canonical" href="${url}"><link rel="alternate" hreflang="x-default" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="MatchApp TV"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="og:image:alt" content="${escape(title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${image}"><link rel="icon" href="/kids/kids-logo-sm.jpeg"><style>${style}</style><script type="application/ld+json">${JSON.stringify(data).replace(/</g,'\\u003c')}</script></head><body><header><a href="/kids/"><img src="/kids/kids-logo-sm.jpeg" alt="MatchApp.tv Kids Mode"></a><nav><a href="/kids/#kids-match-stage">Kids matching</a> · <a href="/kids/nostalgia/">Classic cartoon guide</a></nav></header><main>${body}</main><footer><a href="/kids/#kids-match-stage">Find an age-appropriate Kids match</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a><p class="note">Viewing services set their own pricing, availability, dubbing and episode ratings. Ask a grown-up before opening another site. MatchApp is a discovery service.</p></footer><script src="/kids/title-artwork.js?v=186"></script></body></html>\n`;
}

const urls=[];
const sitemapMeta={};
for(const i of titles){
  const id=slug(i.title),url=`${SITE}/kids/titles/${id}/`,dir=path.join(root,'kids/titles',id);
  fs.mkdirSync(dir,{recursive:true});
  urls.push(url);
  sitemapMeta[url]=`${SEO_REVISION}T00:00:00Z`;
  const fallback='https://www.google.com/search?q='+encodeURIComponent(i.title+' '+i.year+' where to watch');
  const regions=links[id]?.regions||{};
  const woody=i.title.includes('Woody Woodpecker')?'<p><strong>Woody Woodpecker / Pica-Pau / El Pájaro Loco</strong></p><p>Prefer dubbed cartoons? Choose the official language channel:</p><a class="watch" data-woody="pt" href="https://www.youtube.com/channel/UCiFg-2CjsG_xcSsHNjDeLpw">Português · Pica-Pau</a><a class="watch" data-woody="es" href="https://www.youtube.com/channel/UCHtZ2_7hd1zy9aCqrrcaqcQ">Español · El Pájaro Loco</a><a class="watch" data-woody="en" href="https://www.youtube.com/channel/UCB2aeGGPNj7l5Z71bYNqX-Q">English · Woody Woodpecker</a>':'';
  const age=ageText(i),desc=metaDescription(i),keywords=keywordSet(i),bounds=ageBounds(i);
  const image=`${SITE}/kids/covers/${id}.svg`;
  const related=titles.filter(t=>t!==i&&((t.year&&i.year&&Math.floor(Number(t.year)/10)===Math.floor(Number(i.year)/10))||(t.cats||[]).some(c=>(i.cats||[]).includes(c)))).slice(0,8);
  const facts=uniq([`${typeLabel(i)}`,i.year?`Original release ${i.year}`:'',`Ages ${age}`,...(i.cats||[])]).map(x=>`<span>${escape(x)}</span>`).join('');
  const body=`<p><a href="/kids/">Kids Mode</a> › Title guide</p><h1>${escape(i.title)}${i.year?' ('+i.year+')':''}: age guide &amp; where to watch</h1><section class="title-hero" data-kids-title="${id}" data-title="${escape(i.title)}" data-year="${i.year}" data-type="${i.type}" data-ages="${i.ages.join(',')}"><img src="/kids/covers/${id}.svg" alt="${escape(i.title)} cover" width="600" height="900"><div><h2>About ${escape(i.title)}</h2><p>${escape(i.desc)}</p><div class="seo-facts">${facts}</div><p><strong>Suggested Kids age bands:</strong> ${age}</p>${i.note?'<p class="note">Parent note: '+escape(i.note==='spooky'?'Spooky mysteries; preview episodes with older kids.':i.note==='peril'?'Contains cartoon action, danger or peril.':'Older cartoons can include slapstick and dated attitudes. Preview individual episodes.')+'</p>':''}<a class="matcher-link" href="/kids/#kids-match-stage">Match ${escape(i.title)} with age, mood, format &amp; decade →</a><h2>Find where to watch ${escape(i.title)}</h2><a class="watch" href="${escape(regions.BR||fallback)}">Brasil · Onde assistir</a><a class="watch" href="${escape(regions.US||fallback)}">United States · Viewing guide</a>${woody}<p class="source-note">Streaming catalogs change by country. MatchApp provides discovery links and title context; the destination service is the source for current availability, subscription terms and episode details.</p></div></section><h2>Similar family picks</h2><ul>${related.map(t=>'<li><a href="/kids/titles/'+slug(t.title)+'/">'+escape(t.title)+(t.year?' ('+t.year+')':'')+'</a></li>').join('')}</ul><h2>Can I match by age, mood and decade?</h2><p>Yes. Kids Mode filters its reviewed allowlist by age band, playful mood, format and decade before it shows a recommendation. Unknown AI suggestions are excluded. <a href="/kids/#kids-match-stage">Try the Kids matcher</a>.</p>`;
  const creative={
    '@type':schemaType(i),
    name:i.title,
    ...(i.year?{datePublished:String(i.year)}:{}),
    genre:i.cats||[],
    isFamilyFriendly:true,
    audience:{'@type':'PeopleAudience',suggestedMinAge:bounds.min,suggestedMaxAge:bounds.max}
  };
  const data={
    '@context':'https://schema.org',
    '@graph':[
      {
        '@type':'WebPage',
        '@id':`${url}#webpage`,
        name:titleName(i),
        description:desc,
        url,
        image,
        keywords:keywords.join(', '),
        dateModified:SEO_REVISION,
        isPartOf:{'@type':'WebSite',name:'MatchApp TV',url:`${SITE}/`},
        about:creative,
        mainEntity:creative,
        audience:{'@type':'PeopleAudience',suggestedMinAge:bounds.min,suggestedMaxAge:bounds.max},
        potentialAction:{'@type':'ViewAction',name:'Open the MatchApp Kids matcher',target:`${SITE}/kids/#kids-match-stage`},
        publisher:{'@type':'Organization',name:'MatchApp TV',url:`${SITE}/`}
      },
      {
        '@type':'BreadcrumbList',
        itemListElement:[
          {'@type':'ListItem',position:1,name:'Kids Mode',item:`${SITE}/kids/`},
          {'@type':'ListItem',position:2,name:i.title,item:url}
        ]
      }
    ]
  };
  fs.writeFileSync(path.join(dir,'index.html'),page(titleName(i),desc,url,body,data,keywords,image));
}

const classics=titles.filter(i=>i.year&&Number(i.year)<2010),hub=`${SITE}/kids/nostalgia/`;
urls.push(hub);
sitemapMeta[hub]=`${SEO_REVISION}T00:00:00Z`;
fs.mkdirSync(path.join(root,'kids/nostalgia'),{recursive:true});
const hubKeywords=uniq(['classic cartoons for kids','1950s cartoons','1960s cartoons','1970s cartoons','1980s cartoons','1990s cartoons','2000s cartoons','family cartoon nostalgia','classic animation where to watch','Woody Woodpecker kids','Pica-Pau kids','Garfield kids','DuckTales kids','Doug cartoon','Smurfs kids','Ben 10 kids','MatchApp Kids classics']);
const body='<h1>Classic cartoons to rediscover: the 1950s to the 2000s</h1><p>Woody Woodpecker (Pica-Pau), Garfield, DuckTales, Doug, the Smurfs and more: an editorial nostalgia collection for families, with original release years, parent notes and regional viewing links. These are favorites, not a popularity ranking.</p><p><a class="watch" href="/kids/#kids-match-stage">Match a cartoon by age, mood and decade</a></p>'+[1950,1960,1970,1980,1990,2000].map(d=>'<section><h2>'+d+'s cartoons &amp; family films</h2><div class="list">'+classics.filter(i=>Number(i.year)>=d&&Number(i.year)<d+10).map(i=>'<article data-ages="'+i.ages.join(',')+'"><a href="/kids/titles/'+slug(i.title)+'/"><img data-kids-art="'+slug(i.title)+'" src="/kids/covers/'+slug(i.title)+'.svg" alt="'+escape(i.title)+' cover" width="160" height="240" loading="lazy"><h3>'+escape(i.title)+' ('+i.year+')</h3></a><p>'+escape(i.desc)+'</p><p>Age bands: '+i.ages.filter(v=>v!=='all').join(', ')+'</p></article>').join('')+'</div></section>').join('');
const hubData={
  '@context':'https://schema.org',
  '@graph':[
    {'@type':'CollectionPage',name:'Classic cartoon nostalgia guide',url:hub,dateModified:SEO_REVISION,keywords:hubKeywords.join(', '),description:'Classic cartoons from the 1950s through the 2000s with age guidance, family context and regional viewing links.',mainEntity:{'@type':'ItemList',itemListElement:classics.map((i,index)=>({'@type':'ListItem',position:index+1,name:i.title,url:`${SITE}/kids/titles/${slug(i.title)}/`}))}},
    {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Kids Mode',item:`${SITE}/kids/`},{'@type':'ListItem',position:2,name:'Classic cartoons',item:hub}]}
  ]
};
fs.writeFileSync(path.join(root,'kids/nostalgia/index.html'),page('Classic Cartoons for Kids · 1950s–2000s Nostalgia','Find classic cartoons including Woody Woodpecker, Garfield, DuckTales, Doug, the Smurfs and Ben 10. Age guidance, title covers and regional viewing links.',hub,body,hubData,hubKeywords,`${SITE}/kids/kids-logo.jpeg`));
fs.writeFileSync(path.join(root,'tools/kids-urls.json'),JSON.stringify(urls,null,2)+'\n');
fs.writeFileSync(path.join(root,'tools/kids-sitemap-meta.json'),JSON.stringify(sitemapMeta,null,2)+'\n');
console.log(`Built ${urls.length} public Kids guides with stable SEO revision ${SEO_REVISION}.`);

// Preserve the shared brand on regenerated guides.
require('./finalize-brand.js').finalizeBrand();
