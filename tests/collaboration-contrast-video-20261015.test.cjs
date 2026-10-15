const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=f=>fs.readFileSync(f,'utf8');
const css=read('patches/collaboration-contrast-20261015.css');
test('video readability patch is limited to Match Together and Friends',()=>{
 assert.match(css,/body:not\(\.kids-body\):has\(#tg-step-start\) \.poster-wall-grid/);
 assert.match(css,/body:not\(\.kids-body\):has\(#friends-sign-in\) \.poster-wall-grid/);
 assert.doesNotMatch(css,/body\.page-home|adsbygoogle|ads-init|\.kids-body\s+\.poster-wall/);
 for(const path of ['together.html','friends.html']) {
  const html=read(path);
  assert.match(html,/\/patches\/collaboration-contrast-20261015\.css\?v=1/);
  assert.ok(html.indexOf('collaboration-contrast-20261015.css')<html.indexOf('</head>'));
 }
});
test('Friends header retains a single home navigation path',()=>{
 const html=read('friends.html');
 const nav=html.match(/<header>[\s\S]*?<nav>([\s\S]*?)<\/nav>/)?.[1];
 assert.ok(nav);
 assert.match(nav,/href="\/together\.html"/);
 assert.doesNotMatch(nav,/href="\/">Home<\/a>/);
 assert.match(html,/class="matchapp-brand-link"/);
});
