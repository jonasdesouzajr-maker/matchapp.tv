'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function createHarness({metadata=[],available=[],exactDetails=null}={}){
  const probed=[],availableImages=new Set(available),updates=[];
  class FakeImage{
    naturalWidth=0;
    set src(url){
      probed.push(url);
      setTimeout(()=>{
        if(availableImages.has(url)){this.naturalWidth=780;this.onload?.();}
        else this.onerror?.();
      },1);
    }
  }
  const sb={from:()=>({
    select(){return this},eq(){return this},order(){return this},
    async limit(){return {data:metadata,error:null}}
  })};
  const win={
    supabaseClient:sb,globalMatchTitle:'',
    generateLocalPosterSVG:title=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(title),
    setLoadedMatchPoster(url,title){updates.push([url,title]);this.globalMatchPoster=url;return this.globalMatchTitle===title;},
    tmdbDetails:async()=>exactDetails
  };
  const document={readyState:'loading',addEventListener(){}};
  const sandbox={window:win,document,Image:FakeImage,setTimeout,clearTimeout,console};
  vm.runInNewContext(read('catalog-media.js'),sandbox,{filename:'catalog-media.js'});
  function poster({id='',title='',src='',tmdbId='',kind='',year=''}={}){
    let value=src;
    const img={id,isConnected:true,complete:false,naturalWidth:0,
      dataset:{title,tmdbId:String(tmdbId||''),tmdbKind:kind,tmdbYear:String(year||'')},
      get src(){return value},set src(u){value=u;this.complete=u.startsWith('data:');this.naturalWidth=this.complete?600:0},
      getAttribute(name){if(name==='src')return value;return null},
      closest(selector){return selector==='#marquee-track'&&id!=='res-poster-img'?{}:null;}
    };
    return img;
  }
  return {api:win.MatchAppCatalogMedia,window:win,poster,probed,updates,availableImages};
}

