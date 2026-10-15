# Jonas speech startup and expanded-panel spacing — 2026-10-15

Scope: the owner's four tablet screenshots and earlier `174020.mp4` reference.

- Home Premiere and weekly-choice bodies had a computed 0px gap. The watch
  selector measured 14px. Scoped fold rules restore that same content gap,
  including secondary Home disclosures, without touching ad geometry.
- All 14 selected-language greetings now have verified OpenAI Cedar recordings.
  The manifest retains original generation hashes and processed hashes; only
  leading silence was removed. The player warms and decodes the selected clip
  before activation, and warms the new language when it changes.
- Android/shared ambient greeting text matches the same recordings. A tap while
  the speech module loads resumes on its load event, independently of the chat
  iframe. The debug mirror is synchronized; release WebView consumes live files.
- `jonas-speech` v11 is deployed. Its baseline matched production v10 exactly.
  New clients request streaming 24kHz signed little-endian PCM; older clients
  retain buffered MP3. Cedar remains primary, Charon WAV remains fallback.
  Origin, auth, per-user/guest/global usage limits, and text limits are unchanged.
  No AI text routing, recommendation validation, model, billing, or Kids changes.
- PCM playback schedules real samples continuously, reports measured levels,
  cancels upstream and queued audio on stop/language change, and preserves text
  on speech failure. A single answer uses one speech request/reservation.

Verified so far: 1,168 automated tests passed; site audit reports no errors;
50 global-frame checks passed. A laptop production request returned Cedar PCM
in 113 chunks: first audio 5,487ms, complete download 6,411ms. This is one observed
request, not a guaranteed response time or a model-answer benchmark.

Remaining at this checkpoint: finish the rendered/audio browser harness,
inspect the updated physical debug APK, merge after CI, confirm exact deployed
SHA and its automatically triggered live release smoke. Do not repeat the
finished full regression run or rebuild the existing unsigned release AAB 53.

Implementation references: OpenAI's text-to-speech guide documents chunked
playback and 24kHz 16-bit little-endian PCM; Supabase's Edge Function resource
guide supports returning a ReadableStream without whole-file buffering.
