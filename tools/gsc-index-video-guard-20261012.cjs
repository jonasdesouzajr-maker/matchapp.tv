#!/usr/bin/env node
'use strict';
// Search Console regressions: do not expose private/low-value content just to
// turn an intentional "noindex" warning green. Keep submitted pages indexable.
// Ensure published VideoObject data always declares a usable source/embed URL.
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const abs=p=>path.join(ROOT,p);
const validUrl=x=>typeof x==='string'&&/^https:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(x);
function videoIssues(object,label,issues){
 if(!object||typeof object!=='object')return;
 if(Array.isArray(object)){for(const item of object)videoIssues(item,label,issues);return}
 const type=object['@type'];
 if(type==='VideoObject'||(Array.isArray(type)&&type.includes('VideoObject'))){
  const content=validUrl(object.contentUrl),embed=validUrl(object.embedUrl);
  if(!(content||embed))issues.push(label+': VideoObject missing valid contentUrl or embedUrl');
  // contentUrl must be the actual media file, never a YouTube watch page.
  // An available embedUrl does not make a misleading contentUrl valid.
  if(typeof object.contentUrl==='string'&&/^https:\/\/(?:www\.)?(?:youtube\.com\/watch|youtu\.be\/)/i.test(object.contentUrl))
   issues.push(label+': YouTube watch URL is not a video file; omit contentUrl and use embedUrl');
 }
 for(const [key,value] of Object.entries(object))if(value&&typeof value==='object')videoIssues(value,label+' '+key,issues);
}
function inspectHtml(html,label,issues){
 const scripts=html.matchAll(/<script\b(?=[^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi);
 let checked=0;
 for(const m of scripts){
  let data;try{data=JSON.parse(m[1])}catch(e){
   if(/VideoObject/.test(m[1]))issues.push(label+': video JSON-LD could not be parsed');
   continue;
  }
  const before=issues.length;
  videoIssues(data,label,issues);checked+=issues.length-before>=0?1:0;
  breadcrumbIssues(data,label,issues);
 }
 return checked;
}
function breadcrumbIssues(object,label,issues,root=ROOT){
 if(!object||typeof object!=='object')return;
 if(Array.isArray(object)){for(const item of object)breadcrumbIssues(item,label,issues,root);return}
 const types=[object['@type']].flat();
 if(types.includes('BreadcrumbList'))for(const crumb of object.itemListElement||[]){
  const value=typeof crumb.item==='string'?crumb.item:crumb.item&&crumb.item['@id'];
  if(!value)continue; // The final breadcrumb may omit its URL.
  let url;try{url=new URL(value)}catch(_){issues.push(label+': Invalid breadcrumb URL: '+value);continue}
  if(url.origin!=='https://matchapp.tv')continue;
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(url.pathname))}catch(_){issues.push(label+': Invalid breadcrumb path: '+value);continue}
  if(file!==root&&!file.startsWith(root+path.sep)){issues.push(label+': Unsafe breadcrumb URL: '+value);continue}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file))issues.push(label+': Breadcrumb target missing: '+value);
 }
 for(const value of Object.values(object))if(value&&typeof value==='object')breadcrumbIssues(value,label,issues,root);
}
function sitemapHtmlPath(u){
 const url=new URL(u);
 if(url.origin!=='https://matchapp.tv')throw Error('Noncanonical sitemap origin: '+u);
 const clean=decodeURIComponent(url.pathname);
 if(clean.includes('..'))throw Error('Unsafe sitemap path: '+u);
 const file=path.resolve(ROOT,clean==='/'?'index.html':clean.replace(/^\//,'').replace(/\/$/,'/index.html'));
 if(!file.startsWith(ROOT+path.sep))throw Error('Outside repository: '+u);
 return file;
}
function audit(){
 const errors=[],raw=fs.readFileSync(abs('sitemap.xml'),'utf8');
 const urls=[...raw.matchAll(/<loc>([^<]*)<\/loc>/g)].map(x=>x[1].replace(/&amp;/g,'&'));
 const entries=new Set(urls);let noindex=0,videoCount=0,pagesChecked=0;
 for(const u of urls){
  let file;try{file=sitemapHtmlPath(u)}catch(e){errors.push(e.message);continue}
  if(!fs.existsSync(file)){errors.push('Sitemap missing file: '+u);continue}
  const html=fs.readFileSync(file,'utf8');
  const head=html.split(/<\/head\s*>/i)[0];
  const robotsTags=[...head.matchAll(/<meta\b[^>]+>/gi)].map(x=>x[0]).filter(t=>/\bname\s*=\s*["'](?:robots|googlebot)["']/i.test(t));
  if(robotsTags.some(t=>/\bnoindex\b/i.test(t))){noindex++;errors.push('Submitted URL is noindex: '+u)}
  pagesChecked++;
 }
 // Check ALL static pages, not only those in sitemap. Google can discover
 // editorial/featured videos through links even when no longer submitted.
 function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
   if(ent.isDirectory()&&/^(node_modules|\.git|\.gradle|android-studio|coverage|dist)$/i.test(ent.name))continue;
   const file=path.join(dir,ent.name);
   if(ent.isDirectory()){walk(file);continue}
   if(!ent.isFile()||!ent.name.endsWith('.html'))continue;
   const html=fs.readFileSync(file,'utf8');
   const name=path.relative(ROOT,file);
   if(/VideoObject/.test(html))videoCount++;
   inspectHtml(html,name,errors);
  }
 }
 walk(ROOT);
 return {sitemapUrls:urls.length,sitemapMissing:urls.length-pagesChecked,noindexInSitemap:noindex,filesWithVideoMarkup:videoCount,errors,site:'https://matchapp.tv/',examplePrivateExcluded:!entries.has('https://matchapp.tv/profile/profile.html')};
}
if(require.main===module){
 const report=audit();console.log(JSON.stringify(report,null,2));
 if(report.errors.length)process.exitCode=1;
}
module.exports={audit,videoIssues,breadcrumbIssues,inspectHtml,sitemapHtmlPath};
