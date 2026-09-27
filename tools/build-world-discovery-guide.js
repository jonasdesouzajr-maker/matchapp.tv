#!/usr/bin/env node
'use strict';
// A single substantive multilingual guide, not 14 near-duplicate doorway URLs.
// Verified local URLs and genuine translated search phrases; no fabricated hreflang.
const fs=require('node:fs');
const path=require('node:path');
const LANGUAGES=[
  {
    "code": "en",
    "label": "English",
    "watch": "What should I watch tonight?",
    "mood": "Find movies and series that fit my mood",
    "books": "Where can I find e-books and verified audiobooks?",
    "description": "Pick a mood and format, then ask MatchApp for a recommendation. Check provider links in your own country before opening a streaming or book store."
  },
  {
    "code": "pt-BR",
    "label": "Português (Brasil)",
    "watch": "O que assistir hoje à noite?",
    "mood": "Filmes e séries para o meu humor",
    "books": "Onde encontrar e-books e audiolivros verificados?",
    "description": "Escolha seu humor e o formato que prefere. Peça uma recomendação ao MatchApp e confira a disponibilidade na sua região antes de abrir uma loja ou plataforma."
  },
  {
    "code": "es",
    "label": "Español",
    "watch": "¿Qué ver esta noche?",
    "mood": "Películas y series según mi estado de ánimo",
    "books": "¿Dónde encontrar libros electrónicos y audiolibros verificados?",
    "description": "Elige cómo te sientes y el formato que buscas. Pide una recomendación a MatchApp y comprueba la disponibilidad en tu país."
  },
  {
    "code": "fr",
    "label": "Français",
    "watch": "Que regarder ce soir ?",
    "mood": "Films et séries selon mon humeur",
    "books": "Où trouver des livres numériques et des livres audio vérifiés ?",
    "description": "Choisissez votre humeur et le format souhaité. Demandez une recommandation à MatchApp et vérifiez les services disponibles dans votre pays."
  },
  {
    "code": "de",
    "label": "Deutsch",
    "watch": "Was soll ich heute Abend schauen?",
    "mood": "Filme und Serien passend zu meiner Stimmung",
    "books": "Wo finde ich E-Books und verifizierte Hörbücher?",
    "description": "Wählen Sie Ihre Stimmung und das gewünschte Format. Fragen Sie MatchApp nach einem Vorschlag und prüfen Sie die Verfügbarkeit in Ihrem Land."
  },
  {
    "code": "it",
    "label": "Italiano",
    "watch": "Cosa guardare stasera?",
    "mood": "Film e serie TV in base al mio umore",
    "books": "Dove trovare e-book e audiolibri verificati?",
    "description": "Scegli il tuo umore e il formato che preferisci. Chiedi un consiglio a MatchApp e verifica la disponibilità nel tuo Paese."
  },
  {
    "code": "tr",
    "label": "Türkçe",
    "watch": "Bu akşam ne izlemeli?",
    "mood": "Ruh halime uygun film ve diziler",
    "books": "E-kitaplar ve doğrulanmış sesli kitaplar nerede bulunur?",
    "description": "Ruh halinizi ve istediğiniz formatı seçin. MatchApp'ten öneri isteyin ve ülkenizdeki hizmetleri kontrol edin."
  },
  {
    "code": "ru",
    "label": "Русский",
    "watch": "Что посмотреть сегодня вечером?",
    "mood": "Фильмы и сериалы под моё настроение",
    "books": "Где найти электронные и проверенные аудиокниги?",
    "description": "Выберите настроение и формат. Попросите MatchApp подобрать вариант и проверьте доступность сервисов в своей стране."
  },
  {
    "code": "ar",
    "label": "العربية",
    "watch": "ماذا أشاهد الليلة؟",
    "mood": "أفلام ومسلسلات تناسب مزاجي",
    "books": "أين أجد الكتب الإلكترونية والكتب الصوتية الموثوقة؟",
    "description": "اختر مزاجك ونوع المحتوى، ثم اطلب اقتراحًا من MatchApp وتحقق من توفر الخدمة في بلدك."
  },
  {
    "code": "hi",
    "label": "हिन्दी",
    "watch": "आज रात क्या देखें?",
    "mood": "मूड के हिसाब से फ़िल्में और सीरीज़",
    "books": "ई-बुक्स और सत्यापित ऑडियोबुक कहाँ मिलेंगी?",
    "description": "अपना मूड और फ़ॉर्मैट चुनें, फिर MatchApp से सुझाव लें। अपने देश में स्ट्रीमिंग या बुक स्टोर की उपलब्धता जाँचें।"
  },
  {
    "code": "id",
    "label": "Bahasa Indonesia",
    "watch": "Mau nonton apa malam ini?",
    "mood": "Film dan serial sesuai suasana hati",
    "books": "Di mana menemukan e-book dan buku audio terverifikasi?",
    "description": "Pilih suasana hati dan format yang Anda suka, lalu minta rekomendasi MatchApp. Periksa ketersediaan layanan di negara Anda."
  },
  {
    "code": "ja",
    "label": "日本語",
    "watch": "今夜は何を観る？",
    "mood": "気分に合う映画やドラマを探す",
    "books": "電子書籍や確認済みのオーディオブックはどこで探せる？",
    "description": "気分と作品の形式を選び、MatchAppにおすすめを聞いてください。視聴や購入の前に、お住まいの国で利用できるサービスを確認しましょう。"
  },
  {
    "code": "ko",
    "label": "한국어",
    "watch": "오늘 밤 뭐 볼까?",
    "mood": "기분에 맞는 영화와 시리즈 찾기",
    "books": "전자책과 확인된 오디오북은 어디에서 찾을까?",
    "description": "기분과 콘텐츠 형식을 선택하고 MatchApp에 추천을 요청하세요. 시청이나 구매 전에 거주 국가에서의 서비스 제공 여부를 확인하세요."
  },
  {
    "code": "zh",
    "label": "简体中文",
    "watch": "今晚看什么？",
    "mood": "按心情寻找电影和剧集",
    "books": "在哪里寻找电子书和经过核实的有声书？",
    "description": "选择心情和内容类型，向 MatchApp 寻求推荐。观看或购买前，请确认所在国家或地区的服务可用性。"
  }
];
const render=function render(data){
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const SITE="https://matchapp.tv",url=SITE+"/guides/worldwide-entertainment-discovery/";
const link=(href,label)=>`<a href="${esc(href)}">${esc(label)}</a>`;
const sections=data.map(r=>`<section class="lang-card" id="lang-${esc(r.code.toLowerCase().replace("-","-"))}" lang="${esc(r.code)}"${r.code==="ar"?' dir="rtl"':""}><h2>${esc(r.label)}</h2><p>${esc(r.description)}</p><h3>${esc(r.watch)}</h3><ul><li>${esc(r.mood)}</li><li>${esc(r.books)}</li></ul><p>${link("/?lang="+encodeURIComponent(r.code),r.code==="en"?"Explore MatchApp in English":r.watch+" →")}</p></section>`).join("\n");
const ld={"@context":"https://schema.org","@graph":[{"@type":"WebPage","name":"Worldwide movie, series, e-book and audiobook discovery in 14 languages","description":"A practical guide to MatchApp's entertainment discovery categories, localized search prompts and regional publisher links.","url":url,"inLanguage":"en","about":[{"@type":"Thing","name":"Movies and TV by mood"},{"@type":"Thing","name":"E-books and verified audiobooks"},{"@type":"Thing","name":"Streaming availability by country"}],"isPartOf":{"@type":"WebSite","url":SITE+"/","name":"MatchApp TV Ai","alternateName":["MatchApp","MatchApp.tv"]}},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"MatchApp TV Ai","item":SITE+"/"},{"@type":"ListItem","position":2,"name":"Worldwide entertainment discovery","item":url}]}]};
return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>What to Watch or Read Worldwide | MatchApp Ai</title>
<meta name="description" content="Find movies, series, books and audiobooks by mood with MatchApp Ai. Search in 14 languages; explore curated guides for Brazil, Mexico, India and more.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="MatchApp TV Ai">
<meta property="og:url" content="${url}"><meta property="og:title" content="Worldwide Entertainment Discovery | MatchApp Ai">
<meta property="og:description" content="Learn how to find movies, series, books and audiobooks by mood in 14 languages, and browse regional entertainment guides.">
<meta property="og:image" content="${SITE}/assets/brand/matchapp-official-icon-512.webp">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#100d1a">
<link rel="icon" href="/assets/brand/matchapp-favicon-32.png" type="image/png">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g,"\\u003c")}</script>
<style>
:root{font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#ece4f3;background:#100d1a}
*{box-sizing:border-box}body{margin:0;line-height:1.6}a{color:#f0d18f;text-underline-offset:3px}
a:focus-visible{outline:2px solid #fff;outline-offset:3px;border-radius:3px}
header,main,footer{max-width:1040px;margin:auto;padding:22px 20px}header{padding-top:46px}
.brand{font-weight:850;letter-spacing:.02em;font-size:1.1rem}h1{color:#f1d696;font-size:clamp(2rem,4.3vw,3rem);line-height:1.16;margin:28px 0 12px}h2{color:#eac882}
.eyebrow{color:#c6a7ec;font-size:.77rem;letter-spacing:.14em;text-transform:uppercase;font-weight:800}
.intro{max-width:810px;font-size:1.14rem;color:#d3c7df}
.route-grid,.lang-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,285px),1fr));gap:14px}
.route,.lang-card{border:1px solid #57456f;background:linear-gradient(145deg,#201731,#17111f);border-radius:16px;padding:17px}
.route h3,.lang-card h3{color:#edd9a8;margin:.2rem 0}.route p,.lang-card p{color:#ded5e7;margin:.4rem 0}
.lang-card h2{margin:0 0 .5rem;font-size:1.2rem}
.lang-card h3{font-size:1rem}.lang-card ul{padding-inline-start:21px;margin:.5rem 0}
nav{margin:20px 0 34px}.links{display:flex;flex-wrap:wrap;gap:13px}
section{margin:25px 0}.note{border-left:3px solid #d1ae67;padding-left:15px;color:#cec4da}
footer{border-top:1px solid #453551;margin-top:35px;font-size:.9rem}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
</style><link rel="stylesheet" href="/brand.css?v=192">
</head>
<body>
<div class="matchapp-brand-bar"><a class="matchapp-brand-link" href="/" aria-label="MatchApp TV Ai"><img class="matchapp-wordmark" src="/assets/brand/matchapp-tv-ai-v2.svg" alt="MatchApp TV Ai" width="368" height="66" decoding="async"></a></div>
<header><div class="brand">${link("/","✦ MatchApp Ai")}</div><p class="eyebrow">A practical worldwide discovery guide</p>
<h1>What to watch, read or listen to — in your language</h1>
<p class="intro">Choose your mood and what you want to enjoy: a movie, a series, a book, an audiobook, a magazine, music or a podcast. MatchApp’s interface supports 14 languages and helps you explore entertainment from multiple countries. Content and store availability vary by region; always confirm with the linked publisher or provider.</p>
<nav class="links" aria-label="Jump to discovery categories">
${link("/","Find what to watch")} ${link("/ebooks/","Match e-books and audiobooks")}
${link("/discover.html","Ask AI")} ${link("/news/","Latest news")} ${link("/events-archive.html","Global events")}
</nav></header>
<main>
<section aria-labelledby="ways"><h2 id="ways">Start with the kind of recommendation you need</h2>
<div class="route-grid">
<article class="route"><h3>Movies and series by mood</h3><p>Looking for a cozy comedy, a thrilling film or a romantic series? Choose your mood and preferred format before deciding where to watch.</p>
<p>${link("/moods/cozy-comfort-watch/","Comfort-watch recommendations")} · ${link("/moods/funny/","Funny movies and series")} · ${link("/platforms/netflix/","Browse Netflix-oriented picks")}</p></article>
<article class="route"><h3>Books and audiobooks</h3><p>Match e-books by mood and genre. Audiobook links are checked against title and author where supported; search-only store suggestions are not proof that an exact audio edition exists.</p>
<p>${link("/ebooks/","Find your next e-book or audiobook")} · ${link("/guides/books-september-2026/","September book guide")}</p></article>
<article class="route"><h3>Music, podcasts and current stories</h3><p>Explore music and podcasts or browse the current news hub. Trending headlines link to named publishers; MatchApp does not replace the original article.</p>
<p>${link("/platforms/spotify/","Music and podcasts")} · ${link("/guides/global-music-september-2026/","September global music guide")} · ${link("/news/","Latest sourced headlines")}</p></article>
</div></section>
<section aria-labelledby="regions"><h2 id="regions">Explore by region — and verify availability locally</h2>
<p>These editorial routes introduce titles and cultural trends without promising every work is available on every platform or in every country. Your region determines which stores and streaming providers may be offered.</p>
<div class="route-grid">
<article class="route"><h3>Brazil / Brasil</h3><p>Filmes, séries, música e notícias em português.</p>${link("/guides/filmes-series-em-alta-brasil-setembro-2026/","Brazilian entertainment guide")}</article>
<article class="route"><h3>Mexico / México</h3><p>Películas, series y entretenimiento para explorar en español.</p>${link("/guides/peliculas-series-tendencia-mexico-septiembre-2026/","Mexico entertainment guide")} · ${link("/collections/mexican-series-films/","Mexican film and series collection")}</article>
<article class="route"><h3>India / भारत</h3><p>Explore Indian cinema, Bollywood and Indian series, then check providers in your market.</p>${link("/collections/indian-cinema/","Indian cinema collection")}</article>
</div></section>
<section aria-labelledby="languages"><h2 id="languages">Try a question in any supported language</h2>
<p>These are useful example searches, not separate translated copies of this page. Select your language and ask naturally; results depend on source coverage and regional availability.</p>
<div class="lang-grid">${sections}</div></section>
<section aria-labelledby="questions"><h2 id="questions">Before you choose a title</h2>
<h3>Can I find what to watch tonight in my country?</h3><p>Start with a mood, format and streaming preference. When MatchApp offers a viewing link, check that the provider serves your location and that the title is still available.</p>
<h3>Can I find the exact audiobook edition?</h3><p>Where an exact title-and-author match is independently verified, MatchApp labels the edition accordingly. Otherwise, search links help you investigate without claiming the audiobook was verified.</p>
<h3>Is every trending headline an original MatchApp report?</h3><p>No. The news hub organizes updates from named publishers and sends you to their original reporting. Standalone short source summaries are not treated as original reporting pages.</p>
<p class="note">Language preference changes MatchApp’s interface; it does not create separate indexable translations of the same URL. Country-specific availability, catalogs and rankings can change at any time.</p>
</section></main>
<footer>${link("/","MatchApp Ai")} · ${link("/discover.html","Ask AI")} · ${link("/ebooks/","Books & audiobooks")} · ${link("/pricing/pricing.html","Plans")}</footer>
</body></html>
`;
};
const out=path.join(__dirname,'..','guides','worldwide-entertainment-discovery','index.html');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,render(LANGUAGES),'utf8');
console.log('[seo] worldwide guide: '+LANGUAGES.length+' supported languages, 1 canonical page');
