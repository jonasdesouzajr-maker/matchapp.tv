'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const source=read('discover.js');
function functionSource(name){
  const start=source.indexOf('function '+name+'('),end=source.indexOf('\n}\n',start)+2;
  assert(start>=0&&end>start,name);
  return source.slice(source.slice(Math.max(0,start-6),start)==='async '?start-6:start,end);
}
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const film=(title,id)=>({title,type:'movie',_catalogMedia:{title,tmdb_id:id,media_kind:'movie'}});
async function until(predicate){for(let i=0;i<150&&!predicate();i++)await Promise.resolve();assert(predicate(),'expected asynchronous checkpoint');}
async function boot(){
  const dom=new JSDOM('<main id="chat-log"></main><div id="discover-loading"></div><div id="discover-empty"></div><textarea id="discover-new-input"></textarea>',{url:'https://matchapp.tv/discover.html',runScripts:'outside-only'});
  const w=dom.window,events=[];
  w.MATCH_LANG='en';w.t=()=>'';w.matchMedia=()=>({matches:false});
  w.eval('var currentThread=null,discoverThreadVersion=0,DISCOVER_ITEMS=[],lastDiscoverQuestion="",askInFlight=null,CHAT_STORE_KEY="match_chatThreads",CHAT_MAX_THREADS=20,CONTENT_CATALOG=[];');
  w.eval(read('matching-policy.js'));await w.matchPolicy.ready();
  w.matchAllowanceBeforeLookup=async()=>true;
  w.checkDailyLimit=async()=>{events.push({type:'debit'});return true;};
  w.refreshAiWorkspaceStatus=()=>{};w.renderThreadList=()=>{};
  w.newThreadId=()=> 'request-thread';
  w.placeDiscoverComposer=()=>{};w.parkDiscoverComposer=()=>{};w.revealJonasTurn=()=>{};
  w.startAiWorkflow=()=>{};w.finishAiWorkflow=()=>{};
  w.typewriterReveal=async(el,text)=>{el.textContent=text;};
  w.readAloud=text=>events.push({type:'voice',text});
  w.MatchAppJonasNarration={prepare:(el,text)=>{el.textContent=text;}};
  w.MatchAppJonasStage={speak:async text=>{events.push({type:'voice',text});}};
  w.detectBookIntent=q=>/\b(?:books?|audiobooks?|magazines?)\b/i.test(q);
  w.mediaIntentQuestion=q=>q;w.MatchCooking={isCooking:()=>false};
  w.enrichDiscoverMedia=async item=>item;w.enrichDiscoverItem=item=>item;
  w.isDiscoverDisliked=(item,fresh=false)=>w.matchPolicy.excludes(item,{hardOnly:!fresh});
  w.catalogFallbackForQuestion=()=>[];
  w.fallbackSearch=async()=>({answer:'No live answer.',results:[],_live:false});
  w.renderResultsInto=async(_grid,items,_base,options)=>{events.push({type:'cards',items,options});return items;};
  w.eval(['titleKey','discoverRecommendationRequest','discoverExcludedTitles','discoverAnswerContainsExcludedTitle','discoverRecommendationSummary','prepareDiscoverRecommendations','releaseDiscoverClaims','loadThreads','saveThreads','persistCurrentThread','appendUserBubble','appendAssistantBubble','runAskAndRender','askAndRender'].map(functionSource).join('\n'));
  for(const name of ['startNewChat','openThread','deleteThread']){
    const start=source.indexOf('window.'+name+' = function'),end=source.indexOf('\n};',start)+3;
    w.eval(source.slice(start,end));
  }
  return {dom,w,events};
}

