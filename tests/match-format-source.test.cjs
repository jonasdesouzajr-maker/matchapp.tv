const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8').replace(/\r\n/g,'\n');
const fn=name=>app.match(new RegExp('(?:async )?function '+name+'\\([\\s\\S]*?\\n}\\n'))[0];
const countries=app.match(/const COUNTRY_CATEGORY_CODES=\{[\s\S]*?\n\};/)[0];
const fits=vm.runInNewContext(countries+'\n'+fn('categoryFitsVerified')+';categoryFitsVerified');
test('source format cannot be inferred from a matching country or comedy genre',()=>{
 assert.equal(fits('movie',['Drama'],['KR'],['K-drama']),false);
 assert.equal(fits('tv',['Reality'],['KR'],['K-drama']),false);
 assert.equal(fits('tv',['Drama'],['KR'],['K-drama']),true);
 assert.equal(fits('tv',['Drama'],['BR'],['novela brasileira']),false);
 assert.equal(fits('tv',['Drama','Soap'],['BR'],['novela brasileira']),true);
 assert.equal(fits('movie',['Comedy'],['US'],['stand-up comedy special']),false);
 assert.equal(fits('movie',['Drama'],['US'],['short film'],{runtimeMinutes:120}),false);
 assert.equal(fits('movie',['Drama'],['US'],['short film'],{runtimeMinutes:18}),true);
 assert.equal(fits('movie',['Drama'],['US'],['short film']),false);
 assert.equal(fits('tv',['Drama'],['FR'],['European cinema']),false);
 assert.equal(fits('movie',['Drama'],['FR'],['European cinema']),true);
 assert.equal(fits('tv',['Animation'],['US'],['anime']),false);
 assert.equal(fits('tv',['Animation'],['JP'],['anime']),true);
 assert.equal(fits('podcast',[],[],[]),false);
});
function itunes(rows){
 const w={matchPolicy:{known:()=>new Set(),key:t=>t},MatchAppCatalogMedia:{regionCode:()=>'BR'}};
 const ctx={window:w,fetch:async()=>({ok:true,json:async()=>({results:rows})}),
 SESSION_SHOWN:new Set(),recentTitles:[],MOOD_TERMS:{},DECADE_TERMS:{},CATEGORY_TERMS:{},
 GOSPEL_TEXT_SIGNALS:[],isBlockedText:()=>false,upgradeArtwork:x=>x,console};
 vm.createContext(ctx);
 vm.runInContext(fn('normCriteria')+'\n'+fn('mediaForCategory')+'\n'+fn('discoverFromITunes'),ctx);
 return cat=>ctx.discoverFromITunes(cat,[],[],[],[]);
}
const row=(kind,extra={})=>({kind,trackName:'Source title',artworkUrl100:'https://source.test/art.jpg',primaryGenreName:'Comedy',...extra});
test('iTunes rejects mismatched records instead of stamping requested categories onto them',async()=>{
 assert.equal(await itunes([row('song')])(['movie']),null);
 assert.equal(await itunes([row('tv-episode')])(['movie']),null);
 assert.equal(await itunes([row('feature-movie')])(['series']),null);
 assert.equal(await itunes([row('tv-episode')])(['anime']),null);
 assert.equal(await itunes([row('tv-episode')])(['novela brasileira']),null);
 assert.equal(await itunes([row('feature-movie')])(['stand-up comedy special']),null);
 const movie=await itunes([row('song'),row('feature-movie')])([]);
 assert.equal(movie?.title,'Source title');
 assert.deepEqual(Array.from(movie.cats),['movie']);
 const series=await itunes([row('tv-episode',{trackName:'Pilot',collectionName:'Actual Series'})])(['series']);
 assert.equal(series?.title,'Actual Series');
});
