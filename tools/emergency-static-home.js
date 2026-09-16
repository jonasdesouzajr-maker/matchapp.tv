const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);

let html=read('index.html');

// Emergency static-home recovery: preserve structured-data JSON-LD only.
// Every executable <script> (external or inline) is removed from the homepage,
// so nothing can seize the main thread after first paint.
html=html.replace(/<script\b(?![^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi,'');

// Make the existing primary matcher CTA useful without homepage JavaScript.
html=html.replace(
  /<button\s+onclick=["']triggerMatch\(false\)["']([^>]*)>([\s\S]*?)<\/button>/i,
  '<a href="/discover.html"$1 style="display:block;text-align:center;text-decoration:none;">$2</a>'
);

// Keep long-page rendering cheap: lazy-decode offscreen imagery/embeds.
html=html.replace(/<img\b([^>]*)>/gi,(m,attrs)=>{
  if(/\bloading=/.test(attrs)) return m;
  const src=(attrs.match(/\bsrc=["']([^"']+)/i)||[])[1]||'';
  if(/logo|matchapp-tv-ai/i.test(src)) return m;
  return `<img loading="lazy" decoding="async"${attrs}>`;
});
html=html.replace(/<iframe\b([^>]*)>/gi,(m,attrs)=>/\bloading=/.test(attrs)?m:`<iframe loading="lazy"${attrs}>`);
html=html.replace(/\sautoplay(?=[\s>])/gi,'');
html=html.replace(/<video\b(?![^>]*\bpreload=)([^>]*)>/gi,'<video preload="none"$1>');

const recoveryStyle=`\n<style id="matchapp-static-recovery">\n  html{scroll-behavior:auto!important}\n  html *,html *::before,html *::after{animation:none!important;transition:none!important}\n  #ambient-bg,.ambient-bg,.ad-banner-container,.side-ad{display:none!important}\n  main>section,main>article,body>section,body>article{content-visibility:auto;contain-intrinsic-size:700px 900px}\n  #matchapp-recovery-banner{position:relative;z-index:10000;margin:10px auto 14px;max-width:1280px;padding:10px 14px;border:1px solid rgba(229,193,88,.45);border-radius:12px;background:#17141f;color:#fff;font:600 14px/1.45 Inter,Arial,sans-serif}\n  #matchapp-recovery-banner a{color:#f3d66f;font-weight:800}\n</style>\n`;
if(!html.includes('id="matchapp-static-recovery"')) html=html.replace('</head>',recoveryStyle+'</head>');

const banner=`<div id="matchapp-recovery-banner" role="status"><strong>Stable mode is active.</strong> The homepage is temporarily running without JavaScript so it stays responsive. <a href="/discover.html">Open the AI Concierge →</a></div>`;
if(!html.includes('id="matchapp-recovery-banner"')) html=html.replace(/<body([^>]*)>/i,`<body$1>${banner}`);

write('index.html',html);

let build=read('build-meta.js');
build=build.replace(/window\.MATCHAPP_BUILD\s*=\s*'[^']+';/,"window.MATCHAPP_BUILD = '2026.09.15.10';");
write('build-meta.js',build);

const release=JSON.parse(read('release.json'));
release.version='2026.09.15.10';
release.functional=true;
release.notes=release.notes||{};
release.notes.en='Emergency static-home recovery: the homepage now runs with zero executable JavaScript, no third-party tags, no autoplay, lazy offscreen media, and browser-native scrolling. The AI Concierge remains available on Discover while the homepage runtime is isolated.';
release.notes['pt-BR']='Recuperação estática de emergência: a página inicial agora roda sem JavaScript executável, sem tags de terceiros, sem autoplay, com mídia fora da tela em lazy-load e rolagem nativa do navegador. O Concierge de IA continua disponível em Descobrir enquanto o runtime da home fica isolado.';
write('release.json',JSON.stringify(release,null,2)+'\n');

let sw=read('sw.js');
sw=sw.replace(/const SW_VERSION = '[^']+';/,"const SW_VERSION = 'v18-static-home-recovery';");
write('sw.js',sw);

const test=`const test=require('node:test');\nconst assert=require('node:assert/strict');\nconst fs=require('node:fs');\nconst path=require('node:path');\nconst root=path.join(__dirname,'..');\nconst html=fs.readFileSync(path.join(root,'index.html'),'utf8');\n\ntest('homepage emergency recovery is static and cannot start a JS freeze loop',()=>{\n  assert.match(html,/id=\"matchapp-static-recovery\"/);\n  assert.match(html,/id=\"matchapp-recovery-banner\"/);\n  assert.match(html,/href=\"\\/discover\\.html\"/);\n  const executable=[...html.matchAll(/<script\\b([^>]*)>/gi)].filter(m=>!/type=[\"']application\\/ld\\+json[\"']/i.test(m[1]));\n  assert.equal(executable.length,0,'homepage must contain zero executable script elements during emergency recovery');\n  assert.doesNotMatch(html,/\\/app\\.js/);\n  assert.doesNotMatch(html,/googletagmanager|adsbygoogle\\.js|supabase-js/i);\n  assert.doesNotMatch(html,/\\sautoplay(?:\\s|>)/i);\n  assert.match(html,/content-visibility:auto/);\n});\n`;
write('tests/emergency-home-safe-boot.test.cjs',test);

console.log('Emergency static homepage recovery applied.');
