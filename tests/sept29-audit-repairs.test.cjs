'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('offline watch intent never hands a thriller or action question to an unrelated drama',()=>{
  const d=new JSDOM('',{url:'https://matchapp.tv',runScripts:'outside-only'});
  try{
    d.window.eval(source('matching-policy.js'));
    const bear={title:'The Bear',cats:['series'],moods:['intense and thrilling'],synopsis:'A chef returns to run his family sandwich shop.'};
    for(const query of ['recommend a thriller movie','filme de ação','something sci-fi','genre: vaporwave'])
      assert.equal(d.window.matchPolicy.fitsQuestion(bear,query),false,query);
    assert.equal(d.window.matchPolicy.fitsQuestion(bear,'recommend a series'),true);
  }finally{d.window.close();}
});

test('the canonical cooking catalog separates recipe questions from watching cooking shows',()=>{
  const catalog=require('../cooking/catalog.js');
  for(const query of ['bibimbap recipe','show me how to cook bibimbap','receita de omelete'])
    assert.equal(catalog.isCooking(query),true,query);
  for(const query of ['recommend a cooking show to watch','documentaries about cooking','movies like Ratatouille about cooking'])
    assert.equal(catalog.isCooking(query),false,query);
});

test('Surprise Me includes approved screen categories without leaking opt-in niches',()=>{
  const topic=require('../topic-focus.js');
  for(const category of ['movie','series','documentary','anime','stand-up comedy special']){
    const e={title:'Reviewed title',cats:[category],platform:'Netflix'};
    assert.equal(topic.allow(e,[]),true,category);
  }
  for(const category of ['Cooking & Recipes','podcast','Spotify playlist','News','Sports']){
    const e={title:'Reviewed title',cats:[category],platform:'Spotify'};
    assert.equal(topic.allow(e,[]),false,category);
  }
});

test('Ask AI checks read-only entitlement before work and consumes only after live output',()=>{
  const app=source('app.js'),discover=source('discover.js');
  const preflight=discover.indexOf("matchAllowanceBeforeLookup('ask_ai')");
  const request=discover.indexOf('payload = await askAIConversational(');
  const debit=discover.indexOf("checkDailyLimit('ask_ai')");
  assert(preflight>=0&&request>preflight&&debit>request,'no early paid debit');
  assert.match(discover,/payload\?\._live === true/);
  assert(app.indexOf('matchAllowanceBeforeLookup(\'match\')')>=0);
});

test('both unsuccessful and recycled adult matching remain free',()=>{
  const app=source('app.js');
  const resultGuard=app.indexOf('const resultWasKnown');
  const debit=app.indexOf('!intentionalHistoryFallback && !freeSavedSpecific && !(await checkDailyLimit())',resultGuard);
  assert(resultGuard>=0&&debit>resultGuard);
  assert.match(app,/matchResult = null;[\s\S]*?catch/); 
});

test('localized live Ask AI replies bypass retranslation and translations fail to source text',()=>{
  const locale=source('locale-results.js');
  const translate=source('match-localization.js');
  assert.match(locale,/if \(parsed\._live === true\) return parsed/);
  assert.match(translate,/adultMatch:true/);
  assert(!translate.includes('return fallback()'));
});

test('transient OMDb outages are retried and missing configuration is the only 503',()=>{
  const front=source('omdb-ratings.js'),back=source('supabase/functions/omdb-ratings/index.ts');
  assert(front.includes('disabledUntil'));
  assert(!front.includes('disabled = true'));
  assert(back.includes('TimeoutError'));
  assert.match(back,/const apiKey[\s\S]*?if \(!apiKey\) return json\(req, \{ unavailable: true \}, 503\)/);
});

test('member share claims demand server history while keeping existing window limits',()=>{
  const sql=source('supabase/migrations/20260929110000_require_match_history_for_rewards.sql');
  assert.match(sql,/match_private\.title_exclusions h/);
  assert.match(sql,/h\.user_id=v_uid/);
  assert.match(sql,/match_private\.title_key\(p_title\)/);
  assert.match(sql,/interval '6 hours'/);
  assert.match(sql,/on conflict do nothing/);
});

test('Bookworms header uses responsive text instead of the old overflowing SVG',()=>{
  const hub=source('ebooks/index.html');
  assert(hub.includes('class="ebook-text-wordmark"'), 'Unexpected Bookworms HTML at test time: '+hub.slice(hub.indexOf('ebook-hub-brand'),hub.indexOf('ebook-hub-brand')+380));
  assert(hub.includes('data-ma-brand-ai'));
  assert(!hub.includes('<img class="matchapp-wordmark" src="/assets/brand/matchapp-tv-ai-v2.svg"'));
});
