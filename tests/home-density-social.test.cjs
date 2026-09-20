const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('dead Home fold controls remain retired',()=>{const lazy=read('lazy.js');for(const key of ['checkin','topask','how','aboutai'])assert.ok(lazy.includes(key));});
test('Home has no TikTok video runtime or player assets',()=>{
 const html=read('index.html');
 assert.doesNotMatch(html,/matchapp-tiktok-showcase|data-tiktok-load|tiktok-showcase\.(?:js|css)/);
 assert.equal(fs.existsSync(path.join(root,'tiktok-showcase.js')),false);
 assert.equal(fs.existsSync(path.join(root,'tiktok-showcase.css')),false);
});
test('AdSense retains five Home slots while single initializer owns requests',()=>{
 const html=read('index.html'),init=read('ads-init.js');
 assert.equal((html.match(/class="adsbygoogle"/g)||[]).length,5);
 assert.match(init,/Advertisement/);assert.match(init,/window\.matchAppAdsInitialized/);
});
test('homepage search metadata stays indexable and avoids forum Product abuse',()=>{
 const html=read('index.html');assert.match(html,/<link rel="canonical" href="https:\/\/matchapp\.tv\/"/);assert.doesNotMatch(html,/@type":"(?:SocialMediaPosting|DiscussionForumPosting)"/);
});
