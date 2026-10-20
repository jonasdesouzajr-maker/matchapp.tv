// Keep every public page on the canonical MatchApp brand without localizing the product name.
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
const ADULT='MatchApp Ai',KIDS='MatchApp Ai KIDS';
const mark='<img class="matchapp-wordmark" src="/assets/brand/matchapp-tv-ai-v2.svg" alt="MatchApp Ai" width="600" height="104" decoding="async">';
const kidsMark='<span class="matchapp-wordmark kids-wordmark" role="img" aria-label="MatchApp Ai KIDS">MatchApp Ai KIDS</span>';


function cinemaAssets(html, relativePath) {
  const rel = relativePath.replace(/\\/g, '/');
  if (/^(kids|private-voice|oauth|android-studio|tests|artifacts|reports|node_modules)\//.test(rel) || /^(callback|confirm|yandex_[^/]+)\.html$/.test(rel) || !/<body[\s>]/i.test(html)) return html;
  html = versionFrameStylesheet(html);
  html = versionReferenceRuntimeAssets(html);
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  // The first declared layer owns important overrides. Repair partial inputs
  // and retain one declaration even when a template copied existing assets.
  html = html.replace(/(?:\r?\n)?<style\b[^>]*\bdata-cinema-layer\b[^>]*>[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<head\b[^>]*>/i, '$&'+eol+'<style data-cinema-layer>@layer ma-reference;</style>');
  // Home has one canonical document. Comments/examples can contain old body tags.
  const home = rel === 'index.html';
  const explore = rel === 'explore.html';
  html = html.replace(/<html\b([^>]*)>/i, (all, attrs) => {
    if (/\bclass\s*=/.test(attrs)) return '<html' + attrs.replace(/\bclass\s*=\s*(["'])(.*?)\1/i, (m,q,classes) => {
      const names=classes.split(/\s+/).filter(Boolean);
      let seen=false;
      const unique=names.filter(name=>{if(name!=='ma-reference')return true;if(seen)return false;seen=true;return true;});
      if(!seen)unique.push('ma-reference');
      return 'class='+q+unique.join(' ')+q;
    }) + '>';
    return '<html class="ma-reference"' + attrs + '>';
  });
  const family=home?'home':explore?'explore':'pages',found={system:false,family:false,script:false};
  const versionCss=tag=>tag.replace(/(href=["'])([^"']+)(["'])/i,(all,start,url,end)=>{
    if(!/reference-explore\.css/.test(url)&&!/(?:\?|&amp;|&)premium=20261020-2(?:&|$)/.test(url))url+=(url.includes('?')?(url.includes('&amp;')?'&amp;':'&'):'?')+'premium=20261020-2';
    if(/reference-system\.css/.test(url)&&!/(?:\?|&amp;|&)pills=20261020-1(?:&|$)/.test(url))url+=(url.includes('?')?(url.includes('&amp;')?'&amp;':'&'):'?')+'pills=20261020-1';
    if(/reference-system\.css/.test(url)&&!/(?:\?|&amp;|&)headernav=20261020-1(?:&|$)/.test(url))url+=(url.includes('?')?(url.includes('&amp;')?'&amp;':'&'):'?')+'headernav=20261020-1';
    return start+url+end;
  });
  html=html.replace(/<link\b[^>]*>/gi,tag=>{
    const href=tag.match(/\bhref=["']([^"']+)["']/i)?.[1]||'';
    const name=href.match(/^\/patches\/reference-(system|home|pages|explore)\.css(?:\?|$)/)?.[1];
    if(!name)return tag;
    const key=name==='system'?'system':'family';
    if(found[key])return '';
    found[key]=true;
    return versionCss(name==='system'?tag:tag.replace(/reference-(?:home|pages|explore)\.css/,'reference-'+family+'.css'));
  });
  html=html.replace(/<script\b[^>]*\bsrc=["']\/patches\/reference-system\.js(?:\?[^"']*)?["'][^>]*>[\s\S]*?<\/script>/gi,tag=>{
    if(found.script)return '';
    found.script=true;
    tag=tag.replace(/(src=["'])([^"']+)(["'])/i,(all,start,url,end)=>{
      if(!/(?:\?|&amp;|&)dialogs=20261020-1(?:&|$)/.test(url))url+=(url.includes('?')?(url.includes('&amp;')?'&amp;':'&'):'?')+'dialogs=20261020-1';
      if(!/(?:\?|&amp;|&)pills=20261020-1(?:&|$)/.test(url))url+=(url.includes('?')?(url.includes('&amp;')?'&amp;':'&'):'?')+'pills=20261020-1';
      if(!/(?:\?|&amp;|&)headernav=20261020-1(?:&|$)/.test(url))url+=(url.includes('?')?(url.includes('&amp;')?'&amp;':'&'):'?')+'headernav=20261020-1';
      return start+url+end;
    });
    return /\bdefer(?:\s|=|>)/i.test(tag)?tag:tag.replace(/<script\b/i,'<script defer');
  });
  const assets=[];
  if(!found.system)assets.push('<link rel="stylesheet" href="/patches/reference-system.css?v=20261020-review1&amp;premium=20261020-2&amp;pills=20261020-1&amp;headernav=20261020-1">');
  if(!found.family)assets.push('<link rel="stylesheet" href="/patches/reference-'+family+'.css?v=20261020-review1'+(explore?'':'&amp;premium=20261020-2')+'">');
  if(!found.script)assets.push('<script defer src="/patches/reference-system.js?v=20261020-review1&amp;dialogs=20261020-1&amp;pills=20261020-1&amp;headernav=20261020-1"></script>');
  return assets.length?html.replace(/<\/head>/i,eol+assets.join(eol)+eol+'</head>'):html;
}
// Existing editorial pages can carry older script URLs when their source data
// is refreshed. Keep their original version and require the approved UI assets.
function versionReferenceRuntimeAssets(html){
 const pins={
  'catalog-media.js':['posters','20261020-1'],'poster-wall.js':['posters','20261020-1'],'trending-rail.js':['posters','20261020-1'],'profile.js':['posters','20261020-1'],'portfolio-history.js':['posters','20261020-1'],'settings.js':['posters','20261020-1'],'title-captions.js':['posters','20261020-1'],
  'app.js':['art','20261020-source1'],'ebook-matcher.js':['art','20261020-source1'],'book-details-20261011.js':['art','20261020-source1'],'reading-ai.js':['art','20261020-source1'],
  'jonas-premium-glass.css':['stellar','20261020-1'],'jonas-premium-enhancer.js':['stellar','20261020-1'],'jonas-adult-page.js':['stellar','20261020-1'],
  'reference-system.css':['premium','20261020-2'],'reference-pages.css':['premium','20261020-2'],'reference-home.css':['premium','20261020-2'],'pricing.js':['premium','20261020-2']
 };
 const dialogs=new Set(['reference-system.js','profile.js','app.js','passkeys.js','pricing.js','settings.js']);
 return html.replace(/(\b(?:src|href)=["'])(\/[A-Za-z0-9_./-]+)(?:\?([^"']*))?(["'])/g,(all,prefix,url,query,end)=>{
  const file=url.split('/').pop(),pin=pins[file];if(!pin&&!dialogs.has(file))return all;
  const params=new URLSearchParams((query||'').replace(/&amp;/g,'&'));
  if(pin)params.set(pin[0],pin[1]);
  if(dialogs.has(file))params.set('dialogs','20261020-1');
  if(file==='reference-system.css'||file==='reference-system.js')params.set('pills','20261020-1');
  return prefix+url+'?'+params.toString().replace(/&/g,'&amp;')+end;
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
function versionFrameStylesheet(html){
 return html.replace(/(\bhref=["'](?:\/|(?:\.\.\/)+)?brand\.css)(?:\?([^"']*))?(["'])/g,
  (all,prefix,query,end)=>{
   const params=new URLSearchParams((query||'').replace(/&amp;/g,'&'));
   params.set('frame','20261020-borderless1');
   return prefix+'?'+params.toString().replace(/&/g,'&amp;')+end;
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
