/* Read layout and exercise appearance/language controls in an ADB-forwarded
 * physical Android QA WebView. Never connect this runner to a desktop browser. */
const fs=require('node:fs');
(async()=>{
 const pages=await fetch('http://127.0.0.1:9223/json',{signal:AbortSignal.timeout(10000)}).then(r=>r.json());
 const page=pages.find(p=>p.type==='page'&&/^https:\/\/matchapp\.tv\//.test(p.url));
 if(!page)throw Error('Physical MatchApp QA WebView not found');
 const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
 let next=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(m.error):p.resolve(m.result)}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'))},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const waitFor=async expression=>{for(let i=0;i<40;i++){if(await evaluate(expression))return;await delay(250)}throw Error('UI did not settle: '+expression)};
 const tap=async selector=>{const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control');const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(180)};
 const initial=await evaluate(`({language:document.querySelector('#lang-switcher').value,theme:window.MatchSettings.get('theme'),ua:navigator.userAgent})`);
 if(!initial.ua.includes('MatchAppAiAndroid/'))throw Error('Only the native Android app may be tested');
 const results=[];
 try{
  for(const lang of (process.argv[3]?.split(',')||['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh','zh-TW'])){
   await evaluate(`(()=>{const s=document.querySelector('#lang-switcher');s.value=${JSON.stringify(lang)};s.dispatchEvent(new Event('change',{bubbles:true}))})()`);await waitFor(`document.documentElement.lang===${JSON.stringify(lang)}&&!!document.querySelector('.ma-cinema-tools')`);await delay(500);
   for(const theme of ['aurora','sunrise']){
    await evaluate(`window.MatchSettings.set('theme',${JSON.stringify(theme)})`);await delay(250);
    if(!await evaluate(`document.querySelector('.ma-cinema-tools').open`))await tap('.ma-cinema-tools>summary');
    await waitFor(`document.querySelector('.ma-cinema-tools').open&&document.querySelector('.ma-android-appearance button').checkVisibility({checkOpacity:true,checkVisibilityCSS:true})`);
    const value=await evaluate(`(()=>{const rect=e=>e?.getBoundingClientRect().toJSON(),visible=e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});const menu=document.querySelector('.ma-cinema-tools-content');const controls=[...menu.querySelectorAll('button,a,select')].filter(visible).map(e=>{const r=rect(e),svg=e.querySelector('svg'),s=rect(svg);return{id:e.id||e.className||e.dataset.maAppearance,text:e.tagName==='SELECT'?e.selectedOptions[0]?.textContent:e.textContent.trim(),r,clip:e.scrollWidth>e.clientWidth+2,iconOffset:s?Math.abs((s.y+s.height/2)-(r.y+r.height/2)):null}});return{lang:document.documentElement.lang,theme:document.documentElement.dataset.theme,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth-innerWidth,header:rect(document.querySelector('#ma-reference-header')),menu:rect(menu),controls,heading:rect(document.querySelector('.ma-cinema-section-heading h2')),rail:rect(document.querySelector('.marquee-viewport')),background:getComputedStyle(document.body).backgroundColor}})()`);
    value.requested={lang,theme};value.issues=[];
    if(value.controls.length<6)value.issues.push('menu controls not visible');
    if(value.lang!==lang||value.theme!==theme)value.issues.push('requested settings not applied');
    if(value.overflow>1)value.issues.push('document overflow');
    if(value.menu.x<0||value.menu.right>value.width+1||value.menu.bottom>value.height+1)value.issues.push('menu outside viewport');
    if(value.heading.bottom>value.rail.top-3)value.issues.push('title overlaps poster rail');
    for(const c of value.controls){if(c.r.height<43)value.issues.push('short target '+c.id);if(c.clip)value.issues.push('clipped control '+c.id);if(c.iconOffset>3)value.issues.push('icon misaligned '+c.id)}
    results.push(value);console.log(lang+' '+theme+': '+(value.issues.join(', ')||'PASS'));
    await tap('.ma-cinema-tools>summary');
    await waitFor(`!document.querySelector('.ma-cinema-tools').open&&!document.querySelector('.ma-cinema-tools-content').checkVisibility({checkOpacity:true,checkVisibilityCSS:true})`);
    const hidden=await evaluate(`!document.querySelector('.ma-cinema-tools-content').checkVisibility({checkOpacity:true,checkVisibilityCSS:true})`);if(!hidden)value.issues.push('closed menu remains visible');
   }
  }
 }finally{
  await evaluate(`(()=>{const s=document.querySelector('#lang-switcher');s.value=${JSON.stringify(initial.language)};s.dispatchEvent(new Event('change',{bubbles:true}));window.MatchSettings.set('theme',${JSON.stringify(initial.theme)})})()`);
  fs.writeFileSync(process.argv[2]||'android-compact-scan.json',JSON.stringify({device:'Samsung SM-X236B through ADB',initial,results},null,2));ws.close();
 }
 if(results.some(r=>r.issues.length))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
