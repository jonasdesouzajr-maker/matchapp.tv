#!/usr/bin/env node
'use strict';

// Metadata for existing adult discovery pages. Never edits page bodies,
// availability records, ratings, canonicals, language routing or UI.
// Reviewed 2026-09-30 using settled Search Console queries, Netflix Tudum
// (week of September 21), and YouTube's September Culture & Trends report.
// These are relevant discovery intents, not measured keyword-volume claims.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const pages = {};
function page(file, title, description, keywords) {
  pages[file] = { title, description, keywords: keywords.split(', ').filter(Boolean) };
}
page('index.html', 'What to Watch Tonight & Where to Stream | MatchApp Ai',
  'Find what to watch and where to stream with AI; share a match with friends. Explore UK, Canada, Japan and Australia picks plus global entertainment.',
  'what to watch tonight, where to watch, AI streaming concierge, latest streaming releases, AI movie recommendations, TV series recommendations, movies by mood, shows like my favorites, Match Together recommendations, date night movies, anime streaming guide, K-drama streaming guide, telenovelas, documentaries, cinema showtimes, streaming watchlist, multilingual voice search, o que assistir hoje, onde assistir, British TV series, UK streaming guide, Absolutely Fabulous BBC, Absolutely Fabulous complete series, Slow Horses, Black Mirror, Canadian TV series, Canada streaming guide, Schitt\'s Creek, North of North, Shoresy, Letterkenny, Murdoch Mysteries, Japanese TV series, Japanese drama streaming, 日本ドラマ, 今際の国のアリス, イクサガミ, ゴールデンカムイ 網走監獄襲撃編, Australian TV series, Australia streaming guide, Heartbreak High, The Survivors Australia, The Narrow Road to the Deep North series');
page('discover.html', 'Ask AI What to Watch, Read or Listen To | MatchApp Ai',
  'Ask AI what to watch, read or hear: movies, anime, K-dramas, books, verified audiobooks and magazines, with regional streaming and official source links.',
  'ask AI what to watch, voice entertainment search, movies like my favorites, anime recommendation AI, K-drama finder, book recommendation AI, audiobook recommendations, podcast discovery, perguntar à IA o que assistir');
page('ebooks/index.html', 'Book Recommendations AI: E-books & Audiobooks | MatchApp Ai',
  'Find your next e-book, verified audiobook or magazine by mood and genre, with original covers, official publishers and legal reading or listening sources.',
  'AI ebook matcher, AI book recommendations, what book should I read next, books by mood, fantasy books, romance books, verified audiobook recommendations, legal free ebooks, public domain audiobooks, magazines by topic, o que ler agora, audiolivros, recomendações de livros');
page('cooking/index.html', 'Cooking Channels & Recipe Videos with AI | MatchApp Ai',
  'Find original recipe videos from Maangchi, Jamie Oliver, Rita Lobo and Chef John. Explore Korean and Brazilian cooking, and ask AI about techniques.',
  'original cooking channels, recipe videos, Korean cooking, Brazilian recipes, Maangchi recipes, Jamie Oliver recipes, Rita Lobo Panelinha, Food Wishes Chef John, receitas em vídeo, canais de culinária');
page('anime.html', 'What Anime to Watch & Where to Stream | MatchApp Ai',
  'Find anime movies and series by mood, genre and streaming service. Explore anime recommendations and ask MatchApp Ai what to watch next.',
  'what anime should I watch, anime recommendations, where to watch anime, anime finder, Japanese animation, anime para assistir, onde assistir anime');
page('together.html', 'Match Together: What to Watch as a Couple | MatchApp Ai',
  'Choose what to watch together: combine two moods for a movie, series, anime or K-drama match. Invite a partner or friend with a shared session link.',
  'match together, what to watch together, movies for couples, date night movies, shared movie recommendations, watch with friends, o que assistir em casal');
page('platforms/netflix/index.html', 'What to Watch on Netflix by Mood | MatchApp Ai',
  'Explore curated Netflix movies and series, then ask AI for a match by mood and genre. Check viewing options for your country before streaming.',
  'what to watch on Netflix, Netflix movie recommendations, Netflix series recommendations, Netflix recommendations by mood, o que assistir na Netflix');
page('platforms/plus-sbt/index.html', '+SBT: Catálogo, Novelas, Séries e Filmes Grátis | MatchApp Ai',
  'Explore o catálogo atual do +SBT com novelas, séries, animes, infantis, programas e filmes grátis. Abra títulos no streaming oficial e descubra o que assistir.',
  '+SBT, catálogo +SBT, SBT streaming, streaming grátis Brasil, onde assistir SBT online, novelas SBT online, séries +SBT, filmes +SBT, desenhos +SBT, anime +SBT, assistir +SBT grátis, o que assistir no +SBT, catálogo de novelas +SBT, onde assistir A Usurpadora online, onde assistir Chiquititas 2013, A Caverna Encantada streaming, Doctor Who +SBT, Kamisama Kiss +SBT, Guerreiras Mágicas de Rayearth +SBT, Silvio Santos streaming, Geração Chiquititas +SBT');