for(const change of ['new conversation','open another conversation','delete this conversation']){
  test('delayed AI response cannot reveal, debit or persist after '+change,async()=>{
    const {dom,w,events}=await boot(),reply=deferred();let requested=false;
    try{
      w.askAIConversational=()=>{requested=true;return reply.promise;};
      const run=w.askAndRender('Recommend a movie',{voiceOrigin:true});
      await until(()=>requested);
      const original=w.currentThread.id;
      if(change==='open another conversation'){
        w.saveThreads([{id:'other',title:'Other conversation',turns:[{role:'user',text:'Existing question'}]}]);
        w.openThread('other');
      }else if(change==='delete this conversation'){
        w.persistCurrentThread();w.deleteThread(original);
      }else w.startNewChat();
      reply.resolve({answer:'Try Delayed Film.',results:[film('Delayed Film',700)],_live:true});
      await run;
      assert.equal(events.filter(event=>['debit','voice','cards'].includes(event.type)).length,0);
      assert.equal(w.document.querySelectorAll('.chat-assistant').length,0);
      assert(!w.localStorage.getItem('match_chatThreads')?.includes('Delayed Film'));
      assert.equal(w.currentThread?.id,change==='open another conversation'?'other':undefined);
      if(change==='delete this conversation')assert(!w.loadThreads().some(thread=>thread.id===original));
    }finally{dom.window.close();}
  });
}

test('a canceled response releases its own pending reservation before any debit or narration',async()=>{
  const {dom,w,events}=await boot(),claimReply=deferred(),item=film('Reserved then canceled',701);
  let claimed=false;
  try{
    const policy=w.matchPolicy;
    w.matchPolicy={...policy,claim:async row=>{const won=await policy.claim(row);claimed=won;return claimReply.promise;}};
    w.askAIConversational=async()=>({answer:'Try Reserved then canceled.',results:[item],_live:true});
    const run=w.askAndRender('Recommend a movie',{voiceOrigin:true});
    await until(()=>claimed);
    assert.equal(policy.excludes(item),true);
    w.startNewChat();claimReply.resolve(true);await run;
    assert.equal(policy.excludes(item),false,'an unshown reservation from this page is released');
    assert.equal(events.length,0);
  }finally{dom.window.close();}
});

test('whole local history guards prose beyond the bounded AI prompt, and a claim precedes credit and voice',async()=>{
  const {dom,w,events}=await boot(),fresh=film('Fresh Verified Film',702);
  try{
    const rows=Array.from({length:170},(_,i)=>({title:'Previously saved title '+i}));
    rows.push({title:'Hidden Repeat Beyond Prompt'});
    w.localStorage.setItem('match_savedList',JSON.stringify(rows));
    assert.equal(w.discoverExcludedTitles().includes('Hidden Repeat Beyond Prompt'),false);
    const policy=w.matchPolicy;
    w.matchPolicy={...policy,claim:async row=>{events.push({type:'claim',title:row.title});return policy.claim(row);}};
    w.askAIConversational=async()=>({answer:'Try Hidden Repeat Beyond Prompt or Fresh Verified Film.',results:[fresh],_live:true});
    await w.askAndRender('Recommend a movie',{voiceOrigin:true});
    const voice=events.find(event=>event.type==='voice')?.text;
    assert(voice.includes('Fresh Verified Film'));assert(!voice.includes('Hidden Repeat Beyond Prompt'));
    assert.equal(w.document.querySelector('.chat-answer-text').textContent,voice);
    assert.equal(w.currentThread.turns.at(-1).text,voice);
    assert(events.findIndex(e=>e.type==='claim')<events.findIndex(e=>e.type==='debit'));
    assert(events.findIndex(e=>e.type==='debit')<events.findIndex(e=>e.type==='voice'));
    assert.equal(w.matchPolicy.history().find(row=>row.title===fresh.title)?.action,'ai');
  }finally{dom.window.close();}
});

test('a remote claim collision removes rejected titles from speech and spends no film recommendation credit',async()=>{
  const {dom,w,events}=await boot();
  try{
    w.matchPolicy={...w.matchPolicy,claim:async()=>false};
    w.askAIConversational=async()=>({answer:'Try Remote Winner Film.',results:[film('Remote Winner Film',703)],_live:true});
    await w.askAndRender('Recommend a movie',{voiceOrigin:true});
    assert.equal(events.some(event=>event.type==='debit'),false);
    assert.equal(events.some(event=>event.type==='cards'),false);
    const voice=events.find(event=>event.type==='voice')?.text;
    assert(voice);assert(!voice.includes('Remote Winner Film'));
    assert.equal(w.currentThread.turns.at(-1).results.length,0);
  }finally{dom.window.close();}
});

