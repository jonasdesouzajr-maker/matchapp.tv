// Keep every public page on the canonical MatchApp brand without localizing the product name.
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
const ADULT='MatchApp Ai',KIDS='MatchApp Ai KIDS';
const mark='<img class="matchapp-wordmark" src="/assets/brand/matchapp-tv-ai-v2.svg" alt="MatchApp Ai" width="600" height="104" decoding="async">';
const kidsMark='<span class="matchapp-wordmark kids-wordmark" role="img" aria-label="MatchApp Ai KIDS">MatchApp Ai KIDS</span>';


function cinemaAssets(html, relativePath) {
  const rel = relativePath.replace(/\\/g, '/');
  if (/^(kids|private-voice|oauth|android-studio|tests|artifacts|reports|node_modules)\//.test(rel) || /^(callback|confirm|yandex_[^/]+)\.html$/.test(rel)) return html;
  // Parse one immutable source snapshot. Only real owned HTML nodes/attributes
  // receive source-range edits; comments, examples and raw script text do not.
  const dom=new JSDOM(html,{includeNodeLocations:true});
  try {
    const doc=dom.window.document,root=dom.nodeLocation(doc.documentElement),head=dom.nodeLocation(doc.head),body=dom.nodeLocation(doc.body);
    const actual=node=>node.namespaceURI==='http://www.w3.org/1999/xhtml'&&!node.closest('svg,math,template');
    for(const node of doc.querySelectorAll('style[data-cinema-layer],script[src]')){
      if(!actual(node)||(node.localName!=='style'&&!/^\/patches\/reference-system\.js(?:\?|$)/.test(node.getAttribute('src'))))continue;
      if(!dom.nodeLocation(node)?.endTag||(node.localName==='script'&&node.textContent.trim())||(node.localName==='style'&&/<\/?(?:style|script)\b/i.test(node.textContent)))throw new Error('Cannot finalize cinema assets: incomplete or nested owned '+node.localName+' element');
    }
    if(!root?.startTag||!head?.startTag||!head.endTag||!body?.startTag)return html;
    const eol=html.includes('\r\n')?'\r\n':'\n',edits=[],insertions=new Map();
    const family=rel==='index.html'?'home':rel==='explore.html'?'explore':'pages',found={system:false,family:false,script:false};
    const escaped=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const insert=(at,text)=>insertions.set(at,(insertions.get(at)||'')+text);
    const attribute=(node,name,replacement)=>{
      const at=dom.nodeLocation(node),range=at?.attrs?.[name];
      if(range)edits.push([range.startOffset,range.endOffset,replacement]);
      else if(at?.startTag)insert(at.startTag.endOffset-(html[at.startTag.endOffset-2]==='/'?2:1),' '+replacement);
    };
    const version=(node,name,value=node.getAttribute(name))=>({current:node.getAttribute(name),next:referenceRuntimeAssetURL(frameStylesheetURL(value))});
    const remove=(node,rawText=false)=>{
      const at=dom.nodeLocation(node);
      // An unterminated raw-text element may consume the rest of the source.
      // Reject it rather than deleting original controls, records or artwork.
      if(!at?.startTag||(rawText&&!at.endTag))throw new Error('Cannot finalize cinema assets: incomplete owned '+node.localName+' element');
      edits.push([at.startOffset,at.endOffset,'']);
    };
    for(const node of doc.querySelectorAll('style[data-cinema-layer]')){
      if(!actual(node))continue;
      remove(node,true);
      const edit=edits[edits.length-1];
      if(html.slice(0,edit[0]).endsWith(eol))edit[0]-=eol.length;
    }
    insert(head.startTag.endOffset,eol+'<style data-cinema-layer>@layer ma-reference;</style>');
    const names=(doc.documentElement.getAttribute('class')||'').split(/\s+/).filter(Boolean),classes=names.filter((name,index)=>name!=='ma-reference'||names.indexOf(name)===index);
    if(!classes.includes('ma-reference'))classes.push('ma-reference');
    if(names.join(' ')!==classes.join(' ')||!doc.documentElement.hasAttribute('class'))attribute(doc.documentElement,'class','class="'+escaped(classes.join(' '))+'"');
    for(const node of doc.querySelectorAll('link[href],script[src]')){
      if(!actual(node))continue;
      const attr=node.localName==='link'?'href':'src',url=node.getAttribute(attr);
      const stylesheet=node.localName==='link'&&(node.getAttribute('rel')||'').toLowerCase().split(/\s+/).includes('stylesheet');
      let {current,next}=node.localName==='script'||stylesheet?version(node,attr):{current:url,next:url};
      const name=stylesheet?url.match(/^\/patches\/reference-(system|home|pages|explore)\.css(?:\?|$)/)?.[1]:null;
      if(name){
        const key=name==='system'?'system':'family';
        if(found[key]){remove(node);continue;}
        found[key]=true;
        if(name!=='system')next=version(node,attr,url.replace(/^\/patches\/reference-(?:home|pages|explore)\.css/,'/patches/reference-'+family+'.css')).next;
        const keys=[];
        if((name==='system'?name:family)!=='explore')keys.push(['premium','20261020-2']);
        if(name==='system')keys.push(['pills','20261020-1'],['headernav','20261020-1']);
        if(keys.length)next=withQueryParams(next,keys);
      }
      if(node.localName==='script'&&/^\/patches\/reference-system\.js(?:\?|$)/.test(url)){
        if(found.script){remove(node,true);continue;}
        found.script=true;
        next=withQueryParams(next,[['dialogs','20261020-1'],['pills','20261020-1'],['headernav','20261020-1']]);
        if(!node.hasAttribute('defer'))attribute(node,'defer','defer');
      }
      if(next!==current)attribute(node,attr,attr+'="'+escaped(next)+'"');
    }
    const assets=[];
    if(!found.system)assets.push('<link rel="stylesheet" href="/patches/reference-system.css?v=20261020-review1&amp;premium=20261020-2&amp;pills=20261020-1&amp;headernav=20261020-1&amp;polish=20261020-ui1">');
    if(!found.family)assets.push('<link rel="stylesheet" href="/patches/reference-'+family+'.css?v=20261020-review1'+(family==='explore'?'':'&amp;premium=20261020-2')+'">');
    if(!found.script)assets.push('<script defer src="/patches/reference-system.js?v=20261020-review1&amp;dialogs=20261020-1&amp;pills=20261020-1&amp;headernav=20261020-1&amp;polish=20261020-ui1"></script>');
    if(assets.length)insert(head.endTag.startOffset,eol+assets.join(eol)+eol);
    for(const [at,text]of insertions)edits.push([at,at,text]);
    edits.sort((a,b)=>b[0]-a[0]||b[1]-a[1]);
    for(const [start,end,text]of edits)html=html.slice(0,start)+text+html.slice(end);
    return html;
  } finally {dom.window.close();}
}
// Existing editorial pages can carry older script URLs when their source data
// is refreshed. Keep their original version and require the approved UI assets.
function withQueryParams(url,entries){
 const hashAt=url.indexOf('#'),fragment=hashAt<0?'':url.slice(hashAt),target=hashAt<0?url:url.slice(0,hashAt),queryAt=target.indexOf('?');
 const pathname=queryAt<0?target:target.slice(0,queryAt),params=new URLSearchParams(queryAt<0?'':target.slice(queryAt+1));
 entries.forEach(([key,value])=>params.set(key,value));
 return pathname+'?'+params.toString()+fragment;
}
function referenceRuntimeAssetURL(url){
 const pins={
  'catalog-media.js':['posters','20261020-1'],'poster-wall.js':['posters','20261020-1'],'trending-rail.js':['posters','20261020-1'],'profile.js':['posters','20261020-1'],'portfolio-history.js':['posters','20261020-1'],'settings.js':['posters','20261020-1'],'title-captions.js':['posters','20261020-1'],
  'app.js':['art','20261020-source1'],'ebook-matcher.js':['art','20261020-source1'],'book-details-20261011.js':['art','20261020-source1'],'reading-ai.js':['art','20261020-source1'],
  'jonas-premium-glass.css':['stellar','20261020-1'],'jonas-premium-enhancer.js':['stellar','20261020-1'],'jonas-adult-page.js':['stellar','20261020-1'],
  'reference-system.css':['premium','20261020-2'],'reference-pages.css':['premium','20261020-2'],'reference-home.css':['premium','20261020-2'],'pricing.js':['premium','20261020-2']
 };
 const dialogs=new Set(['reference-system.js','profile.js','app.js','passkeys.js','pricing.js','settings.js']);
 const pathname=url.split(/[?#]/)[0];
 if(!/^\/[A-Za-z0-9_./-]+$/.test(pathname))return url;
 const file=pathname.split('/').pop(),pin=Object.hasOwn(pins,file)?pins[file]:null;if(!pin&&!dialogs.has(file))return url;
 const entries=[];if(pin)entries.push(pin);if(dialogs.has(file))entries.push(['dialogs','20261020-1']);
 if(file==='reference-system.css'||file==='reference-system.js')entries.push(['pills','20261020-1']);
 return withQueryParams(url,entries);
}
function versionReferenceRuntimeAssets(html){
 return html.replace(/(\b(?:src|href)=["'])(\/[A-Za-z0-9_./-]+)(?:\?([^"']*))?(["'])/g,(all,prefix,url,query,end)=>{
  const value=url+(query===undefined?'':'?'+query.replace(/&amp;/g,'&')),next=referenceRuntimeAssetURL(value);
  return next===value?all:prefix+next.replace(/&/g,'&amp;')+end;
 });
}
function name(text,kids=false){
 let out=String(text??'')
  .replace(/\bMatchApp(?:\s+TV)?\s+(?:Ai|AI|iA|IA)(?:(?:\s+TV)?\s+(?:Ai|AI|iA|IA)|\s+TV)*/g,ADULT)
  .replace(/\bMatchApp\s+TV\b/g,ADULT)
  .replace(/\bMatchApp\s+(?:AI|iA|IA)\b/g,ADULT)
  .replace(/\bMatchApp Ai\s+(?:Kids Mode|Kids)\b/gi,KIDS)
  .replace(/\bMatchApp(?:\.tv)?\s+(?:Kids Mode|Kids)\b/gi,KIDS)
  .replace(/\bKids Mode MatchApp\b/gi,KIDS);
 if(kids)out=out.replace(/\bMatchApp Ai(?!\s+KIDS\b)/g,KIDS);
 return out;
}
function files(dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>
  ['node_modules','.git'].includes(e.name)?[]:
  e.isDirectory()?files(path.join(dir,e.name)):
  /\.html$/.test(e.name)?[path.join(dir,e.name)]:[]);
}
function regionalBrand(brand){
 if(!brand?.closest('.site-header'))return null;
 const copy=brand.cloneNode(true);copy.classList.add('matchapp-brand-link');const images=[...copy.querySelectorAll('img')].filter(img=>img.getAttribute('src')==='/assets/brand/matchapp-tv-ai-v2.svg');
 if(!images.length)return null;
 images[0].classList.add('matchapp-wordmark');
 for(const duplicate of images.slice(1))duplicate.remove();
 return copy.outerHTML;
}
// The homepage cache key must survive every editorial normalization pass.
// Other routes retain their existing stylesheet version; Kids never enters this path.
function versionBrandStylesheet(html,home=false){
 return html.replace(/(href=["']\/brand\.css)(?:\?[^"']*)?(["'])/g,
  '$1?v=20261018-nativeheader1'+(home?'&amp;headerauth=20261016-1':'')+'$2');
}
// Refresh only the shared frame stylesheet, preserving route-specific cache keys.
// This runs for both adult and Kids pages after their existing brand normalization.
function frameStylesheetURL(url){
 if(!/^(?:\/|(?:\.\.\/)+)?brand\.css$/.test(url.split(/[?#]/)[0]))return url;
 return withQueryParams(url,[['frame','20261020-borderless1']]);
}
function versionFrameStylesheet(html){
 return html.replace(/(\bhref=["'](?:\/|(?:\.\.\/)+)?brand\.css)(?:\?([^"']*))?(["'])/g,
  (all,prefix,query,end)=>{
   const value=prefix.slice(6)+(query===undefined?'':'?'+query.replace(/&amp;/g,'&'));
   return prefix.slice(0,6)+frameStylesheetURL(value).replace(/&/g,'&amp;')+end;
  });
}
function finalizeBrand(ownedPaths){
 let count=0;
 for(const file of files(ROOT)){
  const rel=path.relative(ROOT,file).replace(/\\/g,'/');
  if(ownedPaths&&!ownedPaths.some(scope=>rel===scope||(scope.endsWith('/')&&rel.startsWith(scope))))continue;
  let html=fs.readFileSync(file,'utf8');
  if(!/<body[\s>]/i.test(html)||file.includes('yandex_'))continue;
  if(rel.startsWith('private-voice/')||rel.startsWith('android-studio/')||rel.startsWith('tests/')||rel.startsWith('artifacts/')||rel.startsWith('reports/'))continue;
  const kids=rel==='kids/index.html'||rel.startsWith('kids/');
  html=name(html,kids);
  if(kids){
   html=html.replace(/<img\b[^>]*class=(["'])[^"']*\bmatchapp-wordmark\b[^"']*\1[^>]*>/gi,kidsMark);
  }
  const dom=new JSDOM(html,{includeNodeLocations:true}),doc=dom.window.document,edits=[];
  const replace=(el,text)=>{const at=dom.nodeLocation(el);if(at)edits.push([at.startOffset,at.endOffset,text]);};
  const brand=doc.querySelector('body > header a[href="/"],body > header a[href="/kids/"],.hub-header .hub-brand,.kids-brand');
  const regional=regionalBrand(brand);
  if(regional){replace(brand,regional)}
  else if(brand&&!brand.querySelector('.matchapp-wordmark,.ebook-text-wordmark')&&!brand.closest('#home-brand-lockup')){
    const copy=brand.cloneNode(true);
    copy.removeAttribute('data-i18n');
    copy.setAttribute('aria-label',kids?KIDS:ADULT);
    copy.classList.add('matchapp-brand-link');
    const title=copy.querySelector('.app-title-main,.kids-brand-copy strong');
    const chosen=kids?kidsMark:mark;
    if(title)title.innerHTML=chosen;
    else{const icon=copy.querySelector('img');copy.innerHTML=(icon?icon.outerHTML:'')+chosen;}
    replace(brand,copy.outerHTML);
  }else if(!brand&&!doc.querySelector('.matchapp-wordmark')){
    const at=dom.nodeLocation(doc.body)?.startTag.endOffset;
    if(at){
      const chosen=kids?kidsMark:mark,target=kids?'/kids/':'/';
      edits.push([at,at,'\n<div class="matchapp-brand-bar"><a class="matchapp-brand-link" href="'+target+'" aria-label="'+(kids?KIDS:ADULT)+'">'+chosen+'</a></div>\n']);
    }
  }
  edits.sort((a,b)=>b[0]-a[0]).forEach(([start,end,text])=>html=html.slice(0,start)+text+html.slice(end));
  if(!doc.querySelector('link[href^="/brand.css"]'))html=html.replace('</head>','<link rel="stylesheet" href="/brand.css?v=195">\n</head>');
  if(!kids){
    html=versionBrandStylesheet(html,rel==='index.html');
    html=html.replace(/(src=["']\/(?:page-shell|matchapp-ia|daily-checkin)\.js)(?:\?([^"']*))?(["'])/g,function(all,prefix,query,end){
      if((query||'').includes('approvedlogo=20261014'))return all;
      return prefix+'?'+(query?query+'&amp;':'')+'approvedlogo=20261014'+end;
    });
  }
  if(!kids&&!doc.querySelector('script[src^="/patches/jonas-adult-page.js"]'))html=html.replace('</head>','<script defer src="/patches/jonas-adult-page.js?v=header20261018-1&stellar=20261020-1&headerface=20261020-1"></script>\n</head>');
  if(!kids&&!html.includes('/patches/immersive-feedback-20261014.js'))html=html.replace('</head>','<script defer src="/patches/immersive-feedback-20261014.js?v=immersive1&dock=20261020-1"></script>\n</head>');
  html=versionFrameStylesheet(html);
  html=name(html,kids);
  if(!kids)html=cinemaAssets(html,rel);
  const original=fs.readFileSync(file,'utf8');
  if(html!==original){fs.writeFileSync(file,html);count++;}
  dom.window.close();
 }
 return count;
}
module.exports={versionReferenceRuntimeAssets,cinemaAssets,finalizeBrand,regionalBrand,versionBrandStylesheet,versionFrameStylesheet,name,ADULT,KIDS};
if(require.main===module)console.log('Brand identity normalized on '+finalizeBrand()+' pages.');
