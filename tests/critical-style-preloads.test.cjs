'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const {cinemaAssets,CRITICAL_STYLE_PRELOADS}=require('../tools/finalize-brand.js'),root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const imports=file=>[...read(file).matchAll(/@import\s+url\(["']([^"']+)["']\)/g)].map(m=>m[1]);
const owned='link[rel="preload"][as="style"][data-cinema-preload="critical-style"]';
function inspect(source,fn){const dom=new JSDOM(source,{includeNodeLocations:true});try{return fn(dom.window.document,dom);}finally{dom.window.close();}}
const body='<body data-source="original > 🎬"><img src="https://publisher.test/exact.jpg"><button onclick="sameAction()">Same action</button><ins class="adsbygoogle" data-ad-slot="2595698117" style="min-height:250px"></ins><template><link rel="preload" as="style" data-cinema-preload="critical-style" href="/patches/reference-dock.css?v=20261020-dock1"></template><link rel="preload" as="style" data-cinema-preload="critical-style" href="/patches/reference-dock.css?v=20261020-dock1"><script>const example="<link data-cinema-preload=critical-style>";</script></body>';
const page=head=>'<!doctype html><html lang="en"><head>'+head+'</head>'+body+'</html>';
function verify(source,route='index.html'){
 const out=cinemaAssets(source,route);assert(out.includes(body),'every original body byte stays exact');assert.equal(cinemaAssets(out,route),out,'owned hints and charset placement are byte-idempotent');
 inspect(out,(d,dom)=>{assert.equal(d.head.firstElementChild.getAttribute('data-cinema-layer'),'');const charset=d.head.querySelector('meta[charset],meta[http-equiv]');assert(charset);const at=dom.nodeLocation(charset);assert(Buffer.byteLength(out.slice(0,at.endOffset))<=1024,'charset completes in the first1024UTF8 bytes');const links=[...d.head.querySelectorAll(owned)].filter(n=>CRITICAL_STYLE_PRELOADS.includes(n.getAttribute('href')));assert.equal(new Set(links.map(n=>n.getAttribute('href'))).size,links.length);for(const n of links){assert(CRITICAL_STYLE_PRELOADS.includes(n.getAttribute('href')));assert(dom.nodeLocation(n).startOffset>=at.endOffset,'hints follow the actual charset');assert.equal(n.getAttribute('crossorigin'),null,'style request mode stays the same as its import');}});return out;
}
test('critical hint allowlist is exactly the existing shared/brand import URLs and unified fonts retain every existing family/weight',()=>{
 assert.deepEqual(CRITICAL_STYLE_PRELOADS.slice(0,4),imports('patches/reference-system.css'));assert.deepEqual(CRITICAL_STYLE_PRELOADS.slice(4),imports('brand.css'));const union=imports('brand.css').find(url=>url.startsWith('https://fonts.googleapis.com/'));assert.equal(imports('adult-page-compact.css')[0],union);const expected=['Inter:wght@400;500;600;700;800','Outfit:wght@500;600;700;800','Space+Grotesk:wght@500;600;700'];for(const family of expected)assert(union.includes('family='+family));assert(union.endsWith('&display=swap'));assert(!union.includes('Playfair'));assert.equal(inspect(read('index.html'),d=>d.head.querySelector('link[href^="https://fonts.googleapis.com/"]').getAttribute('href')),union);const home=read('index.html'),finalized=cinemaAssets(home,'index.html');assert.equal((finalized.match(/(?<!\r)\n/g)||[]).length,(home.match(/(?<!\r)\n/g)||[]).length,'managed head additions preserve the exact preexisting lone-LF count');
});
test('adult-only hints follow the exact early charset; imported assets preload without moving original stylesheet/script cascade order',()=>{
 const head='<meta charset="UTF-8"><script id="consent-original">window.originalConsent=1;</script><link rel="stylesheet" href="/brand.css?v=keep&amp;frame=20261020-borderless1&amp;fastart=20261020-1"><link rel="stylesheet" href="/premium-unified-20261010.css?v=20261010-luxe1"><script id="original-runtime" src="/original.js"></script>',out=verify(page(head));assert(out.includes(head.slice(head.indexOf('<script'))),'original head sequence remains byte-exact');
 inspect(out,d=>{const hints=[...d.head.querySelectorAll(owned)].map(n=>n.getAttribute('href'));assert.equal(hints.length,10);assert(!hints.includes('/premium-unified-20261010.css?v=20261010-luxe1'),'already directly discovered sheets need no redundant hint');assert(hints.includes(imports('adult-page-compact.css')[0]));});
 const plain=verify(page('<meta charset="UTF-8"><title>Standalone legal page</title>'),'privacy.html');inspect(plain,d=>assert.deepEqual([...d.head.querySelectorAll(owned)].map(n=>n.getAttribute('href')),CRITICAL_STYLE_PRELOADS.slice(0,4),'no unused legacy-brand hints on a standalone adult page'));
});
test('late charset and near1024 byte declarations move as exact original tags, including http-equiv and multibyte source',()=>{
 for(const tag of ["<META data-note='keep > exact' CHARSET='UTF-8'>",'<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" data-original="keep">']){
  const lead='<!--'+('🎬'.repeat(300))+'-->',out=verify(page(lead+tag+'<title>Original title</title>'));assert(out.includes(tag));assert(out.includes(lead));assert.equal(out.split(tag).length-1,1);
 }
 const tag='<meta charset="utf-8" data-source="boundary">',raw=page('<!--'+'a'.repeat(830)+'-->'+tag+'<title>Boundary</title>');verify(raw);
});
test('moving a standalone late charset removes only its same-line indentation and preserves EOLs, neighboring source and body',()=>{
 const tag='<meta charset="UTF-8" data-original="exact > tag">',lead='<!--'+('original '.repeat(160))+'-->',tail='<title>Original title</title><script>window.original=1;</script>';
 for(const eol of['\n','\r\n']){
  const source=page(lead+eol+' \t  '+tag+eol+tail),out=verify(source);
  assert(out.includes(tag));assert(out.includes(lead+eol+eol+tail),'remove indentation but retain the exact surrounding EOLs/source');assert(!new RegExp(eol+'[ \t]+'+eol).test(out),'no new whitespace-only residual line');
  const protectedPrefix=lead+eol+'\t '+eol+'<!-- original inline spacing -->    ';
  const inline=verify(page(protectedPrefix+tag+eol+tail));assert(inline.includes(protectedPrefix+eol+tail),'unrelated whitespace-only lines and inline spacing remain exact');
 }
});
test('exact owned duplicates consolidate while unowned/dormant/invalid-marker examples remain byte-identical',()=>{
 const href=CRITICAL_STYLE_PRELOADS[1],tag='<link rel="preload" as="style" data-cinema-preload="critical-style" href="'+href+'">',unowned='<link rel="preload" as="style" href="'+href+'"><link rel="preload" as="image" data-cinema-preload="critical-style" href="'+href+'"><link rel="preload" as="style" data-cinema-preload="critical-style" href="/unowned.css"><!-- '+tag+' --><template>'+tag+'</template>';
 const out=verify(page('<meta charset="utf-8">'+tag+tag+unowned));assert(out.includes(unowned));inspect(out,d=>assert.equal([...d.head.querySelectorAll(owned)].filter(n=>n.getAttribute('href')===href).length,1));
});
test('missing charset gets one early UTF8 declaration; excluded routes and metadata-only inputs remain untouched',()=>{
 const raw=page('<title>Original</title>');verify(raw);for(const route of ['kids/index.html','private-voice/index.html','oauth/callback.html','android-studio/preview/index.html','callback.html','confirm.html','yandex_fixture.html'])assert.equal(cinemaAssets(raw,route),raw,route);assert.equal(cinemaAssets('<head><title>No body</title></head>','news/head.html'),'<head><title>No body</title></head>');
});
