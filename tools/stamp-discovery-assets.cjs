'use strict';
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const revisions=new Map();
function stampDiscoveryAssets(html) {
  return html.replace(/(<script\b[^<>]*?\ssrc\s*=\s*)(["'])(\/(?:channels\/discovery|patches\/immersive-feedback-20261014)\.js)(?:\?([^"'#]*))?\2/g,
    (tag,attribute,quote,url,query='')=>{
      if(!revisions.has(url)) {
        const bytes=fs.readFileSync(path.join(root,url));
        revisions.set(url,createHash('sha256').update(bytes).digest('hex').slice(0,12));
      }
      const params=new URLSearchParams(query.replace(/&amp;/g,'&'));
      params.set('assetrev',revisions.get(url));
      return attribute+quote+url+'?'+params.toString().replace(/&/g,'&amp;')+quote;
    });
}

// Keep preloads, CSS imports and dynamically assigned image URLs on the same edition.
const brandRuntime=new Set(['patches/reference-system.css','patches/reference-system.js','patches/reference-header.js','brand-corrections.js','matchapp-ia.js','page-shell.js','daily-checkin.js','settings.js','manifest.json','manifest-pt-br.json']);
function stampBrandReferences(source,html=false) {
  const paths=/(["'])(\/(?:patches\/reference-(?:system|header)\.(?:css|js)|(?:viewer-country|brand-corrections|matchapp-ia|page-shell|daily-checkin|settings)\.js|assets\/brand\/matchapp-ai-(?:mark\.svg|install-(?:192|512)\.png)))(?:\?([^"'#\s)]*))?\1/g;
  return source.replace(paths,(match,quote,url,query='')=>{
    const params=new URLSearchParams(query.replace(/&amp;/g,'&'));
    params.set('comet','20261104-1');
    const suffix=html?params.toString().replace(/&/g,'&amp;'):params.toString();
    return quote+url+'?'+suffix+quote;
  });
}

function stampControlFlow(source,html=false) {
  return source.replace(/(["'])(\/(?:ui-fixes-20261023\.css|patches\/jonas-adult-page\.js))(?:\?([^"'#\s)]*))?\1/g,
    (match,quote,url,query='')=>{
      const params=new URLSearchParams(query.replace(/&amp;/g,'&'));
      params.set('flow','20261104-1');
      const search=html?params.toString().replace(/&/g,'&amp;'):params.toString();
      return quote+url+'?'+search+quote;
    });
}

// This is a distribution step. Leave source fixtures, native bundles and separate products alone.
const excluded=new Set(['android-studio','artifacts','kids','lumina-match','node_modules','oauth','private-voice','reelforge','reports','tests','tools']);
function stampPublicHtml(dir=root,top=true,base=dir) {
  let changed=0;
  for(const item of fs.readdirSync(dir,{withFileTypes:true})) {
    if(item.name.startsWith('.') || item.name==='node_modules' || (top && excluded.has(item.name))) continue;
    const file=path.join(dir,item.name);
    if(item.isDirectory()) { changed+=stampPublicHtml(file,false,base); continue; }
    if(item.isFile() && (brandRuntime.has(path.relative(base,file).split(path.sep).join('/')) || path.relative(base,file).split(path.sep).join('/')==='patches/jonas-adult-page.js')) {
      const source=fs.readFileSync(file,'utf8');
      const stamped=stampControlFlow(stampBrandReferences(source));
      if(stamped!==source) { fs.writeFileSync(file,stamped); changed++; }
      continue;
    }
    if(!item.isFile() || !/\.html$/i.test(item.name) || /^(?:callback|confirm)\.html$/i.test(item.name)) continue;
    const html=fs.readFileSync(file,'utf8');
    const stamped=stampControlFlow(stampBrandReferences(stampDiscoveryAssets(html),true),true);
    if(stamped!==html) { fs.writeFileSync(file,stamped); changed++; }
  }
  return changed;
}
module.exports={stampDiscoveryAssets,stampBrandReferences,stampControlFlow,stampPublicHtml};
if(require.main===module)console.log('Updated discovery and native feedback script URLs in '+stampPublicHtml()+' published pages.');
