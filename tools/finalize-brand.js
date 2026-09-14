// Keep generated guides and hand-authored pages on the same accessible brand.
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
const mark='<img class="matchapp-wordmark" src="/assets/brand/matchapp-tv-ai.svg" alt="MatchApp TV Ai" width="368" height="66" decoding="async">';
const name=text=>text.replace(/MatchApp(?:\.tv)?(?! TV Ai)/g,'MatchApp TV Ai').replace(/MatchApp TV Ai AI /g,'MatchApp TV Ai ');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>['node_modules','.git'].includes(e.name)?[]:e.isDirectory()?files(path.join(dir,e.name)):/\.html$/.test(e.name)?[path.join(dir,e.name)]:[]);}
function finalizeBrand(){let count=0;for(const file of files(ROOT)){
 let html=fs.readFileSync(file,'utf8');if(!/<body[\s>]/i.test(html)||file.includes('yandex_'))continue;
 const dom=new JSDOM(html,{includeNodeLocations:true}),doc=dom.window.document,edits=[];
 const replace=(el,text)=>{const at=dom.nodeLocation(el);if(at)edits.push([at.startOffset,at.endOffset,text]);};
 const brand=doc.querySelector('body > header a[href="/index.html"],body > header a[href="/"],body > header a[href="/kids/"],.kids-brand');
 if(brand&&!brand.querySelector('.matchapp-wordmark')){
   const copy=brand.cloneNode(true);copy.removeAttribute('data-i18n');copy.setAttribute('aria-label','MatchApp TV Ai');copy.classList.add('matchapp-brand-link');
   const title=copy.querySelector('.app-title-main,.kids-brand-copy strong');
   if(title)title.innerHTML=mark;
   else {const icon=copy.querySelector('img');copy.innerHTML=(icon?icon.outerHTML:'')+mark;}
   replace(brand,copy.outerHTML);
 }else if(!brand&&!doc.querySelector('.matchapp-wordmark')){
   const at=dom.nodeLocation(doc.body)?.startTag.endOffset;if(at)edits.push([at,at,`\n<div class="matchapp-brand-bar"><a class="matchapp-brand-link" href="/" aria-label="MatchApp TV Ai">${mark}</a></div>\n`]);
 }
 const title=doc.querySelector('title');if(title){const clone=title.cloneNode(true);clone.textContent=name(title.textContent);replace(title,clone.outerHTML);}
 for(const meta of doc.querySelectorAll('meta[property="og:title"],meta[property="og:description"],meta[property="og:site_name"],meta[name="twitter:title"],meta[name="twitter:description"],meta[name="description"],meta[name="application-name"]')){const clone=meta.cloneNode(true);clone.content=meta.getAttribute('property')==='og:site_name'?'MatchApp TV Ai':name(meta.content);replace(meta,clone.outerHTML);}
 for(const block of doc.querySelectorAll('script[type="application/ld+json"]')){try{const data=JSON.parse(block.textContent);function walk(n){if(!n||typeof n!=='object')return;if(n.name&&/^MatchApp(?:\.tv)?(?: TV Ai)?$/.test(n.name))n.name='MatchApp TV Ai';if(n['@type']==='WebSite'&&String(n.url||'').replace(/\/$/,'')==='https://matchapp.tv'){n.name='MatchApp TV Ai';n.alternateName=['MatchApp','MatchApp.tv'];}for(const child of Object.values(n))if(child&&typeof child==='object')Array.isArray(child)?child.forEach(walk):walk(child);}walk(data);const clone=block.cloneNode(false);clone.textContent=JSON.stringify(data).replace(/</g,'\\u003c');replace(block,clone.outerHTML);}catch(_){/* The audit reports invalid original JSON. */}}
 edits.sort((a,b)=>b[0]-a[0]).forEach(([start,end,text])=>html=html.slice(0,start)+text+html.slice(end));
 if(!doc.querySelector('meta[property="og:site_name"]'))html=html.replace('</head>','<meta property="og:site_name" content="MatchApp TV Ai">\n</head>');
 if(!doc.querySelector('link[href^="/brand.css"]'))html=html.replace('</head>','<link rel="stylesheet" href="/brand.css?v=191">\n</head>');
 if(html!==fs.readFileSync(file,'utf8')){fs.writeFileSync(file,html);count++;}dom.window.close();
 }return count;}
module.exports={finalizeBrand};if(require.main===module)console.log('Brand and search identity updated on '+finalizeBrand()+' pages.');
