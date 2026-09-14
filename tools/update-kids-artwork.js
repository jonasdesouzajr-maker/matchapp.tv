// Build an identity-checked artwork backup. TMDB uses the secure existing proxy.
// Only title/year/type matches from public TMDB, TVMaze and Apple artwork are admitted.
const fs=require('fs'),path=require('path'),vm=require('vm');const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'kids/kids.js'),'utf8');const start=source.indexOf('  const LIBRARY = [')+'  const LIBRARY = '.length,end=source.indexOf('\n  ];',start)+4;
const library=vm.runInNewContext(source.slice(start,end));const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const url=app.match(/https:\/\/[a-z]+\.supabase\.co/)[0],anon=app.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)[0];
const norm=t=>String(t||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');const slug=t=>String(t).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,'-');
const wait=ms=>new Promise(r=>setTimeout(r,ms));const titles={};
async function json(u,options={}){const r=await fetch(u,{...options,signal:AbortSignal.timeout(15000)});if(r.status===429){await wait(60000);return json(u,options);}if(!r.ok)return null;return r.json();}
(async()=>{
 let tmdb=0,secondary=0,local=0;
 for(const item of library){
  if(item.tmdb===false){local++;continue;}const kind=item.type==='movie'?'movie':'tv';let poster=null,provider=null;
  try{
   const data=await json(url+'/functions/v1/tmdb-proxy',{method:'POST',headers:{'Content-Type':'application/json',apikey:anon,Authorization:'Bearer '+anon},body:JSON.stringify({query:item.title,year:item.year,kind,lang:'en-US'})});
   const result=data?.results?.find(r=>r.adult!==true&&r.kind===kind&&[r.title,r.originalTitle].some(t=>norm(t)===norm(item.title))&&(!item.year||Math.abs(Number(r.year)-Number(item.year))<=1)&&/^https:\/\/image\.tmdb\.org\//.test(r.poster||''));
   if(result){poster=result.posterLarge||result.poster;provider='TMDB';tmdb++;}
   if(!poster&&kind==='tv'){
    const data=await json('https://api.tvmaze.com/search/shows?q='+encodeURIComponent(item.title));
    const show=data?.map(r=>r.show).find(r=>norm(r.name)===norm(item.title)&&String(r.premiered||'').slice(0,4)===item.year&&/^https:\/\/static\.tvmaze\.com\//.test(r.image?.original||''));
    if(show){poster=show.image.original;provider='TVMaze';secondary++;}
   }
   if(!poster&&kind==='movie'){
    const data=await json('https://itunes.apple.com/search?media=movie&entity=movie&limit=12&term='+encodeURIComponent(item.title));
    const hit=data?.results?.find(r=>norm(r.trackName)===norm(item.title)&&String(r.releaseDate||'').slice(0,4)===item.year&&/^https:\/\/is[1-5]-ssl\.mzstatic\.com\//.test(r.artworkUrl100||''));
    if(hit){poster=hit.artworkUrl100.replace('100x100bb','600x900bb');provider='Apple';secondary++;}
   }
  }catch(_){/* A local, title-specific original cover always remains available. */}
  if(poster)titles[slug(item.title)]={title:item.title,year:item.year,type:item.type,poster,source:provider};else{local++;console.log('Local original:',item.title,item.year);}
  await wait(1150);
 }
 fs.writeFileSync(path.join(root,'kids/artwork.json'),JSON.stringify({updatedAt:new Date().toISOString(),titles},null,2)+'\n');console.log(JSON.stringify({tmdb,secondary,local,total:library.length}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
