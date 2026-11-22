'use strict';
// Keep messaging previews in sync with the approved artwork's actual bytes.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const routes=Object.freeze([
 {page:'index.html',image:'share-preview-2026.jpg'},
 {page:'discover.html',image:'share-preview-2026.jpg'},
 {page:'lumina-pair/index.html',image:'lumina-pair/lumina-social-en.jpg'},
 {page:'lumina-par/index.html',image:'lumina-par/lumina-social-pt-br.jpg'}
]);
const required=new Set(['og:image','og:image:secure_url','twitter:image']);
const revision=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16);
const escapeRegex=value=>[...value].map(ch=>'\\^$.*+?()[]{}|'.includes(ch)?'\\'+ch:ch).join('');
function jpegSize(bytes){
 if(bytes.length<12||bytes[0]!==0xff||bytes[1]!==0xd8)throw Error('Not a JPEG');
 for(let i=2;i<bytes.length-10;){
  if(bytes[i]!==0xff){i++;continue;}
  while(bytes[i]===0xff)i++;
  const marker=bytes[i++];
  if(marker===0xd9||marker===0xda)break;
  if(marker===0x01||(marker>=0xd0&&marker<=0xd8))continue;
  if(i+2>bytes.length)break;
  const size=bytes.readUInt16BE(i);
  if(size<2||i+size>bytes.length)throw Error('Invalid JPEG segment');
  if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
   if(size<7)throw Error('Short JPEG dimension segment');
   return {width:bytes.readUInt16BE(i+5),height:bytes.readUInt16BE(i+3)};
  }
  i+=size;
 }
 throw Error('JPEG dimensions not found');
}
function render(html,route,bytes){
 const size=jpegSize(bytes);
 if(size.width!==1200||size.height!==630)throw Error('Expected 1200x630 JPEG for '+route.image);
 if(bytes.length>500000)throw Error('Social preview exceeds 500KB: '+route.image);
 const base='https://matchapp.tv/'+route.image;
 const rev=revision(bytes),url=base+'?v='+rev;
 const seen=new Map();
 let out=html.replace(/<meta\b[^>]*>/gi,tag=>{
  const identity=tag.match(/\b(?:property|name)\s*=\s*(["'])(.*?)\1/i);
  const key=identity&&identity[2];
  if(!required.has(key))return tag;
  seen.set(key,(seen.get(key)||0)+1);
  if(!/\bcontent\s*=\s*(["']).*?\1/i.test(tag))throw Error('Missing content in '+key+' for '+route.page);
  return tag.replace(/(\bcontent\s*=\s*)(["'])(.*?)\2/i,(match,prefix,quote)=>prefix+quote+url+quote);
 });
 for(const key of required)if(seen.get(key)!==1)throw Error(route.page+' needs exactly one '+key);
 // Keep structured data aligned with the same canonical image.
 out=out.replace(/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
  (match,open,body,close)=>open+body.replace(new RegExp(escapeRegex(base)+'(?:\\?[^"\\s]*)?','g'),url)+close);
 if(route.page.startsWith('lumina-')){
  const basename=path.posix.basename(route.image);
  const imageAttribute=new RegExp("((?:src|href)=[\"'])\\./"+escapeRegex(basename)+"(?:\\?[^\"']*)?([\"'])","gi");
  out=out.replace(imageAttribute,(match,prefix,suffix)=>prefix+'./'+basename+'?v='+rev+suffix);
 }
 return out;
}
function main(mode='write'){
 let updates=0;
 for(const route of routes){
  const image=fs.readFileSync(path.join(root,route.image));
  const file=path.join(root,route.page),previous=fs.readFileSync(file,'utf8');
  const updated=render(previous,route,image);
  if(updated!==previous){
   if(mode==='check')throw Error('Stale social metadata: '+route.page);
   fs.writeFileSync(file,updated,'utf8');updates++;
  }
  console.log('Social artwork:',route.page,route.image,revision(image));
 }
 // The debug-only Android WebView preview is required to match the live web HTML
 // byte-for-byte. Social metadata is rewritten above, so refresh its staged copy
 // before running the native preview parity tests. Never touch release assets.
 const preview=path.join(root,'android-studio','app','src','debug','assets','ambient-preview','discover.html');
 const discover=fs.readFileSync(path.join(root,'discover.html'));
 const staged=fs.readFileSync(preview);
 if(!discover.equals(staged)){
  if(mode==='check')throw Error('Stale Android debug preview: discover.html is out of sync');
  fs.writeFileSync(preview,discover);
  console.log('Synced Android debug-only discover.html preview');
 }
 console.log(mode==='check'?'Validated all social preview revisions':'Updated '+updates+' public page(s)');
}
if(require.main===module){
 try{main(process.argv.includes('--check')?'check':'write');}
 catch(error){console.error(error.stack);process.exitCode=1;}
}
module.exports={routes,revision,jpegSize,render,main};
