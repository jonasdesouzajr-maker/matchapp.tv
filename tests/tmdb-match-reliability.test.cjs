const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const tmdb=fs.readFileSync(path.join(__dirname,'..','tmdb.js'),'utf8');

function setup(answers){
  const dom=new JSDOM('',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window,calls=[];
  w.setTimeout=(fn)=>{fn();return 1;};
  w.supabaseClient={functions:{invoke:async(name,{body})=>{calls.push(body);const next=answers.shift();return typeof next==='function'?next(body):next;}}};
  w.eval(tmdb);
  return {dom,w,calls};
}
const busy={data:null,error:{context:{status:429,headers:{get:()=>null}}}};
const discovered={data:{results:[{tmdbId:346648,kind:'movie',title:'Paddington 2',adult:false}]},error:null};

test('a failed discover is not cached, so the next Match asks the source again',async()=>{
  const {dom,w,calls}=setup([{data:null,error:{context:{status:400}}},discovered]);
  try{
    assert.equal((await w.tmdbDiscover({kind:'movie'})).length,0);
    assert.equal((await w.tmdbDiscover({kind:'movie'})).length,1,'second Match must not reuse the failure');
    assert.equal(calls.length,2);
  }finally{dom.window.close();}
});

test('Match lookups retry a busy source; background lookups do not',async()=>{
  const {dom,w,calls}=setup([busy,discovered]);
  try{
    assert.equal((await w.tmdbDiscover({kind:'tv'},{priority:true})).length,1);
    assert.equal(calls.length,2,'one retry after a 429');
  }finally{dom.window.close();}
  const bg=setup([busy,discovered]);
  try{
    assert.equal((await bg.w.tmdbDiscover({kind:'tv'})).length,0);
    assert.equal(bg.calls.length,1,'covers and captions never retry');
  }finally{bg.dom.window.close();}
});

test('a failed details request is not cached; a real empty answer is',async()=>{
  const {dom,w,calls}=setup([busy,{data:{results:[{tmdbId:1,kind:'movie',title:'A',adult:false}]},error:null},{data:{results:[]},error:null}]);
  try{
    assert.equal(await w.tmdbDetails(1,'movie'),null);
    assert.equal((await w.tmdbDetails(1,'movie'))?.title,'A');
    assert.equal(calls.length,2);
    assert.equal(await w.tmdbDetails(2,'movie'),null);
    assert.equal(await w.tmdbDetails(2,'movie'),null);
    assert.equal(calls.length,3,'a real empty answer is cached');
  }finally{dom.window.close();}
});
