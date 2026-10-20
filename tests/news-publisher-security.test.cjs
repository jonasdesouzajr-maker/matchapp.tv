'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'tools/refresh-news-rss.js'),'utf8');
const entry=source.search(/^\(async\b/m);
assert.ok(entry>0,'locate the publisher entry point without executing it');

function definitions({filesystem=fs,fetcher=()=>{throw new Error('No upstream request is allowed in this fixture');},schedule=setTimeout,cancel=clearTimeout}={}){
  return vm.runInNewContext(source.slice(0,entry)+'\n;({clean,parse,page,hub,readSports,enrichMissingImages,ensureArticleAnalyticsFile,FEEDS,isAllowed,TOPIC,RUMOR,NON_NEWS,get})',{
    __dirname:path.join(ROOT,'tools'),URL,URLSearchParams,AbortController,Buffer,setTimeout:schedule,clearTimeout:cancel,
    console:{log(){},warn(){},error(){}},fetch:fetcher,
    require(name){
      if(name==='node:fs')return filesystem;
      if(name==='../news-monetization.js')return {eligibleArticle:()=>false,offers:[],offersMarkup:()=>''};
      if(name==='./finalize-brand.js')return require('../tools/finalize-brand.js');
      assert.ok(['node:path','node:crypto'].includes(name),'unexpected renderer dependency: '+name);
      return require(name);
    }
  });
}

function withArticle(run){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'news-security-'));
  try{return run(path.join(dir,'index.html'),dir);}
  finally{fs.rmSync(dir,{recursive:true,force:true});}
}

function story(title){
  return {
    id:'fixture1',title,url:'https://www.bbc.com/news/articles/fixture',source:'BBC',source_domain:'bbc.com',source_home:'https://www.bbc.com',
    country:'GB',language:'en',category:'entertainment',event_type:'Release',person:'',description:'Original publisher context.',
    published_at:'2026-10-18T12:00:00Z',discovered_at:'2026-10-18T12:00:00Z',image:null,
    matchapp_url:'https://matchapp.tv/news/articles/fixture/',landing_url:'https://matchapp.tv/?news=fixture1#latest-news',
    seo:{meta_title:title+' | MatchApp Ai',meta_description:'Original publisher context.',keywords:['film'],short_tail:['film'],entity_keywords:[],trend_keywords:[],seo_generated_at:'2026-10-18T12:00:00Z'}
  };
}

test('RSS entities decode once, retain valid Unicode, and leave malformed numeric entities literal',()=>{
  const {clean}=definitions();
  assert.equal(clean('<![CDATA[<b>Caf&#233; &amp; cinema</b> &#x201C;A&#x201D; &#39;B&apos; &quot;C&quot;&nbsp;&lt;3&gt; &#X1F3AC;]]>'),'Café & cinema “A” \'B\' "C" <3> 🎬');
  assert.equal(clean('&amp;lt; &amp;#39; &#38;lt; &#x26;quot;'),'&lt; &#39; &lt; &quot;');
  assert.equal(clean('&#1114112; &#x110000; &#xD800; &#0; &#999999999999999999999999999;'),'&#1114112; &#x110000; &#xD800; &#0; &#999999999999999999999999999;');
  assert.equal(clean('&#x10FFFF;'),String.fromCodePoint(0x10ffff));
  assert.equal(clean('&unknown; &AMP;'),'&unknown; &AMP;');
});

