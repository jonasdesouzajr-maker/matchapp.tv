'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {name,ADULT,KIDS}=require('../tools/finalize-brand');

test('adult brand normalizer is exact and idempotent',()=>{
 const samples=[
  ['MatchApp', 'MatchApp'],
  ['MatchApp TV',ADULT],
  ['MatchApp TV Ai',ADULT],
  ['MatchApp TV Ai TV',ADULT],
  ['MatchApp TV Ai TV Ai Ai',ADULT],
  ['MatchApp AI',ADULT],
  ['MatchApp iA',ADULT],
  ['MatchApp Ai',ADULT],
  ['Use MatchApp TV in Chrome','Use MatchApp Ai in Chrome'],
  ['MatchApp Ai Kids',KIDS],
  ['MatchApp.tv Kids Mode',KIDS]
 ];
 for(const [input,expected] of samples){
  assert.equal(name(input),expected,input);
  assert.equal(name(name(input)),expected,input+' second pass');
 }
});
test('Kids pages use their own exact brand and remain idempotent',()=>{
 for(const input of ['MatchApp TV Ai','MatchApp AI','MatchApp Ai','MatchApp Kids','MatchApp.tv Kids Mode','MatchApp Ai KIDS']){
  assert.equal(name(input,true),KIDS,input);
  assert.equal(name(name(input,true),true),KIDS,input+' second pass');
 }
});
