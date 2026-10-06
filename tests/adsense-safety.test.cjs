const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const adsScript=/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-9541435081010948/;
test('AdSense keeps the approved client and one Home initializer',()=>{const home=read('index.html'),init=read('ads-init.js'),settings=read('settings.js');assert.match(home,adsScript);assert.match(home,/google-adsense-account" content="ca-pub-9541435081010948"/);assert.equal((home.match(/src="\/ads-init\.js/g)||[]).length,1);assert.doesNotMatch(settings,/ads-serve\.js/);assert.match(init,/data-ad-status/);assert.match(init,/unfilled/);assert.match(init,/Advertisement/);});
test('unsafe account chat Kids and support pages do not carry AdSense',()=>{for(const file of ['oauth/consent.html','discover.html','together.html','pricing/pricing.html','profile/profile.html','kids/index.html']){const html=read(file);assert.doesNotMatch(html,/<ins class="adsbygoogle"|pagead2\.googlesyndication\.com|ca-pub-/i,file);}});
test('automated news cards are not directly monetized',()=>{assert.doesNotMatch(read('latest-news.js'),/adsbygoogle|data-ad-slot=/);});


test('EEA UK and Switzerland deny Google storage and personalization before AdSense or GTM',()=>{
  const protectedRegions=['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];
  for(const file of ['index.html','events-archive.html']){
    const html=read(file);
    const consentAt=html.indexOf("window.gtag('consent','default'");
    const adsAt=html.indexOf('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
    const gtmAt=html.indexOf('googletagmanager.com/gtm.js');
    assert.ok(consentAt>=0,file+' must set consent defaults');
    assert.ok(gtmAt>consentAt,file+' consent defaults must precede GTM');
    if(adsAt>=0)assert.ok(adsAt>consentAt,file+' consent defaults must precede AdSense');
    for(const signal of ['ad_storage','analytics_storage','ad_user_data','ad_personalization']){
      assert.match(html,new RegExp(signal+"\\s*:\\s*'denied'"),file+' '+signal+' must default denied in protected regions');
    }
    for(const region of protectedRegions)assert.ok(html.includes("'"+region+"'"),file+' missing protected region '+region);
    assert.ok(html.includes('wait_for_update:2000'),file+' must allow the certified CMP time to update consent');
  }
  const eventBuilder=read('tools/build-global-events.js');
  assert.match(eventBuilder,/function consentDefaults\(\)/,'event generator must own the protected-region consent default');
  assert.match(eventBuilder,/ads\?consentDefaults\(\):''/,'monetized generated event pages must preserve consent defaults before Google tags');
});
