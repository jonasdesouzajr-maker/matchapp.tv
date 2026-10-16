'use strict';
// One source for generated and already-published provider-page metadata.
// A provider in one region must never be described as a worldwide offer.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function metadata(title,info){
 const year=info.year?` (${info.year})`:'';
 const regions=Object.values(info.regions||{});
 const options=[['stream','streaming'],['rent','rental'],['buy','purchase']].filter(([key])=>regions.some(r=>r[key]?.length)).map(([,label])=>label);
 const kinds=options.length?options.join(', '):'reported provider';
 let description=`Where to watch ${title}${year}: compare ${kinds} options by country. Check regional listings and dated TMDB sources.`;
 if(description.length>158)description=`Where to watch ${title}${year}: compare providers by country, with regional offers and dated TMDB source links.`;
 return {title:`Where to Watch ${title}${year} | MatchApp Ai`,description};
}
function enrichWatchHead(html,title,info){
 const m=metadata(title,info);
 return html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i,head=>{
  head=head.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(m.title)}</title>`);
  function meta(key,value,property=false){const attr=property?'property':'name',rx=new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*\\/?>`,'i'),tag=`<meta ${attr}="${key}" content="${esc(value)}">`;head=rx.test(head)?head.replace(rx,tag):head.replace('</head>',tag+'\n</head>');}
  meta('description',m.description);meta('og:title',m.title,true);meta('og:description',m.description,true);meta('twitter:title',m.title);meta('twitter:description',m.description);meta('og:site_name','MatchApp Ai',true);
  const image=head.match(/<meta property="og:image" content="([^"]*)"/)?.[1]||'https://matchapp.tv/og-image.jpg?v=20260928-brand-preview1',alt='MatchApp Ai — entertainment discovery and where to watch';
  meta('og:image',image,true);meta('og:image:width','1200',true);meta('og:image:height','630',true);meta('og:image:alt',alt,true);meta('twitter:image',image);meta('twitter:image:alt',alt);
  head=head.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi,(all,open,text,close)=>{const data=JSON.parse(text);function visit(n){if(!n||typeof n!=='object')return;if(n['@type']==='ListItem'&&n.item==='https://matchapp.tv/'&&n.name==='MatchApp')n.name='MatchApp Ai';for(const v of Object.values(n))if(v&&typeof v==='object')Array.isArray(v)?v.forEach(visit):visit(v);}visit(data);return open+JSON.stringify(data).replace(/</g,'\\u003c')+close;});return head;
 });
}
module.exports={metadata,enrichWatchHead};
