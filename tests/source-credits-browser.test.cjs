const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const moduleReady=import(pathToFileURL(path.join(root,'source-credits-browser.mjs')).href);
const copyReady=import(pathToFileURL(path.join(root,'source-credits-copy.mjs')).href);
const audioUrl='https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview/test.m4a';
const bookUrl='https://books.apple.com/us/audiobook/verified-edition/id123456789?uo=4';
const itunesUrl='https://itunes.apple.com/us/album/example/id123456?i=987654&uo=4';
const itunesBadge='/assets/apple-promotional/itunes-store-get-en-us.svg';
function page(url='https://matchapp.tv/ebooks/'){
  const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body><section id="preview"><audio controls preload="none"></audio></section><section data-source-rights hidden></section></body></html>',{url});
  dom.window.document.querySelector('audio').src=audioUrl;
  return dom;
}

test('verified Books presentation preserves the exact item and active player on language changes',async()=>{
  const {mountApplePreview}=await moduleReady,dom=page(),doc=dom.window.document,player=doc.querySelector('audio');
  player.currentTime=12;
  const before=player.outerHTML;
  const node=mountApplePreview(player,{url:bookUrl,title:'A title & its exact edition'});
  assert.ok(node);
  assert.equal(player.outerHTML,before);
  assert.equal(player.currentTime,12);
  assert.equal(node.previousElementSibling,player);
  assert.equal(node.querySelector('a').getAttribute('href'),bookUrl);
  assert.equal(node.querySelector('img').src,'https://toolbox.marketingtools.apple.com/api/assets/featured-content/books/badges/badge-2/en-us.svg');
  assert.equal(node.querySelector('[lang="en"]').textContent,'provided courtesy of iTunes');
  dom.window.localStorage.setItem('match_lang','pt-BR');
  dom.window.MATCH_LANG='en';
  doc.dispatchEvent(new dom.window.Event('matchapp:langchange'));
  assert.equal(node.lang,'pt-BR');
  assert.match(node.textContent,/A title & its exact edition/);
  assert.doesNotMatch(node.querySelector('a').textContent,/^Open /);
  assert.equal(doc.querySelector('audio'),player);
  assert.equal(player.outerHTML,before);
  assert.equal(player.currentTime,12);
  assert.equal(node.querySelector('a').getAttribute('href'),bookUrl);
  dom.window.close();
});

test('the local iTunes badge retains the exact original Apple archive bytes',()=>{
  const asset=fs.readFileSync(path.join(root,itunesBadge));
  assert.equal(asset.length,17387);
  assert.equal(createHash('sha256').update(asset).digest('hex'),'1509ad061e178ab3acb8095ef5488cdc02f8a3b8c196b6e44b661051ae8bbd4f');
  assert.match(asset.toString('utf8'),/viewBox="0 0 139\.86 41"/);
});

test('exact iTunes music purchase links use the original Store badge and preserve playback identity',async()=>{
  const {mountApplePreview}=await moduleReady;
  for(const url of [itunesUrl,'https://itunes.apple.com/us/song/example/id987654','https://itunes.apple.com/us/music-video/example/id987654','https://music.apple.com/us/album/example/123456?i=987654&app=itunes','https://music.apple.com/us/song/example/987654?app=itunes&uo=4']){
    const dom=page(),doc=dom.window.document,player=doc.querySelector('audio');
    player.currentTime=12;
    const before=player.outerHTML,node=mountApplePreview(player,{url,title:'Exact track'});
    assert.ok(node);
    assert.equal(node.querySelector('img').getAttribute('src'),itunesBadge);
    assert.equal(node.querySelector('a').getAttribute('href'),url);
    assert.match(node.textContent,/iTunes Store/);
    assert.doesNotMatch(node.textContent,/Apple Music/);
    assert.equal(player.outerHTML,before);
    assert.equal(player.currentTime,12);
    dom.window.close();
  }
});

test('the iTunes music badge is not assigned to other Apple services or legacy nonmusic routes',async()=>{
  const {mountApplePreview}=await moduleReady;
  const urls=['audiobook','book','movie','tv-season','tv-episode','podcast'].map(type=>'https://itunes.apple.com/us/'+type+'/exact-title/id123456');
  urls.push('https://podcasts.apple.com/us/podcast/exact-title/id123456','https://tv.apple.com/us/movie/exact-title/umc.cmc.123456');
  for(const url of urls){
    const dom=page(),doc=dom.window.document,node=mountApplePreview(doc.querySelector('audio'),{url,title:'Exact title'});
    assert.ok(node);
    assert.equal(node.querySelector('img'),null);
    assert.equal(node.querySelector('a').getAttribute('href'),url);
    dom.window.close();
  }
});

