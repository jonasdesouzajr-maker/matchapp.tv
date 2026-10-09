'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..'),photo=fs.readFileSync(path.join(root,'jonas/faces/jonas/rest.jpg')).toString('base64');
 const out='E:/android/MatchAppAi-Play-v46';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
 for(const target of [
  {w:1200,h:630,out:path.join(root,'jonas/og-jonas.jpg'),type:'jpeg'},
  {w:1024,h:500,out:path.join(out,'feature-graphic.png'),type:'png'}
 ]){
  const page=await browser.newPage({viewport:{width:target.w,height:target.h},deviceScaleFactor:1});
  const w=target.w,h=target.h;
  await page.setContent(`<!doctype html><html><head><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{background:radial-gradient(ellipse at 74% 50%,#6b467d 0,#2b163e 30%,#120a1f 79%);font-family:Arial,Helvetica,sans-serif;color:#fff;display:flex;align-items:center;padding:7%} .copy{position:relative;z-index:4;width:60%} .tag{display:block;font-weight:800;letter-spacing:.15em;font-size:15px;color:#f5c874;margin-bottom:28px}h1{font-weight:850;margin:0 0 20px;font-size:${Math.round(w*.051)}px;line-height:1.06;letter-spacing:-.045em}h1 em{font-style:normal;color:#f3ce82}.sub{font-size:${Math.round(w*.020)}px;line-height:1.36;color:#ecdfec;max-width:620px;margin:0}.ring{position:absolute;right:7%;top:50%;transform:translateY(-50%);width:${Math.round(h*.74)}px;height:${Math.round(h*.74)}px;padding:9px;border-radius:50%;background:linear-gradient(130deg,#fff1b6,#d5a853,#795a9f);box-shadow:0 0 0 12px #f2d9a31f,0 0 90px #c596e155;overflow:hidden}.ring img{width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:center 12%;display:block}.sparks{position:absolute;right:9%;top:6%;color:#ffc965;font-size:50px;opacity:.65}</style></head><body><div class="copy"><span class="tag">MATCHAPP AI</span><h1>Discover with <em>Jonas</em></h1><p class="sub">Your AI companion for movies, series, documentaries and music.</p></div><div class="ring"><img src="data:image/jpeg;base64,${photo}"/></div><div class="sparks">✦</div></body></html>`,{waitUntil:'load'});
  await page.screenshot({path:target.out,type:target.type,quality:target.type==='jpeg'?88:undefined,animations:'disabled'});
  console.log('CREATED',target.out,w,h,fs.statSync(target.out).size);
  await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
