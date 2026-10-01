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

test('PR crawler checks fetch candidate files locally while enforcing the production canonical host',async()=>{
 const local='http://127.0.0.1:8899',seen=[];
 const request=async url=>{seen.push(url);assert.equal(new URL(url).origin,local);return transport()(url);};
 assert.deepEqual(await auditLiveSearch(local,request,base),{checkedUrls:1,issues:[]});
 assert.deepEqual(seen,[local+'/robots.txt',local+'/sitemaps.xml',local+'/sitemap.xml',local+'/guide/']);
 const bad=await auditLiveSearch(local,transport({'/guide/':page.replace(base+'/guide/',local+'/guide/')}),base);
 assert.ok(bad.issues.some(x=>x.startsWith('Canonical mismatch')));
 await assert.rejects(auditLiveSearch(local,transport({'/sitemaps.xml':'<sitemapindex><sitemap><loc>https://untrusted.example/sitemap.xml</loc></sitemap></sitemapindex>'}),base),/Noncanonical/);
});

test('crawler retries a transient timeout once and preserves persistent failure URL',async()=>{
 const healthy=transport();let calls=0;
 const retry=async(url,options)=>{
  if(new URL(url).pathname==='/guide/'&&++calls===1)throw new DOMException('request timed out','TimeoutError');
  return healthy(url,options);
 };
 assert.deepEqual(await auditLiveSearch(base,retry),{checkedUrls:1,issues:[]});
 assert.equal(calls,2);
 calls=0;
 const fail=async(url,options)=>{
  if(new URL(url).pathname==='/guide/'){calls++;throw new DOMException('request timed out','TimeoutError');}
  return healthy(url,options);
 };
 const result=await auditLiveSearch(base,fail);
 assert.equal(calls,2);
 assert.deepEqual(result.issues,[base+'/guide/: request timed out']);
});
