const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('android-studio/app/src/main/assets/android-premium-shell.js','utf8');
const render=source.slice(source.indexOf('  const cinemaOverrides='),source.indexOf('  let refreshQueued='));
// Chromium exposes these empty longhands until the custom property resolves.
function declaration(values,enumerated=Object.keys(values)){
  return Object.assign([...enumerated],{getPropertyValue:key=>values[key]||''});
}
test('variable surfaces survive CSSOM expansion and keep their capsule corners',()=>{
  const dom=new JSDOM('<body><button>Light</button></body>',{runScripts:'outside-only'});
  try{
    const w=dom.window,button=w.document.querySelector('button');
    const rules=[
      {selectorText:'button',style:declaration({'background-color':'rgb(20, 10, 30)','border-radius':'999px','border-color':'purple'})},
      {selectorText:'button',style:declaration({'background':'var(--surface)','border':'1px solid var(--line)'},['background-color','background-image','border-top-width','border-top-color'])}
    ];
    const sheet={cssRules:[{name:'matchappAndroidCinema',cssRules:rules}]};
    w.qs=()=>({sheet});w.qsa=s=>[...w.document.querySelectorAll(s)];
    w.eval(render+';window.paint=polishCinemaSurfaces;');w.paint();
    assert.equal(button.style.background,'var(--surface)');
    assert.equal(button.style.border,'1px solid var(--line)');
    assert.equal(button.style.borderRadius,'999px');
    const first=button.style.cssText;w.paint();assert.equal(button.style.cssText,first);
    rules.pop();w.paint();assert.equal(button.style.backgroundColor,'rgb(20, 10, 30)');
  }finally{dom.window.close()}
});
