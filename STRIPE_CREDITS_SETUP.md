# Stripe setup — MatchApp top-up packs

Everything on the MatchApp side is built and deployed-ready. This is the part
that has to be done inside the Stripe dashboard, in order. Takes about 15
minutes.

---

## The prices, and why they are these numbers

| Pack | Credits | Price | Per credit |
|------|---------|-------|-----------|
| Starter | 25 | **$2.99** | 12¢ |
| Popular | 75 | **$6.99** | 9.3¢ |
| Power | 200 | **$14.99** | 7.5¢ |
| Studio | 500 | **$29.99** | 6¢ |

The commercial model is intentionally explicit:

- Included daily AI actions: **3 Guest / 5 Registered / 10 VIP / 50 Business**.
- An included action can be used for either one Match or one Ask AI request.
- After the included allowance is exhausted, **Extra Matches** extend Matches only.
- After the included allowance is exhausted, **Ask AI credits** extend Ask AI only.
- Paid top-ups never expire.
- Business is currently a **single-account high-volume plan**. There is no team-seat entitlement.

The four credit products below are therefore **Ask AI credits only**. They must
never be granted or consumed as Extra Matches. Extra Match packs are separate
products and balances.

---

## Step 1 — Create the four Ask AI credit Payment Links

In Stripe: **Products → Payment Links → + New**, four times.

For each one:

1. **Product name:** `MatchApp — 25 Ask AI Credits` (then 75, 200, 500)
2. **Price:** one-time, USD, the amount from the table above
3. **Type:** ⚠️ **One-time**, not recurring. This matters — the webhook uses
   checkout mode to tell a top-up from a subscription, and a recurring price
   at the same amount would be read as a plan.
4. Under **Options → Advanced**, turn ON:
   - ✅ **Client reference ID** ← **this is the critical one.** Without it the
     payment succeeds and we have no idea whose account to credit. It is the
     single most common way this setup fails.
   - ✅ **Allow promotion codes** (optional, useful for launch campaigns)
   And turn **OFF**:
   - ❌ **Collect business name / Organization** — never required
   - ❌ **Collect tax IDs** (CNPJ, VAT, EIN) — never required
   - ❌ **Require billing address** — leave on Auto
   - ❌ **Collect phone number**
   Checkout should ask only for a payment method (card, Pix, wallet). Email is
   prefilled from the signed-in account. Hosted Checkout created by
   `stripe-checkout` already disables Organization, tax IDs, phone and
   automatic tax so this stays in sync.
5. **After payment:** redirect to `https://matchapp.tv/purchase.html`
6. Save, then copy the link URL (`https://buy.stripe.com/…`)

---

## Step 2 — Paste the four links into the code

Open `pricing.js` and fill in:

```js
const STRIPE_LINK_CREDITS = {
    credits_25:  "https://buy.stripe.com/...",
    credits_75:  "https://buy.stripe.com/...",
    credits_200: "https://buy.stripe.com/...",
    credits_500: "https://buy.stripe.com/..."
};
```

Until these are filled in, the Buy buttons route to a support email instead of
a broken checkout — so the page is safe to ship today, before the links exist.

---

## Step 3 — Run the database migration

Supabase → **SQL Editor** → paste and run:

- `supabase/migrations/007_credits.sql`

It is idempotent — safe to run twice. It adds the `credits` balance, the
`credit_ledger` audit table, and rewires `consume_match()` so a credit is only
ever spent **after** the free daily allowance is gone.

While you are there, also run `006_watch_contacts.sql` if you have not yet
(that one is for the saved-contacts feature).

---

## Step 4 — Redeploy the webhook

```
supabase functions deploy stripe-webhook --no-verify-jwt
```

`--no-verify-jwt` is required: Stripe cannot send a Supabase JWT. The endpoint
is protected by the Stripe **signature check** instead, which is already in the
function and must never be removed.

---

## Step 5 — Check the webhook is listening for the right event

Stripe → **Developers → Webhooks** → your MatchApp endpoint.

It needs `checkout.session.completed` enabled. It almost certainly already is
(the subscriptions use it), but confirm — Ask AI credits are granted from that event.

---

## Step 6 — Test with a real card, then refund

Use a real card in live mode for one $2.99 pack. Test mode will not prove the
live secret key and live webhook secret are wired up, which is the pair that
actually breaks in production.

After paying, check:

1. Supabase → `profiles` → your row → `credits` = **25**
2. Supabase → `credit_ledger` → one row, `delta = 25`, `reason = 'purchase'`
3. The 🎟️ pill appears in the MatchApp header

Then refund yourself in Stripe. **Note:** a refund does **not** currently claw
the credits back automatically — see "Known gap" below.

---

## Step 7 — Turn on Adaptive Pricing

Stripe → **Settings → Payments → Adaptive Pricing** → enable.

Brazil is a large share of MatchApp's traffic, and a Brazilian visitor seeing
`R$ 16,90` instead of `$2.99` converts meaningfully better than one who has to
do the conversion in their head and then worry about an IOF charge. Stripe
handles the FX; you are still paid in USD.

---

## ⚠️ If you ever change a price

The webhook identifies a pack **by the amount paid**, because Stripe Payment
Links carry no product key we can trust on the session object.

So changing a price in Stripe **without** changing the code means the purchase
completes and grants **nothing**. Both of these must change in the same commit:

- `CREDIT_PACKS` in `supabase/functions/stripe-webhook/index.ts`
- `CREDIT_PACKS` in `pricing.js`

Also: no credit pack may ever be priced at **$1.99**, which is the Ad-Free
Pass. Same amount, same checkout mode — the webhook could not tell them apart.

---

## Known gaps, in priority order

1. **Refunds do not remove credits.** If someone buys 500 credits, spends
   them, then refunds, they keep the value. Low risk at these amounts, but
   worth closing later by handling `charge.refunded` in the webhook and
   calling `grant_credits` with a negative delta.

2. **Plans are identified by amount, not by Stripe Price ID.** This applies to
   the existing subscriptions as well as to credits. Price IDs (`price_…`) are
   stable and amounts are not, so this is the right thing to migrate to — but
   it needs the real Price IDs from your dashboard, which I do not have. Say
   the word and I will switch it over once you paste them.

3. **No self-serve balance history.** The ledger exists and is queryable, but
   there is no screen showing it. One support request away from being worth
   building.
