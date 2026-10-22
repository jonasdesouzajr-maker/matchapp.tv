'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
// The same behavioral test runs from this isolated review bundle or, after
// promotion, directly from the repository's tests directory.
const isolated=fs.existsSync(path.join(root,'candidate','app.js'));
const sourceRoot=isolated?path.join(root,process.env.MATCHAPP_READINESS_SOURCE||'candidate'):root;
const fixtureRoot=isolated?path.join(root,'baseline'):root;
const app=fs.readFileSync(path.join(sourceRoot,'app.js'),'utf8');
const policy=fs.readFileSync(path.join(fixtureRoot,'matching-policy.js'),'utf8');
const profile=fs.readFileSync(path.join(sourceRoot,'profile.js'),'utf8');
const source=(text,start,end)=>{const a=text.indexOf(start),b=text.indexOf(end,a);assert(a>=0&&b>a,'source extraction markers');return text.slice(a,b);};
const sessionHelper=source(app,'let compactSessionFlight','async function checkDailyLimit');
const hydration=source(app,'const REQUIRED_PROFILE_FIELDS =','// Non-blocking nudge');
const subscription=source(app,'let profileAuthEvent = 0;','// AI MATCH EXECUTION');
const manualRetry=source(profile,'window.retryLockedProfile =',"document.addEventListener('matchapp:langchange'");
const profileUI=source(profile,"document.addEventListener('DOMContentLoaded', () => {",'window.retryLockedProfile =');

function makeDeferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
const user=id=>({id,user_metadata:{}});
const session=id=>({access_token:'compact',user:user(id)});
const result=id=>({data:{session:session(id)}});

