'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'tools/refresh-news-rss.js'),'utf8');
const newsFile=name=>path.join(ROOT,'news',name);
const prior=JSON.stringify({items:[]});
const item=(title,date,id)=>`<item><title>${title}</title><link>https://www.bbc.com/news/articles/${id}</link>${date===undefined?'':`<pubDate>${date}</pubDate>`}<media:thumbnail url="https://images.example.test/film.jpg"/></item>`;
async function publish(rows){
  const files=new Map([[newsFile('archive.json'),prior],[newsFile('data.json'),'previous verified feed']]);
  const writes=[],warnings=[],errors=[];
  let exitCode=0;
  const filesystem={
    existsSync:file=>files.has(file),readFileSync:file=>{assert.ok(files.has(file));return files.get(file);},
    mkdirSync(){},writeFileSync(file,value){writes.push(file);files.set(file,String(value));},
    readdirSync:()=>[],rmSync(){throw Error('Unexpected archive removal');}
  };
  await vm.runInNewContext(source,{
    __dirname:path.join(ROOT,'tools'),URL,URLSearchParams,AbortController,Buffer,setTimeout,clearTimeout,
    console:{log(){},warn:message=>warnings.push(message),error:message=>errors.push(message)},
    process:{exit:code=>{exitCode=code;}},
    fetch:async url=>({ok:true,status:200,text:async()=>String(url).includes('entertainment_and_arts')?`<rss><channel>${rows}</channel></rss>`:'<rss><channel/></rss>'}),
    require(name){
      if(name==='node:fs')return filesystem;
      if(name==='../news-monetization.js')return {eligibleArticle:()=>false,offers:[],offersMarkup:()=>''};
      assert.ok(['node:path','node:crypto'].includes(name));return require(name);
    }
  });
  return {files,writes,warnings,errors,exitCode};
}
const validRows=()=>Array.from({length:5},(_,n)=>item(`Film premiere announcement number ${n}`,'Mon, 19 Oct 2026 12:00:00 +0200','film-'+n)).join('');

test('RSS missing and malformed dates cannot be promoted to fresh publisher news',async()=>{
  const result=await publish(validRows()+item('Film premiere with no publication date',undefined,'undated')+item('Film premiere with a malformed date','not a publisher date','invalid')+item('Film premiere with an empty publication date','','empty'));
  assert.equal(result.exitCode,0,result.errors.join('\n'));
  const data=JSON.parse(result.files.get(newsFile('data.json')));
  assert.equal(data.items.length,5);
  assert.ok(data.items.every(row=>row.published_at==='2026-10-19T10:00:00.000Z'));
  assert.equal(result.warnings.filter(w=>w.includes('skipped 3 publisher items with missing or invalid publication dates')).length,1);
  const archive=JSON.parse(result.files.get(newsFile('archive.json')));
  assert.equal(archive.items.length,5);
  for(const row of archive.items){
    const html=result.files.get(path.join(ROOT,new URL(row.matchapp_url).pathname,'index.html'));
    assert.ok(html.includes('datetime="2026-10-19T10:00:00.000Z"'));
    assert.ok(!row.title.includes('malformed')&&!row.title.includes('no publication'));
  }
});

test('undated duplicates do not hide a later correctly dated publisher item',async()=>{
  const title='Film premiere announcement number 0';
  const result=await publish(item(title,undefined,'invalid-first')+validRows());
  assert.equal(result.exitCode,0,result.errors.join('\n'));
  const data=JSON.parse(result.files.get(newsFile('data.json')));
  assert.equal(data.items.length,5);
  assert.equal(data.items.filter(row=>row.title===title).length,1);
  assert.ok(data.items.find(row=>row.title===title).url.endsWith('/film-0'));
});

test('too few dated stories fail before any committed feed, archive, HTML or sitemap output is written',async()=>{
  const invalidRows=Array.from({length:6},(_,n)=>item(`Film premiere without a valid date ${n}`,'bad date','undated-'+n)).join('');
  const result=await publish(item('Film premiere with a verified old date','Tue, 13 Oct 2026 08:00:00 GMT','dated')+invalidRows);
  assert.equal(result.exitCode,1);
  assert.ok(result.errors.some(message=>message.includes('only 1 usable items')));
  assert.deepEqual(result.writes,[]);
  assert.equal(result.files.get(newsFile('data.json')),'previous verified feed');
  assert.equal(result.files.get(newsFile('archive.json')),prior);
});

test('RSS and Atom keep original publisher instants, including older dates and explicit offsets',async()=>{
  const atom='<entry><title>Film premiere Atom publisher announcement</title><link href="https://www.bbc.com/news/articles/atom"/><published>2026-10-18T23:30:00-03:00</published><media:thumbnail url="https://images.example.test/film.jpg"/></entry>';
  const old=item('Film premiere old publisher announcement','Tue, 13 Oct 2026 08:00:00 GMT','old');
  const result=await publish(validRows()+atom+old);
  assert.equal(result.exitCode,0,result.errors.join('\n'));
  const items=JSON.parse(result.files.get(newsFile('data.json'))).items;
  assert.equal(items.find(row=>row.url.endsWith('/atom')).published_at,'2026-10-19T02:30:00.000Z');
  assert.equal(items.find(row=>row.url.endsWith('/old')).published_at,'2026-10-13T08:00:00.000Z');
});
