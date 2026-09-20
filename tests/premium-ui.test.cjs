const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('premium UI token and component layers remain responsive',()=>{
 const tokens=read('tokens.css'),components=read('components.css'),runtime=read('premium-ui.js'),settings=read('settings.js');
 assert.match(tokens,/--ma-container:1200px/);assert.match(tokens,/@media\(max-width:640px\)/);assert.match(tokens,/--font-display:"Outfit"/);assert.match(tokens,/--font-body:"Inter"/);
 assert.match(components,/min-height:44px/);assert.match(components,/prefers-reduced-motion:reduce/);assert.match(components,/scroll-snap-type:x mandatory/);
 assert.match(runtime,/IntersectionObserver/);assert.doesNotMatch(runtime,/new MutationObserver/);
 assert.match(settings,/css\('\/tokens\.css'\)/);assert.match(settings,/css\('\/components\.css'\)/);
});
test('walkthrough is manual-only and never auto-starts',()=>{
 const tour=read('onboarding-tour.js');
 assert.match(tour,/window\.MatchAppOnboarding/);assert.match(tour,/function start\(\)/);
 assert.doesNotMatch(tour,/setTimeout\(start|DOMContentLoaded[^\n]*start/);
});
test('single AdSense source and protected product mechanisms remain present',()=>{
 for(const file of ['ads-init.js','app.js','phone-auth.js','passkeys.js','matching-policy.js'])assert.ok(fs.existsSync(path.join(root,file)),file);
 assert.equal(fs.existsSync(path.join(root,'ads-serve.js')),false);
});
