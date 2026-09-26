const{test}=require('node:test');const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('awareness spotlight follows the current verified calendar record',()=>{
  const c=JSON.parse(read('awareness/current.json')).campaign,calendar=JSON.parse(read('awareness/calendar.json'));
  if(!c)return; // No verified active campaign is a permitted state.
  const entry=calendar.events.find(e=>e.key===c.key);
  assert.ok(entry,'Campaign must come from the vetted calendar');
  assert.equal(c.id,entry.key+'-'+c.year);
  assert.equal(c.sourceUrl,entry.sourceUrl);
  assert.ok(c.endExclusive>c.startDate,'Campaign must have a bounded lifespan');
});

test('home awareness is localized, date-gated and matches committed campaign',()=>{
  const h=read('index.html'),j=read('awareness.js'),css=read('awareness.css');
  const c=JSON.parse(read('awareness/current.json')).campaign;
  assert.match(h,/AWARENESS-SPOTLIGHT:START/);
  if(c){
    assert.ok(h.includes('data-awareness-start="'+c.startDate+'"'));
    assert.ok(h.includes('data-awareness-end="'+c.endExclusive+'"'));
    assert.ok(h.includes(c.pageUrl));
  }else assert.doesNotMatch(h,/id="awareness-spotlight"/);
  assert.match(h,/\/awareness\.js\?v=20260926-bottom2/);
  assert.match(j,/today>=c\.startDate&&today<c\.endExclusive|t>=c\.startDate&&t<c\.endExclusive/);
  assert.match(j,/pt-BR/);
  assert.doesNotMatch(j,/setInterval|requestAnimationFrame/);
  assert.match(css,/prefers-reduced-motion/);
});

test('Alzheimer SEO page uses authoritative sources without partnership claim',()=>{const p=read('awareness/world-alzheimers-month-2026/index.html');assert.match(p,/World Alzheimer’s Month 2026/);assert.match(p,/The Earlier You Know, The More You Can Do/);assert.match(p,/September 21, 2026/);assert.match(p,/alzint\.org/);assert.match(p,/who\.int\/publications/);assert.match(p,/not claiming an official partnership/i);});
test('bot is authoritative-source gated and controls expiry SEO',()=>{const b=read('tools/awareness-bot.mjs'),w=read('.github/workflows/awareness-rotation.yml'),s=read('tools/update-sitemap.js');for(const x of['who.int','alzint.org','un.org','worldcancerday.org'])assert.match(b,new RegExp(x.replaceAll('.','\\.')));assert.match(b,/noindex,follow/);assert.match(b,/syncHome/);assert.match(w,/git push origin HEAD:main/);assert.match(s,/awareness-urls\.json/);});
test('Awareness spotlight stays at the bottom above SEO footer on each scheduled refresh',()=>{
 const h=read('index.html'),bot=read('tools/awareness-bot.mjs'),start=h.indexOf('<!-- AWARENESS-SPOTLIGHT:START -->');
 assert.ok(start>h.indexOf('</main>'),'Spotlight must follow the complete homepage main content');
 assert.ok(start<h.indexOf('<footer class="seo-footer">'),'Spotlight must precede the footer');
 assert.equal((h.match(/<!-- AWARENESS-SPOTLIGHT:START -->/g)||[]).length,1);
 assert.ok(bot.includes("s=s.replace(footer,block(c)+'\\n\\n'+footer)"),'Bot must regenerate spotlight by the bottom footer');
 assert.ok(!bot.includes("m+'\\n'+block(c)"),'Bot must not regenerate spotlight under the header');
});


test('Live awareness refresh moves stale top card to bottom and never recreates one beneath header',async()=>{
 const {JSDOM}=require('jsdom');
 const {window:w}=new JSDOM('<!doctype html><html><body><header id="mh-topbox"></header><aside id="awareness-spotlight"><div class="awareness-card"><span class="awareness-eyebrow"></span><strong class="awareness-title"></strong><span class="awareness-body"></span><a class="awareness-cta"></a></div></aside><main></main><footer class="seo-footer"></footer></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 w.fetch=async(url)=>({ok:true,json:async()=>url.includes('current.json')?{campaign:{name:'World Alzheimer’s Month',startDate:'2026-01-01',endExclusive:'2099-01-01',pageUrl:'/awareness/world-alzheimers-month-2026/'}}:{events:[]}});
 w.eval(read('awareness.js'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 await new Promise(resolve=>setTimeout(resolve,0));
 const a=w.document.getElementById('awareness-spotlight'),f=w.document.querySelector('footer.seo-footer');
 assert.equal(a.nextElementSibling,f,'Runtime reparent must keep the awareness card above the actual footer');
 assert.equal(w.document.querySelectorAll('#awareness-spotlight').length,1,'Must never duplicate awareness card');
 w.close();
});
