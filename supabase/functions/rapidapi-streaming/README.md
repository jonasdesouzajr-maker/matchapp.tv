# Optional RapidAPI streaming enrichment

RapidAPI is a marketplace key, not an AI model or automatic access to every provider.
This integration does not alter Match, Ask AI, existing TMDB/JustWatch
streaming metadata, posters, Kids Mode, indexed pages, or automatic data ingest.

## Supported provider

Movie of the Night — Streaming Availability:
https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability

The adapter uses an exact existing TMDB movie/TV ID and a two-letter country.
It shows only provider names and allowlisted HTTPS links after verifying the
upstream response's ID, media type and country data.

## Free-key activation (no paid subscription)

The existing `RAPIDAPI` key is free; no new key, subscription or paid upgrade is
requested. RapidAPI keys work with its genuinely **Free** APIs without a card or
subscription, but marketplace keys are not automatic entitlement to every
provider. This optional adapter targets **Streaming Availability specifically**;
its RapidAPI access must independently be verified as free before activation.
If that endpoint requires a plan, keep this adapter disabled and retain the
existing TMDB/JustWatch source; never silently subscribe or incur charges.

1. Verify Streaming Availability accepts this key with **no subscription, card,
   pay-per-use billing or overages**. This generic key by itself is not proof.
2. Keep the existing key only in the Supabase Edge Function secret `RAPIDAPI`.
3. Only after confirming genuinely free access to that exact endpoint, set
   `RAPIDAPI_STREAMING_ENABLED=true`. Otherwise leave it off: zero RapidAPI
   requests are made.
4. Deploy the rapidapi-streaming Edge Function with verify_jwt=false as configured;
   this ES256 project independently checks allowed origins and has a fail-closed
   backend minute limiter. Check the RapidAPI usage dashboard regularly.
5. Confirm a real country-specific link in adult Match. Any provider failure
   silently hides the supplementary links without altering existing results.

Do not enable without verified, no-payment access to this particular endpoint.
Three requests/minute/IP and six-hour cache reduce usage but cannot enforce
provider monthly quotas. On quota errors the feature fails closed.

Run npm test to verify identity checks, injection-resistant links, stale results
and separation from the existing Match engine. The user-facing service is optional.
