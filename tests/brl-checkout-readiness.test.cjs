const fs=require('node:fs');const path=require('node:path');const test=require('node:test');const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');const checkout=fs.readFileSync(path.join(root,'supabase/functions/stripe-checkout/index.ts'),'utf8');const ui=fs.readFileSync(path.join(root,'brl-pricing.js'),'utf8');
const pricing=fs.readFileSync(path.join(root,'pricing.js'),'utf8');const billing=fs.readFileSync(path.join(root,'supabase/functions/_shared/billing.ts'),'utf8');
test('Brazil checkout is server-gated and Stripe manages eligible Pix presentation',()=>{
  assert.match(checkout,/body\.action==='availability'/);
  assert.match(checkout,/currency==='brl'/);
  assert.doesNotMatch(checkout,/payment_method_types\s*=/);
  assert.match(ui,/action:'availability'/);
  assert.match(ui,/active\.has\(key\)/);
  assert.match(ui,/PIX aparece no Checkout quando elegível/);
  assert.match(pricing,/MatchBillingMarket\?\.ready/);
  assert.match(pricing,/market:'BR',currency:'brl'/);
});
test('hosted checkout never requires Organization, tax ID or phone',()=>{
  assert.match(checkout,/name_collection:\{business:\{enabled:false\},individual:\{enabled:false\}\}/);
  assert.match(checkout,/tax_id_collection:\{enabled:false,required:'never'\}/);
  assert.match(checkout,/phone_number_collection:\{enabled:false\}/);
  assert.match(checkout,/billing_address_collection:'auto'/);
  assert.match(checkout,/automatic_tax:\{enabled:false\}/);
  assert.doesNotMatch(checkout,/invoice_creation/);
  assert.match(checkout,/customer_email/);
});
test('USD Payment Links stay in lockstep between the buy buttons and the server catalog',()=>{
  const keys=['ad_free','vip_monthly','vip_annual','business','credits_25','credits_75','credits_200','credits_500','matches_5','matches_25','matches_50'];
  for(const key of keys){
    const uiLink=pricing.match(new RegExp(key+":'(https://buy\\.stripe\\.com/[^']+)'"));
    const serverLink=billing.match(new RegExp(key+":\\{url:'(https://buy\\.stripe\\.com/[^']+)'"));
    assert.ok(uiLink,key+' missing from pricing.js');
    assert.ok(serverLink,key+' missing from billing.ts');
    assert.equal(uiLink[1],serverLink[1],key+' Payment Link must match');
  }
});
