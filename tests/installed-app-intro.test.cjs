const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('installed-app-intro.js','utf8');
function boot({installed=true,ua='Android Chrome',touch=1,reject=false,storage=false}={}){
 const dom=new JSDOM('<body><main id="home">Home</main></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 Object.defineProperty(w.navigator,'userAgent',{value:ua});Object.defineProperty(w.navigator,'maxTouchPoints',{value:touch});
 w.matchMedia=()=>({matches:installed});
 let deadline,paused=0,loads=0;
 w.setTimeout=fn=>{deadline=fn;return 1};w.clearTimeout=()=>{};
 w.HTMLMediaElement.prototype.play=()=>reject?Promise.reject(new Error('blocked')):Promise.resolve();
 w.HTMLMediaElement.prototype.pause=()=>paused++;w.HTMLMediaElement.prototype.load=()=>loads++;
 if(storage) Object.defineProperty(w,'sessionStorage',{get(){throw new Error('blocked storage')}});
 w.eval(source);
 return {w,dom,deadline,overlay:()=>w.document.querySelector('#matchapp-launch-intro'),clean:()=>({paused,loads})};
}
test('only installed handhelds and legacy native apps get video; ordinary browsers and desktop remain unchanged',()=>{
 for(const opts of [{installed:false},{ua:'Desktop Chrome'},{ua:'Android MatchAppTVAndroid/1.1.34 MatchAppLaunchIntro/1'}]){const b=boot(opts);assert.equal(b.overlay(),null);b.dom.window.close()}
 for(const opts of [{},{ua:'iPhone Safari'},{ua:'Macintosh Safari',touch:5},{installed:false,ua:'Android MatchAppTVAndroid/1.1.33'}]){const b=boot(opts);assert.ok(b.overlay());assert.ok(b.w.document.querySelector('#home'));assert.equal(b.overlay().querySelector('video').muted,true);b.dom.window.close()}
});
test('ended, media failure, Skip and hard deadline each release startup and media resources',()=>{
 for(const event of ['ended','error','skip','deadline']){const b=boot();if(event==='skip')b.overlay().querySelector('button').click();else if(event==='deadline')b.deadline();else b.overlay().querySelector('video').dispatchEvent(new b.w.Event(event));assert.equal(b.overlay(),null);assert.equal(b.clean().paused,1);b.deadline();assert.equal(b.clean().paused,1);b.dom.window.close()}
});
test('autoplay rejection cannot block Home; denied storage and repeat navigation are safe',async()=>{
 const b=boot({reject:true});await Promise.resolve();assert.equal(b.overlay(),null);b.dom.window.close();
 const c=boot({storage:true});assert.ok(c.overlay());c.deadline();c.dom.window.close();
 const d=boot();d.deadline();d.w.eval(source);assert.equal(d.overlay(),null);d.dom.window.close();
});
test('native intro is bundled, bounded, destroyed on background and does not change playback permissions',()=>{
 const s=fs.readFileSync('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt','utf8');
 assert.match(s,/R.raw.matchapp_launch_intro/);assert.match(s,/root.postDelayed\(introDeadline, 6500\)/);assert.match(s,/setOnErrorListener/);assert.match(s,/override fun onPause\(\) \{\s*finishIntro\(\)/);assert.match(s,/mediaPlaybackRequiresUserGesture = true/);
 assert.match(s,/savedInstanceState == null && intent.data == null/);
 assert.ok(fs.statSync('assets/brand/matchapp-launch-intro.mp4').size<1000000);
 assert.equal(fs.readFileSync('assets/brand/matchapp-launch-intro.mp4').compare(fs.readFileSync('android-studio/app/src/main/res/raw/matchapp_launch_intro.mp4')),0);
});