test('repeated RSS cleanup cannot break out of article or hub JSON-LD, and JSON data round-trips',()=>{
  const api=definitions(),closing='</script><script data-rss-probe>0</script>';
  const encode=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const titles=[];
  for(const depth of [2,3]){
    let encoded=closing;
    for(let i=0;i<depth;i++)encoded=encode(encoded);
    const row=api.parse('<rss><item><title>Movie premiere official news '+encoded+'</title><link>https://www.bbc.com/news/articles/fixture</link></item></rss>',api.FEEDS[0])[0];
    const title=api.clean(row.title);
    assert.ok(api.isAllowed(row.link,row.feed)&&title.length>=18&&title.length<=220&&api.TOPIC.test(title)&&!api.RUMOR.test(title)&&!api.NON_NEWS.test(title));
    titles.push(title);
  }
  titles.push('Movie premiere official news '+closing);
  for(const title of titles){
    const item=story(title);
    for(const [name,html] of [['article',api.page(item)],['hub',api.hub([item],item.discovered_at)]]){
      assert.doesNotMatch(html,/<script data-rss-probe>/,name+' must not emit a data-supplied script element');
      const matches=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      assert.equal(matches.length,1,name+' has one intact JSON-LD block');
      assert.doesNotMatch(matches[0][1],/</,name+' JSON-LD contains no HTML tag opener');
      const graph=JSON.parse(matches[0][1])['@graph'][0];
      assert.equal(name==='article'?graph.name:graph.mainEntity.itemListElement[0].name,title);
    }
  }
});

test('analytics repairs preserve approved normal LF and CRLF bytes and are idempotent',()=>{
  const api=definitions();
  const expected={LF:'3c5ca5a166ec34023f3b07501aeac837a66edce0d90b2d6391d436bc36e46db8',CRLF:'abd487c219c5143ea14e7fe99995ad28b815bdbbaaba36bbd275589973cded12'};
  for(const [kind,eol] of [['LF','\n'],['CRLF','\r\n']])withArticle(file=>{
    const input=['<!doctype html>','<html><head><title>Café 🎬</title></head>','<body><p>Original article.</p></body></html>',''].join(eol);
    fs.writeFileSync(file,input);
    assert.equal(api.ensureArticleAnalyticsFile(file),true);
    const after=fs.readFileSync(file);
    assert.equal(crypto.createHash('sha256').update(after).digest('hex'),expected[kind]);
    assert.equal(api.ensureArticleAnalyticsFile(file),false);
    assert.deepEqual(fs.readFileSync(file),after);
  });
});

test('analytics keeps its opened file across a pathname replacement, short UTF-8 writes and stale tail',()=>withArticle((file,dir)=>{
  const original='<!doctype html><html><head><title>Café 🎬</title></head><body>Original article.</body></html>';
  const previous=path.join(dir,'original-opened.html'),replacement='REPLACEMENT MUST STAY EXACT';
  fs.writeFileSync(file,original);
  let fd,reads=0,writes=0,closed=0;
  const filesystem={...fs,
    openSync(...args){fd=fs.openSync(...args);return fd;},
    readFileSync(target,encoding){
      const result=fs.readFileSync(target,encoding);
      if(reads++===0){fs.renameSync(file,previous);fs.writeFileSync(file,replacement);fs.appendFileSync(previous,'STALE_TAIL'.repeat(1000));}
      return result;
    },
    writeSync(target,bytes,offset,length,position){
      assert.equal(target,fd);assert.equal(position,offset,'file position must match each consumed byte offset');writes++;
      return fs.writeSync(target,bytes,offset,Math.min(length,17),position);
    },
    closeSync(target){closed++;return fs.closeSync(target);}
  };
  assert.equal(definitions({filesystem}).ensureArticleAnalyticsFile(file),true);
  assert.equal(fs.readFileSync(file,'utf8'),replacement);
  const repaired=fs.readFileSync(previous,'utf8');
  assert.ok(repaired.startsWith('<!doctype html><html><head>'));
  assert.ok(repaired.endsWith('Original article.</body></html>'));
  assert.match(repaired,/Café 🎬/);assert.match(repaired,/googletagmanager\.com\/gtm\.js\?id=/);
  assert.match(repaired,/googletagmanager\.com\/ns\.html\?id=GTM-M7J3NNBN/);assert.doesNotMatch(repaired,/STALE_TAIL/);
  assert.ok(writes>1,'exercise partial writes');assert.equal(closed,1);
  assert.throws(()=>fs.fstatSync(fd),{code:'EBADF'});
}));