page('platforms/youtube/index.html', 'YouTube Channels & Videos to Watch | MatchApp Ai',
  'Discover curated YouTube creators and videos across entertainment, music and more. Explore channels and ask AI for a recommendation by topic.',
  'what to watch on YouTube, YouTube creator discovery, YouTube channel recommendations, music videos, video podcasts, canais do YouTube');
page('platforms/spotify/index.html', 'Spotify Music & Podcast Recommendations | MatchApp Ai',
  'Explore curated Spotify music and podcasts for your mood. Discover listening ideas and ask MatchApp Ai for a topic-focused recommendation.',
  'Spotify music discovery, podcast recommendations, what podcast should I listen to, music by mood, Spotify playlists, podcasts para ouvir');
page('collections/movie/index.html', 'Movie Recommendations: What to Watch Tonight | MatchApp Ai',
  'Browse curated movies across comedy, romance, drama and more. Find a film for tonight and ask AI to match your mood, genre and viewing preferences.',
  'movie recommendations, what movie should I watch, movies by mood, films to watch tonight, indicações de filmes');
page('collections/series/index.html', 'TV Series Recommendations & Binge-Worthy Shows | MatchApp Ai',
  'Explore curated TV series, from comedy to drama. Find your next binge-watch and ask AI to recommend a show for your mood and viewing preferences.',
  'TV series recommendations, binge-worthy shows, what series should I watch, shows like my favorites, séries para maratonar');
page('collections/k-drama/index.html', 'K-Drama Recommendations: Korean Series to Watch | MatchApp Ai',
  'Discover curated Korean dramas and ask AI for your next K-drama by mood, genre and taste, from romance to suspense and comfort viewing.',
  'K-drama recommendations, Korean series to watch, romantic K-dramas, what K-drama should I watch, doramas para assistir');
page('collections/documentary/index.html', 'Documentary Recommendations: What to Watch | MatchApp Ai',
  'Explore curated documentaries about real people and stories. Find something informative or inspiring and ask AI for a documentary match.',
  'documentary recommendations, documentaries to watch, documentary finder, inspiring documentaries, documentários para assistir');
page('collections/podcast/index.html', 'Podcast Recommendations: What to Listen To | MatchApp Ai',
  'Find curated podcasts for commutes, downtime and curious listening. Explore conversations and storytelling, then ask AI for your next podcast.',
  'podcast recommendations, podcast discovery, what podcast should I listen to, storytelling podcasts, podcasts para ouvir');
page('collections/youtube-channel/index.html', 'YouTube Creator & Channel Recommendations | MatchApp Ai',
  'Explore curated YouTube creators across entertainment and specialist topics. Find a channel to follow and ask AI for recommendations by interest.',
  'YouTube channel recommendations, creator discovery, channels to follow, entertainment YouTube channels, canais para seguir');
page('collections/youtube-shorts/index.html', 'Short Videos & YouTube Shorts to Discover | MatchApp Ai',
  'Explore curated short-form videos for a quick watch. Discover creators and ask MatchApp Ai for short entertainment that matches your interests.',
  'YouTube Shorts discovery, short-form entertainment, quick videos to watch, short video recommendations');
page('collections/classical-music/index.html', 'Classical Music for Focus, Calm & Discovery | MatchApp Ai',
  'Explore curated classical recordings, performances and channels. Discover music for focus, calm or attentive listening with MatchApp Ai.',
  'classical music discovery, classical music for focus, music for calm, classical performances');
page('collections/gospel-and-faith/index.html', 'Gospel Music & Faith Content to Discover | MatchApp Ai',
  'Explore curated gospel music, teaching and faith stories. Ask MatchApp Ai for recommendations that match your interests and listening mood.',
  'gospel music discovery, faith content, gospel recommendations, música gospel');
