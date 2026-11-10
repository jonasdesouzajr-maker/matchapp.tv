const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('android-studio/app/src/main/assets/android-premium-shell.js','utf8');
const save=source.slice(source.indexOf('  function saveAppearance('),source.indexOf('  function mountAppearance('));
test('editorial theme buttons preserve other preferences and notify the shared palette',()=>{
  const dom=new JSDOM('',{url:'https://matchapp.tv/explore.html',runScripts:'outside-only'}),w=dom.window;
  try{
    const preferences={theme:'aurora',fontScale:1.2,autoRead:false,blockedGenres:['horror']};
    w.localStorage.setItem('match_settings',JSON.stringify(preferences));
    const events=[];w.document.addEventListener('matchapp:settingschanged',e=>events.push(e.detail));
    w.eval(save+';window.saveAppearance=saveAppearance;');w.saveAppearance('sunrise');
    assert.deepEqual(JSON.parse(w.localStorage.getItem('match_settings')),{...preferences,theme:'sunrise'});
    assert.equal(w.document.documentElement.dataset.theme,'sunrise');
    assert.equal(events.length,1);assert.equal(events[0].value,'sunrise');
    w.saveAppearance('invalid');assert.equal(events.length,1);
  }finally{w.close()}
});
test('Home theme buttons retain the canonical settings owner',()=>{
  const dom=new JSDOM('',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
  try{
    const calls=[];w.MatchSettings={set:(...args)=>calls.push(args)};
    w.eval(save+';window.saveAppearance=saveAppearance;');w.saveAppearance('aurora');
    assert.deepEqual(calls,[['theme','aurora']]);assert.equal(w.localStorage.getItem('match_settings'),null);
  }finally{w.close()}
});
