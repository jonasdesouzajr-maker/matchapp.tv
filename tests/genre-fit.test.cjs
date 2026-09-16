const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const app=read('app.js').replace(/\r\n/g,'\n');
const catalog=vm.runInNewContext(app.match(/const CONTENT_CATALOG = (\[[\s\S]*?\n\]);/)[1]);

function boot(){
  const store={};
  const localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
  const window={
    localStorage,
    addEventListener(){},
    supabaseClient:null,
    CONTENT_CATALOG:catalog
  };
  window.window=window;
  const ctx=vm.createContext({
    window, document:{dispatchEvent(){}}, localStorage, CONTENT_CATALOG:catalog,
    Set, Map, JSON, Object, Array, Number, String, Promise, setTimeout, console
  });
  vm.runInContext(read('matching-policy.js'), ctx);
  return ctx.window;
}

const comedy={mood:['funny'],cat:[],plat:[],vibe:[],rating:[],decade:[]};
const romantic={mood:['romantic'],cat:[],plat:[],vibe:[],rating:[],decade:[]};
const light={mood:['light and feel-good'],cat:[],plat:[],vibe:[],rating:[],decade:[]};

test('comedy mood never returns a drama-format title',()=>{
  const w=boot();
  const dramaCats=new Set(['K-drama','C-drama','J-drama','telenovela','novela brasileira','vertical micro-drama','Turkish dizi']);
  for(const entry of catalog){
    const ok=w.matchPolicy.matches(entry,comedy);
    if(!ok) continue;
    assert(!entry.cats.some(c=>dramaCats.has(c)), entry.title+' is a drama format tagged as comedy');
    assert(entry.moods.includes('funny') || entry.cats.includes('stand-up comedy special'), entry.title+' matched comedy without a comedy signal');
    assert(!['scary','dark and gritty','intense and thrilling','heartbreaking'].includes(entry.moods[0]), entry.title+' is a heavy drama with garnish funny');
  }
});

test('K-drama criteria never returns stand-up comedy',()=>{
  const w=boot();
  for(const entry of catalog){
    const ok=w.matchPolicy.matches(entry,{mood:[],cat:['K-drama'],plat:[],vibe:[],rating:[],decade:[]});
    if(!ok) continue;
    assert(entry.cats.includes('K-drama'), entry.title);
    assert(!entry.cats.includes('stand-up comedy special'), entry.title);
  }
});

test('Ask AI comedy questions reject dramas and accept comedies',()=>{
  const w=boot();
  assert(w.matchPolicy.fitsQuestion({title:'Ted Lasso',moods:['funny'],cats:['series']},'a funny comedy'));
  assert(!w.matchPolicy.fitsQuestion({title:'Queen of Tears',cats:['K-drama','series'],moods:['romantic','heartbreaking']},'a funny comedy'));
  assert(!w.matchPolicy.fitsQuestion({title:'Fallout',cats:['series'],moods:['dark and gritty','intense and thrilling']},'comédia'));
  assert(w.matchPolicy.fitsQuestion({title:'John Mulaney: Baby J',cats:['stand-up comedy special'],moods:['funny']},'stand-up comedy'));
  assert(w.matchPolicy.sameFamily({title:'Deadpool & Wolverine',moods:['funny'],cats:['movie']},{title:'Nimona',moods:['funny'],cats:['movie']}));
  assert(!w.matchPolicy.sameFamily({title:'Deadpool & Wolverine',moods:['funny'],cats:['movie']},{title:'Queen of Tears',cats:['K-drama'],moods:['romantic']}));
});

