/* © 2026 MatchApp.tv — billing UI. Every product opens Stripe; Payment Links are the guaranteed path.
   Hosted Checkout (stripe-checkout) is payment-only: no Organization, tax ID or phone.
   Dashboard Payment Links must keep Collect business name / tax IDs OFF so the fallback matches. */
console.log('MatchApp verified payments initialized');
const pt=(key,fallback)=>{try{if(typeof window.t==='function'){const v=window.t(key);if(v&&v!==key)return v}}catch(_){}return fallback};
const PENDING_KEY='match_pending_checkout';
const STRIPE_LINKS={
  ad_free:'https://buy.stripe.com/dRmeVd4O58po8068c9cfK0j',
  vip_monthly:'https://buy.stripe.com/bJe7sL6WdfRQ94adwtcfK08',
  vip_annual:'https://buy.stripe.com/6oU6oH2FX8po1BI9gdcfK0f',
  business:'https://buy.stripe.com/4gM00ja8peNMdkq641cfK0e',
  credits_25:'https://buy.stripe.com/14A9ATdkB8po4NU641cfK0a',
  credits_75:'https://buy.stripe.com/aFaeVdeoF9ts4NU9gdcfK0b',
  credits_200:'https://buy.stripe.com/8x2aEXgwN5dc4NUakhcfK0c',
  credits_500:'https://buy.stripe.com/5kQcN50xP35494afEBcfK0d',
  matches_5:'https://buy.stripe.com/eVq6oH2FX6hg1BIbolcfK0g',
  matches_25:'https://buy.stripe.com/28E4gz0xP210gwCdwtcfK0h',
  matches_50:'https://buy.stripe.com/dRm5kDcgxcFEcgmcspcfK0i'
};
window.STRIPE_LINKS=STRIPE_LINKS;
const CREDIT_PACKS=[{key:'credits_25',credits:25,price:'$2.99'},{key:'credits_75',credits:75,price:'$6.99',badge:'Most popular'},{key:'credits_200',credits:200,price:'$14.99'},{key:'credits_500',credits:500,price:'$29.99',badge:'Best value'}];
const MATCH_PACKS=[{key:'matches_5',matches:5,price:'$0.99'},{key:'matches_25',matches:25,price:'$2.99',badge:'Most popular'},{key:'matches_50',matches:50,price:'$4.99',badge:'Best value'}];
window.CREDIT_PACKS=CREDIT_PACKS;window.MATCH_PACKS=MATCH_PACKS;
const ALL_KEYS=new Set([...Object.keys(STRIPE_LINKS)]);
function notify(message,isError){if(typeof window.showToast==='function')window.showToast(message,isError);else try{alert(message)}catch(_){}}
function productButton(key){return document.getElementById('btn-'+key)||document.querySelector('[data-match-pack="'+key+'"],[data-credit-pack="'+key+'"],[data-match="'+key+'"],[data-pack="'+key+'"],[data-product="'+key+'"]')}
function paymentLinkUrl(key,user){const base=STRIPE_LINKS[key];if(!base)return'';const u=new URL(base);if(user?.id)u.searchParams.set('client_reference_id',user.id);if(user?.email)u.searchParams.set('prefilled_email',user.email);return u.toString()}
function ensureAuthModal(){if(document.getElementById('main-auth-modal'))return;const m=document.createElement('div');m.id='main-auth-modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Sign in to MatchApp');m.style.cssText='display:none;position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:9999;justify-content:center;align-items:center;backdrop-filter:blur(15px)';m.innerHTML='<div class="premium-card" style="width:90%;max-width:450px;position:relative"><button type="button" class="auth-close" onclick="closeAuthModal()" aria-label="Close sign-in">×</button><h3 style="text-align:center;color:var(--gold);font-size:26px;margin-top:0;text-transform:uppercase">Unlock Full Concierge</h3><button onclick="loginWithGoogle()" class="google-signin-btn" type="button"><span>Continue with Google</span></button><div class="auth-divider"><span>or continue with email</span></div><div class="auth-tabs" style="margin-top:20px"><div id="tab-login" class="auth-tab active" onclick="switchAuthTab(\'login\')">Log In</div><div id="tab-signup" class="auth-tab" onclick="switchAuthTab(\'signup\')">Sign Up</div></div><div id="form-login" class="auth-form-section active"><input type="email" id="login-email" autocomplete="username" placeholder="Email Address" style="width:100%;padding:16px;margin-bottom:15px;border-radius:12px;border:1px solid var(--gold);background:#000;color:#fff"><input type="password" id="login-password" autocomplete="current-password" placeholder="Password" style="width:100%;padding:16px;margin-bottom:25px;border-radius:12px;border:1px solid var(--gold);background:#000;color:#fff"><button onclick="handleEmailLogin()" class="gold-btn" style="width:100%;padding:18px;font-size:20px">Log In</button></div><div id="form-signup" class="auth-form-section"><input type="email" id="reg-email" placeholder="Email Address" style="width:100%;padding:16px;margin-bottom:15px;border-radius:12px;border:1px solid var(--gold);background:#000;color:#fff"><input type="password" id="reg-password" placeholder="Create Password" style="width:100%;padding:16px;margin-bottom:25px;border-radius:12px;border:1px solid var(--gold);background:#000;color:#fff"><button onclick="handleEmailSignup()" class="gold-btn" style="width:100%;padding:18px;font-size:20px">Create Free Account</button></div><p id="auth-message" style="font-size:15px;margin-top:25px;display:none;font-weight:bold;text-align:center;padding:12px;border-radius:10px"></p></div>';document.body.appendChild(m)}
function rememberPending(key){try{sessionStorage.setItem(PENDING_KEY,key)}catch(_){}}
async function resumePendingCheckout(){
  const sb=window.supabaseClient;if(!sb)return;
  let user=null;try{user=(await sb.auth.getSession())?.data?.session?.user||null}catch(_){return}
  if(!user)return;
  let key=null;try{key=sessionStorage.getItem(PENDING_KEY);if(key)sessionStorage.removeItem(PENDING_KEY)}catch(_){}
  if(key&&ALL_KEYS.has(key))startVerifiedCheckout(key,productButton(key));
}
async function ensureSignInControl(){
  const nav=document.getElementById('header-auth-area');
  if(!nav||document.getElementById('nav-reg-btn'))return;
  let signedIn=false;try{signedIn=!!(await window.supabaseClient?.auth.getSession())?.data?.session}catch(_){}
  if(signedIn)return;
  const b=document.createElement('button');
  b.id='nav-reg-btn';b.type='button';b.className='gold-btn';
  b.textContent=pt('nav.signin','Sign In / Join');
  b.style.cssText='padding:12px 20px;font-size:14px;width:auto;text-transform:uppercase';
  b.addEventListener('click',()=>{ensureAuthModal();window.openAuthModal?.()});
  nav.insertBefore(b,nav.firstChild);
}
async function startVerifiedCheckout(product,button){
  const key=String(product||'');
  if(!ALL_KEYS.has(key)){notify(pt('billing.error','Could not start checkout. Please try again.'),true);return}
  ensureAuthModal();
  const sb=window.supabaseClient,el=button||productButton(key),original=el?.textContent;
  let session=null,user=null;
  try{session=sb?await sb.auth.getSession():null;user=session?.data?.session?.user||null}catch(_){}
  if(!user){rememberPending(key);notify(pt('billing.signin','Please sign in to continue to checkout.'));window.openAuthModal?.();return}
  if(el){el.disabled=true;el.setAttribute('aria-busy','true');el.textContent=pt('billing.redirect','Redirecting…')}
  try{
    if(sb?.functions?.invoke){
      const {data,error}=await sb.functions.invoke('stripe-checkout',{body:{product:key,lang:window.MATCH_LANG||'en'}});
      if(!error&&data?.url&&data.url.startsWith('https://checkout.stripe.com/')){window.location.assign(data.url);return}
    }
  }catch(_){}
  const fallback=paymentLinkUrl(key,user);
  if(fallback){window.location.assign(fallback);return}
  notify(pt('billing.error','Could not start checkout. Please try again.'),true);
  if(el){el.disabled=false;el.removeAttribute('aria-busy');el.textContent=original}
}
window.startVerifiedCheckout=startVerifiedCheckout;
window.processCheckout=planType=>startVerifiedCheckout(planType,document.getElementById('btn-'+planType)||productButton(planType));
window.buyCredits=key=>{if(CREDIT_PACKS.some(p=>p.key===key))return startVerifiedCheckout(key,document.querySelector('[data-credit-pack="'+key+'"],[data-pack="'+key+'"]'))};
window.buyMatches=key=>{if(MATCH_PACKS.some(p=>p.key===key))return startVerifiedCheckout(key,document.querySelector('[data-match-pack="'+key+'"],[data-match="'+key+'"]'))};
function purchaseStyles(){if(document.getElementById('purchase-hub-style'))return;const s=document.createElement('style');s.id='purchase-hub-style';s.textContent=`.purchase-hub{margin:26px auto 38px;max-width:980px;padding:22px;border:1px solid #ffffff18;border-radius:24px;background:linear-gradient(145deg,#171126e8,#090812f2);box-shadow:0 24px 70px #0008}.purchase-hub h2{margin:0;color:#f7f3ff;font-size:clamp(1.6rem,4vw,2.5rem)}.purchase-hub>p{color:#aaa1bc}.purchase-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:6px;background:#07060dbd;border:1px solid #ffffff12;border-radius:18px;margin:20px 0}.purchase-tab{border:0;border-radius:13px;padding:13px;background:transparent;color:#c8c1d8;font-weight:900;cursor:pointer}.purchase-tab[aria-selected=true]{background:linear-gradient(135deg,#6d3df5,#8b5cf6);color:#fff}.purchase-panel{scroll-margin-top:100px;border:1px solid #ffffff16;border-radius:20px;padding:20px;margin-top:14px}.purchase-panel h3{margin:0 0 6px;color:#fff}.purchase-panel p{color:#aaa1bc;margin:0 0 16px}.purchase-pack-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px}.purchase-pack{position:relative;padding:18px 12px;border:1px solid #ffffff18;border-radius:17px;background:#ffffff08;text-align:center}.purchase-pack strong{display:block;color:#fff;font-size:1.75rem}.purchase-pack small{display:block;color:#aaa1bc}.purchase-pack b{display:block;color:#fff;margin:10px 0}.purchase-pack button{width:100%;border:0;border-radius:12px;padding:11px;background:linear-gradient(135deg,#6d3df5,#8b5cf6);color:#fff;font-weight:900;cursor:pointer}.purchase-panel[data-kind=matches] .purchase-pack button{background:linear-gradient(135deg,#c89120,#f2c94c);color:#151008}.purchase-badge{position:absolute;top:-8px;right:8px;background:#241044;color:#e9ddff;border:1px solid #8b5cf677;border-radius:999px;padding:3px 7px;font-size:.62rem}.credits-section[data-legacy-purchase-ui]{display:none!important}@media(max-width:520px){.purchase-hub{padding:15px}.purchase-pack-grid{grid-template-columns:1fr 1fr}.purchase-tab{font-size:.82rem;padding:11px 7px}}@media(prefers-reduced-motion:reduce){.purchase-pack{transition:none}.purchase-pack:hover{transform:none}}`;document.head.appendChild(s)}
function isPricingPage(){const p=(location.pathname||'').replace(/\/+$/,'')||'/';return p==='/pricing'||p==='/pricing/pricing.html'||p.endsWith('/pricing.html')}
function renderHub(){if(!isPricingPage())return;const legacy=document.querySelector('.credits-section'),anchor=legacy||document.querySelector('.container');if(!anchor||document.getElementById('purchase-hub'))return;purchaseStyles();if(legacy){legacy.dataset.legacyPurchaseUi='true';legacy.setAttribute('aria-hidden','true');legacy.querySelectorAll('button,a,input,select,textarea').forEach(el=>el.setAttribute('tabindex','-1'))}const hub=document.createElement('section');hub.id='purchase-hub';hub.className='purchase-hub';hub.setAttribute('aria-labelledby','purchase-hub-title');hub.innerHTML=`<h2 id="purchase-hub-title">In-App Purchases</h2><p>Your included daily AI-action allowance is used first. After that, Matches and Ask AI use separate top-up balances.</p><div class="purchase-tabs" role="tablist" aria-label="Purchase type"><button id="purchase-tab-matches" class="purchase-tab" data-target="matches" role="tab" aria-controls="match-packs-section">★ Extra Matches</button><button id="purchase-tab-credits" class="purchase-tab" data-target="credits" role="tab" aria-controls="ask-ai-credits">✦ Ask AI Credits</button></div><section id="match-packs-section" class="purchase-panel" data-kind="matches" role="tabpanel" aria-labelledby="purchase-tab-matches"><h3>Buy More Matches</h3><p>For Matches only. Extra Matches do not expire and never consume Ask AI credits.</p><div class="purchase-pack-grid">${MATCH_PACKS.map(x=>`<article class="purchase-pack">${x.badge?`<span class="purchase-badge">${x.badge}</span>`:''}<strong>${x.matches}</strong><small>Extra Matches</small><b>${x.price}</b><button type="button" data-match-pack="${x.key}" onclick="buyMatches('${x.key}')">Buy Matches</button></article>`).join('')}</div></section><section id="ask-ai-credits" class="purchase-panel" data-kind="credits" role="tabpanel" aria-labelledby="purchase-tab-credits"><h3>Buy Ask AI Credits</h3><p>1 credit = 1 Ask AI prompt. Credits are for Ask AI only and never buy Matches.</p><div class="purchase-pack-grid">${CREDIT_PACKS.map(x=>`<article class="purchase-pack">${x.badge?`<span class="purchase-badge">${x.badge}</span>`:''}<strong>${x.credits}</strong><small>Ask AI Credits</small><b>${x.price}</b><button type="button" data-credit-pack="${x.key}" onclick="buyCredits('${x.key}')">Buy Credits</button></article>`).join('')}</div></section>`;anchor.parentNode.insertBefore(hub,anchor);const select=kind=>{hub.querySelectorAll('.purchase-tab').forEach(b=>{const on=b.dataset.target===kind;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1});const panel=hub.querySelector(kind==='matches'?'#match-packs-section':'#ask-ai-credits');panel?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'})};hub.querySelectorAll('.purchase-tab').forEach((b,i,all)=>{b.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('focus',b.dataset.target);url.hash=b.dataset.target==='matches'?'match-packs-section':'ask-ai-credits';history.replaceState(null,'',url.pathname+url.search+url.hash);select(b.dataset.target)});b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const next=all[(i+(e.key==='ArrowRight'?1:-1)+all.length)%all.length];next.click();next.focus()})});const raw=new URLSearchParams(location.search).get('focus')||location.hash.slice(1);select(/credit|ask-ai/i.test(raw)?'credits':'matches')}
function bootBilling(){ensureAuthModal();ensureSignInControl();renderHub();resumePendingCheckout()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootBilling);else bootBilling();
document.addEventListener('matchapp:authchange',()=>{if(window.isUserLoggedIn||window.supabaseClient)resumePendingCheckout()});
