// Read-only site audit: JavaScript, inline scripts, local links/assets and sitemap.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'); const issues=[], files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else files.push(p);}}walk(root);
const documents=new Map();const external=new Set();
const parse=p=>{if(!documents.has(p))documents.set(p,new JSDOM(fs.readFileSync(p,'utf8')).window.document);return documents.get(p);};
function localTarget(url){let p=path.join(root,decodeURIComponent(url.pathname));if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');return p;}
for(const p of files){const rel=path.relative(root,p);if(/\.(js|cjs)$/.test(p)){try{new vm.Script(fs.readFileSync(p,'utf8'),{filename:rel});}catch(e){issues.push({file:rel,kind:'syntax',detail:e.message});}}
if(!p.endsWith('.html'))continue;const d=parse(p),base='https://matchapp.tv/'+rel.replaceAll('\\','/');
for(const script of d.querySelectorAll('script:not([src])')){if(script.type==='application/ld+json'){try{JSON.parse(script.textContent);}catch(e){issues.push({file:rel,kind:'structured-data',detail:e.message});}}else if(!script.type||script.type==='text/javascript'){try{new vm.Script(script.textContent);}catch(e){issues.push({file:rel,kind:'inline-syntax',detail:e.message});}}}
for(const el of d.querySelectorAll('[href],[src]')){const value=el.getAttribute('href')||el.getAttribute('src');if(!value||/^(mailto:|tel:|data:|javascript:|intent:|googlechrome:)/i.test(value))continue;let url;try{url=new URL(value,base);}catch(_){issues.push({file:rel,kind:'invalid-url',detail:value});continue;}
if(url.hostname!=='matchapp.tv'&&url.hostname!=='www.matchapp.tv'){if(url.protocol==='https:')external.add(url.href);continue;}
const target=localTarget(url);if(!fs.existsSync(target)){issues.push({file:rel,kind:'missing-local',detail:value});continue;}
if(url.hash&&target.endsWith('.html')){const dest=parse(target),id=decodeURIComponent(url.hash.slice(1));if(!dest.getElementById(id)&&!dest.querySelector('[name="'+id.replaceAll('"','')+'"]'))issues.push({file:rel,kind:'missing-fragment',detail:value});}}
const ids=new Set();for(const el of d.querySelectorAll('[id]')){if(ids.has(el.id))issues.push({file:rel,kind:'duplicate-id',detail:el.id});ids.add(el.id);}
}
const sitemap=new JSDOM(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),{contentType:'text/xml'}).window.document;
for(const loc of sitemap.querySelectorAll('loc')){if(!fs.existsSync(localTarget(new URL(loc.textContent))))issues.push({file:'sitemap.xml',kind:'missing-page',detail:loc.textContent});}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));for(const icon of manifest.icons)if(!fs.existsSync(localTarget(new URL(icon.src,'https://matchapp.tv'))))issues.push({file:'manifest.json',kind:'missing-icon',detail:icon.src});
const report={files:files.length,html:documents.size,js:files.filter(p=>/\.(js|cjs)$/.test(p)).length,externalUrls:[...external],issues};
fs.writeFileSync(path.join(root,'audit-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,externalUrls:external.size},null,2));
if(issues.length)process.exitCode=1;
