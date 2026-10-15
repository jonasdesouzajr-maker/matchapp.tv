const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');const js=fs.readFileSync('patches/support-donations.js','utf8');const config=fs.readFileSync('patches/support-donations-config.js','utf8');
function page(configObj){const start=html.indexOf('<section id="ma-donate-support"');const end=html.indexOf('</section>',start)+10;assert.ok(start>0);const dom=new JSDOM(html.slice(start,end),{url:'https://matchapp.tv/',runScripts:'outside-only'});dom.window.MATCHAPP_SUPPORT_CONFIG=configObj;dom.window.eval(js);return dom;}
test('donation section is below support contacts and before footer legal with owner-confirmed recipient isolated in configuration',()=>{
 assert.ok(html.indexOf('id="ma-donate-support"')>html.indexOf('class="contact-blurb"'));
 assert.ok(html.indexOf('id="ma-donate-support"')<html.indexOf('class="seo-footer-legal"'));
 assert.match(html,/\/patches\/support-donations\.js\?v=/);
 assert.match(html,/\/patches\/support-donations\.css\?v=/);
 assert.match(html,/\/patches\/support-donations-config\.js\?v=/);
 for(const text of [html,js])assert.doesNotMatch(text,/@outlook\.com|hosted_button_id=|recipient=/);
 assert.match(config,/paypalBusinessEmail: 'jonasdesouzajr@outlook.com'/);
});
test('cannot pay without verified PayPal account and enforces a 5 USD minimum',()=>{
 const dom=page({paypalMeUrl:'',verified:false});const w=dom.window,d=w.document;
 d.getElementById('ma-donate-pill').click();
 assert.equal(d.getElementById('ma-donate-panel').hidden,false);
 assert.equal(d.getElementById('ma-donate-checkout').disabled,true);
 assert.equal(w.MatchAppSupportDonations.paymentUrl(),'');
 d.getElementById('ma-donate-amount').value='4';d.getElementById('ma-donate-amount').dispatchEvent(new w.Event('input'));
 assert.match(d.getElementById('ma-donate-status').textContent,/at least US\$5/);
 assert.equal(d.getElementById('ma-donate-checkout').disabled,true);w.close();
});
test('verified PayPal.Me link receives valid custom USD amounts; untrusted URLs rejected',()=>{
 const dom=page({paypalMeUrl:'https://paypal.me/VerifiedTest',verified:true});const w=dom.window,d=w.document;
 assert.equal(w.MatchAppSupportDonations.paymentUrl(),'https://www.paypal.me/VerifiedTest/5.00USD');
 d.getElementById('ma-donate-amount').value='12.75';d.getElementById('ma-donate-amount').dispatchEvent(new w.Event('input'));
 assert.equal(w.MatchAppSupportDonations.paymentUrl(),'https://www.paypal.me/VerifiedTest/12.75USD');
 assert.equal(d.getElementById('ma-donate-checkout').disabled,false);w.close();
 const bad=page({paypalMeUrl:'https://paypal.me.evil.test/wrong',verified:true});assert.equal(bad.window.MatchAppSupportDonations.paymentUrl(),'');bad.window.close();
});
test('Brazilian Portuguese label update keeps USD explicit',()=>{
 const dom=page({paypalMeUrl:'',verified:false});const w=dom.window;w.document.documentElement.lang='pt-BR';w.document.dispatchEvent(new w.Event('matchapp:langchange'));assert.match(w.document.getElementById('ma-donate-pill').textContent,/US\$5/);w.close();
});

test('owner-confirmed email opens only PayPal donation checkout with the chosen amount',()=>{
 const dom=page({paypalBusinessEmail:'jonasdesouzajr@outlook.com',recipientConfirmed:true});const w=dom.window,d=w.document;
 let opened;w.open=(...args)=>{opened=args};d.getElementById('ma-donate-amount').value='12.75';d.getElementById('ma-donate-amount').dispatchEvent(new w.Event('input'));
 const url=new URL(w.MatchAppSupportDonations.paymentUrl());assert.equal(url.origin,'https://www.paypal.com');assert.equal(url.pathname,'/donate/');assert.equal(url.searchParams.get('business'),'jonasdesouzajr@outlook.com');assert.equal(url.searchParams.get('amount'),'12.75');assert.equal(url.searchParams.get('currency_code'),'USD');
 d.getElementById('ma-donate-checkout').click();assert.equal(opened[0],url.href);assert.equal(opened[2],'noopener,noreferrer');
 d.getElementById('ma-donate-amount').value='4';d.getElementById('ma-donate-amount').dispatchEvent(new w.Event('input'));assert.equal(w.MatchAppSupportDonations.paymentUrl(),'');w.close();
 const unconfirmed=page({paypalBusinessEmail:'jonasdesouzajr@outlook.com',recipientConfirmed:false});assert.equal(unconfirmed.window.MatchAppSupportDonations.paymentUrl(),'');unconfirmed.window.close();
});

test('support action has authored copy for every supported app language',()=>{const d=page({});const w=d.window;const labels=new Set();for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){w.document.documentElement.lang=lang;w.document.dispatchEvent(new w.Event('matchapp:langchange'));labels.add(w.document.getElementById('ma-donate-title').textContent);}assert.equal(labels.size,14);w.close();});
