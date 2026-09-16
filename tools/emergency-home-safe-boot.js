// One-time emergency homepage safe-boot patcher.
const fs=require('fs');
const file='index.html';
let s=fs.readFileSync(file,'utf8');
const before=s;
const must=(from,to,label)=>{if(!s.includes(from))throw new Error('Missing '+label);s=s.replace(from,to);};

must('/build-meta.js?v=194','/build-meta.js?v=195','build-meta cache bust');

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
for(const line of removeExact){if(s.includes(line))s=s.replace(line,'');else throw new Error('Missing script: '+line);}

const adsense='    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9541435081010948" crossorigin="anonymous"></script>';
if(!s.includes(adsense))throw new Error('Missing homepage AdSense engine');
s=s.replace(adsense,'    <!-- Emergency safe boot: third-party ad engine paused on homepage -->');

if(s===before)throw new Error('No homepage changes made');
fs.writeFileSync(file,s);
console.log('Homepage safe boot applied: cache-busted build-meta and removed nonessential startup scripts.');
