const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const early=fs.readFileSync(path.join(root,'android-early-ui-20261011.js'),'utf8');
for(const [type,ua,yes] of [
 ['browser','Mozilla/5.0 Chrome/145.0',false],
 ['Android shell','Mozilla/5.0 Chrome/145.0 MatchAppTVAndroid/1.1.38 MatchAppAiAndroid/1.1.38 MatchAppLaunchIntro/1',true]
]){
 const classes=[],styles=[];
 const doc={
  documentElement:{classList:{add(...a){classes.push(...a)}},appendChild(el){styles.push(el)}},
  head:{appendChild(el){styles.push(el)}},
  createElement(tag){assert.equal(tag,'style');return {id:'',textContent:''}}
 };
 vm.runInNewContext(early,{navigator:{userAgent:ua},document:doc},{timeout:1000});
 assert.equal(classes.includes('matchapp-ai-android'),yes,type+' class');
 assert.equal(styles.length,yes?1:0,type+' style');
 if(yes){assert.match(styles[0].textContent,/\.ma-kids-mode-entry/);assert.match(styles[0].textContent,/data-matchapp-kids-entry/)}
}
function assertEarlyBootstrap(html,label){
 const dom=new JSDOM(html,{includeNodeLocations:true});
 try{
  const doc=dom.window.document,actual=node=>node.namespaceURI==='http://www.w3.org/1999/xhtml'&&!node.closest('template,svg,math');
  const scripts=[...doc.querySelectorAll('script[src]')].filter(node=>actual(node)&&/^\/android-early-ui-20261011\.js(?:[?#]|$)/.test(node.getAttribute('src')));
  assert.equal(scripts.length,1,'one actual early bootstrap on '+label);const bootstrap=scripts[0];
  assert(doc.head.contains(bootstrap),'early bootstrap must load in head on '+label);
  assert(!bootstrap.hasAttribute('async')&&!bootstrap.hasAttribute('defer')&&!bootstrap.hasAttribute('nomodule'),'native guard must execute synchronously on '+label);
  assert(['','text/javascript','application/javascript'].includes((bootstrap.getAttribute('type')||'').trim().toLowerCase()),'native guard must be a classic script on '+label);
  const executable=[...doc.head.querySelectorAll('script')].filter(node=>actual(node)&&(!node.type||/^(?:text|application)\/javascript$|^module$/i.test(node.type)));
  assert.equal(executable[0],bootstrap,'native guard precedes other head runtimes on '+label);
  const at=dom.nodeLocation(bootstrap),head=dom.nodeLocation(doc.head),body=dom.nodeLocation(doc.body);
  assert(at.startOffset>=head.startTag.endOffset&&at.endOffset<=head.endTag.startOffset&&at.endOffset<=body.startTag.startOffset,'native guard is parsed before body UI on '+label);
  for(const link of doc.head.querySelectorAll('link[rel]'))if(actual(link)&&(link.getAttribute('rel')||'').toLowerCase().split(/\s+/).includes('stylesheet'))assert(at.endOffset<=dom.nodeLocation(link).startOffset,'native guard precedes blocking stylesheets on '+label);
 }finally{dom.window.close();}
}
for(const p of ['index.html','discover.html'])assertEarlyBootstrap(fs.readFileSync(path.join(root,p),'utf8'),p);
const guard='<script src="/android-early-ui-20261011.js?v=fixture"></script>';
assert.throws(()=>assertEarlyBootstrap('<html><head><!-- '+guard+' --></head><body></body></html>','comment example'),/one actual early bootstrap/);
assert.throws(()=>assertEarlyBootstrap('<html><head>'+guard.replace('<script ','<script defer ')+'</head><body></body></html>','deferred guard'),/execute synchronously/);
assert.throws(()=>assertEarlyBootstrap('<html><head><link rel="stylesheet" href="/blocking.css">'+guard+'</head><body></body></html>','late guard'),/precedes blocking stylesheets/);
const source=fs.readFileSync(path.join(root,'discover.js'),'utf8');
assert.match(source,/document\.activeElement === el/);
assert.match(source,/el\.blur\(\);/);
assert.match(source,/function revealJonasTurn\(node\)/);
assert.match(source,/log\.scrollTop=/);
assert.doesNotMatch(source,/\(bubble\?\.wrap \|\| row\)\.scrollIntoView/);
console.log('PASS: Android early no-Kids isolation, browsers unaffected, both entry pages bootstrap early, Android keyboard scroll protection');