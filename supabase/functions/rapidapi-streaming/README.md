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

## Activation and billing

1. Confirm an active Streaming Availability plan on the owner's RapidAPI account.
   A generic RapidAPI key alone is not enough. Review request limits and overages.
2. Store the existing app key only in the Supabase Edge Function secret RAPIDAPI.
3. AFTER subscription and costs are confirmed, set the separate Supabase secret
   RAPIDAPI_STREAMING_ENABLED=true. Until then, zero RapidAPI requests are made.
4. Deploy the rapidapi-streaming Edge Function with verify_jwt=false as configured;
   this ES256 project independently checks allowed origins and has a fail-closed
   backend minute limiter. Check the RapidAPI usage dashboard regularly.
5. Confirm a real country-specific link in adult Match. Any provider failure
   silently hides the supplementary links without altering existing results.

Do not enable without subscription and acceptable overage controls. Three requests
per minute/IP and six-hour cache reduce demand but are NOT a monthly spending cap.

Run npm test to verify identity checks, injection-resistant links, stale results
and separation from the existing Match engine. The user-facing service is optional.
