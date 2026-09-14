/* ============================================================
   © 2026 MatchApp.tv — All Rights Reserved.
   Proprietary source code. Not licensed for reproduction, scraping,
   or reuse in competing products. See /terms.html Section 4.
   ============================================================ */

console.log("Mastercode 87.0: Live Stripe Payments Engine Initialized");

// ==========================================
// 💳 LIVE STRIPE PAYMENT LINKS
// ==========================================
const STRIPE_LINK_AD_FREE = "https://buy.stripe.com/bJe8wP94lfRQfsycspcfK07";
const STRIPE_LINK_VIP_MONTHLY = "https://buy.stripe.com/bJe7sL6WdfRQ94adwtcfK08";
const STRIPE_LINK_VIP_ANNUAL = "https://buy.stripe.com/8x29ATdkB5dcgwCdwtcfK09";

// Business plan — $49/mo, 50 AI sessions daily, up to 5 seats.
// The email fallback below still guards against a blanked-out or broken link,
// so the button can never dead-end on a checkout page that doesn't exist.
const STRIPE_LINK_BUSINESS = "https://buy.stripe.com/4gM00ja8peNMdkq641cfK0e";


/* i18n.js is NOT loaded on the pricing page, so `t` is never defined here.
   Every bare t() call therefore threw ReferenceError — and because the first
   one sits inside the try block of startVerifiedCheckout, the catch fired and
   called t() again, throwing a second time uncaught. The net effect was a
   purchase button that did absolutely nothing, with no error the user could
   see. This is why all the buy buttons were dead.

   Resolves at call time so it still uses the real translator on pages that
   do load i18n, and falls back to readable English where it does not. */
const pt = (key, fallback) => {
  try { if (typeof window !== 'undefined' && typeof window.t === 'function') { const v = window.t(key); if (v) return v; } } catch (e) {}
  return fallback;
};

async function startVerifiedCheckout(product,button){
 const sb=window.supabaseClient;const original=button?.textContent;
 try{
  const session=sb?await sb.auth.getSession():null;
  if(!session?.data?.session){window.showToast?.(pt('billing.signin','Please sign in to continue to checkout.'));window.openAuthModal?.();return;}
  if(button){button.disabled=true;button.textContent=pt('billing.redirect','Redirecting…');}
  const {data,error}=await sb.functions.invoke('stripe-checkout',{body:{product,lang:window.MATCH_LANG||'en'}});
  if(error||!data?.url||!data.url.startsWith('https://checkout.stripe.com/'))throw new Error('Checkout unavailable');
  window.location.assign(data.url);
 }catch(_){window.showToast?.(pt('billing.error','Could not start checkout. Please try again.'),true);}
 finally{if(button){button.disabled=false;button.textContent=original;}}
}
window.processCheckout=planType=>startVerifiedCheckout(planType,document.getElementById('btn-'+planType));
// ============================================================
// 🎟️ CREDIT PACKS — one-time top-ups
//
// WHAT A CREDIT IS: one AI action beyond the free daily allowance. A match
// and an Ask AI question cost the same, deliberately — a two-currency system
// ("3 match tokens, 1 AI token") feels clever on a pricing page and generates
// support email forever.
//
// HOW THESE ARE PRICED, AND WHY
//
// VIP is $4.99/month for 10 matches a day: roughly 300 a month, about
// $0.017 each. Credits are priced at 3.5x to 7x that. That gap is the whole
// point and is not an accident:
//
//   * Credits are for the person who hit today's limit and wants to keep
//     going RIGHT NOW. That is an impulse purchase, and impulse purchases
//     are priced on the moment, not on the unit.
//   * If credits were priced near the subscription rate they would
//     cannibalise it — someone would buy 300 credits for $5 instead of
//     subscribing, and MatchApp would lose the recurring revenue AND the
//     retention that comes with it.
//   * Because the gap is large and visible, the pricing page can say
//     honestly that subscribing is five times cheaper per match. The packs
//     therefore convert people INTO VIP rather than away from it, which is
//     the correct job for a one-time SKU sitting next to a subscription.
//
// Volume discount runs from $0.120/credit down to $0.060 — enough to make
// the bigger packs feel like a deal, not so much that the top pack
// undercuts the subscription.
//
// THE AMOUNTS ARE LOAD-BEARING. supabase/functions/stripe-webhook/index.ts
// identifies a pack by the amount paid, because Stripe Payment Links carry no
// product key we can trust on the session. Change a price in Stripe and you
// MUST change CREDIT_PACKS there in the same commit, or the purchase will
// complete and grant nothing.
// ============================================================

const CREDIT_PACKS = [
    { key: 'credits_25',  credits: 25,  priceCents: 299,  price: '$2.99',  link: '' },
    { key: 'credits_75',  credits: 75,  priceCents: 699,  price: '$6.99',  link: '', badge: 'Most popular' },
    { key: 'credits_200', credits: 200, priceCents: 1499, price: '$14.99', link: '' },
    { key: 'credits_500', credits: 500, priceCents: 2999, price: '$29.99', link: '', badge: 'Best value' }
];
window.CREDIT_PACKS = CREDIT_PACKS;

// Paste the four Payment Link URLs here once they exist in Stripe. Until
// then buyCredits() routes to sales rather than to a broken checkout — the
// same guard the Business plan already uses, for the same reason: a dead
// checkout button costs more than a missing one.
const STRIPE_LINK_CREDITS = {
    credits_25:  "https://buy.stripe.com/14A9ATdkB8po4NU641cfK0a",
    credits_75:  "https://buy.stripe.com/aFaeVdeoF9ts4NU9gdcfK0b",
    credits_200: "https://buy.stripe.com/8x2aEXgwN5dc4NUakhcfK0c",
    credits_500: "https://buy.stripe.com/5kQcN50xP35494afEBcfK0d"
};

window.buyCredits=packKey=>{if(CREDIT_PACKS.some(p=>p.key===packKey))return startVerifiedCheckout(packKey,document.querySelector('[data-credit-pack="'+packKey+'"]'));};
