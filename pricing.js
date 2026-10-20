/* © 2026 MatchApp.tv — billing UI. Eligible products open verified Stripe Checkout.
   Existing Payment Links remain a fallback only while owned purchase policy permits them.
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
  matches_50:'https://buy.stripe.com/dRm5kDcgxcFEcgmcspcfK0i',
  kids_matches_5:'https://buy.stripe.com/4gM8wP1BTgVUgwCbolcfK0k',
  kids_matches_25:'https://buy.stripe.com/5kQ28rcgxfRQ806gIFcfK0l',
  kids_matches_50:'https://buy.stripe.com/eVq3cv4O5gVUbcidwtcfK0m',
  kids_credits_25:'https://buy.stripe.com/6oU00jcgxgVUcgm785cfK0n',
  kids_credits_75:'https://buy.stripe.com/14AaEX80heNM2FM4ZXcfK0o',
  kids_credits_200:'https://buy.stripe.com/3cI28rbctbBAeouakhcfK0p'
};
window.STRIPE_LINKS=STRIPE_LINKS;
const CREDIT_PACKS=[{key:'credits_25',credits:25,price:'$2.99'},{key:'credits_75',credits:75,price:'$6.99',badge:'Most popular'},{key:'credits_200',credits:200,price:'$14.99'},{key:'credits_500',credits:500,price:'$29.99',badge:'Best value'}];
const MATCH_PACKS=[{key:'matches_5',matches:5,price:'$0.99'},{key:'matches_25',matches:25,price:'$2.99',badge:'Most popular'},{key:'matches_50',matches:50,price:'$4.99',badge:'Best value'}];
const KIDS_MATCH_PACKS=[{key:'kids_matches_5',matches:5,price:'$0.99'},{key:'kids_matches_25',matches:25,price:'$2.99',badge:'Most popular'},{key:'kids_matches_50',matches:50,price:'$4.99',badge:'Best value'}];
const KIDS_CREDIT_PACKS=[{key:'kids_credits_25',credits:25,price:'$2.99'},{key:'kids_credits_75',credits:75,price:'$6.99',badge:'Most popular'},{key:'kids_credits_200',credits:200,price:'$14.99',badge:'Best value'}];
window.CREDIT_PACKS=CREDIT_PACKS;window.MATCH_PACKS=MATCH_PACKS;window.KIDS_MATCH_PACKS=KIDS_MATCH_PACKS;window.KIDS_CREDIT_PACKS=KIDS_CREDIT_PACKS;
const ALL_KEYS=new Set([...Object.keys(STRIPE_LINKS)]);
const CONFLICTING_MATCH_PRODUCTS=new Set(['vip_monthly','vip_annual','business','matches_5','matches_25','matches_50']);
const CHECKOUT_DENIAL_CODES=new Set(['adult_product_retired','purchase_policy_unavailable','purchase_ownership_unavailable','product_already_owned']);
function matchSaleRetired(key){return CONFLICTING_MATCH_PRODUCTS.has(key)&&window.MatchAppTokens?.retireLegacyPromotions===true;}
async function billingBounded(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=window.setTimeout(()=>reject(Error('billing_timeout')),12000)})])}finally{window.clearTimeout(timer)}}
async function checkoutDenial(data,error){
  if(CHECKOUT_DENIAL_CODES.has(data?.code))return data.code;
  if(CHECKOUT_DENIAL_CODES.has(error?.code))return error.code;
  const context=error?.context;
  if(context){
    try{const body=await billingBounded((typeof context.clone==='function'?context.clone():context).json());if(CHECKOUT_DENIAL_CODES.has(body?.code))return body.code}catch(_){}
    if(Number.isInteger(context.status)&&context.status>=400&&context.status<500)return 'checkout_denied';
  }
  return '';
}
// A public Payment Link cannot consult our wallet or ownership on its own. Only
// a fresh, server-authenticated read for this same account may authorize fallback.
async function freshOwnedPurchaseState(sb,user,key){
  if(!sb?.auth?.getUser||!sb.auth.onAuthStateChange||!user?.id)return 'unknown';
  let changed=false,subscription;
  try{
    subscription=sb.auth.onAuthStateChange((_event,current)=>{if(current?.user?.id!==user.id)changed=true})?.data?.subscription;
    if(!subscription?.unsubscribe)return 'unknown';
    return await billingBounded((async()=>{
      const first=await sb.auth.getSession(),session=first?.data?.session;
      if(first?.error||session?.user?.id!==user.id||!session.access_token||changed)return 'unknown';
      const verified=await sb.auth.getUser(session.access_token);
      if(verified?.error||verified?.data?.user?.id!==user.id||changed)return 'unknown';
      const result=key==='ad_free'
        ? await sb.from('profiles').select('ad_free_purchased').eq('id',user.id).maybeSingle()
        : await sb.rpc('match_token_status');
      const last=await sb.auth.getSession();
      if(changed||last?.error||last?.data?.session?.user?.id!==user.id||last.data.session.access_token!==session.access_token||result?.error)return 'unknown';
      if(key==='ad_free')return typeof result?.data?.ad_free_purchased==='boolean'?(result.data.ad_free_purchased?'owned':'allowed'):'unknown';
      const policy=result?.data;
      if(policy?.ok!==true||policy.authenticated!==true||policy.policy_version!=='match-tokens-v1'||typeof policy.enabled!=='boolean')return 'unknown';
      return policy.enabled?'retired':'allowed';
    })());
  }catch(_){return 'unknown';}finally{try{subscription?.unsubscribe()}catch(_){}}
}
// Existing app markers are available before the WebView loads the page. A
// regular Android browser keeps its current web purchase presentation.
function isAndroidBillingApp(){return window.MATCHAPP_ANDROID===true||/MatchAppTVAndroid|MatchAppAiAndroid/i.test(window.navigator?.userAgent||'')||document.documentElement?.classList?.contains('matchapp-android')===true||document.documentElement?.classList?.contains('matchapp-ai-android')===true;}
function paintAndroidPurchaseAvailability(){
  if(!isAndroidBillingApp())return;
  document.querySelectorAll('#btn-ad_free,[data-credit-pack],[data-pack]').forEach(button=>{
    const key=button.id==='btn-ad_free'?'ad_free':button.dataset.creditPack||button.dataset.pack;
    if(key!=='ad_free'&&!CREDIT_PACKS.some(pack=>pack.key===key))return;
    button.disabled=true;button.setAttribute('aria-disabled','true');
    if(key==='ad_free'&&button.dataset.adFreeOwned==='true'){markAdFreeOwned(button);return;}
    button.dataset.androidPurchaseUnavailable='true';
    const text=pt('billing.androidUnavailable','Unavailable in this app version');
    if(button.textContent!==text)button.textContent=text;
  });
}
window.MatchBillingPresentation=Object.freeze({isAndroidApp:isAndroidBillingApp,refresh:paintAndroidPurchaseAvailability});
paintAndroidPurchaseAvailability();
function markAdFreeOwned(button){if(!button)return;delete button.dataset.androidPurchaseUnavailable;button.dataset.adFreeOwned='true';button.disabled=true;button.removeAttribute('aria-busy');button.textContent=pt('billing.alreadyOwned','Already purchased for this account');}
let adFreeOwnershipRead=0;
async function refreshAdFreePurchase(){
  const button=document.getElementById('btn-ad_free'),sb=window.supabaseClient;if(!button||!sb?.auth)return;
  const generation=++adFreeOwnershipRead;
  try{
    const user=(await sb.auth.getSession())?.data?.session?.user;
    if(generation!==adFreeOwnershipRead)return;
    if(button.dataset.adFreeOwned==='true'){delete button.dataset.adFreeOwned;button.disabled=false;button.textContent=pt('pricing.adfree.cta','Get Ad-Free Pass ($1.99)')}
    paintAndroidPurchaseAvailability();
    if(!user)return;
    const state=await freshOwnedPurchaseState(sb,user,'ad_free');
    if(generation===adFreeOwnershipRead&&state==='owned')markAdFreeOwned(button);
  }catch(_){}
}
function notify(message,isError){if(typeof window.showToast==='function')window.showToast(message,isError);else try{if(typeof window.MatchAppDialogs?.alert==='function')void window.MatchAppDialogs.alert(message);else window.alert(message)}catch(_){}}
function productButton(key){return document.getElementById('btn-'+key)||document.querySelector('[data-match-pack="'+key+'"],[data-credit-pack="'+key+'"],[data-kids-match-pack="'+key+'"],[data-kids-credit-pack="'+key+'"],[data-match="'+key+'"],[data-pack="'+key+'"],[data-product="'+key+'"]')}
function paymentLinkUrl(key,user){const base=STRIPE_LINKS[key];if(!base)return'';const u=new URL(base);if(user?.id)u.searchParams.set('client_reference_id',user.id);if(user?.email)u.searchParams.set('prefilled_email',user.email);return u.toString()}
// Display-only copy for the existing auth modal. Home provides the same authored
// field labels inline; reuse that object without adding a startup dependency.
const AUTH_VISUAL_LABELS=window.MatchAppAuthVisualLabels||{
                    en:['Email Address','Create Password','Full Name','Create Free Account','Close sign-in','Password'],
                    pt:['Endereço de e-mail','Crie uma senha','Nome completo','Criar conta gratuita','Fechar acesso','Senha'],
                    es:['Correo electrónico','Crea una contraseña','Nombre completo','Crear cuenta gratuita','Cerrar inicio de sesión','Contraseña'],
                    fr:['Adresse e-mail','Créez un mot de passe','Nom complet','Créer un compte gratuit','Fermer la connexion','Mot de passe'],
                    de:['E-Mail-Adresse','Passwort erstellen','Vollständiger Name','Kostenloses Konto erstellen','Anmeldung schließen','Passwort'],
                    it:['Indirizzo e-mail','Crea una password','Nome completo','Crea un account gratuito','Chiudi accesso','Password'],
                    tr:['E-posta adresi','Parola oluşturun','Ad ve soyad','Ücretsiz hesap oluştur','Giriş penceresini kapat','Parola'],
                    ru:['Адрес электронной почты','Создайте пароль','Полное имя','Создать бесплатный аккаунт','Закрыть вход','Пароль'],
                    ar:['البريد الإلكتروني','أنشئ كلمة مرور','الاسم الكامل','إنشاء حساب مجاني','إغلاق تسجيل الدخول','كلمة المرور'],
                    hi:['ईमेल पता','पासवर्ड बनाएँ','पूरा नाम','निःशुल्क खाता बनाएँ','साइन इन बंद करें','पासवर्ड'],
                    id:['Alamat email','Buat kata sandi','Nama lengkap','Buat akun gratis','Tutup masuk','Kata sandi'],
                    ja:['メールアドレス','パスワードを作成','氏名','無料アカウントを作成','ログインを閉じる','パスワード'],
                    ko:['이메일 주소','비밀번호 만들기','이름','무료 계정 만들기','로그인 닫기','비밀번호'],
                    zh:['电子邮箱','创建密码','姓名','创建免费账户','关闭登录','密码']
                };
window.MatchAppAuthVisualLabels=AUTH_VISUAL_LABELS;
function authVisualLanguage(){let language=window.MATCH_LANG||document.documentElement?.lang||'en';try{language=localStorage.getItem('match_lang')||language}catch(_){}const key=String(language).toLowerCase().split('-')[0];return key==='pt'?'pt-BR':key}
function authVisualField(key,lang){const row=AUTH_VISUAL_LABELS[lang==='pt-BR'?'pt':lang]||AUTH_VISUAL_LABELS.en;const index={email:0,createPassword:1,fullName:2,createAccount:3,close:4,password:5}[key];const existing=key==='email'?'pf.email':key==='fullName'?'pf.fullName':'';if(existing&&typeof window.t==='function'){const text=window.t(existing,lang);if(text&&text!==existing)return text}return row[index]||''}
function paintAuthModalCopy(modal=document.getElementById('main-auth-modal')){
  if(!modal||typeof modal.querySelectorAll!=='function')return;const lang=authVisualLanguage();
  for(const node of [modal,...modal.querySelectorAll('[data-i18n],[data-i18n-aria]')]){
    for(const [attribute,target]of [['data-i18n','textContent'],['data-i18n-aria','aria-label']]){
      const key=node.getAttribute(attribute);if(!key||typeof window.t!=='function')continue;
      const text=window.t(key,lang);if(!text||text===key)continue;
      if(target==='textContent'){if(node.textContent!==text)node.textContent=text}else if(node.getAttribute(target)!==text)node.setAttribute(target,text);
    }
  }
  for(const [binding,target]of [['data-auth-copy','textContent'],['data-auth-copy-placeholder','placeholder'],['data-auth-copy-aria','aria-label'],['data-auth-copy-title','title']]){
    modal.querySelectorAll('['+binding+']').forEach(node=>{const text=authVisualField(node.getAttribute(binding),lang);if(!text)return;if(target==='textContent'){if(node.textContent!==text)node.textContent=text}else if(node.getAttribute(target)!==text)node.setAttribute(target,text)});
  }
  // The existing final audit may add this field after modal construction.
  const name=modal.querySelector('#reg-full-name');if(name){const text=authVisualField('fullName',lang);if(name.placeholder!==text)name.placeholder=text;if(name.getAttribute('aria-label')!==text)name.setAttribute('aria-label',text)}
}
document.addEventListener('matchapp:langchange',()=>paintAuthModalCopy());
document.addEventListener('matchapp:languagechange',()=>paintAuthModalCopy());
window.addEventListener?.('storage',event=>{if(event.key==='match_lang')paintAuthModalCopy()});
function ensureAuthModal(){if(document.getElementById('main-auth-modal')){paintAuthModalCopy();return;}const m=document.createElement('div');m.id='main-auth-modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Sign in to MatchApp');m.setAttribute('data-i18n-aria','auth.login');m.style.cssText='display:none;position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:9999;justify-content:center;align-items:center;backdrop-filter:blur(15px)';m.innerHTML='<div class="premium-card" style="width:90%;max-width:450px;position:relative"><button type="button" class="auth-close" onclick="closeAuthModal()" aria-label="Close sign-in" data-auth-copy-aria="close" data-auth-copy-title="close">×</button><h3 style="text-align:center;color:var(--gold);font-size:26px;margin-top:0;text-transform:uppercase" data-i18n="auth.unlockTitle">Unlock Full Concierge</h3><button onclick="loginWithGoogle()" class="google-signin-btn" type="button"><span data-i18n="auth.continueGoogle">Continue with Google</span></button><div class="auth-divider"><span data-i18n="auth.orEmail">or continue with email</span></div><div class="auth-tabs" style="margin-top:20px"><div id="tab-login" class="auth-tab active" onclick="switchAuthTab(\'login\')" data-i18n="auth.login">Log In</div><div id="tab-signup" class="auth-tab" onclick="switchAuthTab(\'signup\')" data-i18n="auth.signup">Sign Up</div></div><div id="form-login" class="auth-form-section active"><input type="email" id="login-email" autocomplete="username" placeholder="Email Address" data-i18n-placeholder="pf.email" data-i18n-aria="pf.email" data-auth-copy-placeholder="email" data-auth-copy-aria="email" style="width:100%;padding:16px;margin-bottom:15px;border-radius:12px;border:1px solid var(--gold);background:#000;color:#fff"><input type="password" id="login-password" autocomplete="current-password" placeholder="Password" data-auth-copy-placeholder="password" data-auth-copy-aria="password" style="width:100%;padding:16px;margin-bottom:25px;border-radius:12px;border:1px solid var(--gold);background:#000;color:#fff"><button onclick="handleEmailLogin()" class="gold-btn" style="width:100%;padding:18px;font-size:20px" data-i18n="auth.login">Log In</button></div><div id="form-signup" class="auth-form-section"><input type="email" id="reg-email" placeholder="Email Address" data-i18n-placeholder="pf.email" data-i18n-aria="pf.email" data-auth-copy-placeholder="email" data-auth-copy-aria="email" style="width:100%;padding:16px;margin-bottom:15px;border-radius:12px;border:1px solid var(--gold);background:#000;color:#fff"><input type="password" id="reg-password" placeholder="Create Password" data-auth-copy-placeholder="createPassword" data-auth-copy-aria="createPassword" style="width:100%;padding:16px;margin-bottom:25px;border-radius:12px;border:1px solid var(--gold);background:#000;color:#fff"><button onclick="handleEmailSignup()" class="gold-btn" style="width:100%;padding:18px;font-size:20px" data-auth-copy="createAccount">Create Free Account</button></div><p id="auth-message" style="font-size:15px;margin-top:25px;display:none;font-weight:bold;text-align:center;padding:12px;border-radius:10px"></p></div>';document.body.appendChild(m);paintAuthModalCopy(m);const form=m.querySelector?.('#form-signup');if(form&&window.MutationObserver)new MutationObserver(()=>paintAuthModalCopy(m)).observe(form,{childList:true})}
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
  if(matchSaleRetired(key))return;
  if(!ALL_KEYS.has(key)){notify(pt('billing.error','Could not start checkout. Please try again.'),true);return}
  ensureAuthModal();
  const sb=window.supabaseClient,el=button||productButton(key),original=el?.textContent;
  let session=null,user=null;
  try{session=sb?await sb.auth.getSession():null;user=session?.data?.session?.user||null}catch(_){}
  if(!user){rememberPending(key);notify(pt('billing.signin','Please sign in to continue to checkout.'));window.openAuthModal?.();return}
  let accountChanged=false,accountSubscription;
  try{accountSubscription=sb.auth.onAuthStateChange?.((_event,current)=>{if(current?.user?.id!==user.id)accountChanged=true})?.data?.subscription}catch(_){}
  const restore=()=>{if(el?.dataset.adFreeOwned==='true'){markAdFreeOwned(el);return}if(el){el.disabled=false;el.removeAttribute('aria-busy');el.textContent=original}};
  const sameAccount=async()=>{try{const current=await sb.auth.getSession();return !accountChanged&&!current?.error&&current?.data?.session?.user?.id===user.id}catch(_){return false}};
  try{
  if(el){el.disabled=true;el.setAttribute('aria-busy','true');el.textContent=pt('billing.redirect','Redirecting…')}
  let denial='';
  try{
    try{await window.MatchBillingMarket?.ready}catch(_){}
    if(!await sameAccount()||accountChanged){restore();return}
    if(matchSaleRetired(key)){if(el){el.disabled=false;el.removeAttribute('aria-busy');el.textContent=original}return;}
    const useBRL=window.MatchBillingMarket?.market==='BR'&&Array.isArray(window.MatchBillingMarket?.activeProducts)&&window.MatchBillingMarket.activeProducts.includes(key);
    if(sb?.functions?.invoke){
      const body={product:key,lang:window.MATCH_LANG||'en',...(useBRL?{market:'BR',currency:'brl'}:{})};
      const {data,error}=await sb.functions.invoke('stripe-checkout',{body});
      denial=await checkoutDenial(data,error);
      if(!await sameAccount()||accountChanged){restore();return}
      if(denial)throw Error('checkout_denied');
      if(!error&&data?.url&&data.url.startsWith('https://checkout.stripe.com/')){window.location.assign(data.url);return}
    }
  }catch(error){if(!denial)denial=await checkoutDenial(null,error)}
  if(!await sameAccount()||accountChanged){restore();return}
  if(denial==='product_already_owned'){markAdFreeOwned(el);notify(pt('billing.alreadyOwned','Already purchased for this account'));return}
  if(!denial&&!matchSaleRetired(key)){
    const state=CONFLICTING_MATCH_PRODUCTS.has(key)||key==='ad_free'?await freshOwnedPurchaseState(sb,user,key):'allowed';
    // Auth may change while the permission promise settles; the request's
    // observer stays active until this synchronous paint/navigation decision.
    if(accountChanged){restore();return}
    if(state==='owned'){markAdFreeOwned(el);notify(pt('billing.alreadyOwned','Already purchased for this account'));return}
    const fallback=state==='allowed'&&!matchSaleRetired(key)?paymentLinkUrl(key,user):'';
    if(fallback){window.location.assign(fallback);return}
  }
  notify(pt('billing.error','Could not start checkout. Please try again.'),true);
  if(el){el.disabled=false;el.removeAttribute('aria-busy');el.textContent=original}
  }finally{try{accountSubscription?.unsubscribe()}catch(_){}}
}
window.startVerifiedCheckout=startVerifiedCheckout;
window.processCheckout=planType=>startVerifiedCheckout(planType,document.getElementById('btn-'+planType)||productButton(planType));
window.buyCredits=key=>{if(CREDIT_PACKS.some(p=>p.key===key))return startVerifiedCheckout(key,document.querySelector('[data-credit-pack="'+key+'"],[data-pack="'+key+'"]'))};
window.buyMatches=key=>{if(MATCH_PACKS.some(p=>p.key===key))return startVerifiedCheckout(key,document.querySelector('[data-match-pack="'+key+'"],[data-match="'+key+'"]'))};
window.buyKidsMatches=key=>{if(KIDS_MATCH_PACKS.some(p=>p.key===key))return startVerifiedCheckout(key,document.querySelector('[data-kids-match-pack="'+key+'"]'))};
window.buyKidsCredits=key=>{if(KIDS_CREDIT_PACKS.some(p=>p.key===key))return startVerifiedCheckout(key,document.querySelector('[data-kids-credit-pack="'+key+'"]'))};
function purchaseStyles(){if(document.getElementById('purchase-hub-style'))return;const s=document.createElement('style');s.id='purchase-hub-style';s.textContent=`.purchase-hub{margin:26px auto 38px;max-width:980px;padding:22px;border:1px solid #ffffff18;border-radius:24px;background:linear-gradient(145deg,#171126e8,#090812f2);box-shadow:0 24px 70px #0008}.purchase-hub h2{margin:0;color:#f7f3ff;font-size:clamp(1.6rem,4vw,2.5rem)}.purchase-hub>p{color:#aaa1bc}.purchase-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:6px;background:#07060dbd;border:1px solid #ffffff12;border-radius:18px;margin:20px 0}.purchase-tab{border:0;border-radius:13px;padding:13px;background:transparent;color:#c8c1d8;font-weight:900;cursor:pointer}.purchase-tab[aria-selected=true]{background:linear-gradient(135deg,#6d3df5,#8b5cf6);color:#fff}.purchase-panel{scroll-margin-top:100px;border:1px solid #ffffff16;border-radius:20px;padding:20px;margin-top:14px}.purchase-panel h3{margin:0 0 6px;color:#fff}.purchase-panel p{color:#aaa1bc;margin:0 0 16px}.purchase-pack-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px}.purchase-pack{position:relative;padding:18px 12px;border:1px solid #ffffff18;border-radius:17px;background:#ffffff08;text-align:center}.purchase-pack strong{display:block;color:#fff;font-size:1.75rem}.purchase-pack small{display:block;color:#aaa1bc}.purchase-pack b{display:block;color:#fff;margin:10px 0}.purchase-pack button{width:100%;border:0;border-radius:12px;padding:11px;background:linear-gradient(135deg,#6d3df5,#8b5cf6);color:#fff;font-weight:900;cursor:pointer}.purchase-panel[data-kind=matches] .purchase-pack button{background:linear-gradient(135deg,#c89120,#f2c94c);color:#151008}.purchase-panel[data-kind=kids]{background:radial-gradient(circle at 0 0,#4c277544,transparent 42%),linear-gradient(145deg,#171126,#0c1830)}.purchase-panel[data-kind=kids] .purchase-pack button{background:linear-gradient(135deg,#9ee8e6,#ffcf72);color:#28123b}.kids-purchase-groups{display:grid;grid-template-columns:1fr 1fr;gap:16px}.kids-purchase-group{padding:14px;border:1px solid #ffffff14;border-radius:16px;background:#ffffff05}.kids-purchase-group h4{margin:0 0 5px;color:#fff}.kids-purchase-note{font-size:.78rem;color:#c9bfd9!important}.purchase-badge{position:absolute;top:-8px;right:8px;background:#241044;color:#e9ddff;border:1px solid #8b5cf677;border-radius:999px;padding:3px 7px;font-size:.62rem}.credits-section[data-legacy-purchase-ui]{display:none!important}@media(max-width:720px){.kids-purchase-groups{grid-template-columns:1fr}}@media(max-width:520px){.purchase-hub{padding:15px}.purchase-tabs{grid-template-columns:1fr}.purchase-pack-grid{grid-template-columns:1fr 1fr}.purchase-panel[data-kind=matches]>.purchase-pack-grid>.purchase-pack:last-child:nth-child(odd),.purchase-panel[data-kind=kids] .purchase-pack-grid>.purchase-pack:last-child:nth-child(odd){grid-column:1/-1;width:calc(50% - 6px);justify-self:center}.purchase-tab{font-size:.82rem;padding:11px 7px}}@media(max-width:340px){.purchase-pack-grid{grid-template-columns:1fr}.purchase-panel[data-kind=matches]>.purchase-pack-grid>.purchase-pack:last-child:nth-child(odd),.purchase-panel[data-kind=kids] .purchase-pack-grid>.purchase-pack:last-child:nth-child(odd){grid-column:auto;width:100%}}@media(prefers-reduced-motion:reduce){.purchase-pack{transition:none}.purchase-pack:hover{transform:none}}`;document.head.appendChild(s)}
function isPricingPage(){const p=(location.pathname||'').replace(/\/+$/,'')||'/';return p==='/pricing'||p==='/pricing/pricing.html'||p.endsWith('/pricing.html')}
function renderHub(){if(!isPricingPage())return;const legacy=document.querySelector('.credits-section'),anchor=legacy||document.querySelector('.container');if(!anchor||document.getElementById('purchase-hub'))return;purchaseStyles();if(legacy){legacy.dataset.legacyPurchaseUi='true';legacy.setAttribute('aria-hidden','true');legacy.querySelectorAll('button,a,input,select,textarea').forEach(el=>el.setAttribute('tabindex','-1'))}const hub=document.createElement('section');hub.id='purchase-hub';hub.className='purchase-hub';hub.setAttribute('aria-labelledby','purchase-hub-title');hub.innerHTML=`<h2 id="purchase-hub-title">In-App Purchases</h2><p>Adult and Kids allowances are separate. Each experience uses its own daily pool first, then its own top-up balances.</p><div class="purchase-tabs" role="tablist" aria-label="Purchase type"><button id="purchase-tab-matches" class="purchase-tab" data-target="matches" role="tab" aria-controls="match-packs-section">★ Extra Matches</button><button id="purchase-tab-credits" class="purchase-tab" data-target="credits" role="tab" aria-controls="ask-ai-credits">✦ Ask AI Credits</button><button id="purchase-tab-kids" class="purchase-tab" data-target="kids" role="tab" aria-controls="kids-packs-section">🌟 Kids Credits</button></div><section id="match-packs-section" class="purchase-panel" data-kind="matches" role="tabpanel" aria-labelledby="purchase-tab-matches"><h3>Buy More Matches</h3><p>For adult Matches only. Extra Matches do not expire and never consume Ask AI credits or Kids balances.</p><div class="purchase-pack-grid">${MATCH_PACKS.map(x=>`<article class="purchase-pack">${x.badge?`<span class="purchase-badge">${x.badge}</span>`:''}<strong>${x.matches}</strong><small>Extra Matches</small><b>${x.price}</b><button type="button" data-match-pack="${x.key}" onclick="buyMatches('${x.key}')">Buy Matches</button></article>`).join('')}</div></section><section id="ask-ai-credits" class="purchase-panel" data-kind="credits" role="tabpanel" aria-labelledby="purchase-tab-credits"><h3>Buy Ask AI Credits</h3><p>1 credit = 1 Ask AI prompt. Credits are for Ask AI only and never buy Matches. These are adult Ask AI credits and never affect Kids balances.</p><div class="purchase-pack-grid">${CREDIT_PACKS.map(x=>`<article class="purchase-pack">${x.badge?`<span class="purchase-badge">${x.badge}</span>`:''}<strong>${x.credits}</strong><small>Ask AI Credits</small><b>${x.price}</b><button type="button" data-credit-pack="${x.key}" onclick="buyCredits('${x.key}')">Buy Credits</button></article>`).join('')}</div></section><section id="kids-packs-section" class="purchase-panel" data-kind="kids" role="tabpanel" aria-labelledby="purchase-tab-kids"><h3>MatchApp Kids Credits</h3><p>Parent-purchased Kids top-ups stay inside Kids Mode and never reduce or increase adult Match or Ask AI balances.</p><div class="kids-purchase-groups"><div class="kids-purchase-group"><h4>Kids Match Credits</h4><p class="kids-purchase-note">Used only after the separate Kids daily allowance is finished.</p><div class="purchase-pack-grid">${KIDS_MATCH_PACKS.map(x=>`<article class="purchase-pack">${x.badge?`<span class="purchase-badge">${x.badge}</span>`:''}<strong>${x.matches}</strong><small>Kids Matches</small><b>${x.price}</b><button type="button" data-kids-match-pack="${x.key}" onclick="buyKidsMatches('${x.key}')">Buy for Kids</button></article>`).join('')}</div></div><div class="kids-purchase-group"><h4>Kids Ask AI Credits</h4><p class="kids-purchase-note">Used only for Kids Ask AI after the separate Kids daily allowance is finished.</p><div class="purchase-pack-grid">${KIDS_CREDIT_PACKS.map(x=>`<article class="purchase-pack">${x.badge?`<span class="purchase-badge">${x.badge}</span>`:''}<strong>${x.credits}</strong><small>Kids Ask AI</small><b>${x.price}</b><button type="button" data-kids-credit-pack="${x.key}" onclick="buyKidsCredits('${x.key}')">Buy for Kids</button></article>`).join('')}</div></div></div></section>`;anchor.parentNode.insertBefore(hub,anchor);const select=(kind,scroll=true)=>{if(window.MatchAppTokens?.retireLegacyPromotions===true&&kind==='matches')kind='credits';hub.querySelectorAll('.purchase-tab').forEach(b=>{const on=b.dataset.target===kind;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1});const panel=hub.querySelector(kind==='matches'?'#match-packs-section':kind==='kids'?'#kids-packs-section':'#ask-ai-credits');if(scroll)panel?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'})};hub.querySelectorAll('.purchase-tab').forEach((b,i,all)=>{b.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('focus',b.dataset.target);url.hash=b.dataset.target==='matches'?'match-packs-section':b.dataset.target==='kids'?'kids-packs-section':'ask-ai-credits';history.replaceState(null,'',url.pathname+url.search+url.hash);select(b.dataset.target)});b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const visible=Array.from(all).filter(tab=>window.MatchAppTokens?.retireLegacyPromotions!==true||tab.dataset.target!=='matches'),current=visible.indexOf(b);if(current<0)return;const next=visible[(current+(e.key==='ArrowRight'?1:-1)+visible.length)%visible.length];next.click();next.focus()})});const raw=new URLSearchParams(location.search).get('focus')||location.hash.slice(1);select(/kids/i.test(raw)?'kids':/credit|ask-ai/i.test(raw)?'credits':'matches',!!raw)}
function bootBilling(){ensureAuthModal();ensureSignInControl();renderHub();paintAndroidPurchaseAvailability();try{window.MatchAppTokens?.renderCorner?.()}catch(_){}refreshAdFreePurchase();resumePendingCheckout()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootBilling);else bootBilling();
document.addEventListener('matchapp:authchange',()=>{refreshAdFreePurchase();if(window.isUserLoggedIn||window.supabaseClient)resumePendingCheckout()});
document.addEventListener('matchapp:langchange',()=>{const button=document.getElementById('btn-ad_free');if(button?.dataset.adFreeOwned==='true')markAdFreeOwned(button);paintAndroidPurchaseAvailability()});
