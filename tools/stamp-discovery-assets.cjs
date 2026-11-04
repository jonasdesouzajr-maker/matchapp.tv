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

// This is a distribution step. Leave source fixtures, native bundles and separate products alone.
const excluded=new Set(['android-studio','artifacts','kids','lumina-match','node_modules','oauth','private-voice','reelforge','reports','tests','tools']);
function stampPublicHtml(dir=root,top=true) {
  let changed=0;
  for(const item of fs.readdirSync(dir,{withFileTypes:true})) {
    if(item.name.startsWith('.') || item.name==='node_modules' || (top && excluded.has(item.name))) continue;
    const file=path.join(dir,item.name);
    if(item.isDirectory()) { changed+=stampPublicHtml(file,false); continue; }
    if(!item.isFile() || !/\.html$/i.test(item.name) || /^(?:callback|confirm)\.html$/i.test(item.name)) continue;
    const html=fs.readFileSync(file,'utf8');
    const stamped=stampDiscoveryAssets(html);
    if(stamped!==html) { fs.writeFileSync(file,stamped); changed++; }
  }
  return changed;
}
module.exports={stampDiscoveryAssets,stampPublicHtml};
if(require.main===module)console.log('Updated discovery and native feedback script URLs in '+stampPublicHtml()+' published pages.');
