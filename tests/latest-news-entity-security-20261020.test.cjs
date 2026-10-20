'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const source=fs.readFileSync(path.resolve(__dirname,'../latest-news.js'),'utf8');
const start=source.indexOf('  const DATA='),end=source.indexOf('  function rail(items){');
assert.ok(start>0&&end>start,'extract the real News entity and source-card owners without booting feed requests or rotation');
function fixture(){
 const requests=[],parsers=[],assignments=[];
 class BlockedResources extends ResourceLoader{fetch(url){requests.push(url);return null;}}
 const dom=new JSDOM('<!doctype html><html lang="en"><body><main></main></body></html>',{url:'https://matchapp.tv/',runScripts:'dangerously',resources:new BlockedResources(),virtualConsole:new VirtualConsole()}),w=dom.window;
 w.__entityAttack=0;w.fetch=()=>{requests.push('fetch');throw Error('No network in entity fixture');};w.XMLHttpRequest.prototype.send=()=>{requests.push('xhr');throw Error('No XHR in entity fixture');};
 const create=w.document.createElement.bind(w.document),inner=Object.getOwnPropertyDescriptor(w.Element.prototype,'innerHTML');
 w.document.createElement=function(tag,...args){const node=create(tag,...args);if(String(tag).toLowerCase()==='textarea'){parsers.push(node);Object.defineProperty(node,'innerHTML',{get(){return inner.get.call(this);},set(text){assignments.push(String(text));return inner.set.call(this,text);}});}return node;};
 w.eval('(function(){'+source.slice(start,end)+'\nwindow.__newsEntity={decode:decodeEntities,card};})();');
 return{w,requests,parsers,assignments,close:()=>w.close()};
}

test('the actual news decoder preserves named/numeric entities, Unicode, one-pass decoding and original plain text',t=>{
 const f=fixture();t.after(f.close);
 for(const [input,expected]of[
  ['BBC &amp; Reuters','BBC & Reuters'],
  ['&quot;A&quot; &apos;B&apos; &#39;C&#39;','"A" \'B\' \'C\''],
  ['Caf&eacute; &#233; &#x1F3AC; &#127916; — 日本語 العربية','Café é 🎬 🎬 — 日本語 العربية'],
  ['A&nbsp;&thinsp;B &mdash; &ndash; &copy; &reg; &hellip;','A B — – © ® …'],
  ['&notin; &CounterClockwiseContourIntegral; &acE;','∉ ∳ ∾̳'],
  ['&amp;lt;script&amp;gt; &amp;#39;','&lt;script&gt; &#39;'],
  ['  Original Unicode title 日本語  ','  Original Unicode title 日本語  '],
  ['A &unknown; B','A &unknown; B']
 ])assert.equal(f.w.__newsEntity.decode(input),expected,input);
 assert.equal(f.w.__entityAttack,0);assert.deepEqual(f.requests,[]);assert.ok(f.parsers.every(el=>el.childElementCount===0));
});

test('literal and encoded markup stays text in the real decoder with no element, event, script or resource execution',t=>{
 const f=fixture();t.after(f.close);
 const payloads=[
  '</textarea><img data-entity-attack src="https://attacker.invalid/leak?a=&amp;" onerror="window.__entityAttack=1">',
  '<iframe data-entity-attack src="https://attacker.invalid/frame?x=&amp;"></iframe><script>window.__entityAttack=2</script>',
  '<svg data-entity-attack onload="window.__entityAttack=3">A&amp;B</svg>',
  '&lt;img data-entity-attack src=&quot;https://attacker.invalid/encoded&quot; onerror=&quot;window.__entityAttack=4&quot;&gt;',
  '&#60;/textarea&#62;&#x3c;script&#x3e;window.__entityAttack=5&#60;/script&#62;',
  '<!-- &amp; --><style>@import "https://attacker.invalid/style";</style>'
 ];
 for(const payload of payloads){const text=f.w.__newsEntity.decode(payload);assert.equal(typeof text,'string');assert.ok(text.length>0);}
 // Inspect what the production branch actually submitted to the HTML parser,
 // rather than relying on detached elements not firing a particular browser event.
 assert.equal(f.assignments.length,payloads.length);assert.ok(f.assignments.every(value=>!value.includes('<')),'no literal tag opener reaches the parser');
 for(const parser of f.parsers){assert.equal(parser.childElementCount,0);f.w.document.body.append(parser);}
 assert.equal(f.w.document.querySelector('[data-entity-attack],iframe,img,script,style'),null);
 assert.equal(f.w.__entityAttack,0);assert.deepEqual(f.requests,[]);
});

test('the actual source card keeps decoded title/metadata, original art, outbound identity and click handler',t=>{
 const f=fixture();t.after(f.close);const {w}=f;
 const item={id:'entity-source',title:'Caf&eacute; &amp; cinema &#x1F3AC; <img data-entity-attack src=x>',source:'BBC &amp; Partners',description:'Original &quot;source&quot; context &#233;.',event_type:'Release &amp; interview',published_at:'2026-10-20T12:00:00Z',url:'https://www.bbc.com/news/articles/original?x=1&y=2',source_home:'https://www.bbc.com/',country:'GB',language:'en',category:'entertainment',image:'https://ichef.bbci.co.uk/news/1024/original-source.jpg',seo:{primary_keyword:'Film &amp; television'}};
 const original=JSON.stringify(item),card=w.__newsEntity.card(item,'local');w.document.querySelector('main').append(card);
 assert.equal(card.querySelector('h3').textContent,'Café & cinema 🎬 <img data-entity-attack src=x>');
 assert.equal(card.querySelector('.ma-news-summary').textContent,'Original "source" context é.');
 assert.match(card.querySelector('.ma-news-source').textContent,/^BBC & Partners · /);
 assert.equal(card.querySelector('.ma-news-event').textContent,'Release & interview');assert.equal(card.dataset.primaryKeyword,'Film & television');
 const link=card.querySelector('a'),img=card.querySelector('img');assert.equal(link.href,item.url);assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer external');assert.equal(img.src,item.image);assert.equal(card.querySelectorAll('img').length,1);assert.equal(card.querySelector('[data-entity-attack]'),null);
 assert.equal(img.width,240);assert.equal(img.height,135);assert.equal(JSON.stringify(item),original,'source record stays immutable');
 link.addEventListener('click',event=>event.preventDefault());link.click();assert.equal(w.dataLayer.length,1);assert.equal(w.dataLayer[0].event,'latest_news_click');assert.equal(w.dataLayer[0].news_source,'BBC & Partners');assert.equal(w.dataLayer[0].news_id,item.id);assert.equal(card.querySelector('img'),img);assert.equal(card.querySelector('a'),link);
 assert.equal(w.__entityAttack,0);assert.deepEqual(f.requests,[]);
});
