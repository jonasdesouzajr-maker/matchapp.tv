const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('pricing/pricing.html','utf8');
const scripts=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>{try{return JSON.parse(m[1])}catch{return null}}).filter(Boolean);

test('digital MatchApp plans use OfferCatalog without fabricated merchant fields',()=>{
 const catalog=scripts.find(x=>x['@type']==='OfferCatalog'&&x.name==='MatchApp TV Ai plans');
 assert(catalog,'OfferCatalog must exist');
 assert.equal(catalog.url,'https://matchapp.tv/pricing/pricing.html');
 assert(Array.isArray(catalog.itemListElement)&&catalog.itemListElement.length>=5);
 for(const offer of catalog.itemListElement){
  assert.equal(offer['@type'],'Offer');
  assert.equal(offer.url,'https://matchapp.tv/pricing/pricing.html');
  assert(!('shippingDetails' in offer),'digital services must not invent shipping');
  assert(!('hasMerchantReturnPolicy' in offer),'digital services must not invent physical-goods return policy');
 }
 assert.equal(scripts.some(x=>x['@type']==='Product'),false,'avoid merchant Product markup that creates irrelevant physical-goods warnings');
 assert.doesNotMatch(html,/"aggregateRating"|"review"\s*:/,'do not fabricate ratings or reviews');
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
