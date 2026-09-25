'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const client=read('discover.js'),wrap=read('match-guarantee.js');
function setup(payload,policy=null){
 const a=client.indexOf('function mediaIntentQuestion'),b=client.indexOf('/* ---------- AI conversational answer',a);
 assert(a>=0&&b>a);
 const browser={};const ctx=vm.createContext({window:browser});
 vm.runInContext(client.slice(a,b),ctx);
 browser.askAIConversational=async()=>payload;
 browser.matchPolicy=policy;
 const i=wrap.indexOf('function wrapAsk()'),j=wrap.indexOf('function installWrappers()',i);
 assert(i>=0&&j>i);
 vm.runInContext(wrap.slice(i,j)+'\nwrapAsk()',ctx);
 return browser;
}
test('valid film answer survives explicitly excluded audio mentions',async()=>{
 const b=setup({answer:'Hayao Miyazaki directed Spirited Away (2001).',results:[],_live:true});
 const out=await b.askAIConversational('Who directed Spirited Away? Do not recommend books or music.',[]);
 assert.match(out.answer,/Hayao Miyazaki/);assert.equal(out._live,true);
});
test('valid conversational response survives a legitimate audio request',async()=>{
 const b=setup({answer:'Find this artist on an official music provider page.',results:[],_live:true});
 const out=await b.askAIConversational('Where can I listen to the singer on Spotify?',[]);
 assert.match(out.answer,/official music provider/);assert.doesNotMatch(out.answer,/could not verify/i);
});
test('book request does not fall back to unrelated local film catalog',async()=>{
 const b=setup({answer:'Find this audiobook through a verified edition source.',results:[],_live:true},{fitsQuestion:()=>true});
 const out=await b.askAIConversational('Find the audiobook of Pride and Prejudice.',[]);
 assert.match(out.answer,/verified edition/);assert.deepEqual(Array.from(out.results),[]);
});
test('only the independent guarantee asset gets a new injected version',()=>{
 const loader=read('settings.js'),discover=read('discover.html');
 assert(loader.includes("src==='/match-guarantee.js'?'20260925-guarantee2':V"));
 for(const p of ['index.html','discover.html','together.html','pricing/pricing.html'])
   assert(read(p).includes('/settings.js?v=20260925-guarantee2'),p);
 assert(discover.includes('/discover.js?v=20260925-guarantee2'));
});
