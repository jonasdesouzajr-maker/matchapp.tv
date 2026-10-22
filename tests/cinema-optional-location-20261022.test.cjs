'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const home=read('index.html');
// Execute the module that the real Home loads, not the excluded legacy handler.
const script=home.match(/<script\b[^>]*src="(\/catalog-media\.js\?[^\"]+)"/)[1];
const source=read(new URL(script.replaceAll('&amp;','&'),'https://matchapp.tv').pathname.slice(1));
const title='Street Fighter: São Paulo & Tokyo';
const metadata={title,tmdb_id:123,media_kind:'movie',kids_approved:true,
  availability:{US:{cinema_release_date:'2026-10-16',stream:['Netflix']}}};

function harness({url='https://matchapp.tv/',native=false,unsupported=false,popupBlocked=false,requestThrows=false,framed=false}={}){
  const html='<!doctype html><html lang="en"><body><section id="availability"></section></body></html>';
  const dom=new JSDOM(html,{url,runScripts:'outside-only'});
  let w=dom.window;
  if(framed){
    const frame=w.document.createElement('iframe');
    frame.src='/discover.html?ambient=1&title=Street%20Fighter';w.document.body.appendChild(frame);
    w=frame.contentWindow;w.document.open();w.document.write(html);w.document.close();
  }
  const d=w.document,calls={geo:[],open:[],maps:[],fetch:0},timers=new Map();
  w.MATCH_LANG='en';w.localStorage.setItem('match_lang','en');w.localStorage.setItem('match_user_region','US');
  w.Date.now=()=>Date.UTC(2026,9,22);
  w.fetch=()=>{calls.fetch++;throw Error('Unexpected network request');};
  let nextTimer=0;
  w.setTimeout=(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,delay});return id;};
  w.clearTimeout=id=>timers.delete(id);
  if(native)w.MatchAppNativeStartup={};
  if(!unsupported)Object.defineProperty(w.navigator,'geolocation',{value:{getCurrentPosition(success,error,options){
    calls.geo.push({success,error,options});if(requestThrows)throw Error('Location unavailable');
  }}});
  w.open=(url,target,features)=>{
    calls.open.push({url,target,features});
    if(target==='_self'||target==='_top'){calls.maps.push(url);return null;}
    if(popupBlocked)return null;
    const popup={opener:w,document:d.implementation.createHTMLDocument(''),location:{replace(url){
      assert.equal(popup.opener,null,'The new tab is isolated before navigating to Maps');
      assert.equal(popup.document.querySelector('meta[name="referrer"]')?.content,'no-referrer');
      calls.maps.push(url);
    }},close(){}};
    return popup;
  };
  w.eval(source);d.dispatchEvent(new w.Event('DOMContentLoaded'));
  const api=w.MatchAppCatalogMedia,host=d.getElementById('availability');
  function render(options={},meta=metadata){
    api.renderAvailability(host,meta,{title,region:'US',...options});
    return host.querySelector('.matchapp-cinema-actions a');
  }
  function click(link,options={}){
    let intercepted;
    // Inspect the real handler's decision, then stop JSDOM's unimplemented
    // default navigation. An unintercepted click retains its ordinary anchor.
    link.addEventListener('click',event=>{intercepted=event.defaultPrevented;event.preventDefault();},{once:true});
    link.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,button:0,...options}));
    return intercepted;
  }
  const expire=()=>{
    const deadline=[...timers.values()].find(timer=>timer.delay===8000);
    assert.ok(deadline,'A deadline bounds permission-prompt time as well as location acquisition');deadline.fn();
  };
  return {dom,w,d,api,host,calls,timers,render,click,expire,close:()=>dom.window.close()};
}

