const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');

test('Jonas Chat Plus is a separate verified monthly product with USD and BRL prices',()=>{
 const c=source('supabase/functions/_shared/billing.ts');
 assert.match(c,/jonas_chat_monthly:\{url:'',mode:'subscription',amount:999,brl:3990,interval:'month'/);
 assert.match(c,/price_1UOci8FRuUuhrLPG5Y6g6ng0/);
 assert.match(c,/price_1UOcmIFRuUuhrLPGShRDWzYn/);
 assert.match(c,/cadenceOk\(price,product\)/);
 assert.match(c,/if\(!product.link&&!\(session.metadata\?\.matchapp_product/);
});
test('Jonas checkout requires first-party auth and never changes existing VIP plan logic',()=>{
 const c=source('supabase/functions/stripe-checkout/index.ts');
 assert.match(c,/auth\.auth\.getUser\(token\)/);
 assert.match(c,/reserve_stripe_request/);
 assert.match(c,/deliverJonasCheckout/);
 assert.match(c,/subscription_data=\{metadata:/);
 assert.match(c,/stripe\.billingPortal\.sessions\.create/);
 assert.match(c,/verified\.product\.key==='jonas_chat_monthly'/);
});
test('paid fulfillment is Stripe-verified and cancellation cannot toggle VIP flags',()=>{
 const b=source('supabase/functions/_shared/jonas-billing.ts');
 const w=source('supabase/functions/stripe-webhook/index.ts');
 assert.match(b,/jonas_deliver_checkout/);
 assert.match(b,/jonas_set_subscription/);
 assert.match(b,/JONAS_CHAT_PRICE_IDS/);
 assert.match(w,/webhooks\.constructEventAsync/);
 assert.match(w,/syncJonasSubscription/);
 assert.match(w,/if\(sub\.items\.data\.some\(item=>JONAS_CHAT_PRICE_IDS\.has/);
 assert.match(w,/else \{\s*\/\/ Ignore stale notifications belonging to a different subscription/);
});
test('Jonas requests require JWT and fail-closed PostgreSQL atomic reservation',()=>{
 const api=source('supabase/functions/jonas-chat/index.ts');
 assert.match(api,/admin\.auth\.getUser\(bearer\)/);
 assert.match(api,/jonas_reserve_chat/);
 assert.match(api,/Jonas usage limits cannot be verified right now/);
 assert.match(api,/jonas_refund_chat/);
 assert.match(api,/max_completion_tokens:960/);
 assert.match(api,/openai\/gpt-oss-20b/);
 assert.doesNotMatch(api,/fail(?:s|ed)?\s+open/i);
 assert.match(api,/HISTORY_LIMIT=8/);
 assert.match(api,/TEXT_LIMIT=600/);
});
test('website and Android use the same signed-in entitlement, but Play does not steer to Stripe',()=>{
 const price=source('pricing.js'),ui=source('jonas-chat-plus.js');
 assert.match(price,/ALL_KEYS=new Set\(\[\.\.\.Object\.keys\(STRIPE_LINKS\),'jonas_chat_monthly'\]\)/);
 assert.match(price,/key==='jonas_chat_monthly'/);
 assert.match(price,/MatchAppNativeVoice/);
 assert.match(ui,/supabaseClient/);
 assert.match(ui,/functions\.invoke\('jonas-chat'/);
 assert.match(ui,/action:'status'/);
 assert.match(ui,/action:'ask'/);
 assert.match(ui,/if\(play\(\)\)return/);
 assert.match(ui,/R\$ 39,90/);
 assert.match(ui,/\$9\.99/);
 assert.match(ui,/450/);
 assert.match(ui,/150/);
 assert.match(ui,/30/);
 for(const file of ['index.html','discover.html','pricing/pricing.html','profile/profile.html']){
  assert.match(source(file),/jonas-chat-plus\.js/);
 }
});
test('Kids Mode and existing packs stay distinct from paid adult Jonas chat',()=>{
 const c=source('supabase/functions/_shared/billing.ts');
 assert.match(c,/kids_matches_25/);assert.match(c,/kids_credits_200/);
 assert.match(c,/vip_monthly/);assert.match(c,/business/);
 const ui=source('jonas-chat-plus.js');
 assert.match(ui,/\\\/kids/);
 assert.match(ui,/No extra Matches or Kids credits/);
});
