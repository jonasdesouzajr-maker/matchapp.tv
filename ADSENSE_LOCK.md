# MatchApp AdSense Immutable Lock

## Owner-authorized zero-width initialization correction — 2026-10-01

The owner explicitly authorized a narrow AdSense-lock exception to correct zero-width initialization while preserving placements and IDs. Each manual request now targets the exact visible, measured `ins` using Google's supported `element` request field. An untargeted request previously selected the first unfilled DOM unit, including a desktop rail hidden on phones/tablets, instead of the measured unit. All five slots, markup, DOM positions, responsive dimensions, publisher/slot IDs, Auto ads, engine script and Android ad-free behavior remain unchanged. The initializer is re-locked with this one-line targeting correction and a regression that rejects requests for hidden units. This exception grants no unrelated AdSense changes.

**Status:** LOCKED  
**Established:** 2026-09-24  
**Authority:** Repository owner only

This document records the production AdSense contract that must remain unchanged unless the repository owner directly and explicitly revokes or changes this lock.

## Locked account/runtime assumptions

- Google AdSense **Auto ads are enabled** for `matchapp.tv`.
- Publisher/client ID: `ca-pub-9541435081010948`.
- Manual slot ID: `2595698117`.
- The standard asynchronous AdSense engine script on the homepage is required and must remain unchanged.
- `ads-init.js` is the single manual-unit initializer and its behavior is frozen.
- Android application shells remain ad-free under their existing MatchApp Android handling.

## Locked homepage manual inventory

Exactly five static `ins.adsbygoogle` manual units are present on the homepage:

1. Desktop left vertical rail — responsive vertical unit.
2. Desktop right vertical rail — responsive vertical unit.
3. In-result / in-flow responsive unit — auto format.
4. Match Together sponsored unit — full-width responsive auto format.
5. Lower in-flow responsive unit — auto format.

The left and right desktop rails remain a matched pair and retain their current order before the main content column.

## Locked responsive behavior

- Desktop web at `min-width:1180px`: both side rails remain visible in the current three-column layout; current sticky position, dimensions, spacing, and 600px reserved creative height remain unchanged; in-flow units are hidden at this breakpoint as currently implemented.
- Tablet web `768px–1179px`: side rails remain hidden; current responsive in-flow units remain active with their current dimensions.
- Mobile web `<=767px`: side rails remain hidden; current responsive in-flow units remain active with their current dimensions.
- The Match Together sponsored placement remains full-width on desktop with the current compact baseline reservation while AdSense owns the final creative size.

## Protected files / contract surfaces

The lock checker validates the AdSense contract across:

- `index.html`
- `ads-init.js`
- `matchapp-ia.css`
- `home-8k-layout.css`

Protection infrastructure:

- `AGENTS.md`
- `ADSENSE_LOCK.md`
- `tests/adsense-lock.test.cjs`
- `.github/workflows/adsense-lock.yml`
- AdSense-lock steps in `.github/workflows/pages-deploy.yml`
- AdSense-lock steps in `.github/workflows/site-validation.yml`

Automated agents must not update the lock/test baselines to legitimize an AdSense change.

## Unlock rule

Only a new, direct repository-owner instruction that explicitly revokes or modifies the **AdSense lock** authorizes a change. No inferred intent, redesign request, cleanup request, SEO task, monetization experiment, or bot-generated change counts as authorization.


## Owner-authorized positional amendment — 2026-09-26

The owner specifically directed that the **existing full-width Match Together sponsored unit** appear **immediately after its entire fold/card**, not above it. This is a **one-time, position-only exception** to the formerly locked DOM order. The new below-card position is locked from now on. Keep the same `ma-together-ad` host, sponsored disclosure, unchanged `ins.adsbygoogle`, publisher/client ID, slot ID, full-width auto format, reserved creative height, responsiveness, desktop rails, the other four manual slots and Auto ads unchanged. Neither `ads-init.js` nor the AdSense engine may change. The locked regression now enforces **Match Together card → sponsored unit → premiere** with the exact same existing inventory and styling checks. No general AdSense authorization follows from this amendment.

## Owner-authorized sizing correction — 2026-09-28

The owner directly requested correction of the live Google AdSense `No slot size for availableWidth=116` error. On 1180px desktop viewports, the previously locked 132px outer side rail left only 116px for each responsive vertical unit after two 7px paddings and two 1px borders; Google specifies at least 120px for a fixed display ad width, and its responsive sizing rejected 116px in production. This one-time, width-only corrective exception raises the existing desktop rail track's minimum from 132px to **144px** in both matching desktop CSS declarations, yielding 128px minimum usable width. The desktop breakpoint remains 1180px; both rails, all five existing manual units, publisher/slot IDs, 600px reservation, positions, formats, Auto ads, initialization, Android ad-free shells and all other ad geometry remain untouched. The immutable regression now enforces the new 144px track floor and >=120px resulting interior. The corrected geometry is re-locked; this amendment grants no future AdSense changes.


## Owner-authorized Kids web/PWA banner amendment — 2026-10-01

The owner directly authorized one subtle AdSense banner on the public Kids Mode web/PWA surface. This amendment does not unlock or alter the five frozen adult Home units, their DOM order, formats, dimensions, IDs, Auto ads setting, or `ads-init.js`.

- Scope: `/kids/` web browsers and installed PWA only.
- Inventory: exactly one responsive horizontal manual unit using publisher `ca-pub-9541435081010948` and slot `2595698117`.
- Treatment: every request carries `data-tag-for-age-treatment="1"` and the loader requests non-personalized ads.
- Placement: inside the collapsed “A note for grown-ups” disclosure, away from the Kids matcher, result dialog, Ask AI input, wallet, guardian gate, and purchase controls.
- Native app: the dedicated Kids Android WebView remains ad-free and never loads the Kids AdSense engine.
- Future automation must not add a second Kids manual unit or expand this exception without another direct owner instruction.


## Owner-authorized auto-ads body unit correction — 2026-10-02

The owner asked to fix the AdSense error. Auto ads can insert an unfilled `ins.adsbygoogle` directly on `body` with no slot id. The initializer was treating that node as a manual unit, marking `body` empty and labeling the page Advertisement. Requests now stay on the five locked units that have `data-ad-slot` and a known host. Slot markup, publisher ID, slot ID, and the targeted `element` push are unchanged.
