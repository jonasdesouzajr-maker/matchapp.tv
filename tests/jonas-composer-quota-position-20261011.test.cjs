const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('AI quota remains functional but is mounted below entire mic/send composer',()=>{
 const source=read('discover.js'),begin=source.indexOf('function paintAiSendCost()'),end=source.indexOf("document.addEventListener('matchapp:langchange'",begin);
 assert.ok(begin>0&&end>begin);
 const fragment=source.slice(begin,end);
 const dom=new JSDOM('<div class="newsearch-row"><div class="composer"><textarea></textarea><button id="mic-btn-discover"></button><button class="composer-send"></button></div><div id="discover-compose-help">Screen reader help</div></div>',{url:'https://matchapp.tv/discover.html'});
 const {document}=dom.window,state={remaining:4,limit:10,paidCredits:0};
 const fn=new Function('document','lastAiCostState','AI_COST_COPY','aiCostLang',fragment+';paintAiSendCost();paintAiSendCost();');
 fn(document,state,{en:{left:'Each question uses 1 AI action · {remaining} of {limit} left today',credits:'Credits {credits}',none:'No AI actions'}},()=> 'en');
 const composer=document.querySelector('.composer'),cost=document.getElementById('ai-send-cost');
 assert.ok(cost);
 assert.equal(cost.parentElement,composer.parentElement);
 assert.equal(cost.previousElementSibling,composer);
 assert.equal(document.querySelectorAll('#ai-send-cost').length,1);
 assert.match(cost.textContent,/4 of 10 left/);
 assert.equal(composer.children.length,3,'no unwanted quota control inside 3-column composer');
 dom.window.close();
});
test('CSS keeps quota accessible and composer controls intact',()=>{
 const css=read('jonas/composer-quota-row-20261011.css'),html=read('discover.html');
 assert.match(css,/>#ai-send-cost\{/);
 assert.match(css,/\.newsearch-row>#discover-compose-help\{/);
 assert.match(css,/clip-path:inset\(50%\)!important/);
 assert.match(html,/composer-quota-row-20261011\.css\?v=20261011-quota1/);
 assert.match(html,/quota=20261011-row1/);
 assert.match(html,/id="mic-btn-discover"/);
 assert.match(html,/onclick="newDiscoverSearch\(\)"/);
});
