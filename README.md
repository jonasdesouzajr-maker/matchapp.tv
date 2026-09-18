# 🍿 MatchApp TV Ai

MatchApp is an AI entertainment concierge for finding movies, series, K-dramas, anime, novelas, micro-dramas, podcasts, music and other supported entertainment based on a user's explicit mood and criteria.

The production site is **https://matchapp.tv**. The legacy `matchapp.cc` domain is retained only for migration/redirect purposes.

## ✨ Core Features

* **Exact matching:** explicit user-selected criteria remain requirements; the matcher never silently swaps them for unrelated content.
* **Never-dead-end recovery:** duplicate/history pressure is recovered without violating explicit criteria; Kids Mode keeps hard age and safety boundaries.
* **AI Concierge:** Ask AI shares the included daily allowance with Matches, while paid Ask AI credits and Extra Matches remain separate top-ups.
* **Current included daily allowance:** Guest **3**, Registered complete profile **5**, VIP **10**, Business **50**.
* **Where to Watch:** verified title identity and regional provider/cinema information are used when available, with safe fallbacks when availability is unknown.
* **Kids Mode:** curated independent Kids catalog with conservative safety rules and age-band enforcement.
* **Match Together / Friends:** private collaborative matching flows for registered users.
* **Authentication and entitlements:** Supabase Auth/Postgres enforce account state, quota and paid entitlements server-side for signed-in users.
* **Payments:** Stripe checkout/webhook fulfillment only grants entitlements after verified payment confirmation.
* **Monetization:** Google AdSense is limited to approved publisher surfaces and never gates authentication, pricing, account management or match results.

## 🛠️ Tech Stack

* **Frontend:** Vanilla HTML, CSS and JavaScript.
* **Backend/Auth:** Supabase (Postgres, Auth and Edge Functions).
* **Hosting/CI:** GitHub + Pages deployment workflow for `matchapp.tv`.
* **Payments:** Stripe.
* **Entertainment metadata:** TMDB and reviewed MatchApp catalog data.

## 🚀 Quota / Top-up Model

1. Included AI actions are consumed first: **3 Guest / 5 Registered / 10 VIP / 50 Business per day**.
2. An included AI action may be one Match or one Ask AI request.
3. Once the included allowance is exhausted, **Extra Matches** extend Matches only.
4. **Ask AI credits** extend Ask AI only.
5. Share rewards can grant bonus Matches under the server-enforced reward limits.
6. Signed-in quota enforcement is server-side; anonymous usage is necessarily browser-local because there is no authenticated identity to meter.

## 📱 Android

The Android Studio project is under `android-studio/` and contains two separate WebView shells:

* `:app` → standard MatchApp experience.
* `:kidsapp` → Kids-only experience.

Both intentionally render the live production site rather than maintaining a duplicated native copy of the web UI.
