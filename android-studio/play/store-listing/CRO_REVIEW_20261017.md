# MatchApp Ai — Play listing conversion review

Prepared locally on 17 October 2026 for the adult package `com.jonas.papercup`. This is a copy and capture handoff, not a Console submission or a claim that the new release is live. No screenshot artwork, account settings, remote listing or release track was changed.

## Search intent and prepared copy

Lead with the two questions the working matcher answers: **what to watch** and **where to watch**. The short description uses those terms naturally, while the longer description retains the existing entertainment, reading and audio breadth. This is a conversion hypothesis to evaluate against real listing results; no ranking or conversion uplift is promised.

| Locale | Current source title | Title characters | Prepared short description | Short-description characters |
| --- | --- | ---: | --- | ---: |
| en-US | MatchApp Ai | 11 | Movie and TV recommendations by mood. Discover where to watch. | 62 |
| pt-BR | MatchApp Ai | 11 | Recomendações de filmes e séries por humor. Descubra onde assistir. | 67 |

The title preserves the exact existing brand instruction and the unchanged title assertion in `tests/play-store-presence.test.cjs`. The prepared short descriptions fit the repository's 80-character limit. No plan, price, trial, reward, provider partnership or ad-free claim is added. The two full descriptions only replace the old VIP/Business/extra-pack sales paragraph with neutral optional-purchase and existing-subscription terms. They do not market a disabled Pro feature or remove access to an existing subscription.

If the release owner later changes the exact-title instruction, concise descriptive candidates are **MatchApp Ai: Where to Watch** (27 characters) and **MatchApp Ai: Onde assistir** (26 characters). These are proposals only; they were not written into `title.txt` or used to weaken the exact-brand test. The released app header, launcher identity and product name remain MatchApp Ai regardless of any future listing experiment.

## Three-screen narrative

Use the same sequence in English and Brazilian Portuguese. Each screen shows a real state of the current adult Android app, with the interface explicitly set to the corresponding language. Set the viewer's actual country separately through the existing app control; interface language and a title's country of origin are not availability evidence.

### Screen 1 — choose what fits tonight

| Element | en-US | pt-BR |
| --- | --- | --- |
| Headline | Find your next movie or series | Encontre seu próximo filme ou série |
| Supporting line | Choose your mood and favorite platforms. | Escolha seu humor e suas plataformas. |

Capture the current Home questionnaire after selecting an ordinary movie or TV format and a mood. Show the real category, mood and platform controls and the existing Match action. The relevant source is `index.html`, `#questionnaire-box`, with `#q-category`, `#q-mood` and `#q-platform`. Keep the screenshot focused on those controls; do not add extra dropdowns, a simulated provider picker or a fabricated result count. Advanced filters can remain in their normal collapsed state.

This screen establishes the decision the visitor can make immediately. The brand and gold perimeter should be visible where the actual viewport shows them, without shrinking the app into an unreadable full-page capture.

### Screen 2 — receive one clear recommendation

| Element | en-US | pt-BR |
| --- | --- | --- |
| Headline | One match for your mood | Um match para o seu humor |
| Supporting line | See the poster, synopsis and title details. | Veja o pôster, a sinopse e os detalhes do título. |

Generate a real successful recommendation through the normal UI. Capture its settled upper result card: original title-matched poster, title, provider badge, synopsis and the available factual details. The current anchors are `#result-box`, `#res-poster-img`, `#res-title`, `#res-platform-badge`, `#res-synopsis` and `#res-factbar`. Use the source-driven values actually returned; do not type a desired title into the DOM or composite a different poster onto the card.

Wait for the genuine poster to finish loading and the finite reveal to settle. A loader, placeholder art, wrong-title cover or unpublished mock is not a suitable listing capture. The existing result card, current typography and 24px radius provide the visual treatment; no screenshot-only redesign is required.

### Screen 3 — move from the pick to a viewing option

