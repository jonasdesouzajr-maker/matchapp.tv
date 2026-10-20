'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
function fixture(){
 const dom=new JSDOM(read('ebooks/index.html'),{url:'https://matchapp.tv/ebooks/',runScripts:'outside-only'}),w=dom.window;
 w.localStorage.setItem('match_lang','fr');w.localStorage.setItem('match_user_country','br');w.MATCH_LANG='en';
 let hydrated=0;w.MatchAppBookDetails={hydrate(card,book){hydrated++;const img=card.querySelector('img');img.src='https://covers.openlibrary.org/source/'+encodeURIComponent(book.title)+'.jpg';img.hidden=false;}};
 for(const file of ['ebooks/locale.js','ebooks/locale-choices.js','ebooks/locale-interface.js','ebooks/locale-details.js','ebooks/locale-hub.js','ebooks/top-ebooks.js','ebooks/magazines.js','ebooks/affiliate-links.js'])w.eval(read(file));
 for(const script of w.document.querySelectorAll('script:not([src])'))if(/const host=document.getElementById\('(ebook-hub-top|magazine-hub-list)'/.test(script.textContent))w.eval(script.textContent);
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {dom,w,get hydrated(){return hydrated;}};
}
test('hub authors every static and dynamic key in all14 selected languages without fallback',()=>{
 let bundle;
 const stub={MatchAppBooksLocale:{register(value){bundle=value;}},document:{querySelector(){return null;},querySelectorAll(){return[];},readyState:'complete'}};
 stub.MatchAppBooksLocale.paint=()=>{};
 vm.runInNewContext(read('ebooks/locale-hub.js'),{window:stub});
 assert.deepEqual(Object.keys(bundle).sort(),languages.slice().sort());
 const keys=Object.keys(bundle.en).sort();assert.equal(keys.length,76);
 for(const lang of languages){assert.deepEqual(Object.keys(bundle[lang]).sort(),keys,lang);for(const key of keys){assert.equal(typeof bundle[lang][key],'string',lang+key);assert.ok(bundle[lang][key].trim(),lang+key);assert.ok(!bundle[lang][key].includes('undefined'),lang+key);}}
});
test('canonical language engine loads early once with one host and ordered pure presentation chunks',()=>{
 const dom=new JSDOM(read('ebooks/index.html')),d=dom.window.document,scripts=[...d.querySelectorAll('script[src]')];
 const i18n=scripts.filter(s=>new URL(s.src,'https://matchapp.tv').pathname==='/i18n.js');assert.equal(i18n.length,1);
 assert.equal(d.querySelectorAll('#lang-switcher-host').length,1);
 const index=file=>scripts.findIndex(s=>s.getAttribute('src').startsWith(file));
 assert.ok(index('/i18n.js')<index('/patches/reference-system.js'));
 const order=['locale.js','locale-choices.js','locale-interface.js','locale-hub.js','locale-details.js'];
 for(let i=0;i<order.length;i++){assert.ok(index('/ebooks/'+order[i])>=0);if(i)assert.ok(index('/ebooks/'+order[i-1])<index('/ebooks/'+order[i]));}
 assert.ok(index('/ebooks/locale-details.js')<index('/ebooks/ebook-matcher.js'));
 dom.window.close();
});
test('hub locale switches preserve every source card, image, route and original title while labels repaint',()=>{
 const f=fixture(),{w}=f,d=w.document,L=w.MatchAppBooksLocale;
 assert.equal(L.lang(),'fr','saved choice beats stale English global and device');
 const books=[...d.querySelectorAll('#ebook-hub-top .ebook-top-card')],magazines=[...d.querySelectorAll('#magazine-hub-list .magazine-hub-card')];
 assert.equal(books.length,12);assert.equal(magazines.length,w.MatchAppMagazines.items.length);
 const cards=books.concat(magazines),snapshot=cards.map(card=>({card,title:card.querySelector('h3'),titleText:card.querySelector('h3').textContent,image:card.querySelector('img'),src:card.querySelector('img').getAttribute('src'),links:[...card.querySelectorAll('a')].map(a=>({node:a,href:a.href,rel:a.rel}))}));
 const rawTitles=new Set(w.MATCHAPP_TOP_EBOOKS.map(book=>book.title));for(const card of books)assert.ok(rawTitles.has(card.querySelector('h3').textContent));
 const hydrateCount=f.hydrated;
 for(const lang of languages){
  w.localStorage.setItem('match_lang',lang);w.MATCH_LANG='en';d.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang}}));
  assert.equal(d.querySelector('[data-book-copy="hub.hero.title"]').textContent,L.get('hub.hero.title',lang));
  assert.equal(d.querySelector('.ebook-hub-brand').getAttribute('aria-label'),L.get('hub.homeAria',lang));
  assert.equal(d.querySelector('[data-book-copy="hub.action.cover"]').textContent,L.get('hub.action.cover',lang));
  assert.equal(d.querySelector('[data-book-hub-affiliate="paid"]').textContent,L.get('affiliate.paid',lang));
  assert.ok(!/\{(?:moods|genres|paces|interests)\}/.test(d.body.textContent));
  for(const before of snapshot){assert.ok(before.card.isConnected);assert.strictEqual(before.card.querySelector('h3'),before.title);assert.equal(before.title.textContent,before.titleText);assert.strictEqual(before.card.querySelector('img'),before.image);assert.equal(before.image.getAttribute('src'),before.src);for(const link of before.links){assert.ok(link.node.isConnected);assert.equal(link.node.href,link.href);assert.equal(link.node.rel,link.rel);}}
 }
 assert.equal(f.hydrated,hydrateCount,'painting does not repeat metadata/art lookup');
 f.dom.window.close();
});
test('official publisher/source identities and all official destinations remain original',()=>{
 const f=fixture(),{w}=f,d=w.document;
 for(const book of w.MATCHAPP_TOP_EBOOKS){const card=[...d.querySelectorAll('#ebook-hub-top .ebook-top-card')].find(card=>card.querySelector('h3').textContent===book.title);assert.equal(card.querySelector('.ebook-top-author').textContent,book.author);assert.equal(card.querySelector('.ebook-top-source').href,book.sourceUrl);assert.equal(card.querySelector('[data-book-hub-genres]').getAttribute('data-book-hub-genres'),book.genre);}
 for(const magazine of w.MatchAppMagazines.items){const card=[...d.querySelectorAll('.magazine-hub-card')].find(card=>card.querySelector('h3').textContent===magazine.title);assert.equal(card.querySelector('.ebook-top-author').textContent,magazine.publisher);assert.equal(card.querySelector('img').src,magazine.icon);for(const href of[magazine.site,magazine.issues,magazine.subscription])assert.ok([...card.querySelectorAll('a')].some(a=>a.href===href));}
 f.dom.window.close();
});
test('repainting retains original affiliate handler exactly once and never changes storage or navigates',()=>{
 const f=fixture(),{w}=f,d=w.document;
 for(const lang of languages){w.localStorage.setItem('match_lang',lang);d.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang}}));w.MatchAppBookHubLocale.paint(d.getElementById('ebook-hub-top'));}
 const before=Array.from({length:w.localStorage.length},(_,i)=>[w.localStorage.key(i),w.localStorage.getItem(w.localStorage.key(i))]);
 const link=d.querySelector('#ebook-hub-top [data-ebook-affiliate]');w.dataLayer=[];link.addEventListener('click',event=>event.preventDefault());link.querySelector('span').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
 assert.equal(w.dataLayer.filter(event=>event.event==='ebook_affiliate_click').length,1);
 assert.deepEqual(Array.from({length:w.localStorage.length},(_,i)=>[w.localStorage.key(i),w.localStorage.getItem(w.localStorage.key(i))]),before);
 assert.equal(w.location.href,'https://matchapp.tv/ebooks/');f.dom.window.close();
});
