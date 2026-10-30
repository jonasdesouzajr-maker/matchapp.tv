# Ask AI composer recovery — PR #409 continuation

The existing draft PR is reconciled with main
`a1c0e9cfb7b79d11adf686f9a1cba427b57a689c`. The original PR head was
`2021ce3ed752f505905ca006f56d95bb35f4d1df`. This is an additive merge of
main into that branch, preserving the newer queued follow-ups and narration /
viewport behavior. There is no duplicate PR or history rewrite.

## Behavior and boundaries

- False allowance verification restores the question only into an empty composer
  in the same conversation and selected language. A newer or previously recovered
  draft wins over another queued failure.
- The submitted field is cleared before the allowance wait, so successful
  verification cannot erase text typed during the wait, including a newly typed
  copy of the same question.
- Interrupted verification retains retry behavior without restoring into a
  replacement conversation or language. A same-tick context change cancels the
  scheduled request before verification starts.
- Distinct follow-ups still run in order; active and queued duplicates share the
  existing verification / answer / debit. Failed verification reaches no provider
  and consumes no credit. Successful replies retain existing debit policy.
- Web `discover.js` and the adult Android debug preview copy are byte-identical.
  Release Android does not bundle this preview; no native source, version, Play
  release, backend, auth, billing, matching, ads, Kids, Lumina or protected design
  changes are part of this fix. Only `discover.js` receives a new cache pin.

`AGENTS.md` and `DESIGN-LOCK.md` were reviewed. No repository `.agents/skills`
exists in this checkout, and the environment's `/workspace/.agents` is empty.

## Reproducible validation

- Focused checks: 131 passed, zero failed, using
  `node --test tests/discover-*.test.cjs tests/landing-match-intent.test.cjs tests/android-ambient-preview-20261012.test.cjs tests/ask-ai-*.test.cjs`.
  This includes 43 lifecycle cases covering denied / allowed / rejected allowance,
  new / opened / deleted conversations, language changes, same-tick cancellation,
  duplicate and queued sends, newer drafts and repeated retry.
- Browser preview: `node tools/qa-ask-allowance-20261030.cjs` serves local files,
  blocks external HTTP and WebSocket requests, and supplies deterministic
  allowance / credit and provider-transport fixtures. The actual request builder,
  parser, queue, Send button, composer and response renderer remain in use.
  Six recovery / accounting scenarios run on 320px Portuguese, 390px English,
  820px Portuguese tablet, 1366px English desktop, and 390px Chromium with an
  Android WebView user agent. Screenshot and JSON evidence are generated under
  `MATCHAPP_QA_OUTPUT` (default `/tmp/pr409-browser`).
- Full test suite, build, site/search audit, editorial rotation check, Android
  release identity/static guard and diff whitespace checks: see the PR description
  for final candidate counts, SHA and execution results.

## Limits and publication status

Fixtures are not evidence of live provider health, production credit/auth recovery,
physical Android/iOS behavior, Safari, or deployed production verification. No paid
live QA, merge, deployment, Play submission or new release AAB was performed.
The older Edge report in this PR remains historical evidence for the original
October 28 candidate only.

The existing `matching-ai-triple-audit.yml` runs live-provider smoke on PR updates,
including real backend source and quota calls. Under the no-paid-live-QA boundary,
pushing needs a confirmed way to prevent that job from reaching live providers.
The available GitHub connector has no cancellation action; local `gh api` access
was forbidden. No workflow, protected check, or skip-CI directive was changed to
work around that boundary. Final push and exact-candidate CI status are recorded
explicitly in the PR description / handoff, not inferred from the old head's CI.
