const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const read=p=>fs.readFileSync(p,'utf8');
const edge=read('supabase/functions/gemini-proxy/index.ts');
function extract(name){const start=edge.indexOf('function '+name+'('),end=edge.indexOf('\n}',start);assert(start>=0&&end>start);return edge.slice(start,end+2);}
const source=['mediaIntentQuestion','detectBookIntent','detectAudioIntent','unsupportedReadingRefusal','buildDiscoverPrompt'].map(extract).join('\n');
const c=vm.createContext({EXPLICIT_XXX:/\b(?:porn|xxx)\b/i,LANG_NAMES:{en:'English','pt-BR':'Portuguese'},DISCOVER_MAX:8});
vm.runInContext(stripTypeScriptTypes(source)+'\nthis.guard=unsupportedReadingRefusal;this.prompt=buildDiscoverPrompt;',c);
const question='How can I find a legitimate audiobook edition of Pride and Prejudice by Jane Austen? Please do not recommend films or TV shows.';
test('current audiobook request overrides a prior film-only turn and its refusal',()=>{
 const prompt=c.prompt(question,'en','BR','',[
  {role:'user',text:'Name the director of Spirited Away. Do not recommend books or music.'},
  {role:'assistant',text:"I cannot recommend books or music."}
 ]);
 assert.match(prompt,/latest request determines the current media format/);
 assert.match(prompt,/MatchApp DOES support mainstream books, e-books and audiobooks/);
 assert.match(prompt,/Never invent an audiobook edition, narrator, language, price/);
 assert.doesNotMatch(c.prompt(question,'en','','',[],true),/latest request determines|MatchApp DOES support/);
});
test('false reading capability refusals are rejected without rejecting edition uncertainty or safety',()=>{
 assert(c.guard(question,"As an entertainment concierge, I can't recommend books or music, nor can I suggest sources."));
 assert(c.guard(question,'Audiobooks are outside my scope.'));
 assert(!c.guard(question,'I cannot verify a specific audiobook edition. Check official publisher listings.'));
 assert(!c.guard(question,'Pride and Prejudice is by Jane Austen. Use the audiobook matcher to verify the edition.'));
 assert(!c.guard('Find a film; do not recommend books or music.',"I can't recommend books or music."));
 assert(!c.guard('Find an xxx audiobook.',"I can't recommend books or music."));
});
for(const [file,name,shape] of [
 ['openrouter-backup.ts','callOpenRouterFirst','chat'],
 ['openai-primary.ts','callOpenAIPrimary','responses'],
 ['groq-backup.ts','callGroqBackup','chat']
])test(name+' rejects a structured but incorrect audiobook refusal so the caller can fail over',async()=>{
 const raw=stripTypeScriptTypes(read('supabase/functions/gemini-proxy/'+file)).replace(/^import .*;\s*$/gm,'').replace(/\bexport /g,'');
 const responses=["I can't recommend books or music.",'Pride and Prejudice by Jane Austen has audiobook editions; verify the exact edition through official sources.'];
 const ctx=vm.createContext({Response,Request,AbortController,setTimeout,clearTimeout,Date,console:{warn(){},info(){}},Deno:{env:{get:()=>''}},schemaFor:()=>({name:'test',schema:{type:'object'}}),fetch:async()=>{
  const text=JSON.stringify({answer:responses.shift()||'Pride and Prejudice by Jane Austen',results:[]});
  return new Response(JSON.stringify(shape==='responses'?{status:'completed',output:[{type:'message',content:[{type:'output_text',text}]}]}:{choices:[{finish_reason:'stop',message:{content:text}}]}));
 }});
 vm.runInContext(raw+'\nthis.call='+name+';',ctx);
 const args={req:new Request('https://matchapp.tv'),prompt:question,mode:'discover',key:'test',reserve:async()=>true,cors:()=>({}),blockXXX:()=>false,explicitXXX:()=>false,acceptDiscoverAnswer:a=>!c.guard(question,a)};
 const first=await ctx.call(args);
 // Groq can recover with its second existing model; other providers return null.
 if(file==='groq-backup.ts'){assert(first);assert.match(JSON.stringify(await first.json()),/Pride and Prejudice/);}
 else{assert.equal(first,null);const next=await ctx.call(args);assert(next);assert.match(JSON.stringify(await next.json()),/Pride and Prejudice/);}
});
