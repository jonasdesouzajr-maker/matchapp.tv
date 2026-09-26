'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const guarantee=read('match-guarantee.js');
function setup(reply,policy=true) {
 const start=guarantee.indexOf('function guaranteeIntentQuestion('),end=guarantee.indexOf('function installWrappers()',start);
 assert(start>0 && end>start);
 const w={MATCH_LANG:'en',askAIConversational:async()=>reply};
 if(policy) {w.matchPolicy={fitsQuestion:()=>true};w.tasteAllowsEntry=()=>true;}
 const ctx=vm.createContext({window:w,CONTENT_CATALOG:[{title:'Unrelated Local Film',cats:['movie'],synopsis:'Not requested'}]});
 vm.runInContext('function catalog(){return CONTENT_CATALOG;}\n'+guarantee.slice(start,end)+'\nwrapAsk()',ctx);
 return w;
}
test('verified film fact with excluded music and books keeps its real reply and no unrelated film cards',async()=>{
 const w=setup({answer:'Hayao Miyazaki directed Spirited Away (2001).',results:[],_live:true});
 const got=await w.askAIConversational('Who directed Spirited Away? Do not recommend books or music.',[]);
 assert.match(got.answer,/Hayao Miyazaki/);assert.equal(got._live,true);assert.equal(got.results.length,0);
});
test('a legitimate audio question keeps the actual conversational answer even when no audio cards are returned',async()=>{
 const w=setup({answer:'Find a legitimate recording using an official provider catalog.',results:[],_live:true});
 const got=await w.askAIConversational('Where can I listen to this audiobook?',[]);
 assert.match(got.answer,/official provider/);
 assert.doesNotMatch(got.answer,/could not verify/i);
 assert.equal(got._live,true);
});
test('a verified ebook conversation cannot trigger unrelated local film fallback',async()=>{
 const w=setup({answer:'The book edition can be verified on an official retailer.',results:[],_live:true});
 const got=await w.askAIConversational('Find the ebook of Pride and Prejudice.',[]);
 assert.match(got.answer,/official retailer/);
 assert.equal(got.results.length,0);
});
test('empty audiobook reply fails honestly instead of claiming an unverified recommendation',async()=>{
 const w=setup({answer:'',results:[],_live:false});
 const got=await w.askAIConversational('Find a Jane Austen audiobook.',[]);
 assert.match(got.answer,/could not verify/i);
 assert.equal(got.results.length,0);
});
test('empty generic conversation does not fabricate an unrelated movie',async()=>{
 const w=setup({answer:'',results:[],_live:false});
 const got=await w.askAIConversational('Hello, what can you do?',[]);
 assert.equal(got.results.length,0);
 assert.doesNotMatch(got.answer,/Unrelated Local Film/);
});
test('only the adult pages that load Ask AI refresh the amended guarantee asset version',()=>{
 const settings=read('settings.js');
 assert(settings.includes("src==='/match-guarantee.js'?'20260925-guarantee3':V"));
 for(const f of ['index.html','discover.html','together.html','pricing/pricing.html'])
   assert(read(f).includes('/settings.js?v=20260925-guarantee3'),f);
});
