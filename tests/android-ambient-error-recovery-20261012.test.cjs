'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('plain spoken comedy suggestions produce separate, source-identified title cards',async()=>{
 const records={
  'Brooklyn Nine-Nine':{title:'Brooklyn Nine-Nine',media_kind:'tv',year:2013,overview:'Verified comedy'},
  'The Good Place':{title:'The Good Place',media_kind:'tv',year:2016,overview:'Verified comedy'},
  'Fake Comedy':{title:'Different series',media_kind:'tv'}
 };
 const seen=[],window={MatchAppCatalogMedia:{lookup:async name=>{seen.push(name);return records[name]||null}}};
 vm.runInNewContext(read('jonas/title-card-presentation-20261011.js'),{window});
 const answer='For a laugh, Brooklyn Nine-Nine is fun. You could also try The Good Place. The unrelated “Fake Comedy” is not valid.';
 const cards=await window.MatchAppJonasTitlePresentation.fromAnswers(answer,3);
 assert.deepEqual(Array.from(cards,x=>x.title),['Brooklyn Nine-Nine','The Good Place']);
 assert.ok(cards.every(x=>x._displayOnly&&x._catalogMedia&&!x.platform));
 assert.ok(seen.includes('Fake Comedy'),'candidate lookup must still enforce source identity');
 assert.equal((await window.MatchAppJonasTitlePresentation.fromAnswer(answer)).title,'Brooklyn Nine-Nine');
});
test('embedded Android chat has one scrolling transcript and a separate anchored composer',()=>{
 const embed=read('jonas/android-ambient-embed-20261011.css');
 const workspace=read('jonas/chat-workspace-20261011.js');
 assert.match(workspace,/window\.parent!==window&&new URLSearchParams\(location\.search\)\.get\('ambient'\)==='1'/);
 assert.match(embed,/\.premium-card\.discover-head\{[\s\S]*?height:100%!important/);
 assert.match(embed,/#chat-log\{[\s\S]*?flex:1 1 0!important/);
 assert.match(embed,/#chat-log\{[\s\S]*?overflow-y:auto!important/);
 assert.match(embed,/\.discover-head>\.newsearch-row\{[\s\S]*?flex:0 0 auto!important/);
 assert.match(embed,/\.jonas-unspoken-remainder\{[\s\S]*?opacity:1!important/);
});
test('a partial poster/card failure never emits the fatal AI error over a delivered answer',()=>{
 const src=read('discover.js');
 assert.match(src,/catch \(cardError\) \{/);
 assert.match(src,/Title card presentation interrupted/);
 assert.match(src,/const replyCount = document\.querySelectorAll\('#chat-log \.chat-assistant'\)\.length/);
 assert.match(src,/if\(replies\.length>replyCount\)\{/);
 assert.match(src,/if\(input && !input\.value\)input\.value=question;/);
 assert.match(read('discover.html'),/ambient=20261012-answer-recovery1/);
});