function harness(getSession,options={}){
  let now=0,nextTimer=0,callback;
  const timers=new Map(),listeners=new Map(),storage=new Map(),warnings=[],errors=[],states=[];
  const calls={session:0,refresh:0,profile:0,grants:0,quota:0,cloudReads:0,cloudWrites:0};
  const alice=Array.from({length:139},(_,i)=>({title:'Saved work '+i,action:'shown',addedAt:i+1}));
  const bob=[{title:'Bob only',action:'shown',addedAt:1}];
  storage.set('match_portfolio_owner','alice');
  storage.set('match_history_alice',JSON.stringify(alice));
  storage.set('match_history_bob',JSON.stringify(bob));
  storage.set('account-test-sentinel','unchanged');
  let visible=['Saved work 0'];
  const retryButton=new EventTarget(),identityNotice={hidden:true,textContent:''};
  Object.assign(retryButton,{hidden:true,textContent:'',click(){this.dispatchEvent(new Event('click'));}});
  const document={
    hidden:false,
    getElementById(id){return options.ui?(id==='identity-load-retry'?retryButton:id==='identity-load-status'?identityNotice:null):null;},
    querySelectorAll(){return [];},
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
    dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn(event);return true;}
  };
  const w={
    document,
    console:{warn:(...args)=>warnings.push(args),log(){},error:(...args)=>errors.push(args)},
    localStorage:{getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
    sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    CustomEvent:class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}},
    setTimeout(fn,delay=0){const id=++nextTimer;timers.set(id,{fn,at:now+Math.max(0,Number(delay)||0)});return id;},
    clearTimeout(id){timers.delete(id);},
    addEventListener(){},
    location:{pathname:'/profile/profile.html'},
    checkAndRenderProfileState(){states.push({...w.matchProfileState});},
    renderProfileGrids(){},
    refreshQuotaStatus(){calls.quota++;},
    claimRegistrationWelcomeBonus(){calls.grants++;return Promise.resolve();},
    promptProfileCompletion(){},
    URL,URLSearchParams
  };
  w.window=w;
  w.supabaseClient={
    auth:{
      getSession(){calls.session++;return getSession(calls.session);},
      refreshSession(){calls.refresh++;return options.refreshSession?options.refreshSession():Promise.reject(new Error('unexpected refresh'));},
      onAuthStateChange(fn){callback=fn;return {data:{subscription:{unsubscribe(){}}}};}
    },
    from(name){
      assert.equal(name,'profiles');
      return {select(){
        return {eq(_field,id){
          return {maybeSingle(){
            calls.profile++;
            if(options.profileRead)return options.profileRead(id,calls.profile);
            return Promise.resolve({data:{profile_locked:true,full_name:'Saved name',country:'Brazil',dob:'10/09/1990',star_sign:'Virgo',age:36}});
          }};
        }};
      }};
    },
    rpc(name,args){
      assert.equal(name,'portfolio_action');
      if(args.p_action==='list'){calls.cloudReads++;return Promise.resolve({data:{keys:[],history:[]}});}
      calls.cloudWrites++;return Promise.reject(new Error('Readiness fixture must not mutate the backend'));
    }
  };
  const context=vm.createContext(w);
  vm.runInContext('var supabaseClient=window.supabaseClient,isUserLoggedIn=false,seenList=[],savedList=[],dislikedList=[],userRatings={},titleNotes={},recentTitles=[];var SESSION_SHOWN=new Set();',context);
  vm.runInContext(policy,context,{filename:'matching-policy.js'});
  // Observe the same history source used by the real portfolio renderer, with
  // one existing Activity title. This harness tests readiness, not DOM styling.
  document.addEventListener('matchapp:historychange',()=>{
    visible=[...new Set([...w.matchPolicy.history().map(row=>row.title),'Saved work 0'])];
  });
  vm.runInContext(sessionHelper+hydration+subscription,context,{filename:'app-profile-readiness.js'});
  vm.runInContext(manualRetry,context,{filename:'profile-retry.js'});
  if(options.ui){
    vm.runInContext(profileUI,context,{filename:'profile-startup-ui.js'});
    document.dispatchEvent(new w.CustomEvent('DOMContentLoaded'));
  }
  async function drain(){for(let i=0;i<35;i++)await Promise.resolve();}
  async function advance(milliseconds){
    const end=now+milliseconds;
    await drain();
    let iterations=0;
    for(;;){
      const next=[...timers].filter(([,value])=>value.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
      if(!next)break;
      assert(++iterations<100,'timer queue must be bounded');
      const [id,item]=next;timers.delete(id);now=item.at;
      try{Promise.resolve(item.fn()).catch(error=>errors.push(error));}catch(error){errors.push(error);}
      await drain();
    }
    now=end;await drain();
  }
  return {w,calls,storage,states,warnings,errors,advance,retryButton,identityNotice,visible:()=>visible,
    emit(event,id){return callback(event,id?session(id):null);},
    assertSafe(){
      assert.equal(storage.get('account-test-sentinel'),'unchanged');
      assert.equal(JSON.parse(storage.get('match_history_alice')).length,139);
      assert.equal(calls.cloudWrites,0);
      assert.deepEqual(errors,[]);
    }};
}

test('normal restored Profile defers auth work and attaches all existing account history once',async()=>{
  const h=harness(()=>Promise.resolve(result('alice')));
  assert.equal(h.emit('INITIAL_SESSION','alice'),undefined);
  assert.equal(h.calls.session,0,'callback must return before SDK work');
  await h.advance(0);
  assert.equal(h.calls.session,1);assert.equal(h.calls.profile,1);
  assert.equal(h.visible().length,139);assert.equal(h.w.matchProfileState.status,'ready');
  await h.advance(60000);assert.equal(h.calls.session,1);
  h.assertSafe();
});

test('a settled initial session failure recovers History once without Home navigation',async()=>{
  const h=harness(n=>n===1?Promise.reject(new Error('temporary read failure')):Promise.resolve(result('alice')));
  h.emit('INITIAL_SESSION','alice');await h.advance(0);
  assert.equal(h.visible().length,1);assert.equal(h.calls.profile,0);
  await h.advance(999);assert.equal(h.calls.session,1);
  await h.advance(1);
  assert.equal(h.visible().length,139);
  assert.equal(h.w.matchProfileState.status,'ready');
  assert.deepEqual(h.calls,{session:2,refresh:0,profile:1,grants:1,quota:1,cloudReads:1,cloudWrites:0});
  await h.advance(60000);assert.equal(h.calls.session,2);
  h.assertSafe();
});

