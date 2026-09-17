const fs=require('fs');

const mustReplace=(path,oldText,newText,label)=>{
  let s=fs.readFileSync(path,'utf8');
  if(!s.includes(oldText)) throw new Error('Missing patch anchor: '+label);
  s=s.replace(oldText,newText);
  fs.writeFileSync(path,s);
};

const oldPolicy=`  function matches(entry, criteria, extra = []) {
    if (!entry || !entry.title || known().has(key(entry.title)) || extra.includes(key(entry.title))) return false;
    const mapping = {cat:'cats',plat:'platform',mood:'moods',vibe:'vibes',rating:'ratings'};
    for (const [field,property] of Object.entries(mapping)) {
      const wanted = values(criteria[field]);
      if (wanted.length && !values(entry[property]).some(v => wanted.includes(v))) return false;
    }
    const decades = values(criteria.decade);
    if (decades.length && !decades.some(d => { const start = Number(String(d).match(/\\d{4}/)?.[0]); return start && Number(entry.year) >= start && Number(entry.year) < start + 10; })) return false;
    if (!genreFits(entry, criteria || {})) return false;
    return true;
  }
  window.matchPolicy = Object.freeze({key,values,matches,remember,forget,known,history:()=>history.slice(),ready:()=>ready,incompatible:(value,state) => conflicts.some(([a,b]) => (value===a && values(state.mood).includes(b)) || (value===b && values(state.mood).includes(a))),genreFits,intentFromText,fitsQuestion,sameFamily,asEntry,familyScores,comedyLocked,attach:user => (ready = attach(user).catch(() => {})), flush});`;
const newPolicy=`  function matchesCriteria(entry, criteria) {
    if (!entry || !entry.title) return false;
    const mapping = {cat:'cats',plat:'platform',mood:'moods',vibe:'vibes',rating:'ratings'};
    for (const [field,property] of Object.entries(mapping)) {
      const wanted = values(criteria[field]);
      if (wanted.length && !values(entry[property]).some(v => wanted.includes(v))) return false;
    }
    const decades = values(criteria.decade);
    if (decades.length && !decades.some(d => { const start = Number(String(d).match(/\\d{4}/)?.[0]); return start && Number(entry.year) >= start && Number(entry.year) < start + 10; })) return false;
    if (!genreFits(entry, criteria || {})) return false;
    return true;
  }
  function matches(entry, criteria, extra = []) {
    if (!entry || !entry.title || known().has(key(entry.title)) || extra.includes(key(entry.title))) return false;
    return matchesCriteria(entry, criteria);
  }
  window.matchPolicy = Object.freeze({key,values,matches,matchesCriteria,remember,forget,known,history:()=>history.slice(),ready:()=>ready,incompatible:(value,state) => conflicts.some(([a,b]) => (value===a && values(state.mood).includes(b)) || (value===b && values(state.mood).includes(a))),genreFits,intentFromText,fitsQuestion,sameFamily,asEntry,familyScores,comedyLocked,attach:user => (ready = attach(user).catch(() => {})), flush});`;
mustReplace('matching-policy.js',oldPolicy,newPolicy,'split history from criteria matching');

