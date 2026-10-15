const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const original = fs.readFileSync('poster-wall.css','utf8');
  const patch = fs.readFileSync('patches/collaboration-contrast-20261015.css','utf8');
  const browser = await chromium.launch({headless:true});
  try {
    for (const width of [390,768,1366]) {
      for (const variant of ['together','friends','home']) {
        const page = await browser.newPage({viewport:{width,height:850}});
        const id = variant==='together'?'tg-step-start':variant==='friends'?'friends-sign-in':'not-matching';
        await page.setContent('<style>'+original+'\n'+patch+'</style><div class="poster-wall"><div class="poster-wall-grid"></div></div><main><section id="'+id+'"><div class="tg-how-step">Readable content</div></section></main>');
        const result = await page.evaluate(()=>{
          const grid=document.querySelector('.poster-wall-grid');
          return {gridOpacity:getComputedStyle(grid).opacity,bodyWidth:document.body.scrollWidth,viewport:innerWidth};
        });
        if (variant==='home') assert.notEqual(result.gridOpacity,'0.16');
        else assert.equal(result.gridOpacity,'0.16');
        assert.ok(result.bodyWidth <= result.viewport + 2,JSON.stringify({width,variant,result}));
        console.log('PASS',width,variant,JSON.stringify(result));
        await page.close();
      }
    }
  } finally {await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
