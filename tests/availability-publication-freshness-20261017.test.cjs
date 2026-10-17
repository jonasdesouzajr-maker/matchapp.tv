'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const {partitionProviderObservations,providersFromResponse,carryPrevious}=require('../tools/fetch-availability.js');
const {regionEvidence,buildAvailabilityGraph}=require('../tools/availability-evidence.cjs');
const {buildPage}=require('../tools/build-watch-pages.js');
const generated=new Date().toISOString(),checked=new Date(Date.now()-30000).toISOString(),source='https://www.themoviedb.org/tv/46161-vale-tudo/watch?locale=BR';
function sample(){return {BR:{checkedAt:checked,status:'available',stream:['Verified source provider'],link:source},GB:{checkedAt:checked,status:'not_reported'}};}
function info(){return {tmdbId:46161,kind:'tv',year:1988,checkedAt:checked,refreshStatus:'confirmed',...partitionProviderObservations(sample())};}
test('unlinked no-listing observations stay dated and separate from source-backed offer records',()=>{
 const raw=sample(),before=structuredClone(raw),parts=partitionProviderObservations(raw);assert.deepEqual(raw,before);assert.deepEqual(parts.regions.BR,before.BR);assert.equal(parts.regions.GB,undefined);assert.deepEqual(parts.regionObservations.GB,before.GB);assert.equal(parts.regionObservations.GB.link,undefined);
 const evidence=regionEvidence(info(),'GB',generated,Date.parse(generated));assert.equal(evidence.state,'not_reported');assert.equal(evidence.checkedAt,checked);assert.equal(evidence.sourceUrl,'');assert.equal(evidence.options.length,0);
});
test('a source response omitting a region does not invent a country source or viewing offer',()=>{
 const raw=providersFromResponse({results:{BR:{link:source,flatrate:[{provider_name:'Verified source provider'}]}}},checked),parts=partitionProviderObservations(raw);
 assert.deepEqual(Object.keys(parts.regions),['BR']);for(const c of ['US','GB','PT'])assert.deepEqual(parts.regionObservations[c],{checkedAt:checked,status:'not_reported'});
});
test('provider records with missing, unsafe or wrong-country links block replacement of last-good data',()=>{
 for(const link of ['', 'http://www.themoviedb.org/tv/46161/watch?locale=BR','https://www.themoviedb.org/tv/46161/watch?locale=US','javascript:alert(1)'])assert.throws(()=>partitionProviderObservations({BR:{checkedAt:checked,status:'available',stream:['Verified source provider'],link}}),/original region-qualified source/);
 assert.throws(()=>partitionProviderObservations({GB:{checkedAt:checked,status:'not_reported'}}),/preserve the last good title/);
});
test('source context distinguishes dataset compilation time from actual provider observations',()=>{
 const record=info(),html=buildPage('Vale Tudo',record,{cats:['novela'],synopsis:'A title synopsis'},[],generated),d=new JSDOM(html).window.document,context=d.querySelector('[aria-label="Source context and comparison"]'),times=[...context.querySelectorAll('time')];
 assert.equal(times[0].dateTime,generated);assert.match(times[0].parentElement.textContent,/Dataset compiled/);assert.equal(times[1].dateTime,checked);assert.match(times[1].parentElement.textContent,/Provider data checked/);
 const gb=d.querySelector('#availability-gb');assert.ok(gb);assert.equal(gb.querySelector('a.w2w-link'),null);assert.match(gb.textContent,/No provider options were reported/);
 const graph=buildAvailabilityGraph({title:'Vale Tudo',info:record,entry:{},url:'https://matchapp.tv/where-to-watch/vale-tudo/',generated,now:Date.parse(generated)});
 assert.equal(graph['@graph'].find(n=>n['@type']==='WebPage').dateModified,checked);assert.equal(graph['@graph'].find(n=>n['@type']==='TVSeries').potentialAction,undefined);
});
test('later dataset compilation does not freshen retained source observations',()=>{
 const record=info(),previous={generated,titles:{'Vale Tudo':record}},copy=carryPrevious(previous)['Vale Tudo'];assert.equal(copy.checkedAt,checked);assert.equal(copy.regionObservations.GB.checkedAt,checked);assert.equal(copy.regions.BR.checkedAt,checked);
 assert.equal(regionEvidence({...copy,refreshStatus:'failed'},'GB','2026-10-18T08:32:11.100Z',Date.parse('2026-10-18T08:32:11.100Z')).state,'unknown');
});

test('free and ad-supported offers are retained and not confused with paid subscriptions',()=>{
 const record=info();record.regions.BR={checkedAt:checked,status:'available',ads:['Verified free-with-ads provider'],link:source};const d=new JSDOM(buildPage('Vale Tudo',record,{},[],generated)).window.document;const region=d.querySelector('#availability-br');assert.match(region.textContent,/Free with ads/);assert.match(region.textContent,/No subscription, rental or purchase provider is confirmed/);assert.match(region.textContent,/Verified free-with-ads provider/);
});
