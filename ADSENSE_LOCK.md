# MatchApp AdSense Immutable Lock

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
