'use strict';
// Keep the local server and browser inside the same execution/network session.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm'};
const server=http.createServer((req,res)=>{
  let file;
  try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}
  catch{res.writeHead(400).end();return;}
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.statSync(file).isFile())throw new Error('not a file');}
  catch{res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
});
server.listen(0,'127.0.0.1',()=>{
  const browser=spawn(process.execPath,[path.join(__dirname,'installed-intro-browser-smoke.cjs')],{
    cwd:root,stdio:'inherit',env:{...process.env,MATCHAPP_TEST_BASE:`http://127.0.0.1:${server.address().port}`}
  });
  browser.on('error',error=>{console.error(error.message);server.close();process.exitCode=1;});
  browser.on('exit',code=>{server.close();process.exitCode=code===null?1:code;});
});
