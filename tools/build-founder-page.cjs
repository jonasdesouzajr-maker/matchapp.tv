'use strict';
const fs=require('node:fs'),path=require('node:path');
const {cinemaAssets}=require('./finalize-brand.js');
const support=require('../patches/reference-support.js');
const root=path.resolve(__dirname,'..'),source=require('../data/founder-copy.json'),seo=require('../data/search-page-copy.json');
const copy=Object.fromEntries(Object.entries(source).map(([lang,t])=>[lang,{...t,seoTitle:seo[lang][0]}]));
const t={...copy.en,...support.founder.en};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pillType={h2:"title",h3:"title",p:"copy",li:"copy",figcaption:"caption"};
const text=(tag,key,cls='')=>`<${tag}${cls?` class="${cls}"`:''} data-ma-text-pill="${pillType[tag]}" data-founder="${key}">${esc(t[key])}</${tag}>`;
const projects = [
  {id:'matchapp', name:'MatchApp Ai', intro:'matchappIntro', url:'/', action:'openApp', icon:'/assets/brand/matchapp-ai-icon-192.png', shot:'/assets/founder/matchapp-matcher.jpg', width:1120, height:630},
  {id:'lumina', name:'Lumina Match', intro:'luminaIntro', url:'/lumina-match/', action:'playBrowser', icon:'/reelforge/email/lumina_icon.jpg', shot:'/lumina-match/lumina-gameplay-1200x630.jpg', width:1200, height:630},
  {id:'reelforge', name:'ReelForge: Cinema Clash', intro:'reelIntro', url:'/reelforge/email/reelforge_feature.jpg', icon:'/reelforge/email/reelforge_icon.jpg', shot:'/reelforge/email/reelforge_shot1.jpg', width:540, height:304}
];
function projectCard(project) {
  const {id, name, intro, url, action, icon, shot, width, height} = project;
  return `<section class="mf-project mf-card" id="${id}" aria-labelledby="${id}-title">
    <h3 id="${id}-title"><a class="mf-pill mf-project-name" href="${url}"><img alt="" width="36" height="36" loading="lazy" src="${icon}"><span translate="no" dir="auto">${name}</span></a></h3>
    <a class="mf-shot" href="${shot}" aria-labelledby="${id}-view ${id}-title"><img src="${shot}" alt="" width="${width}" height="${height}" decoding="async" loading="lazy"><span class="mf-shot-caption" data-ma-pill-exclude id="${id}-view" data-founder="showShot">${esc(t.showShot)}</span></a>
    ${text('p',intro,'mf-project-intro')}
    <div class="mf-project-actions">${action ? `<a class="mf-pill" href="${url}" data-founder="${action}">${esc(t[action])}</a>` : ''}
    ${id === 'matchapp' ? '' : `<a class="mf-pill" href="#closed-testing" data-test-app="${id}" data-founder="joinTesting">${esc(t.joinTesting)}</a>`}</div>
  </section>`;
}
const url='https://matchapp.tv/founder/',portrait='https://matchapp.tv/assets/founder/jonas-junior-office-960.webp';
const schema={'@context':'https://schema.org','@graph':[{'@type':'ProfilePage','@id':url+'#page',url,name:t.heading,description:t.pageDesc,inLanguage:'en',dateCreated:'2026-10-16T09:29:24Z',dateModified:'2026-10-31T10:45:00Z',mainEntity:{'@type':'Person','@id':url+'#jonas-junior',name:'Jonas Junior',url,image:portrait,jobTitle:'Founder and software engineer',description:'Independent creator of MatchApp Ai, with a background in programming, digital marketing and SEO.'},isPartOf:{'@type':'WebSite',name:'MatchApp Ai',url:'https://matchapp.tv/'}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'MatchApp Ai',item:'https://matchapp.tv/'},{'@type':'ListItem',position:2,name:t.title,item:url}]}]};
schema['@graph'][0].mentions = projects.map(({name,id,shot})=>({'@type':'SoftwareApplication',name,url:url+'#'+id,screenshot:'https://matchapp.tv'+shot,creator:{'@id':url+'#jonas-junior'}}));
const head=fs.readFileSync(path.join(root,'about.html'),'utf8').match(/<head>([\s\S]*?)<\/head>/)[1];
const analytics=head.match(/<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/)[0];
const shared=head.match(/<link[^>]+rel="stylesheet"[^>]*>/g).join('\n');
const body=cinemaAssets(`<!doctype html>
<html lang="en"><head>
${analytics}
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t.seoTitle)}</title><meta name="description" content="${esc(t.pageDesc)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}">
<meta property="og:type" content="profile"><meta property="og:site_name" content="MatchApp Ai"><meta property="og:title" content="${esc(t.seoTitle)}"><meta property="og:description" content="${esc(t.pageDesc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${portrait}"><meta property="og:image:width" content="960"><meta property="og:image:height" content="1200"><meta property="og:image:alt" content="${esc(t.alt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(t.seoTitle)}"><meta name="twitter:description" content="${esc(t.pageDesc)}"><meta name="twitter:image" content="${portrait}"><meta name="twitter:image:alt" content="${esc(t.alt)}"><meta name="author" content="Jonas Junior">
<link rel="icon" href="/assets/brand/matchapp-ai-favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/assets/brand/matchapp-ai-favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/matchapp-ai-favicon-32.png">
<link rel="icon" type="image/png" sizes="48x48" href="/assets/brand/matchapp-ai-favicon-48.png">
${shared}
<link rel="stylesheet" href="/patches/founder-page.css?v=20261031-projects1">
<link rel="stylesheet" href="/patches/reference-support.css?v=20261020-support1&polish=20261020-ui1&compact=20261020-1&footer=20261025-1&compactfooter=20261027-1&amp;studio=20261031-1">
<script type="application/ld+json" id="founder-schema">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>
<script src="/i18n.js?v=20261016-founder1&amp;billing=20261017-2&amp;polish=20261020-ui1"></script>
</head><body class="ma-founder-page">
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-M7J3NNBN" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<a class="mf-skip" href="#founder-story" data-founder="skip">${esc(t.skip)}</a>
<header class="app-header" id="ma-founder-header"><a class="matchapp-brand-link" href="/" aria-label="MatchApp Ai"><img src="/assets/brand/matchapp-ai-mark.svg?v=20261022-vector1" width="50" height="50" alt="MatchApp Ai" class="ma-brand-orb"></a></header>
<main class="mf-wrap" id="founder-story">
<div class="mf-utility"><nav aria-label="MatchApp Ai"><a class="mf-pill" href="/" data-founder="home">${t.home}</a><span aria-hidden="true">/</span><span data-ma-text-pill="label" data-founder="title" aria-current="page">${t.title}</span></nav><div id="lang-switcher-host"></div></div>
<article>
<section class="mf-hero mf-card" aria-labelledby="founder-heading"><div class="mf-hero-copy">${text('p','kicker','mf-kicker')}<h1 data-ma-text-pill="title" id="founder-heading" data-founder="heading">${t.heading}</h1>${text('p','role','mf-role')}${text('p','lede','mf-lede')}<a class="mf-pill" href="#help" data-founder="helpHeading">${t.helpHeading}</a></div><figure class="mf-portrait"><img id="founder-portrait" src="/assets/founder/jonas-junior-office-960.webp" srcset="/assets/founder/jonas-junior-office-480.webp 480w, /assets/founder/jonas-junior-office-960.webp 960w" sizes="(max-width: 700px) 90vw, 440px" width="960" height="1200" alt="${esc(t.alt)}" fetchpriority="high" decoding="async">${text('figcaption','caption')}</figure></section>
${[['originHeading','origin','spark'],['learningHeading','learning','craft'],['buildHeading','build','mission']].map(([heading,a,b],i)=>`<section class="mf-story mf-card"><div><span class="mf-number" aria-hidden="true">0${i+1}</span>${text('h2',heading)}</div><div>${text('p',a)}${text('p',b)}</div></section>`).join('\n')}
<section class="mf-projects" id="projects" aria-labelledby="project-heading"><h2 data-ma-text-pill="title" id="project-heading" data-founder="projects">${esc(t.projects)}</h2><div class="mf-project-grid">${projects.map(projectCard).join('\n')}</div></section>
<blockquote class="mf-quote">${text('p','quote')}</blockquote>
<section class="mf-help" id="help" aria-labelledby="help-heading"><header><h2 data-ma-text-pill="title" id="help-heading" data-founder="helpHeading">${t.helpHeading}</h2>${text('p','helpIntro')}</header><div class="mf-help-grid"><section class="mf-card">${text('h3','testHeading')}${text('p','testText')}<ol>${['step1','step2','step3'].map(k=>text('li',k)).join('')}</ol><a class="mf-pill" id="founder-email" href="mailto:support@matchapp.tv?subject=${encodeURIComponent(t.emailSubject)}" data-founder="email">${t.email}</a>${text('p','emailNote','mf-note')}<a class="mf-email mf-pill" href="mailto:support@matchapp.tv">support@matchapp.tv</a></section><section class="mf-card">${text('h3','supportHeading')}${text('p','founderAsk')}<form class="mf-contribution" method="post" action="https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/founder-support">
  <label for="founder-amount" data-ma-text-pill="label" data-founder="amountLabel">${esc(t.amountLabel)}</label>
  <div class="mf-amount-row"><span aria-hidden="true" translate="no">USD</span><input id="founder-amount" name="amount" type="number" inputmode="decimal" min="30" step="0.01" value="30" required></div>
  <input type="hidden" name="lang" value="en"><button type="submit" class="mf-pill" data-founder="supportButton">${esc(t.supportButton)}</button>
  <p id="founder-checkout-message" role="status" class="mf-note" hidden></p>
</form>${text('p','supportNote','mf-note')}</section></div></section>
${require('./founder-testing.cjs').render()}
<section class="mf-closing mf-card">${text('h2','closingHeading')}${text('p','closing')}${text('p','byline','mf-byline')}</section>
</article>
<footer class="mf-footer ma-legal-bar"><nav aria-label="MatchApp Ai">${Object.entries({home:'/',about:'/about.html',contact:'/contact.html',privacy:'/privacy.html',terms:'/terms.html',cookies:'/cookies.html',copyright:'/copyright.html'}).map(([k,href])=>`<a class="mf-pill" href="${href}" data-founder="${k}">${esc(t[k])}</a>`).join('')}</nav><p>© 2026 MatchApp Ai</p>${text('p','rights','mf-note')}</footer>
</main>
<script src="/settings.js?v=20260924-runtime1&posters=20261020-1&dialogs=20261020-1&accountphoto=20261020-1&brandlocale=20261020-1&androidqa=20261021-1&perf=20261027-1&amp;errors=20261027-2"></script><script defer src="/poster-wall.js?v=20260922-global1&posters=20261020-1&ui=20261024-1" data-page-shell="wall"></script><script defer src="/page-shell.js?v=20261011-brandlock1&amp;approvedlogo=20261014" data-page-shell="1"></script><script defer src="/brand-lock-20261011.js?v=20261011-a1"></script><script defer src="/patches/donate-shortcut.js?v=20261031-growth1"></script><script defer src="/patches/jonas-adult-page.js?v=header20261018-1&resize=20261022-1&stellar=20261020-1&headerface=20261020-1&ui=20261024-1"></script><script defer src="/patches/immersive-feedback-20261014.js?v=immersive1&amp;dock=20261020-1&amp;cinemasound=20261020-1"></script><script src="/patches/founder-copy.js?v=20261031-projects1"></script><script defer src="/patches/founder-page.js?v=20261031-projects1"></script>
<script defer src="/patches/reference-support.js?v=20261031-growth1&polish=20261020-ui1&compact=20261020-1&footer=20261020-1&compactfooter=20261027-1"></script>
</body></html>\n`,'founder/index.html');
fs.mkdirSync(path.join(root,'founder'),{recursive:true});fs.writeFileSync(path.join(root,'founder/index.html'),body);
fs.writeFileSync(path.join(root,'patches/founder-copy.js'),'/* Authored translations. Source: data/founder-copy.json. */\nwindow.MATCHAPP_FOUNDER_COPY='+JSON.stringify(copy).replace(/</g,'\\u003c')+';\n');
console.log('Built founder page and '+Object.keys(copy).length+' authored languages.');