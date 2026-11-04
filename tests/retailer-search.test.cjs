const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function view(lang='pt-BR',ua='Mozilla/5.0',host='https://matchapp.tv',standalone=false){
 const route='/catalog-trails/'+(lang==='en'?'':lang.toLowerCase()+'/');
 const dom=new JSDOM(read(route+'index.html'),{url:host+route+'#shop',runScripts:'outside-only'});
 const w=dom.window;
 Object.defineProperty(w.navigator,'userAgent',{value:ua});
 w.matchMedia=()=>({matches:standalone});
 w.MatchAppCountry={regionCode:()=>''};
 w.eval(read('ebooks/affiliate-links.js'));
 w.eval(read('channels/shop.js'));
 return dom;
}
test('only contextual Amazon BR web links are sponsored; Mercado Livre and general searches stay independent',()=>{
 const dom=view(),d=dom.window.document;
 const input=d.querySelector('[data-shop-query]'),store=d.querySelector('#shop select'),a=d.querySelector('[data-shop-amazon]'),ml=d.querySelector('[data-shop-mercado]');
 assert.equal(a.hasAttribute('href'),false);assert.equal(ml.hasAttribute('href'),false);
 d.querySelector('[data-shop-preset=print]').click();assert.equal(a.hasAttribute('href'),false);
 store.value='BR';store.dispatchEvent(new dom.window.Event('change'));
 assert.equal(new URL(a.href).searchParams.get('tag'),'matchapp06-20');assert.equal(new URL(a.href).searchParams.get('i'),'stripbooks');assert.ok(a.relList.contains('sponsored'));
 assert.equal(d.querySelector('[data-shop-disclosure]').hidden,false);assert.equal(d.querySelector('[data-shop-paid]').hidden,false);
 assert.equal(new URL(ml.href).hostname,'lista.mercadolivre.com.br');assert.ok(!ml.href.includes('tag='));
 input.value='headphones /?tag=other & #music';input.dispatchEvent(new dom.window.Event('input'));
 assert.equal(new URL(a.href).searchParams.get('k'),input.value);assert.equal(new URL(a.href).searchParams.has('tag'),false);assert.equal(d.querySelector('[data-shop-disclosure]').hidden,true);
 store.value='US';store.dispatchEvent(new dom.window.Event('change'));d.querySelector('[data-shop-preset=mic]').click();
 assert.equal(new URL(a.href).hostname,'www.amazon.com');assert.equal(new URL(a.href).searchParams.has('tag'),false);
 dom.window.close();
});
test('Android, standalone and preview visitors can shop without an unapproved ID',()=>{
 for(const [ua,host,standalone] of [['MatchAppAiAndroid/1.1.68','https://matchapp.tv',false],['Mozilla Android; wv) Chrome','https://matchapp.tv',false],['Mozilla','https://matchapp.tv',true],['Mozilla','https://preview.example',false]]){
  const dom=view('en',ua,host,standalone),api=dom.window.MatchAppEbookAffiliate;
  assert.equal(new URL(api.amazonRetailSearchUrl('USB mic','BR','mic')).searchParams.has('tag'),false);
  assert.equal(api.amazonRetailSearchUrl('speaker','XX','mic'),'');
  dom.window.close();
 }
});
test('Jonas carries only an explicit product phrase to the local shopping page',()=>{
 const dom=view('en'),w=dom.window;
 for(const name of ['labels','discovery']) w.eval(read('channels/'+name+'.js'));
 const api=w.MatchAppChannels;
 for(const [text,term] of [['Search Amazon for wired headphones','wired headphones'],['Buscar no Mercado Livre por microfone USB','microfone USB'],['Find a keyboard on Amazon','a keyboard']]) {
  assert.equal(api.selection(text),'shop');assert.equal(api.isNavigation(text),true);assert.equal(api.shopQuery(text),term);
  const link=api.linkFor(text,'pt-BR');assert.equal(link.getAttribute('href'),'/catalog-trails/pt-br/#shop');
  link.addEventListener('click',e=>e.preventDefault());link.click();assert.equal(w.sessionStorage.getItem('matchapp_shop_query'),term);
 }
 for(const q of ['Where to watch movies on Amazon Prime Video?','search Amazon Music','What is the Amazon rainforest?'])assert.equal(api.selection(q),'');
 const copy=require('../channels/shop-copy.json');
 for(const [lang,t] of Object.entries(copy)){
  assert.equal(api.isNavigation(t.shop),true);
  assert.ok(read('/catalog-trails/'+(lang==='en'?'':lang.toLowerCase()+'/')+'index.html').includes(t.disclosure));
 }
 dom.window.close();
});
