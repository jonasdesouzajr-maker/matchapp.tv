const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('android-studio/app/src/main/assets/android-premium-shell.js','utf8');
const refresh=source.slice(source.indexOf('  function refreshForStructuralChanges('),source.indexOf('  function schedulePremiumRefresh('));
test('editorial normalization preserves native chat cascade priority and preview parity',()=>{
 const {cinemaAssets}=require('../tools/finalize-brand.js');
 const page=fs.readFileSync('discover.html','utf8');
 const normalized=cinemaAssets(page,'discover.html');
 assert.equal(normalized,page);
 assert.equal(cinemaAssets(normalized,'discover.html'),normalized);
 const document=new JSDOM(normalized).window.document;
 assert.equal(document.head.firstElementChild.textContent,'@layer ma-native-chat,ma-reference;');
 document.defaultView.close();
 assert.equal(fs.readFileSync('android-studio/app/src/debug/assets/ambient-preview/discover.html','utf8'),normalized);
});
test('live text ticks do not restyle the Android shell; inserted and replaced controls do',async()=>{
  const dom=new JSDOM('<body><span id="count">10</span><section></section></body>',{runScripts:'outside-only'}),w=dom.window;
  try{
    let passes=0;w.schedulePremiumRefresh=()=>passes++;
    w.eval(refresh+';window.structuralRefresh=refreshForStructuralChanges;');
    const observer=new w.MutationObserver(w.structuralRefresh);observer.observe(w.document.body,{childList:true,subtree:true});
    for(let i=10;i>=0;i--)w.document.querySelector('#count').textContent=String(i);
    await Promise.resolve();assert.equal(passes,0);
    w.document.querySelector('section').innerHTML='<button>New result</button>';
    await Promise.resolve();assert.equal(passes,1);
    w.document.querySelector('button').replaceWith(w.document.createElement('input'));
    await Promise.resolve();assert.equal(passes,2);
    observer.disconnect();
  }finally{w.close()}
});

test('Jonas speech highlights do not restyle the iframe, but mode and structural changes do',()=>{
  const dom=new JSDOM('<body><span id="word">hello</span></body>',{runScripts:'outside-only'}),w=dom.window;
  try{
    const fn=source.slice(source.indexOf('  function shouldPolishJonasFrame('),source.indexOf('  function polishJonasFrame('));
    w.eval(fn+';window.shouldPolish=shouldPolishJonasFrame;');
    const body=w.document.body,word=body.querySelector('span');
    assert.equal(w.shouldPolish([{type:'attributes',target:word,attributeName:'class'}],body),false);
    assert.equal(w.shouldPolish([{type:'attributes',target:body,attributeName:'class'}],body),true);
    assert.equal(w.shouldPolish([{type:'childList',addedNodes:[w.document.createTextNode('hi')],removedNodes:[]}],body),false);
    assert.equal(w.shouldPolish([{type:'childList',addedNodes:[w.document.createElement('button')],removedNodes:[]}],body),true);
  }finally{w.close()}
});
test('login-only modal records login without requiring a signup form',()=>{
  const dom=new JSDOM('<div id="main-auth-modal"><button>Continue</button></div>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
  try{
    const fn=source.slice(source.indexOf('  function authIntent('),source.indexOf('  function cleanupOnboardingParam('));
    const errors=[];w.addEventListener('error',e=>errors.push(e.error));w.qs=(selector,root=w.document)=>root.querySelector(selector);
    w.eval(fn+';authIntent();');w.document.querySelector('button').click();
    assert.deepEqual(errors,[]);assert.equal(w.sessionStorage.getItem('ma_android_auth_flow'),'login');
  }finally{w.close()}
});

test('studio cards keep real project links, localized availability and one instance',()=>{
 const dom=new JSDOM('<body class="page-home"><footer class="seo-footer"></footer></body>',{runScripts:'outside-only'}),w=dom.window;
 try{
  w.qs=(selector,root=w.document)=>root.querySelector(selector);w.qsa=(selector,root=w.document)=>[...root.querySelectorAll(selector)];let locale='pt';w.lang=()=>locale;
  const fn=source.slice(source.indexOf('  const studioCopy='),source.indexOf('  function paintAndroidChrome('));
  w.eval(fn+';window.mountGames=mountStudioGames;');w.mountGames();w.mountGames();
  const section=w.document.querySelector('#ma-android-studio-games');assert(section);assert.equal(w.document.querySelectorAll('#ma-android-studio-games').length,1);
  assert.equal(section.querySelector('small').textContent,'Em breve no Google Play');
  assert.deepEqual([...section.querySelectorAll('.ma-studio-grid a')].map(a=>a.getAttribute('href')),['/founder/#lumina-title','/founder/#reelforge-title']);
  assert.equal(section.nextElementSibling.tagName,'FOOTER');locale='en';w.mountGames();assert.equal(section.querySelector('small').textContent,'Coming soon to Google Play');
  assert.equal(section.querySelectorAll('img[loading="lazy"]').length,2);
 }finally{w.close()}
});

test('Android notifications move the live control into the menu without losing its click handler or unread badge',()=>{
 const dom=new JSDOM('<body><div class="ma-cinema-tools-content"><button class="matchapp-notification-button"></button></div><button class="matchapp-notification-button matchapp-notification-floating" aria-label="Notifications"><span class="matchapp-notification-count">2</span></button></body>',{runScripts:'outside-only'}),w=dom.window;
 try{
  const button=w.document.querySelector('.matchapp-notification-floating');let opened=0;button.onclick=()=>opened++;
  w.qs=(s,r=w.document)=>r.querySelector(s);
  const fn=source.slice(source.indexOf('  function dockNativeNotifications(){'),source.indexOf('  function paintAndroidChrome(){'));
  w.eval(fn+';window.dock=dockNativeNotifications');w.dock();w.dock();
  assert.equal(w.document.querySelectorAll('.matchapp-notification-button').length,1);
  assert.equal(w.document.querySelector('.ma-cinema-tools-content .ma-native-notifications'),button);
  assert.equal(button.querySelector('.matchapp-notification-count').textContent,'2');button.click();assert.equal(opened,1);
  button.setAttribute('aria-label','Notificações');w.dock();assert.equal(button.querySelector('.ma-native-notifications-label').textContent,'Notificações');
 }finally{w.close()}
});
