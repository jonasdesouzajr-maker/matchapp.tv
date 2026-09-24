const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('matching inner panel has no duplicate box, while the real CTA remains intact',()=>{
 const css=read('matchapp-ia.css'),html=read('index.html');
 assert.match(css,/html body\.page-home #ma-concierge #questionnaire-box\{\s*border:0!important;\s*background:transparent!important;\s*box-shadow:none!important;/);
 assert.match(css,/html body\.page-home #ma-concierge #questionnaire-box::after\{\s*content:none!important;\s*display:none!important;/);
 assert.match(html,/<button onclick="triggerMatch\(false\)"[^>]*class="gold-btn"[^>]*data-i18n="q.submit"/);
 assert.match(html,/\/matchapp-ia\.css\?v=\d{8}-[\w-]+/);
});
