const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');

test('adult result invitation uses the original share button',()=>{
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/id="btn-share-match" onclick="openShareSheet\(\)"/);
  assert.equal((html.match(/id="btn-share-match"/g)||[]).length,1);
  const dom=new JSDOM('<button id="btn-share-match"></button><div class="match-fun-share__copy"><strong></strong><span></span></div>',{runScripts:'outside-only',url:'https://matchapp.tv/'});
  dom.window.eval(fs.readFileSync('match-fun-share.js','utf8'));
  assert.match(dom.window.document.querySelector('.match-fun-share__copy span').textContent,/3 different match results/);
  dom.window.close();
});

test('adult share design and promotion preserve homepage SEO',()=>{
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/name="description" content="[^"]*share a match with friends/);
  const js=fs.readFileSync('share.js','utf8');
  const sql=fs.readFileSync('supabase/migrations/20260928095000_three_match_shares_one_reward.sql','utf8');
  assert.match(js,/claim_match_result_share.*p_title: sharedTitle/);
  assert.match(js,/SHARE_TAGS = '#MatchAppAi #MatchAppTV/);
  assert.match(js,/Try it free: \$\{SHARE_URL\}/);
  assert.match(sql,/primary key \(user_id,title_key\)/);
  assert.match(sql,/if v_count % 3 <> 0/);
});

test('guest Watch rewards only on a server-confirmed third verified post',async()=>{
  const dom=new JSDOM('<div id="result-box" style="display:none"></div>',{runScripts:'outside-only',url:'https://matchapp.tv/'});
  const w=dom.window;
  w.isUserLoggedIn=false;
  w.MatchAppGuestMatches={balance:()=>Number(w.localStorage.getItem('match_guestBonusMatches')||0),set:n=>w.localStorage.setItem('match_guestBonusMatches',String(n))};
  w.eval(fs.readFileSync('guest-share-rewards.js','utf8'));
  let callbacks=0;
  const proof=(progress,reward_granted)=>({verified:true,kind:'watch_match',platform:'tiktok',proof_id:'123e4567-e89b-42d3-a456-42661417400'+progress,progress,reward_granted});
  for(const progress of [1,2]){
    assert.equal(w.MatchAppGuestShare.finalizeVerified({kind:'watch_match',token:'watch:'+progress,proof:proof(progress,false),onNext:()=>callbacks++}),true);
    assert.equal(w.MatchAppGuestShare.matchBalance(),0);
  }
  assert.equal(w.MatchAppGuestShare.finalizeVerified({kind:'watch_match',token:'watch:3',proof:proof(0,true),onNext:()=>callbacks++}),true);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(w.MatchAppGuestShare.matchBalance(),1);
  assert.equal(callbacks,1);
  assert.equal(w.MatchAppGuestShare.finalizeVerified({kind:'watch_match',token:'watch:3',proof:proof(0,true)}),false);
  assert.equal(w.MatchAppGuestShare.matchBalance(),1);
  dom.window.close();
});
