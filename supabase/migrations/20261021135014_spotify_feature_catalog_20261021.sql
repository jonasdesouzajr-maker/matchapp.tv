-- Curated, public, factual Spotify feature announcements; no Spotify Content or user data.
-- Additive migration: no changes to accounts, recommendation logic, media catalog, or Kids.
CREATE TABLE IF NOT EXISTS public.platform_feature_catalog (
    platform text NOT NULL CHECK (platform = 'spotify'),
    feature_id text NOT NULL CHECK (feature_id ~ '^[a-z0-9-]+$'),
    title text NOT NULL,
    category text NOT NULL CHECK (category IN ('music','podcasts','audiobooks','discovery')),
    announced_on date NOT NULL,
    rollout_status text NOT NULL CHECK (rollout_status IN ('rolling_out','limited_beta','available_in_eligible_markets')),
    eligibility text NOT NULL,
    market_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
    summary text NOT NULL,
    matchapp_relevance text NOT NULL,
    keyword_phrases text[] NOT NULL DEFAULT ARRAY[]::text[],
    source_url text NOT NULL CHECK (source_url LIKE 'https://newsroom.spotify.com/%'),
    reviewed_on date NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (platform, feature_id)
);
COMMENT ON TABLE public.platform_feature_catalog IS 'Independent, source-checked public platform feature guide; never contains Spotify Content, listening history, API tokens or user data.';
ALTER TABLE public.platform_feature_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_feature_catalog_public_read ON public.platform_feature_catalog;
CREATE POLICY platform_feature_catalog_public_read ON public.platform_feature_catalog
    FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON TABLE public.platform_feature_catalog TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.platform_feature_catalog FROM anon, authenticated;

INSERT INTO public.platform_feature_catalog
 (platform, feature_id, title, category, announced_on, rollout_status, eligibility, market_codes, summary, matchapp_relevance, keyword_phrases, source_url, reviewed_on)
