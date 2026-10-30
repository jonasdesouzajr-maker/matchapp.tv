'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const {installGuestReservations}=require('./helpers/guest-reservations.cjs');
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
  installGuestReservations(w);
  w.MATCH_LANG='en';w.t=()=>'';w.matchMedia=()=>({matches:false});
  w.eval('var currentThread=null,discoverThreadVersion=0,DISCOVER_ITEMS=[],lastDiscoverQuestion="",askInFlight=null,CHAT_STORE_KEY="match_chatThreads",CHAT_MAX_THREADS=20,CONTENT_CATALOG=[];');
  w.eval(read('matching-policy.js'));await w.matchPolicy.ready();
  w.matchAllowanceBeforeLookup=async()=>true;
  w.checkDailyLimit=async()=>{events.push({type:'debit'});return true;};
  w.refreshAiWorkspaceStatus=()=>{};w.renderThreadList=()=>{};
  w.autoGrowComposer=()=>{};
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
  w.eval(['discoverRecoveryText','titleKey','discoverRecommendationRequest','discoverExcludedTitles','discoverAnswerContainsExcludedTitle','discoverRecommendationSummary','prepareDiscoverRecommendations','releaseDiscoverClaims','loadThreads','saveThreads','persistCurrentThread','appendUserBubble','appendAssistantBubble','runAskAndRender','askAndRender'].map(functionSource).join('\n'));
  for(const name of ['startNewChat','openThread','deleteThread','newDiscoverSearch']){
    const start=source.indexOf('window.'+name+' = function'),end=source.indexOf('\n};',start)+3;
    w.eval(source.slice(start,end));
  }
  return {dom,w,events};
}

for(const allowed of [false,true])test('Send recovers only denied allowance; allowed='+allowed,async()=>{
  const {dom,w,events}=await boot(),allowance=deferred();
  try{
    const input=w.document.getElementById('discover-new-input');
    input.value='Who directed Interstellar?';
    w.matchAllowanceBeforeLookup=()=>allowance.promise;
    let lookups=0;
    w.askAIConversational=async()=>{lookups++;return {answer:'Christopher Nolan.',results:[],_live:true};};
    assert.equal(w.newDiscoverSearch(),true);
    await Promise.resolve();
    assert.equal(input.value,'','submitted composer collapses while verification is pending');
    const pending=w.askInFlight;
    allowance.resolve(allowed);await pending;
    assert.equal(input.value,allowed?'':'Who directed Interstellar?');
    assert.equal(lookups,allowed?1:0);
    assert.equal(events.filter(e=>e.type==='debit').length,allowed?1:0);
  }finally{dom.window.close();}
});

for(const nextDraft of ['My next question','First question'])test('a successful allowance check preserves a newer composer draft: '+nextDraft,async()=>{
  const {dom,w}=await boot(),allowance=deferred();
  try{
    const input=w.document.getElementById('discover-new-input');
    input.value='First question';w.matchAllowanceBeforeLookup=()=>allowance.promise;
    w.askAIConversational=async()=>({answer:'Verified answer.',results:[],_live:true});
    const pending=w.askAndRender('First question');await Promise.resolve();
    input.value=nextDraft;allowance.resolve(true);await pending;
    assert.equal(input.value,nextDraft);
  }finally{dom.window.close();}
});

// These fixtures exercise Send plus the real serial queue; only allowance and
// provider results are controlled. Failed verification must not reach debit.
for(const outcome of ['denied','allowed','interrupted'])test('pending '+outcome+' verification preserves a newer unsent draft',async()=>{
  const {dom,w,events}=await boot(),gate=deferred();let calls=0;
  try{
    const input=w.document.getElementById('discover-new-input');
    w.matchAllowanceBeforeLookup=()=>gate.promise;
    w.askAIConversational=async()=>{calls++;return {answer:'Fixture answer.',results:[],_live:true};};
    input.value='Who directed Interstellar?';w.newDiscoverSearch();await Promise.resolve();
    const pending=w.askInFlight;input.value='My newer unsent question';
    if(outcome==='interrupted')gate.reject(new Error('Fixture verification interruption'));else gate.resolve(outcome==='allowed');
    await pending;
    assert.equal(input.value,'My newer unsent question');
    assert.equal(calls,outcome==='allowed'?1:0);
    assert.equal(events.filter(e=>e.type==='debit').length,calls);
    assert.equal(w.askInFlight,null);
  }finally{dom.window.close();}
});