test('two settled failures stop automatically and expose the existing recoverable error state',async()=>{
  const h=harness(()=>Promise.reject(new Error('offline')));
  h.emit('INITIAL_SESSION','alice');await h.advance(60000);
  assert.equal(h.w.matchProfileState.status,'error');
  assert.equal(h.calls.session,2);
  assert.equal(h.calls.profile,0);assert.equal(h.calls.grants,0);assert.equal(h.calls.quota,0);
  assert.equal(h.w.matchProfileState.userId,'alice');
  assert.equal(h.visible().length,1);
  h.assertSafe();
});

test('an unresolved session read never starts queued retries and can still finish normally',async()=>{
  const pending=makeDeferred(),h=harness(()=>pending.promise);
  h.emit('INITIAL_SESSION','alice');await h.advance(60000);
  assert.equal(h.calls.session,1);assert.equal(h.calls.profile,0);assert.equal(h.visible().length,1);
  pending.resolve(result('alice'));await h.advance(0);
  assert.equal(h.calls.session,1);assert.equal(h.visible().length,139);
  assert.equal(h.w.matchProfileState.status,'ready');
  h.assertSafe();
});

test('a newer account event cancels an older scheduled recovery before it reads session',async()=>{
  const h=harness(n=>n===1?Promise.reject(new Error('temporary read failure')):Promise.resolve(result('bob')));
  h.emit('INITIAL_SESSION','alice');await h.advance(0);
  h.emit('SIGNED_IN','bob');await h.advance(0);
  assert.equal(h.w.matchProfileState.userId,'bob');
  assert.equal(h.w.matchProfileState.status,'ready');
  assert.deepEqual(Array.from(h.w.matchPolicy.history(),row=>row.title),['Bob only']);
  await h.advance(60000);assert.equal(h.calls.session,2);
  assert.equal(h.storage.get('match_portfolio_owner'),'bob');
  h.assertSafe();
});

test('a late failure from an old account cannot replace the newer account ready state',async()=>{
  const old=makeDeferred(),h=harness(n=>n===1?old.promise:Promise.resolve(result('bob')));
  h.emit('INITIAL_SESSION','alice');await h.advance(0);
  h.emit('SIGNED_IN','bob');await h.advance(0);
  old.reject(new Error('late old-account failure'));await h.advance(60000);
  assert.equal(h.calls.session,2);assert.equal(h.w.matchProfileState.status,'ready');
  assert.equal(h.w.matchProfileState.userId,'bob');
  assert.deepEqual(Array.from(h.w.matchPolicy.history(),row=>row.title),['Bob only']);
  h.assertSafe();
});

test('sign-out invalidates scheduled recovery without reattaching cached account records',async()=>{
  const h=harness(()=>Promise.reject(new Error('temporary read failure')));
  h.emit('INITIAL_SESSION','alice');await h.advance(0);
  h.emit('SIGNED_OUT',null);await h.advance(60000);
  assert.equal(h.calls.session,1);assert.equal(h.w.matchProfileState.status,'signedout');
  assert.equal(h.w.isUserLoggedIn,false);
  assert.equal(h.w.matchPolicy.history().length,0);
  h.assertSafe();
});

test('startup recovery preserves the existing oversized-token refresh backoff',async()=>{
  const oversized={data:{session:{access_token:'x'.repeat(8001),user:user('alice')}}};
  const h=harness(()=>Promise.resolve(oversized),{refreshSession:()=>Promise.reject(new Error('refresh unavailable'))});
  h.emit('INITIAL_SESSION','alice');await h.advance(60000);
  assert.equal(h.w.matchProfileState.status,'error');
  assert.equal(h.calls.session,2);assert.equal(h.calls.refresh,1);
  assert.equal(h.calls.profile,0);assert.equal(h.calls.grants,0);
  h.assertSafe();
});

test('explicit Retry uses the same session preflight and recovers saved History after automatic exhaustion',async()=>{
  const h=harness(n=>n<=2?Promise.reject(new Error('offline')):Promise.resolve(result('alice')));
  h.emit('INITIAL_SESSION','alice');await h.advance(1000);
  assert.equal(h.w.matchProfileState.status,'error');
  await h.w.retryLockedProfile();await h.advance(0);
  assert.equal(h.visible().length,139);
  assert.equal(h.w.matchProfileState.status,'ready');
  assert.equal(h.calls.session,3);assert.equal(h.calls.profile,1);
  assert.equal(h.calls.grants,0);assert.equal(h.calls.quota,0);
  h.assertSafe();
});

