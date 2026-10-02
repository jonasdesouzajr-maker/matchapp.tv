'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const {statusAt,homeEventOrder,RETAIN_ENDED_DAYS}=require('../tools/event-lifecycle');
const event={slug:'fixture-ended',start:'2026-09-24T00:00:00+04:00',end:'2026-09-26T23:59:59+04:00'};
const future={slug:'fixture-upcoming',start:'2026-10-10T00:00:00-03:00',end:'2026-10-11T23:59:59-03:00'};
const active={slug:'fixture-live',start:'2026-09-20T00:00:00+09:00',end:'2026-10-04T23:59:59+09:00'};
test('event status respects start/end instants and source timezones',()=>{
 const start=Date.parse(event.start),end=Date.parse(event.end);
 assert.equal(statusAt(event,start-1),'upcoming');assert.equal(statusAt(event,start),'live');
 assert.equal(statusAt(event,end),'live');assert.equal(statusAt(event,end+1),'ended');
 assert.throws(()=>statusAt({...event,end:'invalid'},start),/Invalid global event dates/);
});
test('new events obey Home 72-hour ending policy and remain last',()=>{
 const end=Date.parse(event.end),day=86400000;
 assert.equal(RETAIN_ENDED_DAYS,3);
 assert.deepEqual(homeEventOrder([event,future,active],end+day).map(e=>e.slug),[future.slug,active.slug,event.slug]);
 assert.ok(homeEventOrder([event,future],end+3*day).includes(event));
 assert.ok(!homeEventOrder([event,future],end+3*day+1).includes(event));
});
test('event generator computes every static badge and Home ordering',()=>{
 const code=read('tools/build-global-events.js');
 assert.match(code,/const badge=e=>/);assert.match(code,/const homeEvents=homeEventOrder\(events,buildNow\)/);
 assert.match(code,/const homeCards=homeEvents\.map\(card\)/);
 assert.match(code,/\$\{badge\(e\)\}/);assert.doesNotMatch(code,/event-soon">Upcoming<\/span>/);
 assert.match(read('global-events.js'),/RETAIN_ENDED_DAYS=3/);
});
test('pricing and homepage branding fixes survive daily editorial builds',()=>{
 assert.doesNotMatch(read('pricing/pricing.html'),/Gemini AI finds a duplicate-free match/);
 const home=read('index.html');
 assert.doesNotMatch(home,/MatchApp Ai Ai/);
 assert.match(home,/<meta name="application-name" content="MatchApp Ai">/);
 assert.match(read('tools/finalize-brand.js'),/const ADULT='MatchApp Ai',KIDS='MatchApp Ai KIDS'/);
});