test('the active adult entrypoints load the updated catalog module and keep the legacy controller excluded',()=>{
  assert.doesNotMatch(home,/<script\b[^>]*src=["'][^"']*home-ux-lock\.js/);
  for(const page of ['index.html','discover.html','friends.html','together.html','profile/profile.html']){
    assert.match(read(page),/<script\b[^>]*src="\/catalog-media\.js\?[^\"]*cinemalocation=20261022-1/ ,page);
  }
  assert.doesNotMatch(read('kids/index.html'),/cinemalocation=20261022-1/);
});

test('only clicking the loaded adult cinema action requests location and sends rounded coordinates with the original title',()=>{
  const h=harness();
  try{
    const link=h.render(),fallback=link.href,providers=[...h.host.querySelectorAll('.matchapp-provider-actions a')].map(a=>a.href);
    const storage=JSON.stringify(h.w.localStorage),original=JSON.stringify(metadata);
    assert.equal(link.textContent,'Cinemas & showtimes near me');
    assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');
    assert.deepEqual(h.calls.geo,[]);assert.deepEqual(h.calls.open,[]);
    assert.equal(h.click(link),true);assert.equal(h.calls.geo.length,1);assert.deepEqual(h.calls.maps,[]);
    assert.deepEqual(JSON.parse(JSON.stringify(h.calls.geo[0].options)),{enableHighAccuracy:false,timeout:6000,maximumAge:300000});
    h.calls.geo[0].success({coords:{latitude:-23.5505199,longitude:-46.6333094,accuracy:1,altitude:760}});
    assert.equal(h.calls.maps.length,1);
    const target=new URL(h.calls.maps[0]);
    assert.equal(target.origin,'https://www.google.com');assert.equal(target.pathname,'/maps/search/');
    assert.deepEqual([...target.searchParams], [['api','1'],['query',title+' movie showtimes near -23.55,-46.63']]);
    assert.doesNotMatch(target.href,/5505199|6333094|accuracy|altitude/);
    assert.equal(h.calls.open.length,1);assert.equal(h.calls.open[0].target,'_blank');
    assert.equal(link.href,fallback,'Coordinates are not retained in the reusable link');
    assert.equal(link.hasAttribute('aria-busy'),false);
    assert.equal(JSON.stringify(h.w.localStorage),storage);assert.equal(h.w.sessionStorage.length,0);
    assert.equal(JSON.stringify(metadata),original);assert.equal(h.calls.fetch,0);
    assert.deepEqual([...h.host.querySelectorAll('.matchapp-provider-actions a')].map(a=>a.href),providers);
  }finally{h.close();}
});

test('native Maps navigation uses the main window once without an asynchronous blank child WebView',()=>{
  const h=harness({native:true});
  try{
    h.click(h.render());h.calls.geo[0].success({coords:{latitude:0,longitude:0}});
    assert.equal(h.calls.open.length,1);assert.equal(h.calls.open[0].target,'_self');
    assert.equal(h.calls.open[0].features,'noopener,noreferrer');
    assert.equal(new URL(h.calls.maps[0]).searchParams.get('query'),title+' movie showtimes near 0.00,0.00');
  }finally{h.close();}
});

test('a browser popup block falls back to one same-window Maps navigation',()=>{
  const h=harness({popupBlocked:true});
  try{
    h.click(h.render());h.calls.geo[0].success({coords:{latitude:51.507399,longitude:-0.127801}});
    assert.deepEqual(h.calls.open.map(call=>[call.url,call.target]),[['','_blank'],[h.calls.maps[0],'_self']]);
    assert.equal(h.calls.maps.length,1);assert.equal(h.calls.open[1].features,'noopener,noreferrer');
    assert.equal(new URL(h.calls.maps[0]).searchParams.get('query'),title+' movie showtimes near 51.51,-0.13');
  }finally{h.close();}
});

test('the real same-origin Discover iframe sends native and popup-blocked Maps navigation to the top-level app',()=>{
  for(const options of [{native:true},{popupBlocked:true}]){
    const h=harness({...options,framed:true});
    try{
      assert.notEqual(h.w.top,h.w);assert.equal(h.w.parent,h.dom.window);
      assert.equal(h.w.location.pathname,'/discover.html');
      assert.equal(new URL(h.w.location.href).searchParams.get('ambient'),'1');
      h.click(h.render());h.calls.geo[0].success({coords:{latitude:-23.5505199,longitude:-46.6333094}});
      assert.equal(h.calls.maps.length,1);
      const navigation=h.calls.open.at(-1);
      assert.equal(navigation.target,'_top');assert.equal(navigation.features,'noopener,noreferrer');
      assert.equal(new URL(navigation.url).searchParams.get('query'),title+' movie showtimes near -23.55,-46.63');
      assert.ok(h.calls.open.every(call=>call.target!=='_self'),'Maps is never embedded into the title iframe');
    }finally{h.close();}
  }
});

for(const [name,fail] of [
  ['permission denial',h=>h.calls.geo[0].error({code:1})],
  ['unavailable location',h=>h.calls.geo[0].error({code:2})],
  ['location timeout',h=>h.calls.geo[0].error({code:3})],
  ['invalid coordinates',h=>h.calls.geo[0].success({coords:{latitude:91,longitude:12}})],
  ['a stalled permission prompt',h=>h.expire()]
])test(name+' keeps the title fallback and prevents repeated location requests on the page',()=>{
  const h=harness({native:true});
  try{
    const link=h.render(),fallback=link.href;
    assert.equal(h.click(link),true);fail(h);
    assert.deepEqual(h.calls.maps,[fallback]);assert.equal(link.hasAttribute('aria-busy'),false);
    assert.equal(h.click(link),false);assert.equal(link.href,fallback);
    const replacement=h.render();assert.equal(h.click(replacement),false);
    assert.equal(h.calls.geo.length,1,'Rerendering another cinema action does not prompt again');
    h.calls.geo[0].success({coords:{latitude:-23.5505199,longitude:-46.6333094}});
    h.calls.geo[0].error({code:2});
    assert.deepEqual(h.calls.maps,[fallback],'A late callback never navigates twice');
  }finally{h.close();}
});

test('a synchronous geolocation error preserves the same fallback without retrying',()=>{
  const h=harness({requestThrows:true,native:true});
  try{
    const link=h.render();assert.equal(h.click(link),true);
    assert.deepEqual(h.calls.maps,[link.href]);assert.equal(h.click(link),false);assert.equal(h.calls.geo.length,1);
  }finally{h.close();}
});

test('unsupported geolocation remains an ordinary title anchor',()=>{
  const h=harness({unsupported:true});
  try{
    const link=h.render();assert.equal(h.click(link),false);assert.equal(h.click(link),false);
    assert.equal(link.href,h.api.showtimesUrl(title));assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');
    assert.deepEqual(h.calls.geo,[]);assert.deepEqual(h.calls.open,[]);
  }finally{h.close();}
});

test('modified and non-primary clicks retain normal new-tab behavior without requesting location',()=>{
  const h=harness();
  try{
    const link=h.render();
    for(const options of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{button:2}])assert.equal(h.click(link,options),false);
    assert.equal(link.href,h.api.showtimesUrl(title));assert.equal(link.target,'_blank');assert.deepEqual(h.calls.geo,[]);assert.deepEqual(h.calls.open,[]);
  }finally{h.close();}
});

test('Kids, Kids routes and future release actions never request location',()=>{
  for(const options of [{kids:true},{url:'https://matchapp.tv/kids/'},{kidsClass:true},{future:true}]){
    const h=harness(options);
    try{
      if(options.kidsClass)h.d.documentElement.classList.add('kids-mode');
      const meta=options.future?{...metadata,availability:{US:{cinema_release_date:'2027-06-01'}}}:metadata;
      const link=h.render({kids:!!options.kids},meta);
      assert.equal(h.click(link),false);assert.equal(link.href,h.api.showtimesUrl(title));
      assert.deepEqual(h.calls.geo,[]);assert.deepEqual(h.calls.open,[]);
    }finally{h.close();}
  }
});

test('repeated clicks during acquisition share one request and one navigation',()=>{
  const h=harness({native:true});
  try{
    const first=h.render();h.click(first);h.click(first);
    const second=h.render();h.click(second);
    assert.equal(h.calls.geo.length,1);assert.deepEqual(h.calls.maps,[]);
    h.calls.geo[0].success({coords:{latitude:35.689487,longitude:139.691706}});
    h.calls.geo[0].success({coords:{latitude:1,longitude:2}});
    assert.equal(h.calls.maps.length,1);assert.equal([...h.timers.values()].filter(timer=>timer.delay===8000).length,0);
  }finally{h.close();}
});

test('invalid or incomplete coordinates cannot reach the Maps query',()=>{
  const h=harness();
  try{
    const fallback=h.api.showtimesUrl(title);
    for(const coords of [undefined,{}, {latitude:NaN,longitude:0},{latitude:0,longitude:Infinity},
      {latitude:-90.01,longitude:0},{latitude:0,longitude:180.01},{latitude:'1',longitude:2},{latitude:null,longitude:0}]){
      assert.equal(h.api.showtimesUrl(title,coords),fallback);
    }
  }finally{h.close();}
});
