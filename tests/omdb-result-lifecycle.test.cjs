'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('omdb-ratings.js','utf8');
const first={title:'First',kind:'movie',tmdbId:100};
const second={title:'Second',kind:'tv',tmdbId:200,imdbId:'tt1234567'};
function scene({initial,hidden=false}={}) {
  const dom=new JSDOM('<section id="result-box"><button id="result-dismiss"></button><div id="res-omdb-ratings" hidden></div></section>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
  const w=dom.window,d=w.document,host=d.querySelector('#res-omdb-ratings'),box=d.querySelector('#result-box');
  let calls=0;
  w.supabaseClient={functions:{invoke(){calls++;return Promise.resolve({data:{ratings:{imdb:9.9}}});}}};
  box.hidden=hidden;
  function select(value){w.currentMatchIdentity=value;w.globalMatchTitle=value.title;}
  function emit(name,detail){d.dispatchEvent(new w.CustomEvent(name,{detail}));}
  if(initial) select(initial);
  w.eval(source);
  return {w,host,box,select,emit,match(value){select(value);emit('matchapp:newmatch',value);},
    end(){try{assert.equal(calls,0,'ratings endpoint must never be requested');}finally{w.close();}}};
}

test('initial title-only match waits for verified metadata carrying the exact movie or series identity',()=>{
  const s=scene();
  try {
    s.match(first);assert.equal(s.host.hidden,true);
    const resolved={...first,imdbId:'tt21626284'};s.select(resolved);
    for(const bad of [{...resolved,tmdbId:999},{...resolved,kind:'tv'},{...resolved,title:'Other'}]){
      s.emit('matchapp:adult-metadata',bad);assert.equal(s.host.hidden,true);
    }
    s.emit('matchapp:adult-metadata',resolved);
    assert.equal(s.host.firstElementChild.href,'https://www.imdb.com/title/tt21626284/');
    assert.equal(s.host.firstElementChild.rel,'noopener noreferrer');
    assert.equal(s.host.textContent,'IMDb ↗');
    s.match(second);s.emit('matchapp:adult-metadata',resolved);
    assert.equal(s.host.firstElementChild.href,'https://www.imdb.com/title/tt1234567/');
    s.match({...first,year:1994});assert.equal(s.host.hidden,true);
  } finally {s.end();}
});

test('late script, hidden results, invalid external IDs and unrelated formats cannot leak scores or wrong links',()=>{
  const visible=scene({initial:second}),closed=scene({initial:second,hidden:true});
  try {
    assert.equal(visible.host.hidden,false);assert.equal(closed.host.hidden,true);
    const unknown=[{...second,kind:'book'},{...first,imdbId:'tt21626284/evil'},{...first,imdbId:'https://www.imdb.com/title/tt1234567/'},{...first,imdbId:1234567}];
    for(const value of unknown){visible.match(value);assert.equal(visible.host.hidden,true);assert.equal(visible.host.textContent,'');}
    closed.emit('matchapp:adult-metadata',second);assert.equal(closed.host.hidden,true);
  } finally {visible.end();closed.end();}
});