test('analytics skips missing files, propagates real open errors, and closes on read/write/truncate failure',()=>{
  withArticle(file=>{
    assert.equal(definitions().ensureArticleAnalyticsFile(file),false);
    assert.equal(fs.existsSync(file),false);
  });
  const denied=Object.assign(new Error('denied'),{code:'EACCES'});
  assert.throws(()=>definitions({filesystem:{...fs,openSync(){throw denied;}}}).ensureArticleAnalyticsFile('denied'),e=>e===denied);
  for(const phase of ['read','zero-write','write','truncate'])withArticle(file=>{
    fs.writeFileSync(file,'<html><head></head><body>Original.</body></html>');
    let fd,closed=0;
    const failure=new Error('fixture '+phase);
    const filesystem={...fs,
      openSync(...args){fd=fs.openSync(...args);return fd;},
      readFileSync(...args){if(phase==='read')throw failure;return fs.readFileSync(...args);},
      writeSync(...args){if(phase==='zero-write')return 0;if(phase==='write')throw failure;return fs.writeSync(...args);},
      ftruncateSync(...args){if(phase==='truncate')throw failure;return fs.ftruncateSync(...args);},
      closeSync(target){closed++;return fs.closeSync(target);}
    };
    assert.throws(()=>definitions({filesystem}).ensureArticleAnalyticsFile(file),phase==='zero-write'?/Could not finish article analytics write/:e=>e===failure);
    assert.equal(closed,1,phase+' closes its descriptor');
    assert.throws(()=>fs.fstatSync(fd),{code:'EBADF'});
  });
});

test('file-backed sports records never enter publisher image requests',async()=>{
  const now=new Date().toISOString();
  const sports={id:'sports1',title:'Verified sports headline',category:'sports',url:'https://www.espn.com/sport/fixture',published_at:now};
  const requests=[];
  const api=definitions({filesystem:{...fs,existsSync:()=>true,readFileSync:()=>JSON.stringify({updated_at:now,items:[sports,{...sports,id:'wrong',category:'entertainment'}]})},
    fetcher:async(url,options)=>{requests.push({url,options});return {ok:true,text:async()=>'<meta property="og:image" content="https://images.example.test/poster.jpg">'};}
  });
  const snapshot=api.readSports();
  assert.deepEqual(Array.from(snapshot.items,x=>x.id),['sports1']);
  await api.enrichMissingImages(snapshot.items);
  assert.equal(requests.length,0);
  const fresh={category:'entertainment',url:'https://www.bbc.com/news/articles/fixture',source:'BBC',image:null};
  await api.enrichMissingImages([fresh]);
  assert.equal(requests.length,1);assert.equal(requests[0].url,fresh.url);
  assert.equal(requests[0].options.body,undefined);assert.equal(requests[0].options.headers.authorization,undefined);
  assert.equal(fresh.image,'https://images.example.test/poster.jpg');
});

test('news requests preserve every configured feed, publisher aliases and the exact Google Trends host',async()=>{
  const requests=[];
  const api=definitions({fetcher:async(url,options)=>{
    requests.push({url,options});return {ok:true,status:200,text:async()=>'publisher response'};
  }});
  const urls=[...Array.from(api.FEEDS,feed=>feed.url),
    'https://www.bbc.com/news/articles/fixture','https://www.bbc.co.uk/news/articles/fixture',
    'https://edition.cnn.com/entertainment/fixture','https://www.reuters.com/world/fixture',
    'https://trends.google.com/trending/rss?geo=BR'];
  for(const url of urls)assert.equal(await api.get(url),'publisher response');
  assert.deepEqual(requests.map(r=>r.url),urls);
  for(const {options} of requests){
    assert.equal(options.redirect,'manual');assert.equal(options.method,undefined,'fetch retains its GET default');
    assert.equal(options.body,undefined);assert.equal(options.headers.authorization,undefined);
    assert.equal(options.headers.accept,'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5');
    assert.equal(options.headers['user-agent'],'MatchAppNewsBot/1.2 (+https://matchapp.tv/)');
  }
  await api.get('https://WWW.BBC.COM:443/news/articles/fixture');
  assert.equal(requests.at(-1).url,'https://www.bbc.com/news/articles/fixture');
});

