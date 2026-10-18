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
  assert.equal(dom.window.document.querySelector('.match-fun-share__copy span').textContent,'Share this recommendation with friends.');
  dom.window.close();
});

test('adult share design and promotion preserve homepage SEO',()=>{
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/name="description" content="[^"]*share a match with friends/);
  const js=fs.readFileSync('share.js','utf8');
  const sql=fs.readFileSync('supabase/migrations-archive/legacy-local/20260928095000_three_match_shares_one_reward.sql','utf8');
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


test('token-policy sharing copy is authored in all 14 selected languages and restores the disabled-policy button',async()=>{
  const dom=new JSDOM('<aside class="match-fun-share"><button id="btn-share-match">Original share action</button><div class="match-fun-share__copy"><strong></strong><span></span></div></aside>',{runScripts:'outside-only',url:'https://matchapp.tv/'});
  const w=dom.window,button=w.document.getElementById('btn-share-match');
  const labels=new Set(),hints=new Set();let shares=0;
  const handler=()=>shares++;button.onclick=handler;
  w.localStorage.setItem('match_guestBonusMatches','10');w.localStorage.setItem('match_guestBonusAiPrompts_v1','7');
  try{
    w.MatchAppTokens={retireLegacyPromotions:false};
    w.eval(fs.readFileSync('match-fun-share.js','utf8'));
    assert.equal(button.textContent,'Original share action');
    w.MatchAppTokens.retireLegacyPromotions=true;
    w.document.dispatchEvent(new w.CustomEvent('matchapp:tokenpolicy'));
    for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){
      w.MATCH_LANG=lang;w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
      const hint=w.document.querySelector('.match-fun-share__copy span').textContent;
      assert.ok(hint.trim().length>0,lang);assert.doesNotMatch(hint,/\d|\+/);
      assert.doesNotMatch(button.textContent,/\d|\+/);assert.equal(button.onclick,handler);
      assert.equal(w.document.querySelector('aside').getAttribute('aria-label'),button.textContent.replace(/^📢\s*/,''));
      hints.add(hint);labels.add(button.textContent);
    }
    assert.equal(hints.size,14);assert.equal(labels.size,14);
    button.click();assert.equal(shares,1);
    w.MATCH_LANG='pt-BR';w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
    assert.equal(w.document.querySelector('.match-fun-share__copy span').textContent,'Compartilhe esta indicação com amigos.');
    w.MATCH_LANG='';w.localStorage.setItem('match_lang','it-IT');w.document.documentElement.lang='en';
    w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange'));
    assert.equal(button.textContent,'📢 Condividi questo Match');
    w.t=()=> 'Original localized sharing';w.MatchAppTokens.retireLegacyPromotions=false;
    w.document.dispatchEvent(new w.CustomEvent('matchapp:tokenpolicy'));
    await new Promise(resolve=>w.setTimeout(resolve,0));
    assert.equal(button.textContent,'Original localized sharing');assert.equal(button.onclick,handler);
    assert.equal(w.localStorage.getItem('match_guestBonusMatches'),'10');
    assert.equal(w.localStorage.getItem('match_guestBonusAiPrompts_v1'),'7');
  }finally{w.close();}
});

test('later result renders cannot restore a retired reward label or override the original restricted-title action',async()=>{
  const dom=new JSDOM('<aside class="match-fun-share"><button id="btn-share-match">Share 3 results</button><div class="match-fun-share__copy"><strong></strong><span></span></div></aside><a id="watch" href="https://www.netflix.com/">Watch</a>',{runScripts:'outside-only',url:'https://matchapp.tv/'});
  const w=dom.window,button=w.document.getElementById('btn-share-match');
  let shares=0,replacements=0;
  w.openShareSheet=()=>shares++;w.getAnotherMatchInstead=()=>replacements++;
  w.t=key=>key==='share.restricted'?'Not shareable — choose another Match':'Share 3 results · Get +1 Match';
  const app=fs.readFileSync('app.js','utf8');
  const end='window.updateShareButtonState = updateShareButtonState;';
  try{
    w.eval(app.slice(app.indexOf('function updateShareButtonState()'),app.indexOf(end)+end.length));
    w.MatchAppTokens={retireLegacyPromotions:true};w.updateShareButtonState();
    const originalShare=button.onclick;
    w.eval(fs.readFileSync('match-fun-share.js','utf8'));
    await new Promise(resolve=>w.setTimeout(resolve,0));
    assert.equal(button.onclick,originalShare);assert.equal(button.textContent,'📢 Share this Match');
    w.updateShareButtonState();const renderedShare=button.onclick;
    await new Promise(resolve=>w.setTimeout(resolve,0));
    assert.equal(button.textContent,'📢 Share this Match');assert.equal(button.onclick,renderedShare);
    button.click();assert.equal(shares,1);
    w.currentMatchShareRestricted=true;w.updateShareButtonState();const restricted=button.onclick;
    await new Promise(resolve=>w.setTimeout(resolve,0));
    assert.equal(button.textContent,'Not shareable — choose another Match');assert.equal(button.onclick,restricted);
    w.document.dispatchEvent(new w.CustomEvent('matchapp:tokenpolicy'));w.document.dispatchEvent(new w.CustomEvent('matchapp:newmatch'));
    assert.equal(button.textContent,'Not shareable — choose another Match');button.click();
    assert.equal(replacements,1);assert.equal(shares,1);
    w.currentMatchShareRestricted=false;w.updateShareButtonState();
    await new Promise(resolve=>w.setTimeout(resolve,0));
    assert.equal(button.textContent,'📢 Share this Match');button.click();assert.equal(shares,2);
    assert.equal(w.document.getElementById('watch').href,'https://www.netflix.com/');
  }finally{w.close();}
});
