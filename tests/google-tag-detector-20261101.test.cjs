'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {firstGoogleTag,consentSourceEdit,MARKER,SCRIPT}=require('../tools/finalize-brand.js');

function detects(markup){
  const dom=new JSDOM('<!doctype html><html><head>'+markup+'</head><body></body></html>',{includeNodeLocations:true});
  try{return Boolean(firstGoogleTag(dom.window.document));}finally{dom.window.close();}
}

test('Google tag source detection uses exact hosts and script paths including protocol-relative URLs',()=>{
  for(const src of ['https://www.googletagmanager.com/gtm.js?id=GTM-example','https://googletagmanager.com/gtag/js?id=G-example',
    '//www.googletagmanager.com/gtag/js?id=G-example','http://www.googletagmanager.com/gtm.js?id=GTM-example',
    'https://WWW.GOOGLETAGMANAGER.COM/gtag/js?id=G-example','https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-example']){
    assert.equal(detects('<script src="'+src+'"></script>'),true,src);
  }
});

test('lookalike hosts, URL credentials, unrelated paths and non-network schemes are never Google tags',()=>{
  for(const src of ['https://evilgoogletagmanager.com/gtm.js','https://www.googletagmanager.com.evil.example/gtm.js',
    'https://www.googletagmanager.com@evil.example/gtm.js','https://evil.example/googletagmanager.com/gtm.js',
    'https://evil.example/?next=https://www.googletagmanager.com/gtm.js','/googletagmanager.com/gtm.js',
    'https://pagead2.googlesyndication.com.evil.example/pagead/js/adsbygoogle.js',
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js.extra','https://www.googletagmanager.com/gtm.js.extra',
    'https://www.googletagmanager.com/gtag/js/other','https://www.googletagmanager.com:8443/gtm.js',
    'https://user@www.googletagmanager.com/gtm.js','javascript:googletagmanager.com/gtm.js','data:text/plain,googletagmanager.com/gtm.js','']){
    assert.equal(detects('<script src="'+src+'"></script>'),false,src);
  }
});

test('literal inline GTM bootstrap recognition ignores inert and external-script text',()=>{
  const bootstrap="window.dataLayer=[{'gtm.start':Date.now()}];j.src='https://www.googletagmanager.com/gtm.js?id='+i;";
  assert.equal(detects('<script>'+bootstrap+'</script>'),true);
  assert.equal(detects('<script>'+bootstrap.replace('https://www.','//www.')+'</script>'),true);
  assert.equal(detects('<script>'+bootstrap.replace('www.googletagmanager.com','www.googletagmanager.com.evil.example')+'</script>'),false);
  assert.equal(detects('<script type="application/ld+json">'+JSON.stringify({example:bootstrap})+'</script>'),false);
  assert.equal(detects('<template><script>'+bootstrap+'</script></template>'),false);
  assert.equal(detects('<svg><script>'+bootstrap+'</script></svg>'),false);
  assert.equal(detects('<script src="https://evil.example/library.js">'+bootstrap+'</script>'),false,'external script children are inert');
});

test('consent defaults are inserted before the first genuine Google tag and leave inventory bytes intact',()=>{
  const lookalike='<script src="https://www.googletagmanager.com.evil.example/gtm.js"></script>';
  const google='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-example" crossorigin="anonymous"></script>';
  const source='<html><head>'+lookalike+google+'</head><body><ins data-ad-slot="unchanged"></ins></body></html>';
  const dom=new JSDOM(source,{includeNodeLocations:true});
  try{
    const edit=consentSourceEdit(dom,source);assert.equal(edit[0],source.indexOf(google));
    const next=source.slice(0,edit[0])+edit[2]+source.slice(edit[1]);
    assert.equal(next.replace(SCRIPT+'\n',''),source,'only the canonical denied initializer is inserted');
    const again=new JSDOM(next,{includeNodeLocations:true});
    try{assert.equal(again.window.document.querySelectorAll('script['+MARKER+']').length,1);assert.equal(consentSourceEdit(again,next),null);}finally{again.window.close();}
  }finally{dom.window.close();}
});
