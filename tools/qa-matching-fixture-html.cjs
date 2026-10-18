'use strict';
const {JSDOM}=require('jsdom');

// Prepare repository-owned presentation fixtures without running their normal
// scripts. This is not a sanitizer for arbitrary third-party HTML.
function matchingFixtureHtml(html,base){
 const url=new URL(base);
 if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password){
  throw new TypeError('Matching fixtures require an HTTP loopback origin');
 }
 const dom=new JSDOM(html,{url:url.origin+'/'});
 try{
  const doc=dom.window.document;
  const removeScripts=root=>{
   for(const script of root.querySelectorAll('script'))script.remove();
   for(const template of root.querySelectorAll('template'))removeScripts(template.content);
  };
  removeScripts(doc);
  for(const existing of doc.querySelectorAll('base'))existing.remove();
  const baseElement=doc.createElement('base');baseElement.href=url.origin+'/';
  doc.head.prepend(baseElement);
  return dom.serialize();
 }finally{dom.window.close();}
}
module.exports={matchingFixtureHtml};