test('reading preparation precedes the AI call and only accepted source cards enter transcript and narration',async()=>{
  const {dom,w,events}=await boot();
  try{
    w.MatchAppReadingAI={
      prepare:async()=>{events.push({type:'reading-ready'});return true;},
      excludedTitles:()=>[],
      renderFresh:async(_question,host,{current})=>{
        assert(current());events.push({type:'reading-cards'});
        const card=w.document.createElement('article');card.className='reading-ai-card';card.innerHTML='<h4>Accepted Source Book</h4>';host.append(card);return 1;
      }
    };
    w.askAIConversational=async()=>{events.push({type:'provider'});return {answer:'Try Remote Rejected Book or Accepted Source Book.',results:[],_live:true};};
    await w.askAndRender('Recommend a book',{voiceOrigin:true});
    const voice=events.find(event=>event.type==='voice')?.text;
    assert(voice.includes('Accepted Source Book'));assert(!voice.includes('Remote Rejected Book'));
    assert.equal(w.document.querySelector('.chat-answer-text').textContent,voice);
    assert.equal(w.currentThread.turns.at(-1).text,voice);
    assert(events.findIndex(e=>e.type==='reading-ready')<events.findIndex(e=>e.type==='provider'));
    assert.equal(events.filter(e=>e.type==='debit').length,1,'the successful Ask reply retains its original allowance semantics');
    w.document.querySelector('.discover-speak').click();assert.equal(events.at(-1).text,voice,'manual playback uses the corrected answer too');
  }finally{dom.window.close();}
});

test('explicit factual movie and book questions preserve source lookup without making a fresh claim',async()=>{
  for(const reading of [false,true]){
    const {dom,w,events}=await boot();
    try{
      const item=film('Known Source Title',704);w.matchPolicy.savePreference(item,'save');
      w.matchPolicy={...w.matchPolicy,claim:async()=>{assert.fail('explicit source lookup must not reserve another recommendation');}};
      if(reading)w.MatchAppReadingAI={render:(_question,_host,options)=>events.push({type:'reading-source',options})};
      w.askAIConversational=async()=>({answer:'The original source explains Known Source Title.',results:reading?[]:[item],_live:true});
      await w.askAndRender(reading?'Tell me about the book Known Source Title':'Who directed the movie Known Source Title?',{voiceOrigin:true});
      assert.equal(events.find(e=>e.type==='voice').text,'The original source explains Known Source Title.');
      assert.equal(events.find(e=>e.type===(reading?'reading-source':'cards')).options.allowKnown,true);
    }finally{dom.window.close();}
  }
});

test('automatically appended related cards wait for and respect an atomic claim rejection',async()=>{
  const {dom,w}=await boot(),claimReply=deferred();let requested=false;
  try{
    w.DISCOVER_ITEMS=[film('Seed Film',710)];
    w.matchPolicy={...w.matchPolicy,fitsQuestion:()=>true,sameFamily:()=>true,claim:()=>{requested=true;return claimReply.promise;}};
    w.catalogCousins=()=>[film('Related Remote Winner',711)];w.localizeRelatedItem=async()=>{};
    w.discoverLabel=(_key,text)=>text;w.discoverCardHTML=()=>'<article class="discover-card">Related Remote Winner</article>';
    w.discoverPosterUrl=()=>'';w.discoverFallbackPoster=()=>'';w.discoverWatchUrl=()=>'';w.hydrateDiscoverCard=async()=>{};
    w.eval(functionSource('attachRelated'));
    const grid=w.document.createElement('div');w.document.body.append(grid);
    const run=w.attachRelated(grid,w.DISCOVER_ITEMS,0);await until(()=>requested);
    assert.equal(grid.children.length,0,'related headings and cards must not preview unreserved titles');
    claimReply.resolve(false);await run;
    assert.equal(grid.children.length,0);assert.equal(w.DISCOVER_ITEMS.length,1);
    assert.equal(w.matchPolicy.history().length,0);
  }finally{dom.window.close();}
});
