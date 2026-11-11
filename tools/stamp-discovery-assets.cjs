'use strict';
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const revisions=new Map();
function stampDiscoveryAssets(html) {
  return html.replace(/(<script\b[^<>]*?\ssrc\s*=\s*)(["'])(\/(?:channels\/(?:discovery|labels)|patches\/immersive-feedback-20261014)\.js)(?:\?([^"'#]*))?\2/g,
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
    // Refresh the header and its loader together without expiring other brand assets.
    if (/^\/patches\/reference-(?:system|header)\.js$/.test(url)) params.set('headerlocale','20261104-1');
    const suffix=html?params.toString().replace(/&/g,'&amp;'):params.toString();
    return quote+url+'?'+suffix+quote;
  });
}

function stampControlFlow(source,html=false) {
  return source.replace(/(["'])(\/(?:ui-fixes-20261023\.css|patches\/jonas-adult-page\.js))(?:\?([^"'#\s)]*))?\1/g,
    (match,quote,url,query='')=>{
      const params=new URLSearchParams(query.replace(/&amp;/g,'&'));
      params.set('flow',url.includes('jonas-adult-page')?'20261111-2':'20261104-1');
      const search=html?params.toString().replace(/&/g,'&amp;'):params.toString();
      return quote+url+'?'+search+quote;
    });
}


// Release 71 changed locale bytes plus the three ancestors that load them.
// Keep path comparisons and non-locale assets untouched; stamp actual requests.
const localeManifest=require('./locale-assets-71.json');
const localeAssets=new Set([...localeManifest.assets,...localeManifest.loaderAncestors]);
function localePublicFile(file) {
  return !excluded.has(file.split('/')[0]) && !/(^|\/)(?:callback|confirm)\.html$/i.test(file);
}
function stampLocaleUrl(raw,file,html=false) {
  const decoded=raw.replace(/&amp;/g,'&');
  let url;
  try { url=new URL(decoded,'https://matchapp.tv/'+file); } catch (_) { return raw; }
  if(!['matchapp.tv','www.matchapp.tv'].includes(url.hostname) || !localeAssets.has(url.pathname.slice(1))) return raw;
  const hashAt=decoded.indexOf('#'),fragment=hashAt<0?'':decoded.slice(hashAt);
  const body=hashAt<0?decoded:decoded.slice(0,hashAt),queryAt=body.indexOf('?');
  const pathname=queryAt<0?body:body.slice(0,queryAt);
  const params=queryAt<0?[]:body.slice(queryAt+1).split('&').filter(part=>!/^locale71(?:=|$)/.test(part));
  // Put the marker first: '/asset.js?v='+version keeps its variable value,
  // and preloads and scripts have identical URLs even if one already had it.
  const stamped=pathname+'?locale71=1'+(params.length?'&'+params.join('&'):'')+fragment;
  return html?stamped.replace(/&/g,'&amp;'):stamped;
}
function stampLocaleRuntime(source,file) {
  if(!localePublicFile(file)) return source;
  source=source.replace(/(\b[\w$.]+\.src\s*=\s*)(["'\x60])([^"'\x60\r\n]+)\2/g,
    (match,prefix,quote,url)=>prefix+quote+stampLocaleUrl(url,file)+quote);
  source=source.replace(/(\b(?:import\s*\(\s*|(?:import|from)\s+))(["'\x60])([^"'\x60\r\n]+)\2/g,
    (match,prefix,quote,url)=>prefix+quote+stampLocaleUrl(url,file)+quote);
  // These existing loaders branch on bare paths before adding their query.
  // Change only the final URL after all of those branches have run.
  const marker='/* locale71-loader */';
  if(['settings.js','final-wiring.js'].includes(file) && !source.includes(marker)) {
    const children=[...new Set([...source.matchAll(/\bjs\((["'])(\/[^"']+\.js)\1\)/g)]
      .map(match=>match[2]).filter(url=>localeAssets.has(url.slice(1))))];
    if(children.length) {
      const loader=/(function js\(src\)\{[\s\S]*?)(document\.head\.appendChild\(s\))/;
      if(!loader.test(source)) throw new Error('Locale loader contract changed: '+file);
      source=source.replace(loader,(match,prefix,append)=>prefix+marker+'if('+JSON.stringify(children)+'.includes(src))s.src=s.src.replace("?","?locale71=1&");'+append);
    }
  }
  return source;
}
function stampLocaleHtml(html,file='index.html') {
  if(!localePublicFile(file)) return html;
  const stamped=html.replace(/<(script|link)\b[^<>]*>/gi,(tag,kind)=>{
    if(kind.toLowerCase()==='link' && !/\brel\s*=\s*(["'])(?:preload|modulepreload)\1/i.test(tag)) return tag;
    const attribute=kind.toLowerCase()==='script'?/(\ssrc\s*=\s*)(["'])([^"']+)\2/i:/(\shref\s*=\s*)(["'])([^"']+)\2/i;
    return tag.replace(attribute,(match,prefix,quote,url)=>prefix+quote+stampLocaleUrl(url,file,true)+quote);
  });
  return stampLocaleRuntime(stamped,file);
}

// Refresh the browser source-credit helper, its callers and both lazy-loader
// chains. A fixed locale71 marker cannot refresh this later release.
const sourceCreditRevision='20261105-2';
const sourceCreditAssets=new Set(['catalog-media.js','discover.js','ebooks/ebook-matcher.js',
  'ebooks/reading-ai.js','final-wiring.js','build-meta.js','source-credits-browser.mjs']);
const sourceCreditAncestorPages=new Set(['index.html','discover.html','together.html']);
function stampSourceCreditUrl(raw,file,html=false) {
  const decoded=raw.replace(/&amp;/g,'&');
  let url;try{url=new URL(decoded,'https://matchapp.tv/'+file);}catch(_){return raw;}
  if(!['matchapp.tv','www.matchapp.tv'].includes(url.hostname)||!sourceCreditAssets.has(url.pathname.slice(1)))return raw;
  // Only these pages activate final-wiring's catalog fallback. Other build-meta
  // consumers do not need a new ancestor URL for this repair.
  if(url.pathname==='/build-meta.js'&&!sourceCreditAncestorPages.has(file))return raw;
  const hashAt=decoded.indexOf('#'),fragment=hashAt<0?'':decoded.slice(hashAt);
  const body=hashAt<0?decoded:decoded.slice(0,hashAt),queryAt=body.indexOf('?');
  const pathname=queryAt<0?body:body.slice(0,queryAt);
  const params=queryAt<0?[]:body.slice(queryAt+1).split('&').filter(part=>!/^sourcecredit(?:=|$)/.test(part));
  // Keep the marker before a possibly concatenated '?v='+version value.
  const stamped=pathname+'?sourcecredit='+sourceCreditRevision+(params.length?'&'+params.join('&'):'')+fragment;
  return html?stamped.replace(/&/g,'&amp;'):stamped;
}
function stampSourceCreditRuntime(source,file) {
  if(!localePublicFile(file))return source;
  source=source.replace(/(\b[\w$.]+\.src\s*=\s*)(["'\x60])([^"'\x60\r\n]+)\2/g,
    (match,prefix,quote,url)=>prefix+quote+stampSourceCreditUrl(url,file)+quote);
  source=source.replace(/(\b(?:import\s*\(\s*|(?:import|from)\s+))(["'\x60])([^"'\x60\r\n]+)\2/g,
    (match,prefix,quote,url)=>prefix+quote+stampSourceCreditUrl(url,file)+quote);
  if(file==='final-wiring.js'){
    const marker='/* sourcecredit-loader */',end='/* /sourcecredit-loader */';
    const addition=marker+'if(src==="/catalog-media.js")s.setAttribute("src",s.getAttribute("src")+"&sourcecredit='+sourceCreditRevision+'");'+end;
    if(source.includes(marker)){
      source=source.replace(/\/\* sourcecredit-loader \*\/[\s\S]*?\/\* \/sourcecredit-loader \*\//,addition);
    }else{
      const loader=/(function js\(src\)\{[\s\S]*?)(document\.head\.appendChild\(s\))/;
      if(!loader.test(source))throw new Error('Source-credit loader contract changed: '+file);
      source=source.replace(loader,(match,prefix,append)=>prefix+addition+append);
    }
  }
  return source;
}
function stampSourceCreditHtml(html,file='index.html') {
  if(!localePublicFile(file))return html;
  const stamped=html.replace(/<(script|link)\b[^<>]*>/gi,(tag,kind)=>{
    if(kind.toLowerCase()==='link'&&!/\brel\s*=\s*(["'])(?:preload|modulepreload)\1/i.test(tag))return tag;
    const attribute=kind.toLowerCase()==='script'?/(\ssrc\s*=\s*)(["'])([^"']+)\2/i:/(\shref\s*=\s*)(["'])([^"']+)\2/i;
    return tag.replace(attribute,(match,prefix,quote,url)=>prefix+quote+stampSourceCreditUrl(url,file,true)+quote);
  });
  return stampSourceCreditRuntime(stamped,file);
}

// This is a distribution step. Leave source fixtures, native bundles and separate products alone.
const excluded=new Set(['android-studio','artifacts','kids','lumina-match','node_modules','oauth','private-voice','reelforge','reports','tests','tools']);
function stampPublicHtml(dir=root,top=true,base=dir) {
  let changed=0;
  for(const item of fs.readdirSync(dir,{withFileTypes:true})) {
    if(item.name.startsWith('.') || item.name==='node_modules' || (top && excluded.has(item.name))) continue;
    const file=path.join(dir,item.name);
    if(item.isDirectory()) { changed+=stampPublicHtml(file,false,base); continue; }
    const relative=path.relative(base,file).split(path.sep).join('/');
    if(item.isFile() && (brandRuntime.has(relative) || relative==='patches/jonas-adult-page.js' || localeAssets.has(relative))) {
      const source=fs.readFileSync(file,'utf8');
      const stamped=stampSourceCreditRuntime(stampLocaleRuntime(stampControlFlow(stampBrandReferences(source)),relative),relative);
      if(stamped!==source) { fs.writeFileSync(file,stamped); changed++; }
      continue;
    }
    if(!item.isFile() || !/\.html$/i.test(item.name) || /^(?:callback|confirm)\.html$/i.test(item.name)) continue;
    const html=fs.readFileSync(file,'utf8');
    const stamped=stampSourceCreditHtml(stampLocaleHtml(stampControlFlow(stampBrandReferences(stampDiscoveryAssets(html),true),true),relative),relative);
    if(stamped!==html) { fs.writeFileSync(file,stamped); changed++; }
  }
  return changed;
}
module.exports={stampDiscoveryAssets,stampBrandReferences,stampControlFlow,stampLocaleHtml,stampLocaleRuntime,stampSourceCreditHtml,stampSourceCreditRuntime,stampPublicHtml};
if(require.main===module)console.log('Updated discovery and native feedback script URLs in '+stampPublicHtml()+' published pages.');
