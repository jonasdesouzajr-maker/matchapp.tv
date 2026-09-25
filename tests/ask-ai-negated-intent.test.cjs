const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
const source=read('discover.js'),edge=read('supabase/functions/gemini-proxy/index.ts');
const extract=(src,name)=>{const start=src.indexOf('function '+name+'('),end=src.indexOf('\n}',start);assert(start>=0&&end>start,name);return src.slice(start,end+2)};
const client=vm.runInNewContext([extract(source,'mediaIntentQuestion'),extract(source,'detectAudioIntent'),extract(source,'detectBookIntent'),'({strip:mediaIntentQuestion,book:detectBookIntent,audio:detectAudioIntent})'].join('\n'));
test('negative mentions never invert an explicitly requested film into books/music',()=>{
 const q='Name the director of Spirited Away, the 2001 film. Do not recommend books or music.';
 assert(!client.book(q));assert(!client.audio(q));
 assert(client.book('I want an audiobook edition of Pride and Prejudice'));
 assert(client.audio('Find Spotify music for tonight'));
 assert(client.book('Recommend magazines for fashion and music'));
 assert(client.book('Recommend some books about astronomy'));
 assert.equal(client.strip('Find me an audiobook; please do not recommend movies or music').includes('audiobook'),true);
});
test('server and browser use exclusion-aware intent and refresh scripts',()=>{
 assert.match(edge,/function mediaIntentQuestion\(q: string\): string/);
 assert.match(edge,/const intentQuestion=mediaIntentQuestion\(question\)/);
 assert.match(edge,/detectBookIntent\(intentQuestion\)/);
 assert.match(edge,/detectAudioIntent\(intentQuestion\)/);
 assert.match(read('discover.html'),/discover\.js\?v=20260925-intent1/);
 assert.match(read('discover.html'),/reading-ai\.js\?v=20260925-intent1/);
});

test('final Match guarantee does not turn a negated music mention into audio intent',()=>{
 const guarantee=read('match-guarantee.js');
 const strip=vm.runInNewContext(extract(guarantee,'guaranteeIntentQuestion')+'\nguaranteeIntentQuestion');
 const movie='Name the director and release year of Spirited Away. Do not recommend books or music.';
 const audio=/\\b(podcast|music|song|songs|album|albums|playlist|single|singles|audiobook|spotify|listen|radio show)\\b/i;
 assert.equal(audio.test(strip(movie)),false);
 assert.equal(audio.test(strip('Find Spotify music for tonight')),true);
 assert.match(guarantee,/audioIntent = .*test\(guaranteeIntentQuestion\(question\)\)/);
});
