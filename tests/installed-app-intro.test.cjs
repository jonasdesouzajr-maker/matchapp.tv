const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('installed-app-intro.js','utf8');

function boot({installed=true,ua='Android Chrome',touch=1,reject=false,storage=false,mp4=true,seen=false,registered=false}={}){
 const dom=new JSDOM('<body><main id="home">Home</main></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 Object.defineProperty(w.navigator,'userAgent',{value:ua});Object.defineProperty(w.navigator,'maxTouchPoints',{value:touch});
 w.matchMedia=()=>({matches:installed});
 if(seen)w.localStorage.setItem('matchapp-launch-intro-seen-v1','true');
 if(registered)w.localStorage.setItem('matchapp-launch-registered-v1','true');
 let deadline,paused=0,loads=0;
 w.setTimeout=fn=>{deadline=fn;return 1};w.clearTimeout=()=>{};
 w.requestAnimationFrame=fn=>fn();
 w.HTMLMediaElement.prototype.canPlayType=()=>mp4?'probably':'';
 w.HTMLMediaElement.prototype.play=()=>reject?Promise.reject(new Error('blocked')):Promise.resolve();
 w.HTMLMediaElement.prototype.pause=()=>paused++;w.HTMLMediaElement.prototype.load=()=>loads++;
 if(storage) Object.defineProperty(w,'sessionStorage',{get(){throw new Error('blocked storage')}});
 w.eval(source);
 return {
  w,dom,
  deadline:()=>deadline&&deadline(),
  overlay:()=>w.document.querySelector('#matchapp-launch-intro'),
  transition:()=>w.document.querySelector('#matchapp-launch-transition'),
  clean:()=>({paused,loads})
 };
}

test('only installed handhelds and legacy native apps get video; ordinary browsers and current native remain unchanged',()=>{
 for(const opts of [{installed:false},{ua:'Desktop Chrome'},{ua:'Android MatchAppTVAndroid/1.1.36 MatchAppLaunchIntro/1'}]){const b=boot(opts);assert.equal(b.overlay(),null);b.dom.window.close()}
 for(const opts of [{},{ua:'iPhone Safari'},{ua:'Macintosh Safari',touch:5},{installed:false,ua:'Android MatchAppTVAndroid/1.1.33'}]){const b=boot(opts);assert.ok(b.overlay());assert.ok(b.w.document.querySelector('#home'));assert.equal(b.overlay().querySelector('video').muted,true);b.dom.window.close()}
});

test('ended, media failure, Skip and preparation deadline each release startup and media resources',()=>{
 for(const event of ['ended','error','skip','deadline']){
  const b=boot();
  if(event==='skip')b.overlay().querySelector('button').click();
  else if(event==='deadline')b.deadline();
  else b.overlay().querySelector('video').dispatchEvent(new b.w.Event(event));
  assert.equal(b.overlay(),null);assert.equal(b.clean().paused,1);b.deadline();assert.equal(b.clean().paused,1);b.dom.window.close();
 }
});

test('autoplay rejection cannot block Home; denied storage and repeat navigation are safe',async()=>{
 const b=boot({reject:true});await Promise.resolve();assert.equal(b.overlay(),null);b.dom.window.close();
 const c=boot({storage:true});assert.ok(c.overlay());c.deadline();c.dom.window.close();
 const d=boot();d.deadline();d.w.eval(source);assert.equal(d.overlay(),null);d.dom.window.close();
});

test('first successful playback is remembered and later launches use only the short transition',()=>{
 const first=boot(),video=first.overlay().querySelector('video');
 video.dispatchEvent(new first.w.Event('playing'));
 assert.equal(first.w.localStorage.getItem('matchapp-launch-intro-seen-v1'),'true');
 first.deadline();first.dom.window.close();

 const later=boot({seen:true});
 assert.equal(later.overlay(),null);
 assert.ok(later.transition());
 assert.match(later.transition().querySelector('img').src,/matchapp-official-icon-192\.png$/);
 later.dom.window.close();
});

test('registered accounts suppress video permanently without touching authentication handlers',()=>{
 const b=boot({registered:true});
 assert.equal(b.overlay(),null);assert.ok(b.transition());b.dom.window.close();
 assert.match(source,/auth\.onAuthStateChange/);
 assert.match(source,/MatchAppNativeStartup\.markRegistered/);
});

test('native intro is bundled, duration-aware, one-time and destroyed on background without changing playback permissions',()=>{
 const s=fs.readFileSync('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt','utf8');
 assert.match(s,/R\.raw\.matchapp_launch_intro/);
 assert.match(s,/root\.postDelayed\(introDeadline, 8000L\)/);
 assert.match(s,/maxOf\(player\.duration\.toLong\(\), 10000L\) \+ 5000L/);
 assert.match(s,/PREF_INTRO_SEEN/);
 assert.match(s,/NativeStartupBridge/);
 assert.match(s,/R\.drawable\.matchapp_official_icon/);
 assert.match(s,/setOnErrorListener/);
 assert.match(s,/override fun onPause\(\) \{\s*finishIntro\(\)\s*finishStartupTransition\(immediate = true\)/);
 assert.match(s,/mediaPlaybackRequiresUserGesture = true/);
 assert.match(s,/savedInstanceState == null && intent\.data == null\) startStartupExperience\(\)/);
 assert.ok(fs.statSync('assets/brand/matchapp-launch-intro-hd.mp4').size>1000000);
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

test('loading artwork gives way to playback and playback gets a duration-aware failsafe',()=>{
 const b=boot(),video=b.overlay().querySelector('video');
 assert.match(b.overlay().querySelector('img').src,/matchapp-official-icon-192\.png$/);
 assert.equal(video.style.visibility,'hidden');
 assert.match(b.overlay().querySelector('style').textContent,/prefers-reduced-motion/);
 Object.defineProperty(video,'duration',{value:7.2,configurable:true});
 video.dispatchEvent(new b.w.Event('playing'));
 assert.equal(video.style.visibility,'visible');assert.equal(b.overlay().querySelector('img'),null);
 assert.equal(b.w.localStorage.getItem('matchapp-launch-intro-seen-v1'),'true');
 b.deadline();assert.equal(b.overlay(),null);b.dom.window.close();
});

test('installed startup script still starts from head before render-blocking styles',()=>{
 const home=fs.readFileSync('index.html','utf8');
 const intro=home.indexOf('/installed-app-intro.js?v=20261004-startuponce1');
 assert.ok(intro>0);
 assert.ok(intro<home.indexOf('</head>'));
 assert.ok(intro<home.indexOf('/style.css'));
 assert.equal(home.indexOf('/installed-app-intro.js',home.indexOf('<body')), -1);
 assert.match(source,/document\.documentElement\.appendChild\(overlay\)/);
});