for(const change of ['new conversation','open another conversation','delete this conversation','language']){
  for(const outcome of ['denied','allowed','interrupted'])test(outcome+' allowance cannot restore or submit a draft after '+change,async()=>{
    const {dom,w,events}=await boot(),gate=deferred();
    try{
      w.currentThread={id:'original',title:'Original',turns:[{role:'user',text:'Prior question'}]};w.persistCurrentThread();
      const input=w.document.getElementById('discover-new-input');
      w.matchAllowanceBeforeLookup=()=>gate.promise;
      w.askAIConversational=async()=>assert.fail('canceled allowance must not reach the provider');
      input.value='Who directed Interstellar?';w.newDiscoverSearch();await Promise.resolve();const pending=w.askInFlight;
      if(change==='open another conversation'){
        w.saveThreads([...w.loadThreads(),{id:'other',title:'Other',turns:[]}]);w.openThread('other');
      }else if(change==='delete this conversation')w.deleteThread('original');
      else if(change==='language')w.MATCH_LANG='pt-BR';
      else w.startNewChat();
      if(outcome==='interrupted')gate.reject(new Error('Fixture interruption'));else gate.resolve(outcome==='allowed');
      await pending;
      assert.equal(input.value,'');assert.equal(events.length,0);
      assert.equal(w.document.querySelectorAll('.chat-assistant').length,0);
      assert(!w.loadThreads().some(t=>t.turns.some(turn=>turn.text==='Who directed Interstellar?')));
      assert.equal(w.askInFlight,null);
    }finally{dom.window.close();}
  });
}

for(const change of ['conversation','language'])test('same-tick '+change+' replacement cancels active and queued submissions before verification',async()=>{
  const {dom,w,events}=await boot();
  try{
    const input=w.document.getElementById('discover-new-input');
    w.matchAllowanceBeforeLookup=async()=>assert.fail('superseded submission must not verify');
    input.value='Who directed Interstellar?';w.newDiscoverSearch();const first=w.askInFlight;
    const queued=w.askAndRender('What year was it released?');
    if(change==='conversation')w.startNewChat();else w.MATCH_LANG='pt-BR';
    await Promise.all([first,queued]);
    assert.equal(input.value,'');assert.equal(events.length,0);assert.equal(w.currentThread,null);assert.equal(w.askInFlight,null);
  }finally{dom.window.close();}
});

for(const firstAllowed of [false,true])for(const secondAllowed of [false,true]){
  test('queued duplicate sends retain recovery and debit semantics: '+firstAllowed+'/'+secondAllowed,async()=>{
    const {dom,w,events}=await boot(),firstGate=deferred(),secondGate=deferred();let checks=0;const calls=[];
    try{
      const input=w.document.getElementById('discover-new-input');
      w.matchAllowanceBeforeLookup=()=>++checks===1?firstGate.promise:secondGate.promise;
      w.askAIConversational=async q=>{calls.push(q);return {answer:'Fixture answer.',results:[],_live:true};};
      const firstQuestion='Who directed Interstellar?',secondQuestion='What year was it released?';
      input.value=firstQuestion;w.newDiscoverSearch();await Promise.resolve();const first=w.askInFlight;
      assert.equal(w.askAndRender(firstQuestion),first,'active duplicates share the original verification');
      input.value=secondQuestion;w.newDiscoverSearch();
      const second=w.askAndRender(secondQuestion),duplicate=w.askAndRender(secondQuestion);
      firstGate.resolve(firstAllowed);await until(()=>checks===2);
      secondGate.resolve(secondAllowed);await Promise.all([first,second,duplicate]);
      assert.equal(checks,2);assert.deepEqual(calls,[...(firstAllowed?[firstQuestion]:[]),...(secondAllowed?[secondQuestion]:[])]);
      assert.equal(events.filter(e=>e.type==='debit').length,Number(firstAllowed)+Number(secondAllowed));
      assert.equal(input.value,firstAllowed?(secondAllowed?'':secondQuestion):firstQuestion,'an earlier recovered draft remains owned by the composer');
      assert.equal(w.askInFlight,null);
    }finally{dom.window.close();}
  });
}

