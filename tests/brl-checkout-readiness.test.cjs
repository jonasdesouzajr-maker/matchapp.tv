const fs=require('node:fs');const path=require('node:path');const test=require('node:test');const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');const checkout=fs.readFileSync(path.join(root,'supabase/functions/stripe-checkout/index.ts'),'utf8');const ui=fs.readFileSync(path.join(root,'brl-pricing.js'),'utf8');
test('Brazil checkout is server-gated and Stripe manages eligible Pix presentation',()=>{
  assert.match(checkout,/body\.action==='availability'/);
  assert.match(checkout,/currency==='brl'/);
  assert.doesNotMatch(checkout,/payment_method_types\s*=/);
  assert.match(ui,/action:'availability'/);
  assert.match(ui,/active\.has\(key\)/);
  assert.match(ui,/PIX aparece no Checkout quando elegível/);
});
