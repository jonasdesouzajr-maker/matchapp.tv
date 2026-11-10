const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../android-studio/app/src/main/assets/native-destination-dock.js'),'utf8');
const keys=['home','explore','matches','list','profile'];
const feedback=fs.readFileSync(path.join(__dirname,'../patches/immersive-feedback-20261014.js'),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
test('native appearance follows a theme change without changing destinations or duplicating messages',async()=>{
  const nav='<nav class="ma-cinema-dock">'+keys.map(key=>'<a href="#'+key+'" data-cinema-route="'+key+'"><span data-cinema-copy>'+key+'</span></a>').join('')+'</nav>';
  const dom=new JSDOM(nav,{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
  try{
    const w=dom.window,posts=[];w.matchMedia=()=>({matches:false});nativeBridge(w,posts);w.eval(source);
    const frame=()=>new Promise(resolve=>w.requestAnimationFrame(()=>w.requestAnimationFrame(resolve)));
    await frame();assert.equal(posts.at(-1).light,false);
    w.document.documentElement.dataset.theme='sunrise';await frame();
    assert.equal(posts.at(-1).light,true);assert.deepEqual(posts.at(-1).labels,keys);
    const count=posts.length;w.document.documentElement.dataset.theme='sunrise';await frame();assert.equal(posts.length,count);
    w.document.documentElement.dataset.theme='aurora';await frame();assert.equal(posts.at(-1).light,false);
  }finally{dom.window.close()}
});
function nativeBridge(w,posts) {
  const listeners=[];
  w.MatchAppDestinationDock={
    postMessage:text=>posts.push(JSON.parse(text)),
    addEventListener(type,fn) { if(type==='message') listeners.push(fn); }
  };
  return data=>{
    const event={data};
    for(const listener of listeners) listener(event);
    w.MatchAppDestinationDock.onmessage?.(event);
  };
}
test('native navigation mirrors one localized owner and restores its original layout on dismissal',async()=>{
  const html='<body style="padding-bottom:12px"><nav class="ma-cinema-dock">'+keys.map((key,i)=>'<a href="#'+key+'" data-cinema-route="'+key+'" '+(i===1?'aria-current="page"':'')+'><span data-cinema-copy>'+key+'</span></a>').join('')+'</nav>';
  const dom=new JSDOM(html,{url:'https://matchapp.tv/explore.html',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,posts=[];
  w.matchMedia=()=>({matches:false});
  const receive=nativeBridge(w,posts);
  w.eval(source);w.eval(source);
  assert.equal(posts.length,1);assert.deepEqual(posts[0].labels,keys);
  assert.equal(posts[0].selected,1);assert.equal(posts[0].visible,true);
  receive('shown');
  let clicks=0;
  w.document.querySelector('[data-cinema-route="matches"]').onclick=e=>{e.preventDefault();clicks++;};
  let exploreClicks=0;
  w.document.querySelector('[data-cinema-route="explore"]').onclick=e=>{e.preventDefault();exploreClicks++;};
  receive('explore:1');await tick();assert.equal(posts.at(-1).openExplore,true);assert.equal(exploreClicks,0);
  receive('activate:1');await tick();assert.equal(exploreClicks,1);
  receive('activate:2');await tick();assert.equal(clicks,1);
  assert.equal(w.document.querySelector('nav').style.display,'none');
  receive('hidden');receive('activate:2');await tick();assert.equal(clicks,1);
  assert.equal(w.document.body.style.paddingBottom,'12px');assert.equal(w.document.querySelector('nav').style.display,'');
  dom.window.close();
});
test('native destinations wait for style- and class-controlled modals to close',async()=>{
  const nav='<nav class="ma-cinema-dock">'+keys.map((key,i)=>'<a href="#'+key+'" data-cinema-route="'+key+'" '+(i===0?'aria-current="page"':'')+'><span data-cinema-copy>'+key+'</span></a>').join('')+'</nav>';
  const dom=new JSDOM(nav+'<div role="dialog" aria-modal="true" style="display:none"></div>',
    {url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
  try {
    const w=dom.window,posts=[],receive=nativeBridge(w,posts);
    w.matchMedia=()=>({matches:false});
    const frame=()=>new Promise(resolve=>w.requestAnimationFrame(()=>w.requestAnimationFrame(resolve)));
    const modal=w.document.querySelector('[role="dialog"]');
    modal.getClientRects=()=>modal.style.display==='flex' ? [{}] : [];
    const profile=w.document.querySelector('[data-cinema-route="profile"]');
    let clicks=0;
    profile.onclick=e=>{e.preventDefault();clicks++;};
    w.eval(source);receive('shown');await frame();
    // Home's auth, poster and feedback dialogs use display:flex to open.
    modal.style.display='flex';
    assert.equal(w.__maNativeDock.targetFor('activate:4'),null);
    receive('explore:1');assert.equal(posts.some(p=>p.openExplore),false);
    receive('activate:4');await frame();
    assert.equal(clicks,0);assert.equal(posts.at(-1).visible,false);receive('hidden');
    modal.style.display='none';await frame();
    assert.equal(posts.at(-1).visible,true);receive('shown');

    const panel=w.document.createElement('section');
    panel.innerHTML='<div role="dialog" aria-modal="true"></div>';
    const dynamic=panel.firstElementChild;
    dynamic.getClientRects=()=>dynamic.classList.contains('open') ? [{}] : [];
    w.document.body.append(panel);await frame();
    receive('activate:4');dynamic.classList.add('open');await frame();
    assert.equal(clicks,0);assert.equal(posts.at(-1).visible,false);receive('hidden');
    panel.remove();await frame();
    assert.equal(posts.at(-1).visible,true);receive('shown');
    receive('activate:4');await tick();
    assert.equal(clicks,1);
  } finally {dom.window.close();}
});
test('Kids and outside origins retain their own navigation',()=>{
  for(const url of ['https://matchapp.tv/kids/','https://example.com/']){
    const dom=new JSDOM('<body></body>',{url,runScripts:'outside-only'});
    dom.window.MatchAppDestinationDock={postMessage(){throw Error('unexpected bridge call');}};
    dom.window.eval(source);assert.equal(dom.window.__maNativeDock,undefined);dom.window.close();
  }
});

test('only native menu activations produce one shared signature before navigation',async()=>{
  const dom=new JSDOM('<body><nav class="ma-cinema-dock"><a href="#matches" data-cinema-route="matches" data-ma-dock-destination="matches"><span data-cinema-copy>Matches</span></a></nav></body>',
    {url:'https://matchapp.tv/explore.html',runScripts:'outside-only',pretendToBeVisual:true});
  try {
    const w=dom.window,posts=[],receive=nativeBridge(w,posts),cues=[],haptics=[];
    w.matchMedia=()=>({matches:false});
    w.navigator.vibrate=pattern=>haptics.push(Array.from(pattern));
    const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}});
    w.AudioContext=class {
      constructor(){this.state='running';this.currentTime=0;this.destination={};}
      createOscillator(){return {frequency:{setValueAtTime:n=>cues.push(n)},connect(){},disconnect(){},start(){},stop(){}};}
      createGain(){return {gain:param(),connect(){},disconnect(){}};}
    };
    let now=1000;
    w.Date.now=()=>now;
    w.eval(feedback);w.eval(source);
    w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
    const anchor=w.document.querySelector('a'),counts=[];
    anchor.onclick=e=>{e.preventDefault();counts.push(cues.length);};
    anchor.click();receive('activate:2');receive('shown');receive('activate:7');await tick();
    assert.deepEqual(counts,[0]);
    receive('activate:2');await tick();
    assert.deepEqual(counts,[0,9]);
    assert.equal(cues[0],659.25);
    assert.deepEqual(haptics,[[6,18,6]]);
    now+=200;w.localStorage.setItem('match_soundEnabled','false');
    w.localStorage.setItem('match_hapticsEnabled','false');
    receive('activate:2');await tick();
    assert.deepEqual(counts,[0,9,9]);assert.equal(haptics.length,1);
    now+=200;w.localStorage.setItem('match_hapticsEnabled','true');
    w.navigator.vibrate=()=>false;
    receive('activate:2');await tick();
    const fallbacks=posts.filter(p=>p.dockHaptic);
    assert.deepEqual(fallbacks,[{href:w.location.href,dockHaptic:'activate:2',timings:[6,18,6]}]);
    receive('hidden');receive('activate:2');await tick();assert.equal(counts.length,4);
  } finally {dom.window.close();}
});
