'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync(require.resolve('../jonas-guide-20261031.js'),'utf8');
test('Jonas guide relabels existing links in every app language and skips the current route',async()=>{
  const dom=new JSDOM('<html lang="en"><body><section id="ma-jonas-home-panel"></section></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
    const {window}=dom,doc=window.document;
    doc.documentElement.classList.add('matchapp-ai-android');
    window.eval(script);
    const expected={en:'Books','pt-BR':'Livros',es:'Libros',fr:'Livres',de:'Bücher',it:'Libri',tr:'Kitaplar',ru:'Книги',ar:'الكتب',hi:'किताबें',id:'Buku',ja:'本',ko:'도서',zh:'图书'};
    let original;
    for(const [lang,books] of Object.entries(expected)){
      doc.documentElement.lang=lang;
      doc.dispatchEvent(new window.CustomEvent('matchapp:langchange',{detail:{lang}}));
      const nav=doc.querySelector('.ma-guide-pills'),link=nav.querySelector('a[href="/ebooks/"]');
      assert.equal(link.textContent,books,lang);
      assert.equal(nav.querySelectorAll('a').length,6);
      assert.equal(nav.querySelector('a[href="/"]'),null);
      if(original)assert.equal(link,original);
      if(lang==='es')assert.equal(nav.querySelector('.ma-fx-toggle').textContent,'🔊 Sonidos activados');
      original=link;
    }
    await new Promise(resolve=>window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve)));

});