| Element | en-US | pt-BR |
| --- | --- | --- |
| Headline | See where to watch | Descubra onde assistir |
| Supporting line | Explore official viewing options. | Explore as opções oficiais para assistir. |
| Small explanatory line | Availability and subscriptions vary by provider and country. | A disponibilidade e as assinaturas variam por serviço e país. |

Use the same successfully generated title, scrolled naturally to its actual provider action and Watch Later controls. Keep enough title context visible to make the connection clear. The current anchors are `#res-direct-link`, `#btn-watch-later` and the secondary `.res-action-grid`; the result presentation module retains their original handlers and destination.

Preserve the button's actual destination-specific wording. A provider catalogue/search link must not be relabeled as instant playback, a free film or included streaming access. Show a checked-region badge only when the current source evidence caused the app to display it. A truthful neutral availability note is acceptable; never add a checkmark solely for the store asset. Do not capture or compose a third-party streaming player as if it were part of MatchApp Ai.

## Capture and layout guidelines

The three assets should have one short headline, one supporting line and one clear app state each. Use a consistent portrait canvas accepted by the current Console, preserving the native capture's proportions. If captions are added around a capture, keep them outside the actual app view and let the genuine interface occupy most of the image. Retain the approved MatchApp Ai artwork and the entire visible gold boundary; avoid recoloring controls, clipping original posters, removing an actual ad from a captured state, or painting text over app controls.

Use the released or approved release-candidate adult build that actually contains the shown interface. Complete normal consent/onboarding actions and close ordinary notices through their real controls before capture. Select only a legitimate available result with non-explicit artwork, and omit personal account details. Verify the country, language, title identity and original artwork again for each locale. English and Portuguese captions are authored separately; do not place English app screenshots under Portuguese labels.

At review size, the title, controls and provider action must remain legible. Keep screenshots 1–3 dedicated to the core movie/TV flow; reading, news and other existing destinations can appear later in the listing after these three if current captures support them. New Pro, three-token rewards, regional discounts, winback offers, a native news ad and deep recaps are outside this first-three narrative. A feature being implemented or configured does not make it a current listing promise.

## Existing asset audit

The local files below were viewed, not modified:

| Asset | Observed problem | Release treatment |
| --- | --- | --- |
| `../screenshots/01-android-listing.png` | Obsolete MatchApp TV branding, “No ads”, “every ad slot removed”, and a combined Kids claim. It is an older landing-page capture. | Do not re-upload as a current adult app screenshot. Replace with a genuine current Screen 1 capture. |
| `../screenshots/02-home.png` | Old brand/controls/platform count, full-page scale and notices obstructing the lower UI. | Keep as historical evidence; capture the current localized questionnaire. |
| `../screenshots/03-title-card.png` | Older Ask layout, obstructing notice and generic fallback covers. | Capture the actual current organic result and provider action for Screens 2 and 3. |
| `../screenshots/04-kids.png` | Existing `PLAY_CONSOLE.md` already excludes this separate-product asset from the adult listing. It was not edited or repurposed. | Exclude from the adult listing. |

The feature graphic was not changed or certified by this task. The release owner should compare the current default and custom listings against the actual live build before submitting the prepared text or replacement captures.

## Publication and measurement handoff

First correct any inaccurate or obsolete live brand/feature claims using the release owner's Console review; do not keep a misleading asset as an experiment control. Apply the prepared short descriptions and the narrow full-description purchase-terms correction only after comparing the intended source with the current published/default/custom listing content. Listing changes do not themselves publish an Android binary.

After the truthful baseline is established, use the Console's available listing experiment workflow to compare one copy variable at a time. Record the actual locale, country, traffic source, dates and listing version. Evaluate store acquisition together with the existing first-successful-result and provider-navigation measurements where already available, so a stronger store promise is not mistaken for better retained use. This handoff adds no analytics events, tracking identifiers or claimed results.

Run the unchanged `tests/play-store-presence.test.cjs` for the exact brand, text limits and existing first-party support targets. Final current-device screenshot capture, published metadata comparison, any available experiment setup and Console publication remain the release owner's next actions.
