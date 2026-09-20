const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('dead Home fold controls remain retired',()=>{const lazy=read('lazy.js');for(const key of ['checkin','topask','how','aboutai','tiktok'])assert.ok(lazy.includes(key));});
test('TikTok showcase is static-first and rewards only a completed native share',()=>{
 const js=read('tiktok-showcase.js'),html=read('index.html'),share=read('share.js');
 assert.match(js,/function loadPlayer/);assert.match(js,/navigator\.share/);assert.match(js,/await reward\(\)/);assert.match(js,/window\.grantShareReward/);
 assert.match(html,/data-tiktok-load/);assert.match(html,/data-tiktok-showcase-status/);assert.match(share,/window\.grantShareReward = grantShareReward/);
});
test('AdSense retains five Home slots while single initializer owns requests',()=>{
 const html=read('index.html'),init=read('ads-init.js');
 assert.equal((html.match(/class="adsbygoogle"/g)||[]).length,5);
 assert.match(init,/Advertisement/);assert.match(init,/window\.matchAppAdsInitialized/);
});
test('homepage search metadata stays indexable and avoids forum Product abuse',()=>{
 const html=read('index.html');assert.match(html,/<link rel="canonical" href="https:\/\/matchapp\.tv\/"/);assert.doesNotMatch(html,/@type":"(?:SocialMediaPosting|DiscussionForumPosting)"/);
});
