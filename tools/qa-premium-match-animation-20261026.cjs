/* Local visual fixture only; never calls matching providers or changes live state. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const root = path.resolve(__dirname,'..');
  const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const loader = html.match(/<article id="loading-box"[\s\S]*?<\/article>/)[0];
  const styles = (html.match(/<link\b[^>]*(?:rel="stylesheet"|as="style")[^>]*>/g)||[]).map(tag=>tag.replace('rel="preload"','rel="stylesheet"')).join('\n') + (html.match(/<style\b[^>]*>[\s\S]*?<\/style>/g)||[]).join('\n');
  const server = http.createServer((req,res) => {
    const file = path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
    res.setHeader('content-type',file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({headless:true});
    const out = process.env.MATCH_ANIMATION_EVIDENCE || '/tmp/match-animation-evidence';
    fs.mkdirSync(out,{recursive:true});
    const results = [];
    for (const width of [320,390,768,1440]) {
      const page = await browser.newPage({viewport:{width,height:1000}});
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if(url.origin===origin) return route.continue();
        if(url.hostname==='matchapp.tv') return route.fulfill({status:200,body:''});
        return route.abort();
      });
      await page.goto(origin+'/robots.txt');
      await page.setContent(`<!doctype html><html class="ma-reference" lang="en"><head><meta charset="UTF-8"><base href="${origin}/">${styles}<link rel="stylesheet" href="/ui-fixes-20261023.css"></head><body class="page-home ma-watch-focused"><main style="width:100%;max-width:760px;margin:auto;box-sizing:border-box">${loader}<article id="result-box" hidden style="display:none">Completed visual fixture</article></main></body></html>`);
      const ids=['ai-progress-bar','meter-pct','loading-headline','loading-substep'];
      await page.evaluate(ids=>{window.originalNodes=ids.map(id=>document.getElementById(id));},ids);
      await page.addScriptTag({url:origin+'/patches/premium-match-animation-20261026.js?v=20261026-2'});
      await page.waitForSelector('#loading-box[data-premium-injected="1"]',{state:'attached'});
      await page.evaluate(()=>{document.getElementById('loading-box').style.display='block';document.body.classList.add('match-searching');});
      await page.waitForSelector('.premium-match-active');
      await page.evaluate(()=>{document.getElementById('ai-progress-bar').style.width='58%';document.getElementById('meter-pct').textContent='58%';});
      const state = await page.evaluate(ids=>{
        const box=document.getElementById('loading-box'), stage=box.querySelector('.premium-match-stage');
        const visible=el=>getComputedStyle(el).display!=='none';
        const bounds=stage.getBoundingClientRect();
        return {sameNodes:ids.every((id,i)=>document.getElementById(id)===window.originalNodes[i]),stages:box.querySelectorAll('.premium-match-stage').length,
          rings:[...box.querySelectorAll('.constellation-ring')].map(el=>el.getBoundingClientRect().width),
          ringsPainted:[...box.querySelectorAll('.constellation-ring')].every(el=>getComputedStyle(el).backgroundImage.includes('radial-gradient')),
          oldHidden:[...box.querySelectorAll('.ma-spin,.scanner-stage,.eq-bars,.meter-perforations')].every(el=>!visible(el)),
          progress:box.querySelector('.premium-meter-fill').style.width,percent:box.querySelector('.premium-meter-pct').textContent,
          stageInside:bounds.left>=0&&bounds.right<=innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,
          canvasPixels:[...box.querySelector('canvas').getContext('2d').getImageData(0,0,box.querySelector('canvas').width,box.querySelector('canvas').height).data].some(x=>x>0)};
      },ids);
      assert.ok(state.sameNodes && state.stages===1 && state.oldHidden && state.ringsPainted && state.stageInside && !state.overflow && state.canvasPixels,JSON.stringify(state));
      assert.equal(state.progress,'58%'); assert.equal(state.percent,'58%');
      assert.ok(state.rings[0]>state.rings[1]&&state.rings[1]>state.rings[2]);
      await page.screenshot({path:path.join(out,`loading-${width}.png`),fullPage:true});
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForTimeout(50);
      const reduced = await page.evaluate(()=>[...document.querySelectorAll('#loading-box .constellation-ring,#loading-box .central-orb,#loading-box .orbit-star')].every(el=>getComputedStyle(el).animationName==='none'));
      assert.ok(reduced);
      await page.screenshot({path:path.join(out,`reduced-${width}.png`),fullPage:true});
      await page.evaluate(()=>{document.body.classList.remove('match-searching');document.getElementById('loading-box').style.display='none';const result=document.getElementById('result-box');result.hidden=false;result.style.display='block';});
      await page.waitForSelector('#loading-box',{state:'hidden'});
      await page.waitForFunction(()=>!document.getElementById('loading-box').classList.contains('premium-match-active'));
      assert.deepEqual(errors,[]);
      results.push({width,...state,reducedMotion:reduced,completionHidesLoader:true,pageErrors:errors});
      await page.close();
    }
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({type:'isolated browser presentation fixture; no genuine source matching or physical WebView claim',results},null,2));
    console.log(JSON.stringify(results,null,2));
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
