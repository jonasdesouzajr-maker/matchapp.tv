const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../android-studio/app/src/main/assets/native-destination-dock.js'),'utf8');
const keys=['home','explore','matches','list','profile'];
test('native navigation mirrors one localized owner and restores its original layout on dismissal',()=>{
  const html='<body style="padding-bottom:12px"><nav class="ma-cinema-dock">'+keys.map((key,i)=>'<a href="#'+key+'" data-cinema-route="'+key+'" '+(i===1?'aria-current="page"':'')+'><span data-cinema-copy>'+key+'</span></a>').join('')+'</nav>';
  const dom=new JSDOM(html,{url:'https://matchapp.tv/explore.html',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,posts=[];
  w.matchMedia=()=>({matches:false});
  w.MatchAppDestinationDock={postMessage:text=>posts.push(JSON.parse(text))};
  w.eval(source);w.eval(source);
  assert.equal(posts.length,1);assert.deepEqual(posts[0].labels,keys);
  assert.equal(posts[0].selected,1);assert.equal(posts[0].visible,true);
  w.MatchAppDestinationDock.onmessage({data:'shown'});
  let clicks=0;
  w.document.querySelector('[data-cinema-route="matches"]').onclick=e=>{e.preventDefault();clicks++;};
  w.__maNativeDock.activate(2);assert.equal(clicks,1);
  assert.equal(w.document.querySelector('nav').style.display,'none');
  w.MatchAppDestinationDock.onmessage({data:'hidden'});w.__maNativeDock.activate(2);assert.equal(clicks,1);
  assert.equal(w.document.body.style.paddingBottom,'12px');assert.equal(w.document.querySelector('nav').style.display,'');
  dom.window.close();
});
test('Kids and outside origins retain their own navigation',()=>{
  for(const url of ['https://matchapp.tv/kids/','https://example.com/']){
    const dom=new JSDOM('<body></body>',{url,runScripts:'outside-only'});
    dom.window.MatchAppDestinationDock={postMessage(){throw Error('unexpected bridge call');}};
    dom.window.eval(source);assert.equal(dom.window.__maNativeDock,undefined);dom.window.close();
  }
});
