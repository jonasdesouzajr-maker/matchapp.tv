"use strict";

// Local visual/interaction QA only. One browser page at a time; no publication.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const helperPath=process.env.MATCHAPP_QA_CAPTURE_HELPER||'/workspace/scratch/cinema-capture-helper.cjs';
const capture=require(helperPath);
const output=process.env.MATCHAPP_QA_HEADER_REPORT||'/workspace/scratch/reference-header-browser.json';
const dragKey='matchapp-jonas-header-drag-v1';
const saved='{"x":0.79,"y":0.66}';
const keys=['matchapp-jonas-position-v2','matchapp-jonas-inline-position-v1','matchapp_jonas_ambient_position_v1'];
const expectedRoutes={home:'/',explore:'/explore.html',matches:'/#questionnaire-box',list:'/profile/profile.html#tab-watchlater',profile:'/profile/profile.html'};
const defaultCases=[
 {width:320,platform:'browser',lang:'en',scale:1},
 {width:390,platform:'browser',lang:'en',scale:1},
 {width:820,platform:'browser',lang:'en',scale:1},
 {width:1366,platform:'browser',lang:'en',scale:1},
 {width:390,platform:'android',lang:'en',scale:1},
 {width:820,platform:'android',lang:'en',scale:1},
 {width:320,platform:'browser',lang:'ar',scale:1.4},
 {width:390,platform:'android',lang:'ar',scale:1.4}
];
const cases=process.env.MATCHAPP_HEADER_CASES?JSON.parse(process.env.MATCHAPP_HEADER_CASES):defaultCases;
const report={scope:'Current local shared-header ownership and original Jonas conversation; sequential one-page QA with authentic native APP_MODE_JS/APP_UA and exact source artwork. API writes and non-art remote requests are blocked by the shared capture helper.',cases:[],failures:[]};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function measure(page,search=false) {
 return page.evaluate(search=>{
  const roots=[...document.querySelectorAll('#ma-ambient-jonas,#ma-jonas-home')].filter(e=>{const r=e.getBoundingClientRect();return r.width>20&&r.height>20&&!e.hidden&&getComputedStyle(e).visibility!=='hidden';});
  const root=roots[0];if(!root)return{missing:true,count:roots.length};
  const box=e=>{const r=e.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const bubble=box(root),radius=Math.max(bubble.width,bubble.height)/2+8,cx=(bubble.left+bubble.right)/2,cy=(bubble.top+bubble.bottom)/2;
  function circle(r,x=cx,y=cy){const dx=Math.max(r.left-x,0,x-r.right),dy=Math.max(r.top-y,0,y-r.bottom);return dx*dx+dy*dy<radius*radius;}
  function visible(e){
   if(root.contains(e)||e.closest('#ma-ambient-panel,#ma-jonas-home-panel,[hidden],script,style,noscript,template'))return false;
   const s=getComputedStyle(e);if(s.visibility==='hidden'||s.display==='none'||s.opacity==='0')return false;
   const closed=e.closest('details:not([open])');if(closed&&!closed.querySelector(':scope > summary')?.contains(e))return false;
   return e.checkVisibility?.({checkOpacity:true,checkVisibilityCSS:true,contentVisibilityAuto:true})!==false;
  }
  function clip(r,e){
   const out={left:Math.max(0,r.left),right:Math.min(innerWidth,r.right),top:Math.max(0,r.top),bottom:Math.min(innerHeight,r.bottom)};
   for(let a=e;a&&a!==document.body;a=a.parentElement){const s=getComputedStyle(a),ar=a.getBoundingClientRect();if(/hidden|clip|scroll|auto/.test(s.overflowX)){out.left=Math.max(out.left,ar.left);out.right=Math.min(out.right,ar.right);}if(/hidden|clip|scroll|auto/.test(s.overflowY)){out.top=Math.max(out.top,ar.top);out.bottom=Math.min(out.bottom,ar.bottom);}}
   return out.right-out.left>1&&out.bottom-out.top>1?out:null;
  }
  const chrome=[...document.querySelectorAll('nav.ma-cinema-dock,.ma-jonas-reserve-only')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({e,r:e.getBoundingClientRect()}));
  function visibleParts(r,e){
   let parts=r?[r]:[];
   for(const item of chrome){
    if(item.e.contains(e))continue;
    const cover=item.r,next=[];
    for(const p of parts){
     const l=Math.max(p.left,cover.left),t=Math.max(p.top,cover.top),rr=Math.min(p.right,cover.right),b=Math.min(p.bottom,cover.bottom);
     if(rr<=l||b<=t){next.push(p);continue;}
     if(p.top<t)next.push({...p,bottom:t});
     if(b<p.bottom)next.push({...p,top:b});
     if(p.left<l)next.push({left:p.left,right:l,top:t,bottom:b});
     if(rr<p.right)next.push({left:rr,right:p.right,top:t,bottom:b});
    }
    parts=next.filter(p=>p.right-p.left>1&&p.bottom-p.top>1);
   }
   return parts;
  }
  const controls=[],texts=[];
  const selector='a,button,input,select,textarea,summary,[role="button"],#trending-rail,.marquee-viewport,.ref-primary-topics,ins.adsbygoogle,iframe,.ad-banner-container,.sidebar-ad-left,.sidebar-ad-right';
  for(const e of document.querySelectorAll(selector)){if(!visible(e))continue;const r=clip(e.getBoundingClientRect(),e);for(const part of visibleParts(r,e))controls.push({kind:e.matches('ins.adsbygoogle,iframe,.ad-banner-container,.sidebar-ad-left,.sidebar-ad-right')?'ad':e.matches('#trending-rail,.marquee-viewport,.ref-primary-topics')?'moving-content':'control',tag:e.tagName,id:e.id,cls:String(e.className).slice(0,80),text:e.textContent.trim().slice(0,80),...part});}
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(let n=walker.nextNode();n;n=walker.nextNode()){
   if(!n.textContent.trim()||!n.parentElement||!visible(n.parentElement))continue;
   const range=document.createRange();range.selectNodeContents(n);
   for(const line of range.getClientRects()){const r=clip(line,n.parentElement);for(const part of visibleParts(r,n.parentElement))texts.push({kind:'text',tag:n.parentElement.tagName,id:n.parentElement.id,text:n.textContent.trim().slice(0,100),...part});}
  }
  const blocks=[...controls,...texts],overlaps=blocks.filter(r=>circle(r));
  const alternatives=[];
  if(search&&overlaps.length){for(let y=innerHeight-bubble.height-12;y>=12;y-=12){for(let x=innerWidth-bubble.width-12;x>=12;x-=12){if(!blocks.some(r=>circle(r,x+bubble.width/2,y+bubble.height/2))){alternatives.push({x,y});if(alternatives.length===5)break;}}if(alternatives.length===5)break;}}
  return{bubble,count:roots.length,classes:root.className,data:{...root.dataset},position:localStorage.getItem('matchapp-jonas-position-v2'),inside:bubble.left>=0&&bubble.top>=0&&bubble.right<=innerWidth&&bubble.bottom<=innerHeight,viewport:{width:innerWidth,height:innerHeight},documentLanguage:document.documentElement.lang,direction:getComputedStyle(document.documentElement).direction,scrollY,visibleControls:controls.length,visibleTextLines:texts.length,overlaps,alternatives,slot:document.querySelector('.ma-jonas-dock-slot')?.getBoundingClientRect().toJSON()||null};
 },search);
}

async function headerState(page){
 return page.evaluate(keys=>{
  const d=document,w=window,header=d.getElementById('ma-reference-header'),slot=d.getElementById('ma-reference-header-slot'),space=d.getElementById('ma-reference-header-space');
  const rect=e=>e?e.getBoundingClientRect().toJSON():null;
  const visible=e=>e.checkVisibility?.({checkOpacity:true,checkVisibilityCSS:true})!==false&&getComputedStyle(e).clipPath!=='inset(50%)'&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;
  const roots=[...d.querySelectorAll('#ma-jonas-home,#ma-ambient-jonas')].filter(visible),launcher=roots[0];
  function clipped(r,e){
   const out={left:Math.max(0,r.left),top:Math.max(0,r.top),right:Math.min(innerWidth,r.right),bottom:Math.min(innerHeight,r.bottom)};
   for(let a=e;a&&a!==d.body;a=a.parentElement){const style=getComputedStyle(a),box=a.getBoundingClientRect();if(/hidden|clip|scroll|auto/.test(style.overflowX)){out.left=Math.max(out.left,box.left);out.right=Math.min(out.right,box.right);}if(/hidden|clip|scroll|auto/.test(style.overflowY)){out.top=Math.max(out.top,box.top);out.bottom=Math.min(out.bottom,box.bottom);}}
   return out.right-out.left>1&&out.bottom-out.top>1?out:null;
  }
  const controlNodes=header?[...header.querySelectorAll('a,button,input,select,textarea,summary,[role="button"]')].filter(e=>visible(e)&&!launcher?.contains(e)&&clipped(e.getBoundingClientRect(),e)):[];
  const controls=controlNodes.map(e=>{
   const r=e.getBoundingClientRect(),v=clipped(r,e),points=[[v.left+(v.right-v.left)/2,v.top+(v.bottom-v.top)/2],[v.left+Math.min(5,(v.right-v.left)/3),v.top+(v.bottom-v.top)/2],[v.right-Math.min(5,(v.right-v.left)/3),v.top+(v.bottom-v.top)/2]];
   const hits=points.map(([x,y])=>{const hit=d.elementFromPoint(x,y);return{x,y,ok:!!hit&&(e===hit||e.contains(hit)),target:hit?hit.tagName+'#'+hit.id+'.'+String(hit.className).slice(0,80):null};});
   return{tag:e.tagName,id:e.id,label:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,100),href:e.getAttribute('href'),rect:r.toJSON(),visibleRect:v,hits};
  });
  const textConflicts=[],textOutsideHeader=[];let headerTextLineCount=0;
  if(header){const walker=d.createTreeWalker(header,NodeFilter.SHOW_TEXT),h=header.getBoundingClientRect();for(let n=walker.nextNode();n;n=walker.nextNode()){
   const parent=n.parentElement;if(!n.textContent.trim()||!parent||!visible(parent)||launcher?.contains(parent)||parent.closest('script,style,option'))continue;
   const range=d.createRange();range.selectNodeContents(n);for(const line of range.getClientRects()){
    const r=clipped(line,parent);if(!r)continue;headerTextLineCount++;
    const popup=parent.closest('.ma-cinema-tools-content,.ma-reference-header-tools-panel,.ref-explore-tools-panel');
    if(!popup&&(r.left<h.left-.6||r.right>h.right+.6||r.top<h.top-.6||r.bottom>h.bottom+.6))textOutsideHeader.push({text:n.textContent.trim().slice(0,80),rect:r});
    for(const control of controlNodes){if(control.contains(parent)||parent.contains(control))continue;const c=clipped(control.getBoundingClientRect(),control);if(c&&Math.min(r.right,c.right)-Math.max(r.left,c.left)>.5&&Math.min(r.bottom,c.bottom)-Math.max(r.top,c.top)>.5)textConflicts.push({text:n.textContent.trim().slice(0,80),textRect:r,control:{tag:control.tagName,id:control.id,label:(control.getAttribute('aria-label')||control.textContent||'').trim().slice(0,80),rect:c}});}
   }
  }}
  const style=launcher?getComputedStyle(launcher):null;
  const rootRect=rect(launcher),slotRect=rect(slot),headerRect=rect(header),spaceRect=rect(space),size=rootRect?Math.max(rootRect.width,rootRect.height):0;
  const halo=rootRect?{left:rootRect.left-8,top:rootRect.top-8,right:rootRect.right+8,bottom:rootRect.bottom+8}:null;
  const launcherHit=!!(launcher&&rootRect&&launcher.contains(d.elementFromPoint(rootRect.left+rootRect.width/2,rootRect.top+rootRect.height/2)));
  const panels=[...d.querySelectorAll('#ma-jonas-home-panel,#ma-ambient-panel')].filter(visible);
  return{api:!!w.MatchAppReferenceHeader,active:d.documentElement.dataset.maJonasHeader,owns:!!(launcher&&w.MatchAppReferenceHeader?.owns(launcher)),header:headerRect,slot:slotRect,space:spaceRect,headerPosition:header?getComputedStyle(header).position:null,root:rootRect,rootId:launcher?.id,rootCount:roots.length,rootPosition:style?.position,rootTransform:style?.transform,rootInsets:launcher?Object.fromEntries(['left','top','right','bottom'].map(k=>[k,launcher.style.getPropertyValue(k)])):null,underSlot:!!launcher?.closest('#ma-reference-header-slot'),halo,haloUnderSlot:!!(halo&&slotRect&&halo.left>=slotRect.left-.6&&halo.top>=slotRect.top-.6&&halo.right<=slotRect.right+.6&&halo.bottom<=slotRect.bottom+.6),launcherSize:size,launcherHit,controls,textConflicts,textOutsideHeader,headerTextLineCount,submit:rect(d.querySelector('#questionnaire-box [data-i18n="q.submit"]')),dockRect:rect(d.querySelector('nav.ma-cinema-dock')),storage:Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),fontScale:d.documentElement.style.getPropertyValue('--font-scale'),rootFontSize:getComputedStyle(d.documentElement).fontSize,lang:d.documentElement.lang,dir:d.documentElement.dir,overflow:d.documentElement.scrollWidth-innerWidth,scrollY,dock:[...d.querySelectorAll('nav.ma-cinema-dock a[data-cinema-route]')].map(a=>({route:a.dataset.cinemaRoute,href:a.getAttribute('href')})),conversations:panels.map(e=>e.id),conversationGeometry:panels.map(e=>({id:e.id,rect:rect(e)})),dragStorage:localStorage.getItem('matchapp-jonas-header-drag-v1'),placement:launcher?.dataset.jonasPlacement,returnControl:(()=>{const e=d.querySelector('.ma-reference-header-return');return e?{hidden:e.hidden,rect:rect(e),label:e.getAttribute('aria-label')}:null;})(),reservedSlotCount:d.querySelectorAll('.ma-jonas-dock-slot').length};
 },keys);
}
function sameRect(a,b){return!!a&&!!b&&['left','top','width','height'].every(k=>Math.abs(a[k]-b[k])<=1);}
function addCheck(entry,name,ok,evidence){entry.checks.push({name,ok:!!ok,evidence});}
function normalized(value){try{const point=JSON.parse(value);return Number.isFinite(point?.x)&&Number.isFinite(point?.y)&&point.x>=0&&point.x<=1&&point.y>=0&&point.y<=1;}catch(_){return false;}}
async function dragLauncher(page,rect,item){
 const from={x:rect.left+rect.width/2,y:rect.top+rect.height/2},to={x:20,y:360};
 if(item.width<1100){
  const client=await page.context().newCDPSession(page);
  try{await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from.x,y:from.y,id:17,radiusX:2,radiusY:2,force:1}]});
   for(let step=1;step<=10;step++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*step/10,y:from.y+(to.y-from.y)*step/10,id:17,radiusX:2,radiusY:2,force:1}]});await pause(16);}
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }finally{await client.detach();}
 }else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:10});await page.mouse.up();}
 return{from,to};
}
async function runCase(browser,item){
 const entry={...item,checks:[],errors:[]};report.cases.push(entry);
 const ctx=await capture.context(browser,item);
 await ctx.addInitScript(({keys,saved,scale})=>{if(top!==self)return;keys.forEach(k=>localStorage.setItem(k,saved));localStorage.setItem('match_settings',JSON.stringify({fontScale:scale,reduceMotion:true}));},{keys,saved,scale:item.scale});
 const page=await ctx.newPage();await page.setViewportSize({width:item.width,height:850});
 page.on('pageerror',error=>entry.errors.push(error.message));
 try{
  await capture.navigate(page,'/',item);
  await page.waitForFunction(()=>window.MatchAppReferenceHeader&&document.documentElement.dataset.maJonasHeader==='active',null,{timeout:8000});
  await page.evaluate(()=>window.MatchAppReferenceHeader.measure());await pause(120);
  const state=await headerState(page),collision=await measure(page,true);entry.initial=state;entry.collision=collision;
  addCheck(entry,'one existing launcher is owned by the header slot',state.api&&state.active==='active'&&state.rootCount===1&&state.owns&&state.underSlot,{root:state.rootId,count:state.rootCount,owns:state.owns,underSlot:state.underSlot});
  addCheck(entry,'fixed header reserves its exact height in document flow',state.headerPosition==='fixed'&&state.header&&state.space&&Math.abs(state.header.height-state.space.height)<=1,{header:state.header,space:state.space});
  addCheck(entry,'64px launcher and its8px halo fit inside the80px slot',Math.abs(state.launcherSize-64)<=1&&Math.abs(state.slot?.width-80)<=1&&Math.abs(state.slot?.height-80)<=1&&state.haloUnderSlot&&state.launcherHit,{root:state.root,slot:state.slot,halo:state.halo,hit:state.launcherHit});
  addCheck(entry,'header owner removes free viewport placement and stale reserved slots',state.rootPosition!=='fixed'&&state.rootTransform==='none'&&Object.values(state.rootInsets||{}).every(v=>!v||v==='auto')&&state.reservedSlotCount===0,{position:state.rootPosition,transform:state.rootTransform,insets:state.rootInsets,reserved:state.reservedSlotCount});
  addCheck(entry,'visible text and controls stay clear of the8px halo',!collision.missing&&collision.count===1&&collision.inside&&collision.overlaps.length===0,collision.overlaps);
  addCheck(entry,'all visible header controls retain44px targets and true hit points',state.controls.length>0&&state.controls.every(c=>c.rect.width>=43.5&&c.rect.height>=43.5&&c.hits.every(h=>h.ok)),state.controls);
  addCheck(entry,'no horizontal overflow and all five dock destinations preserved',state.overflow===0&&state.dock.length===5&&state.dock.every(a=>expectedRoutes[a.route]===a.href),{overflow:state.overflow,dock:state.dock});
  addCheck(entry,'actual header label text does not spill into other hit targets',state.headerTextLineCount>0&&state.textConflicts.length===0&&state.textOutsideHeader.length===0,{lineCount:state.headerTextLineCount,conflicts:state.textConflicts,outside:state.textOutsideHeader});
  if(item.width<=390&&item.scale===1)addCheck(entry,'phone submit remains above the real dock at entry',!!(state.submit&&state.dockRect&&state.submit.bottom<=state.dockRect.top+.5),{submit:state.submit,dock:state.dockRect,gap:state.submit&&state.dockRect?state.dockRect.top-state.submit.bottom:null});
  addCheck(entry,'old drag preferences remain stored and ignored',state.dragStorage===null&&Object.values(state.storage).every(v=>v===saved),state.storage);
  if(item.lang==='ar')addCheck(entry,'Arabic selection and140% font preference remain active',state.lang==='ar'&&state.dir==='rtl'&&Math.abs(Number(state.fontScale)-1.4)<.01&&parseFloat(state.rootFontSize)>=22,{lang:state.lang,dir:state.dir,fontScale:state.fontScale,fontSize:state.rootFontSize});
  const menu=page.locator('#ma-reference-header details.ma-cinema-tools>summary,#ma-reference-header details.ma-reference-header-tools>summary').filter({visible:true}).first();
  if(await menu.count()){
   await menu.click();await pause(200);
   const openedTools=await headerState(page),toolsCollision=await measure(page,true);entry.tools={state:openedTools,collision:toolsCollision};
   addCheck(entry,'original App controls open with usable hit targets and clear launcher halo',openedTools.controls.every(c=>c.rect.width>=43.5&&c.rect.height>=43.5&&c.hits.every(h=>h.ok))&&openedTools.launcherHit&&toolsCollision.overlaps.length===0&&openedTools.overflow===0&&openedTools.textConflicts.length===0,{controls:openedTools.controls,launcherHit:openedTools.launcherHit,overlaps:toolsCollision.overlaps,overflow:openedTools.overflow,textConflicts:openedTools.textConflicts});
   await menu.click();await pause(100);
  }else addCheck(entry,'original App controls remain available',false,{menuCount:0});
  if(state.root){
   entry.gesture=await dragLauncher(page,state.root,item);await pause(520);
   const afterDrag=await headerState(page);entry.afterDrag=afterDrag;
   addCheck(entry,'intentional drag follows the pointer, clamps safely and saves only the new key',afterDrag.placement==='dragged'&&!afterDrag.underSlot&&afterDrag.owns&&afterDrag.rootPosition==='fixed'&&afterDrag.root.left>=7.5&&afterDrag.root.top>=7.5&&afterDrag.root.right<=item.width-7.5&&afterDrag.root.bottom<=850-7.5&&afterDrag.root.left<=40&&Math.abs(afterDrag.root.top-(entry.gesture.to.y-afterDrag.root.height/2))<=25&&normalized(afterDrag.dragStorage)&&Object.values(afterDrag.storage).every(v=>v===saved)&&afterDrag.conversations.length===0,{gesture:entry.gesture,root:afterDrag.root,placement:afterDrag.placement,newStorage:afterDrag.dragStorage,oldStorage:afterDrag.storage,owns:afterDrag.owns,conversations:afterDrag.conversations});
   addCheck(entry,'a44px return control remains in the original80px header slot',afterDrag.returnControl&&!afterDrag.returnControl.hidden&&afterDrag.returnControl.rect.width>=43.5&&afterDrag.returnControl.rect.height>=43.5&&afterDrag.returnControl.label,{slot:afterDrag.slot,control:afterDrag.returnControl});
   await capture.navigate(page,'/',item);await pause(100);
   const reloaded=await headerState(page);entry.reloaded=reloaded;
   addCheck(entry,'a reload restores the exact intentional point with the same original drag data',sameRect(afterDrag.root,reloaded.root)&&reloaded.placement==='dragged'&&reloaded.owns&&reloaded.dragStorage===afterDrag.dragStorage&&Object.values(reloaded.storage).every(v=>v===saved),{before:afterDrag.root,after:reloaded.root,newStorage:reloaded.dragStorage,oldStorage:reloaded.storage});
   await page.locator('.ma-reference-header-return').click();await pause(180);
   const returned=await headerState(page);entry.returned=returned;
   addCheck(entry,'the return control restores the header and removes only the new coordinate key',returned.placement==='header'&&returned.underSlot&&returned.owns&&sameRect(state.root,returned.root)&&returned.dragStorage===null&&Object.values(returned.storage).every(v=>v===saved)&&returned.returnControl.hidden,{root:returned.root,placement:returned.placement,newStorage:returned.dragStorage,oldStorage:returned.storage,returnControl:returned.returnControl});
   const keyBubble=page.locator('#ma-reference-header-slot #ma-ambient-jonas .ja-bubble,#ma-reference-header-slot #ma-jonas-home-bubble');await keyBubble.focus();await page.keyboard.press('Alt+ArrowLeft');await pause(80);
   const keyboard=await headerState(page);await page.keyboard.press('Alt+Home');await pause(100);const keyboardHome=await headerState(page);entry.keyboard={moved:keyboard,returned:keyboardHome};
   addCheck(entry,'Alt+arrows move Jonas and Alt+Home returns him without changing legacy storage',keyboard.placement==='dragged'&&normalized(keyboard.dragStorage)&&keyboardHome.underSlot&&keyboardHome.placement==='header'&&keyboardHome.dragStorage===null&&Object.values(keyboardHome.storage).every(v=>v===saved),{moved:keyboard.root,returned:keyboardHome.root,newStorage:keyboardHome.dragStorage,oldStorage:keyboardHome.storage});
   await page.evaluate(()=>{window.__qaHeaderJonas=document.querySelector('#ma-reference-header-slot #ma-ambient-jonas,#ma-reference-header-slot #ma-jonas-home');});
   const bubble=page.locator('#ma-reference-header-slot #ma-ambient-jonas .ja-bubble,#ma-reference-header-slot #ma-jonas-home-bubble');
   await bubble.click();await pause(250);
   const open=await headerState(page);entry.open={conversations:open.conversations,geometry:open.conversationGeometry,owns:await page.evaluate(()=>window.MatchAppReferenceHeader.owns(window.__qaHeaderJonas)),space:open.space};
   addCheck(entry,'the original bubble opens exactly one existing conversation',open.conversations.length===1&&entry.open.owns&&Math.abs(open.space.height-state.space.height)<=1&&open.conversationGeometry.every(p=>p.rect.left>=-.6&&p.rect.top>=-.6&&p.rect.right<=item.width+.6&&p.rect.bottom<=850.6),entry.open);
   const close=page.locator('#ma-ambient-panel .ja-close,#ma-jonas-home-close').filter({visible:true});
   await close.click();await pause(300);
   const closed=await headerState(page);entry.closed=closed;
   const sameNode=await page.evaluate(()=>window.__qaHeaderJonas===document.querySelector('#ma-reference-header-slot #ma-ambient-jonas,#ma-reference-header-slot #ma-jonas-home'));
   addCheck(entry,'closing reattaches the same launcher without changing saved data',closed.conversations.length===0&&closed.owns&&closed.underSlot&&sameNode&&sameRect(state.root,closed.root)&&closed.dragStorage===null&&Object.values(closed.storage).every(v=>v===saved),{closed:closed.root,underSlot:closed.underSlot,sameNode,storage:closed.storage,conversations:closed.conversations});
  }
  addCheck(entry,'new header code raises no page errors',entry.errors.filter(message=>/reference.header/i.test(message)).length===0,entry.errors);
 }catch(error){addCheck(entry,'browser execution',false,{message:error.message,stack:error.stack});}
 finally{if(entry.checks.some(check=>!check.ok)){report.failures.push(entry);if(process.env.MATCHAPP_HEADER_SCREENSHOTS==='1')await page.screenshot({path:path.join(path.dirname(output),'header-failure-'+report.failures.length+'.png')});}await ctx.close();}
 report.partial=true;report.lastCompletedAt=new Date().toISOString();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));
 console.log(JSON.stringify({width:item.width,platform:item.platform,lang:item.lang,scale:item.scale,checks:entry.checks.length,failed:entry.checks.filter(c=>!c.ok).map(c=>c.name)}));
}
(async()=>{const browser=await chromium.launch();try{for(const item of cases)await runCase(browser,item);}finally{await browser.close();report.partial=false;report.finishedAt=new Date().toISOString();report.sourceSnapshotSha256=Object.fromEntries(['patches/reference-header.js','patches/reference-header.css','jonas/floating-home-20261010-v3.js','jonas/android-ambient-assistant-20261011.js','patches/jonas-premium-enhancer.js'].filter(p=>fs.existsSync(path.join(root,p))).map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]));report.summary={cases:report.cases.length,checks:report.cases.reduce((n,c)=>n+c.checks.length,0),failedChecks:report.cases.reduce((n,c)=>n+c.checks.filter(x=>!x.ok).length,0),failedCases:report.failures.length};fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({output,summary:report.summary}));process.exitCode=report.failures.length?1:0;}})().catch(error=>{console.error(error);process.exitCode=1;});
