# Design lock: owner-approved designs (Grok Bot), 2026-10-23

These designs were built by Grok Bot and approved by the owner, Jonas.
**AI agents (GPT/ChatGPT, Codex, Claude, Copilot, Gemini or any other) and human contributors must not modify, restyle, revert, override or "clean up" them without Jonas's explicit request naming the change.**
If a task conflicts with anything below, **stop and ask Jonas** before editing. Do not work around this by adding later CSS/JS that overrides these files.

## Locked items
| Design | Files |
|---|---|
| Logo, favicons, app icons | `assets/brand/matchapp-ai-*` |
| Animated "MatchApp Ai" wordmark and header (no pill behind the logo) | `patches/reference-header.css`, `cinematic-header.css` |
| Flattened pills | `patches/reference-pills.css` |
| Guided tour and permissions step | `guided-coach-20261022.js`, `guided-coach-20261022.css` |
| Chat resize | `patches/chat-resize-20261022.js` |
| UI fixes: poster-wall background, gold control style, chat close X, Jonas face animation (blinks, synced talking, thinking tilt, smile, wink) | `ui-fixes-20261023.css`, `ui-fixes-20261023.js` |
| Poster wall builder (tile sizes, poster pool, sharp renditions) | `poster-wall.js` |
| Image work (brand art, Jonas face set) | `assets/brand/`, `jonas/faces/jonas/*` |

### Approved poster-wall background (commit 2458ce0)
Dense small posters (about 100px desktop, about 66–77px phones), gentle perspective tilt (`rotateX(9deg) rotateZ(-5deg)`), one static blur (2px desktop, 1.5px phones) with a slight saturation boost, a midnight purple base (`#0d0820`) with top and bottom fades, a radial vignette and a faint gold glow (`#E6C36A`). Fixed, edge to edge, top to bottom on all adult pages, with dark card backdrops for readability. Never on Kids pages.

`tests/design-lock-20261023.test.cjs` asserts key values. If it fails, your change touched a locked design: revert it, or get Jonas's explicit approval and update the test in the same change.