test('Top Titles retains one unambiguous source identity across both duplicated cards and app registry',()=>{
  const home=read('index.html'),app=read('app.js');
  const core=home.slice(home.indexOf('<div class="marquee-track" id="marquee-track">'),
                        home.indexOf('<!-- Duplicated Loop for Marquee -->')+4500);
  const cards=[...core.matchAll(/<img data-title="([^"]+)" data-tmdb-id="(\d+)" data-tmdb-kind="(tv|movie)" data-tmdb-year="(\d{4})" src="([^"]+)"/g)]
     .map(m=>({title:m[1],id:Number(m[2]),kind:m[3],year:Number(m[4]),url:m[5]}));
  assert.equal(cards.length,20,'ten unique identities with two rendered copies each');
  const registryStart=app.indexOf('const VERIFIED_POSTERS = {');
  const registryEnd=app.indexOf('\n};',registryStart);
  const map=vm.runInNewContext('('+app.slice(app.indexOf('{',registryStart),registryEnd+2)+')');
  const expected=new Map([
    ['Quem É Você?',201778],['Vermelho Sangue',226415],['Habeas Corpus',308963],
    ['Virtuosas',1419806],['(Des)controle',1369243],['Line of Fire',321958],
    ['Wicked',402431],['You+Me - Against the World',1641629],
    ['The Love Hypothesis',1032863],['American Hostage',239618]
  ]);
  for(const [title,id] of expected){
    const matching=cards.filter(c=>c.title===title);
    assert.equal(matching.length,2,'missing duplicated artwork for '+title);
    for(const c of matching){
      assert.equal(c.id,id,'stale metadata for '+title);
      assert.equal(c.url,map[title],'Home/registy poster mismatch for '+title);
      assert.match(c.url,/^https:\/\/image\.tmdb\.org\/t\/p\/w780\//);
    }
  }
  assert.ok(!home.includes('8JP8OXWufxAXFLfOOj4XU2SEhvV.jpg'));
  assert.ok(!home.includes('vfZxVHextAGC70zrNhS8lsROqP1.jpg'));
  assert.match(home,/\.marquee-item img \{[^}]*object-fit: contain/);
});

test('Failed hardcoded carousel source is replaced by the title-identical verified database poster',async()=>{
 const correct='https://image.tmdb.org/t/p/w500/cojcROwZe8681XzroVIOE9VK4zV.jpg';
 const stale='https://image.tmdb.org/t/p/w780/8JP8OXWufxAXFLfOOj4XU2SEhvV.jpg';
 const row={title:'Habeas Corpus',year:2026,media_kind:'tv',tmdb_id:308963,
   poster_url:correct,poster_large_url:correct.replace('w500','w780')};
 const h=createHarness({metadata:[row],available:[correct]});
 const img=h.poster({title:'Habeas Corpus',src:stale,tmdbId:308963,kind:'tv',year:2026});
 assert.equal(await h.api.recoverAdultPoster(img,'Habeas Corpus',{rail:true}),true);
 assert.equal(img.src,correct);
 assert.ok(!h.probed.includes(stale),'stale original must not outrank the verified title metadata');
});

test('Double cards share one successful official image probe and never clone or change matching',async()=>{
 const correct='https://image.tmdb.org/t/p/w500/wlb6vunPuBjboYnmy4r3NlKZWji.jpg';
 const row={title:'The Love Hypothesis',year:2026,media_kind:'movie',tmdb_id:1032863,poster_url:correct};
 const h=createHarness({metadata:[row],available:[correct]});
 const a=h.poster({title:row.title,tmdbId:row.tmdb_id,kind:row.media_kind,year:row.year});
 const b=h.poster({title:row.title,tmdbId:row.tmdb_id,kind:row.media_kind,year:row.year});
 const outcome=await Promise.all([h.api.recoverAdultPoster(a,row.title,{rail:true}),
  h.api.recoverAdultPoster(b,row.title,{rail:true})]);
 assert.deepEqual(outcome,[true,true]);
 assert.equal(a.src,correct);assert.equal(b.src,correct);
 assert.equal(h.probed.filter(x=>x===correct).length,1);
});

test('Exact ID and media type prevent a same-named but unrelated title from stealing a poster',async()=>{
 const wrong='https://image.tmdb.org/t/p/w780/UNRELATED_IMAGE.jpg';
 const right='https://image.tmdb.org/t/p/w780/RIGHT_EXACT_IMAGE.jpg';
 const h=createHarness({metadata:[{title:'Habeas Corpus',year:2026,media_kind:'movie',
   tmdb_id:999,poster_large_url:wrong}],available:[wrong,right],
   exactDetails:{adult:false,tmdbId:308963,kind:'tv',posterLarge:right}});
 const img=h.poster({title:'Habeas Corpus',tmdbId:308963,kind:'tv',year:2026});
 assert.equal(await h.api.recoverAdultPoster(img,'Habeas Corpus',{rail:true}),true);
 assert.equal(img.src,right);
 assert.ok(!h.probed.includes(wrong));
});

test('Matching results promote only decoded exact-title art and keep their share poster in sync',async()=>{
 const good='https://image.tmdb.org/t/p/w780/EXACT_MATCHED_POSTER.jpg';
 const h=createHarness({metadata:[{title:'Matched Title',year:2026,media_kind:'movie',
   tmdb_id:101,poster_large_url:good}],available:[good]});
 h.window.globalMatchTitle='Matched Title';
 const img=h.poster({id:'res-poster-img',title:'Matched Title',src:'data:image/svg+xml,loading'});
 assert.equal(await h.api.recoverAdultPoster(img,'Matched Title',{year:2026,kind:'movie',tmdbId:101}),true);
 assert.equal(img.src,good);
 assert.deepEqual(h.updates,[ [good,'Matched Title'] ]);
 assert.equal(h.window.globalMatchPoster,good);
});

test('When no official artwork is reachable, show local title art instead of a blank or wrong poster',async()=>{
 const missing='https://image.tmdb.org/t/p/w780/MISSING.jpg';
 const h=createHarness({metadata:[],available:[]});
 const img=h.poster({title:'Unreleased Title',src:missing});
 assert.equal(await h.api.recoverAdultPoster(img,'Unreleased Title',{sourceUrl:missing,rail:true}),false);
 assert.ok(img.src.startsWith('data:image/svg+xml'));
 assert.ok(!h.probed.includes('https://image.tmdb.org/t/p/w780/UNRELATED_IMAGE.jpg'));
});

test('Poster recovery never touches Kids Mode cards or any other unrelated image',async()=>{
 const h=createHarness();
 const img=h.poster({id:'kids-cover',title:'Child-Safe Title',src:'/kids/covers/child-safe.webp'});
 assert.equal(await h.api.recoverAdultPoster(img,'Child-Safe Title',{}),false);
 assert.equal(img.src,'/kids/covers/child-safe.webp');
});
