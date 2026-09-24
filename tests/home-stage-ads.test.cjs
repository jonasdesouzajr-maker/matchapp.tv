const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('Home top-level fold bars share the full Match/Ask stage width',()=>{
  const css=read('matchapp-ia.css');
  const pass=css.slice(css.indexOf('2026-09-21 coherent Home stage + AdSense placement pass'));
  assert.match(pass,/\.lazy-head\[data-fold-key="concierge"\]/);
  assert.match(pass,/\.lazy-head\[data-fold-key="together"\]/);
  assert.match(pass,/#premiere-disclosure>summary/);
  assert.match(pass,/#weekly-pick-disclosure>summary/);
  assert.match(pass,/width:100%!important;[\s\S]*max-width:100%!important/);
});

test('Home matcher keeps Mood, Format and Platform inside with compact gaps',()=>{
  const css=read('matchapp-ia.css');
  const pass=css.slice(css.indexOf('2026-09-21 coherent Home stage + AdSense placement pass'));
  assert.match(pass,/\.ma-concierge #questionnaire-box\{[\s\S]*padding:10px 12px 12px!important/);
  assert.match(pass,/\.ma-concierge \.ma-filter-row\{[\s\S]*gap:6px!important/);
  assert.match(pass,/\.ma-concierge \.ma-filter-label\{[\s\S]*padding:0 4px 2px!important/);
  assert.match(pass,/\.ma-concierge \.ma-chip-row\{[\s\S]*gap:6px!important/);
});

test('Home keeps two desktop AdSense rails and three subtle tablet/mobile in-flow slots',()=>{
  const html=read('index.html');
  const css=read('matchapp-ia.css');
  const ia=read('matchapp-ia.js');
  assert.equal((html.match(/class="sidebar-ad-left premium-ad-frame"/g)||[]).length,1);
  assert.equal((html.match(/class="sidebar-ad-right premium-ad-frame"/g)||[]).length,1);
  assert.equal((html.match(/class="ad-banner-container premium-ad-frame/g)||[]).length,3);
  assert.equal((html.match(/class="ad-banner-container premium-ad-frame ma-together-ad"/g)||[]).length,1);
  assert.match(html,/ma-together-ad[\s\S]*style="display:block; width:100%; min-height:120px;"[\s\S]*data-ad-format="auto"[\s\S]*data-full-width-responsive="true"/);
  const leftAt=html.indexOf('class="sidebar-ad-left premium-ad-frame"');
  const rightAt=html.indexOf('class="sidebar-ad-right premium-ad-frame"');
  const contentAt=html.indexOf('<section class="container">',leftAt);
  assert.ok(leftAt>=0&&rightAt>leftAt&&contentAt>rightAt,'desktop side rails must be adjacent before in-content ad units so both initialize');
  const pass=css.slice(css.indexOf('2026-09-21 coherent Home stage + AdSense placement pass'));
  assert.match(pass,/@media\(min-width:1180px\)[\s\S]*sidebar-ad-left[\s\S]*sidebar-ad-right[\s\S]*display:flex!important/);
  assert.match(pass,/@media\(max-width:767px\)[\s\S]*ad-banner-container\.ma-inline-ad[\s\S]*min-height:92px!important/);
  assert.match(ia,/ads\.forEach\(ad=>ad\.classList\.add\('ma-inline-ad'\)\)/);
  assert.match(ia,/if\(trending\)\{after\(hero,trending\);after\(trending,concierge\)\}/,'Top Titles must flow directly into the primary Match/Ai action');
  assert.doesNotMatch(ia,/if\(ads\[0\]&&trending\)after\(trending,ads\[0\]\)/,'no ad may be injected between Top Titles and the primary action');
  assert.match(ia,/if\(ads\[1\]&&week\)after\(week,ads\[1\]\)/);
  assert.match(ia,/if\(ads\[2\]\)after\(events\|\|swift\|\|anchor,ads\[2\]\)/);
});

test('screenshot regression: collapsed headers are not capped narrower than opened stage',()=>{
  const css=read('matchapp-ia.css');
  const pass=css.slice(css.indexOf('2026-09-21 screenshot geometry correction'));
  assert.match(pass,/\.lazy-head\[data-fold-key="concierge"\]/);
  assert.match(pass,/\.lazy-head\[data-fold-key="together"\]/);
  assert.match(pass,/#premiere-disclosure>summary/);
  assert.match(pass,/#weekly-pick-disclosure>summary/);
  assert.match(pass,/max-width:none!important/);
  assert.doesNotMatch(pass,/720px/);
});

test('screenshot regression: Mood Format Platform have visible inner inset',()=>{
  const css=read('matchapp-ia.css');
  const pass=css.slice(css.indexOf('2026-09-21 screenshot geometry correction'));
  assert.match(pass,/#questionnaire-box\{[\s\S]*padding:16px 16px 14px!important/);
  assert.match(pass,/\.ma-filter-label\{[\s\S]*padding:0 6px 2px!important/);
  assert.match(pass,/\.ma-chip-row\{[\s\S]*padding:2px 6px 4px!important/);
  assert.match(pass,/\.ma-filter-row:first-child\{[\s\S]*padding-top:6px!important/);
});

test('homepage does not suppress desktop rails and keeps mobile responsive slots unconstrained',()=>{
  const html=read('index.html');
  const compact=html.slice(html.indexOf('<style id="mh-compact">'),html.indexOf('</style>',html.indexOf('<style id="mh-compact">')));
  assert.doesNotMatch(compact,/sidebar-ad-left[^\n]*sidebar-ad-right\s*\{\s*display:\s*none\s*!important;\s*\}/,'desktop rails must not be globally hidden');
  assert.match(compact,/@media\(max-width:1179px\)[\s\S]*sidebar-ad-left[\s\S]*display:none!important/);
  const guard=html.slice(html.indexOf('<style id="mobile-ad-blank-guard">'),html.indexOf('</style>',html.indexOf('<style id="mobile-ad-blank-guard">')));
  assert.doesNotMatch(guard,/min-height:250px/,'mobile AdSense must not be forced into a 250px creative box');
  assert.match(guard,/ma-inline-ad ins\.adsbygoogle[\s\S]*width:100%/);
  assert.match(html,/\/ads-init\.js\?v=20260924-ads2/);
  const init=read('ads-init.js');
  assert.match(init,/\.push\(\{\}\)/,'manual AdSense requests use Google's standard initializer');
  assert.doesNotMatch(init,/push\(\{element:slot\}\)/,'unsupported element-targeted pushes must not return');
  assert.match(html,/\/home-8k-layout\.css\?v=20260924-adfull1/);
  const layout=read('home-8k-layout.css');
  assert.match(layout,/@media\(min-width:1180px\)[\s\S]*\.ad-banner-container\.ma-together-ad\{[\s\S]*min-height:148px!important[\s\S]*ins\.adsbygoogle\{[\s\S]*width:100%!important[\s\S]*min-height:120px!important/);
});
