const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'..','tmdb.js'),'utf8');
const exact={tmdbId:123456,kind:'movie',title:'Recoverable Source Title',originalTitle:'Recoverable Source Title',year:'2024',adult:false,poster:'https://image.tmdb.org/t/p/w500/exact.jpg'};
function setup(responses){
  const dom=new JSDOM('',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window,calls=[];
  let now=1800000000000;
  w.Date.now=()=>now;
  w.setTimeout=fn=>{fn();return 1;};
  w.supabaseClient={functions:{invoke:async(name,{body})=>{
    calls.push(body);
    const answer=responses.shift();
    if(answer instanceof Error)throw answer;
    return answer;
  }}};
  w.eval(source);
  return {dom,w,calls,advance:ms=>{now+=ms;}};
}

test('empty exact lookup cools down briefly then can recover its real poster',async()=>{
  const f=setup([{data:{results:[]},error:null},{data:{results:[exact]},error:null}]);
  try{
    const hints={year:2024,kind:'movie'};
    assert.equal(await f.w.tmdbLookup(exact.title,hints),null);
    f.advance(74000);
    assert.equal(await f.w.tmdbLookup(exact.title,hints),null);
    assert.equal(f.calls.length,1,'repeat draw respects the short negative cache');
    f.advance(1001);
    assert.equal((await f.w.tmdbLookup(exact.title,hints)).tmdbId,exact.tmdbId);
    assert.equal(f.calls.length,2,'a later request can recover the poster in the same visit');
  }finally{f.dom.window.close();}
});

test('empty source details expire without replacing all-country availability with a guessed region',async()=>{
  const record={...exact,availability:{NO:{stream:['Netflix']},BR:{stream:['Globoplay']}}};
  const f=setup([{data:{results:[]},error:null},{data:{results:[record]},error:null}]);
  try{
    assert.equal(await f.w.tmdbDetails(exact.tmdbId,'movie'),null);
    assert.equal(await f.w.tmdbDetails(exact.tmdbId,'movie'),null);
    assert.equal(f.calls.length,1);
    f.advance(75001);
    const found=await f.w.tmdbDetails(exact.tmdbId,'movie');
    assert.equal(found.availability.NO.stream[0],'Netflix');
    assert.equal(found.availability.BR.stream[0],'Globoplay');
    assert.equal((await f.w.tmdbDetails(exact.tmdbId,'movie')).tmdbId,exact.tmdbId);
    assert.equal(f.calls.length,2);
  }finally{f.dom.window.close();}
});

test('related source errors never blank later suggestions and completed misses expire',async()=>{
  const row={...exact,tmdbId:456789,title:'Another Verified Work'};
  const f=setup([
    {data:null,error:{context:{status:429}}},
    {data:{director:null,related:[row]},error:null},
    {data:{director:null,related:[]},error:null},
    {data:{director:null,related:[row]},error:null}
  ]);
  try{
    assert.equal((await f.w.tmdbRelated(exact.tmdbId,'movie')).related.length,0);
    assert.equal((await f.w.tmdbRelated(exact.tmdbId,'movie')).related[0].tmdbId,row.tmdbId);
    assert.equal(f.calls.length,2,'transient error did not become a permanent empty result');
    assert.equal((await f.w.tmdbRelated(999999,'tv')).related.length,0);
    assert.equal((await f.w.tmdbRelated(999999,'tv')).related.length,0);
    assert.equal(f.calls.length,3);
    f.advance(75001);
    assert.equal((await f.w.tmdbRelated(999999,'tv')).related.length,1);
    assert.equal(f.calls.length,4);
  }finally{f.dom.window.close();}
});

test('a persistent busy source still gets at most two priority retries and no background retry',async()=>{
  const busy={data:null,error:{context:{status:429}}};
  const f=setup([busy,busy,busy,busy]);
  try{
    assert.equal((await f.w.tmdbDiscover({kind:'movie',region:'NO'},{priority:true})).length,0);
    assert.equal(f.calls.length,3);
    assert.equal((await f.w.tmdbDiscover({kind:'tv',region:'NO'})).length,0);
    assert.equal(f.calls.length,4);
  }finally{f.dom.window.close();}
});
