// Keep every public page on the canonical MatchApp brand without localizing the product name.
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
const ADULT='MatchApp Ai',KIDS='MatchApp Ai KIDS';
const mark='<img class="matchapp-wordmark" src="/assets/brand/matchapp-tv-ai-v2.svg" alt="MatchApp Ai" width="600" height="104" decoding="async">';
const kidsMark='<span class="matchapp-wordmark kids-wordmark" role="img" aria-label="MatchApp Ai KIDS">MatchApp Ai KIDS</span>';

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
function finalizeBrand(){
 let count=0;
 for(const file of files(ROOT)){
  let html=fs.readFileSync(file,'utf8');
  if(!/<body[\s>]/i.test(html)||file.includes('yandex_'))continue;
  const rel=path.relative(ROOT,file).replace(/\\/g,'/');
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
    html=html.replace(/(href=["']\/brand\.css)(?:\?[^"']*)?(["'])/g,'$1?v=20261014-approved1$2');
    html=html.replace(/(src=["']\/(?:page-shell|matchapp-ia|avatar-builder|daily-checkin)\.js)(?:\?([^"']*))?(["'])/g,function(all,prefix,query,end){
      if((query||'').includes('approvedlogo=20261014'))return all;
      return prefix+'?'+(query?query+'&amp;':'')+'approvedlogo=20261014'+end;
    });
  }
  if(!kids&&!doc.querySelector('script[src^="/patches/jonas-adult-page.js"]'))html=html.replace('</head>','<script defer src="/patches/jonas-adult-page.js?v=20261014-fastlang1"></script>\n</head>');
  html=name(html,kids);
  const original=fs.readFileSync(file,'utf8');
  if(html!==original){fs.writeFileSync(file,html);count++;}
  dom.window.close();
 }
 return count;
}
module.exports={finalizeBrand,regionalBrand,name,ADULT,KIDS};
if(require.main===module)console.log('Brand identity normalized on '+finalizeBrand()+' pages.');