test('the visible Retry button click recovers saved History through its real startup binding',async()=>{
  const h=harness(n=>n<=2?Promise.reject(new Error('offline')):Promise.resolve(result('alice')),{ui:true});
  h.emit('INITIAL_SESSION','alice');await h.advance(1000);
  assert.equal(h.w.matchProfileState.status,'error');
  assert.equal(h.retryButton.hidden,false);
  assert.equal(h.retryButton.textContent,'Try again');
  assert.equal(h.identityNotice.hidden,false);
  assert.equal(h.calls.session,2);
  h.retryButton.click();await h.advance(0);
  assert.equal(h.calls.session,3,'one click starts one compact-session preflight');
  assert.equal(h.calls.profile,1);
  assert.equal(h.visible().length,139);
  assert.equal(h.w.matchProfileState.status,'ready');
  assert.equal(h.retryButton.hidden,true);
  assert.equal(h.identityNotice.hidden,true);
  assert.equal(h.calls.grants,0);assert.equal(h.calls.quota,0);
  h.assertSafe();
});

test('sign-out during explicit Retry ignores its late old-account session',async()=>{
  const old=makeDeferred(),h=harness(()=>old.promise);
  h.w.matchProfileState={status:'error',userId:'alice'};
  h.w.isUserLoggedIn=true;
  const retry=h.w.retryLockedProfile();await h.advance(0);
  h.emit('SIGNED_OUT',null);await h.advance(0);
  old.resolve(result('alice'));await retry;await h.advance(0);
  assert.equal(h.w.matchProfileState.status,'signedout');
  assert.equal(h.w.isUserLoggedIn,false);
  assert.equal(h.calls.profile,0);
  assert.equal(h.w.matchPolicy.history().length,0);
  h.assertSafe();
});

test('a late explicit-Retry failure cannot overwrite a newer account ready state',async()=>{
  const old=makeDeferred(),h=harness(n=>n===1?old.promise:Promise.resolve(result('bob')));
  h.w.matchProfileState={status:'error',userId:'alice'};
  h.w.isUserLoggedIn=true;
  const retry=h.w.retryLockedProfile();await h.advance(0);
  h.emit('SIGNED_IN','bob');await h.advance(0);
  old.reject(new Error('late retry failure'));await retry;await h.advance(0);
  assert.equal(h.w.matchProfileState.status,'ready');
  assert.equal(h.w.matchProfileState.userId,'bob');
  assert.deepEqual(Array.from(h.w.matchPolicy.history(),row=>row.title),['Bob only']);
  assert.equal(h.calls.profile,1);
  h.assertSafe();
});

test('a newer auth event invalidates an older profile read before its own preflight finishes',async()=>{
  const oldProfile=makeDeferred(),newSession=makeDeferred();
  const h=harness(n=>n===1?Promise.resolve(result('alice')):newSession.promise,{
    profileRead:id=>id==='alice'?oldProfile.promise:Promise.resolve({data:{profile_locked:true,full_name:'Bob saved name'}})
  });
  h.emit('INITIAL_SESSION','alice');await h.advance(0);
  assert.equal(h.calls.profile,1);
  h.emit('SIGNED_IN','bob');await h.advance(0);
  oldProfile.resolve({data:{profile_locked:true,full_name:'Stale Alice result'}});
  await h.advance(0);
  assert.equal(h.w.matchProfileState.userId,'bob');
  assert.equal(h.w.matchProfileState.status,'loading');
  assert.notEqual(h.storage.get('match_user_name'),'Stale Alice result');
  newSession.resolve(result('bob'));await h.advance(0);
  assert.equal(h.w.matchProfileState.userId,'bob');
  assert.equal(h.w.matchProfileState.status,'ready');
  assert.equal(h.storage.get('match_user_name'),'Bob saved name');
  assert.deepEqual(Array.from(h.w.matchPolicy.history(),row=>row.title),['Bob only']);
  h.assertSafe();
});