test('untrusted initial news URLs are rejected before fetching or starting a timer',async()=>{
  let requests=0,timers=0;
  const api=definitions({fetcher:async()=>{requests++;throw new Error('unexpected request');},schedule:()=>{timers++;}});
  const urls=['not a URL','//www.bbc.com/news/fixture','http://www.bbc.com/news/fixture',
    'ftp://www.bbc.com/news/fixture','file:///etc/hosts','data:text/plain,news',
    'https://reader:secret@www.bbc.com/news/fixture','https://www.bbc.com:8443/news/fixture',
    'https://www.bbc.com.evil.example/news/fixture','https://www.bbc.com@127.0.0.1/news/fixture',
    'https://127.0.0.1/','https://[::1]/','https://localhost/','https://169.254.169.254/',
    'https://unapproved.example/','https://other.trends.google.com/rss'];
  for(const url of urls)await assert.rejects(api.get(url),/Invalid news request URL|Untrusted news request URL/);
  assert.equal(requests,0);assert.equal(timers,0);
});

test('approved relative and publisher-alias redirects share one ten-second request budget',async()=>{
  const urls=['https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    'https://www.bbc.co.uk/news/premiere','https://www.bbc.co.uk/articles/fixture',
    'https://www.bbc.com/news/articles/fixture','https://www.bbc.com/news/articles/fixture?output=1',
    'https://www.bbc.com/news/articles/final'];
  const locations=[urls[1],'../articles/fixture',urls[3],'?output=1','/news/articles/final'];
  const statuses=[301,302,303,307,308],requests=[],scheduled=[],cleared=[];
  let cancelled=0;
  const token={budget:true};
  const api=definitions({schedule:(callback,delay)=>{scheduled.push({callback,delay});return token;},cancel:id=>cleared.push(id),
    fetcher:async(url,options)=>{
      const hop=requests.length;requests.push({url,options});
      if(hop===locations.length)return {ok:true,status:200,text:async()=>'<html>original report</html>'};
      return {ok:false,status:statuses[hop],headers:{get:name=>name==='location'?locations[hop]:null},
        body:{cancel:async()=>{cancelled++;}},text:async()=>{throw new Error('redirect body must not be read');}};
    }
  });
  assert.equal(await api.get(urls[0],'text/html'),'<html>original report</html>');
  assert.deepEqual(requests.map(r=>r.url),urls);assert.equal(cancelled,5);
  assert.equal(scheduled.length,1);assert.equal(scheduled[0].delay,10000);assert.deepEqual(cleared,[token]);
  assert.ok(requests.every(r=>r.options.signal===requests[0].options.signal));
  assert.ok(requests.every(r=>r.options.redirect==='manual'&&r.options.headers.accept==='text/html'));
});

test('news redirects cannot leave their publisher policy or weaken transport restrictions',async()=>{
  const locations=['https://g1.globo.com/news/fixture','https://trends.google.com/trending/rss?geo=BR',
    'https://www.bbc.com.evil.example/news/fixture','https://127.0.0.1/','https://[::1]/',
    'https://169.254.169.254/','//unapproved.example/','http://www.bbc.com/news/fixture',
    'https://reader:secret@www.bbc.com/news/fixture','https://www.bbc.com:8443/news/fixture'];
  for(const location of locations){
    let requested=0,cancelled=0;
    const api=definitions({fetcher:async()=>{
      requested++;return {ok:false,status:302,headers:{get:()=>location},body:{cancel:async()=>{cancelled++;}}};
    }});
    await assert.rejects(api.get('https://www.bbc.com/news/fixture'),/Untrusted news request URL/);
    assert.equal(requested,1,'must reject before contacting the redirect destination');assert.equal(cancelled,1);
  }
  let requested=0;
  const trends=definitions({fetcher:async()=>{requested++;return {ok:false,status:302,headers:{get:()=>'https://news.google.com/rss'}};}});
  await assert.rejects(trends.get('https://trends.google.com/trending/rss?geo=BR'),/Untrusted news request URL/);
  assert.equal(requested,1,'Trends does not authorize other Google hosts');
});

