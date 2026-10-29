const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const source=n=>fs.readFileSync(path.join(root,'lumina-match/browser',n),'utf8');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
function game(t,lang='en') {
 const dom=new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>',{url:'https://matchapp.tv/lumina-match/browser/index.html?lang='+lang,runScripts:'outside-only',pretendToBeVisual:true});
 t.after(()=>dom.window.close());
 const w=dom.window;
 w.LuminaAudio={unlock:()=>Promise.resolve(true),setActive(){},setTheme(){},play(){},getSettings(){return {sound:true,music:false,volume:.45};}};
 w.LuminaOnline={open(){},destroy(){},setLanguage(){}};
 for(const n of ['i18n.js','progress-i18n.js','campaign-i18n.js','campaign.js','lumina-game.js','responsive-fit.js','tutorial.js'])w.eval(source(n));
 return {w,app:w.document.getElementById('app')};
}
test('localized four-card guided level has no ads or progress mutation',async t=>{
 for(const lang of languages)await t.test(lang,async sub=>{
  const f=game(sub,lang);await Promise.resolve();
  const button=f.app.querySelector('[data-guide-open]');
  assert.ok(button,lang+' guide button');
  const before=JSON.stringify(f.w.LuminaGameProgress.snapshot());
  button.click();
  const dialog=f.w.document.querySelector('.lm-practice-dialog');
  assert.ok(dialog,lang+' guide dialog');
  assert.equal(dialog.querySelectorAll('.lm-practice-card').length,4);
  assert.equal(dialog.dir,lang==='ar'?'rtl':'ltr');
  const groups=new Map();
  for(const card of dialog.querySelectorAll('[data-practice]')){
   const art=card.querySelector('.front').style.backgroundImage;
   if(!groups.has(art))groups.set(art,[]);
   groups.get(art).push(card);
  }
  assert.equal(groups.size,2);
  for(const pair of groups.values()){const ids=pair.map(el=>el.dataset.practice);for(const id of ids){dialog.querySelector('[data-practice="'+id+'"]').click();}}
  assert.equal(dialog.querySelectorAll('.matched').length,4);
  assert.equal(JSON.stringify(f.w.LuminaGameProgress.snapshot()),before,lang+' must not grant progress');
  dialog.querySelector('[data-guide-reset]').click();
  assert.equal(dialog.querySelectorAll('.matched').length,0);
  dialog.querySelector('[data-guide-dismiss]').click();
  assert.equal(f.w.document.querySelector('.lm-practice-dialog'),null);
 });
});
test('Brazilian Portuguese shows its own tutorial, not English fallback',async t=>{
 const f=game(t,'pt-BR');await Promise.resolve();
 assert.equal(f.app.querySelector('[data-guide-open]').textContent,'Guia para iniciantes');
 f.app.querySelector('[data-guide-open]').click();
 assert.match(f.w.document.querySelector('[data-guide-status]').textContent,/Vire duas cartas/);
});
test('no scroll contract is scoped and all cards fit by choosing an actual grid',async t=>{
 const f=game(t);await Promise.resolve();
 f.app.querySelector('[data-action="campaign"]').click();
 await Promise.resolve();
 assert.equal(f.app.dataset.screen,'game');
 const area=f.app.querySelector('.board-area');
 Object.defineProperty(area,'clientWidth',{get:()=>320});
 Object.defineProperty(area,'clientHeight',{get:()=>340});
 f.w.requestAnimationFrame=cb=>{cb();return 0;};
 f.w.dispatchEvent(new f.w.Event('resize'));
 await new Promise(resolve=>setTimeout(resolve,50));
 const grid=area.querySelector('.grid'),cols=Number(grid.style.getPropertyValue('--fit-columns'));
 const size=Number.parseFloat(grid.style.getPropertyValue('--fit-card-width'));
 assert.ok(cols>=2&&cols<=16);
 assert.ok(size>=10&&size<=110);
 assert.equal(grid.querySelectorAll('.card').length,8);
 const css=source('no-scroll.css');
 assert.match(css,/html,body\s*\{[^}]*overflow:hidden!important/s);
 assert.match(css,/#app\[data-screen="game"\] \.board-area\s*\{[^}]*overflow:hidden!important/s);
 assert.match(css,/#app\[data-screen="levels"\]>.level-screen/);
 assert.match(css,/\.lm-practice-dialog/);
});
test('new browser assets are loaded without an advertising SDK',()=>{
 const html=source('index.html');
 for(const asset of ['no-scroll.css','tutorial.js','responsive-fit.js'])assert.ok(html.includes(asset));
 assert.ok(fs.readFileSync(path.join(root,'lumina-match/game.mjs'),'utf8').includes('20261029-1'));
 assert.doesNotMatch(source('tutorial.js'),/adsbygoogle|InterstitialAd|RewardedAd|localStorage|sessionStorage/);
});