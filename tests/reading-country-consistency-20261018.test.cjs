const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const audio=require('../ebooks/audiobooks.js');
const country=require('../viewer-country.js');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const book={id:'country-edition-test',title:'A Distinct Country Edition',author:'Mira Example',access:['free','paid'],genres:['fantasy'],moods:['curious'],summary:'A source-catalogued book.',region:'JP'};
const row=(code,b=book)=>({collectionName:b.title,artistName:b.author,
  collectionViewUrl:'https://books.apple.com/'+code.toLowerCase()+'/audiobook/exact-edition/id123456',wrapperType:'audiobook'});

test('Apple audio verifies only an exact edition in a supported country storefront',()=>{
  const supported='AT AU BE CA CH DE DK ES FI FR GB GR IE IT JP LU NL NO NZ PT SE US'.split(' ');
  for(const code of supported){
    assert.equal(audio.appleStorefront(code),code.toLowerCase());
    const result=audio.verifyApple(book,[row(code)],code);
    assert.equal(result?.verified,true,code);
    assert.equal(result?.region,code,code);
    const wrong=code==='US'?'GB':'US';
    assert.equal(audio.verifyApple(book,[row(wrong)],code),null,code+' rejects '+wrong);
  }
  for(const code of ['BR','IN','CN','ZZ','']){
    assert.equal(audio.appleStorefront(code),'');
    assert.equal(audio.verifyApple(book,[row('US'),row(code)],code),null);
  }
});

test('Apple source calls preserve market across rematches and country changes',async()=>{
  const calls=[];
  const fetcher=async href=>{
    const query=new URL(href);calls.push(query);
    return {ok:true,json:async()=>({results:[row(query.searchParams.get('country'))]})};
  };
  const us=await audio.verify(book,'US','paid',fetcher);
  const norway=await audio.verify(book,'NO','paid',fetcher);
  const norwayAgain=await audio.verify(book,'NO','paid',fetcher);
  assert.equal(us.apple.region,'US');
  assert.equal(norway.apple.region,'NO');
  assert.equal(norwayAgain.apple.region,'NO');
  assert.deepEqual(calls.map(u=>u.searchParams.get('country')),['us','no']);
  assert(calls.every(u=>u.searchParams.get('entity')==='audiobook'));
});

test('unknown and unsupported audio markets remain useful without requesting or verifying a US edition',async()=>{
  let calls=0;
  for(const code of ['','BR','IN','CN','ZZ']){
    const result=await audio.verify(book,code,'any',async()=>{calls++;throw Error('Must not use another country');});
    assert.equal(result.apple,null,code);
    assert.equal(result.free,null,code);
    assert.equal(result.searches.length,3,code);
    assert(result.searches.every(link=>link.verified===false&&link.kind==='search-only'));
  }
  assert.equal(calls,0);
  assert(audio.sourceSearches(book,'NO').every(link=>link.region===''));
  assert(audio.sourceSearches(book,'NO').every(link=>!new URL(link.url).pathname.startsWith('/us/')));
  assert.equal(new URL(audio.sourceSearches(book,'GB').find(link=>link.provider==='Audible').url).hostname,'www.audible.co.uk');
});

test('standalone country resolver handles storage failures and has no language-derived fallback',()=>{
  assert.equal(country.regionCode({getItem:()=>{throw Error('Storage denied');}}),'');
  assert.equal(country.regionCode({getItem:()=>null}),'');
  assert.equal(country.resolveCountryCode('Norway'),'NO');
  assert.equal(country.resolveCountryCode('Austria'),'AT');
  assert.equal(country.resolveCountryCode('ZZ'),'');
});

test('choose-country guidance is authored for every supported interface language',()=>{
  const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
  const labels=languages.map(lang=>country.chooseCountryMessage(lang));
  assert.equal(new Set(labels).size,14);
  assert(labels.every(message=>typeof message==='string'&&message.length>20));
  assert.equal(country.chooseCountryMessage('pt-PT'),labels[1]);
  assert.equal(country.chooseCountryMessage('zh-Hant'),labels[13]);
  assert.equal(country.chooseCountryMessage('not-supported'),labels[0]);
});

test('Ask AI reading cards use the chosen country independently of browser language and book origin',()=>{
  const dom=new JSDOM('<main id="host"></main>',{url:'https://matchapp.tv/discover.html',runScripts:'outside-only'}),w=dom.window;
  try{
    Object.defineProperty(w.navigator,'language',{value:'pt-BR',configurable:true});
    w.MATCH_LANG='pt-BR';
    w.MATCHAPP_EBOOK_CATALOG=[book];
    w.eval(read('viewer-country.js'));
    w.eval(read('ebooks/audiobooks.js'));
    w.eval(read('ebooks/reading-ai.js'));
    const host=w.document.querySelector('#host');
    w.localStorage.setItem('match_user_country','Norway');
    assert.equal(w.MatchAppReadingAI.render('Recommend an audiobook',host),1);
    assert(host.querySelector('a[href^="https://books.apple.com/no/"]'));
    assert(!host.querySelector('a[href^="https://books.apple.com/us/"]'));
    assert(!host.querySelector('a[data-reading-choose-country]'));
    assert.equal(w.localStorage.getItem('match_user_country'),'Norway');
    w.localStorage.setItem('match_user_country','Brazil');host.innerHTML='';
    assert.equal(w.MatchAppReadingAI.render('Recommend an audiobook',host),1);
    assert(!host.querySelector('a[href^="https://books.apple.com/"]'),'Brazil sells Apple e-books but is not an Apple audio storefront');
    assert(host.querySelector('a[href^="https://www.audible.com.br/"]'));
    w.localStorage.clear();host.innerHTML='';
    assert.equal(w.MatchAppReadingAI.render('Recommend an audiobook',host),1,'Unknown country keeps the source book recommendation');
    const choose=host.querySelector('a[data-reading-choose-country]');
    assert.equal(choose?.getAttribute('href'),'/profile/profile.html');
    assert.match(choose.textContent,/Escolha seu país/);
    assert(!host.querySelector('a[href^="https://books.apple.com/us/"]'));
    assert(host.querySelector('.reading-source-link'),'Source searches remain available');
  }finally{dom.window.close();}
});
