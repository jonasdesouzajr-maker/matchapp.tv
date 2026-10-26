# Premium adult matching animation — review and release handoff

Status: presentation wired and local visual checks passed; NOT merged, deployed or physically Android-verified.
Branch: `grok/premium-match-animation-draft-20261026`.
Original supplied animation commit: `0275011b53c9d92316b508120daf2d9f8d4c5a5b`.
Branch already contained `1358851ccbb297f5159e834178dca28eadd1ef55` when checked out. That commit loaded matching code through the donation shortcut; this change removes that coupling and explicitly includes the animation once in Home after core scripts.

## Scope and behavior

- `index.html` is the only adult HTML document containing matching `#loading-box`; country/language routes do not contain separate copies. No Kids inclusion, native resource changes or AAB increment.
- Retain Grok's orb, three constellation rings, three orbiting stars, canvas particles and refined progress meter. Use unique animation names and corrected child indices.
- Keep the exact existing headline, substep, progress bar and percentage DOM nodes and their translation/state ownership. Core matching remains the only progress writer.
- Upgrade only after companion CSS loads successfully. Retain the usable original scanner as fallback if loading fails. Once upgraded, hide its stage, equalizer, spinner and meter perforations inside this loader only.
- Start one particle frame loop while the loader is visible; stop on hide, completion, page hide, document backgrounding, system reduced motion or `html.reduce-motion`. Resume when appropriate; do not repeatedly mutate the observed class.
- Sound and vibration remain owned by the existing deliberate-action feedback and `app.js` result cue through `playMatchAppSound`. No second sound engine, result observer cue or direct `navigator.vibrate` bypass. Existing sound/haptic toggles and gesture restrictions remain authoritative.
- Rings use background artwork because the approved borderless theme suppresses decorative borders. The meter has no decorative frame. No protected stylesheet is edited or overridden to restore outlines.
- No matching policy, source/routing, quota, billing, RLS, auth, ads, Kids, header/wordmark, pills, poster-wall or Jonas code changes.

## Evidence and limitations

- Focused DOM regressions: 4 passed (`node --test tests/premium-match-animation-20261026.test.cjs`). Verify single wiring, CSS-failure fallback, node identity/translation retention, visible-loop lifecycle, preference changes, no duplicate feedback and Kids-path guard.
- Headless Chromium presentation fixture: `node tools/qa-premium-match-animation-20261026.cjs`, 320/390/768/1440px. Existing Home styles (including critical preloads and locked UI fixes) applied. All sizes: 3 correctly sized painted rings, 1 stage, visible canvas pixels, old visuals hidden, 58% core-node update retained, no horizontal overflow, reduced-motion CSS disabled, loader hidden on simulated completion, zero page script exceptions. Phone screenshots visually inspected. The fixture intentionally does not call matching services; it does not certify genuine match completion or full-page integration.
- Fixture evidence defaults to `/tmp/match-animation-evidence/`: JSON plus normal/reduced screenshots for each size; set `MATCH_ANIMATION_EVIDENCE` to retain elsewhere when rerunning. Test creates and closes its own browser instance.
- `npm run build`: passed.
- `npm run audit:site`: passed with `NODE_OPTIONS=--max-old-space-size=4096`. Initial default-heap attempt exhausted Node's ~2GB heap; no audit code or guard was altered. Final search readiness: 266 URLs checked; zero errors.
- Full `npm test`: see final PR description for completed result. Required CI suite and site audit must pass for the exact PR head before merge.
- Desktop Commander: Jonas laptop online; default SDK `adb devices -l` returned no connected devices. No physical phone/tablet/Android WebView QA, audio listening or tactile haptic confirmation is claimed. No laptop browser tabs were opened or changed; no device settings changed.
- Latest main observed during review: `898219d26ba0c4b91e6cd1b35559389bc0ab825c`, ahead of the animation base `80952b3e`. Main contains separate matching/navigation repairs. Preserve those fixes; review/test the merged result before release. Do not replace main with the older branch tree.

## Owner/Codex final checks and publication

1. Review PR and exact final head, require normal CI gates, and verify no protected contracts changed. Refresh against current main through the approved integration workflow without dropping newer fixes.
2. In a trusted preview of the integrated commit, perform genuine matching start/progress/success, failure/retry and cancel/back flows on desktop, mobile web and a connected physical adult Android WebView. Confirm no stale result keeps animation inactive, no overlay/CLS, and that locked ads/header/Jonas/pills/poster wall remain unchanged. Check selected-language text, system/app reduced motion, background/return, sound on/off and haptics on/off. The local fixture is not a substitute for these checks.
3. Owner explicitly assigns merge/publication. Use the existing validated main GitHub Pages publishing workflow and existing Cloudflare domain/proxy; no parallel deployment path, DNS change or broad cache purge. New JS/CSS URLs use `v=20261026-2`.
4. Confirm exact live `deployment-sha.txt` and fresh JS/CSS response contents, then run the existing post-deploy `release-smoke.yml` once for that main SHA. Inspect real match/art, reading, Ask AI and responsive results, and physical Android again. Do not label the release verified if any gate is missing.
5. Adult app `com.jonas.papercup` loads live `https://matchapp.tv/`; web-only deployment reaches a fresh online WebView load. No APK/AAB upload or Play listing change belongs to this task. Keep Kids isolated. Save evidence; close task browser tabs safely when complete, preserving unsaved/blocked work.
