/* Build exact title destinations from JustWatch's public catalogue. No keys.
   Runtime reads this local file and never accepts arbitrary external URLs. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'kids/kids.js'),'utf8');
const library=vm.runInNewContext(source.match(/const LIBRARY = (\[[\s\S]*?\n  \]);/)[1],{}, {timeout:1000});
const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const slug=s=>normalize(s).replace(/\s+/g,'-');
const query='query FindKids($country:Country!,$search:String!){popularTitles(country:$country,first:8,filter:{searchQuery:$search}){edges{node{id objectType content(country:$country,language:en){title originalReleaseYear fullPath}}}}}';
async function main(){
  const file=path.join(root,'kids/watch-links.json');
  const old=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')).titles:{};
  const titles={},missing=[];
  for(const item of library){
    const entry={title:item.title,year:item.year,type:item.type,regions:{}};
    // Channels have an explicit official destination instead of an unrelated TV result.
    if(item.tmdb!==false)for(const country of ['BR','US']){
      try{
        const res=await fetch('https://apis.justwatch.com/graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,variables:{country,search:item.title}}),signal:AbortSignal.timeout(12000)});
        if(!res.ok)throw Error('Catalogue unavailable');
        const data=await res.json();if(data.errors)throw Error('Catalogue query rejected');
        const kind=item.type==='movie'?'MOVIE':'SHOW';
        const found=data.data?.popularTitles?.edges?.map(e=>e.node).find(n=>n.objectType===kind&&normalize(n.content.title)===normalize(item.title)&&(!item.year||Math.abs(Number(n.content.originalReleaseYear)-Number(item.year))<=1));
        const p=found?.content.fullPath;
        if(p&&new RegExp('^/'+country.toLowerCase()+'/(tv-show|serie|movie|filme)/[a-z0-9-]+$').test(p))entry.regions[country]='https://www.justwatch.com'+p;
      }catch(e){const previous=old[slug(item.title)];if(previous?.title===item.title&&previous.year===item.year)entry.regions[country]=previous.regions[country];}
      if(!entry.regions[country])missing.push(item.title+':'+country);
    }
    titles[slug(item.title)]=entry;
  }
  fs.writeFileSync(file,JSON.stringify({updated:new Date().toISOString().slice(0,10),source:'JustWatch public title catalogue; paths identify titles, availability remains regional.',titles},null,2)+'\n');
  console.log(JSON.stringify({titles:library.length,directLinks:Object.values(titles).reduce((n,e)=>n+Object.keys(e.regions).length,0),missing}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
