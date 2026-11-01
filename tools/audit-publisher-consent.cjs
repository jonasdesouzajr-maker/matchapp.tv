'use strict';
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const {firstGoogleTag,MARKER,SCRIPT}=require('./finalize-brand.js');
function audit(root=path.join(__dirname,'..')){
 let checked=0;const failures=[];
 function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  if(item.name.startsWith('.')||['node_modules','kids','android-studio','private-voice','tests','artifacts','reports'].includes(item.name))continue;
  const file=path.join(dir,item.name);if(item.isDirectory()){walk(file);continue;}
  if(!item.name.endsWith('.html'))continue;
  const html=fs.readFileSync(file,'utf8');if(!/googletagmanager|googlesyndication/.test(html))continue;
  const dom=new JSDOM(html,{includeNodeLocations:true});
  try{
   const d=dom.window.document,tag=firstGoogleTag(d);if(!tag)continue;checked++;
   const defaults=d.querySelectorAll('script['+MARKER+']'),s=defaults[0];
   if(defaults.length!==1||!s||dom.nodeLocation(s).startOffset>=dom.nodeLocation(tag).startOffset||s.outerHTML.replace(/\r\n/g,'\n')!==SCRIPT)failures.push(path.relative(root,file));
  }finally{dom.window.close()}
 }}walk(root);return {checked,failures};
}
module.exports={audit};
if(require.main===module){const result=audit();console.log(JSON.stringify(result));if(result.failures.length)process.exitCode=1;}
