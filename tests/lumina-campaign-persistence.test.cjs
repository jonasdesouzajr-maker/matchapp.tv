/* Differential fixtures use the real campaign generator, with no network or accounts. */
const test=require('node:test');
const assert=require('node:assert/strict');
const campaign=require('../lumina-match/browser/campaign.js');
const bridge=import('../lumina-match/friends-bridge.mjs');
const progressBridge=import('../lumina-match/progress-bridge.mjs');
const clone=value=>JSON.parse(JSON.stringify(value));

function saveFor(level){
  return {version:2,points:150,rounds:15,activeRound:null,campaign:{
    unlocked:level,
    results:Array.from({length:250},(_,i)=>i<level-1?[3,20,60]:null),
    activeLevel:{level,cards:campaign.deck(level,()=>0.375),moves:0,elapsedSeconds:0,timed:false,hintsUsed:0}
  }};
}

test('both parent boundaries accept and canonically retain every one of the 250 generated campaign boards',async()=>{
  const {progressPayload,gamePayload}=await bridge,{progressSnapshot}=await progressBridge;
  for(let level=1;level<=250;level++){
    const save=saveFor(level),active=save.campaign.activeLevel,matched=active.cards[0].art;
    active.cards=active.cards.map(card=>({...card,matched:card.art===matched}));
    active.moves=1;active.elapsedSeconds=7;active.timed=level%2===0;active.hintsUsed=level%4;
    assert.deepEqual(progressPayload(save),save,'RPC normalization at level '+level);
    assert.deepEqual(progressSnapshot(save),save,'parent snapshot at level '+level);
    assert.deepEqual(campaign.normalize(save.campaign),save.campaign,'child normalization at level '+level);
    assert.deepEqual(gamePayload('save_progress',{revision:level,progress:save,user:'ignored',token:'ignored'}),{revision:level,progress:save});
    assert.ok(Buffer.byteLength(JSON.stringify(save))<=16384);
  }
});

test('campaign saves strip transient reveals and unrelated frame data without mutating the source',async()=>{
  const {progressPayload}=await bridge;
  const expected=saveFor(100),input=clone(expected);
  input.token='private';input.user='foreign-account';input.adsReward=100;
  input.campaign.rewarded=true;input.campaign.activeLevel.revealed=[0,1];
  input.campaign.activeLevel.cards[0].flipped=true;
  assert.deepEqual(progressPayload(input),expected);
  assert.equal(input.token,'private');assert.equal(input.campaign.activeLevel.cards[0].flipped,true);
  const legacy={points:10,rounds:1,activeRound:null};
  assert.deepEqual(progressPayload(legacy),legacy,'legacy remains legacy until the campaign is used');
});

test('campaign completion stays at level 250 and accepts bounded result and resume values',async()=>{
  const {progressPayload}=await bridge;
  const value=saveFor(250);
  value.points=1000000000;value.rounds=1000000000;
  value.campaign.results=Array.from({length:250},()=>[3,1000000,86400]);
  Object.assign(value.campaign.activeLevel,{moves:1000000,elapsedSeconds:86400,hintsUsed:3,timed:true});
  assert.deepEqual(progressPayload(value),value);
  value.campaign.activeLevel=null;
  assert.deepEqual(progressPayload(value),value);
  assert.ok(Buffer.byteLength(JSON.stringify(value))<=16384);
});

test('campaign boundaries reject skipped results, future levels, malformed metrics and invalid theme decks',async()=>{
  const {progressPayload}=await bridge;
  const cases=[
    ['unsupported version',value=>{value.version=3;}],
    ['string version',value=>{value.version='2';}],
    ['missing version',value=>{delete value.version;}],
    ['missing campaign',value=>{delete value.campaign;}],
    ['missing active level',value=>{delete value.campaign.activeLevel;}],
    ['level zero',value=>{value.campaign.unlocked=0;}],
    ['level 251',value=>{value.campaign.unlocked=251;}],
    ['fractional unlocked',value=>{value.campaign.unlocked=100.5;}],
    ['string unlocked',value=>{value.campaign.unlocked='100';}],
    ['missing earlier result',value=>{value.campaign.results[0]=null;}],
    ['future result',value=>{value.campaign.results[99]=[3,20,60];}],
    ['short results',value=>{value.campaign.results.pop();}],
    ['long results',value=>{value.campaign.results.push(null);}],
    ['sparse results',value=>{delete value.campaign.results[100];}],
    ['zero stars',value=>{value.campaign.results[0]=[0,1,1];}],
    ['too many stars',value=>{value.campaign.results[0]=[4,1,1];}],
    ['fractional stars',value=>{value.campaign.results[0]=[1.5,1,1];}],
    ['negative result moves',value=>{value.campaign.results[0]=[1,-1,1];}],
    ['large result moves',value=>{value.campaign.results[0]=[1,1000001,1];}],
    ['large result time',value=>{value.campaign.results[0]=[1,1,86401];}],
    ['fractional result time',value=>{value.campaign.results[0]=[1,1,0.1];}],
    ['unbounded result time',value=>{value.campaign.results[0]=[1,1,Infinity];}],
    ['extra result item',value=>{value.campaign.results[0]=[1,1,1,1];}],
    ['locked board',value=>{value.campaign.activeLevel.level=101;}],
    ['board level zero',value=>{value.campaign.activeLevel.level=0;}],
    ['short board',value=>{value.campaign.activeLevel.cards.pop();}],
    ['extra board card',value=>{value.campaign.activeLevel.cards.push({art:'fern',matched:false});}],
    ['sparse board',value=>{delete value.campaign.activeLevel.cards[0];}],
    ['unequal pair',value=>{value.campaign.activeLevel.cards[0].matched=true;}],
    ['fully matched active board',value=>{value.campaign.activeLevel.cards.forEach(card=>{card.matched=true;});}],
    ['invalid art',value=>{value.campaign.activeLevel.cards[0].art='private';}],
    ['ocean art at overlapping grove event',value=>{value.campaign.activeLevel.cards=campaign.deck(125,()=>0.375);}],
    ['numeric match flag',value=>{value.campaign.activeLevel.cards[0].matched=0;}],
    ['negative moves',value=>{value.campaign.activeLevel.moves=-1;}],
    ['large moves',value=>{value.campaign.activeLevel.moves=1000001;}],
    ['large time',value=>{value.campaign.activeLevel.elapsedSeconds=86401;}],
    ['fractional time',value=>{value.campaign.activeLevel.elapsedSeconds=0.5;}],
    ['string timed flag',value=>{value.campaign.activeLevel.timed='false';}],
    ['negative hints',value=>{value.campaign.activeLevel.hintsUsed=-1;}],
    ['too many hints',value=>{value.campaign.activeLevel.hintsUsed=4;}]
  ];
  for(const [label,alter] of cases){
    const value=saveFor(100);alter(value);
    assert.throws(()=>progressPayload(value),error=>error.code==='LUMINA_INVALID',label);
  }
  const early=saveFor(1),first=early.campaign.activeLevel.cards[0].art;
  early.campaign.activeLevel.cards.forEach(card=>{if(card.art===first)card.art='mushroom';});
  assert.throws(()=>progressPayload(early),error=>error.code==='LUMINA_INVALID','event art unavailable in early standard levels');
  const beyond=saveFor(250);beyond.campaign.activeLevel.level=251;
  assert.throws(()=>progressPayload(beyond),error=>error.code==='LUMINA_INVALID','no level 251');
});
