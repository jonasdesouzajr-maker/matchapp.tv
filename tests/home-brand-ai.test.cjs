const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('canonical Home owns first paint without deleted legacy controllers',()=>{
 const html=read('index.html'),settings=read('settings.js');
 assert.match(html,/id="mh-topbox" class="app-header ma-home-header"/);
 for(const legacy of ['home-premium.css','brand-corrections.js','home-ux-lock.js','home-layout-guard.js','right-glide-rails.js','marquee-autoplay.js','download-cta.js','home-ux-20260920.js'])assert.doesNotMatch(html,new RegExp('(?:src|href)=[\"\\\'][^\"\\\']*'+legacy.replace(/\\./g,'\\\\.')+'[^\"\\\']*[\"\\\']'),legacy);
 assert.ok(!settings.includes('ads-serve.js'));
});
test('official MatchApp icon and Kids identity stay separated',()=>{
 const html=read('index.html'),kids=read('kids/index.html');
 assert.match(html,/matchapp-official-icon-512\.webp/);
 assert.match(kids,/\/kids\/kids-logo-sm\.jpeg/);
});
test('TikTok intro and video showcase are fully absent from Home runtime',()=>{
 const html=read('index.html');
 assert.doesNotMatch(html,/matchapp-tiktok-(?:intro|showcase)|tiktok-showcase\.(?:js|css)|data-tiktok-load|matchapp-tiktok-poster-player/);
 assert.equal(fs.existsSync(path.join(root,'tiktok-showcase.js')),false);
 assert.equal(fs.existsSync(path.join(root,'tiktok-showcase.css')),false);
});
test('fresh Home navigation establishes the top once without delayed scroll correction',()=>{
 const origin=read('page-origin.js');assert.match(origin,/scrollRestoration='manual'/);assert.match(origin,/getEntriesByType/);assert.doesNotMatch(origin,/DOMContentLoaded|pageshow|requestAnimationFrame\(top\)|setInterval\(|prototype\.scrollIntoView|prototype\.focus/);
});
test('walkthrough is launched manually and follows the nine-step premium feature order',()=>{
 const tour=read('onboarding-tour.js');
 assert.match(tour,/window\.MatchAppOnboarding/);assert.doesNotMatch(tour,/setTimeout\(start|DOMContentLoaded[^\n]*start/);
 for(const key of ["pick","mood","format","platform","more","ai","latest","kids","profile"])assert.match(tour,new RegExp("key:'"+key+"'"));
 assert.doesNotMatch(tour,/key:'find'/);
 assert.doesNotMatch(tour,/key:'quota'/);
});
test('catalog expansion remains intact',()=>{const cat=read('catalog-plus.js');for(const platform of ['GoodShort','WeTV','iQIYI','Viu','Tubi','Apple Music'])assert.ok(cat.includes('platform:"'+platform+'"'),platform);});
