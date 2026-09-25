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
  assert.match(h,/\/awareness\.js\?v=20260922-awareness1/);
  assert.match(j,/today>=c\.startDate&&today<c\.endExclusive|t>=c\.startDate&&t<c\.endExclusive/);
  assert.match(j,/pt-BR/);
  assert.doesNotMatch(j,/setInterval|requestAnimationFrame/);
  assert.match(css,/prefers-reduced-motion/);
});

test('Alzheimer SEO page uses authoritative sources without partnership claim',()=>{const p=read('awareness/world-alzheimers-month-2026/index.html');assert.match(p,/World Alzheimer’s Month 2026/);assert.match(p,/The Earlier You Know, The More You Can Do/);assert.match(p,/September 21, 2026/);assert.match(p,/alzint\.org/);assert.match(p,/who\.int\/publications/);assert.match(p,/not claiming an official partnership/i);});
test('bot is authoritative-source gated and controls expiry SEO',()=>{const b=read('tools/awareness-bot.mjs'),w=read('.github/workflows/awareness-rotation.yml'),s=read('tools/update-sitemap.js');for(const x of['who.int','alzint.org','un.org','worldcancerday.org'])assert.match(b,new RegExp(x.replaceAll('.','\\.')));assert.match(b,/noindex,follow/);assert.match(b,/syncHome/);assert.match(w,/git push origin HEAD:main/);assert.match(s,/awareness-urls\.json/);});