for(const allowed of [false,true])test('queued Send preserves an unsent identical draft before and after its allowance: '+allowed,async()=>{
  const {dom,w,events}=await boot(),firstGate=deferred(),secondGate=deferred();let checks=0,calls=0;
  try{
    const input=w.document.getElementById('discover-new-input'),question='Who wrote Interstellar?';
    w.matchAllowanceBeforeLookup=()=>++checks===1?firstGate.promise:secondGate.promise;
    w.askAIConversational=async()=>{calls++;return {answer:'Fixture answer.',results:[],_live:true};};
    input.value='Who directed Interstellar?';w.newDiscoverSearch();await until(()=>checks===1);
    input.value=question;w.newDiscoverSearch();assert.equal(input.value,'');
    input.value=question; // New unsent draft while this identical question is queued.
    firstGate.resolve(true);await until(()=>checks===2);const second=w.askInFlight;
    assert.equal(input.value,question,'dequeue must not consume a draft typed after Send');
    secondGate.resolve(allowed);await second;
    assert.equal(input.value,question);assert.equal(calls,1+Number(allowed));
    assert.equal(events.filter(e=>e.type==='debit').length,calls);assert.equal(w.askInFlight,null);
  }finally{firstGate.resolve(false);secondGate.resolve(false);dom.window.close();}
});

test('a queued greeting preserves a later draft and retains its no-credit response',async()=>{
  const {dom,w,events}=await boot(),gate=deferred();let checks=0;
  try{
    const input=w.document.getElementById('discover-new-input');
    w.matchAllowanceBeforeLookup=()=>{checks++;return gate.promise;};
    w.askAIConversational=async()=>({answer:'Fixture answer.',results:[],_live:true});
    input.value='Who directed Interstellar?';w.newDiscoverSearch();await until(()=>checks===1);
    input.value='Hello';w.newDiscoverSearch();const queued=w.askAndRender('Hello');
    input.value='My later draft';gate.resolve(true);await queued;
    assert.equal(input.value,'My later draft');assert.equal(checks,1);
    assert.equal(events.filter(e=>e.type==='debit').length,1);
    assert.equal(w.currentThread.turns.at(-2).text,'Hello');assert.match(w.currentThread.turns.at(-1).text,/Jonas/);
  }finally{gate.resolve(false);dom.window.close();}
});

test('interrupted and denied verification repeatedly recover; a retry can complete exactly once',async()=>{
  const {dom,w,events}=await boot();let attempts=0,calls=0;
  try{
    const input=w.document.getElementById('discover-new-input'),question='Who directed Interstellar?';
    w.matchAllowanceBeforeLookup=async()=>{attempts++;if(attempts===1)throw new Error('Fixture interruption');return attempts===3;};
    w.askAIConversational=async()=>{calls++;return {answer:'Christopher Nolan.',results:[],_live:true};};
    input.value=question;
    for(let attempt=1;attempt<=3;attempt++){
      assert.equal(w.newDiscoverSearch(),true);const pending=w.askInFlight;
      assert.equal(w.askAndRender(question),pending);await pending;
      assert.equal(input.value,attempt===3?'':question);assert.equal(w.askInFlight,null);
    }
    assert.equal(attempts,3);assert.equal(calls,1);assert.equal(events.filter(e=>e.type==='debit').length,1);
    assert.equal(w.currentThread.turns.length,2);
  }finally{dom.window.close();}
});

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

// Reproduce the live EN/PT request using the actual client request builder and
// response parser. Only the external provider transport is a deterministic
// fixture; classification, preference guard, transcript, credit and voice owners run.
async function factualRequestFixture(language,payload){
  const f=await boot(),requests=[];
  f.w.MATCH_LANG=language;
  f.w.fetch=()=>{assert.fail('No external provider/catalog request is allowed in this regression');};
  f.w.eval(['mediaIntentQuestion','parseAIResponse','askAIConversational'].map(functionSource).join('\n'));
  f.w.supabaseClient={functions:{invoke:async(name,{body})=>{
    requests.push({name,body});
    return {data:{candidates:[{content:{parts:[{text:JSON.stringify(payload)}]}}]},error:null};
  }}};
  return {...f,requests};
}
const factualQuestions={
  en:'Who directed the 2001 animated film Spirited Away? Answer in English and preserve the director’s original name. Do not recommend other titles.',
  'pt-BR':'Quem dirigiu o filme de animação de 2001 Spirited Away (A Viagem de Chihiro)? Responda em português e preserve o nome original do diretor. Não recomende outros títulos.'
};

