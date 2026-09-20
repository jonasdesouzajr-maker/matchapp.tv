const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('ads use one initializer, fixed hosts and collapse only after AdSense reports unfilled',()=>{const s=read('ads-init.js');assert.match(s,/window\.matchAppAdsInitialized/);assert.match(s,/IntersectionObserver/);assert.match(s,/data-ad-status/);assert.match(s,/status==='unfilled'/);assert.match(s,/is-ad-empty/);assert.doesNotMatch(s,/setInterval|4500|9000/);});
test('Android user agent remains ad-free',()=>{const s=read('ads-init.js');assert.match(s,/MatchAppTVAndroid/);assert.match(s,/MATCHAPP_IS_AD_FREE/);});
