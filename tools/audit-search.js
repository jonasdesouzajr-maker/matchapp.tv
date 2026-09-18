// Validate public search metadata and actual structured-data content.
const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),issues=[],warnings=[],urls=[];
const sm=new JSDOM(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),{contentType:'text/xml'}).window.document;
const fail=(url,detail)=>issues.push({url,detail});
for(const loc of sm.querySelectorAll('loc')){
 const url=loc.textContent;urls.push(url);const u=new URL(url);let p=path.join(root,u.pathname);if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 const d=new JSDOM(fs.readFileSync(p,'utf8')).window.document;
 if(d.querySelector('meta[name="robots"]')?.content.includes('noindex'))fail(url,'Noindex page in sitemap');
 if(d.querySelector('link[rel="canonical"]')?.href!==url)fail(url,'Canonical differs from sitemap URL');
 if(!d.title?.trim()||!d.querySelector('meta[name="description"]')?.content.trim())fail(url,'Missing title or description');
 if(d.querySelectorAll('h1').length!==1)fail(url,'Public page must have one main heading');
 if(!u.pathname.startsWith('/kids/')&&!Array.from(d.scripts).some(s=>s.textContent.includes('GTM-M7J3NNBN')))warnings.push({url,detail:'Existing analytics container missing'});
 const copy=d.body.cloneNode(true);copy.querySelectorAll('script,style').forEach(n=>n.remove());const text=copy.textContent.replace(/\s+/g,' ').trim();
 function check(n){if(!n||typeof n!=='object')return;const types=[n['@type']].flat();
  if(types.includes('Event')){for(const k of ['name','startDate','location'])if(!n[k])fail(url,'Event missing '+k);if(n.endDate&&Date.parse(n.endDate)<Date.parse(n.startDate))fail(url,'Event end precedes start');if(n.location?.['@type']==='Place'&&n.location.address?.['@type']!=='PostalAddress')fail(url,'Event needs a factual PostalAddress');}
  if(types.includes('BreadcrumbList'))(n.itemListElement||[]).forEach((e,i)=>{if(e.position!==i+1||!e.name||!e.item)fail(url,'Invalid breadcrumb name, item or position');});
  if(types.includes('FAQPage'))for(const q of n.mainEntity||[]){if(!q.name||!q.acceptedAnswer?.text)fail(url,'Incomplete FAQ');else if(!text.includes(q.name.replace(/\s+/g,' ').trim()))fail(url,'FAQ question is absent from visible content');}
  if(types.includes('SoftwareApplication')||types.includes('WebApplication')){if(!n.offers||!(n.aggregateRating||n.review))warnings.push({url,detail:'Application lacks Google rich-result eligibility fields; never invent reviews'});}
  if(n.contactOption?.includes?.('TollFree')&&n.telephone?.startsWith('+5521'))fail(url,'Mobile support number falsely labeled toll-free');
  for(const v of Object.values(n))if(v&&typeof v==='object')if(Array.isArray(v))v.forEach(check);else check(v);
 }
 for(const s of d.querySelectorAll('script[type="application/ld+json"]'))try{check(JSON.parse(s.textContent));}catch(e){fail(url,'Invalid JSON-LD: '+e.message);}
}
if(new Set(urls).size!==urls.length)fail('sitemap.xml','Duplicate public URL');
if(!fs.readFileSync(path.join(root,'robots.txt'),'utf8').includes('Sitemap: https://matchapp.tv/sitemaps.xml'))fail('robots.txt','Wrong sitemap declaration');
if(!fs.readFileSync(path.join(root,'ads.txt'),'utf8').includes('google.com, pub-9541435081010948, DIRECT, f08c47fec0942fa0'))fail('ads.txt','AdSense publisher record differs from site');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');if(!index.includes('0948bb9f3d3a868d'))fail('index.html','Missing existing Yandex verification');
const report={publicUrls:urls.length,issues,warnings};fs.writeFileSync(path.join(root,'search-audit-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(issues.length)process.exitCode=1;
