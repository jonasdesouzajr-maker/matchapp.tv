'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('every duplicated Top Titles card pins the existing exact film or show identity',()=>{
  const dom=new JSDOM(read('index.html')).window.document;
  const items=[...dom.querySelectorAll('#marquee-track .marquee-item img[data-title]')];
  assert.equal(items.length,20);
  const ids={
    'Quem É Você?':[201778,'tv',1996],'Vermelho Sangue':[226415,'tv',2025],
    'Habeas Corpus':[308963,'tv',2026],'Virtuosas':[1419806,'movie',2026],
    '(Des)controle':[1369243,'movie',2026],'Line of Fire':[321958,'tv',2026],
    'Wicked':[402431,'movie',2024],'You+Me - Against the World':[1641629,'movie',2026],
    'The Love Hypothesis':[1032863,'movie',2026],'American Hostage':[239618,'tv',2026]
  };
  for(const [title,[id,kind,year]] of Object.entries(ids)){
    const cards=items.filter(x=>x.dataset.title===title);
    assert.equal(cards.length,2,'expected two stable cards for '+title);
    for(const img of cards){
      assert.equal(Number(img.dataset.tmdbId),id);
      assert.equal(img.dataset.tmdbKind,kind);
      assert.equal(Number(img.dataset.tmdbYear),year);
    }
  }
  assert.match(read('catalog-media.js'),/Number\(found\?\.tmdb_id\)===state\.tmdbId/);
  assert.match(read('catalog-media.js'),/d\.adult!==true&&Number\(d\.tmdbId\)===state\.tmdbId&&d\.kind===state\.kind/);
});

function makeRecovery({remote={},row=null,details=null}={}){
  const code=read('catalog-media.js'),a=code.indexOf('  function adultPosterSurface('),
        b=code.indexOf('  function localLikePoster(',a);
  assert.ok(a>=0&&b>a);
  const requested=[],lookups=[],probed=[];
  class FakeProbe{
    set src(url){
      probed.push(url);
      queueMicrotask(()=>{
        if(remote[url]==='ok')this.onload?.();
        else if(remote[url]!=='stall')this.onerror?.();
      });
    }
  }
  const registry={};
  const ctx={
    TRUSTED_POSTER:/^https:\/\/(?:image\.tmdb\.org|is\d+-ssl\.mzstatic\.com)\//i,
    window:{
      getVerifiedPoster:title=>registry[title]||null,
      tmdbDetails:async(id,kind)=>{requested.push([id,kind]);return details;},
      globalMatchTitle:''
    },
    lookup:async(title,opts)=>{lookups.push([title,opts]);return row;},
    normalise:s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''),
    localPoster:title=>'data:image/svg+xml,'+encodeURIComponent(title),
    Image:FakeProbe,Promise,Set,Map,Date,clearTimeout,
    setTimeout:(cb,ms)=>setTimeout(cb,Math.min(ms,4))
  };
  const api=vm.runInNewContext(code.slice(a,b)+'\n({posterVariants,recoverAdultPoster})',ctx);
  function tile(title,tmdbId,kind,year){
    const handlers={};
    let src='data:image/svg+xml,loading';
    return {
      id:'',dataset:{tmdbId:String(tmdbId),tmdbKind:kind,tmdbYear:String(year)},
      complete:true,naturalWidth:0,isConnected:true,
      get src(){return src;},set src(v){src=v;this.naturalWidth=v.includes('/EXACT/')?900:0;},
      get currentSrc(){return src;},
      getAttribute:k=>k==='src'?src:null,
      closest:k=>k==='#marquee-track'?{}:null,
      addEventListener:(type,fn)=>{handlers[type]=fn;}
    };
  }
  return {api,ctx,registry,tile,probed,requested,lookups};
}

test('regional title alias recovers its original poster only through the pinned numeric ID',async()=>{
  const old='https://image.tmdb.org/t/p/w780/RETIRED.jpg';
  const good='https://image.tmdb.org/t/p/w780/EXACT/film.jpg';
  const h=makeRecovery({
    remote:{[old]:'stall',[good]:'ok'},
    details:{tmdbId:226415,kind:'tv',adult:false,posterLarge:good}
  });
  h.registry['Vermelho Sangue']=old;
  const img=h.tile('Vermelho Sangue',226415,'tv',2025);
  h.api.recoverAdultPoster(img,'Vermelho Sangue',null,old);
  await new Promise(r=>setTimeout(r,55));
  assert.equal(img.src,good);
  assert.deepEqual(h.requested,[[226415,'tv']]);
  assert.equal(h.lookups.length,1);
  assert.equal(h.lookups[0][0],'Vermelho Sangue');
  assert.equal(h.lookups[0][1].kind,'tv');
});

test('same-named unrelated TMDB ID cannot replace a missing original image',async()=>{
  const old='https://image.tmdb.org/t/p/w780/RETIRED.jpg';
  const wrong='https://image.tmdb.org/t/p/w780/EXACT/wrong.jpg';
  const h=makeRecovery({
    remote:{[old]:'stall',[wrong]:'ok'},
    row:{title:'Vermelho Sangue',tmdb_id:999,poster_url:wrong},
    details:{tmdbId:999,kind:'tv',adult:false,posterLarge:wrong}
  });
  h.registry['Vermelho Sangue']=old;
  const img=h.tile('Vermelho Sangue',226415,'tv',2025);
  h.api.recoverAdultPoster(img,'Vermelho Sangue',null,old);
  await new Promise(r=>setTimeout(r,55));
  assert.notEqual(img.src,wrong);
  assert.ok(!h.probed.includes(wrong));
  assert.deepEqual(h.requested,[[226415,'tv']]);
});

test('matching poster share and saved-title references update only after confirmed image load',()=>{
  const app=read('app.js'),media=read('catalog-media.js');
  assert.match(app,/window\.setLoadedMatchPoster = function\(url,title\)/);
  assert.match(app,/globalMatchPoster = localCover;\s*window\.globalMatchPoster = localCover/);
  assert.match(media,/if\(typeof window\.setLoadedMatchPoster==='function'\)window\.setLoadedMatchPoster\(url,title\)/);
  assert.match(media,/if\(img\.id==='res-poster-img'&&window\.globalMatchTitle===title\)/);
});
