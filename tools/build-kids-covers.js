// Title-specific vector covers. These are original fallback designs, not studio posters.
// Keep in sync with the authoritative allowlist in kids.js; never expand the catalogue here.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'kids/kids.js'), 'utf8');
const catalogue = vm.runInNewContext(source.match(/const LIBRARY = (\[[\s\S]*?\n  \]);/)[1], {}, {timeout:1000});
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,'-');
const palettes = [['#255a91','#142f66','#8ae0f1'],['#913962','#4c2453','#ffbf87'],['#366d5d','#203f48','#b7e8b8'],['#7b4e9c','#34204e','#ffe18e'],['#a55631','#542843','#ffd79b'],['#287e90','#25435f','#8ce9e4']];
const themes = {
  'Bluey':'home','Peppa Pig':'home',"Daniel Tiger's Neighborhood":'home','Sesame Street':'city','Numberblocks':'blocks','Ask the StoryBots':'robot','Puffin Rock':'forest','Pocoyo':'blocks',"Gabby's Dollhouse":'home','Octonauts':'ocean','Wild Kratts':'forest','Shaun the Sheep':'forest','My Neighbor Totoro':'forest',"Kiki's Delivery Service":'city','Paddington':'city','Paddington 2':'city','Winnie the Pooh':'forest','The Peanuts Movie':'sky','Luca':'ocean','Ratatouille':'city','Super Simple Songs':'music','The Wiggles':'music','Cosmic Kids Yoga':'sky','SciShow Kids':'robot'
};
const motifs = {
  home:'<path d="M150 410V280L300 175l150 105v130Z" fill="ACCENT"/><path d="m125 285 175-130 175 130" fill="none" stroke="#fff5df" stroke-width="22" stroke-linecap="round"/><rect x="265" y="320" width="70" height="90" rx="25" fill="DEEP"/><rect x="190" y="290" width="44" height="44" rx="10" fill="#fff5df"/><rect x="367" y="290" width="44" height="44" rx="10" fill="#fff5df"/>',
  city:'<rect x="115" y="240" width="100" height="200" rx="20" fill="ACCENT"/><rect x="237" y="175" width="126" height="265" rx="25" fill="#fff5df"/><rect x="385" y="270" width="100" height="170" rx="20" fill="ACCENT"/><path d="M267 225h65m-65 65h65m-65 65h65M140 295h45m-45 60h45m220-30h45" stroke="DEEP" stroke-width="22" stroke-linecap="round"/>',
  blocks:'<rect x="150" y="280" width="140" height="140" rx="28" fill="ACCENT" transform="rotate(-9 220 350)"/><rect x="310" y="280" width="140" height="140" rx="28" fill="#fff5df" transform="rotate(9 380 350)"/><rect x="230" y="125" width="140" height="140" rx="28" fill="#ffe18e"/><path d="M270 195h60m-30-30v60M198 350h48m110 0h48" stroke="DEEP" stroke-width="18" stroke-linecap="round"/>',
  robot:'<rect x="165" y="215" width="270" height="200" rx="65" fill="ACCENT"/><path d="M300 215v-55" stroke="#fff5df" stroke-width="18"/><circle cx="300" cy="145" r="25" fill="#ffe18e"/><circle cx="240" cy="295" r="28" fill="DEEP"/><circle cx="360" cy="295" r="28" fill="DEEP"/><path d="M253 360q47 35 94 0" fill="none" stroke="DEEP" stroke-width="15" stroke-linecap="round"/><path d="m162 285-40 25m315-25 40 25" stroke="#fff5df" stroke-width="26" stroke-linecap="round"/>',
  forest:'<path d="m165 130 100 190H65Zm275 0 95 190H345Z" fill="ACCENT"/><path d="m300 155 140 255H160Z" fill="#fff5df"/><path d="M165 320v100m135-10v50m140-140v100" stroke="DEEP" stroke-width="27" stroke-linecap="round"/><path d="M100 460q200-65 400 0" fill="none" stroke="ACCENT" stroke-width="20"/>',
  ocean:'<path d="M65 335q60-60 120 0t120 0 120 0 120 0M65 400q60-60 120 0t120 0 120 0 120 0" fill="none" stroke="ACCENT" stroke-width="24" stroke-linecap="round"/><path d="M230 255q90-105 180 0-90 105-180 0l-70 45v-90Z" fill="#fff5df"/><circle cx="355" cy="240" r="12" fill="DEEP"/><circle cx="145" cy="170" r="25" fill="none" stroke="ACCENT" stroke-width="10"/><circle cx="190" cy="120" r="13" fill="ACCENT"/>',
  sky:'<circle cx="300" cy="275" r="135" fill="ACCENT"/><ellipse cx="300" cy="275" rx="225" ry="60" transform="rotate(-25 300 275)" fill="none" stroke="#fff5df" stroke-width="18"/><circle cx="245" cy="235" r="25" fill="DEEP" opacity=".3"/><circle cx="340" cy="305" r="37" fill="DEEP" opacity=".3"/>',
  music:'<path d="M255 350V185l170-45v165" fill="none" stroke="#fff5df" stroke-width="22" stroke-linejoin="round"/><ellipse cx="215" cy="360" rx="52" ry="38" fill="ACCENT" transform="rotate(-20 215 360)"/><ellipse cx="385" cy="315" rx="52" ry="38" fill="ACCENT" transform="rotate(-20 385 315)"/><path d="M130 240v55m35-75v95m300-140v65" stroke="ACCENT" stroke-width="14" stroke-linecap="round"/>'
};
const out = path.join(root, 'kids/covers'); fs.mkdirSync(out, {recursive:true});
for (const item of catalogue) {
  const hash = [...item.title].reduce((h,c) => (h*31+c.codePointAt(0))>>>0, 7);
  const [top,deep,accent] = palettes[hash % palettes.length];
  const lines = []; let line = '';
  for (const word of item.title.split(' ')) { if ((line+' '+word).trim().length > 18 && line) { lines.push(line); line=word; } else line=(line+' '+word).trim(); } lines.push(line);
  const motif = motifs[themes[item.title]].replaceAll('ACCENT',accent).replaceAll('DEEP',deep);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900" role="img" aria-labelledby="title"><title id="title">${esc(item.title)} — MatchApp Kids illustrated cover</title><defs><linearGradient id="g" x2=".6" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${deep}"/></linearGradient></defs><rect width="600" height="900" fill="url(#g)"/><circle cx="300" cy="275" r="230" fill="#ffffff09"/><circle cx="${70+hash%400}" cy="85" r="12" fill="${accent}"/><path d="m480 135 7 18 19 2-15 13 4 19-15-10-16 10 4-19-14-13 19-2Z" fill="#ffe18e"/><path d="m75 450 5 12 14 2-11 9 3 14-11-7-11 7 3-14-10-9 13-2Z" fill="#fff5df"/>${motif}<path d="M0 530q180-100 330 0t270 0v370H0Z" fill="${deep}"/><g text-anchor="middle" fill="#fffaf2" font-family="Arial,sans-serif" font-weight="900" font-size="${lines.length>2?43:49}">${lines.map((line,i)=>`<text x="300" y="${610+i*60}">${esc(line)}</text>`).join('')}</g><text x="300" y="${625+lines.length*60}" text-anchor="middle" fill="${accent}" font-family="Arial,sans-serif" font-size="22">${esc(item.year || 'Discover &amp; explore').replace('&amp;amp;','&amp;')}</text><rect x="150" y="807" width="300" height="45" rx="22" fill="#ffffff12"/><text x="300" y="837" text-anchor="middle" fill="#fff5df" font-family="Arial,sans-serif" font-size="21" font-weight="700" letter-spacing="3">MATCHAPP KIDS</text></svg>`;
  fs.writeFileSync(path.join(out, slug(item.title)+'.svg'), svg);
}
console.log(`Built ${catalogue.length} title-specific Kids covers.`);
