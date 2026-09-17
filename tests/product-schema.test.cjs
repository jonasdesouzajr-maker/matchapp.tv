const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('pricing/pricing.html','utf8');
const scripts=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>{try{return JSON.parse(m[1])}catch{return null}}).filter(Boolean);
const product=scripts.find(x=>x['@type']==='Product'&&x.name==='MatchApp VIP');
test('MatchApp VIP merchant Product includes the required crawlable image',()=>{
 assert(product,'MatchApp VIP Product JSON-LD must exist');
 assert.deepEqual(product.image,['https://matchapp.tv/logo.jpeg']);
 assert.equal(product.url,'https://matchapp.tv/pricing/pricing.html');
 assert(Array.isArray(product.offers)&&product.offers.length>=1);
 for(const offer of product.offers){assert.equal(offer['@type'],'Offer');assert.equal(offer.url,'https://matchapp.tv/pricing/pricing.html');}
});