test('genre scoring ignores garnish humor, comic books and sketch artists',()=>{
  const w=boot();
  const p=w.matchPolicy;
  assert(!p.fitsQuestion({title:'Sketch Artist',type:'drama',synopsis:'A police sketch artist hunts a killer in this crime drama.'},'a funny comedy'));
  assert(!p.fitsQuestion({title:'Comic Book Movie',synopsis:'A comic book origin story of a hero.'},'a funny comedy'));
  assert(!p.fitsQuestion({title:'Unknown Mix',type:'drama',synopsis:'A dramatic story with hilarious funny moments and comedy.'},'a funny comedy'));
  assert(!p.fitsQuestion({title:'War Laughs',synopsis:'They laugh in the face of death in this war drama.'},'a funny comedy'));
  assert(p.fitsQuestion({title:'Unknown Laughs',type:'series',synopsis:'A hilarious sitcom about a football coach.'},'a funny comedy'));
  assert(p.fitsQuestion({title:'Dark Comedy',synopsis:'A dark comedy about grief.'},'a funny comedy'));
  assert(!p.fitsQuestion({title:'Unknown Laughs',type:'series',synopsis:'A hilarious sitcom about a football coach.'},'a serious drama'));
  assert.equal(p.intentFromText('comic book').families.has('comedy'), false);
  assert.equal(p.intentFromText('a funny comedy').families.has('comedy'), true);
  assert.equal(p.comedyLocked({title:'MrBeast',moods:['intense and thrilling','funny'],cats:['YouTube channel']}), false);
  assert.equal(p.comedyLocked({title:'Ted Lasso',moods:['funny','light and feel-good'],cats:['series']}), true);
  assert.equal(p.comedyLocked({title:'The Bear',moods:['intense and thrilling','dark and gritty'],cats:['series']}), false);
});

test('romantic and feel-good still match K-dramas; comedy does not',()=>{
  const w=boot();
  const qot=catalog.find(e=>e.title==='Queen of Tears');
  const crash=catalog.find(e=>e.title==='Crash Landing on You');
  const proposal=catalog.find(e=>e.title==='Business Proposal');
  assert(qot && crash && proposal);
  assert(!w.matchPolicy.matches(qot,comedy), 'Queen of Tears must not match comedy');
  assert(w.matchPolicy.matches(qot,romantic), 'Queen of Tears should match romantic');
  assert(w.matchPolicy.matches(crash,romantic), 'Crash Landing on You should match romantic');
  assert(w.matchPolicy.matches(proposal,light), 'Business Proposal should match light feel-good');
  assert(!w.matchPolicy.fitsQuestion(qot,'a funny comedy'));
  assert(w.matchPolicy.fitsQuestion(qot,'a romantic k-drama'));
});

test('sameFamily uses primary genre, not garnish funny',()=>{
  const w=boot();
  const p=w.matchPolicy;
  assert(!p.sameFamily(
    {title:'Deadpool & Wolverine',moods:['funny'],cats:['movie']},
    {title:'MrBeast',moods:['intense and thrilling','funny'],cats:['YouTube channel']}
  ));
  assert(p.sameFamily(
    {title:'Deadpool & Wolverine',moods:['funny'],cats:['movie']},
    {title:'Ted Lasso',moods:['funny','light and feel-good'],cats:['series']}
  ));
});

test('guarantee layer and iTunes live search keep the comedy lock',()=>{
  const guarantee=read('match-guarantee.js');
  assert.match(guarantee,/pickFreshFitting/);
  assert.match(guarantee,/fitsQuestion/);
  assert.match(guarantee,/genreFits\(hit, criteria\)/);
  assert.doesNotMatch(guarantee,/pickFresh\(true\)/);
  assert.doesNotMatch(guarantee,/catalog-last/);
  assert.match(app,/ITUNES_GENRE/);
  assert.match(app,/mood === 'funny'/);
  assert.match(app,/\/comedy\|stand\.\?up\/i/);
  assert.doesNotMatch(app,/\/comedy\|stand\.\?up\|comic\/i/);
  const discover=read('discover.js');
  assert.match(discover,/enrichDiscoverItem/);
  assert.match(discover,/fitsQuestion/);
  assert.match(discover,/sameFamily/);
  assert.match(discover,/FORMAT_CATS/);
  assert.match(discover,/x\.s >= 16/);
  const proxy=read('supabase/functions/gemini-proxy/index.ts');
  assert.match(proxy,/CRITICAL GENRE LOCK/);
  assert.match(proxy,/PRIMARY genre/);
});

test('catalog comedies still have covers, synopsis and a platform',()=>{
  const funny=catalog.filter(e=>e.moods && e.moods[0]==='funny');
  assert(funny.length>=8);
  for(const e of funny){
    assert(e.title);
    assert(e.synopsis && e.synopsis.length>20, e.title);
    assert(e.platform, e.title);
    assert(Array.isArray(e.cats) && e.cats.length, e.title);
  }
});