test('negated EN/PT suggestion clauses stay factual while positive and mixed recommendation requests retain precedence',async()=>{
  const {dom,w}=await boot();
  try{
    w.eval(functionSource('mediaIntentQuestion'));
    for(const question of[
      ...Object.values(factualQuestions),
      'Do not recommend other titles. Who directed Spirited Away?',
      'Who directed Spirited Away? Don’t suggest other titles.',
      'Who directed Spirited Away? Avoid recommending other films.',
      'Não recomende outros títulos; quem dirigiu Spirited Away?',
      'Quem dirigiu Spirited Away? Não me recomende outros filmes.',
      'Quem dirigiu Spirited Away? Nao sugira outros títulos.',
      'Quem dirigiu Spirited Away? Não indique outros filmes.',
      'Do not recommend other titles.',
      'Não recomende outros títulos.'
    ])assert.equal(w.discoverRecommendationRequest(question),false,question);
    for(const question of[
      'Who directed Spirited Away? Recommend another film by that director.',
      'Quem dirigiu Spirited Away? Recomende outro filme desse diretor.',
      'Who directed Spirited Away? Do not recommend horror, but suggest a comedy.',
      'Who directed Spirited Away? Do not recommend horror but suggest a comedy.',
      'Who directed Spirited Away? Do not recommend horror, suggest a comedy.',
      'Who directed Spirited Away? Do not recommend horror and recommend a comedy.',
      'Who directed Spirited Away? Do not recommend horror, but find me a comedy.',
      'Who directed Spirited Away? Do not recommend horror, what should I watch instead?',
      'Quem dirigiu Spirited Away? Não recomende terror, mas recomende uma comédia.',
      'Quem dirigiu Spirited Away? Não recomende terror e recomende uma comédia.',
      'Quem dirigiu Spirited Away? Não recomende terror, sugira uma comédia.',
      'Quem dirigiu Spirited Away? Não recomende terror, mas me indique uma comédia.',
      'Recommend another movie but do not recommend horror.',
      'Recomende outro filme, mas não recomende terror.'
    ])assert.equal(w.discoverRecommendationRequest(question),true,question);
  }finally{dom.window.close();}
});

for(const language of['en','pt-BR'])test(language+' factual prohibition retains the actual request, answer, known source, transcript, debit and speech semantics',async()=>{
  const answer=language==='pt-BR'?'Spirited Away (2001) foi dirigido por Hayao Miyazaki.':'Spirited Away (2001) was directed by Hayao Miyazaki.';
  const item=film('Spirited Away',129),{dom,w,events,requests}=await factualRequestFixture(language,{answer,results:[item]});
  try{
    w.matchPolicy.savePreference(item,'save');const saved=w.localStorage.getItem('match_savedList');
    w.matchPolicy={...w.matchPolicy,claim:async()=>{assert.fail('Factual reference must not reserve or reject a saved title');}};
    await w.askAndRender(factualQuestions[language],{voiceOrigin:true});
    assert.equal(requests.length,1);assert.equal(requests[0].name,'gemini-proxy');
    const body=requests[0].body;assert.equal(body.recommendationsOnly,false);assert.deepEqual(Array.from(body.excludedTitles),[]);assert.equal(body.lang,language);assert.equal(body.question.split('\n\n')[0],factualQuestions[language],'the actual question and its prohibition stay verbatim');
    assert.equal(w.document.querySelector('.chat-answer-text').textContent,answer);assert.equal(events.find(e=>e.type==='voice').text,answer);assert.equal(w.currentThread.turns.at(-1).text,answer);assert.equal(w.currentThread.turns.at(-1).results[0].title,'Spirited Away');
    assert.equal(events.find(e=>e.type==='cards').options.allowKnown,true);assert.equal(events.filter(e=>e.type==='debit').length,1,'one successful live factual answer retains its ordinary debit');assert.equal(w.localStorage.getItem('match_savedList'),saved);assert.equal(w.matchPolicy.excludes(item),true,'existing saved exclusion remains authoritative for future recommendations');
    assert.doesNotMatch(w.document.querySelector('.chat-answer-text').textContent,/No new titles|Não restaram títulos/);
  }finally{dom.window.close();}
});

for(const language of['en','pt-BR'])test(language+' positive request plus prohibition still applies no-repeat filtering before credit and voice',async()=>{
  const old=film('Spirited Away',129),fresh=film('Fresh Verified Film',799),{dom,w,events,requests}=await factualRequestFixture(language,{answer:'Try Spirited Away or Fresh Verified Film.',results:[old,fresh]});
  try{
    w.matchPolicy.savePreference(old,'save');const policy=w.matchPolicy;
    w.matchPolicy={...policy,claim:async item=>{events.push({type:'claim',title:item.title});return policy.claim(item);}};
    const question=language==='pt-BR'?'Recomende outro filme, mas não recomende terror.':'Recommend another movie but do not recommend horror.';
    await w.askAndRender(question,{voiceOrigin:true});
    assert.equal(requests.length,1);assert.equal(requests[0].body.recommendationsOnly,true);assert.ok(requests[0].body.excludedTitles.includes('Spirited Away'));assert.equal(requests[0].body.question.split('\n\n')[0],question);
    const voice=events.find(e=>e.type==='voice').text;assert.match(voice,/Fresh Verified Film/);assert.doesNotMatch(voice,/Spirited Away/);assert.equal(w.document.querySelector('.chat-answer-text').textContent,voice);assert.equal(w.currentThread.turns.at(-1).text,voice);
    assert.equal(events.filter(e=>e.type==='debit').length,1);assert.ok(events.findIndex(e=>e.type==='claim')<events.findIndex(e=>e.type==='debit'));assert.ok(events.findIndex(e=>e.type==='debit')<events.findIndex(e=>e.type==='voice'));assert.equal(w.matchPolicy.history().find(item=>item.title===fresh.title)?.action,'ai');
  }finally{dom.window.close();}
});

