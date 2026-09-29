const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');

test('saved Taste DNA folds and can be edited again through Settings',async()=>{
  const dom=new JSDOM('<section class="premium-card profile-hub-target"><button id="save-profile-btn"></button></section><details id="settings-panel"><div class="settings-body"></div></details>',{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  w.eval(fs.readFileSync('taste-profile.js','utf8'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const quiz=w.document.getElementById('taste-quiz');
  const save=w.document.getElementById('taste-save');
  save.click();
  assert.equal(quiz.hidden,false);
  assert.match(quiz.querySelector('.taste-status').textContent,/every question/);
  quiz.querySelectorAll('fieldset').forEach(f=>f.querySelector('input').checked=true);
  save.click();
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(quiz.hidden,true);
  assert.equal(JSON.parse(w.localStorage.getItem('match_taste')).done,true);
  assert.match(w.document.getElementById('taste-saved-toast').textContent,/Taste DNA saved/);
  w.document.getElementById('taste-edit').click();
  assert.equal(quiz.hidden,false);
  assert.equal(quiz.querySelectorAll('input:checked').length,quiz.querySelectorAll('fieldset').length);
  dom.window.close();
});

test('shared avatar and vertical swipe preserved; separate cooking fold defaults closed',()=>{
  const profile=fs.readFileSync('final-audit.js','utf8');
  assert(profile.includes('avatar=window.resolveUserAvatar?.()'));
  assert(profile.includes('data-avatar-slot'));
  const home=fs.readFileSync('index.html','utf8');
  assert(home.includes('touch-action: pan-x pan-y'));
  const doc=new JSDOM(home).window.document;
  const fold=doc.getElementById('cooking-home');
  assert(fold && !fold.open);
  assert.equal(fold.querySelector('a[href="/cooking/"]').textContent.includes('Explore'),true);
  assert.equal(doc.querySelector('#questionnaire-box').nextElementSibling.id,'ebook-matcher-root');
  assert(doc.querySelector('link[href^="/cooking/cooking.css"]'));
  assert.equal(doc.querySelectorAll('ins.adsbygoogle').length>0,true);
});
