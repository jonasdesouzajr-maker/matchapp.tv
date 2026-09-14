const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const bootstrap=app.slice(app.indexOf('const SUPABASE_URL'),app.indexOf('// THE LIMIT LOGIC'));
function start(entries){const saved=new Map(entries),context=vm.createContext({window:{},localStorage:{getItem:key=>saved.get(key)??null},console});vm.runInContext(bootstrap+'\nwindow.lists={seenList,savedList,dislikedList,userRatings,recentTitles};',context);return {lists:JSON.parse(JSON.stringify(context.window.lists)),saved};}

test('a broken optional cache cannot stop startup or discard valid saved and seen titles',()=>{
 const entries=[['match_seenList','["A Classic",{"title":"A New Film","posterUrl":"/cover.jpg"}]'],['match_savedList','[{"title":"For Later"}]'],['match_dislikedList','{broken'],['match_userRatings','null'],['match_recentTitles','"wrong shape"']];
 const {lists,saved}=start(entries);
 assert.deepEqual(lists.seenList,['A Classic',{title:'A New Film',posterUrl:'/cover.jpg'}]);assert.deepEqual(lists.savedList,[{title:'For Later'}]);assert.deepEqual(lists.dislikedList,[]);assert.deepEqual(lists.userRatings,{});assert.deepEqual(lists.recentTitles,[]);
 assert.deepEqual([...saved],entries,'startup must leave the original cache available for account restoration');
});

test('invalid entries are isolated while valid legacy titles, ratings and permanent exclusions survive',async()=>{
 const {lists}=start([['match_seenList','[null,42,"A Classic",{"title":"A New Film"},{}]'],['match_savedList','{}'],['match_userRatings','{"Loved Film":"loved"}']]);
 assert.deepEqual(lists.seenList,['A Classic',{title:'A New Film'}]);assert.deepEqual(lists.savedList,[]);assert.deepEqual(lists.userRatings,{'Loved Film':'loved'});
 const d=new JSDOM('',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=d.window;
 w.localStorage.setItem('match_seenList','[null,"A Classic",{"title":"A New Film"}]');w.localStorage.setItem('match_savedList','{}');w.localStorage.setItem('match_dislikedList','broken');w.localStorage.setItem('match_userRatings','{"Loved Film":"loved"}');
 w.localStorage.setItem('match_exclusions_alice','[null,"permanenttitle"]');w.localStorage.setItem('match_history_alice','[null,{"title":"Permanent Title","action":"seen","addedAt":5}]');
 w.supabaseClient={rpc:async()=>({data:{keys:[],history:[]}})};w.eval(fs.readFileSync(path.join(root,'matching-policy.js'),'utf8'));await w.matchPolicy.attach({id:'alice'});
 for(const title of ['A Classic','A New Film','Loved Film','Permanent Title'])assert(w.matchPolicy.known().has(w.matchPolicy.key(title)),title+' should stay excluded');
 assert(w.matchPolicy.history().some(item=>item.title==='Permanent Title'));assert.equal(w.localStorage.getItem('match_savedList'),'{}');w.close();
});
