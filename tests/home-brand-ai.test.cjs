const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('homepage brand lockup is scoped, responsive and uses the searched display face',()=>{
  const html=read('index.html');
  const css=read('home-brand.css');

  assert.match(html,/id="home-brand-lockup"/);
  assert.match(html,/family=Inter[^"]*Space\+Grotesk/);
  assert.match(html,/href="\/home-brand\.css\?v=1"/);
  assert.match(html,/class="home-brand-match">MatchApp</);
  assert.match(html,/class="home-brand-tv">TV</);
  assert.doesNotMatch(html,/id="home-brand-lockup"[\s\S]{0,800}matchapp-tv-ai-v2\.svg/);

  assert.match(css,/font-family:'Space Grotesk'/);
  assert.match(css,/#home-brand-lockup \.brand-logo[\s\S]*width:4\.4rem!important/);
  assert.match(css,/@media \(max-width:1100px\)/);
  assert.match(css,/@media \(max-width:720px\)/);
  assert.match(css,/@media \(max-width:420px\)/);
  assert.match(css,/@media \(min-width:1600px\)/);
  assert.match(css,/@media \(min-width:2560px\)/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
});

test('homepage Ai word is localized to iA in pt-BR and only it starts a fresh AI chat',()=>{
  const html=read('index.html');
  const css=read('home-brand.css');
  const js=read('discover.js');

  assert.match(html,/class="home-ai-link" href="\/discover\.html\?focus=start&new=1"/);
  assert.match(html,/home-ai-default"[^>]*>Ai<\/span>/);
  assert.match(html,/home-ai-pt"[^>]*>iA<\/span>/);
  assert.match(css,/html\[lang="pt-BR"\][^\n]*\.home-ai-default\{display:none\}/);
  assert.match(css,/html\[lang="pt-BR"\][^\n]*\.home-ai-pt\{display:inline-block\}/);
  assert.match(css,/@keyframes homeAiOrbit/);
  assert.match(css,/@keyframes homeAiPulse/);
  assert.match(css,/@keyframes homeAiShimmer/);

  assert.match(js,/const forceNew = getQueryParam\('new'\) === '1'/);
  assert.match(js,/if \(forceNew\) \{/);
  assert.match(js,/currentThread = null/);
  assert.match(js,/No credit is consumed until the user actually asks/);
});
