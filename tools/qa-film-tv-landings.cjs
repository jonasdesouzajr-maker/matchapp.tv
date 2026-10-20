'use strict';

// Real-browser presentation and navigation checks. Provider calls are not
// mocked into successful matches; this harness deliberately does not submit.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'artifacts', 'film-tv-landings');
const languages = ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const mime = {'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2'};
const server = http.createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch { res.writeHead(400).end(); return; }
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    res.writeHead(200, {'content-type':mime[path.extname(file)] || 'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end(); }
});

(async () => {
  fs.mkdirSync(out, {recursive:true});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.MATCHAPP_LANDING_TEST_BASE || 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless:true});
  const report = {at:new Date().toISOString(), base, kind:'Real browser layouts and navigation; no AI submissions', cases:[], journeys:[], errors:[]};
  try {
    const cases = [];
    for (const width of [320,390,820,1440]) for (const lang of ['en','pt-BR','de','ar','ja']) {
      cases.push({width, lang, page:'moods/cozy-comfort-watch'});
      cases.push({width, lang, page:'moods/light-and-feel-good'});
    }
    for (const lang of languages.filter(x => !['en','pt-BR','de','ar','ja'].includes(x))) cases.push({width:320, lang, page:'collections/movie'});
    cases.push({width:1180,lang:'pt-BR',page:'collections/anime'});
    for (const row of cases) {
      const context = await browser.newContext({viewport:{width:row.width,height:row.width === 820 ? 1180 : 900},reducedMotion:'reduce'});
      await context.addInitScript(lang => {localStorage.setItem('match_lang', lang);localStorage.setItem('match_seen_intro','1');}, row.lang);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin === new URL(base).origin || ['image.tmdb.org','http2.mlstatic.com','fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net'].includes(url.hostname)) return route.continue();
        return route.abort();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(String(error.stack || error.message)));
      const response = await page.goto(base + '/' + row.page + '/', {waitUntil:'domcontentloaded'});
      assert.equal(response.status(), 200);
      await page.waitForFunction(() => document.documentElement.dataset.shortlistLocaleState === 'ready');
      await page.waitForTimeout(650);
      const geometry = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.seo-shortlist-item')];
        const rect = node => {const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
        const controls = cards.flatMap(card => [...card.querySelectorAll('a')].map(node => ({...rect(node),label:node.textContent.trim()})));
        const overlaps = [];
        for (let i=0;i<controls.length;i++) for(let j=i+1;j<controls.length;j++) {
          const a=controls[i],b=controls[j];
          if (Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1) overlaps.push([a.label,b.label]);
        }
        return {overflow:document.documentElement.scrollWidth-innerWidth,cards:cards.length,
          copy:[...document.querySelectorAll('[data-shortlist-copy]')].map(n=>({key:n.dataset.shortlistCopy,lang:n.lang,visible:getComputedStyle(n).visibility !== 'hidden',text:n.textContent.trim()})),
          controls,overlaps,images:cards.flatMap(c=>[...c.querySelectorAll('img')].map(img=>({src:img.getAttribute('src'),fit:getComputedStyle(img).objectFit,loaded:img.complete && img.naturalWidth>0}))),
          shortlistFirst:document.querySelector('.seo-hero').nextElementSibling?.classList.contains('seo-shortlist')};
      });
      assert.equal(geometry.cards,3);
      assert(geometry.shortlistFirst);
      assert(geometry.overflow<=2,JSON.stringify({row,geometry}));
      assert.equal(geometry.overlaps.length,0,JSON.stringify({row,geometry}));
      assert(geometry.controls.every(c=>c.width>=44 && c.height>=44 && c.left>=-1 && c.right<=row.width+1),JSON.stringify({row,geometry}));
      assert(geometry.copy.every(c=>c.visible && c.text && (row.lang==='en' || c.lang===row.lang)));
      assert(geometry.images.every(img=>img.fit==='contain'));
      for (const control of await page.locator('.seo-shortlist .seo-shortlist-actions a').all()) await control.click({trial:true,timeout:7000});
      if (row.lang==='pt-BR' && [390,820,1440].includes(row.width) && row.page.endsWith('cozy-comfort-watch')) {
        await page.locator('.seo-shortlist').screenshot({path:path.join(out,'shortlist-'+row.width+'-pt-BR.png'),animations:'disabled'});
      }
      report.cases.push({...row,overflow:geometry.overflow,controls:geometry.controls.length,images:geometry.images,errors});
      report.errors.push(...errors.map(error=>({row,error})));
      await context.close();
    }
    for (const lang of ['en','pt-BR']) {
      const context = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
      await context.addInitScript(language=>localStorage.setItem('match_lang',language),lang);
      let aiRequests=0;
      await context.route('**/*', route => {
        const url=new URL(route.request().url());
        if (url.pathname.includes('/functions/v1/gemini-proxy')) aiRequests++;
        if(url.origin===new URL(base).origin || ['cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)) return route.continue();
        return route.abort();
      });
      const page=await context.newPage();
      await page.goto(base+'/moods/cozy-comfort-watch/',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.documentElement.dataset.shortlistLocaleState==='ready');
      await page.locator('.seo-shortlist .seo-similar-link').first().click();
      await page.waitForFunction(()=>document.getElementById('discover-new-input')?.value.includes('Midnight Diner: Tokyo Stories'));
      const field=page.locator('#discover-new-input');
      const prompt=await field.inputValue();
      assert.match(prompt,lang==='pt-BR'?/aconchegante e reconfortante/:/cozy comfort watch/);
      assert.equal(aiRequests,0,'landing navigation must not send AI requests');
      const active=await page.evaluate(()=>document.activeElement?.id);
      assert.notEqual(active,'discover-new-input','navigation must not open a mobile keyboard');
      await field.fill(prompt+' I prefer shorter episodes.');
      await page.evaluate(()=>document.dispatchEvent(new CustomEvent('matchapp:langchange',{detail:{lang:'ja'}})));
      assert.equal(await field.inputValue(),prompt+' I prefer shorter episodes.');
      await page.screenshot({path:path.join(out,'handoff-'+lang+'.png'),animations:'disabled'});
      report.journeys.push({lang,prompt,aiRequests,editedDraftPreserved:true});
      await context.close();
    }
    assert.equal(report.errors.length,0,JSON.stringify(report.errors.slice(0,3)));
    report.passed=true;
    console.log('PASS '+report.cases.length+' landing layouts, '+report.journeys.length+' real navigation journeys; no automatic AI requests.');
  } finally {
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error.stack || error);server.close();process.exitCode=1;});
