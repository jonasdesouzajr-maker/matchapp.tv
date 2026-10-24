'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=process.env.MATCHAPP_KIDS_LAYOUT_OUT||fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-kids-layout-'));fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(path.join(root,'kids/kids.js'),'utf8');
const library=vm.runInNewContext(source.match(/const LIBRARY = (\[[\s\S]*?\n  \]);/)[1]);
const familyCopy=JSON.parse(fs.readFileSync(path.join(root,'kids/source-rated-discovery.js'),'utf8').match(/const SOURCE_COPY = (\{[\s\S]*?\n\});/)[1]);
const report={production:true,overlays:process.env.MATCHAPP_KIDS_CANDIDATE==='1',physicalAndroid:false,candidate:process.env.MATCHAPP_KIDS_CANDIDATE==='1',cases:[],errors:[],started:new Date().toISOString()};
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});try{
 const c=await browser.newContext({viewport:{width:390,height:844},locale:'en-US'}),p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));if(report.candidate){await p.route('**/kids/source-rated-discovery.js?*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(root,'kids/source-rated-discovery.js'))}));await p.route('**/app-updates.js?*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(root,'app-updates.js'))}));await p.route('https://matchapp.tv/kids/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'kids/index.html'))}));await p.route('**/kids/immersive.js?*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(root,'kids/immersive.js'))}));await p.route('**/kids/kids.js?*',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(root,'kids/kids.js'))}));await p.route('**/kids/luxe-kids-browser-20261010.css?*',r=>r.fulfill({contentType:'text/css',body:fs.readFileSync(path.join(root,'kids/luxe-kids-browser-20261010.css'))}));}
 await p.goto('https://matchapp.tv/kids/',{waitUntil:'domcontentloaded',timeout:60000});
 const dialog=p.locator('dialog.kids-parent-setup[open]');await dialog.waitFor({state:'visible'});
 const pin=dialog.locator('.kids-parent-pin-choice');if(await pin.isVisible())await pin.click();
 await dialog.locator('#kids-parent-pin-one').fill('4826');await dialog.locator('#kids-parent-pin-two').fill('4826');await dialog.locator('.kids-parent-pin-save').click();await dialog.waitFor({state:'hidden'});
 await p.getByRole('button',{name:/Essential only/i}).click({timeout:1500}).catch(()=>{});
 await p.locator('#kids-grid .kids-card').first().waitFor();await p.waitForTimeout(1500);
 for(const width of [320,360,390,412,600,768,1024,1280,1440,1920]){
  await p.setViewportSize({width,height:900});await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(150);
  const row=await p.evaluate(()=>{const visible=n=>n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});const controls=[...document.querySelectorAll('.kids-header button,.kids-header select,.kids-match-form button,.kids-match-form select,.kids-catalog-filters input')].filter(visible).map(e=>{const r=e.getBoundingClientRect();return{id:e.id||e.className,x:r.x,right:r.right,width:r.width,height:r.height};});return{width:innerWidth,scroll:document.documentElement.scrollWidth,controls};});
  row.passed=row.scroll<=width+1&&row.controls.every(r=>r.x>=-1&&r.right<=width+1&&r.height>=44);report.cases.push(row);
  await p.screenshot({path:path.join(out,width+'.png')});
 }
 for(const age of ['all','3-5','6-8','9-12']){
  await p.locator('#kids-age').selectOption(age);
  const titles=await p.locator('#kids-grid .kids-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.title));
  const row={age,titles,passed:titles.length>0&&titles.every(t=>library.some(x=>x.title===t&&x.ages.includes(age)))};report.cases.push(row);
 }
 const navigationKeys=['navHome','navFind','navClassic','stepMood','stepAge','stepPlay','installApp','stopVoice'];const englishNavigation=await p.evaluate(keys=>keys.map(key=>document.querySelector('[data-k="'+key+'"]')?.textContent||''),navigationKeys);
 for(const code of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){
  await p.locator('#kids-lang').selectOption(code);await p.waitForTimeout(50);
  for(const width of [320,768,1440]){
   await p.setViewportSize({width,height:900});await p.evaluate(()=>scrollTo(0,0));
   const row=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,lang:document.documentElement.lang,dir:document.documentElement.dir,selectHeight:document.getElementById('kids-lang').getBoundingClientRect().height}));
   row.requestedLanguage=code;row.navigation=await p.evaluate(keys=>keys.map(key=>document.querySelector('[data-k="'+key+'"]')?.textContent||''),navigationKeys);row.passed=row.scroll<=width+1&&row.selectHeight>=44&&row.lang===code&&row.dir===(code==='ar'?'rtl':'ltr')&&row.navigation.every((text,i)=>text.trim()&&text!==navigationKeys[i]&&(code==='en'||text!==englishNavigation[i]));row.family=await p.evaluate(()=>({heading:document.getElementById('kids-family-heading').textContent,lead:document.querySelector('.kids-source-lead').textContent,note:document.querySelector('.kids-source-note').textContent,verify:document.getElementById('kids-family-find').textContent,options:[...document.getElementById('kids-family-format').options].map(o=>o.textContent)}));const family=familyCopy[code];row.passed=row.passed&&row.family.heading===family.heading&&row.family.lead===family.lead&&row.family.note===family.note&&row.family.verify===family.verify&&row.family.options.join('|')===[family.formatsAll,family.movies,family.shows].join('|');report.cases.push(row);if(['ar','de','fr','ja'].includes(code)&&[320,1440].includes(width)){await p.locator('#kids-family-expansion').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'family-'+code+'-'+width+'.png')});}
  }
  if(['ar','pt-BR','ja'].includes(code))await p.screenshot({path:path.join(out,'language-'+code+'.png')});
 }
 await p.locator('#kids-lang').selectOption('en');
 await p.setViewportSize({width:390,height:844});await p.locator('#kids-age').selectOption('6-8');await p.locator('#kids-quest .kids-quest-choice[data-value=funny]').click();await p.locator('#kids-quest .kids-quest-choice[data-value=series]').click();await p.locator('#kids-quest .kids-quest-choice[data-value="2020"]').click();
 await p.locator('#kids-quest .kids-quest-reveal').click();await p.locator('#kids-match-results .kids-card').first().waitFor({timeout:20000});
 report.matchTitles=await p.locator('#kids-match-results .kids-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.title));assert(report.matchTitles.every(t=>library.some(x=>x.title===t&&x.ages.includes('6-8')&&x.type==='series'&&x.cats.includes('funny'))));
 await p.waitForFunction(()=>document.getElementById('kids-match-form')?.getAttribute('aria-busy')!=='true');await p.waitForTimeout(1500);report.resultBounds=await p.locator('#kids-match-results').boundingBox();assert(report.resultBounds.y>=-1&&report.resultBounds.y<80,'phone results begin inside the visible viewport');await p.screenshot({path:path.join(out,'phone-matched.png')});if(process.env.MATCHAPP_KIDS_POSTER_DIAG==='1'){await p.waitForTimeout(15000);report.posters=await p.locator('.kids-card img').evaluateAll(nodes=>nodes.map(n=>({title:n.closest('.kids-card')?.dataset.title,src:n.currentSrc,width:n.naturalWidth,height:n.naturalHeight,opacity:getComputedStyle(n).opacity})));await p.locator('#kids-match-results').scrollIntoViewIfNeeded();await p.waitForTimeout(700);await p.screenshot({path:path.join(out,'phone-decoded-posters.png')});}await c.close();
}catch(e){report.failure=e.message;process.exitCode=1;}finally{await browser.close();report.finished=new Date().toISOString();report.passed=report.cases.filter(r=>r.passed).length;report.failed=report.cases.filter(r=>!r.passed).length;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,passed:report.passed,failed:report.failed,errors:report.errors,failure:report.failure}));if(report.failed||report.errors.length)process.exitCode=1;}})();
