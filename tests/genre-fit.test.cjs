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

test('comedy mood never returns a drama-format title',()=>{
  const w=boot();
  const dramaCats=new Set(['K-drama','C-drama','J-drama','telenovela','novela brasileira','vertical micro-drama','Turkish dizi']);
  for(const entry of catalog){
    const ok=w.matchPolicy.matches(entry,{mood:['funny'],cat:[],plat:[],vibe:[],rating:[],decade:[]});
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

test('guarantee layer and iTunes live search keep the comedy lock',()=>{
  const guarantee=read('match-guarantee.js');
  assert.match(guarantee,/pickFreshFitting/);
  assert.match(guarantee,/fitsQuestion/);
  assert.doesNotMatch(guarantee,/pickFresh\(true\)/);
  assert.doesNotMatch(guarantee,/catalog-last/);
  assert.match(app,/ITUNES_GENRE/);
  assert.match(app,/mood === 'funny'/);
  assert.match(app,/\/comedy\|stand\.\?up\|comic\/i/);
  const discover=read('discover.js');
  assert.match(discover,/enrichDiscoverItem/);
  assert.match(discover,/fitsQuestion/);
  assert.match(discover,/sameFamily/);
  const proxy=read('supabase/functions/gemini-proxy/index.ts');
  assert.match(proxy,/CRITICAL GENRE LOCK/);
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
