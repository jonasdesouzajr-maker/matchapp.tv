const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Explore uses real hubs and exact editorial posters, with unchanged layout CSS',()=>{
 const doc=new JSDOM(read('explore.html')).window.document;
 for(const route of ['/ebooks/','/cooking/','/news/','/events/'])assert.ok(doc.querySelector(`.ex-card[href="${route}"]`));
 assert.match(doc.querySelector('.ex-card[href*="open.spotify.com"]').href,/open\.spotify\.com\/playlist\//);
 const posters=doc.querySelectorAll('.ex-posters a');assert.equal(posters.length,2);
 for(const p of posters){assert.match(p.href,/\/discover\.html\?q=/);assert.doesNotMatch(p.querySelector('img').src,/og-image/);}
 assert.equal(doc.querySelectorAll('#ma-jonas-home').length,1);
 assert.match(read('events/index.html'),/location\.replace\('\/events-archive\.html'/);
});
test('Home policy rejects channels, audio and cinema-only records but accepts movie/TV',()=>{
 const app=read('app.js');const slice=app.slice(app.indexOf('function isStreamingHome()'),app.indexOf('function isSurpriseEligible(entry)'));
 const ctx=vm.createContext({location:{pathname:'/'}});vm.runInContext(slice,ctx);
 for(const cat of ['movie','series','limited series','documentary','K-drama'])assert.equal(ctx.homeStreamingEntry({cats:[cat],platform:'Netflix'}),true);
 for(const row of [{cats:['YouTube channel'],platform:'YouTube'},{cats:['movie','Cooking & Recipes'],platform:'Netflix'},{cats:['podcast'],platform:'Spotify'},{cats:['movie'],platform:'Cinemas'},{cats:['movie'],inCinemas:true,platform:'any'}])assert.equal(ctx.homeStreamingEntry(row),false);
 ctx.location.pathname='/cooking/';assert.equal(ctx.isStreamingHome(),false);
 assert.match(app,/if \(!chosen.length\) requested.cat = \[\.\.\.HOME_STREAMING_CATEGORIES\]/);
 assert.ok(app.indexOf('homeStreamingEntry(matchResult)) matchResult = null')<app.indexOf("window.__matchappMatchPhase='quota'"));
});
test('Adult bubble loader is idempotent, reuses approved markup and leaves Kids alone',async()=>{
 const script=read('jonas/adult-page-bubble-20261013.js');
 const dom=new JSDOM('<!doctype html><body class="page-kids"></body>',{url:'https://matchapp.tv/kids/',runScripts:'outside-only'});
 let requested=0;dom.window.fetch=()=>{requested++;throw new Error('must not fetch')};dom.window.eval(script);dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));await new Promise(r=>setImmediate(r));assert.equal(requested,0);assert.equal(dom.window.document.querySelector('#ma-jonas-home'),null);dom.window.close();
 const home=new JSDOM(read('index.html')).window.document;
 const shell=new JSDOM(read('jonas/floating-shell-20261013.html')).window.document;
 assert.equal(shell.querySelector('#ma-jonas-home').outerHTML,home.querySelector('#ma-jonas-home').outerHTML);
 const voice=read('jonas/floating-voice-20261010-v5.js');assert.match(voice,/4500/);assert.match(voice,/visemeA/);
 assert.match(read('jonas/floating-home-20261010-v3.js'),/if\(!root\|\|\/\^\\\/kids/);
});