let app=fs.readFileSync('app.js','utf8');
const marker='\n\n// ----------------------------------------------------\n// PRUNE UNSTOCKED CRITERIA OPTIONS';
if(!app.includes(marker)) throw new Error('Missing app fallback insertion marker');
const fallback=`

// Exhaustion recovery: if every exact match has already appeared, recycle the
// least-recently shown exact match instead of dead-ending. Criteria, age/rating,
// blocked categories and faith opt-in remain mandatory. This is deliberately a
// second-tier picker: normal unseen matching and live discovery always win.
function pickRecycledCatalog(cat, plat, mood, vibe, rating, decade) {
    const criteria = {cat, plat, mood, vibe, rating, decade: decade || window.getMatchCriteria?.().decade || []};
    const policy = window.matchPolicy;
    if (!policy || typeof policy.matchesCriteria !== 'function') return null;
    const wantsFaith = normCriteria(cat).includes('Gospel & Faith') || normCriteria(plat).some(p => ['Pure Flix','Angel Studios'].includes(p));
    const eligible = e => policy.matchesCriteria(e, criteria)
        && !isBlockedEntry(e)
        && (wantsFaith || !e.cats.includes('Gospel & Faith'))
        && (normCriteria(cat).length || isSurpriseEligible(e));

    // Explicit Not For Me choices remain hard exclusions even when history is
    // exhausted. Merely having been shown before is what becomes recyclable.
    const disliked = new Set();
    try {
        const rows = JSON.parse(window.localStorage.getItem('match_dislikedList') || '[]');
        (Array.isArray(rows) ? rows : []).forEach(item => disliked.add(policy.key(item && item.title ? item.title : item)));
    } catch (_) {}

    let pool = CONTENT_CATALOG.filter(e => eligible(e) && !disliked.has(policy.key(e.title)));
    if (!pool.length) return null;

    // Never immediately repeat the card on screen when another exact option exists.
    let currentTitle = '';
    try { currentTitle = (typeof globalMatchTitle !== 'undefined' && globalMatchTitle) || window.globalMatchTitle || ''; } catch (_) {}
    const currentKey = policy.key(currentTitle);
    const notCurrent = currentKey ? pool.filter(e => policy.key(e.title) !== currentKey) : pool;
    if (notCurrent.length) pool = notCurrent;

    // Prefer something not yet used in this tab. Only recycle a session title
    // once every exact alternative has also been used.
    const outsideSession = pool.filter(e => !SESSION_SHOWN.has(e.title));
    if (outsideSession.length) pool = outsideSession;

    let recentSource = [];
    try {
        recentSource = (typeof recentTitles !== 'undefined' && Array.isArray(recentTitles))
            ? recentTitles
            : JSON.parse(window.localStorage.getItem('match_recentTitles') || '[]');
    } catch (_) { recentSource = []; }
    const recentKeys = new Set(recentSource.map(t => policy.key(t)));
    const outsideRecent = pool.filter(e => !recentKeys.has(policy.key(e.title)));
    if (outsideRecent.length) pool = outsideRecent;

    // Oldest history first, maximising distance between two appearances.
    const shownAt = new Map();
    try {
        for (const item of policy.history?.() || []) {
            const k = policy.key(item && item.title);
            const at = Number(item && item.addedAt) || 0;
            if (k && (!shownAt.has(k) || shownAt.get(k) < at)) shownAt.set(k, at);
        }
    } catch (_) {}
    const recentOrder = new Map(recentSource.map((title,index) => [policy.key(title), index]));
    pool.sort((a,b) => {
        const ak=policy.key(a.title), bk=policy.key(b.title);
        const aa=shownAt.get(ak)||0, ba=shownAt.get(bk)||0;
        if (aa !== ba) return aa - ba;
        const ar=recentOrder.has(ak)?recentOrder.get(ak):Number.MAX_SAFE_INTEGER;
        const br=recentOrder.has(bk)?recentOrder.get(bk):Number.MAX_SAFE_INTEGER;
        if (ar !== br) return br - ar;
        return String(a.title).localeCompare(String(b.title));
    });

    const pick = pool[0];
    return {...pick,title:pick.title,synopsis:pick.synopsis,platform:pick.platform,platformVerified:true,watchUrl:pick.watchUrl||(pick.platform==='Roku Channel'?pick.url:null)||null,source:'catalog-recycle',_historyFallback:true};
}
`;
app=app.replace(marker,fallback+marker);
fs.writeFileSync('app.js',app);

mustReplace('app.js',
`    const preflight = isSpecificSearch ? null : pickFromCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade);
    const typed = document.getElementById('specific-search-input')?.value || '';`,
`    let preflight = isSpecificSearch ? null : pickFromCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade);
    // When the curated unseen pool is exhausted, try a fresh live title before
    // recycling history. iTunes cannot verify third-party platform availability,
    // so live discovery is used only when the platform filter is unconstrained.
    if (!isSpecificSearch && !preflight) {
        if (!normCriteria(requested.plat).length) {
            try { preflight = await discoverFromITunes(requested.cat,requested.mood,requested.vibe,requested.decade,requested.rating); }
            catch (_) { preflight = null; }
        }
        if (!preflight) preflight = pickRecycledCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade);
    }
    const typed = document.getElementById('specific-search-input')?.value || '';`,
'exhausted preflight recovery');

mustReplace('app.js',
`    if (!matchResult || window.matchPolicy?.known().has(window.matchPolicy.key(matchResult.title))) {`,
`    const resultWasKnown = !!(matchResult && window.matchPolicy?.known().has(window.matchPolicy.key(matchResult.title)));
    if (!matchResult || (resultWasKnown && !matchResult._historyFallback)) {`,
'allow marked recycled history result');

mustReplace('index.html','/matching-policy.js?v=199','/matching-policy.js?v=200','homepage policy cache bust');
mustReplace('index.html','/app.js?v=200','/app.js?v=201','homepage matcher cache bust');

let test=fs.readFileSync('tests/match-runtime-regression.test.cjs','utf8');
test=test.replace("vm.runInContext(functionSource('normCriteria')+functionSource('pickFromCatalog'),context);","vm.runInContext(functionSource('normCriteria')+functionSource('pickFromCatalog')+functionSource('pickRecycledCatalog'),context);");
if(!test.includes("functionSource('pickRecycledCatalog')")) throw new Error('test harness fallback function not loaded');

