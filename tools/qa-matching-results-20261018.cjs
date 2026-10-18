/* Isolated presentation fixtures using production DOM, renderer and CSS.
 * This is not evidence of live AI, catalogue availability or a physical device. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {matchingFixtureHtml}=require('./qa-matching-fixture-html.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts','matching-results-20261018');
const read=file=>fs.readFileSync(path.join(root,file),'utf8'),source=read('discover.js');
const functionSource=name=>{const a=source.indexOf('function '+name+'('),b=source.indexOf('\n}',a)+2;assert(a>=0&&b>a);return source.slice(a,b);};
const sourceFunctions=['escapeDiscoverHtml','discoverLabel','discoverIsEpisodic','discoverWhereLabel','discoverStartLabel','discoverFactsHTML','discoverCardHTML'].map(functionSource).join('\n');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const bytes=fs.readFileSync(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes);}catch(_){res.writeHead(404).end();}
});
const devices=[{name:'phone320',width:320,height:710},{name:'phone390',width:390,height:844},{name:'phone430',width:430,height:932},{name:'tablet',width:820,height:1180},{name:'tablet-landscape',width:1180,height:820},{name:'desktop',width:1440,height:900}];
async function metrics(page,cardSelector,imageSelector,buttons){
  return page.evaluate(({cardSelector,imageSelector,buttons})=>{
    const card=document.querySelector(cardSelector),image=document.querySelector(imageSelector),box=card.getBoundingClientRect();
    const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const lineCount=el=>{const tops=new Set(),walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;
      while(node=walk.nextNode()){if(!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);
        for(const r of range.getClientRects())if(r.width>0&&r.height>0)tops.add(Math.round(r.top));
      }return tops.size;
    };
    const controls=[...document.querySelectorAll(buttons)].filter(el=>el.getClientRects().length).map(el=>({label:el.textContent.trim(),lines:lineCount(el),...rect(el)}));
    const collisions=[];
    for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
      const a=controls[i],b=controls[j];if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)collisions.push([a.label,b.label]);
    }
    return {viewport:innerWidth,overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,card:rect(card),
      image:{...rect(image),fit:getComputedStyle(image).objectFit,loaded:image.complete&&image.naturalWidth>0},controls,collisions,
      escaped:controls.filter(c=>c.left<box.left-1||c.right>box.right+1)};
  },{cardSelector,imageSelector,buttons});
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const report={kind:'isolated production presentation fixtures',checks:[]};
  try{
    for(const device of devices){
      const context=await browser.newContext({viewport:device,reducedMotion:'reduce'});
      await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
      const page=await context.newPage();
      for(const surface of ['discover','home']){
        const html=matchingFixtureHtml(read(surface==='discover'?'discover.html':'index.html'),base);
        await page.setContent(html,{waitUntil:'load'});
        if(surface==='discover'){
          await page.addScriptTag({content:sourceFunctions});
          await page.evaluate(()=>{
            document.body.classList.add('ma-ia-discover','ai-sidebar-collapsed','page-shell');
            window.MATCH_LANG='pt-BR';
            window.t=key=>({'res.watchlater':'Salvar para depois','res.notforme':'Não é para mim','discover.whereToWatch':'Onde assistir','discover.whenItStarts':'Estreia','discover.premiered':'Estreou em {year}'}[key]||'');
            window.discoverPosterUrl=()=>'/ahs13-official.png';window.discoverFallbackPoster=window.discoverPosterUrl;
            const item={title:'American Horror Story: 13',year:2026,type:'series',synopsis:'A verified source poster is used here solely to test the result presentation. This fixture does not claim live availability.',realGenres:['Drama','Horror']};
            const log=document.getElementById('chat-log');
            log.innerHTML='<div class="chat-bubble chat-assistant"><div class="chat-results-grid">'+discoverCardHTML(item,0)+'</div></div>';
            document.body.replaceChildren(document.querySelector('main.wrap'));
            document.getElementById('discover-new-input').placeholder='Pergunte ao Jonas…';
            const panel=document.querySelector('.discover-head');
            panel.style.setProperty('--jonas-workspace-height',Math.max(260,document.documentElement.clientHeight-10-panel.getBoundingClientRect().top)+'px');
          });
        }else{
          await page.evaluate(()=>{
            const result=document.getElementById('result-box');
            const main=document.createElement('main');main.className='page-wrapper';main.append(result);document.body.replaceChildren(main);
            result.hidden=false;result.style.display='block';result.classList.add('ma-one-match');
            document.getElementById('res-title').textContent='American Horror Story: 13';
            const image=document.getElementById('res-poster-img');image.src='/ahs13-official.png';image.alt='American Horror Story: 13';
            document.getElementById('btn-watch-later').textContent='Salvar para depois';document.getElementById('btn-not-for-me').textContent='Não é para mim';
            document.getElementById('res-direct-link').classList.add('ma-result-primary');
          });
        }
        const imageSelector=surface==='discover'?'#dp-0':'#res-poster-img';
        await page.locator(imageSelector).evaluate(img=>img.decode());
        const selector=surface==='discover'?'.discover-card':'#result-box';
        const row=await metrics(page,selector,imageSelector,surface==='discover'?'.discover-actions > *':'#result-box .res-action-grid > button');
        report.checks.push({device:device.name,surface,...row});
        assert(row.image.loaded&&row.image.fit==='contain',JSON.stringify(row));
        assert.equal(row.collisions.length,0,JSON.stringify(row));assert.equal(row.escaped.length,0,JSON.stringify(row));
        assert(row.controls.every(button=>button.width>=42&&button.height>=42),JSON.stringify(row));
        assert(row.controls.every(button=>button.lines<=2),JSON.stringify(row));
        assert(row.overflow<=1,JSON.stringify(row));
        for(const control of await page.locator(surface==='discover'?'.discover-actions > *':'#result-box .res-action-grid > button').all())await control.click({trial:true,timeout:5000});
        if(surface==='discover'){
          await page.locator('.discover-actions').screenshot({path:path.join(out,surface+'-actions-'+device.name+'.png'),animations:'disabled'});
          await page.locator(imageSelector).scrollIntoViewIfNeeded();
          await page.screenshot({path:path.join(out,surface+'-'+device.name+'.png'),animations:'disabled'});
        }else await page.locator(selector).screenshot({path:path.join(out,surface+'-'+device.name+'.png'),animations:'disabled'});
        console.log('PASS '+surface+' '+device.name+' original artwork contained; readable controls receive clicks; no overflow/overlap');
      }
      await context.close();
    }
  }finally{
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();server.close();
  }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
