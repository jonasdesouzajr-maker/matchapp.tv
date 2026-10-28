'use strict';
// Local visual/navigation checks only. Remote account, AI, analytics and ad calls
// are blocked; no live backend or physical-device result is implied.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { HttpsProxyAgent } = require('https-proxy-agent');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = process.env.LUMINA_GUIDE_QA_OUTPUT || '/tmp/lumina-seo-qa';
const copy = JSON.parse(fs.readFileSync(path.join(root, 'tools/lumina-seo-copy.json'), 'utf8'));
const languages = Object.keys(copy.locales);
const routeFor = language => '/lumina-match/' + (language === 'en' ? '' : language.toLowerCase() + '/');
const mime = {'.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.mjs':'application/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2', '.mp3':'audio/mpeg'};
const executablePath = [process.env.LUMINA_GUIDE_QA_CHROMIUM, chromium.executablePath(), '/tmp/matchapp-country-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'].find(file => file && fs.existsSync(file));
const nativeUA = 'Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 MatchAppAiAndroid/2026.10.20.1';
const report = {startedAt:new Date().toISOString(), scope:'Local Chromium rendering and navigation; live services blocked; no physical-device/backend claim', executablePath, cases:[], navigation:[], failures:[], screenshots:[], blockedRemote:{}, fontRequests:[], fontFailures:[]};
const fontResponses = new Map();
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
const fontAgent = proxy ? new HttpsProxyAgent(proxy) : undefined;
function readFont(url, userAgent) {
  return new Promise((resolve,reject)=>{
    const request=https.get(url,{agent:fontAgent,headers:{'user-agent':userAgent,'accept-encoding':'identity'}},response=>{
      const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.once('error',reject);
      response.once('end',()=>{
        if(response.statusCode!==200)return reject(Error('Font HTTP '+response.statusCode));
        resolve({status:200,headers:{'content-type':response.headers['content-type']||'application/octet-stream','access-control-allow-origin':'*'},body:Buffer.concat(chunks)});
      });
    });
    request.setTimeout(15000,()=>request.destroy(Error('Font read timeout')));request.once('error',reject);
  });
}
const server = http.createServer((request, response) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname)); }
  catch (_) { response.writeHead(400).end(); return; }
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.statSync(file).isFile()) throw Error('Not a file');
    response.writeHead(200, {'content-type':mime[path.extname(file)] || 'application/octet-stream', 'cache-control':'no-store'});
    fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch (_) { response.writeHead(404).end(); }
});
let base, browser;
function writeReport() { fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); }
async function contextFor(testCase) {
  const context = await browser.newContext({viewport:{width:testCase.width,height:testCase.height}, deviceScaleFactor:1,
    isMobile:testCase.width < 720 || !!testCase.native, hasTouch:testCase.width < 1024 || !!testCase.native,
    reducedMotion:testCase.reduced ? 'reduce' : 'no-preference', ...(testCase.native ? {userAgent:nativeUA} : {})});
  await context.route('**/*', async request => {
    const u = new URL(request.request().url());
    if (u.origin === base) return request.continue();
    // Font-only reads preserve the actual shared masthead typography. Everything
    // else, including GTM, Supabase, AI services and ad SDKs, stays offline.
    if (['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)) {
      if (!report.fontRequests.includes(u.origin)) report.fontRequests.push(u.origin);
      // Use Node's configured certificate authority for this read-only font
      // request; Chromium in minimal containers may lack that local CA.
      try {
        if (!fontResponses.has(u.href)) {
          fontResponses.set(u.href,readFont(u.href,request.request().headers()['user-agent']||'Mozilla/5.0'));
        }
        return request.fulfill(await fontResponses.get(u.href));
      } catch(error) { report.fontFailures.push({url:u.href,error:error.message}); return request.abort(); }
    }
    report.blockedRemote[u.hostname] = (report.blockedRemote[u.hostname] || 0) + 1;
    return request.abort();
  });
  return context;
}
async function ready(page, language) {
  await page.locator('#ma-reference-header .hub-header').waitFor({state:'visible',timeout:18000});
  await page.waitForFunction(expected => document.documentElement.lang === expected, language);
  await page.evaluate(async () => {
    await Promise.all([...document.querySelectorAll('.lumina-guide-art img')].map(img => img.decode()));
    await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 4000))]);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function shot(page, name) {
  const file = path.join(output, name + '.png');
  await page.screenshot({path:file,animations:'disabled'});
  report.screenshots.push(file);
}
async function inspect(testCase) {
  const {language,width,height} = testCase, id = [language,width,height,testCase.native?'native':'web',testCase.reduced?'reduced':'motion'].join('-');
  const context = await contextFor(testCase), page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => { if (/^https:\/\/fonts\./.test(request.url())) report.fontFailures.push({case:id,url:request.url(),error:request.failure()?.errorText}); });
  try {
    const response = await page.goto(base + routeFor(language), {waitUntil:'load',timeout:30000});
    assert.equal(response.status(), 200);
    await ready(page, language);
    const state = await page.evaluate(() => {
      const visible = node => {const r=node.getBoundingClientRect(),s=getComputedStyle(node);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
      const rect = node => {const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
      const art = [...document.querySelectorAll('.lumina-guide-art img')].map(img=>({src:new URL(img.currentSrc).pathname,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,...rect(img),fit:getComputedStyle(img).objectFit}));
      const links = [...document.querySelectorAll('[data-lumina-language]')].map(link=>({language:link.dataset.luminaLanguage,href:link.getAttribute('href'),text:link.textContent.trim(),current:link.getAttribute('aria-current'),visible:visible(link),...rect(link)}));
      const approvedMarks = [...document.querySelectorAll('img[src*="matchapp-ai-mark.svg"]')].filter(visible);
      const overflowNodes=[...document.querySelectorAll('main *,header *,footer *')].filter(visible).filter(node=>{const r=node.getBoundingClientRect();return r.left< -2||r.right>innerWidth+2;}).slice(0,8).map(node=>({tag:node.tagName,cls:node.className,...rect(node)}));
      return {language:document.documentElement.lang,dir:document.documentElement.dir,title:document.title,
        description:document.querySelector('meta[name="description"]').content,canonical:[...document.querySelectorAll('link[rel="canonical"]')].map(n=>n.href),
        ogURL:document.querySelector('meta[property="og:url"]').content,robots:document.querySelector('meta[name="robots"]').content,
        alternates:[...document.querySelectorAll('link[hreflang]')].map(n=>({lang:n.hreflang,href:n.href})),
        mainText:document.querySelector('main').innerText,heading:document.querySelector('h1').innerText,
        overflow:document.documentElement.scrollWidth-innerWidth,overflowNodes,
        mastheads:document.querySelectorAll('#ma-reference-header').length,hubHeaders:document.querySelectorAll('header.hub-header').length,
        fallbackHeaders:document.querySelectorAll('.ma-reference-header-fallback').length,approvedMarks:approvedMarks.length,
        mark:approvedMarks[0]?{src:approvedMarks[0].getAttribute('src'),loaded:approvedMarks[0].complete&&approvedMarks[0].naturalWidth>0,...rect(approvedMarks[0])}:null,
        art,links,ads:document.querySelectorAll('ins.adsbygoogle,[data-ad-slot],script[src*="adsbygoogle"],script[src*="googlesyndication"],script[src*="doubleclick"]').length,
        embeddedGame:document.querySelectorAll('iframe[src*="lumina-match"]').length,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,
        sectionCount:document.querySelectorAll('.lumina-guide-panel').length,faqCount:document.querySelectorAll('.lumina-guide-faq details').length,
        storageLanguage:localStorage.getItem('match_lang'),fontsStatus:document.fonts.status};
    });
    const expected=copy.locales[language];
    assert.equal(state.language,language);assert.equal(state.dir,language==='ar'?'rtl':'ltr');
    assert.equal(state.title,expected.title);assert.equal(state.description,expected.description);
    assert.deepEqual(state.canonical,['https://matchapp.tv'+routeFor(language)]);assert.equal(state.ogURL,state.canonical[0]);
    assert.doesNotMatch(state.robots,/noindex|nofollow/i);assert.equal(state.alternates.length,15);
    for(const code of [...languages,'x-default'])assert.ok(state.alternates.some(x=>x.lang===code&&x.href==='https://matchapp.tv'+routeFor(code==='x-default'?'en':code)),id+' alternate '+code);
    assert.ok(state.heading.includes(expected.h1));
    for(const section of expected.sections) for(const text of section.paragraphs) assert.ok(state.mainText.includes(text),id+' missing localized paragraph '+section.id);
    assert.ok(state.overflow<=2,id+' horizontal overflow '+JSON.stringify(state.overflowNodes));
    assert.equal(state.mastheads,1,id+' shared masthead');assert.equal(state.hubHeaders,1,id+' hub header');
    assert.equal(state.fallbackHeaders,0,id+' duplicate fallback header');assert.equal(state.approvedMarks,1,id+' approved brand mark count');
    assert.ok(state.mark?.loaded,id+' approved mark must load');assert.equal(state.ads,0);assert.equal(state.embeddedGame,0);
    assert.equal(state.faqCount,6);assert.equal(state.reduced,!!testCase.reduced);assert.equal(state.art.length,3);
    for(const art of state.art){assert.equal(art.naturalWidth,784);assert.equal(art.naturalHeight,1168);assert.equal(art.fit,'contain');assert.ok(Math.abs(art.width/art.height-784/1168)<0.01,id+' distorted art');}
    assert.equal(state.links.length,14);
    for(const link of state.links){assert.ok(link.visible,id+' hidden language '+link.language);assert.ok(link.x>=-2&&link.right<=width+2,id+' clipped language '+link.language);assert.ok(link.height>=42,id+' small language target '+link.language);}
    assert.equal(state.links.filter(x=>x.current==='page').length,1);assert.equal(state.links.find(x=>x.current==='page').language,language);
    // Scroll and hit-test every language control at the narrowest viewport;
    // all 14 actual destinations are independently loaded in the matrix.
    if(width===320)for(const code of languages){
      const link=page.locator('[data-lumina-language="'+code+'"]');await link.scrollIntoViewIfNeeded();
      const hit=await link.evaluate(node=>{const r=node.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,top=document.elementFromPoint(x,y);return {ok:top===node||node.contains(top),top:top?.tagName+'#'+top?.id,x,y};});
      assert.ok(hit.ok,id+' blocked language '+code+': '+JSON.stringify(hit));
    }
    await page.locator('.lumina-guide-faq summary').first().click();
    assert.equal(await page.locator('.lumina-guide-faq details').first().getAttribute('open'),'');
    await page.waitForFunction(answer=>document.querySelector('.lumina-guide-faq details p').innerText===answer,expected.faqs[0].answer,{timeout:4000});
    assert.equal(await page.locator('.lumina-guide-faq details').first().locator('p').innerText(),expected.faqs[0].answer);
    assert.equal(errors.length,0,id+' script error: '+errors.join('; '));
    if((width===320&&['en','ja'].includes(language))||(width===390&&language==='ar')||(width===768&&language==='pt-BR')||(width===1440&&language==='en')||testCase.native||testCase.landscape||testCase.reduced){
      await page.evaluate(()=>scrollTo(0,0));await shot(page,id+'-top');
      await page.locator('.lumina-guide-art').scrollIntoViewIfNeeded();await shot(page,id+'-art');
    }
    delete state.mainText;
    report.cases.push({id,...testCase,status:'passed',...state});
    console.log('PASS',id);
  }catch(error){
    const failure={id,...testCase,error:error.message,stack:error.stack,errors,url:page.url()};report.failures.push(failure);console.error('FAIL',id,error.message);
    try{await shot(page,id+'-failure');}catch(_){}
  }finally{await context.close();writeReport();}
}
async function navigation(){
  const context=await contextFor({width:390,height:844}),page=await context.newPage();
  try{
    await page.goto(base+routeFor('en'),{waitUntil:'load'});await ready(page,'en');
    await page.locator('[data-lumina-language="pt-BR"]').click();
    await page.waitForURL(base+routeFor('pt-BR')+'#language-pt-BR');await ready(page,'pt-BR');
    assert.equal(await page.evaluate(()=>localStorage.getItem('match_lang')),'pt-BR');
    await page.locator('[data-lumina-play]').first().click();
    await page.waitForURL(base+'/');
    assert.equal(await page.evaluate(()=>localStorage.getItem('match_lang')),'pt-BR');
    await page.waitForFunction(()=>document.documentElement.lang==='pt-BR',{timeout:12000});
    report.navigation.push({name:'Portuguese language choice and actual Home CTA',passed:true,path:new URL(page.url()).pathname,language:await page.evaluate(()=>document.documentElement.lang)});
    await page.goto(base+routeFor('en'),{waitUntil:'load'});await page.waitForURL(base+routeFor('pt-BR'));await ready(page,'pt-BR');
    report.navigation.push({name:'Saved language redirects generic guide without English fallback',passed:true,url:page.url()});
    const popupPromise=context.waitForEvent('page');
    await page.locator('[data-lumina-language="ar"]').click({modifiers:['Control']});
    const popup=await popupPromise;await popup.waitForLoadState('load');await ready(popup,'ar');
    assert.equal(new URL(popup.url()).pathname,routeFor('ar'));assert.equal(new URL(popup.url()).hash,'#language-ar');
    assert.equal(await popup.evaluate(()=>localStorage.getItem('match_lang')),'ar');
    await popup.reload({waitUntil:'load'});await ready(popup,'ar');
    report.navigation.push({name:'Explicit different-language link in new tab overrides saved language and survives reload',passed:true,url:popup.url()});
    await shot(popup,'navigation-ar-new-tab');await popup.close();
  }catch(error){report.failures.push({id:'navigation',error:error.message,stack:error.stack,url:page.url()});console.error('FAIL navigation',error.message);try{await shot(page,'navigation-failure');}catch(_){}}
  finally{await context.close();writeReport();}
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  if(!executablePath)throw Error('Chromium not found. Set LUMINA_GUIDE_QA_CHROMIUM to an installed executable.');
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});base='http://127.0.0.1:'+server.address().port;
  const fontDirectory=process.env.LUMINA_GUIDE_QA_FONT_DIR||path.join(output,'fonts');
  const launchEnvironment={...process.env};
  if(fs.existsSync(fontDirectory)){
    const fontConfig=path.join(output,'fontconfig.xml');
    const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
    fs.writeFileSync(fontConfig,'<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><include>/etc/fonts/fonts.conf</include><dir>'+xml(fontDirectory)+'</dir><cachedir>'+xml(path.join(output,'font-cache'))+'</cachedir></fontconfig>');
    launchEnvironment.FONTCONFIG_FILE=fontConfig;report.additionalSystemFontDirectory=fontDirectory;
  }
  browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage'],env:launchEnvironment});
  try{
    let cases=[320,390,768,1440].flatMap(width=>languages.map(language=>({language,width,height:width===768?1024:width===1440?1000:844})));
    cases.push({language:'en',width:844,height:390,landscape:true},{language:'ar',width:844,height:390,landscape:true},
      {language:'en',width:390,height:844,reduced:true},{language:'ar',width:768,height:1024,reduced:true},
      {language:'en',width:390,height:844,native:true},{language:'ar',width:768,height:1024,native:true});
    const selected=process.env.LUMINA_GUIDE_QA_CASES?.split(',');
    if(selected)cases=cases.filter(c=>selected.includes(c.language+':'+c.width));
    // Two independent contexts keep the language matrix bounded and reproducible.
    let index=0;await Promise.all([0,1].map(async()=>{while(index<cases.length)await inspect(cases[index++]);}));
    if(!process.env.LUMINA_GUIDE_QA_SKIP_NAV)await navigation();
  }finally{
    report.finishedAt=new Date().toISOString();report.passed=report.cases.length;report.failed=report.failures.length;writeReport();
    await browser.close();await new Promise(resolve=>server.close(resolve));
  }
  console.log(JSON.stringify({passed:report.passed,failed:report.failed,navigation:report.navigation.length,report:path.join(output,'report.json')}));
  if(report.failures.length)process.exitCode=1;
})().catch(error=>{report.failures.push({id:'harness',error:error.message});try{writeReport();}catch(_){}console.error(error.stack||error);server.close();process.exitCode=1;});
