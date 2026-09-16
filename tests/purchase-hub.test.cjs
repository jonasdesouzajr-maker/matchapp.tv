const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','pricing.js'),'utf8');
const billing=fs.readFileSync(path.join(__dirname,'..','supabase/functions/_shared/billing.ts'),'utf8');
const creditsUi=fs.readFileSync(path.join(__dirname,'..','credits-ui.js'),'utf8');

test('purchase hub keeps Matches and Ask AI credits visibly and functionally separate',()=>{
  assert.match(source,/Extra Matches do not expire and never consume Ask AI credits/);
  assert.match(source,/1 credit = 1 Ask AI prompt\. Credits are for Ask AI only and never buy Matches/);
  assert.match(source,/data-match-pack=/);
  assert.match(source,/data-credit-pack=/);
  assert.match(source,/window\.buyMatches/);
  assert.match(source,/window\.buyCredits/);
  assert.match(source,/id="match-packs-section"/);
});

test('legacy shared-credit purchase UI is removed from interaction',()=>{
  assert.match(source,/legacyPurchaseUi/);
  assert.match(source,/aria-hidden/);
  assert.match(source,/tabindex/);
  assert.match(source,/credits-section\[data-legacy-purchase-ui\]\{display:none!important\}/);
});

test('purchase tab navigation preserves language and other query parameters',()=>{
  assert.match(source,/const url=new URL\(location\.href\)/);
  assert.match(source,/url\.searchParams\.set\('focus',b\.dataset\.target\)/);
  assert.doesNotMatch(source,/history\.replaceState\(null,'',`\?focus=/);
});

test('purchase controls expose keyboard and checkout progress accessibility',()=>{
  assert.match(source,/aria-controls=/);
  assert.match(source,/role="tabpanel"/);
  assert.match(source,/ArrowLeft/);
  assert.match(source,/ArrowRight/);
  assert.match(source,/aria-busy/);
  assert.match(source,/prefers-reduced-motion:reduce/);
});

test('every billed product has a live Stripe Payment Link matching the server catalog',()=>{
  const keys=['ad_free','vip_monthly','vip_annual','business','credits_25','credits_75','credits_200','credits_500','matches_5','matches_25','matches_50'];
  for(const key of keys){
    const ui=source.match(new RegExp(key+":'(https://buy\\.stripe\\.com/[^']+)'"));
    const server=billing.match(new RegExp(key+":\\{url:'(https://buy\\.stripe\\.com/[^']+)'"));
    assert.ok(ui, key+' missing from pricing.js');
    assert.ok(server, key+' missing from billing.ts');
    assert.equal(ui[1], server[1], key+' Payment Link must match server catalog');
  }
});

function loadPricing(sb, extras={}){
  const assigned=[];
  const stored={};
  const listeners={};
  const el={disabled:false,textContent:'Buy',setAttribute(){},removeAttribute(){}};
  const ctx={
    console, Set, Map, URL, URLSearchParams,
    matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),
    location:{pathname:'/pricing/pricing.html',href:'https://matchapp.tv/pricing/pricing.html',hash:'',search:'',assign:u=>assigned.push(String(u))},
    sessionStorage:{getItem:k=>Object.prototype.hasOwnProperty.call(stored,k)?stored[k]:null,setItem:(k,v)=>{stored[k]=String(v)},removeItem:k=>{delete stored[k]}},
    supabaseClient:sb,
    openAuthModal:extras.openAuthModal||(()=>{}),
    showToast:extras.showToast||(()=>{}),
    document:{
      readyState:'complete',
      getElementById:id=>id==='purchase-hub'?{id:'purchase-hub'}:id.startsWith('btn-')?el:null,
      querySelector:()=>el,
      querySelectorAll:()=>[],
      createElement:()=>({id:'',style:{},className:'',setAttribute(){},appendChild(){}}),
      head:{appendChild(){}},
      body:{appendChild(){}},
      addEventListener:(type,fn)=>{(listeners[type]=listeners[type]||[]).push(fn)}
    },
    window:null
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(source,ctx);
  return {ctx, assigned, stored, el};
}

test('Buy Matches opens Stripe Checkout, falling back to the Payment Link',async()=>{
  const user={id:'00000000-0000-4000-8000-000000000021',email:'buyer@matchapp.tv'};
  const sb={auth:{getSession:async()=>({data:{session:{user}}})},functions:{invoke:async()=>({data:null,error:{message:'down'}})}};
  const {ctx, assigned}=loadPricing(sb);
  await ctx.buyMatches('matches_5');
  assert.equal(assigned.length,1);
  assert.match(assigned[0],/^https:\/\/buy\.stripe\.com\/eVq6oH2FX6hg1BIbolcfK0g/);
  assert.match(assigned[0],/client_reference_id=00000000-0000-4000-8000-000000000021/);
  assigned.length=0;
  sb.functions.invoke=async()=>({data:{url:'https://checkout.stripe.com/c/pay/cs_live_test'},error:null});
  await ctx.processCheckout('vip_monthly');
  assert.equal(assigned[0],'https://checkout.stripe.com/c/pay/cs_live_test');
});

test('signed-out Buy Matches opens sign-in instead of a dead click',async()=>{
  let opened=false;
  const sb={auth:{getSession:async()=>({data:{session:null}})}};
  const {ctx, stored}=loadPricing(sb,{openAuthModal:()=>{opened=true}});
  await ctx.buyMatches('matches_25');
  assert.equal(opened,true);
  assert.equal(stored.match_pending_checkout,'matches_25');
});

test('out-of-matches panel buys Extra Matches instead of a dead link',()=>{
  assert.match(creditsUi,/Buy more Matches/);
  assert.match(creditsUi,/data-match=/);
  assert.match(creditsUi,/window\.buyMatches/);
  assert.match(creditsUi,/match-packs-section/);
});
