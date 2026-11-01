# MatchApp Ai adult release checklist — November 1, 2026

Candidate: `com.jonas.papercup`, version **1.1.68**, code **68**. Keep this code unless the current Play bundle inventory shows it has already been accepted. A repository version or installed debug version does not prove a Play code is unused.

## Submission route

The owner explicitly authorized publishing this update through full **Production** rollout. Use the existing Production track and preserve its countries, current release and unrelated drafts. The owner's standing preflight does not authorize a new internal, closed or open track. Use the separate debug package for physical QA. Update the production installation through Google Play; do not sideload or clear its data.

Before uploading, inspect App bundle explorer and every track for the highest accepted code, including draft artifacts. If 68 is used, advance all adult version markers together and rebuild/sign; never reuse an accepted code.

## Artifact checks

Use the existing upload keystore on the HP laptop; enter its password only in the prepared masked local form. Never upload the key or its password. Verify archive integrity, bundle manifest package/version/code, `jarsigner` signature, and SHA-256/MD5 of the exact signed file.

Historical upload-certificate SHA-256: `A8:CF:58:E0:B6:D2:72:D5:41:B8:1C:0A:64:D1:5D:5A:49:42:3A:B3:36:7A:41:EE:A2:2E:C0:DC:AF:EC:16:4C`. Compare it with the current Console **upload certificate**. The Play distribution certificate used by App Links is a different identity. A signed bundle is not proof of Play acceptance or publication.

Add the verified signed bundle alongside the existing unsigned 1.1.67 file in Drive. Preserve the old artifact and sharing state. Read back Drive metadata and compare checksums/size before handing off its link.

## Listing and app content

- Existing EN-US, PT-BR and HI listing drafts and the approved 512px icon are in `refresh-20261030/`; use current release notes for the final candidate.
- Capture current real app screens for Home, a genuine result, Jonas, Explore and News. Prepare the required phone and tablet screenshot groups. Exclude account details, email, birth date, credentials, private conversations and test-ad content from store screenshots. Do not stretch tablet captures into phone screenshots.
- Inspect the current Console image-size/count requirements; keep the approved icon and prepare the 1024×500 feature graphic if missing. Screenshots must reflect the shipped UI.
- Reconcile the ads declaration and Data safety form with the actual release SDKs, account data, diagnostics and advertising behavior. Verify the privacy-policy URL, account-deletion URL, content rating, adult target audience, permissions and reviewer app-access instructions. Do not change protected Kids, payment, AdSense or safety contracts to satisfy a form.
- Supply a normal reviewer access path if sign-in is required; enter credentials through Console's protected fields, not repository files or release notes.

## Release gates and final records

Record the exact source/deployed SHA, CI URLs, physical device/build/connection, real reply and credit behavior, rotation/Back behavior, ad load and reward server verification. A Google debug-ad callback cannot prove a production SSV credit grant.

The owner requested separate public rewarded ads while preserving existing allowances and payments. The independent legacy-rewards migration defaults admission off; its reviewed rollout control is separate from the existing Match Tokens master. Keep the old master flags and product arrays unchanged. Verify an actual eligible registered, ad-supported user and genuine Google SSV credit before opening new public admission. The designated owner currently has48 matches, including41 paid Extras; do not alter or burn them to manufacture eligibility. Existing prepared promises retain their immutable destination and must still be fulfilled if new admission is paused.

Once checks pass, upload the signed bundle to the existing Production draft, inspect Console validation/pre-launch results and the final listing, and submit using the owner's existing authorization. Preserve any existing review; an API commit must use `ERROR_IF_IN_REVIEW` rather than cancelling it. Record review submission, approval, publication, full rollout across existing territories and successful Play Store device update as separate states. A published lifecycle alone can include a partial or halted rollout; verify actual rollout status/fraction and territories. Report green “published successfully” only after confirmed full publication. This document is not a publication record.
