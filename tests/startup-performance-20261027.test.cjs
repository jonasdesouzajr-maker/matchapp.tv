'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,40));
test('dynamic artwork shares one observer and unrelated text changes do not rescan the page',async()=>{
 const dom=new JSDOM('<main>'+Array.from({length:22},(_,i)=>'<img loading="lazy" src="/'+i+'.jpg">').join('')+'<p id="status"></p></main>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,observed=new Map();let created=0,scans=0;
 w.IntersectionObserver=class{constructor(cb){created++;this.cb=cb;}observe(n){observed.set(n,(observed.get(n)||0)+1);}unobserve(n){observed.delete(n);}};
 const query=d.querySelectorAll.bind(d);d.querySelectorAll=(...args)=>{scans++;return query(...args);};
 w.eval(read('page-fluidity.js'));await tick();w.dispatchEvent(new w.Event('load'));await tick();
 assert.equal(created,1);assert.equal([...query('img')].filter(img=>img.loading==='eager').length,16);assert.equal(observed.size,6);
 const before=scans;for(let i=0;i<10;i++)d.getElementById('status').textContent='Status '+i;await tick();assert.equal(scans,before,'text updates must not trigger global scans');
 const fragment=d.createElement('section');fragment.innerHTML='<div class="discover-card"><img loading="lazy" src="/new.jpg"></div><div class="marquee-viewport"></div>';d.body.appendChild(fragment);await tick();
 assert.equal(created,1);assert.equal(observed.size,7);assert.equal(fragment.querySelector('.discover-card').classList.contains('fade-in'),true);assert.equal(fragment.querySelector('.marquee-viewport').dataset.fluidRail,'1');
 d.dispatchEvent(new w.Event('matchapp:posterwall'));assert([...observed.values()].every(n=>n===1),'existing lazy images stay observed once');w.close();
});
test('art remains available without IntersectionObserver',async()=>{
 const dom=new JSDOM('<img loading="lazy" src="/poster.jpg">',{runScripts:'outside-only'}),w=dom.window;w.eval(read('page-fluidity.js'));await tick();assert.equal(w.document.querySelector('img').loading,'eager');assert.equal(w.document.querySelector('img').decoding,'async');w.close();
});
test('grid sizing reads independent groups before applying grid writes',async()=>{
 const dom=new JSDOM('<html class="ma-reference"><body><div class="chips" id="a"><button>A</button><button>B</button><button>C</button></div><div class="chips" id="b"><button>D</button><button>E</button><button>F</button></div></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,events=[];
 w.Range.prototype.getClientRects=()=>[{width:30,height:16,top:0}];
 w.HTMLCanvasElement.prototype.getContext=()=>({measureText:t=>({width:t.length*7})});
 w.Element.prototype.getClientRects=function(){events.push('visible:'+this.id);return [{width:320,height:44}];};
 w.Element.prototype.getBoundingClientRect=function(){events.push('width:'+this.id);return {width:320,height:44};};
 const set=w.Element.prototype.setAttribute;w.Element.prototype.setAttribute=function(k,v){if(k==='data-ma-density')events.push('write:'+this.id);return set.call(this,k,v);};
 w.eval(read('patches/reference-density.js'));await tick();
 assert(events.indexOf('width:b')<events.indexOf('write:a'),'second group measured before first group written');
 assert.equal(w.MatchReferenceDensity.inspect().length,2);assert.deepEqual([...d.querySelectorAll('.chips')].map(g=>g.dataset.maDensityRows),['3','3']);w.close();
});
test('compact footer preserves the original explanatory node and disclosure accessibility',()=>{
 const dom=new JSDOM('<body class="page-home"><footer class="seo-footer"><div class="seo-footer-inner"><p class="seo-footer-lede" data-i18n="home.discoveryNote">Original guidance</p><section id="ma-donate-support"></section><p class="seo-footer-legal">Legal text</p><div class="mp-footer-actions"><a href="/sponsor/">Sponsor</a></div><p><a href="/updates.html">Updates</a></p></div></footer></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window,d=w.document,lede=d.querySelector('.seo-footer-lede'),sponsor=d.querySelector('a[href="/sponsor/"]');
 w.eval(read('patches/reference-support.js'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
 const info=d.querySelector('details.ma-home-service-info');assert(info);assert.equal(info.open,false);assert.equal(info.querySelector('.seo-footer-lede'),lede);assert.equal(lede.textContent,'Original guidance');assert.equal(lede.dataset.i18n,'home.discoveryNote');assert.equal(d.querySelector('a[href="/sponsor/"]'),sponsor);info.open=true;assert.equal(info.querySelector('summary').textContent,'Service information');w.close();
});