VALUES
 ('spotify', 'audiobooks-global-expansion', 'Audiobooks expand across more markets', 'audiobooks', '2026-10-07'::date, 'rolling_out', 'Spotify plans and audiobook access options vary by country; Brazil was announced among planned Audiobooks in Premium markets.', ARRAY[ ]::text[], 'Spotify announced a phased expansion of audiobook access toward more than 180 markets by the end of 2026, including more languages and regional catalogs.', 'MatchApp Ai can help listeners choose a topic, format and mood, then encourage them to verify the exact audiobook edition in their country.', ARRAY['Spotify audiobooks Brazil 2026','audiobooks on Spotify by country','Spotify audiolivros Brasil','find audiobooks by mood' ]::text[], 'https://newsroom.spotify.com/2026-10-07/audiobooks-global-expansion/', '2026-10-21'::date),
 ('spotify', 'page-match-audiobooks', 'Page Match for print, e-book and audio', 'audiobooks', '2026-10-07'::date, 'available_in_eligible_markets', 'Requires a supported title and a compatible Spotify audiobook experience; check your market and account.', ARRAY[ ]::text[], 'Spotify''s Page Match helps eligible readers move between physical or digital text and audiobook listening positions, with expanded page-number support.', 'Show format-aware book discovery without claiming that MatchApp Ai synchronizes reading positions.', ARRAY['Spotify Page Match','switch from book to audiobook','Spotify audiobook page numbers','Spotify Page Match feature' ]::text[], 'https://newsroom.spotify.com/2026-10-07/audiobooks-global-expansion/', '2026-10-21'::date),
 ('spotify', 'taste-profile-beta', 'Taste Profile beta for personalized listening', 'discovery', '2026-09-23'::date, 'limited_beta', 'Spotify Premium users aged 18 or older in the United States during the announced beta.', ARRAY['US' ]::text[], 'Taste Profile beta lets eligible listeners view and guide Spotify''s interpretation of their interests across music, podcasts and audiobooks.', 'MatchApp Ai maintains its own explicit mood and format preferences; it does not access Spotify''s private taste profile.', ARRAY['Spotify Taste Profile 2026','personalized music discovery','Spotify taste controls','Spotify podcast recommendations' ]::text[], 'https://newsroom.spotify.com/2026-09-23/taste-profile-shape-home-feed/', '2026-10-21'::date),
 ('spotify', 'prompted-playlist-audiobooks', 'Prompted Playlist for audiobooks', 'audiobooks', '2026-08-11'::date, 'limited_beta', 'Eligible Spotify Premium users in the United States, Canada, United Kingdom, Ireland, Australia, New Zealand and Sweden; beta restrictions apply.', ARRAY['US','CA','GB','IE','AU','NZ','SE' ]::text[], 'Listeners can describe the audiobooks they want and receive a personalized audiobook playlist within Spotify, with optional automatic refresh.', 'MatchApp Ai can independently recommend book ideas while respecting exact edition, country and rights verification.', ARRAY['Spotify prompted audiobook playlist','AI audiobook discovery','audiobooks by mood','personalized audiobook recommendations' ]::text[], 'https://newsroom.spotify.com/2026-08-11/audiobook-new-expanded-features/', '2026-10-21'::date),
 ('spotify', 'talk-to-spotify', 'Talk to Spotify conversational discovery', 'discovery', '2026-07-14'::date, 'limited_beta', 'Spotify Premium subscribers aged 18 or older in the United States, Ireland and Sweden; English-language experience in the announced rollout.', ARRAY['US','IE','SE' ]::text[], 'Eligible Spotify listeners can type or speak follow-up questions within Spotify to explore music, podcasts and audiobooks.', 'MatchApp Ai''s separate entertainment assistant does not control Spotify playback or account actions.', ARRAY['Talk to Spotify AI','Spotify conversational discovery','ask Spotify about podcasts','Spotify audiobook questions' ]::text[], 'https://newsroom.spotify.com/2026-07-14/talk-to-spotify-announcement-beta/', '2026-10-21'::date),
 ('spotify', 'prompted-playlist-podcasts', 'Prompted Playlist for podcasts', 'podcasts', '2026-04-07'::date, 'limited_beta', 'Spotify Premium users in the United States, Canada, United Kingdom, Ireland, Australia, New Zealand and Sweden; English-language beta.', ARRAY['US','CA','GB','IE','AU','NZ','SE' ]::text[], 'Spotify expanded prompted playlists to podcast discovery, allowing eligible users to describe subjects and topics they want to hear about.', 'MatchApp Ai can surface original topic-based listening suggestions without claiming it generates Spotify-hosted playlists.', ARRAY['Spotify prompted podcast playlist','podcast discovery by topic','podcast recommendations AI','find new podcasts' ]::text[], 'https://newsroom.spotify.com/2026-04-07/prompted-playlist-for-podcasts-launch/', '2026-10-21'::date),
 ('spotify', 'prompted-playlist-music', 'Prompted Playlist for music', 'music', '2026-02-23'::date, 'limited_beta', 'Spotify Premium beta; the February expansion included the United Kingdom, Ireland, Australia and Sweden, with availability changing by market.', ARRAY['GB','IE','AU','SE' ]::text[], 'Spotify''s Prompted Playlist helps eligible listeners turn natural-language music moods, moments or activities into tailored playlists.', 'MatchApp Ai can assist with mood and genre discovery; playlists are created and managed by Spotify itself.', ARRAY['Spotify prompted playlist','music playlist by mood','Spotify AI playlist discovery','music recommendations for activities' ]::text[], 'https://newsroom.spotify.com/2026-02-23/prompted-playlist-prompts-to-try/', '2026-10-21'::date)
ON CONFLICT (platform, feature_id) DO UPDATE SET
 title = excluded.title, category = excluded.category, announced_on = excluded.announced_on,
 rollout_status = excluded.rollout_status, eligibility = excluded.eligibility,
 market_codes = excluded.market_codes, summary = excluded.summary,
 matchapp_relevance = excluded.matchapp_relevance, keyword_phrases = excluded.keyword_phrases,
 source_url = excluded.source_url, reviewed_on = excluded.reviewed_on,
 updated_at = now();
