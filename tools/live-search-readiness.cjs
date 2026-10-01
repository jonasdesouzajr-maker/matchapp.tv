'use strict';
const {JSDOM}=require('jsdom');
// Public read-only checks. Fetch only canonical URLs declared by the live site.
async function auditLiveSearch(base='https://matchapp.tv',request=fetch,canonicalBase=base){
 const origin=new URL(base).origin,canonicalOrigin=new URL(canonicalBase).origin,issues=[];
 async function get(url){
  const target=new URL(url);
  if(target.origin!==canonicalOrigin)throw Error('Noncanonical sitemap host: '+url);
  // PR candidates serve production metadata locally; validate canonical identity
  // separately from the address used to fetch the candidate's actual files.
  const r=await request(origin+target.pathname+target.search,{signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(r.status!==200)throw Error('HTTP '+r.status+' '+url);
  return {text:await r.text(),robots:r.headers.get('x-robots-tag')||''};
 }
 function locations(text,type){
  const dom=new JSDOM(text,{contentType:'text/xml'});
  try{if(dom.window.document.documentElement.localName!==type)throw Error('Invalid '+type);return [...dom.window.document.querySelectorAll('loc')].map(n=>n.textContent.trim());}finally{dom.window.close();}
 }
 const robots=(await get(canonicalOrigin+'/robots.txt')).text;
 if(!/User-agent:\s*\*/i.test(robots)||!/^Allow:\s*\/$/mi.test(robots)||/^Disallow:\s*\/$/mi.test(robots))issues.push('Public crawling blocked or missing general policy');
 if(!robots.includes('Sitemap: '+canonicalOrigin+'/sitemaps.xml'))issues.push('Missing canonical sitemap declaration');
 const maps=locations((await get(canonicalOrigin+'/sitemaps.xml')).text,'sitemapindex');
 if(!maps.length)issues.push('Empty sitemap index');
 const urls=[];
 for(const map of maps)urls.push(...locations((await get(map)).text,'urlset'));
 if(!urls.length||new Set(urls).size!==urls.length)issues.push('Empty or duplicate sitemap URLs');
 for(let i=0;i<urls.length;i+=8)await Promise.all(urls.slice(i,i+8).map(async url=>{
  let dom;
  try{
   const page=await get(url);dom=new JSDOM(page.text);const d=dom.window.document;
   if(/noindex|\bnone\b/i.test(page.robots+' '+[...d.querySelectorAll('meta[name="robots"],meta[name="googlebot"]')].map(n=>n.content).join(' ')))issues.push('Noindex sitemap target: '+url);
   if(d.querySelector('link[rel="canonical"]')?.href!==url)issues.push('Canonical mismatch: '+url);
   if(!d.title.trim()||!d.querySelector('meta[name="description"]')?.content.trim()||d.querySelectorAll('h1').length!==1)issues.push('Missing search metadata or main heading: '+url);
   if(!d.body?.textContent.trim())issues.push('No public page content: '+url);
  }catch(error){issues.push(error.message);}finally{dom?.window.close();}
 }));
 return {checkedUrls:urls.length,issues};
}
module.exports={auditLiveSearch};
