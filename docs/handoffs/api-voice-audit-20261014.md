# API routing and Jonas voice audit — 2026-10-14

Owner confirmed OpenAI Cedar as Jonas's normal voice, then explicitly authorized male Gemini Charon when OpenAI is unavailable. Do not interpret this as authorization to substitute female, unknown or OS/device voices. Neither built-in voice is a clone of the owner's voice. Nayela and Kids remain separate.

## Verified live

- `jonas-speech` version 9: Cedar first, Charon fallback; response identity now truthfully reports `male-cedar` or `male-charon` and exposes the header through CORS. Auth/origin/rate/global spending guards are preserved. Two new fixed English/pt-BR recordings returned Cedar MP3 and were saved with provider, voice and SHA-256 provenance in the greeting manifest.
- `gemini-proxy` version 94: Gemini Flash-Lite returned correct Hayao Miyazaki attribution with no unrelated recommendations. Lower full-Flash effort and alias deduplication from the prior commit remain live. Shared selected-language, schema and output guards remain intact.
- TMDB: successful Portuguese title lookup for Spirited Away / A Viagem de Chihiro.
- OMDb: successful IMDb-ID-based ratings enrichment for tt0245429.
- RapidAPI streaming: the live endpoint reports `feature_disabled`. Its optional paid-provider guard was not changed.
- OpenRouter: latest production attempt returned HTTP 402. This requires account/billing resolution, not a speed-setting change. Existing per-isolate failure cooldown remains in place; no credits were bought.
- OpenAI text: application daily reservation table records 100 attempts on 2026-10-14 and logs say daily budget gate closed. Owner funding/key repair restored speech, but does not bypass this independent daily text ceiling. No cap was raised or reset.
- Groq and alternate Gemini project keys were not individually forced through production. They retain existing bounded timeouts, credential/quota cooldowns and schema checks. Do not describe them as individually live-verified.
- No payment, email or Firecrawl administration operation was triggered just to test credentials. These do not sit on the interactive reply path; no blanket claim about every secret's validity is justified.

## Web player changes

Active shared, Home, standalone Jonas, ambient Android and Ask AI read-aloud paths now use the same approved cloud speech service. Removed alternate OS/native speech branches that could change identity between greeting and answer. Native/browser microphone recognition remains unchanged. Missing speech leaves text usable. Client rejects cloud audio without an approved male identity header. Existing lip movement uses measured audio levels; no fake boundary timer was substituted. Two existing greeting clips were regenerated as Cedar rather than playing older Charon recordings before Cedar replies. Only changed asset references receive an added cache version; existing query versions/guards are preserved. Debug preview mirrors were synchronized; native package/version/signing were not changed.

Validation: all 1113 local tests pass, including new execution tests for Cedar, OpenAI failure to Charon, rejected client voice override, and both-provider failure. Live test environment spends roughly 9–10s in TLS setup, so its wall-clock durations are not claims about provider generation latency. Earlier laptop short-greeting check returned Cedar in 6.247s. No claim of globally optimal latency or zero external outages is possible.

Release note: frontend changes belong to the existing integration branch/PR; backend versions above are already live. Do not redeploy the integration branch's older gemini-proxy wholesale: live version 94 also preserves persona/general-conversation changes from version 93 that are absent on the branch. Reconcile that drift before any full backend deployment. Other website/physical-APK release gates remain in the existing handoff.
