const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/\r\n/g,'\n');
test('result criteria and quota use the chosen language rather than raw English catalogue identifiers',()=>{
 const dom=new JSDOM('<select id="q-mood"><option value="funny">Muito Engraçado</option></select><select id="q-decade"><option value="1990s">Anos 1990</option></select><div id="res-criteria"><div id="res-criteria-chips"></div></div><a id="quota-badge"></a>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 try{w.localStorage.setItem('match_lang','pt-BR');w.MATCH_LANG='pt-BR';w.eval(['i18n.js','polish-i18n.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n'));w.MATCH_LANG='pt-BR';w.lastMatchCriteria={mood:['funny'],decade:['1990s']};w.sanitizeDisplayText=text=>text;
 for(const name of ['normCriteria','tSafe','renderMatchCriteria','updateQuotaBadge'])w.eval(source.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n}\\n'))[0]);
 w.renderMatchCriteria();w.updateQuotaBadge({remaining:2});assert.match(w.document.querySelector('#res-criteria-chips').textContent,/Muito Engraçado/);assert.match(w.document.querySelector('#res-criteria-chips').textContent,/Anos 1990/);assert.doesNotMatch(w.document.querySelector('#quota-badge').textContent,/left today/);assert.equal(w.t('match.loading'),'Encontrando seu match…');assert(w.t('res.seenit'));assert(w.t('match.profile'));
 }finally{w.close();}
});