test('paid follow-up questions sent while the visible first reply finishes are processed in order with full history',async()=>{
  const {dom,w,events}=await boot(),presentation=deferred(),calls=[];let rendering=false,credits=6;
  try{
    w.matchAllowanceBeforeLookup=async()=>credits>0;
    w.checkDailyLimit=async()=>{assert(credits>0);credits--;events.push({type:'debit'});return true;};
    w.askAIConversational=async(question,history)=>{
      calls.push({question,history});return {answer:'Verified answer '+calls.length,results:calls.length===1?[film('First Source Title',950)]:[],_live:true};
    };
    w.renderResultsInto=async(_grid,items)=>{rendering=true;await presentation.promise;return items;};
    const first=w.askAndRender('Who directed First Source Title?',{voiceOrigin:true});
    await until(()=>rendering);
    assert.equal(w.document.querySelectorAll('.chat-assistant').length,1,'the answer is already visible while supplementary cards finish');
    const second=w.askAndRender('What year was it released?',{voiceOrigin:true});
    const third=w.askAndRender('Who wrote it?',{voiceOrigin:true});
    assert.equal(calls.length,1,'provider work remains serialized');
    presentation.resolve();await Promise.all([first,second,third]);
    assert.deepEqual(calls.map(row=>row.question),['Who directed First Source Title?','What year was it released?','Who wrote it?']);
    assert.equal(calls[1].history.length,2);assert.equal(calls[2].history.length,4);
    assert.equal(calls[2].history.at(-1).text,'Verified answer 2');
    assert.equal(w.document.querySelectorAll('.chat-assistant').length,3);assert.equal(w.currentThread.turns.length,6);
    assert.equal(events.filter(e=>e.type==='debit').length,3);assert.equal(credits,3,'one successful answer consumes one existing AI credit');
  }finally{presentation.resolve();dom.window.close();}
});
test('queued follow-ups cannot enter a replacement conversation',async()=>{
  const {dom,w,events}=await boot(),answer=deferred();let calls=0;
  try{
    w.askAIConversational=()=>{calls++;return answer.promise;};
    const first=w.askAndRender('Who directed First Source Title?');await until(()=>calls===1);
    const queued=w.askAndRender('What year was it released?');w.startNewChat();
    answer.resolve({answer:'Old answer',results:[],_live:true});await Promise.all([first,queued]);
    assert.equal(calls,1);assert.equal(events.filter(e=>e.type==='debit').length,0);assert.equal(w.currentThread,null);
  }finally{answer.resolve({answer:'Old answer',results:[],_live:true});dom.window.close();}
});
test('duplicate queued submissions share one answer and debit and language changes cancel old queued turns',async()=>{
  for(const changeLanguage of [false,true]){
    const {dom,w,events}=await boot(),answer=deferred();let calls=0;
    try{
      w.askAIConversational=()=>{calls++;return calls===1?answer.promise:Promise.resolve({answer:'Second answer',results:[],_live:true});};
      const first=w.askAndRender('Who directed First Source Title?');await until(()=>calls===1);
      const second=w.askAndRender('What year was it released?'),duplicate=w.askAndRender('What year was it released?');
      if(changeLanguage)w.MATCH_LANG='pt-BR';
      answer.resolve({answer:'First answer',results:[],_live:true});await Promise.all([first,second,duplicate]);
      assert.equal(calls,changeLanguage?1:2);assert.equal(events.filter(e=>e.type==='debit').length,changeLanguage?0:2);
      assert.equal(w.document.querySelectorAll('.chat-assistant').length,changeLanguage?1:2);
    }finally{answer.resolve({answer:'First answer',results:[],_live:true});dom.window.close();}
  }
});
