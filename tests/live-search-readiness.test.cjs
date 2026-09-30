'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {auditLiveSearch}=require('../tools/live-search-readiness.cjs');
const base='https://matchapp.tv';
const page='<title>Public guide</title><meta name="description" content="Source-based viewing guide"><link rel="canonical" href="'+base+'/guide/"><h1>Viewing guide</h1><p>Public original content.</p>';
function transport(change={}){
 const pages={
  '/robots.txt':'User-agent: *\nAllow: /\nSitemap: '+base+'/sitemaps.xml',
  '/sitemaps.xml':'<sitemapindex><sitemap><loc>'+base+'/sitemap.xml</loc></sitemap></sitemapindex>',
  '/sitemap.xml':'<urlset><url><loc>'+base+'/guide/</loc></url></urlset>',
  '/guide/':page,...change};
 return async(url)=>new Response(pages[new URL(url).pathname],{status:change.status||200,headers:change.headers||{}});
}
test('live readiness checks declared public pages rather than assuming a deployed sitemap is crawlable',async()=>{
 assert.deepEqual(await auditLiveSearch(base,transport()),{checkedUrls:1,issues:[]});
 for(const change of [
  {'/guide/':page.replace(base+'/guide/',base+'/wrong/')},
  {'/guide/':page+'<meta name="robots" content="noindex">'},
  {headers:{'x-robots-tag':'noindex'}},
  {'/robots.txt':'User-agent: *\nDisallow: /\nSitemap: '+base+'/sitemaps.xml'}
 ])assert.ok((await auditLiveSearch(base,transport(change))).issues.length);
 await assert.rejects(auditLiveSearch(base,transport({status:503})),/HTTP 503/);
 await assert.rejects(auditLiveSearch(base,transport({'/sitemap.xml':'<urlset><url><loc>https://untrusted.example/</loc></url></urlset>'})).then(r=>{if(r.issues.length)throw Error(r.issues[0]);}),/Noncanonical/);
});