test('a direct Apple Music title uses the original service badge without rewriting the track URL',async()=>{
  const {mountApplePreview}=await moduleReady,dom=page(),doc=dom.window.document;
  const url='https://music.apple.com/us/album/exact-album/123456?i=987654&uo=4';
  const node=mountApplePreview(doc.querySelector('audio'),{url,title:'Exact track'});
  assert.equal(node.querySelector('a').getAttribute('href'),url);
  assert.equal(node.querySelector('img').src,'https://toolbox.marketingtools.apple.com/api/assets/featured-content/music/badges/badge-2/en-us.svg');
  assert.match(node.textContent,/Apple Music/);
  dom.window.close();
});

test('a remote badge failure retains an accessible localized exact-title action',async()=>{
  const {mountApplePreview}=await moduleReady,dom=page(),doc=dom.window.document;
  dom.window.localStorage.setItem('match_lang','ar');
  const node=mountApplePreview(doc.querySelector('audio'),{url:bookUrl,title:'Exact edition'});
  const badge=node.querySelector('img');badge.dispatchEvent(new dom.window.Event('error'));
  assert.equal(badge.hidden,true);
  assert.equal(badge.style.getPropertyValue('display'),'none');
  assert.equal(badge.style.getPropertyPriority('display'),'important');
  assert.equal(node.hidden,false);
  assert.equal(node.dir,'rtl');
  assert.ok(node.querySelector('a').textContent.includes('Exact edition'));
  assert.equal(node.querySelector('a').getAttribute('aria-label'),node.querySelector('a span').textContent);
  assert.equal(node.querySelector('a').getAttribute('href'),bookUrl);
  dom.window.close();
});

test('unrelated hosts, home/search/artist pages, and non-Apple preview media cannot gain source endorsement',async()=>{
  const {mountApplePreview}=await moduleReady;
  const invalid=['https://books.apple.com/','https://books.apple.com/us/search?term=title','https://music.apple.com/us/artist/name/123456','https://books.apple.com.evil.test/us/audiobook/title/id123456','http://books.apple.com/us/audiobook/title/id123456','https://someone@books.apple.com/us/audiobook/title/id123456','javascript:alert(1)'];
  for(const url of invalid){
    const dom=page(),doc=dom.window.document,before=doc.body.innerHTML;
    assert.equal(mountApplePreview(doc.querySelector('audio'),{url,title:'A title'}),null);
    assert.equal(doc.body.innerHTML,before);
    assert.equal(doc.getElementById('matchapp-source-credit-style'),null);
    dom.window.close();
  }
  const dom=page(),doc=dom.window.document,player=doc.querySelector('audio');player.src='https://example.test/audio.m4a';
  assert.equal(mountApplePreview(player,{url:bookUrl,title:'A title'}),null);
  dom.window.close();
});

test('native indicators and Kids leave both preview and copyright DOM unchanged',async()=>{
  const {mountApplePreview,mountSourceRights}=await moduleReady;
  const cases=[
    dom=>{dom.window.MATCHAPP_ANDROID=true;},
    dom=>{dom.window.MatchAppNativeStartup={};},
    dom=>{dom.window.MatchAppNativeAuth={};},
    dom=>{dom.window.MatchAppNativeExperience={};},
    dom=>{dom.window.MatchAppNativePageState={};},
    dom=>{dom.window.document.documentElement.classList.add('matchapp-android');},
    dom=>{Object.defineProperty(dom.window.navigator,'userAgent',{value:'MatchAppAiAndroid/1.0'});},
    dom=>{Object.defineProperty(dom.window.navigator,'userAgent',{value:'MatchAppTVAndroid 1.0'});},
    dom=>{Object.defineProperty(dom.window.navigator,'userAgent',{value:'MatchAppAiKidsAndroid/1.0'});},
    dom=>{dom.reconfigure({url:'https://matchapp.tv/ebooks/?utm_source=android_app'});},
    dom=>{dom.reconfigure({url:'https://matchapp.tv/kids/'});}
  ];
  for(const prepare of cases){
    const dom=page();prepare(dom);const doc=dom.window.document,before=doc.documentElement.outerHTML;
    assert.equal(mountApplePreview(doc.querySelector('audio'),{url:bookUrl,title:'A title'}),null);
    assert.equal(mountApplePreview(doc.querySelector('audio'),{url:itunesUrl,title:'Exact track'}),null);
    assert.equal(mountSourceRights(doc.querySelector('[data-source-rights]')),null);
    assert.equal(doc.documentElement.outerHTML,before);
    dom.window.close();
  }
});

test('late callbacks cannot decorate removed previews and repeated mounts do not duplicate credits',async()=>{
  const {mountApplePreview}=await moduleReady,dom=page(),doc=dom.window.document,player=doc.querySelector('audio');
  const node=mountApplePreview(player,{url:bookUrl,title:'A title'});
  assert.equal(mountApplePreview(player,{url:bookUrl,title:'A title'}),node);
  assert.equal(doc.querySelectorAll('.matchapp-apple-preview-credit').length,1);
  player.parentElement.remove();
  assert.equal(mountApplePreview(player,{url:bookUrl,title:'A title'}),null);
  dom.window.close();
});

