const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pro=require('../pro-plan.js');
const html=fs.readFileSync('pricing/pricing.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>{try{return JSON.parse(m[1])}catch{return null}}).filter(Boolean);

test('static pricing preserves the digital service and breadcrumbs without retired or unconfirmed sale claims',()=>{
 const catalog=scripts.find(x=>x['@type']==='OfferCatalog'&&x.name==='MatchApp Ai plans');
 assert(catalog,'OfferCatalog must exist');
 assert.equal(catalog.url,'https://matchapp.tv/pricing/pricing.html');
 assert.deepEqual(catalog.itemListElement,[],'prices wait for the enabled, visible live catalog');
 const service=scripts.find(x=>x['@type']==='Service');
 assert.equal(service.name,'MatchApp Ai');assert.equal(service.url,catalog.url);assert.equal(service.provider.name,'MatchApp Ai');
 assert.equal(service.offers,undefined);assert.doesNotMatch(service.description,/VIP|Business|ad-free|unlimited/i);
 const crumbs=scripts.find(x=>x['@type']==='BreadcrumbList');assert.equal(crumbs.itemListElement.at(-1).item,catalog.url);
 assert.doesNotMatch(JSON.stringify(scripts),/"price"|"InStock"|VIP|Business|Extra Matches|Ask AI Credits|Ad-Free Pass|shippingDetails|hasMerchantReturnPolicy/);
 const title=html.match(/<title>([^<]+)<\/title>/)[1];assert.match(title,/MatchApp Ai.*Pro/);assert.doesNotMatch(title,/VIP|Business|Credits/);
 assert.match(html,/data-pro-pricing/);assert.match(html,/data-ma-retired-upsell/);
 assert.equal(scripts.some(x=>x['@type']==='Product'),false,'avoid merchant Product markup that creates irrelevant physical-goods warnings');
 assert.doesNotMatch(html,/"aggregateRating"|"review"\s*:/,'do not fabricate ratings or reviews');
});

test('enabled live offers use the exact five approved monthly market amounts and only the visible selected market',async()=>{
 const {PRO_PRICE_ROWS}=await import('../supabase/functions/_shared/pro-core.mjs');
 assert.deepEqual(PRO_PRICE_ROWS.map(row=>row.country),['US','BR','IN','MX','CO']);
 for(const row of PRO_PRICE_ROWS){
  const data={ok:true,enabled:true,offer:{...row,fractionDigits:2,interval:'month',intervalCount:1}};
  for(const lang of pro.languages){
   const catalog=pro.pricingCatalog(data,lang,true);assert.equal(catalog.itemListElement.length,1);
   const offer=catalog.itemListElement[0];assert.equal(offer['@type'],'Offer');assert.equal(offer.name,'MatchApp Ai Pro');
   assert.equal(offer.url,'https://matchapp.tv/pricing/pricing.html');assert.equal(offer.price,(row.amount/100).toFixed(2));assert.equal(offer.priceCurrency,row.currency.toUpperCase());
   assert.equal(offer.eligibleRegion.name,row.country);assert.equal(offer.description,pro.text(lang,'summary'));
   assert.equal(offer.priceSpecification.billingDuration,'P1M');assert.equal(offer.priceSpecification.unitCode,'MON');
   assert.equal(offer.priceSpecification.price,offer.price);assert.equal(offer.priceSpecification.priceCurrency,offer.priceCurrency);
   assert(!('shippingDetails' in offer),'digital services must not invent shipping');
   assert(!('hasMerchantReturnPolicy' in offer),'digital services must not invent physical-goods return policy');
   assert.doesNotMatch(JSON.stringify(offer),/aggregateRating|"review"\s*:|Ad-Free|VIP|Business|Ask AI|P1Y/);
  }
  assert.deepEqual(pro.pricingCatalog(data,'en',false).itemListElement,[]);
  assert.deepEqual(pro.pricingCatalog({...data,enabled:false},'en',true).itemListElement,[]);
  assert.deepEqual(pro.pricingCatalog({...data,offer:{...data.offer,interval:'year'}},'en',true).itemListElement,[]);
 }
});


test('runtime and hotfix guards remove legacy Product markup instead of inventing merchant data',()=>{
 const build=fs.readFileSync('build-meta.js','utf8');
 const hotfix=fs.readFileSync('tools/apply-critical-hotfixes.js','utf8');
 assert.match(build,/script\.remove\(\)/);
 assert.match(build,/@type'\] === 'Product'/);
 assert.match(hotfix,/@type'\] === 'Product'/);
 assert.doesNotMatch(build,/aggregateRating|shippingDetails|hasMerchantReturnPolicy/);
 assert.doesNotMatch(hotfix,/aggregateRating|shippingDetails|hasMerchantReturnPolicy/);
});
