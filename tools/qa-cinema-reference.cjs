'use strict';
// Local presentation/navigation checks. Remote requests are blocked, and no
// matching, checkout, authentication, quota or account mutations are exercised.
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/design-reviews/20261020');
const shots = path.join(out, 'screenshots');
const base = process.env.MATCHAPP_CINEMA_QA_BASE || 'http://127.0.0.1:4173';
const widths = (process.env.MATCHAPP_CINEMA_QA_WIDTHS || '320,390,820,1366').split(',').map(Number);
const langs = ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
fs.mkdirSync(shots, {recursive:true});
const report = {base, scope:'local presentation only; all remote requests blocked', checks:[], failures:[], pageErrors:[], routes:[], settings:null};
let activePage;
function check(ok, name, detail) {
  const result = {name, ok:!!ok, ...detail};
  report.checks.push(result);
  if (!ok) report.failures.push(result);
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function context(browser, width, android=false, reducedMotion='reduce') {
  const ctx = await browser.newContext({viewport:{width,height:1000}, reducedMotion,
    ...(android?{userAgent:'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36 MatchAppAiAndroid/55'}:{})});
  await ctx.addInitScript(() => {
    if(window.top!==window.self)return;
    if (!localStorage.getItem('match_lang')) localStorage.setItem('match_lang','en');
    localStorage.setItem('match_cookie_choice','essential');
    localStorage.setItem('match_legal_choice','essential');
  });
  await ctx.route(/^https?:\/\//, route => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(base).origin) return route.continue();
    return route.abort();
  });
  return ctx;
}
async function go(page, route) {
  activePage=page;
  await page.goto(base + route, {waitUntil:'domcontentloaded'});
  await page.waitForSelector('nav.ma-cinema-dock');
  await page.waitForFunction(() => !!window.MatchCinemaShell);
  await wait(100);
}
async function selectLanguage(page, lang) {
  await page.evaluate(lang => window.setLanguage(lang), lang);
  await page.waitForFunction(lang => {
    const key = lang.toLowerCase().split('-')[0];
    return document.documentElement.lang === lang &&
      document.querySelector('[data-cinema-route="home"] span')?.textContent === window.MatchCinemaShell.labels[key][0];
  }, lang);
}
async function snapshot(page) {
  return page.evaluate(() => {
    const visible = element => {
      const r = element.getBoundingClientRect(), s = getComputedStyle(element);
      return !!(r.width && r.height && s.visibility !== 'hidden' && s.display !== 'none');
    };
    const rect = element => {
      const r = element.getBoundingClientRect();
      return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
    };
    const nav = [...document.querySelectorAll('.ma-cinema-dock a')].map(a => ({route:a.dataset.cinemaRoute, href:a.getAttribute('href'),text:a.textContent.trim(),...rect(a),scrollWidth:a.scrollWidth,clientWidth:a.clientWidth}));
    const title = document.querySelector('.home-h1,.ref-explore-title,.hub-title');
    const frameStyle=getComputedStyle(document.documentElement,'::after');
    return {lang:document.documentElement.lang,dir:document.documentElement.dir,
      overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,
      frame:{content:frameStyle.content,display:frameStyle.display,width:parseFloat(frameStyle.borderTopWidth)||0,shadow:frameStyle.boxShadow},
      nav,title:title?.textContent.trim(),
      controls:[...document.querySelectorAll('#questionnaire-box .crit-toggle, #questionnaire-box .ma-primary, .ref-explore-cta')].filter(visible).map(a=>({text:a.textContent.trim(),...rect(a)})),
      explore:[...document.querySelectorAll('[data-ref-explore]')].map(e=>({key:e.dataset.refExplore,text:e.textContent.trim()})),
      refsStable:!window.__cinemaQNodes || window.__cinemaQNodes.every(e=>document.getElementById(e.id)===e),
      qValues:[...document.querySelectorAll('#questionnaire-box select[id]')].map(e=>({id:e.id,value:e.value})),
      listenersStable:!window.__cinemaQHandlers || window.__cinemaQHandlers.every(entry=>document.getElementById(entry.id)?.onchange===entry.handler),
      dockCount:document.querySelectorAll('nav.ma-cinema-dock').length,
      posterFit:[...document.querySelectorAll('#trending-rail img')].slice(0,4).map(e=>getComputedStyle(e).objectFit),
      music:[...document.querySelectorAll('#trending-rail .marquee-item[data-music-video]')].filter(e=>e.dataset.loopCopy!=='1').map(e=>({height:e.clientHeight,scrollHeight:e.scrollHeight}))};
  });
}

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    for (const width of (process.env.MATCHAPP_CINEMA_QA_SKIP_SWEEP ? [] : widths)) {
      const ctx = await context(browser,width);
      const page = await ctx.newPage();
      page.on('pageerror', error => report.pageErrors.push({width,url:page.url(),message:error.message,stack:error.stack}));
      for (const route of ['/', '/explore.html']) {
        await go(page,route);
        if (route === '/') {
          await page.evaluate(() => {
            window.__cinemaQNodes=[...document.querySelectorAll('#questionnaire-box select[id]')];
            window.__cinemaQHandlers=window.__cinemaQNodes.map(e=>({id:e.id,handler:e.onchange}));
          });
        }
        const original = await snapshot(page);
        for (const lang of langs) {
          await selectLanguage(page,lang);
          const state = await snapshot(page);
          const meta={width,route,lang};
          check(state.overflow<=1,'no horizontal page overflow',{...meta,overflow:state.overflow});
          check(state.frame.content==='none' && state.frame.display==='none' && state.frame.width===0 && state.frame.shadow==='none','viewport outline remains completely absent',{...meta,frame:state.frame});
          check(state.dockCount===1,'one shared dock',meta);
          check(state.nav.length===5 && state.nav.every(a=>a.height>=44 && a.width>=44 && a.left>=0 && a.right<=width && a.scrollWidth<=a.clientWidth+1),'dock touch targets and labels fit',{...meta,nav:state.nav});
          check(state.dir===(lang==='ar'?'rtl':'ltr'),'selected language direction',meta);
          check(state.nav.every(a=>a.text && a.text!=='undefined'),'localized dock labels',meta);
          if (route==='/') {
            check(state.refsStable && state.listenersStable,'original filter nodes and handlers survive localization',meta);
            check(JSON.stringify(state.qValues)===JSON.stringify(original.qValues),'language keeps filter selections',meta);
            check(state.music.length>0 && state.music.every(e=>e.scrollHeight<=e.height+1),'music metadata fits at the current locale and viewport',{...meta,music:state.music});
          } else {
            check(state.explore.length>=15 && state.explore.every(e=>e.text && e.text!=='undefined'),'localized Explore content',{...meta,count:state.explore.length});
          }
        }
        await selectLanguage(page,'en');
        await page.evaluate(()=>scrollTo(0,0));
        if(width!==320)await page.screenshot({path:path.join(shots,(route==='/'?'home':'explore')+'-'+width+'.png')});
        if (width===390) {
          await selectLanguage(page,'ar');
          await page.evaluate(()=>scrollTo(0,0));
          await page.screenshot({path:path.join(shots,(route==='/'?'home':'explore')+'-390-ar.png')});
          await selectLanguage(page,'en');
        }
      }
      await ctx.close();
      console.log('PASS_RESPONSIVE_LOCALES',width);
    }

    const ctx = await context(browser,390,false,'no-preference');
    const page = await ctx.newPage();
    page.on('pageerror',error=>report.pageErrors.push({url:page.url(),message:error.message,stack:error.stack}));
    await go(page,'/explore.html');
    for (const route of ['home','explore','matches','list','profile']) {
      await page.locator('.ma-cinema-dock [data-cinema-route="'+route+'"]').click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('.ma-cinema-dock');
      await wait(80);
      const result = await page.evaluate(route=>({route,url:location.pathname+location.hash,
        selected:document.querySelector('.ma-cinema-dock [aria-current="page"]')?.dataset.cinemaRoute,
        formVisible:!!document.querySelector('#questionnaire-box')?.getBoundingClientRect().height,
        listVisible:getComputedStyle(document.querySelector('#panel-watchlater')||document.body).display!=='none'}),route);
      report.routes.push(result);
      check(result.selected===route,'dock action selects correct destination',result);
      if(route==='matches')check(result.formVisible,'Matches reveals the existing form',result);
      if(route==='list')check(result.listVisible,'My List selects watch-later portfolio',result);
    }

    await go(page,'/profile/profile.html#settings-panel');
    await page.waitForFunction(()=>document.getElementById('settings-panel').open);
    check(await page.locator('#settings-panel').evaluate(e=>e.open),'settings deep link opens actual details',{});
    await page.locator('.profile-hub-row[href="#activity-panel"]').click();
    await page.waitForFunction(()=>document.getElementById('activity-panel').open);
    check(await page.locator('#activity-panel').evaluate(e=>e.open),'activity hub action opens actual details',{});
    await page.locator('.profile-hub-row[href="#settings-panel"]').first().click();
    await page.waitForFunction(()=>document.getElementById('settings-panel').open);
    await page.waitForFunction(()=>window.MatchThemes && window.MatchSettings);
    report.settings=await page.evaluate(()=>({original:getComputedStyle(document.body).backgroundColor,saved:localStorage.getItem('match_settings')}));
    await page.locator('[data-theme-choice="ocean"]').click();
    Object.assign(report.settings,await page.evaluate(saved=>({ocean:getComputedStyle(document.body).backgroundColor,unchangedDuringPreview:localStorage.getItem('match_settings')===saved}),report.settings.saved));
    await page.locator('[data-theme-cancel]').click();
    report.settings.cancelled=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
    await page.locator('[data-theme-choice="arcade"]').click();
    await page.locator('[data-theme-save]').click();
    report.settings.savedTheme=await page.evaluate(()=>JSON.parse(localStorage.getItem('match_settings')||'{}').theme);
    check(report.settings.original!==report.settings.ocean,'theme preview changes the design',report.settings);
    check(report.settings.unchangedDuringPreview && report.settings.cancelled===report.settings.original,'theme cancel preserves saved preference',report.settings);
    check(report.settings.savedTheme==='arcade','theme save remains wired',report.settings);

    const fontBefore=await page.locator('.profile-hub-intro h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
    await page.locator('#set-fontscale').evaluate(e=>{e.value='1.3';e.dispatchEvent(new Event('input',{bubbles:true}));});
    const fontAfter=await page.locator('.profile-hub-intro h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
    check(fontAfter>fontBefore,'font-size configuration visibly enlarges text',{fontBefore,fontAfter});
    await page.locator('#set-motion').check();
    const motion=await page.evaluate(()=>({checked:window.MatchSettings.get('reduceMotion'),css:document.documentElement.classList.contains('reduce-motion'),transition:getComputedStyle(document.querySelector('.ma-cinema-dock svg')).transitionDuration}));
    check(motion.checked && motion.css && motion.transition.split(',').every(duration=>parseFloat(duration)<=0.001),'app reduced-motion configuration stops navigation effects',motion);
    // This browser context is anonymous and all remote requests are blocked.
    // Return its local preference to the value used by the visual cases.
    await page.evaluate(saved=>{if(saved===null)localStorage.removeItem('match_settings');else localStorage.setItem('match_settings',saved);},report.settings.saved);

    await go(page,'/');
    const tools=page.locator('details.ma-cinema-tools');
    check(await tools.count()===1 && !(await tools.evaluate(e=>e.open)),'Home account and configuration menu starts compact',{});
    await tools.locator(':scope > summary').click();
    const reachable=await tools.evaluate(e=>({
      deck:!!e.querySelector('.mh-deck'),shortcuts:!!e.querySelector('.ma-luxe-shortcuts'),
      language:!!e.querySelector('#lang-switcher-host select')?.getBoundingClientRect().height,
      controls:[...e.querySelectorAll('.mh-deck button,.mh-deck a')].filter(n=>getComputedStyle(n).display!=='none').map(n=>({id:n.id,text:n.textContent.trim(),height:n.getBoundingClientRect().height}))
    }));
    check(reachable.deck && reachable.shortcuts && reachable.language && reachable.controls.some(e=>e.height>0),'original Home controls remain reachable in compact menu',reachable);
    await page.locator('#lang-switcher-host select').selectOption('ja');
    check(await page.evaluate(()=>window.MATCH_LANG==='ja' && localStorage.getItem('match_lang')==='ja'),'original Home language selector remains wired',{});
    await page.locator('#lang-switcher-host select').selectOption('en');
    await page.waitForFunction(()=>!document.querySelector('#questionnaire-box .ma-quick,#matchapp-topic-shortcuts,.ma-cinema-quick-choices'));
    await tools.locator(':scope > summary').focus();await page.keyboard.press('Escape');
    check(!(await tools.evaluate(e=>e.open)),'compact menu Escape restores closed state',{});
    check(await page.locator('#questionnaire-box .ma-quick,#matchapp-topic-shortcuts,.ma-cinema-quick-choices').count()===0,'duplicate quick-choice fields stay removed after language changes',{});
    const more=page.locator('#questionnaire-box details.match-more-filters');
    if(await more.count()) {
      const before=await more.evaluate(e=>e.open);
      await more.locator(':scope > summary').click();
      const after=await more.evaluate(e=>e.open);
      check(before!==after,'existing More Filters control toggles advanced fields',{before,after});
      if(after)await more.locator(':scope > summary').click();
    }
    const toggle=page.locator('.ma-cinema-format .crit-toggle');
    if(await toggle.count()) {
      await toggle.click();
      check(await toggle.getAttribute('aria-expanded')==='true','format criteria menu opens',{});
      await page.locator('.ma-cinema-format .crit-chip[data-value="movie"]').click();
      await page.locator('.ma-cinema-format .crit-chip[data-value="series"]').click();
      const criteria=await page.evaluate(()=>window.getMatchCriteria());
      check(criteria.cat.includes('movie') && criteria.cat.includes('series'),'existing multi-select format controls retain multiple choices',{criteria});
      await page.locator('.ma-cinema-format .crit-chip[data-value="movie"]').click();
      const deselected=await page.evaluate(()=>window.getMatchCriteria());
      check(!deselected.cat.includes('movie') && deselected.cat.includes('series'),'existing format deselection remains wired',{criteria:deselected});
      await page.locator('.ma-cinema-format .crit-chip[data-clear]').click();
      await toggle.click();
    }
    const music=await page.locator('#trending-rail .marquee-item[data-music-video]').evaluateAll(items=>items.map(e=>({title:e.getAttribute('aria-label'),height:e.clientHeight,scrollHeight:e.scrollHeight})));
    check(music.length>0 && music.every(e=>e.scrollHeight<=e.height+1),'music cards keep their required metadata inside the card',{music});
    await page.locator('#questionnaire-box').screenshot({path:path.join(shots,'home-form-390.png')});
    await ctx.close();

    const android = await context(browser,390,true);
    const ap = await android.newPage();
    await go(ap,'/explore.html');
    const androidState=await snapshot(ap);
    check(androidState.overflow<=1 && androidState.dockCount===1,'adult Android WebView presentation parity',{overflow:androidState.overflow});
    await ap.screenshot({path:path.join(shots,'explore-android-390.png')});
    await android.close();
    check(!report.pageErrors.some(e=>/reference-(?:system|explore)/.test(e.stack||'')),'no errors from new presentation scripts',{count:report.pageErrors.length});
  } catch (error) {
    report.failures.push({name:'browser run exception',message:error.message,stack:error.stack});
    if(activePage && !activePage.isClosed()){
      report.failureState=await activePage.evaluate(()=>({url:location.href,body:document.body.className,fold:document.getElementById('ma-concierge')?.className,
        panel:document.getElementById('ma-panel-match')?getComputedStyle(document.getElementById('ma-panel-match')).display:null,
        quick:document.querySelector('.ma-cinema-quick-choices')?.getBoundingClientRect().toJSON(),
        settings:localStorage.getItem('match_settings'),lazy:localStorage.getItem('match_lazy_mode')})).catch(()=>null);
      await activePage.screenshot({path:path.join(shots,'qa-failure-state.png')}).catch(()=>{});
    }
  } finally {
    await browser.close();
    report.finishedAt=new Date().toISOString();
    report.passed=report.checks.length-report.failures.filter(e=>e.ok===false).length;
    const file=process.env.MATCHAPP_CINEMA_QA_SKIP_SWEEP?'qa-cinema-interactions.json':'qa-cinema-reference.json';
    fs.writeFileSync(path.join(out,file),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({checks:report.checks.length,failures:report.failures.length,pageErrors:report.pageErrors.length,report:path.join(out,file)}));
    if(report.failures.length)process.exitCode=1;
  }
})();