const moods = [
  ['cozy-comfort-watch', 'Comfort Movies & Cozy Shows to Watch', 'Find curated comfort watches and gentle stories for a quiet evening. Explore cozy movies and shows, then ask AI for a comforting match.', 'comfort movies, cozy shows, comfort watch, cozy evening movies, filmes confortáveis'],
  ['light-and-feel-good', 'Feel-Good Movies & Light Shows to Watch', 'Find curated feel-good movies and light entertainment for an easy evening. Ask MatchApp Ai for an uplifting pick that fits your taste.', 'feel-good movies, light shows, uplifting movies, filmes leves'],
  ['funny', 'Funny Movies & Comedy Shows to Watch', 'Browse curated comedies, sitcoms and stand-up. Find something funny to watch and ask AI for a comedy recommendation that matches your taste.', 'funny movies, comedy recommendations, sitcoms to watch, filmes de comédia'],
  ['romantic', 'Romantic Movies & K-Dramas for Date Night', 'Explore curated love stories, romantic movies and Korean dramas. Ask AI for a romance match for a date night or a quiet evening.', 'romantic movies, date night movies, romance recommendations, romantic K-dramas, filmes românticos'],
  ['intense-and-thrilling', 'Thriller Movies & Suspense Shows to Watch', 'Explore curated thrillers, crime dramas and survival stories. Ask AI for a tense movie or series that fits your mood and viewing preferences.', 'thriller recommendations, suspense movies, crime drama series, suspense para assistir'],
  ['dark-and-gritty', 'Dark Movies & Gritty Series to Watch', 'Discover curated dark dramas and morally complicated stories. Ask AI for a gritty movie or series that matches your interests.', 'dark movies, gritty series, dark drama recommendations'],
  ['mind-bending', 'Mind-Bending Movies & Mystery Shows', 'Explore curated puzzle plots, unreliable narrators and surprising endings. Ask AI for a mind-bending movie or show that suits your taste.', 'mind-bending movies, plot twist movies, mystery shows, filmes com plot twist'],
  ['heartbreaking', 'Sad Movies & Emotional Stories to Watch', 'Browse curated emotional movies and shows with stories that earn their sadness. Ask AI for a moving watch, then find a comforting follow-up.', 'sad movies, emotional movies, heartbreaking shows, filmes para chorar'],
  ['inspiring', 'Inspiring Movies & Documentaries to Watch', 'Explore curated stories about courage, achievement and real lives. Ask AI for an inspiring movie, drama or documentary to watch next.', 'inspiring movies, uplifting documentaries, inspiring stories'],
  ['nostalgic', 'Nostalgic Movies & Classic Shows to Revisit', 'Rediscover curated movies and shows that take you back. Explore familiar favorites and ask AI for a nostalgic watch from the era you love.', 'nostalgic movies, classic shows, nostalgic TV, filmes nostálgicos'],
  ['epic-and-adventurous', 'Adventure Movies & Epic Stories to Watch', 'Explore curated adventures, big worlds and long journeys. Ask AI for an epic movie or show that fits your mood and viewing preferences.', 'adventure movies, epic movies, adventure series, filmes de aventura']
];
for (const [slug, title, description, keywords] of moods) page(`moods/${slug}/index.html`, `${title} | MatchApp Ai`, description, keywords);
// Exact-title search intents stay with the matching existing guide. Regional
// provider descriptions remain sourced by the availability generator.
for (const [slug, keywords] of [
  ['monster-the-lizzie-borden-story', 'Monster The Lizzie Borden Story where to watch, Monstro A História de Lizzie Borden onde assistir'],
  ['the-gentlemen', 'The Gentlemen where to watch, Magnatas do Crime onde assistir'],
  ['jujutsu-kaisen', 'Jujutsu Kaisen where to watch, Jujutsu Kaisen onde assistir'],
  ['frieren-beyond-journey-s-end', 'Frieren Beyond Journey’s End where to watch, Frieren onde assistir']
]) pages[`where-to-watch/${slug}/index.html`] = { keywords: keywords.split(', ') };

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function enrichMetadata(html, file) {
  const config = pages[file];
  if (!config) return html;
  return html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, head => {
    function meta(key, value, property = false) {
      const attr = property ? 'property' : 'name';
      const pattern = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
      const tag = `<meta ${attr}="${key}" content="${escape(value)}">`;
      head = pattern.test(head) ? head.replace(pattern, tag) : head.replace(/<\/head>/i, `${tag}\n</head>`);
    }
    if (config.title) {
      head = head.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(config.title)}</title>`);
      meta('og:title', config.title, true);
      meta('twitter:title', config.title);
    }
    if (config.description) {
      meta('description', config.description);
      meta('og:description', config.description, true);
      meta('twitter:description', config.description);
    }
    const existing = head.match(/<meta\s+name="keywords"\s+content="([^"]*)"/i)?.[1] || '';
    // Keep the homepage concise; preserve legacy intents on topic pages. Terms are focused
    // on each page's actual content; never insert invisible body text.
    const keywords = [...new Set([...(file === 'index.html' ? [] : existing.split(', ').filter(Boolean)), ...config.keywords])];
    meta('keywords', keywords.join(', '));
    head = head.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi, (all, open, text, close) => {
      const data = JSON.parse(text);
      function update(node) {
        if (!node || typeof node !== 'object') return;
        if (['WebPage', 'CollectionPage'].includes(node['@type'])) {
          if (config.title) node.name = config.title;
          if (config.description) node.description = config.description;
          node.keywords = config.keywords;
          node.dateModified = '2026-09-30';
        }
        if (file === 'index.html' && ['WebSite', 'SoftwareApplication'].includes(node['@type'])) {
          node.keywords = [...new Set([...(node.keywords || []), ...config.keywords])];
        }
        if (node['@graph']) node['@graph'].forEach(update);
      }
      Array.isArray(data) ? data.forEach(update) : update(data);
      return open + JSON.stringify(data) + close;
    });
    return head;
  });
}
function applyFiles(prefix) {
  let count = 0;
  for (const file of Object.keys(pages)) {
    if (prefix && !file.startsWith(prefix)) continue;
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    const original = fs.readFileSync(full, 'utf8');
    const result = enrichMetadata(original, file);
    if (original !== result) { fs.writeFileSync(full, result); count++; }
  }
  return count;
}
module.exports = { pages, enrichMetadata, applyFiles };
if (require.main === module) console.log(`Updated metadata on ${applyFiles()} existing adult pages.`);
