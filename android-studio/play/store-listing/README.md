# MatchApp Ai Google Play store presence

This directory is the repository source of truth for the released adult Android app's Play Store metadata. It does not publish changes by itself.

Package: com.jonas.papercup

## 2026-10-05 live Play audit

The public listing was reachable as MatchApp Ai version 1.1.36. The highest-priority store-presence corrections identified were:

1. The Brazilian localized app name was still MatchApp iA. It must be exactly MatchApp Ai.
2. The live category was Books & Reference. MatchApp's primary experience is movies, TV and interactive entertainment discovery, so the intended Play category is Entertainment.
3. The public website and privacy-policy links still pointed at the old Google Sites property. The intended first-party URLs are https://matchapp.tv/ and https://matchapp.tv/privacy.html.
4. The live English and Portuguese descriptions were verbose and used markup-like characters. The locale files here provide cleaner user-first copy with natural discovery terms and no ranking claims or keyword blocks.

## Console-only improvements

Use Play Console > Grow users > Store presence to apply the intended category/contact details, localized listing files, relevant tags, custom store listings and experiments. Do not change the production AAB merely to update listing metadata.

Keep the title MatchApp Ai in every locale. Do not localize the brand to MatchApp iA.

For tags, choose no more than five tags actually offered by Play and only when they clearly match the app's first-run experience. Do not use unrelated tags for traffic.

For experiments, change one meaningful variable at a time. Start with the short description or feature graphic, use install/open metrics, and keep the current listing as the control.

For custom store listings, prioritize Brazil, the United States and Australia using localized screenshots and copy that remain truthful to features available in those markets.

Google Play metadata must not claim rankings, awards, prices, guaranteed availability or unsupported relationships with streaming providers.
