'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {name}=require('../tools/finalize-brand');

test('brand normalizer is idempotent and never duplicates TV after Ai',()=>{
  const samples=[
    ['MatchApp','MatchApp TV Ai'],
    ['MatchApp.tv','MatchApp TV Ai'],
    ['MatchApp TV','MatchApp TV Ai'],
    ['MatchApp TV Ai','MatchApp TV Ai'],
    ['MatchApp TV Ai TV','MatchApp TV Ai'],
    ['Use MatchApp TV in Chrome','Use MatchApp TV Ai in Chrome'],
    ['MatchApp Ai','MatchApp Ai']
  ];
  for(const [input,expected] of samples){
    assert.equal(name(input),expected,input);
    assert.equal(name(name(input)),expected,input+' second pass');
  }
});
