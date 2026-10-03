const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('installed-app-intro.js','utf8');
function boot({installed=true,ua='Android Chrome',touch=1,reject=false,storage=false,mp4=true}={}){
 const dom=new JSDOM('<body><main id="home">Home</main></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 Object.defineProperty(w.navigator,'userAgent',{value:ua});Object.defineProperty(w.navigator,'maxTouchPoints',{value:touch});
 w.matchMedia=()=>({matches:installed});
 let deadline,paused=0,loads=0;
 w.setTimeout=fn=>{deadline=fn;return 1};w.clearTimeout=()=>{};
 w.HTMLMediaElement.prototype.canPlayType=()=>mp4?'probably':'';
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
 assert.ok(fs.statSync('assets/brand/matchapp-launch-intro-hd.mp4').size<1000000);
 assert.equal(fs.readFileSync('assets/brand/matchapp-launch-intro-hd.mp4').compare(fs.readFileSync('android-studio/app/src/main/res/raw/matchapp_launch_intro.mp4')),0);
});

test('installed intro fills the viewport without distorting the video and native restores system bars',()=>{
 const b=boot(); const video=b.overlay().querySelector('video');
 assert.equal(video.style.objectFit,'cover');assert.equal(video.style.width,'100%');assert.equal(video.style.height,'100%');
 assert.match(video.poster,/matchapp-launch-intro-poster\.jpg$/);
 assert.ok(fs.statSync('assets/brand/matchapp-launch-intro-poster.jpg').size>1000);
 assert.match(video.src,/matchapp-launch-intro-hd\.mp4$/);b.deadline();b.dom.window.close();
 const native=fs.readFileSync('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt','utf8');
 assert.match(native,/maxOf\(width \/ 1080f, height \/ 1920f\)/);
 assert.match(native,/hide\(WindowInsetsCompat.Type.systemBars\(\)\)/);
 assert.match(native,/show\(WindowInsetsCompat.Type.systemBars\(\)\)/);
 assert.match(fs.readFileSync('android-studio/app/src/main/res/values/themes.xml','utf8'),/windowSplashScreenAnimatedIcon">@drawable\/launch_empty/);
});

test('browsers without the H.264 profile use the same 1080p WebM intro',()=>{
 const b=boot({mp4:false});assert.match(b.overlay().querySelector('video').src,/matchapp-launch-intro-hd\.webm$/);
 assert.ok(fs.statSync('assets/brand/matchapp-launch-intro-hd.webm').size<1000000);b.deadline();b.dom.window.close();
});

test('circular loading artwork gives way to playback without changing the startup deadline',()=>{
 const b=boot(),video=b.overlay().querySelector('video');
 assert.match(b.overlay().querySelector('img').src,/premiumicon1/);
 assert.equal(video.style.visibility,'hidden');
 assert.match(b.overlay().querySelector('style').textContent,/prefers-reduced-motion/);
 video.dispatchEvent(new b.w.Event('playing'));
 assert.equal(video.style.visibility,'visible');assert.equal(b.overlay().querySelector('img'),null);
 b.deadline();assert.equal(b.overlay(),null);b.dom.window.close();
});


test('installed intro starts from head before render-blocking styles',()=>{
 const home=fs.readFileSync('index.html','utf8');
 const intro=home.indexOf('/installed-app-intro.js?v=20261001-introearly1');
 assert.ok(intro>0);
 assert.ok(intro<home.indexOf('</head>'));
 assert.ok(intro<home.indexOf('/style.css'));
 assert.equal(home.indexOf('/installed-app-intro.js',home.indexOf('<body')), -1);
 assert.match(source,/document\.documentElement\.appendChild\(overlay\)/);
});
