const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
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
for(const p of ['index.html','discover.html']){
 const html=fs.readFileSync(path.join(root,p),'utf8');
 assert.match(html.slice(0,500),/android-early-ui-20261011\.js/,'early bootstrap must load in head on '+p);
}
const source=fs.readFileSync(path.join(root,'discover.js'),'utf8');
assert.match(source,/document\.activeElement === el/);
assert.match(source,/el\.blur\(\);/);
assert.match(source,/\(bubble\?\.wrap \|\| row\)\.scrollIntoView/);
console.log('PASS: Android early no-Kids isolation, browsers unaffected, both entry pages bootstrap early, Android keyboard scroll protection');