# MatchApp IA migration map

This redesign is presentation-only. Existing matching policy, Kids age/safety rules, daily quotas, auth, Stripe products, provider verification, and Android-compatible routes stay intact.

| Current live block | Selector / source | New treatment |
|---|---|---|
| Header cluster | `#mh-topbox.app-header`, `header.app-header` | One shared MatchApp header. Final horizontal brand lockup left; Country, Language, auth/bell/avatar right; utilities move to overflow. |
| Daily Check-in | `#daily-match-checkin` | Hidden from Home first viewport; accessible from account/overflow and notifications. |
| AI concierge banner | `.top-ask-wrap` | Removed from Home; Ask is tab B inside the concierge card. |
| Disclaimer/status chip | `#live-status-strip` and related homepage chrome | Removed from first screen unless it communicates an actual blocking state. |
| Stats / live clock | legacy header/chrome widgets | Removed from Home first viewport. No “214 titles” trust line. |
| Trending | `#trending-rail` | Moved below result as one “Latest titles” rail. |
| Spotify | `#swifties-spotify` | Hidden from Home. Editorial outbound content may return as one compact card below core product. |
| Matcher | `#questionnaire-box` | Preserved behavior/IDs, visually rebuilt as Match me tab with mood-first chips and progressive disclosure. |
| Search / Ask | `#search-box` | Reused as Ask tab so it is no longer a competing product block. |
| Result | `#result-box` | Calm title-detail card. No ad inside result. |
| Together promo | `.tg-entry` / Match Together entry | Removed as a competing Home card; becomes a quiet text link under the primary CTA. |
| Premiere accordion | `#premiere-disclosure` | Open compact “This week” card below Latest titles. |
| Events stack | `#global-events` | Optional below-fold rail/disclosure with accessible `aria-expanded`. |
| How it works | `#how-it-works` and duplicate essays | Removed from Home; keep a single three-step footer line. |
| TikTok first-paint intro | `#matchapp-tiktok-intro`, `.matchapp-tiktok-showcase` | Never blocks Home. Social engagement stays below core product if retained. |
| Cookie UI | cookie consent banner | Slim bottom bar only; matcher CTA stays visible. |
| Ads | homepage ad containers / side rails | Desktop side rails or below-fold mobile placements only; never overlay matcher, result, auth or checkout. |
| Footer | site footer | Keep legal/support links plus one short “Pick mood → Get title → Watch officially” explanation. |

## Shared components implemented

- `matchapp-ia.css`: one visual/IA override layer, mobile-first, reduced-motion aware.
- `matchapp-ia.js`: shared header, Home Match/Ask tabs, quick chips, ordering, Discover/Together/Pricing presentation reuse.
- `assets/brand/brandkit/logo-horizontal.svg`: canonical header lockup.
- `assets/brand/brandkit/app-icon.svg`: canonical favicon/PWA icon.
- `assets/brand/brandkit/logo-full.svg`: full marketing badge.

## Acceptance checks

1. At 390×844 the Home headline, mood controls and primary Match CTA are reachable in the first screen after dismissing only the slim cookie bar.
2. No TikTok/changelog/interstitial covers Home on first paint.
3. Mood is single-select. Platform remains the multi-select quick control.
4. Existing advanced selects and matching criteria are preserved behind Fine-tune.
5. First match never requires sign-in.
6. Discover, Together and Pricing load the same header and surface language.
7. Kids Mode remains separate and its safety policy is untouched.
8. Ads never render over matcher/result/auth/checkout.
9. Routes stay unchanged for Android WebView shells.
