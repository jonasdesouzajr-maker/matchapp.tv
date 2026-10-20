'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {cinemaAssets}=require('../tools/finalize-brand.js');
const sourceBody=String.raw`<body data-source="🎬 > original">
 <main data-title-id="verified-123"><img src="https://publisher.test/original.jpg" width="800" height="1200" alt="Original &amp; exact title"><button id="original-action" onclick="originalAction()">Choose</button><a href="/discover.html?q=Original%20title">Watch</a><input value="Saved field"></main>
 <ins class="adsbygoogle" style="display:block;min-height:250px" data-ad-slot="2595698117"></ins>
 <!-- <style data-cinema-layer>fake comment</style><script src="/patches/reference-system.js">example</script> -->
 <script id="original-inline">const example = '<script src="/patches/reference-system.js">example<\/script>'; const css = '<style data-cinema-layer>example</style>'; window.original = 1;</script>
 <script type="application/ld+json">{"example":"<link href='/patches/reference-home.css'>","sourceId":"verified-123"}</script>
 <template><style data-cinema-layer>template example</style><script src="/patches/reference-system.js"></script><link rel="stylesheet" href="/patches/reference-home.css"></template>
 <svg xmlns="http://www.w3.org/2000/svg"><style data-cinema-layer>.source{fill:red}</style></svg>
</body>`;
function document(head,body=sourceBody){return '<!doctype html><html lang="ar" dir="rtl" data-example="class=\'example\' > 🎬"><head>'+head+'</head>'+body+'</html>';}
function inspect(html,fn){const dom=new JSDOM(html);try{return fn(dom.window.document);}finally{dom.window.close();}}

test('only real owned hooks change; raw body, source art, ads and dormant examples stay byte-identical',()=>{
 const untouched='<meta name="source" content="<style data-cinema-layer>literal</style>"><style data-cinema-layered>.original{color:red}</style><script data-src="/patches/reference-system.js">/* Original inline source. */</script><script src="/constructor"></script>';
 const input=document(untouched),output=cinemaAssets(input,'news/example/index.html');
 assert.ok(output.includes(sourceBody),'every original body byte survives, including raw script text and template contents');
 assert.ok(output.includes(untouched),'unowned metadata, inline scripts and similarly named attributes remain exact');
 assert.equal(cinemaAssets(output,'news/example/index.html'),output);
 inspect(output,doc=>{assert.equal(doc.documentElement.getAttribute('data-example'),"class='example' > 🎬");assert.ok(doc.documentElement.classList.contains('ma-reference'));assert.equal(doc.head.querySelectorAll('style[data-cinema-layer]').length,1);assert.equal(doc.head.querySelectorAll('script[src^="/patches/reference-system.js"]').length,1);});
});

test('complete parser ranges repair duplicate CRLF hooks without offset drift or unrelated attribute reformatting',()=>{
 const hooks='\r\n<style data-cinema-layer>@layer obsolete;</style>\r\n<style data-cinema-layer>@layer duplicate;</style><LINK REL=StyleSheet HREF=/patches/reference-system.css?v=keep data-note="a > b"><link rel="stylesheet" href="/patches/reference-home.css?v=family"><link rel="stylesheet" href="/patches/reference-pages.css?v=duplicate"><SCRIPT SRC=/patches/reference-system.js?v=script data-defer="example" nonce=\'keep > exact\' integrity="sha256-original"></SCRIPT><script src="/patches/reference-system.js?v=duplicate"></script>';
 const body=sourceBody.replace(/\n/g,'\r\n'),input=document(hooks,body),output=cinemaAssets(input,'founder/index.html');
 assert.ok(output.includes(body));assert.ok(output.includes('data-note="a > b"'));assert.ok(output.includes('data-defer="example" nonce=\'keep > exact\' integrity="sha256-original"'));
 inspect(output,doc=>{assert.equal(doc.head.firstElementChild.textContent,'@layer ma-reference;');assert.equal(doc.head.querySelectorAll('style[data-cinema-layer]').length,1);assert.equal(doc.head.querySelectorAll('script[src^="/patches/reference-system.js"]').length,1);assert.equal(doc.head.querySelector('script[src^="/patches/reference-system.js"]').defer,true);assert.equal(doc.head.querySelectorAll('link[rel="stylesheet"][href^="/patches/reference-pages.css"]').length,1);});
 assert.equal(cinemaAssets(output,'founder/index.html'),output,'deletions and head-start insertion remain byte-idempotent');
});

test('URL versions preserve unknown parameters, encoded quotes and fragments after one HTML decode',()=>{
 const input=document('<link rel="stylesheet" href="/brand.css?v=keep&amp;amp;literal=one"><script src="/patches/reference-system.js?v=keep&amp;keep=a%26b&amp;quoted=&quot;%27%3Cvalue%3E&amp;amp;flag=literal#source-fragment"></script>');
 const output=cinemaAssets(input,'news/example/index.html');
 const urls=html=>inspect(html,doc=>[...doc.querySelectorAll('link[href^="/brand.css"],script[src^="/patches/reference-system.js"]')].map(node=>new URL(node.getAttribute(node.localName==='link'?'href':'src'),'https://matchapp.tv')));
 const before=urls(input),after=urls(output);
 for(let i=0;i<before.length;i++){assert.equal(after[i].hash,before[i].hash);for(const [key,value]of before[i].searchParams)assert.equal(after[i].searchParams.get(key),value,key);}
 assert.equal(after[1].searchParams.get('quoted'),'"\'<value>');assert.equal(after[1].searchParams.get('keep'),'a&b');assert.equal(after[1].searchParams.get('amp;flag'),'literal');assert.equal(after[1].searchParams.get('dialogs'),'20261020-1');assert.equal(after[0].searchParams.get('frame'),'20261020-borderless1');assert.equal(cinemaAssets(output,'news/example/index.html'),output);
});

test('preload and canonical URLs do not impersonate a real stylesheet owner',()=>{
 const untouched='<link rel="preload" as="style" href="/patches/reference-system.css?v=preload"><link rel="canonical" href="/patches/reference-pages.css?v=canonical">';
 const output=cinemaAssets(document(untouched),'news/example/index.html');assert.ok(output.includes(untouched));
 inspect(output,doc=>{assert.equal(doc.head.querySelectorAll('link[rel="stylesheet"][href^="/patches/reference-system.css"]').length,1);assert.equal(doc.head.querySelectorAll('link[rel="stylesheet"][href^="/patches/reference-pages.css"]').length,1);});
});

test('unterminated and nested owned raw-text tags fail before any destructive source edits',()=>{
 for(const head of ['<style data-cinema-layer>@layer broken;','<script src="/patches/reference-system.js">','<style data-cinema-layer><style>nested</style></style>','<script src="/patches/reference-system.js"><script>nested</script></script>']){
  const input=document(head);assert.throws(()=>cinemaAssets(input,'news/example/index.html'),/Cannot finalize cinema assets:/);assert.ok(input.includes(sourceBody));
 }
});

test('fake body tags and malformed lookalike tags are never promoted into live app hooks',()=>{
 const noBody='<html><head><!-- <body>example</body> --><script>const example="<body>";</script></head></html>';
 assert.equal(cinemaAssets(noBody,'news/example/index.html'),noBody);
 const malformed=document('<sty<style data-cinema-layer>example</style>le><scr<script src="/patches/reference-system.js"></script>ipt>');
 assert.equal(cinemaAssets(malformed,'news/example/index.html'),malformed,'a structurally incomplete head is preserved instead of regex-repaired');
});
