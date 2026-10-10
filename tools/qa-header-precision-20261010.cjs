const { chromium } = require('playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer((req,res)=>{let fp=path.resolve(root,'.'+decodeURI(new URL(req.url,'http://x').pathname));if(!fp.startsWith(root)){res.writeHead(403).end();return;}if(fs.existsSync(fp)&&fs.statSync(fp).isDirectory())fp=path.join(fp,'index.html');fs.readFile(fp,(err,data)=>{if(err)res.writeHead(404).end();else{res.setHeader('Content-Type',mime[path.extname(fp)]||'application/octet-stream');res.end(data);}})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let b=await chromium.launch({headless:true,channel:'msedge'});try{
 for(const width of [320,360,390,430,768,1366]){
  const p=await b.newPage({viewport:{width,height:880}});
  await p.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  await p.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForSelector('#mh-topbox .ma-luxe-shortcut');
  await p.waitForSelector('.ma-how-button',{timeout:10000});
  for(const signedIn of [false,true]){
   if(signedIn)await p.evaluate(()=>{
    document.getElementById('nav-reg-btn').style.display='none';
    document.getElementById('profile-link-tab').style.display='flex';
    document.getElementById('nav-logout-btn').style.display='flex';
    const q=document.getElementById('quota-badge');q.style.display='flex';q.textContent='⚡ 28 left today';
   });
   const metrics=await p.evaluate(()=>{
    const h=document.querySelector('#mh-topbox'),nav=h.querySelector('.mh-deck'),brand=h.querySelector('.ma-brand-home-link'),logo=h.querySelector('.ma-brand-orb-stage'),copy=h.querySelector('.ma-brand-copy');
    function rect(el){let r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}}
    const children=[...nav.children].filter(x=>{let r=x.getBoundingClientRect();return r.width>1&&r.height>1;});
    const boxes=children.map(x=>({selector:x.id||x.className,rect:rect(x)}));
    const overlaps=[];
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
      const a=boxes[i].rect,b=boxes[j].rect;
      if(Math.max(a.x,b.x)<Math.min(a.right,b.right)-3&&Math.max(a.y,b.y)<Math.min(a.bottom,b.bottom)-3)overlaps.push([boxes[i].selector,boxes[j].selector]);
    }
    return{header:rect(h),logo:rect(logo),copy:rect(copy),brand:rect(brand),nav:rect(nav),children:boxes,overlaps, shortcuts:rect(h.querySelector('.ma-luxe-shortcuts')),padding:getComputedStyle(h).padding,gap:getComputedStyle(brand).gap,scrollW:document.documentElement.scrollWidth,viewport:innerWidth,kids:getComputedStyle(h.querySelector('.ma-browser-kids')).display};
   });
   assert(metrics.logo.w>= (width>=768?74:width<=355?60:69),'logo is too small: '+JSON.stringify(metrics));
   assert(parseFloat(metrics.gap)>=11,'brand too close: '+JSON.stringify(metrics));
   assert(metrics.header.right<=width+2&&metrics.header.x>=0,'header extends past viewport: '+JSON.stringify(metrics));
   assert(metrics.scrollW<=width+3,'horizontal overflow: '+JSON.stringify(metrics));
   assert.equal(metrics.kids,'grid'===metrics.kids?'grid':metrics.kids); // Kids must remain browser-visible.
   assert(metrics.kids!=='none','browser Kids hidden');
   assert.equal(metrics.overlaps.length,0,'utility controls overlap: '+JSON.stringify(metrics));
   assert(metrics.nav.h>35&&metrics.shortcuts.h>38);
   const help=metrics.children.find(x=>String(x.selector).includes('ma-how-button'));
   assert(help,'How it works missing');
   if(!signedIn)assert(help.rect.x<=metrics.nav.x+6,'Guest has empty space before How it works: '+JSON.stringify(metrics));
   if(signedIn)assert(metrics.children.some(x=>x.selector==='quota-badge'),'Signed-in credit counter missing');
   const output=path.join(root,'reports','header-precision-'+width+'-'+(signedIn?'signed-in':'guest')+'.png');
   await p.screenshot({path:output,clip:{x:0,y:0,width,height:Math.min(550,880)}});
   console.log('PASS',width,signedIn?'signed-in':'guest',JSON.stringify({logo:metrics.logo.w,brandGap:metrics.gap,headerHeight:metrics.header.h,navHeight:metrics.nav.h,overflow:metrics.scrollW-width,children:metrics.children}));
  }
  await p.close();
 }
}finally{await b.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
