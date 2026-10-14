'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('RSS entity decoding is single-pass and rejects invalid Unicode scalars',()=>{
 const source=read('tools/refresh-news-rss.js');
 const clean=vm.runInNewContext(source.slice(source.indexOf('const clean=s=>'),source.indexOf('\nconst esc='))+';clean',{});
 assert.equal(clean('A &amp; B &#x2019; &#128512;'),'A & B ’ 😀');
 assert.equal(clean('&amp;lt; &amp;#39;'),'&lt; &#39;');
 assert.equal(clean('&#1114112; &#xD800; &#0;'),'&#1114112; &#xD800; &#0;');
 assert.equal(clean('<b>Headline</b>'),'Headline');
});
test('Article analytics updates reuse one opened file identity and always close it',()=>{
 const source=read('tools/refresh-news-rss.js');
 const code=source.slice(source.indexOf('function ensureArticleAnalyticsFile(file){'),source.indexOf('\nfunction enforceArticleAnalyticsOnDisk'));
 let closed=0,written=0;
 const fake={openSync:()=>7,readFileSync:fd=>{assert.equal(fd,7);return '<head></head><body>Résumé</body>';},writeSync:(fd,buf,offset,length,position)=>{assert.equal(fd,7);assert.equal(position,written);const count=Math.min(length,17);written+=count;return count;},ftruncateSync:(fd,size)=>{assert.equal(fd,7);assert.equal(size,written);},closeSync:fd=>{assert.equal(fd,7);closed++;}};
 const repair=vm.runInNewContext(code+';ensureArticleAnalyticsFile',{fs:fake,Buffer});
 assert.equal(repair('/test/article'),true);assert.equal(closed,1);assert.ok(written>100);
 fake.readFileSync=()=>{throw Error('Read failed');};
 assert.throws(()=>repair('/test/article'),/Read failed/);assert.equal(closed,2);
 fake.openSync=()=>{const e=Error('missing');e.code='ENOENT';throw e;};
 assert.equal(repair('/missing'),false);assert.equal(closed,2);
});
test('Watch JSON-LD escapes closing script markup without losing schema content',()=>{
 const source=read('tools/build-watch-pages.js');
 const expression=source.match(/const schemaJson=([^;\n]+);/)[1];
 const schema={name:'A </script><script>danger</script>'};
 const output=vm.runInNewContext(expression,{schema});
 assert.equal(output.includes('<'),false);assert.deepEqual(JSON.parse(output),schema);
});
test('Quota translation regex handles escaped quotes and long malformed values linearly',()=>{
 const source=read('tests/release-audit.test.cjs');
 for(const label of ['free','checking']){
  const expression=source.split('\n').find(line=>line.includes('const '+label+'=')).match(/matchAll\((\/.*\/g)\)/)[1];
  const re=vm.runInNewContext(expression),key=label==='free'?'how.freeline':'quota.checking';
  assert.equal([...("'"+key+"': 'don\\'t'").matchAll(re)][0][1],"don\\'t");
  const input="'"+key+"': '"+'\\&'.repeat(30000);
  const start=performance.now();assert.equal([...input.matchAll(re)].length,0);assert.ok(performance.now()-start<2000);
 }
});
