'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const labels={"en": "Help me grow the business", "pt-BR": "Ajude meu negócio a crescer", "es": "Ayúdame a hacer crecer mi negocio", "fr": "Aidez-moi à développer mon activité", "de": "Hilf mir, mein Unternehmen auszubauen", "it": "Aiutami a far crescere la mia attività", "tr": "İşimi büyütmeme destek ol", "ru": "Помогите мне развивать своё дело", "ar": "ساعدني على تنمية مشروعي", "hi": "मेरा व्यवसाय बढ़ाने में मदद करें", "id": "Bantu saya mengembangkan usaha ini", "ja": "事業の成長を応援する", "ko": "사업 성장을 응원해 주세요", "zh": "助我发展这项事业"};
function fixture(){
 const source=read('index.html'),start=source.indexOf('<section id="ma-donate-support"'),end=source.indexOf('</section>',start)+10;
 const dom=new JSDOM('<html lang="en"><body class="page-home">'+source.slice(start,end)+'</body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 dom.window.MATCHAPP_SUPPORT_CONFIG={paypalMeUrl:'https://paypal.me/VerifiedTest',verified:true};
 dom.window.fetch=()=>{throw Error('Support presentation must not call a provider');};
 dom.window.open=()=>{throw Error('No payment action is authorized by this fixture');};
 return dom;
}
test('closed support is only the compact trigger while original copy/disclosures live inside its hidden panel',()=>{
 const dom=fixture(),d=dom.window.document;
 try{
  const section=d.querySelector('#ma-donate-support'),panel=d.querySelector('#ma-donate-panel'),button=d.querySelector('#ma-donate-pill');
  assert.equal(button.textContent,labels.en);assert.equal(button.getAttribute('aria-controls'),panel.id);assert.equal(button.getAttribute('aria-expanded'),'false');assert(panel.hidden);
  assert.deepEqual([...section.children].map(e=>e.id),['ma-donate-pill','ma-donate-panel']);
  for(const id of ['ma-donate-kicker','ma-donate-title','ma-donate-desc','ma-donate-footnote','ma-donate-choose','ma-donate-amount','ma-donate-checkout','ma-donate-status'])assert(panel.contains(d.getElementById(id)),id+' stays disclosed only after opening');
  assert.equal(d.querySelector('#ma-donate-amount').getAttribute('min'),'5');
  assert.deepEqual([...d.querySelectorAll('[data-donate-value]')].map(e=>e.dataset.donateValue),['5','10','25']);
  assert.match(panel.textContent,/minimum \$5/);assert.match(panel.textContent,/not a tax-deductible/);
  assert.ok(d.getElementById('ma-donate-footnote').compareDocumentPosition(d.getElementById('ma-donate-checkout')) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING,'contribution notice is read before the checkout action');
  assert.ok(read('index.html').includes('href="/founder/" data-founder-link'));
 }finally{dom.window.close();}
});
test('all 14 business-support labels retain the original controls, disclosure and selected contribution',async()=>{
 const dom=fixture(),w=dom.window,d=w.document;
 try{
  const controls=[...d.querySelectorAll('button,input')],pill=d.getElementById('ma-donate-pill'),panel=d.getElementById('ma-donate-panel'),input=d.getElementById('ma-donate-amount');
  w.eval(read('patches/support-donations.js'));w.eval(read('patches/reference-support.js'));d.dispatchEvent(new w.Event('DOMContentLoaded'));
  for(const [lang,label]of Object.entries(labels)){
   w.MATCH_LANG=lang;d.documentElement.lang=lang;d.dispatchEvent(new w.Event('matchapp:langchange'));await Promise.resolve();
   assert.equal(pill.textContent,label,lang);assert.doesNotMatch(pill.textContent,/5|USD|US\$|chapter|capítulo/);assert.deepEqual([...d.querySelectorAll('button,input')],controls);
   pill.click();assert.equal(panel.hidden,false);assert.equal(pill.getAttribute('aria-expanded'),'true');
   d.querySelector('[data-donate-value="25"]').click();assert.equal(input.value,'25');assert.equal(d.querySelector('[data-donate-value="25"]').getAttribute('aria-pressed'),'true');
   assert.equal(w.MatchAppSupportDonations.paymentUrl(),'https://www.paypal.me/VerifiedTest/25.00USD');
   assert.ok(d.getElementById('ma-donate-footnote').textContent.length>40,'existing authored contribution notice remains');
   pill.click();assert(panel.hidden);assert.equal(pill.getAttribute('aria-expanded'),'false');
  }
  input.value='4';input.dispatchEvent(new w.Event('input'));assert(d.getElementById('ma-donate-checkout').disabled);assert.equal(w.MatchAppSupportDonations.paymentUrl(),'');
 }finally{w.close();}
});