const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const ICON='<link rel="icon" href="/logo-192.jpeg" type="image/jpeg">';
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='.git'||e.name==='node_modules')continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(e.isFile()&&e.name.endsWith('.html'))out.push(p);}return out;}
function hasBrowserIcon(html){
  for(const m of html.matchAll(/<link\b[^>]*rel=["']([^"']+)["'][^>]*>/gi)){
    const tokens=m[1].toLowerCase().split(/\s+/);
    if(tokens.includes('icon'))return true;
  }
  return false;
}
let changed=[];
for(const file of walk(root)){
  let html=fs.readFileSync(file,'utf8');
  if(!/<head\b/i.test(html)||hasBrowserIcon(html))continue;
  const viewport=/<meta\b[^>]*name=["']viewport["'][^>]*>/i;
  html=viewport.test(html)?html.replace(viewport,m=>m+'\n'+ICON):html.replace(/<head\b[^>]*>/i,m=>m+'\n'+ICON);
  fs.writeFileSync(file,html);changed.push(path.relative(root,file));
}
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!hasBrowserIcon(home))throw new Error('Homepage still lacks rel="icon"');
if(!home.includes('<link rel="canonical" href="https://matchapp.tv/">'))throw new Error('Homepage canonical changed');
if(!home.includes('<meta property="og:url" content="https://matchapp.tv/">'))throw new Error('Homepage og:url changed');
console.log('Added browser favicon to:',changed.join(', ')||'none');
