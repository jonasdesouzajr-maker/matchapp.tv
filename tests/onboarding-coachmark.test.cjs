const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n');

test('How It Works includes two anchored Bookworms steps alongside existing product controls',()=>{
  const js=read('onboarding-tour.js');
  for(const selector of [
    '#ma-tab-match',
    '.ma-quick .ma-filter-row.ma-mood-block',
    '.ma-quick .ma-filter-row:nth-child(2)',
    '.ma-quick .ma-filter-row:nth-child(3)',
    '.match-more-filters>summary',
    '#ebook-matcher-root .ebook-fold>summary',
    '#ebook-matcher-root .ebook-select[data-ebook-select="format"]',
    '#ma-tab-ask',
    '#trending-rail .marquee-item:nth-child(2)',
    '#matchapp-kids-entry',
    '#profile-link-tab'
  ]) assert.ok(js.includes(selector),selector+' must remain a tour target');
  assert.ok(js.indexOf("key:'more'")<js.indexOf("key:'book'"));
  assert.ok(js.indexOf("key:'book'")<js.indexOf("key:'bookFormat'"));
  assert.ok(js.indexOf("key:'bookFormat'")<js.indexOf("key:'ai'"));
  assert.match(js,/restoreBookFold\(\)/);
  assert.match(js,/step\.mode==='book-form'/);
  assert.doesNotMatch(js,/key:'find'/);
  assert.doesNotMatch(js,/key:'quota'/);
});

