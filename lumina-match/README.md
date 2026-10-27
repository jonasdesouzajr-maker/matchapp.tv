# Lumina Match inside MatchApp Ai

The browser-only **Play Lumina Match** pill opens the game over the current Home page. Its compact mint/turquoise capsule has a finite pop/wiggle invitation, keyboard focus and reduced-motion support. The game is loaded on demand; closing it restores the page and launch-button focus.

## Source and integration

This integration replaces the earlier unmerged custom game adaptation with Jonas's supplied `LuminaMatch_Browser.zip` (SHA-256 `d4feb038f4e9f723e40d33fd13269797c5b22b95ac98f6bf75836406d2485644`). The nine JPEGs are preserved byte-for-byte; `browser/source.json` records their hashes. Grok's palette, typography, artwork and six-pair gameplay are retained in an isolated game document.

The supplied build's unfinished Levels alert and never-advancing level counter are replaced by working Play and completed-round/points displays. Integration repairs cover delayed-turn cancellation, browser storage failures, accessible card buttons, actual flip transitions, small-screen scrolling and Back/Forward cache restoration. This is not a claim of native Android feature parity or 350 browser levels.

## Modes

- **Solo:** six shuffled pairs per round, ten points per completed round, Play again and Continue for an unfinished round. Signed-in players save points, completed rounds and the active solo board to their account. Guests save independently on this browser when storage is available.
- **Play with Friends:** existing mutually accepted Match Together friends, a private invitation inbox, explicit acceptance, a shared board, authoritative turns and scores. The player can copy the invitation's Home-page link; the game does not send email, push or external messages automatically.
- **On this device:** two people share one screen, retaining a turn after a match and switching after a miss.

Anonymous/share-code Match Together participants are not automatically promoted into the private friends graph. Friendship approval must already exist. Native Android progress and Google Play Games are not synchronized by this integration.

## Languages and boundaries

All game, online, invitation, recovery and accessible card labels use the selected MatchApp language: English, Brazilian Portuguese, Spanish, French, German, Italian, Turkish, Russian, Arabic, Hindi, Indonesian, Japanese, Korean and Chinese. Arabic uses right-to-left layout. Both OS and saved application reduced-motion preferences reach the game.

The launcher is exclusive to adult Home in browsers. MatchApp's native Android shell and Kids are excluded. Existing matching, Ask AI, quotas, billing, auth settings, editorial jobs, approved branding and ad inventory are not changed.

## Private online game connection

The parent owns the existing Supabase auth client. The embedded game uses an origin/source-validated message bridge for a strict set of `lumina_action` operations. Session tokens never cross that bridge. The database stores the hidden board privately and returns only revealed/matched faces. Participant, accepted-friendship, turn and revision checks occur server-side. Invitations expire; reads/polls stop when hidden or closed.

The new migration and database tests accompany this feature. The online mode requires that migration before the frontend is released. It creates separate game state and does not rewrite the existing friends or Match Together mechanisms.

Account saves use the same guarded RPC, a separate private table and optimistic revisions. The parent serializes/coalesces writes and allows a bounded pending save to finish after the overlay closes. Account switches clear the old state and abort stale writes. Each RPC pins the checked account token on its own request so a cross-tab account switch cannot change the save owner while the SDK prepares its transport. Loading gates solo input; a failed or conflicting save shows a localized explanation and an explicit Reload saved game action, which replaces the current session with the account save. Guest state is never silently imported into an account. Transient flipped cards are hidden on resume; matched pairs and move counts remain.

## Advertising

The supplied ZIP contains no ad integration. **Game ads remain off.** This module adds no ad SDK, placement, simulated reward or consent changes. MatchApp's existing AdSense contract stays intact.

Jonas requested future optional watch-for-reward ads and ads at natural round/level transitions once advertising is running. A temporary daily readiness task checks for verified serving and the approved browser-game configuration. Existing homepage ad scripts alone do not activate this game. The later integration must use the actual configured reward/level rules, award only after a verified completed-reward callback, and preserve play/resume/close paths on skip, no-fill or failure. The ZIP has no functioning level campaign, so this release does not invent level unlocks or show nonfunctional reward buttons. The game stays ad-free until the real integration is available and tested.

## Verification

Run the new `tests/lumina-*.test.cjs` checks together with the repository's full test and site-audit gates. They cover the original-art hashes, game completion/scoring/storage, unfinished-round resume, guest/account separation, stale-save conflicts, close-time save flushing, lifecycle recovery, selected-language coverage, launcher close/reopen races, private bridge validation and server-authoritative multiplayer rules. Render the deployed preview at representative phone/tablet/desktop sizes before release. A passing local simulated two-user database test is distinct from a live game between two independently signed-in people.
