# Lumina Match inside MatchApp Ai

The browser-only **Play Lumina Match** pill opens a complete **250-level campaign**, classic rounds and friends play over the current Home page. Its compact mint/turquoise capsule has a finite pop/wiggle invitation, keyboard focus and reduced-motion support. The playable game loads on demand in an isolated document inside a full-width rounded box, with **Save** and **Close** controls. Close returns to the existing Home page and restores launch-button focus; closing also captures registered players' latest progress and disposes game audio. Guest play lasts only while the game remains open.

## Source and integration

The browser integration builds on Jonas's supplied `LuminaMatch_Browser.zip`, preserving Grok's palette, typography and original nine JPEGs. `browser/source.json` records that archive's SHA-256 and the original artwork hashes.

The full artwork set comes from `LuminaMatch_Friends_CardGame.zip`: **27 original JPEGs**, comprising 24 card faces and three themed card backs. They are preserved byte-for-byte, including the nine images already used by the browser build. `browser/campaign-source.json` records the archive SHA-256 (`3af1475cdd27aea40e117cf831b3c20a5c4975b2ddc5b5e8da02f8f015455c9e`) and all 27 file hashes. `browser/campaign.js` implements the complete bounded progression, deck generation, result calculation and campaign validation for levels 1–250.

The original flip and match effects are extracted from the supplied `LuminaMatch.apk`. `browser/sounds/source.json` records their APK paths, byte hashes, sizes and durations. Music is an original composition synthesized by this integration, with one score for each theme.

## Campaign and scoring

The campaign contains **ten chapters of 25 levels**. Matching every pair clears a level and unlocks the next; level 250 completes the journey without creating a level 251. Players can replay unlocked levels to improve their best stars, moves and time, with up to **750 stars** across the journey. Registered players retain these results in their account; guests retain them during the current open game only.

| Theme | Schedule | Card pool and board size |
| --- | --- | --- |
| Starlight | Ordinary levels | Starts with four pairs. The target grows by one pair at each multiple of ten, up to 20 pairs. The pool contains 12 star-themed faces before level 90 and all 24 faces from level 90 onward. |
| Enchanted Grove | Every 20th level | Uses its six forest faces and corresponding card back. Event boards contain six pairs. |
| Celestial Ocean | Every 25th level | Uses its six ocean faces and corresponding card back. Event boards contain six pairs. |

Grove takes priority where the schedules coincide, including levels 100 and 200. Each attempt shuffles the selected faces into pairs; board size is bounded by the available pool.

**Relaxed** play has no countdown. The optional **Timed challenge** uses a level-specific limit based on board size and chapter. Both modes unlock the same campaign. A timed failure offers Retry and Play relaxed while preserving unlocked levels and earned stars. Pause, audio settings, leaving the tab and cached-page restoration pause an active campaign; returning to a paused board requires Resume.

Scoring follows these rules:

- Each attempt allows up to three free hints. A hint briefly reveals an unmatched pair and limits that attempt's result to at most two stars.
- A clear earns three stars when moves are at most `1.4 × pairs`, two when moves are at most `2 × pairs`, and one otherwise. A move is a two-card attempt.
- Points per clear are `10 × stars + max(0, 30 - floor(elapsedSeconds / 2))`, plus **50 bonus points** for the first clear of every tenth level. Replaying that level does not repeat its milestone bonus.
- Best stars, fewest moves and shortest time are tracked independently. For registered players, completed boards are removed from the active account save before completion points are persisted.

## Other modes and friends

- **Classic round:** six shuffled pairs, ten points per completed round, a new-round action and Continue for an unfinished classic board. Classic and campaign resume state are tracked separately within the open game and saved to registered players' accounts.
- **Play with Friends:** existing mutually accepted Match Together friends, a private invitation inbox, explicit acceptance, a shared board, authoritative turns and scores. The player can copy the invitation's Home-page link; the game does not send email, push or external messages automatically.
- **On this device:** two people share one screen, retaining a turn after a match and switching after a miss. Shared-device rounds last only for that session. The solo Save control is hidden in friends modes; online rooms already persist each authorized turn on the server.

Anonymous/share-code Match Together participants are not automatically promoted into the private friends graph. Friendship approval must already exist. Online and same-device friends rounds retain their existing six-pair rules. Native Android progress and Google Play Games are not synchronized by this integration.

## Progress and compatibility

**Progress is saved only for registered players.** Account saves contain points, completed-round counts, unfinished classic rounds and the full campaign. The version-2 campaign payload includes the highest unlocked level, 250 result slots and an optional unfinished level containing its board, matched pairs, moves, elapsed seconds, timed-mode choice and hints used. Transient card reveals are hidden on resume. Save explicitly requests an account write and acknowledgment; the localized status reflects saving, confirmed success, or a recoverable failure.

Guests can play all levels and continue an unfinished round while the same game stays open. Guest progress lives in memory only: it is not written to browser storage, restored after closing or reloading, or recovered from legacy guest snapshots and counters. Existing legacy browser data is ignored and left untouched. Audio preferences may still persist separately; they do not contain game progress.

When a guest presses **Save**, a dismissible **Create an account to save** prompt explains the requirement. **Create account** opens MatchApp's registration flow, **Keep playing** dismisses the prompt and resumes the current game, and **Close without saving** returns to MatchApp Home without storing guest progress. The prompt's close control and Escape also dismiss it. Opening the prompt pauses active play. Requesting registration does not itself create an account or confirm a save; those require the existing authentication flow and a successful account-save acknowledgment.