test('walkthrough never focuses text fields or activates Ask AI by itself',()=>{
  const js=read('onboarding-tour.js');
  assert.match(js,/Ask AI is deliberately never/);
  assert.doesNotMatch(js,/step\.mode==='ask'/);
  assert.doesNotMatch(js,/getElementById\('ma-tab-ask'\)\?\.click\(\)/);
  assert.match(js,/function guardFocus\(e\)/);
  assert.match(js,/input,textarea,\[contenteditable/);
  assert.match(js,/node\.blur\(\)/);
});

test('premium coachmark is a compact speech bubble with a directional triangular tail',()=>{
  const js=read('onboarding-tour.js'),css=read('onboarding-tour.css');
  assert.match(js,/panel\.dataset\.side=best\.side/);
  assert.match(js,/--tour-arrow-x/);
  assert.match(js,/--tour-arrow-y/);
  assert.match(js,/overflowScore/);
  for(const side of ['below','above','right','left']) assert.match(css,new RegExp('data-side="'+side+'"'));
  assert.match(css,/clip-path:polygon/);
  assert.match(css,/width:min\(310px,calc\(100vw - 28px\)\)/);
  assert.doesNotMatch(css,/bottom:24px/);
});

test('phone walkthrough scrolls targets into a safe zone instead of becoming a bottom sheet',()=>{
  const js=read('onboarding-tour.js');
  assert.match(js,/function revealTarget\(el\)/);
  assert.match(js,/const roomBelow=vp\.bottom-r\.bottom/);
  assert.match(js,/const roomAbove=r\.top-vp\.top/);
  assert.match(js,/vp\.height\*\.31/);
  assert.match(js,/window\.scrollBy/);
});

test('spotlight leaves context readable and highlights the actual target',()=>{
  const css=read('onboarding-tour.css');
  assert.match(css,/rgba\(4,3,12,\.48\)/);
  assert.match(css,/border:2px solid rgba\(255,229,128,\.98\)/);
  assert.match(css,/matchappTourSpotV6/);
  assert.match(css,/\.matchapp-tour-spotlight::after/);
});

test('manual walkthrough ships the new cache key to Home',()=>{
  const js=read('onboarding-tour.js'),html=read('index.html');
  assert.match(js,/function start\(\)[\s\S]*show\(0\)/);
  assert.match(js,/const VERSION='v7'/);
  assert.ok(html.includes('/onboarding-tour.css?v=20260924-coach3'));
  assert.ok(html.includes('/onboarding-tour.js?v=20260926-bookworms7'));
  assert.doesNotMatch(html,/20260924-coach1/);
});


test('off-screen controls never become edge-clamped fake spotlights',()=>{
  const js=read('onboarding-tour.js');
  assert.match(js,/const visibleWidth=Math\.max\(0/);
  assert.match(js,/const targetReady=/);
  assert.match(js,/spot\.hidden=true/);
  assert.match(js,/panel\.style\.visibility='hidden'/);
});

test('Home carries a compact in-flow growth disclosure',()=>{
  const html=read('index.html'),css=read('frontend-polish.css');
  assert.match(html,/id="matchapp-growth-disclosure"/);
  assert.match(html,/Always growing\./);
  assert.match(html,/constantly expanding with new titles, features and experiences/);
  assert.match(css,/\.matchapp-growth-disclosure\{/);
  assert.match(css,/position:relative/);
  assert.doesNotMatch(css,/\.matchapp-growth-disclosure\{[^}]*position:fixed/);
});


test('manual tour pinpoints Bookworms card and its real format dropdown, then restores collapse',async()=>{
  const {JSDOM}=require('jsdom');
  const html='<html lang="en"><body class="page-home">'+
    '<button id="ma-tab-match">Match</button>'+
    '<article id="questionnaire-box">Watch matching</article>'+
    '<section id="ebook-matcher-root"><details class="ebook-fold"><summary>Find what to read here</summary>'+
    '<label><select class="ebook-select" data-ebook-select="format"><option value="any">Any</option><option value="magazine">Magazine</option></select></label>'+
    '</details></section>'+
    '<button id="ma-tab-ask">Ask AI</button>'+
    '</body></html>';
  const dom=new JSDOM(html,{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,doc=w.document;
  w.matchMedia=()=>({matches:true});
  w.HTMLElement.prototype.getBoundingClientRect=function(){
    const isDropdown=this.matches?.('.ebook-select');
    const left=isDropdown?240:100,top=isDropdown?220:120;
    return {left,top,right:left+155,bottom:top+52,width:155,height:52,x:left,y:top,toJSON(){}};
  };
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.scrollBy=function(){};
  let askClicks=0;
  doc.getElementById('ma-tab-ask').addEventListener('click',()=>{askClicks++;});
  w.eval(read('onboarding-tour.js'));
  const fold=doc.querySelector('#ebook-matcher-root .ebook-fold');
  assert.equal(fold.open,false);
  w.MatchAppOnboarding.start();
  const panel=doc.querySelector('.matchapp-tour-card');
  assert.ok(panel,'Real coachmark should be mounted');
  assert.equal(panel.querySelector('#matchapp-tour-title').textContent,'Find My Perfect Match');
  panel.querySelector('.matchapp-tour-next').click();
  assert.equal(panel.querySelector('#matchapp-tour-title').textContent,'Meet Bookworms');
  assert.equal(panel.querySelector('.matchapp-tour-count').textContent,'2 of 4');
  assert.equal(fold.open,false,'Introduction must highlight closed Bookworms card');
  panel.querySelector('.matchapp-tour-next').click();
  assert.equal(panel.querySelector('#matchapp-tour-title').textContent,'Pick what to read or listen to');
  assert.equal(fold.open,true,'Actual format dropdown is revealed without activating any AI');
  await new Promise(resolve=>w.setTimeout(resolve,30));
  assert.equal(doc.querySelector('.matchapp-tour-spotlight').style.left,'233px','Coachmark must target the dropdown instead of the Ask AI card');
  panel.querySelector('.matchapp-tour-next').click();
  assert.equal(panel.querySelector('#matchapp-tour-title').textContent,'Ask MatchApp Ai');
  assert.equal(fold.open,false,'Leaving the Bookworms lesson restores the starting closed state');
  assert.equal(askClicks,0,'Tour must never invoke Ask AI or auto-open the keyboard');
  panel.querySelector('.matchapp-tour-back').click();
  assert.equal(fold.open,true,'Returning to the format step temporarily reopens Bookworms');
  panel.querySelector('.matchapp-tour-skip').click();
  assert.equal(fold.open,false,'Closing the tour restores the original layout');
  dom.window.close();
});

test('tour stays usable without Bookworms and never starts itself in Kids Mode',()=>{
  const {JSDOM}=require('jsdom');
  function setup(url){
    const dom=new JSDOM('<html><body><button id="ma-tab-match">Match</button></body></html>',{url,runScripts:'outside-only',pretendToBeVisual:true});
    dom.window.matchMedia=()=>({matches:true});
    dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({left:70,top:80,right:190,bottom:132,width:120,height:52});
    dom.window.HTMLElement.prototype.scrollIntoView=function(){};
    dom.window.eval(read('onboarding-tour.js'));
    return dom;
  }
  const home=setup('https://matchapp.tv/');
  home.window.MatchAppOnboarding.start();
  assert.equal(home.window.document.querySelector('.matchapp-tour-count').textContent,'1 of 1','Missing Bookworms target is gracefully skipped');
  home.window.MatchAppOnboarding.close();
  home.window.close();
  const kids=setup('https://matchapp.tv/kids/');
  kids.window.MatchAppOnboarding.start();
  assert.equal(kids.window.document.querySelector('.matchapp-tour-card'),null,'Adult tour is not mounted on Kids pages');
  kids.window.close();
});
