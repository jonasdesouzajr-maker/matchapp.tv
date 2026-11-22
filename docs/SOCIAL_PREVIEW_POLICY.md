# Social preview artwork and cache versioning

Standing instruction, 2026-11-22. Every public site and product associated with these projects must keep its link-preview artwork aligned with the latest **owner-approved** brand image. When a logo, key art, icon or product visual changes, update the relevant 1200x630 share JPEG as part of the **same release**; never just change a query string while retaining stale visual content. Preserve protected designs.

The public MatchApp adult preview is share-preview-2026.jpg for the homepage and discover page. The Lumina Pair English and Brazilian Portuguese previews are lumina-pair/lumina-social-en.jpg and lumina-par/lumina-social-pt-br.jpg. Each future product and locale needs its own explicitly registered URL and approved image. Do not mix separate brand identities.

The release script tools/sync-social-previews.cjs automatically validates images and recalculates social-preview URL versions from each artwork file's SHA-256 bytes. It synchronizes og:image, og:image:secure_url, twitter:image, Lumina structured-data images, and hero/preload artwork links, so new approved pixels receive a new crawler-visible version automatically. Use npm run sync:social and npm run check:social before publishing. Keep that step in GitHub Pages and any alternative build pipeline; do not bypass the tests.

Use an authentic Google Play badge only where a real corresponding Play Store listing exists, with the correct link and per Google's brand rules. A store badge is promotional and is not an official certification of the app. Never fabricate store status.

Verify every release's full commit, successful deployment, HTTPS 200 for metadata and image, correct image Content-Type, actual 1200x630 pixel dimensions, sharp artwork and legible mobile-safe text. WhatsApp and Instagram may cache previous previews; app-side caches cannot be forcibly cleared by our site.

Apply this rule to all projects, including Android games when they have marketing/share URLs. If a project has no public landing page yet, record the rule for when it launches one. The script automatically refreshes metadata **after the approved artwork file is replaced**; it does not automatically generate design artwork from unrelated assets.
