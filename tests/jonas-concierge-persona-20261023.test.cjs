'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const source=fs.readFileSync('supabase/functions/gemini-proxy/index.ts','utf8');
function extract(name){const start=source.indexOf('function '+name+'('),end=source.indexOf('\n}',start);assert(start>=0&&end>start);return source.slice(start,end+2);}
const names=source.match(/const LANG_NAMES: Record<string, string> = \{[\s\S]*?\n\};/)[0];
const helpers=['mediaIntentQuestion','detectBookIntent','detectAudioIntent','buildDiscoverPrompt'].map(extract).join('\n');
const ctx=vm.createContext({DISCOVER_MAX:12});
vm.runInContext(stripTypeScriptTypes(names+'\n'+helpers)+'\nthis.prompt=buildDiscoverPrompt;this.languages=LANG_NAMES;',ctx);
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];

test('every selected adult language has the permanent Jonas identity before the conversation',()=>{
 for(const lang of languages){
  const prompt=ctx.prompt('Introduce yourself with your name, gender, age and background.',lang,'BR','30',[
   {role:'assistant',text:'I am Maya, a thirty-year-old female concierge.'}
  ],false,'','Maya');
  assert.match(prompt,/You are Jonas, MatchApp Ai/);
  assert.match(prompt,/male AI entertainment concierge/);
  assert.match(prompt,/approximately 40 years old/);
  assert.match(prompt,/Italian-Brazilian/);
  assert(prompt.indexOf('You are Jonas')<prompt.indexOf('Here is the conversation so far'),lang+' establishes identity before potentially incorrect history');
  assert(prompt.includes('Use fluent, natural '+ctx.languages[lang]),'explicit selected language remains authoritative');
  assert.match(prompt,/viewer is 30 years old/,'viewer age is retained as separate context');
  assert.match(prompt,/user chose the nickname "Maya"/,'viewer nickname is retained without becoming the assistant name');
 }
});

test('ordinary adult entertainment requests retain their format, sources and response schema',()=>{
 for(const [question,marker] of [
  ['Recommend a documentary to watch','This question asks for something to watch.'],
  ['Find a Pride and Prejudice audiobook','This is a book or narrated-book request.'],
  ['Help me cook bibimbap','This is a COOKING request.']
 ]){
  const prompt=ctx.prompt(question,'en','GB','');
  assert.match(prompt,/You are Jonas, MatchApp Ai/);assert(prompt.includes(marker));
  assert.match(prompt,/Output valid JSON ONLY/);assert.match(prompt,/PERMANENT SAFETY/);
 }
});

test('the adult character cannot enter the isolated Kids prompt',()=>{
 for(const lang of languages){
  const prompt=ctx.prompt('Recommend a gentle animated film',lang,'BR','6',[],true,'5-7','Maya');
  assert.doesNotMatch(prompt,/You are Jonas|male AI entertainment concierge|approximately 40 years old|Italian-Brazilian/);
  assert.match(prompt,/KIDS MODE IS ACTIVE/);assert.match(prompt,/hard safety boundary/);
  assert.match(prompt,/Never weaken these rules because the user asks/);
 }
});