Legacy account payloads remain supported. The campaign migration preserves an existing V2 campaign when an older cached client writes its classic progress under the current revision. The frontend keeps a legacy account save in its original shape until the player uses the campaign. Guest browser data is never silently imported into an account.

Account saves use a guarded RPC, a separate private table and optimistic revisions. The parent serializes/coalesces writes and allows a bounded pending save to finish after the overlay closes. Account switches clear old state and abort stale writes. Each RPC pins the checked account token on its own request so a cross-tab account switch cannot change the save owner while the SDK prepares its transport. Loading gates solo input; a failed or conflicting save shows a localized explanation and an explicit Reload saved game action, which replaces the current session with the account save.

## Audio and lifecycle

`browser/audio.js` owns the game's Web Audio graph. It uses the APK's `flip.mp3` and `match.mp3`, with short synthesized fallbacks if a sample cannot load or decode. Miss, win, level-start and tap effects are synthesized locally. Three original, 24-second ambient music loops accompany Starlight, Enchanted Grove and Celestial Ocean; they are generated locally without external audio services.

Audio starts after a player gesture. **Audio settings** provides separate sound-effects and music switches plus a master volume slider; preferences persist on the browser when storage is available. Opening settings pauses an active game, and Done resumes it when the game and account state permit. A browser without usable audio can continue gameplay silently.

Pausing or hiding the game stops active sound sources and suspends audio. Cached-page restoration respects the campaign's explicit paused state. Close disposes the audio owner, cancels pending sample loads and activation work, stops music and effects, closes the audio context and removes the game frame. Late callbacks cannot restart playback after disposal.

## Languages and boundaries

All campaign, Save/registration prompts, audio settings, classic, online, invitation, recovery and accessible card labels use the selected MatchApp language: **English, Brazilian Portuguese, Spanish, French, German, Italian, Turkish, Russian, Arabic, Hindi, Indonesian, Japanese, Korean and Chinese**. All 14 locales have authored campaign strings, including the new card faces and account-only save guidance. Arabic uses right-to-left layout. Both OS and saved application reduced-motion preferences reach the game.

The launcher is exclusive to adult Home in browsers. MatchApp's native Android shell and Kids are excluded. Existing matching, Ask AI, quotas, billing, auth settings, editorial jobs, approved branding and ad inventory are not changed.

## Private online game connection and migrations

The parent owns the existing Supabase auth client. The embedded game uses an origin/source-validated message bridge for a strict set of `lumina_action` operations. Session tokens never cross that bridge. The database stores the online hidden board privately and returns only revealed/matched faces. Participant, accepted-friendship, turn and revision checks occur server-side. Invitations expire; reads/polls stop when hidden or closed.

Apply these migrations in order before releasing the corresponding frontend:

1. `supabase/migrations/20261027222612_lumina_browser_friends_and_progress.sql` establishes private friends rooms, account progress and the guarded RPC.
2. `supabase/migrations/20261028075206_lumina_campaign_progress.sql` adds bounded V2 campaign validation and legacy-write preservation while retaining the existing friends-room contract and access controls.

The migrations maintain separate game state and do not rewrite the existing friends or Match Together mechanisms. Campaign validation checks the level range, progression continuity, result bounds, theme-specific board size, valid paired artwork and resume fields. Private validators are not directly callable by anonymous or authenticated clients.

## Advertising

**Game ads remain off.** All 250 levels, hints and other current game actions work without ad watching. This module adds no ad SDK, placement, simulated reward or consent changes. MatchApp's existing AdSense contract stays intact.

Jonas requested future optional watch-for-reward ads and ads at natural round/level transitions once advertising is running. Existing homepage ad scripts alone do not activate this game. A later integration must use the actual approved reward/level configuration, award only after a verified completed-reward callback, and preserve play, resume and Close on skip, no-fill or failure. No ad-dependent unlocks or nonfunctional reward buttons are shown now.

## Verification

Run the focused Lumina suite from the repository root, followed by the full repository and site-audit gates:

```sh
node --test --test-isolation=none --test-force-exit tests/lumina-*.test.cjs
npm test
npm run build
npm run audit:site
```

The Lumina checks include artwork and APK-effect provenance, selected-language coverage, game completion/scoring, account saves and unfinished-round resume, guest session-only behavior, ignored legacy guest storage, stale-save conflicts, close-time save flushing, lifecycle recovery, launcher close/reopen races, private bridge validation and server-authoritative multiplayer rules. Campaign persistence fixtures exercise all 250 generated boards, completion bounds, invalid payloads and account compatibility. Audio fixtures exercise gesture gating, generated scores, settings, fallback, visibility and disposal.

Before release, verify campaign progression through the final boundary, hints, timed failure, Pause/Resume, registered saved-level recovery, language switching and Close/reopen in the browser preview. Verify every guest prompt action, that Keep playing preserves the current board, and that closing or reloading starts a fresh guest game. Check representative phone, tablet and desktop sizes for the full-width rounded game box and accessible Save/Close controls, and listen to effects and all three music themes after a gesture. Automated Web Audio fixtures do not establish audibility on every real browser. A passing local simulated two-user database test is distinct from a live game between two independently signed-in people. This document describes verification commands and scope; release results should be recorded with the actual run.