test('catalog-backed audio passes its verified store_url to the credit without changing the Kids gate',async()=>{
  const {mountApplePreview}=await moduleReady,dom=page(),doc=dom.window.document;
  const src=fs.readFileSync(path.join(root,'catalog-media.js'),'utf8');
  const start=src.indexOf('  function renderPreview('),end=src.indexOf('\n  function renderAvailability(',start);
  assert.ok(start>=0&&end>start);
  let calls=0;
  const renderPreview=vm.runInNewContext(src.slice(start,end)+'\nrenderPreview',{
    document:doc,window:dom.window,
    TRUSTED_AUDIO:/^https:\/\/audio-ssl\.itunes\.apple\.com\//i,
    TRUSTED_EMBED:/^https:\/\/www\.youtube-nocookie\.com\/embed\//i,
    normalise:value=>String(value||'').toLowerCase(),sourcePage:()=>'',
    renderApplePreviewCredit:(player,options)=>{calls++;return mountApplePreview(player,options);}
  });
  const host=doc.getElementById('preview');
  const title='Exact $& {service} <script> edition';
  const meta={title,preview_kind:'audio',preview_url:audioUrl,availability:{store_url:bookUrl},kids_approved:true};
  renderPreview(host,meta,{title});
  assert.equal(calls,1);
  assert.equal(host.querySelector('.matchapp-apple-preview-link').getAttribute('href'),bookUrl);
  assert.equal(host.querySelector('.matchapp-apple-preview-link span').textContent,'Open '+title+' on Apple Books');
  assert.equal(host.querySelector('script'),null);
  assert.equal(host.querySelector('audio').preload,'none');
  renderPreview(host,meta,{title,kids:true});
  assert.equal(calls,1);
  assert.equal(host.querySelector('.matchapp-apple-preview-credit'),null);
  assert.ok(host.querySelector('audio'));
  renderPreview(host,{...meta,source_key:'different',kids_approved:false},{title,kids:true});
  assert.equal(host.querySelector('audio'),null);
  dom.window.close();
});

test('all supported locales paint authored copy while exact notices, source URLs, and media remain stable',async()=>{
  const {mountApplePreview,mountSourceRights}=await moduleReady,{SOURCE_CREDIT_COPY}=await copyReady;
  const locales=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh','zh-TW'];
  assert.deepEqual(Object.keys(SOURCE_CREDIT_COPY),locales);
  const dom=page(),doc=dom.window.document,player=doc.querySelector('audio');
  const preview=mountApplePreview(player,{url:bookUrl,title:'Exact edition'}),rights=mountSourceRights(doc.querySelector('[data-source-rights]'));
  const legal=rights.querySelector('p[lang="en"]').textContent;
  for(const locale of locales){
    const copy=SOURCE_CREDIT_COPY[locale];
    assert.deepEqual(Object.keys(copy),Object.keys(SOURCE_CREDIT_COPY.en));
    assert.deepEqual((copy.openTitle.match(/\{[^}]+\}/g)||[]).sort(),['{service}','{title}']);
    dom.window.localStorage.setItem('match_lang',locale);
    doc.dispatchEvent(new dom.window.Event('matchapp:langchange'));
    assert.equal(preview.lang,locale);assert.equal(rights.lang,locale);
    assert.equal(rights.querySelector('[data-source-rights-copy]').textContent,copy.openLicenseText);
    assert.match(copy.openLicenseText,/MatchApp Ai/);
    assert.equal(rights.querySelector('p[lang="en"]').textContent,legal);
    assert.equal(preview.querySelector('a').getAttribute('href'),bookUrl);
    assert.equal(player.getAttribute('src'),audioUrl);
    assert.equal(player.preload,'none');assert.equal(player.autoplay,false);
  }
  dom.window.close();
});

test('copyright source note preserves open-license rights and links the actual licensing terms',async()=>{
  const {mountSourceRights}=await moduleReady,dom=page('https://matchapp.tv/copyright.html'),doc=dom.window.document;
  const node=mountSourceRights(doc.querySelector('[data-source-rights]'));
  assert.equal(node.hidden,false);
  assert.match(node.textContent,/do not remove rights granted by a third-party open license or by law/);
  assert.match(node.textContent,/shared adaptations must use the same license/);
  assert.equal(node.querySelector('[data-source-rights-tvmaze]').href,'https://www.tvmaze.com/api#licensing');
  assert.equal(node.querySelector('[data-source-rights-cc]').href,'https://creativecommons.org/licenses/by-sa/4.0/');
  assert.equal(mountSourceRights(node),node);
  assert.equal(node.querySelectorAll('p[lang="en"]').length,1);
  dom.window.close();
});
