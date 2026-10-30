# Edge functional audit — 2026-10-28

Production interaction used the connected Windows Edge browser. Source checkout began at e6f2748e5. PR #408 was already merged; no duplicate merge, production deployment, release smoke, or Play release was started.

## Executed browser matrix

| Check | Observation |
| --- | --- |
| Three identical movie criteria | Dangal; Raat Akeli Hai / Na Solidão da Noite; Amores Brutos. No repeated work in these three requests. |
| Changed criterion: TV series | Pantanal (2022), source classified as TV. |
| Changed criterion: miniseries | Death of the Pastor's Wife / A Morte da Esposa do Pastor, source classified as TV documentary/crime. |
| Changed criterion: documentary | Um Gênio Chamado Jô (2024). |
| Ask AI: Interstellar director | Portuguese answer correctly identified Christopher Nolan and Jonathan Nolan's screenplay credit. |
| Ask AI: Spirited Away premise/director | Portuguese, spoiler-free premise and Hayao Miyazaki. |
| Ask AI: Casablanca director | Portuguese answer correctly identified Michael Curtiz. |
| Lumina phases 1–3 | Each completed with 20 points and two stars. Home showed 3/250 completed, 6/750 stars, 3 rounds and 60 points. |
| Lumina timed phase 4 | Reached “O tempo acabou”; retry opened phase 4 with a new countdown. Completed phases retained. |
| Lumina account recovery | A save/read failure paused solo input. Reload restored the three completed levels, six stars, and 60 points. Relaxed mode restored before closing gameplay. |
| Navigation | Explore, Profile, and My List opened and settled in Portuguese. No profile/list edits, purchases, or messages. |

The six production matches consumed six included daily matches (50 to 44 total including 40 extra). These generated titles are now part of this account's no-repeat history. Gameplay intentionally advanced the account through three campaign levels.

## Confirmed defect and patch

The initial Ask submission displayed “Não foi possível verificar seu saldo. Tente novamente.” and lost the typed question. `newDiscoverSearch` clears the composer immediately, while allowance verification can return false before the request flow records the question.

The patch restores that submitted draft only if allowance verification fails, the conversation has not changed, and the composer remains empty. A newer draft is preserved. The successful flow clears only its own matching text. Existing debit, request deduplication, source routing, design, and allowance policy remain unchanged. The exact Android debug asset mirror is synchronized and only the changed script is cache-busted.

## Verification

- Full `npm test`: 3,209 passed; zero failures, skipped, or cancelled.
- Focused composer/lifecycle/landing/Android preview checks: 52 passed.
- `npm run build`: passed.
- `npm run audit:site`: passed with no reported site/search errors, using `NODE_OPTIONS=--max-old-space-size=8192` after the default-heap audit exhausted memory.
- `git diff --check`: clean.

## Limits and follow-up

This completes the requested six-match, three-answer, three-win/one-loss matrix; it is not certification of every action on every route or device. No microphone, payment, registration, external provider subscription playback, native phone, or all-language visual matrix was executed here.

Intermittent Supabase authentication-lock warnings and an uncaught lock-steal AbortError were captured. Ask allowance checks and Lumina account saves temporarily failed but later recovered. The draft-restoration patch does not claim to fix that underlying session/network issue.

During asynchronous rematch enrichment, a new title briefly appeared with the previous result's facts/provider links before enrichment settled. Later DOM readings showed corrected identities. Treat the transient metadata window as outstanding investigation, rather than a verified permanent identity mismatch or a repaired defect.

The patch is for review. No production merge/deployment or exact-SHA release smoke was performed by this audit. A preview/live verification of the revised failure recovery remains pending publication of the patch.
