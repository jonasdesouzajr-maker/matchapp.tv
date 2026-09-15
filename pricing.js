/* © 2026 MatchApp.tv — billing UI */
console.log("MatchApp verified payments initialized");
const pt=(key,fallback)=>{try{if(typeof window.t==='function'){const v=window.t(key);if(v&&v!==key)return v;}}catch(_){}return fallback;};
async function startVerifiedCheckout(product,button){const sb=window.supabaseClient,original=button?.textContent;try{const session=sb?await sb.auth.getSession():null;if(!session?.data?.session){window.showToast?.(pt('billing.signin','Please sign in to continue to checkout.'));window.openAuthModal?.();return;}if(button){button.disabled=true;button.textContent=pt('billing.redirect','Redirecting…');}const {data,error}=await sb.functions.invoke('stripe-checkout',{body:{product,lang:window.MATCH_LANG||'en'}});if(error||!data?.url||!data.url.startsWith('https://checkout.stripe.com/'))throw new Error('Checkout unavailable');window.location.assign(data.url);}catch(_){window.showToast?.(pt('billing.error','Could not start checkout. Please try again.'),true);}finally{if(button){button.disabled=false;button.textContent=original;}}}
window.processCheckout=planType=>startVerifiedCheckout(planType,document.getElementById('btn-'+planType));

// Ask AI only: 1 credit = 1 Ask AI prompt. Credits never buy/extend Matches.
const CREDIT_PACKS=[
 {key:'credits_25',credits:25,priceCents:299,price:'$2.99'},
 {key:'credits_75',credits:75,priceCents:699,price:'$6.99',badge:'Most popular'},
 {key:'credits_200',credits:200,priceCents:1499,price:'$14.99'},
 {key:'credits_500',credits:500,priceCents:2999,price:'$29.99',badge:'Best value'}
];
window.CREDIT_PACKS=CREDIT_PACKS;
window.buyCredits=key=>{if(CREDIT_PACKS.some(p=>p.key===key))return startVerifiedCheckout(key,document.querySelector('[data-credit-pack="'+key+'"],[data-pack="'+key+'"]'));};

// Matches only. Non-expiring extra Matches; no Ask AI prompts included.
const MATCH_PACKS=[
 {key:'matches_5',matches:5,priceCents:99,price:'$0.99'},
 {key:'matches_25',matches:25,priceCents:299,price:'$2.99',badge:'Most popular'},
 {key:'matches_50',matches:50,priceCents:499,price:'$4.99',badge:'Best value'}
];
window.MATCH_PACKS=MATCH_PACKS;
window.buyMatches=key=>{if(MATCH_PACKS.some(p=>p.key===key))return startVerifiedCheckout(key,document.querySelector('[data-match-pack="'+key+'"],[data-match="'+key+'"]'));};
