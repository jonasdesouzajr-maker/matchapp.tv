// One-time emergency homepage safe-boot patcher. Intentionally idempotent so
// it can be rerun while stripping additional startup hazards.
const fs=require('fs');
const file='index.html';
let s=fs.readFileSync(file,'utf8');
const before=s;

if(s.includes('/build-meta.js?v=194'))s=s.replace('/build-meta.js?v=194','/build-meta.js?v=195');

// Nothing third-party may execute before MatchApp's safe-boot guard. GTM can
// inject arbitrary tags, so pausing only the direct AdSense script is not a
// complete isolation test.
const gtm=`    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-M7J3NNBN');</script>
    <!-- End Google Tag Manager -->`;
if(s.includes(gtm))s=s.replace(gtm,'    <!-- Emergency safe boot: GTM paused on homepage -->');

const removeExact=[
  '<script src="/app-install-state.js?v=187"></script>',
  '<script defer src="/install.js?v=187"></script>',
  '    <script defer src="/avatars.js?v=187"></script>',
  '    <script defer src="/ambient.js?v=188"></script>',
  '    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>',
  '<script src="/passkeys.js?v=187"></script>',
  '<script src="/app-updates.js?v=191"></script>',
  '<script defer src="/ads-init.js?v=1"></script>',
  '<script src="/global-events.js?v=187"></script>',
  '<script src="/title-captions.js?v=190"></script>'
];
for(const line of removeExact)s=s.replace(line,'');

const adsense='    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9541435081010948" crossorigin="anonymous"></script>';
if(s.includes(adsense))s=s.replace(adsense,'    <!-- Emergency safe boot: third-party ad engine paused on homepage -->');

if(s===before){console.log('Homepage already in full safe boot.');process.exit(0);}
fs.writeFileSync(file,s);
console.log('Homepage safe boot applied: no GTM/ads/optional startup layers before core runtime.');
