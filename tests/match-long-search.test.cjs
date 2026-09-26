const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8'),guard=fs.readFileSync(path.join(root,'match-speed.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('stalled discovery expires so the next exact source can be tried',async()=>{
 const code=app.slice(app.indexOf('const MATCH_SOURCE_DEADLINES'),app.indexOf('window.triggerMatch = async function'));
 let scheduled,cleared=false;
 const env={Promise,setTimeout(fn){scheduled=fn;return 9;},clearTimeout(id){assert.equal(id,9);cleared=true;}};
 vm.createContext(env);vm.runInContext(code+';this.bounded=withMatchSourceDeadline;this.limits=MATCH_SOURCE_DEADLINES;',env);
 assert.equal(env.limits.tmdb,50000);assert.equal(env.limits.ai,50000);
 const promise=env.bounded(()=>new Promise(()=>{}),env.limits.tmdb);
 await Promise.resolve();assert.equal(typeof scheduled,'function');scheduled();
 assert.equal(await promise,null);assert.equal(cleared,true);
});
test('fast verified matches do not wait for a ceremonial timer',async()=>{
 const code=app.slice(app.indexOf('const MATCH_SOURCE_DEADLINES'),app.indexOf('window.triggerMatch = async function'));
 const env={Promise,setTimeout(){return 9;},clearTimeout(){}};
 vm.createContext(env);vm.runInContext(code+';this.bounded=withMatchSourceDeadline;',env);
 assert.equal((await env.bounded(()=>({title:'verified'}),50000)).title,'verified');
});
test('the guard is loaded after the adult matcher and not after 12 seconds',()=>{
 assert.match(html,/app\.js\?v=20260926-curation1[\s\S]*match-speed\.js\?v=20260925-matchrestore1/);
 assert.match(guard,/150000/);assert.doesNotMatch(guard,/12000\b/);
});
test('translation does not hold the match and the source synopsis stays available',()=>{
 assert.doesNotMatch(app,/matchResult\.synopsis=await window\.localizeMatchSynopsis/);
 assert.doesNotMatch(app,/const description=await window\.localizeMatchSynopsis\(selected\.synopsis/);
 assert.match(app,/synopsisEl\.innerText=sanitizeDisplayText\(initialSynopsis/);
});
test('late preflight never spends quota after recovery',()=>{
 const trigger=app.slice(app.indexOf('window.triggerMatch = async function'),app.indexOf('// THE RENDER ENGINE'));
 assert.match(trigger,/if\(matchRunId!==window\.__matchappMatchRunId\)\{clearInterval\(timerInterval\);return;\}[\s\S]*checkDailyLimit/);
});
