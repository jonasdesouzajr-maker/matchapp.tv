const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('homepage brand lockup is stable from first paint through late mobile CSS',()=>{
  const html=read('index.html');
  const brand=read('home-brand.css');
  const mobile=read('home-mobile.css');

  assert.match(html,/href="\/home-brand\.css\?v=\d+"/);
  assert.match(html,/matchapp-logo-animated\.svg\?v=5/);
  assert.match(brand,/#home-brand-lockup \.brand-logo[\s\S]*width:4\.5rem!important/);
  assert.match(brand,/First-paint size invariant/);
  assert.match(brand,/html body\.page-home #home-brand-lockup \.home-brand-home \.brand-logo/);
  assert.doesNotMatch(mobile,/brand-logo\{width:3\.45rem/);
  assert.match(brand,/@media \(max-width:1100px\)/);
  assert.match(brand,/@media \(max-width:720px\)/);
  assert.match(brand,/@media \(max-width:420px\)/);
  assert.match(brand,/@media \(min-width:1600px\)/);
  assert.match(brand,/@media \(min-width:2560px\)/);
  assert.match(brand,/@media \(prefers-reduced-motion:reduce\)/);
});

test('homepage Ai shortcut remains isolated from the logo and opens a new concierge chat',()=>{
  const html=read('index.html');
  const css=read('home-brand.css');
  const js=read('discover.js');

  assert.match(html,/class="home-ai-link" href="\/discover\.html\?focus=start&new=1"/);
  assert.match(html,/home-ai-default"[^>]*>Ai<\/span>/);
  assert.match(html,/home-ai-pt"[^>]*>iA<\/span>/);
  assert.match(css,/html\[lang="pt-BR"\][^\n]*\.home-ai-default\{display:none\}/);
  assert.match(css,/html\[lang="pt-BR"\][^\n]*\.home-ai-pt\{display:inline-block\}/);
  assert.match(js,/const forceNew = getQueryParam\('new'\) === '1'/);
  assert.match(js,/currentThread = null/);
});
