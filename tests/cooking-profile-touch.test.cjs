const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const C=require('../cooking/catalog.js');
test('cooking directory returns reviewed exact-source candidates or labelled channel exploration',()=>{
 assert.equal(C.find('bibimbap').items[0].id,'bibimbap');
 assert.equal(C.find('omelete').items[0].channelId,'panelinha');
 for(const q of ['unlisted dish xyz','vegan nut-free birthday cake','',null]){const r=C.find(q);assert(r.items.length);if(r.fallback)assert(r.items.every(x=>x.channel));}
 assert(C.isCooking('Receitas da Rita Lobo'));assert(C.isCooking('How do I make scrambled eggs?'));assert(!C.isCooking('Recommend a funny movie'));
 for(const r of C.recipes){assert(C.channels.some(c=>c.id===r.channelId));assert.match(r.url,/^https:\/\//);if(r.video)assert.match(r.video,/^[\w-]{11}$/);}
});
test('recipe search handles unknown inputs and video iframes only load after a deliberate click',()=>{
 const d=new JSDOM(fs.readFileSync('cooking/index.html','utf8'),{url:'https://matchapp.tv/cooking/',runScripts:'outside-only'}),w=d.window;
 w.eval(fs.readFileSync('cooking/catalog.js','utf8'));w.eval(fs.readFileSync('cooking/cooking.js','utf8'));
 assert.equal(w.document.querySelectorAll('iframe').length,0);assert.equal(w.document.querySelectorAll('#cooking-results article').length,5);
 w.document.querySelector('#cooking-results button').click();assert.equal(w.document.querySelectorAll('iframe').length,1);
 w.document.getElementById('cooking-query').value='<script>unknown dish</script>';w.document.getElementById('cooking-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
 assert.match(w.document.getElementById('cooking-status').textContent,/not exact recipe matches/);assert.equal(w.document.querySelectorAll('#cooking-results article').length,4);assert.equal(w.document.querySelectorAll('#cooking-results script').length,0);d.window.close();
});
test('taste save validates, closes, announces and reopens with selections intact from Settings',async()=>{
 const d=new JSDOM('<section class="premium-card profile-hub-target"><button id="save-profile-btn"></button></section><details id="settings-panel"><div class="settings-body"></div></details>',{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
 w.eval(fs.readFileSync('taste-profile.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const quiz=w.document.getElementById('taste-quiz'),button=w.document.getElementById('taste-save');button.click();assert.equal(quiz.hidden,false);assert.match(quiz.querySelector('.taste-status').textContent,/every question/);
 quiz.querySelectorAll('fieldset').forEach(f=>f.querySelector('input').checked=true);button.click();await new Promise(r=>setTimeout(r,30));assert.equal(quiz.hidden,true);assert.equal(JSON.parse(w.localStorage.getItem('match_taste')).done,true);assert.match(w.document.getElementById('taste-saved-toast').textContent,/Taste DNA saved/);
 w.document.getElementById('taste-edit').click();assert.equal(quiz.hidden,false);assert.equal(quiz.querySelectorAll('input:checked').length,quiz.querySelectorAll('fieldset').length);d.window.close();
});
test('profile hero shares canonical avatar resolution and Home preserves both touch axes',()=>{
 const source=fs.readFileSync('final-audit.js','utf8');assert.match(source,/avatar=window.resolveUserAvatar\?\.\(\)/);assert.match(source,/audit-profile-avatar\\?" data-avatar-slot/);
 const home=fs.readFileSync('index.html','utf8');assert.match(home,/touch-action: pan-x pan-y pinch-zoom/);assert.doesNotMatch(home,/touch-action: pan-x pinch-zoom/);
 const doc=new JSDOM(home).window.document;assert.equal(doc.querySelector('#questionnaire-box').nextElementSibling.id,'ebook-matcher-root');
});
test('cooking chat keeps existing quota gate and excludes entertainment fallback and movie hydration',()=>{
 const source=fs.readFileSync('discover.js','utf8');assert(source.indexOf("checkDailyLimit('ask_ai')")<source.indexOf('const cookingIntent ='));assert.match(source,/!bookIntent && !cookingIntent && wantsTitleRecommendations/);assert.match(source,/if\(cookingIntent\)payload.results=\[\]/);
 const backend=fs.readFileSync('supabase/functions/gemini-proxy/index.ts','utf8');assert.match(backend,/cookingIntent = !kidsMode/);assert.match(backend,/Return an empty results array: the client renders independently reviewed cooking source links/);
});
