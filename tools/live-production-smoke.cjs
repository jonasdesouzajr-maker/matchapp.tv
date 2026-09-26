/* Production-only visual + semantic smoke. This script does not monkeypatch app code,
 * seed catalog entries, bypass quotas or pretend simulated devices are physical phones.
 * Runs after each live main deployment; live matching and AI consume genuine guest allowance. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.MATCHAPP_TEST_BASE||'https://matchapp.tv';
const dir=path.resolve('artifacts/live-smoke');fs.mkdirSync(dir,{recursive:true});
const report={base,started:new Date().toISOString(),screens:[],checks:[],errors:[],liveAnswers:[]};
const record=(check,ok,detail)=>{report.checks.push({check,ok,detail});console.log((ok?'PASS ':'FAIL ')+check+(detail?' - '+detail:''));if(!ok)report.errors.push(check+': '+detail);};
const cases=[
 {name:'desktop',width:1440,height:900,isMobile:false,hasTouch:false},
 {name:'tablet',width:820,height:1180,isMobile:true,hasTouch:true},
 {name:'phone',width:390,height:844,isMobile:true,hasTouch:true},
 {name:'small-phone',width:320,height:710,isMobile:true,hasTouch:true}
];
const errors=[];
async function shot(page,name){try{await page.screenshot({path:path.join(dir,name+'.png'),animations:'disabled',timeout:20000});report.screens.push(name+'.png')}catch(e){record('screenshot '+name,false,String(e.message).slice(0,150))}}
async function observed(page,url){await page.goto(base+url,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForTimeout(1400);return page;}
async function aiQuestion(page,question,expected,label){
 const before=await page.locator('#chat-log .chat-assistant').count(),upstream=[];
 const network=response=>{if(response.url().includes('/functions/v1/gemini-proxy'))upstream.push(response.status())};
 page.on('response',network);
 try{
  await page.locator('#discover-new-input').fill(question);
  await page.locator('button[onclick="newDiscoverSearch()"]').click();
  // Wait for the whole in-flight action AND the typewriter, not the first
  // 35 characters. The previous test raced the next question against Ask AI.
  await page.waitForFunction(()=>typeof askInFlight!=='undefined'&&askInFlight===null,null,{timeout:115000});
  const count=await page.locator('#chat-log .chat-assistant').count();
  if(count<=before){record('LIVE Ask AI '+label,false,'No reply bubble; guest quota or upstream failure. HTTP '+upstream.join(','));return}
  const answer=await page.locator('#chat-log .chat-assistant .chat-answer-text').nth(before).innerText();
  const offline=await page.locator('#discover-offline-badge').evaluate(el=>getComputedStyle(el).display!=='none').catch(()=>false);
  report.liveAnswers.push({label,answer:answer.slice(0,360),offline,upstream});
  const semantic=expected.test(answer),live=upstream.includes(200)&&!offline;
  record('LIVE Ask AI '+label,semantic&&live,'semantic='+semantic+' proxy-200='+upstream.includes(200)+' offline='+offline+' answer='+answer.slice(0,110));
  await shot(page,'ai-'+label);
 }finally{page.off('response',network)}
}
(async()=>{
 let browser;
 try{
  const deployed=await fetch(base+'/deployment-sha.txt',{signal:AbortSignal.timeout(20000)})
   .then(r=>{assert(r.ok,'production deployment marker HTTP '+r.status);return r.text()});
  record('production deployment marker',/^[0-9a-f]{40}\s*$/i.test(deployed),deployed.trim().slice(0,12));
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const device of cases){
   const context=await browser.newContext({viewport:{width:device.width,height:device.height},
      isMobile:device.isMobile,hasTouch:device.hasTouch,deviceScaleFactor:1,locale:'en-US'});
   const page=await context.newPage();
   page.on('pageerror',error=>errors.push({device:device.name,page:'home',error:String(error.message).slice(0,180)}));
   try{
    await observed(page,'/');
    await page.getByRole('button',{name:/Essential only/i}).first().click({timeout:1600}).catch(()=>{});
    await page.locator('#q-category').waitFor({state:'attached',timeout:15000});
    await page.locator('#q-category').locator('xpath=..').locator('.crit-chips .crit-chip').first().waitFor({state:'attached',timeout:15000});
    await page.locator('#ebook-matcher-root [data-ebook-match]').waitFor({state:'attached',timeout:25000});
    // Requested news regression: native summary must open a populated panel
    // outside the Match/Ask accordion at every viewport, not just exist in DOM.
    try {
      await page.locator('#latest-news > summary').waitFor({state:'visible',timeout:20000});
      await page.waitForFunction(()=>document.querySelectorAll('#latest-news .ma-news-card-main[href^="https://"]').length>0,null,{timeout:20000});
      const summary=page.locator('#latest-news > summary');
      await summary.click();
      const collapsed=await page.evaluate(()=>{
        const n=document.getElementById('latest-news');
        return !n.open&&getComputedStyle(n.querySelector('.ma-news-panel')).display==='none';
      });
      await summary.click();
      const expanded=await page.evaluate(()=>{
        const n=document.getElementById('latest-news');
        return n.open&&getComputedStyle(n.querySelector('.ma-news-panel')).display!=='none'&&
          getComputedStyle(n.querySelector('summary')).pointerEvents!=='none'&&
          n.closest('#ma-concierge')===null&&
          !!n.querySelector('.ma-news-card-main[href^="https://"]');
      });
      record('LIVE Latest News opens and closes '+device.name,collapsed&&expanded,
        'collapsed='+collapsed+' expanded='+expanded);
      await shot(page,device.name+'-latest-news-open');
    } catch(error) {
      record('LIVE Latest News opens and closes '+device.name,false,String(error.message).slice(0,240));
    }
    assert(await page.locator('img[data-title]').count()>0,'no original-title poster elements');
    // On a 320px phone the trending rail starts below the opening hero and
    // images may still be lazy. Scroll it genuinely into the viewport first.
    await page.locator('#trending-rail').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>[...document.querySelectorAll('#trending-rail img[data-title]')]
      .some(img=>img.complete&&img.naturalWidth>0),null,{timeout:15000}).catch(()=>{});
    const home=await page.evaluate(()=>{
      const images=[...document.querySelectorAll('img[data-title]')];
      const visible=images.filter(el=>{const r=el.getBoundingClientRect();return r.width>40&&r.height>40&&r.left<innerWidth&&r.top<innerHeight&&r.bottom>0});
      return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,artworks:images.length,
       inView:visible.length,valid:visible.filter(im=>im.complete&&im.naturalWidth>0).length,
       wrongFit:visible.filter(im=>getComputedStyle(im).objectFit==='fill').length};
    });
    record('home responsive and original visible posters '+device.name,
      home.scrollWidth<=home.width+16 && !home.wrongFit && home.artworks>0 && home.valid>0,
      JSON.stringify(home));
    // The brand is genuine, translated text beside the existing transparent orb.
    // Check actual production computed layout on every viewport, including 320px.
    const identity=await page.evaluate(()=>{
      const h=document.getElementById('mh-topbox'),brand=h?.querySelector('.ma-brand-lockup');
      const name=h?.querySelector('.ma-brand-copy'),ai=name?.querySelector('[data-ma-brand-ai]');
      const rect=name?.getBoundingClientRect(),box=h?.getBoundingClientRect();
      return {
        label:brand?.getAttribute('aria-label')||'',ai:ai?.textContent||'',
        tv:!!brand?.querySelector('.ma-tv'),detached:!!brand?.querySelector('.ma-ai-brand-button'),
        logo:!!brand?.querySelector('.ma-brand-orb[src*="matchapp-home-orb-transparent.webp"]'),
        gradient:!!ai&&getComputedStyle(ai).backgroundImage.includes('linear-gradient'),
        weight:name?getComputedStyle(name.querySelector('.ma-wordmark')).fontWeight:'0',
        textInside:!!rect&&!!box&&rect.right<=box.right+3&&rect.left>=box.left-3,
        width:rect?.width||0
      };
    });
    record('original integrated MatchApp Ai brand '+device.name,
      identity.label==='MatchApp Ai'&&identity.ai==='Ai'&&!identity.tv&&!identity.detached&&
      identity.logo&&identity.gradient&&identity.textInside&&Number(identity.weight)>=800,
      JSON.stringify(identity));
    if(device.name==='desktop'){
      await page.evaluate(()=>{if(typeof window.setLanguage!=='function')throw Error('Language switch unavailable');window.setLanguage('pt-BR')});
      await page.waitForFunction(()=>{
        const brand=document.querySelector('#mh-topbox .ma-brand-lockup');
        return brand?.getAttribute('aria-label')==='MatchApp iA'&&brand.querySelector('[data-ma-brand-ai]')?.textContent==='iA';
      },null,{timeout:10000});
      const portuguese=await page.evaluate(()=>{
        const b=document.querySelector('#mh-topbox .ma-brand-lockup');
        return {label:b?.getAttribute('aria-label'),ai:b?.querySelector('[data-ma-brand-ai]')?.textContent,
          home:b?.querySelector('.ma-brand-home-link')?.getAttribute('aria-label')};
      });
      record('live Brazilian Portuguese MatchApp iA brand',
        portuguese.label==='MatchApp iA'&&portuguese.ai==='iA'&&portuguese.home==='MatchApp iA home',
        JSON.stringify(portuguese));
      await page.evaluate(()=>window.setLanguage('en'));
    }
    // Owner-authorized reordering: verify the ACTUAL page, not just HTML.
    // The manual AdSense inventory and full-width creative are untouched.
    const sponsor=await page.evaluate(()=>{
      const card=document.querySelector('.tg-entry');
      const ad=document.querySelector('.ma-together-ad');
      const fold=document.querySelector('.lazy-head[data-fold-key="together"]');
      const ins=ad?.querySelector('ins.adsbygoogle');
      if(!card||!ad||!ins)return {found:false};
      const a=ad.getBoundingClientRect(),c=card.getBoundingClientRect();
      const visible=getComputedStyle(ad).display!=='none'&&getComputedStyle(card).display!=='none';
      return {found:true,direct:card.nextElementSibling===ad,
        header:!fold||fold.nextElementSibling===card,
        onScreenOrder:!visible||a.top>=c.bottom-3,
        responsive:ins.getAttribute('data-full-width-responsive')==='true',
        format:ins.getAttribute('data-ad-format'),manualCount:document.querySelectorAll('ins.adsbygoogle[data-ad-slot="2595698117"]').length,totalCount:document.querySelectorAll('ins.adsbygoogle').length};
    });
    record('Match Together ad follows complete card '+device.name,
      sponsor.found&&sponsor.direct&&sponsor.header&&sponsor.onScreenOrder&&
      sponsor.responsive&&sponsor.format==='auto'&&sponsor.manualCount===5,JSON.stringify(sponsor));
    // Three bespoke, micro-sized intelligence effects, never a whole header
    // animation. Touch devices receive one-pass text glint with the same sparks.
    const aiEffects=await page.evaluate(()=>{
      const ai=document.querySelector('#mh-topbox [data-ma-brand-ai]');
      if(!ai)return {};
      return {text:getComputedStyle(ai).animationName,
       mote:getComputedStyle(ai,'::before').animationName,
       star:getComputedStyle(ai,'::after').animationName};
    });
    record('subtle native CSS Ai signature '+device.name,
      /maAiIntelligenceGlint|maSignatureWordmarkGlint/.test(aiEffects.text||'')&&
      /maAiSignalMote/.test(aiEffects.mote||'')&&
      /maAiSignatureStar/.test(aiEffects.star||''),JSON.stringify(aiEffects));
    if(device.name==='desktop'){
      const still=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
      try{
        const quiet=await still.newPage();
        await observed(quiet,'/');
        const motion=await quiet.evaluate(()=>{
          const ai=document.querySelector('#mh-topbox [data-ma-brand-ai]');
          return ai?{text:getComputedStyle(ai).animationName,
            mote:getComputedStyle(ai,'::before').animationName,
            star:getComputedStyle(ai,'::after').animationName}:{missing:true};
        });
        record('accessible AI branding respects reduced motion',
          motion.text==='none'&&motion.mote==='none'&&motion.star==='none',JSON.stringify(motion));
      }finally{await still.close();}
    }
    const ebook=page.locator('#ebook-matcher-root');
    const placement=await page.evaluate(()=>{
      const form=document.getElementById('questionnaire-box'),root=document.getElementById('ebook-matcher-root');
      return !!(form&&root&&root.previousElementSibling===form&&!root.closest('#search-box'));
    });
    record('Bookworms directly follows Find what to watch here '+device.name,placement,'independent of Ask AI');
    const fold=ebook.locator('details.ebook-fold');
    // Nested Bookworms top-picks and saved lists have their own summaries.
    // Click the ONE direct fold summary, not three nested matches.
    if(!await fold.evaluate(d=>d.open))await fold.locator(':scope > summary').click();
    const format=ebook.locator('select[data-ebook-select="format"]');
    await format.waitFor({state:'visible',timeout:12000});
    for(const kind of ['audiobook','magazine','ebook']){
      await format.selectOption(kind);
      assert.equal(await format.inputValue(),kind,'real '+kind+' option was not selected');
      const current=await page.evaluate(()=>JSON.parse(localStorage.getItem('match_ebook_criteria_v1')||'{}').format);
      assert.equal(current,kind,'selected format must persist to the real Bookworms matcher');
    }
    const bookFields=await ebook.locator('select[data-ebook-select]').count();
    record('real compact reading controls '+device.name,bookFields===7,
      'seven live dropdowns preserve ebook, verified audio and magazine choices');
    await shot(page,device.name+'-home');
    await observed(page,'/discover.html');
    const textbox=page.locator('#discover-new-input');await textbox.waitFor({state:'visible',timeout:20000});
    const composer=await page.evaluate(()=>{
      const input=document.getElementById('discover-new-input').getBoundingClientRect();
      const mic=document.getElementById('mic-btn-discover')?.getBoundingClientRect();
      return {inputWidth:input.width,focused:document.activeElement?.id==='discover-new-input',
       collision:!!mic&&mic.width>0&&input.left<mic.right&&input.right>mic.left&&input.top<mic.bottom&&input.bottom>mic.top};
    });
    record('Ask AI composer '+device.name,composer.inputWidth>85&&!composer.focused&&!composer.collision,
      JSON.stringify(composer));
    const shellBrand=await page.evaluate(()=>{
      const b=document.querySelector('body.page-shell .mh-topbox .ma-brand-lockup');
      return {label:b?.getAttribute('aria-label'),ai:b?.querySelector('[data-ma-brand-ai]')?.textContent,
        obsoleteGraphic:!!document.querySelector('body.page-shell .mh-topbox .matchapp-wordmark'),
        detached:!!b?.querySelector('.ma-ai-brand-button')};
    });
    record('shared adult page top-box brand '+device.name,
      shellBrand.label==='MatchApp Ai'&&shellBrand.ai==='Ai'&&!shellBrand.obsoleteGraphic&&!shellBrand.detached,
      JSON.stringify(shellBrand));
    await shot(page,device.name+'-ask-ai');
   }catch(error){
     record('device '+device.name,false,String(error.stack||error).slice(0,500));
     await shot(page,device.name+'-failure');
   }finally{await context.close();}
  }
  // One legitimate live match, separate from scripted stub tests. It consumes
  // one guest allowance and must reveal a non-placeholder title and poster.
  const c=await browser.newContext({viewport:{width:1360,height:900},locale:'en-US'});
  const page=await c.newPage();
  try{
    await observed(page,'/');
    await page.getByRole('button',{name:/Essential only/i}).first().click({timeout:1600}).catch(()=>{});
    await page.waitForFunction(()=>typeof window.setMatchCriteria==='function',{timeout:15000});
    const picked=await page.evaluate(()=>{window.setMatchCriteria({cat:['movie'],mood:['funny'],plat:[]});return window.getMatchCriteria()});
    assert(picked.cat.includes('movie')&&picked.mood.includes('funny'),'production multi-select did not preserve choices');
    await page.locator('button[onclick="triggerMatch(false)"]').click();
    await page.waitForFunction(()=>{
      const box=document.getElementById('result-box');
      const title=document.getElementById('res-title')?.textContent?.trim();
      return box&&getComputedStyle(box).display!=='none'&&title&&title!=='Title';
    },null,{timeout:110000});
    const title=await page.locator('#res-title').innerText();
    await page.waitForFunction(()=>{
      const im=document.getElementById('res-poster-img');
      return im&&im.complete&&im.naturalWidth>0;
    },null,{timeout:25000});
    const poster=await page.locator('#res-poster-img').evaluate(img=>({
      src:img.currentSrc||img.src,loaded:img.complete&&img.naturalWidth>0,
      aspect:img.naturalHeight?img.naturalWidth/img.naturalHeight:0,fit:getComputedStyle(img).objectFit
    }));
    const authentic=poster.loaded && /^https?:/i.test(poster.src) &&
      !/placeholder|fallback|fake-poster|dummy/i.test(poster.src);
    record('LIVE normal movie matching and source poster',title.length>1&&authentic&&poster.fit!=='fill',
      'title='+title.slice(0,110)+' poster='+poster.src.slice(0,130)+' loaded='+poster.loaded+' fit='+poster.fit);
    await page.waitForTimeout(1800);await shot(page,'live-normal-matched');
    // Requested dismissal regression: click the real red trash icon, wait for
    // fade-out, and verify the normal Home remains intact without losing ads.
    const dismiss=page.locator('#result-dismiss');
    await dismiss.click();
    await page.waitForFunction(()=>getComputedStyle(document.getElementById('result-box')).display==='none',null,{timeout:5000});
    const closed=await page.evaluate(()=>({
      resultHidden:getComputedStyle(document.getElementById('result-box')).display==='none',
      formRestored:document.getElementById('questionnaire-box').style.display!=='none',
      homeVisible:!!document.getElementById('trending-rail')?.getClientRects().length,
      ads:document.querySelectorAll('ins.adsbygoogle').length
    }));
    record('LIVE red trash dismisses match without damaging Home',closed.resultHidden&&
      closed.formRestored&&closed.homeVisible&&closed.ads===5,JSON.stringify(closed));
    await shot(page,'live-result-dismissed');
  }catch(error){record('LIVE normal movie matching',false,String(error.stack||error).slice(0,500));await shot(page,'live-normal-failure')}
  finally{await c.close();}
  // A real book match exercises the production matcher and confirms that the
  // image is fetched from an identity-verified Open Library / Google Books
  // edition, never a synthetic text-only replacement falsely called a cover.
  const booksContext=await browser.newContext({viewport:{width:1200,height:900},locale:'en-US'});
  const books=await booksContext.newPage();
  try{
    await observed(books,'/');
    await books.getByRole('button',{name:/Essential only/i}).first().click({timeout:1600}).catch(()=>{});
    const root=books.locator('#ebook-matcher-root');
    await root.locator('details.ebook-fold').waitFor({state:'attached',timeout:18000});
    await root.locator('details.ebook-fold').evaluate(el=>{el.open=true});
    const format=root.locator('select[data-ebook-select="format"]');
    await format.selectOption('ebook');
    await root.locator('[data-ebook-match]').click();
    const result=root.locator('[data-ebook-result]');
    await result.locator('h3').first().waitFor({state:'visible',timeout:55000});
    const name=await result.locator('h3').first().innerText();
    // If the original edition cover is unavailable, retain the honest named
    // fallback in production but FAIL this verification; do not invent art.
    const im=result.locator('img[data-ebook-cover]');
    await im.waitFor({state:'attached',timeout:10000});
    const loaded=await im.evaluate(async image=>{
      if(image.complete&&image.naturalWidth>0)return true;
      return await new Promise(resolve=>{
        let timer=setTimeout(()=>resolve(false),28000);
        image.addEventListener('load',()=>{clearTimeout(timer);resolve(image.naturalWidth>0)},{once:true});
        image.addEventListener('error',()=>{clearTimeout(timer);resolve(false)},{once:true});
      });
    });
    const cover=await im.evaluate(img=>({src:img.currentSrc||img.src,loaded:img.complete&&img.naturalWidth>0,
      fit:getComputedStyle(img).objectFit}));
    const verifiedSource=/^https:\/\/(?:covers\.openlibrary\.org|books\.google\.com\/books\/content)/i.test(cover.src);
    record('LIVE Bookworms real e-book matching and verified original cover',
      !!name&&loaded&&cover.loaded&&verifiedSource&&cover.fit!=='fill',
      'book='+name.slice(0,100)+' source='+cover.src.slice(0,130)+' verified='+verifiedSource+' fit='+cover.fit);
    await shot(books,'live-ebook-matched');

    // Publisher identity tiles are intentional and genuine issue art is only
    // linked on the publisher site; never pretend they are downloaded covers.
    await format.selectOption('magazine');
    await root.locator('[data-ebook-match]').click();
    await result.locator('.magazine-result-grid h3').waitFor({state:'visible',timeout:50000});
    const magazine=await result.evaluate(node=>{
      const title=node.querySelector('.magazine-result-grid h3')?.textContent?.trim()||'';
      const original=node.querySelector('a[data-ebook-provider="Official issues"]');
      const icon=node.querySelector('img[data-magazine-publisher-icon]');
      const article=node.querySelector('.magazine-original-note');
      return {title,issues:original?.href||'',icon:icon?.src||'',iconLoaded:!!(icon?.complete&&icon?.naturalWidth),
        honestLabel:!!article};
    });
    const issuer=magazine.issues?new URL(magazine.issues).hostname:'';
    const imageDomain=magazine.icon?new URL(magazine.icon).hostname:'';
    record('LIVE magazine matching and authentic publisher cover route',
      !!magazine.title&&!!issuer&&!!imageDomain&&
        (issuer===imageDomain||issuer.endsWith('.'+imageDomain)||imageDomain.endsWith('.'+issuer))&&
        magazine.honestLabel,
      JSON.stringify(magazine));
    record('LIVE original publisher icon resolves',magazine.iconLoaded,
      'magazine='+magazine.title+' publisher icon='+magazine.icon);
    await shot(books,'live-magazine-matched');
  }catch(error){
    record('LIVE Bookworms e-book and magazine matching',false,String(error.stack||error).slice(0,500));
    await shot(books,'live-bookworms-failure');
  }finally{await booksContext.close();}

  // Run genuine proxy-backed AI questions only AFTER normal/book matching.
  const aiContext=await browser.newContext({viewport:{width:1360,height:900},locale:'en-US'});
  const pageAi=await aiContext.newPage();
  try{
    await observed(pageAi,'/discover.html');
    await pageAi.locator('#discover-new-input').waitFor({state:'visible',timeout:20000});
    const page=pageAi;
      await aiQuestion(page,
       'Name the director and the release year of the 2001 animated film Spirited Away. Do not recommend books or music.',
       /(?:miyazaki)/i,'movie-fact');
      await aiQuestion(page,
       'How can I find a legitimate audiobook edition of Pride and Prejudice by Jane Austen? Please do not recommend any films or TV shows.',
       /pride\s+(?:and|&)\s+prejudice|jane\s+austen/i,'audiobook-intent');
      const bookRoute=page.locator('#chat-log .discover-book-matcher-link').last();
      const href=await bookRoute.getAttribute('href').catch(()=>null);
      record('Ask AI audio-specific route',!!href&&href.includes('reading=audiobook'),href||'missing');

  }catch(error){
    record('LIVE Ask AI movie and audiobook intents',false,String(error.stack||error).slice(0,500));
    await shot(pageAi,'live-ai-failure');
  }finally{await aiContext.close();}
  record('browser fatal JS exceptions',!errors.length,JSON.stringify(errors.slice(0,4)));
 }catch(error){record('smoke harness setup',false,String(error.stack||error).slice(0,700))}
 finally{
  if(browser)await browser.close();
  report.finished=new Date().toISOString();
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));
  console.log('LIVE SMOKE TOTAL '+report.checks.filter(x=>x.ok).length+' passed '+report.errors.length+' failed');
  if(report.errors.length)process.exitCode=1;
 }
})();