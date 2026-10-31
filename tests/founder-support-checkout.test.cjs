const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const logic = import('../supabase/functions/_shared/founder-support.mjs');
const origin = 'https://matchapp.tv';

function post(form, options = {}) {
  return new Request('https://example.test/functions/v1/founder-support', {
    method:'POST', headers:{origin, 'content-type':'application/x-www-form-urlencoded', ...options}, body:form
  });
}

test('founder sessions lock the submitted amount, USD, one-time mode and fixed return destinations', async () => {
  const {handleFounderSupport} = await logic;
  for (const [amount, cents] of [['30',3000], ['30.01',3001], ['100.5',10050], ['999999.99',99999999]]) {
    const form = new URLSearchParams({amount, lang:'pt-BR', currency:'brl', quantity:'2', recipient:'attacker', success_url:'https://example.org'});
    const mock = async params => {
      assert.equal(params.mode,'payment'); assert.equal(params.locale,'pt-BR');
      assert.deepEqual(params.line_items,[{quantity:1,price_data:{currency:'usd',unit_amount:cents,product_data:{name:'Adv_Dev_Ops · Jonas Junior'}}}]);
      assert.deepEqual(params.adaptive_pricing,{enabled:false});
      assert.deepEqual(params.metadata,{matchapp_campaign:'founder_support'});
      assert.equal(params.success_url,'https://matchapp.tv/founder/?lang=pt-BR#help');
      assert.equal(params.cancel_url,params.success_url);
      return {url:'https://checkout.stripe.com/c/pay/mock'};
    };
    const result = await handleFounderSupport(post(form),async()=>true,mock);
    assert.equal(result.status,303); assert.equal(result.headers.get('location'),'https://checkout.stripe.com/c/pay/mock');
  }
});

test('the server rejects sub-minimum, ambiguous, excessive or non-decimal amounts before contacting Stripe', async () => {
  const {handleFounderSupport} = await logic;
  for(const input of ['29.99','29.999','0','-30','30.0001','3e1','Infinity','1000000.00','','30&amount=3']) {
    let called = false;
    const watch = () => {called = true;};
    const response=await handleFounderSupport(post('lang=ja&amount='+input),watch,watch);
    assert.equal(response.headers.get('location'),'https://matchapp.tv/founder/?lang=ja&support=amount#help');
    assert.equal(called,false,input);
  }
});

test('admission, rate limiting and provider failures cannot create an open redirect', async () => {
  const {handleFounderSupport} = await logic;
  const noCall = () => assert.fail('Unexpected request');
  assert.equal((await handleFounderSupport(post('amount=30',{origin:'https://evil.test'}),noCall,noCall)).status,403);
  assert.equal((await handleFounderSupport(post('amount=30',{'content-type':'application/json'}),noCall,noCall)).status,415);
  assert.equal((await handleFounderSupport(post('x'.repeat(1025)),noCall,noCall)).status,413);
  for(const create of [async()=>({url:'https://checkout.stripe.com.evil.test'}), async()=>{throw Error('unavailable');}]) {
    const r=await handleFounderSupport(post('amount=100'),async()=>true,create);
    assert.equal(r.headers.get('location'),'https://matchapp.tv/founder/?lang=en&support=unavailable#help');
  }
  let created=false;
  const denied=await handleFounderSupport(post('amount=30'),async()=>false,()=>{created=true;});
  assert.equal(created,false);
  assert.match(denied.headers.get('location'),/support=unavailable/);
});

test('signed Stripe events for the founder never enter digital-product or subscription delivery', async () => {
  const {isFounderSupportSession}=await logic;
  const receipt={mode:'payment',currency:'usd',amount_total:3000,metadata:{matchapp_campaign:'founder_support'}};
  assert.equal(isFounderSupportSession(receipt),true);
  for(const change of [{currency:'brl'},{mode:'subscription'},{amount_total:2999},{client_reference_id:'a-user'},{metadata:{}},{metadata:{...receipt.metadata,matchapp_product:'pro_monthly'}}])
    assert.equal(isFounderSupportSession({...receipt,...change}),false);
  const webhook=fs.readFileSync('supabase/functions/stripe-webhook/index.ts','utf8');
  assert.match(webhook,/if\(isFounderSupportSession\(session\)\)\{[\s\S]*?await record\(event.id,event.type,null,'founder_support'\);[\s\S]*?return new Response\([\s\S]*?\n   \}\n   if\(session.payment_status==='paid'\)/);
  assert.match(fs.readFileSync('supabase/config.toml','utf8'), /\[functions\.founder-support\]\s*verify_jwt = false/);
});