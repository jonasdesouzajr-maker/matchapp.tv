'use strict';const {chromium}=require('playwright'),fs=require('fs'),http=require('http'),path=require('path');const root=path.resolve(__dirname,'..');const screenshotDir=path.join(root,'docs/design-reviews/20261014/screenshots');const results=[];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
const server=http.createServer((req,res)=>{const raw=new URL(req.url,'http://localhost').pathname;let f=path.resolve(root,'.'+decodeURIComponent(raw));if(!f.startsWith(root)){res.writeHead(403).end();return;}try{if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)}catch(e){res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});try{for(const width of [320,390,820,1366,1920]){const context=await browser.newContext({viewport:{width,height:width===820?1100:width>=1366?900:760},reducedMotion:'reduce'});await context.addInitScript(()=>localStorage.setItem('match_lang','pt-BR'));const p=await context.newPage();await p.route(/google-analytics|googletagmanager|googlesyndication|doubleclick/i,r=>r.abort());await p.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:45000});await p.waitForTimeout(850);const diagnostic=await p.evaluate(()=>{var e=document.getElementById('questionnaire-box'),a=[];while(e&&a.length<10){var s=getComputedStyle(e),r=e.getBoundingClientRect();a.push({tag:e.tagName,id:e.id,cl:String(e.className||'').slice(0,60),display:s.display,visibility:s.visibility,width:r.width,height:r.height,hidden:e.hidden});e=e.parentElement}return a});if(width===820)console.log('FORM_DIAGNOSTIC',JSON.stringify(diagnostic));const state=await p.evaluate(()=>{
 const rect=e=>e.getBoundingClientRect(),seen=e=>{const r=rect(e),s=getComputedStyle(e);return r.width>1&&r.height>1&&s.display!=='none'&&s.visibility!=='hidden'&&!e.closest('[hidden]');};
 const hiddenIds=['ebook-matcher-root','cooking-home','latest-news','global-events','international-day','awareness-spotlight','billboard','spotify-videos','swifties-spotify','premiere-disclosure','how-it-works','ai-concierge-section'];
 const nav=[...document.querySelectorAll('#mh-topbox nav.ma-luxe-shortcuts >a')].filter(seen).map(e=>({href:e.getAttribute('href'),text:e.textContent.trim(),rect:{x:Math.round(rect(e).x),y:Math.round(rect(e).y),w:Math.round(rect(e).width),h:Math.round(rect(e).height)}}));
 const retained=['trending-rail','questionnaire-box','result-box'].map(id=>({id,exists:!!document.getElementById(id),visible:document.getElementById(id)?seen(document.getElementById(id)):false}));
 const cta=document.querySelector('a.ma-discovery-cta'),appearance=cta&&getComputedStyle(cta),invite=document.querySelector('[data-home-explore-description]')?.closest('section');
 return {ctaBackground:appearance?.backgroundImage,ctaColor:appearance?.color,inviteVisible:invite?seen(invite):false,lang:window.MATCH_LANG,scrollWidth:document.documentElement.scrollWidth,innerWidth,nav,focusVisible:hiddenIds.filter(id=>{const x=document.getElementById(id);return x&&seen(x)}),retained,topLabels:[...document.querySelectorAll('body > main h2,body > main h3')].filter(seen).slice(0,20).map(e=>e.textContent.trim().slice(0,85)),buttonText:document.querySelector('a.ma-discovery-cta')?.textContent.trim(),posterCount:document.querySelectorAll('#trending-rail img').length};
 });results.push({width,...state});console.log('WIDTH',width,'FOCUS',state.focusVisible,'NAV',state.nav.map(n=>n.text),'RETAINED',state.retained,'OVERFLOW',state.scrollWidth-width);
 if(state.focusVisible.length)throw Error('secondary content visible at '+width+': '+state.focusVisible.join());
 if(state.inviteVisible)throw Error('Duplicate large Explore invitation still visible at '+width);
 if(!state.ctaBackground?.includes('linear-gradient')||state.ctaColor!=='rgb(41, 26, 51)')throw Error('Explore CTA is not high-contrast gold at '+width+': '+state.ctaBackground+' '+state.ctaColor);
 if(state.scrollWidth>width+3)throw Error('horizontal overflow at '+width);
 if(!state.nav.some(n=>n.href==='/explore.html'))throw Error('Explore CTA missing');
 if(state.nav.filter(n=>n.href==='/explore.html').length!==1)throw Error('Explore nav duplicate');
 if(width===820){const e=state.nav.find(n=>n.href==='/explore.html');const maxY=Math.max(...state.nav.map(n=>n.rect.y));if(e.rect.y!==maxY)throw Error('Explore not on final nav row');}
 if(width===390||width===820||width===1366){
  // Screenshots document the artwork after giving existing image loaders time to decode.
  // No QA assertion is skipped: slow/missing artwork is still separately audited.
  try{await p.waitForFunction(()=>[...document.querySelectorAll('#trending-rail img')].filter(e=>{const r=e.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&e.complete&&e.naturalWidth>0}).length>=3,null,{timeout:8000})}catch(_){console.log('POSTER_WAIT_TIMEOUT',width)}
  await p.screenshot({path:path.join(screenshotDir,'after-home-focus-cta-'+width+'.png'),fullPage:false,animations:'disabled'});
 }
 await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(400);
 const bottom=await p.evaluate(()=>({scrollY,scrollHeight:document.documentElement.scrollHeight,viewport:innerHeight,footer:document.querySelector('footer')?.getBoundingClientRect().top}));
 if(bottom.scrollHeight>bottom.viewport+100&&bottom.scrollY<bottom.scrollHeight-bottom.viewport-80)throw Error('Could not scroll to bottom '+width);
 results.at(-1).bottom=bottom;await context.close();}}
 finally{await browser.close();server.close();fs.writeFileSync(path.join(root,'docs/design-reviews/20261014/home-focus-audit.json'),JSON.stringify({results},null,2));}
 console.log('PASS '+results.length+' responsive focus/CTA/scroll checks');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
