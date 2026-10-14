'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 let file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return}
 try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  const ext=path.extname(file),mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml'};
  res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404).end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 const base='http://127.0.0.1:'+server.address().port;
 const paths=['/','/explore.html','/how-it-works.html','/music.html','/discover.html','/profile/profile.html','/pricing/pricing.html','/cooking/','/ebooks/','/news/','/together.html','/friends.html'];
 for(const uri of paths){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  await page.goto(base+uri,{waitUntil:'domcontentloaded'});
  const v=await page.evaluate(()=>{
   const css=getComputedStyle(document.body),heading=document.querySelector('h1,h2,.hub-title');
   return {body:css.fontFamily,heading:heading?getComputedStyle(heading).fontFamily:null,visible:!!heading};
  });
  assert.match(v.body,/Inter/,uri+' did not inherit premium body typography '+JSON.stringify(v));
  if(v.heading)assert.match(v.heading,/Outfit/,uri+' did not inherit premium headline '+JSON.stringify(v));
  console.log('PASS shared adult typography',uri,JSON.stringify(v));
  await page.close();
 }
 const kid=await browser.newPage({viewport:{width:390,height:844}});
 await kid.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await kid.goto(base+'/kids/',{waitUntil:'domcontentloaded'});
 const family=await kid.evaluate(()=>getComputedStyle(document.body).fontFamily);
 assert.doesNotMatch(family,/Space Grotesk/, 'Kids mode must not acquire adult UI font');
 console.log('PASS Kids typography isolated',family);
 await kid.close();await browser.close();server.close();
})().catch(e=>{console.error(e.stack||e);server.close();process.exit(1)});
