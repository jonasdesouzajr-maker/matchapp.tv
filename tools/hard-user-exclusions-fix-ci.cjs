const fs=require('fs');

const mustReplace=(path,oldText,newText,label)=>{
  let s=fs.readFileSync(path,'utf8');
  if(!s.includes(oldText)) throw new Error('Missing patch anchor: '+label);
  s=s.replace(oldText,newText);
  fs.writeFileSync(path,s);
};

const oldBlock=`    // Explicit Not For Me choices remain hard exclusions even when history is
    // exhausted. Merely having been shown before is what becomes recyclable.
    const disliked = new Set();
    try {
        const rows = JSON.parse(window.localStorage.getItem('match_dislikedList') || '[]');
        (Array.isArray(rows) ? rows : []).forEach(item => disliked.add(policy.key(item && item.title ? item.title : item)));
    } catch (_) {}

    let pool = CONTENT_CATALOG.filter(e => eligible(e) && !disliked.has(policy.key(e.title)));`;

const newBlock=`    // Watch Later and Not For Me are deliberate user choices, not ordinary
    // match history. They stay hard exclusions even when we recycle older
    // shown/seen titles after exhausting unseen exact matches.
    const hardExcluded = new Set();
    const addHard = item => {
        const k = policy.key(item && item.title ? item.title : item);
        if (k) hardExcluded.add(k);
    };
    try {
        if (typeof savedList !== 'undefined' && Array.isArray(savedList)) savedList.forEach(addHard);
        if (typeof dislikedList !== 'undefined' && Array.isArray(dislikedList)) dislikedList.forEach(addHard);
    } catch (_) {}
    for (const storageKey of ['match_savedList','match_dislikedList']) {
        try {
            const rows = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
            (Array.isArray(rows) ? rows : []).forEach(addHard);
        } catch (_) {}
    }
    try {
        const hardActions = new Set(['save','saved','watchlater','dislike','declined','notforme']);
        for (const item of policy.history?.() || []) {
            const action = String(item && item.action || '').toLowerCase().replace(/[^a-z]/g,'');
            if (hardActions.has(action)) addHard(item);
        }
    } catch (_) {}

    let pool = CONTENT_CATALOG.filter(e => eligible(e) && !hardExcluded.has(policy.key(e.title)));`;

mustReplace('app.js',oldBlock,newBlock,'hard saved/disliked exclusions');
mustReplace('index.html','/app.js?v=201','/app.js?v=202','matcher cache bust');
mustReplace('tests/premium-home-recovery.test.cjs','/\\/app\\.js\\?v=201/','/\\/app\\.js\\?v=202/','homepage matcher version assertion');

let test=fs.readFileSync('tests/match-runtime-regression.test.cjs','utf8');
const anchor="test('removed catalogue options cannot remain as invisible saved search constraints'";
if(!test.includes(anchor)) throw new Error('runtime test insertion anchor missing');
const extra=`test('history recycling never returns Watch Later or Not For Me titles',()=>{\n const requested={cat:['movie'],plat:[],mood:[],vibe:[],rating:[],decade:[]};\n const {dom,w,context}=matching(requested,catalog.map(entry=>entry.title));\n try{\n  const exact=catalog.filter(e=>w.matchPolicy.matchesCriteria(e,requested));\n  assert(exact.length>=3,'test requires at least three matching movies');\n  const saved=exact[0],declined=exact[1];\n  w.localStorage.setItem('match_savedList',JSON.stringify([{title:saved.title}]));\n  w.matchPolicy.remember(declined,'dislike',false);\n  w.localStorage.removeItem('match_dislikedList');\n  const pick=context.pickRecycledCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade);\n  assert(pick,'another recyclable exact title should still be available');\n  assert.equal(pick._historyFallback,true);\n  assert.notEqual(w.matchPolicy.key(pick.title),w.matchPolicy.key(saved.title),'Watch Later must remain excluded');\n  assert.notEqual(w.matchPolicy.key(pick.title),w.matchPolicy.key(declined.title),'Not For Me must remain excluded after cloud/history restore');\n }finally{dom.window.close();}\n});\n\n`;
test=test.replace(anchor,extra+anchor);
fs.writeFileSync('tests/match-runtime-regression.test.cjs',test);

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const checks={
 hardSet:app.includes("['match_savedList','match_dislikedList']"),
 historyActions:app.includes("'watchlater','dislike','declined','notforme'"),
 filter:app.includes('!hardExcluded.has(policy.key(e.title))'),
 version:html.includes('/app.js?v=202')
};
console.log('HARD_EXCLUSION_VERIFY',checks);
if(Object.values(checks).some(v=>!v)) process.exit(2);