const oldAge=`test('an exhausted family selection cannot spend a match or silently drop the age restriction',async()=>{
 const excluded=catalog.filter(entry=>entry.ratings.includes('all ages family friendly')).map(entry=>entry.title);
 const {dom,w,state}=matching({cat:['movie'],plat:[],mood:[],vibe:[],rating:['all ages family friendly'],decade:[]},excluded);
 try{await w.triggerMatch(false);assert.equal(state.rendered,null,'no result may violate the requested age restriction');assert.equal(state.charges,0,'an empty exact search must not use credits');}finally{dom.window.close();}
});`;
const newAge=`test('history exhaustion recycles an exact family-safe title without dropping age restriction',async()=>{
 const excluded=catalog.filter(entry=>entry.ratings.includes('all ages family friendly')).map(entry=>entry.title);
 const {dom,w,state}=matching({cat:['movie'],plat:[],mood:[],vibe:[],rating:['all ages family friendly'],decade:[]},excluded);
 try{await w.triggerMatch(false);assert(state.rendered,'an exact previously shown title should be recycled instead of dead-ending');const entry=catalog.find(e=>e.title===state.rendered.title);assert(entry&&entry.cats.includes('movie'));assert(entry.ratings.includes('all ages family friendly'),'recovery must preserve the selected age/rating');assert.equal(state.rendered._historyFallback,true);assert.equal(state.charges,1);}finally{dom.window.close();}
});`;
if(!test.includes(oldAge)) throw new Error('old age exhaustion test not found');
test=test.replace(oldAge,newAge);

const oldHistory=`test('account history exhaustion cannot consume credits when no new title can be returned',async()=>{
 const {dom,w,state}=matching({cat:['movie'],plat:[],mood:['funny'],vibe:[],rating:[],decade:[]},catalog.map(entry=>entry.title));
 try{await w.triggerMatch(false);assert.equal(state.rendered,null);assert.equal(state.charges,0,'permanent exclusions count toward exhaustion before metering');assert.equal(w.document.getElementById('questionnaire-box').style.display,'block','an empty rematch restores the criteria');assert.equal(w.document.getElementById('search-box').style.display,'block');assert.equal(w.document.getElementById('loading-box').style.display,'none');}finally{dom.window.close();}
});`;
const newHistory=`test('account history exhaustion returns an exact recycled title instead of the no-fresh error',async()=>{
 const {dom,w,state}=matching({cat:['movie'],plat:[],mood:['funny'],vibe:[],rating:[],decade:[]},catalog.map(entry=>entry.title));
 try{await w.triggerMatch(false);assert(state.rendered,'history exhaustion must still produce a result');const entry=catalog.find(e=>e.title===state.rendered.title);assert(entry&&entry.cats.includes('movie'));assert(entry.moods.includes('funny'));assert.equal(state.rendered._historyFallback,true);assert.equal(state.charges,1);assert(!state.messages.includes('polish.noFresh'));}finally{dom.window.close();}
});`;
if(!test.includes(oldHistory)) throw new Error('old history exhaustion test not found');
test=test.replace(oldHistory,newHistory);

const insertBefore="test('removed catalogue options cannot remain as invisible saved search constraints'";
if(!test.includes(insertBefore)) throw new Error('test insertion anchor missing');
const extra=`test('truly impossible criteria still fail closed before spending a match',async()=>{
 const {dom,w,state}=matching({cat:['movie'],plat:['Impossible service'],mood:['funny'],vibe:[],rating:[],decade:[]},catalog.map(entry=>entry.title));
 try{await w.triggerMatch(false);assert.equal(state.rendered,null);assert.equal(state.charges,0);assert(state.messages.includes('polish.noFresh'));}finally{dom.window.close();}
});

test('recycled fallback preserves criteria and avoids the current title when another exact option exists',()=>{
 const requested={cat:['movie'],plat:[],mood:['funny'],vibe:[],rating:[],decade:[]};
 const {dom,w,context}=matching(requested,catalog.map(entry=>entry.title));
 try{const exact=catalog.filter(e=>w.matchPolicy.matchesCriteria(e,requested));assert(exact.length>=2,'test requires at least two funny movies');context.window.globalMatchTitle=exact[0].title;context.SESSION_SHOWN.add(exact[0].title);const pick=context.pickRecycledCatalog(requested.cat,requested.plat,requested.mood,requested.vibe,requested.rating,requested.decade);assert(pick);assert.equal(pick._historyFallback,true);assert(w.matchPolicy.matchesCriteria(catalog.find(e=>e.title===pick.title),requested));assert.notEqual(pick.title,exact[0].title);}
 finally{dom.window.close();}
});

`;
test=test.replace(insertBefore,extra+insertBefore);
fs.writeFileSync('tests/match-runtime-regression.test.cjs',test);

const checks={
  recycle:fs.readFileSync('app.js','utf8').includes('function pickRecycledCatalog('),
  criteriaOnly:fs.readFileSync('matching-policy.js','utf8').includes('function matchesCriteria(entry, criteria)'),
  policyVersion:fs.readFileSync('index.html','utf8').includes('/matching-policy.js?v=200'),
  appVersion:fs.readFileSync('index.html','utf8').includes('/app.js?v=201')
};
console.log('PATCH_VERIFY',checks);
if(Object.values(checks).some(v=>!v)) process.exit(2);
