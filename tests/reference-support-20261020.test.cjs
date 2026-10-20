'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8'),copy=require('../patches/reference-support.js');
test('support invitations follow the existing14-language owners and preserve original nodes/actions',async()=>{
 for(const [file,name,attribute,owner,source]of[['founder/index.html','founder','data-founder','founder','founder'],['sponsor/index.html','sponsor','data-mp','partnership','partnership']]){
  const dom=new JSDOM(read(file),{url:'https://matchapp.tv/'+(name==='founder'?'founder':'sponsor')+'/',runScripts:'outside-only'}),w=dom.window,d=w.document;
  const destination=n=>n.getAttribute('href')?.split('?')[0]??null,original=JSON.parse(read('data/'+source+'-copy.json')),buttons=[...d.querySelectorAll('a,button,input,textarea,select')],paths=buttons.map(destination),key=Object.keys(copy[name].en)[0],node=d.querySelector('['+attribute+'="'+key+'"]'),text=node.firstChild;
  w.eval(read('patches/'+owner+'-copy.js'));w.eval(read('patches/'+(owner==='founder'?'founder-page':'partnership-pages')+'.js'));w.eval(read('patches/reference-support.js'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
  for(const language of Object.keys(original)){
   w.MATCH_LANG=language==='pt'?'pt-BR':language;d.dispatchEvent(new w.Event('matchapp:langchange'));const ownedText=node.firstChild;await Promise.resolve();assert.equal(node.firstChild,ownedText,'presentation preserves the text node supplied by the locale owner');
   for(const [field,en]of Object.entries(copy[name].en)){const expected=copy[name][language]?.[field]??original[language][field];for(const el of d.querySelectorAll('['+attribute+'="'+field+'"]'))assert.equal(el.textContent,expected,name+' '+language+' '+field);}
   assert.deepEqual([...d.querySelectorAll('a,button,input,textarea,select')],buttons);assert.deepEqual(buttons.map(destination),paths);
   if(name==='founder')assert.equal(new URL(d.getElementById('founder-email').href).searchParams.get('subject'),original[language].emailSubject);
  }
  assert.equal(d.querySelectorAll('script[src*="reference-support.js"]').length,1);dom.window.close();
 }
});
test('support copy leaves amount validation, selected chips and original checkout handler intact',async()=>{
 const source=read('index.html'),start=source.indexOf('<section id="ma-donate-support"'),end=source.indexOf('</section>',start)+10;
 const dom=new JSDOM(source.slice(start,end),{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window,d=w.document;w.MATCHAPP_SUPPORT_CONFIG={paypalMeUrl:'https://paypal.me/VerifiedTest',verified:true};let opened=[];w.open=(...args)=>opened.push(args);
 const button=d.getElementById('ma-donate-pill'),amount=d.getElementById('ma-donate-amount'),checkout=d.getElementById('ma-donate-checkout');w.eval(read('patches/support-donations.js'));w.eval(read('patches/reference-support.js'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
 for(const lang of ['en','pt-BR','ar','en']){w.MATCH_LANG=lang;d.documentElement.lang=lang;d.dispatchEvent(new w.Event('matchapp:langchange'));await Promise.resolve();assert.equal(d.getElementById('ma-donate-pill'),button);assert.equal(d.getElementById('ma-donate-amount'),amount);if(lang==='en'||lang==='pt-BR')assert.equal(button.textContent,copy.donate[lang==='en'?'en':'pt']['ma-donate-pill']);}
 button.click();assert.equal(d.getElementById('ma-donate-panel').hidden,false);d.querySelector('[data-donate-value="25"]').click();assert.equal(amount.value,'25');assert.equal(d.querySelector('[data-donate-value="25"]').getAttribute('aria-pressed'),'true');checkout.click();assert.equal(opened.length,1);assert.equal(opened[0][0],'https://www.paypal.me/VerifiedTest/25.00USD');assert.equal(opened[0][2],'noopener,noreferrer');amount.value='4';amount.dispatchEvent(new w.Event('input'));assert(checkout.disabled);checkout.click();assert.equal(opened.length,1);dom.window.close();
});
function render(file,stop,expression){const filename=path.join(root,file),source=read(file),end=source.indexOf(stop),realRequire=createRequire(filename);assert(end>0);return vm.runInNewContext(source.slice(0,end)+'\n;('+expression+');',{__dirname:path.dirname(filename),console,URL,require(name){if(name==='node:fs')return{readFileSync:fs.readFileSync.bind(fs)};return realRequire(name);}});}
test('future founder and sponsor output includes the same scoped copy/assets without hooking streaming',()=>{
 const founder=render('tools/build-founder-page.cjs','fs.mkdirSync(','body'),pages=render('tools/build-partnership-pages.cjs','for(const [route,body]of',"({sponsor:page('sponsor',sponsor),streaming:page('streaming',directory)})");
 for(const [html,name,attr]of[[founder,'founder','data-founder'],[pages.sponsor,'sponsor','data-mp']]){const d=new JSDOM(html).window.document;assert.equal(d.querySelectorAll('link[href*="reference-support.css"]').length,1);assert.equal(d.querySelectorAll('script[src*="reference-support.js"]').length,1);for(const [key,value]of Object.entries(copy[name].en))for(const n of d.querySelectorAll('['+attr+'="'+key+'"]'))assert.equal(n.textContent,value);}
 assert(!pages.streaming.includes('reference-support.'));assert.equal(new JSDOM(founder).window.document.getElementById('founder-portrait').getAttribute('src'),'/assets/founder/jonas-junior-office-960.webp');
});