test('missing or malformed redirects and unsuccessful responses release their bodies and timer',async()=>{
  const cases=[{status:302,location:null,error:/no location/},{status:307,location:'https://[',error:/Invalid URL/},
    ...[300,304,404,429,503].map(status=>({status,location:'https://www.bbc.com/fixture',error:new RegExp('HTTP '+status)}))];
  for(const {status,location,error} of cases){
    let requested=0,cancelled=0,cleared=0;
    const token={};
    const api=definitions({schedule:()=>token,cancel:id=>{assert.equal(id,token);cleared++;},fetcher:async()=>{
      requested++;return {ok:false,status,headers:{get:()=>location},body:{cancel:async()=>{cancelled++;}}};
    }});
    await assert.rejects(api.get('https://www.bbc.com/news/fixture'),error);
    assert.equal(requested,1);assert.equal(cancelled,1);assert.equal(cleared,1);
  }
});

test('news redirect exhaustion performs at most the initial request plus five approved hops',async()=>{
  let requested=0,cancelled=0,scheduled=0,cleared=0;
  const api=definitions({schedule:()=>{scheduled++;return 1;},cancel:()=>{cleared++;},fetcher:async()=>{
    requested++;return {ok:false,status:301,headers:{get:()=>'/news/redirect-'+requested},body:{cancel:async()=>{cancelled++;}}};
  }});
  await assert.rejects(api.get('https://www.bbc.com/news/start'),/redirect limit exceeded/);
  assert.equal(requested,6);assert.equal(cancelled,6);assert.equal(scheduled,1);assert.equal(cleared,1);
});

test('one news deadline aborts a later fetch or its final body read after a redirect',async()=>{
  for(const phase of ['fetch','body']){
    let expire,requested=0,cancelled=0,cleared=0,started;
    const pendingStarted=new Promise(resolve=>{started=resolve;});
    const signals=[],scheduled=[];
    const waitForAbort=signal=>new Promise((resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(signal.reason),{once:true});started();
    });
    const api=definitions({schedule:(callback,delay)=>{expire=callback;scheduled.push(delay);return 1;},cancel:()=>{cleared++;},
      fetcher:async(url,options)=>{
        requested++;signals.push(options.signal);
        if(requested===1)return {ok:false,status:302,headers:{get:()=>'/news/final'},body:{cancel:async()=>{cancelled++;}}};
        if(phase==='fetch')return waitForAbort(options.signal);
        return {ok:true,status:200,text:()=>waitForAbort(options.signal)};
      }
    });
    const pending=api.get('https://www.bbc.com/news/start');
    await pendingStarted;expire();
    await assert.rejects(pending,error=>error.name==='AbortError');
    assert.deepEqual(scheduled,[10000]);assert.equal(requested,2);assert.equal(cancelled,1);assert.equal(cleared,1);
    assert.equal(signals[0],signals[1]);assert.equal(signals[0].aborted,true);
  }
});

test('news request cleanup propagates network, body and cancellation failures without retries',async()=>{
  for(const phase of ['network','body','cancel']){
    const failure=new Error('fixture '+phase);let requested=0,cleared=0;
    const api=definitions({schedule:()=>1,cancel:()=>{cleared++;},fetcher:async()=>{
      requested++;
      if(phase==='network')throw failure;
      if(phase==='body')return {ok:true,status:200,text:async()=>{throw failure;}};
      return {ok:false,status:302,headers:{get:()=>'/news/next'},body:{cancel:async()=>{throw failure;}}};
    }});
    await assert.rejects(api.get('https://www.bbc.com/news/fixture'),error=>error===failure);
    assert.equal(requested,1);assert.equal(cleared,1);
  }
});

test('rejected image requests leave article selection and source metadata intact',async()=>{
  let requests=0;
  const api=definitions({fetcher:async()=>{requests++;throw new Error('unexpected request');}});
  const article={...story('Original publisher film premiere'),url:'http://www.bbc.com/news/articles/fixture'};
  const before={...article};
  assert.ok(api.isAllowed(article.url,api.FEEDS[0]),'request hardening does not rewrite article selection policy');
  const items=[article];
  assert.equal(await api.enrichMissingImages(items),items);
  assert.deepEqual(article,before);assert.equal(requests,0);assert.equal(article.image,null);
});
