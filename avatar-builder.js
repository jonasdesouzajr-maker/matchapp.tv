/* ============================================================
   MatchApp Avatar Studio v3
   - One module owns the studio: it builds the dialog, renders the avatar
     as a self-contained SVG, and saves it (localStorage + Supabase).
   - Every thumbnail is the real renderer with one option changed, shown as
     an <img> data URI so SVG gradient ids never collide on the page.
   - The chosen options are embedded in the saved SVG (<metadata>), so the
     studio re-opens with the same choices on any signed-in device.
   - No timers, no observers, no animation loops.
   ============================================================ */
(() => {
  'use strict';

  const KEY = 'match_avatar_character_v3';
  const SVGKEY = 'match_avatar_svg';

  /* ---------- copy (EN + pt-BR; other languages fall back to EN) ---------- */
  const COPY = {
    en: {
      tagline: 'YOUR ENTERTAINMENT COMPANION', title: 'Create Your Avatar',
      sub: 'Express yourself. Make it yours.',
      desc: 'This is how you’ll appear across MatchApp — in chats, leaderboards and with friends.',
      script: ['Good', 'Stories', 'Match', 'Better', 'People'],
      randomize: 'Randomize', prev: 'Previous look', next: 'Next look', edit: 'Edit details', look: 'Look',
      tabs: { appearance: 'Appearance', style: 'Style', accessories: 'Accessories', background: 'Background' },
      reset: 'Reset', save: 'Save Avatar', cancel: 'Cancel', close: 'Close',
      privacy: 'Your avatar is private and only visible within MatchApp.',
      saved: 'Avatar saved to your profile.', local: 'Avatar saved on this device. Sign in to use it on every device.',
      entryKicker: 'YOUR MATCHAPP IDENTITY', entryTitle: 'Create your MatchApp avatar',
      entryEdit: 'Your MatchApp avatar', entryText: 'Skin tone, face, hair, eyes, outfit, accessories and background.',
      entryBtn: '✨ Create my avatar', entryBtnEdit: '✏️ Edit my avatar',
      rows: { skin: 'Skin Tone', face: 'Face Style', hair: 'Hair Style', hairColor: 'Hair Color', eyeColor: 'Eyes',
        eyes: 'Eye Shape', lashes: 'Lashes', brows: 'Brows', mouth: 'Expression', facial: 'Facial Hair', outfit: 'Outfit',
        outfitColor: 'Outfit Color', build: 'Build', eyewear: 'Eyewear', headwear: 'Headwear', earrings: 'Earrings', bg: 'Background' }
    },
    pt: {
      tagline: 'SEU COMPANHEIRO DE ENTRETENIMENTO', title: 'Crie seu Avatar',
      sub: 'Expresse-se. Deixe do seu jeito.',
      desc: 'É assim que você aparece no MatchApp — nos chats, rankings e com amigos.',
      script: ['Boas', 'Histórias', 'Unem', 'Pessoas', 'Melhores'],
      randomize: 'Aleatório', prev: 'Visual anterior', next: 'Próximo visual', edit: 'Editar detalhes', look: 'Visual',
      tabs: { appearance: 'Aparência', style: 'Estilo', accessories: 'Acessórios', background: 'Fundo' },
      reset: 'Redefinir', save: 'Salvar Avatar', cancel: 'Cancelar', close: 'Fechar',
      privacy: 'Seu avatar é privado e só aparece dentro do MatchApp.',
      saved: 'Avatar salvo no seu perfil.', local: 'Avatar salvo neste aparelho. Entre na conta para usá-lo em todos.',
      entryKicker: 'SUA IDENTIDADE MATCHAPP', entryTitle: 'Crie seu avatar MatchApp',
      entryEdit: 'Seu avatar MatchApp', entryText: 'Tom de pele, rosto, cabelo, olhos, roupa, acessórios e fundo.',
      entryBtn: '✨ Criar meu avatar', entryBtnEdit: '✏️ Editar meu avatar',
      rows: { skin: 'Tom de Pele', face: 'Rosto', hair: 'Cabelo', hairColor: 'Cor do Cabelo', eyeColor: 'Olhos',
        eyes: 'Formato dos Olhos', lashes: 'Cílios', brows: 'Sobrancelhas', mouth: 'Expressão', facial: 'Barba', outfit: 'Roupa',
        outfitColor: 'Cor da Roupa', build: 'Porte', eyewear: 'Óculos', headwear: 'Chapéu / Fone', earrings: 'Brincos', bg: 'Fundo' }
    }
  };
  function lang() {
    let l = '';
    try { l = localStorage.getItem('match_lang') || ''; } catch (_) {}
    l = (l || document.documentElement.lang || navigator.language || 'en').toLowerCase();
    return l.startsWith('pt') ? 'pt' : 'en';
  }
  const T = COPY[lang()];

  /* ---------- options ---------- */
  const O = {
    skin: ['#f6d5bf', '#e8b48f', '#d49468', '#b97a4f', '#8a5536', '#5a3522', '#3a2217'],
    face: ['oval', 'round', 'square', 'heart', 'long'],
    hair: ['quiff', 'short', 'sidepart', 'curls', 'coily', 'buzz', 'long', 'waves', 'bun', 'bald'],
    hairColor: ['#141010', '#2e1c15', '#5a3421', '#8e4f22', '#d8b06a', '#b9b6b2', '#8a2f25'],
    eyeColor: ['#4a2a18', '#2f6a9e', '#4f7a45', '#7a6a2e', '#6b4a2a', '#3a3a3a'],
    eyes: ['almond', 'round', 'soft', 'sharp', 'wide'],
    lashes: ['none', 'natural', 'bold'],
    brows: ['natural', 'straight', 'bold', 'arched', 'thin'],
    mouth: ['smile', 'grin', 'soft', 'neutral', 'smirk'],
    facial: ['none', 'stubble', 'beard', 'goatee', 'mustache'],
    outfit: ['hoodie', 'jacket', 'tee', 'smart', 'turtleneck'],
    outfitColor: ['#141217', '#e5c158', '#5b3794', '#1f6f86', '#8a2f45', '#e9e4d8', '#2d5a3a', '#26324f'],
    build: ['slim', 'classic', 'broad'],
    eyewear: ['none', 'round', 'square', 'aviator', 'shades'],
    headwear: ['none', 'headphones', 'beanie', 'cap'],
    earrings: ['none', 'studs', 'hoops'],
    bg: ['royal', 'gold', 'midnight', 'cinema', 'ocean', 'sunset', 'emerald', 'stars']
  };
  const SWATCH = new Set(['skin', 'hairColor', 'outfitColor']);
  const EYEROW = new Set(['eyeColor', 'eyes', 'lashes', 'brows']);
  const BODYROW = new Set(['outfit', 'outfitColor', 'build']);
  const TABS = {
    appearance: ['skin', 'face', 'hair', 'hairColor', 'eyeColor', 'eyes', 'lashes', 'brows', 'mouth', 'facial'],
    style: ['outfit', 'outfitColor', 'build'],
    accessories: ['eyewear', 'headwear', 'earrings'],
    background: ['bg']
  };
  const BG = {
    royal: ['#6b33c9', '#2a1257', '#0c0620'], gold: ['#f3cf6a', '#7a4a12', '#1a0c05'],
    midnight: ['#2b3a6b', '#101733', '#05070f'], cinema: ['#b3263a', '#4a0c18', '#12040a'],
    ocean: ['#2fc6d6', '#135466', '#04151d'], sunset: ['#ff9a5a', '#a83a5a', '#2a0c2c'],
    emerald: ['#3fbf7f', '#11573a', '#041a10'], stars: ['#3a2a7a', '#120c33', '#04030c']
  };
  const PRESETS = [
    { skin: 2, face: 0, hair: 0, hairColor: 1, eyeColor: 0, lashes: 0, eyes: 0, brows: 2, mouth: 0, facial: 2, outfit: 0, outfitColor: 0, build: 1, eyewear: 0, headwear: 0, earrings: 0, bg: 0 },
    { skin: 2, face: 3, hair: 7, hairColor: 1, eyeColor: 0, lashes: 1, eyes: 4, brows: 3, mouth: 0, facial: 0, outfit: 1, outfitColor: 0, build: 0, eyewear: 0, headwear: 0, earrings: 1, bg: 0 },
    { skin: 5, face: 2, hair: 4, hairColor: 0, eyeColor: 0, lashes: 0, eyes: 0, brows: 2, mouth: 1, facial: 2, outfit: 0, outfitColor: 0, build: 2, eyewear: 0, headwear: 0, earrings: 0, bg: 0 },
    { skin: 0, face: 0, hair: 7, hairColor: 4, eyeColor: 3, lashes: 2, eyes: 4, brows: 3, mouth: 1, facial: 0, outfit: 1, outfitColor: 0, build: 0, eyewear: 0, headwear: 0, earrings: 2, bg: 0 },
    { skin: 1, face: 1, hair: 6, hairColor: 0, eyeColor: 0, lashes: 1, eyes: 2, brows: 4, mouth: 1, facial: 0, outfit: 2, outfitColor: 0, build: 0, eyewear: 0, headwear: 1, earrings: 0, bg: 0 }
  ];
  const DEFAULT = PRESETS[0];
  const same = (a, b) => Object.keys(O).every(k => a[k] === b[k]);

  const clampState = s => {
    const out = {};
    Object.keys(O).forEach(k => {
      const v = Number(s && s[k]);
      out[k] = Number.isInteger(v) && v >= 0 && v < O[k].length ? v : DEFAULT[k];
    });
    return out;
  };

  /* ---------- colour helpers ---------- */
  function mix(hex, target, amt) {
    const a = parseInt(hex.slice(1), 16), b = parseInt(target.slice(1), 16);
    const ch = (x, y) => Math.round(x + (y - x) * amt);
    const r = ch(a >> 16, b >> 16), g = ch((a >> 8) & 255, (b >> 8) & 255), bl = ch(a & 255, b & 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }
  const lighten = (h, a) => mix(h, '#ffffff', a);
  const darken = (h, a) => mix(h, '#000000', a);

  /* ---------- geometry (240 × 240 canvas, head centred at 120,108) ---------- */
  const FACE = {
    oval: 'M120 38C160 38 179 68 179 106C179 148 152 175 120 175C88 175 61 148 61 106C61 68 80 38 120 38Z',
    round: 'M120 40C164 40 183 72 183 110C183 148 156 171 120 171C84 171 57 148 57 110C57 72 76 40 120 40Z',
    square: 'M120 38C162 38 180 66 180 102C180 136 173 153 159 165C147 174 134 177 120 177C106 177 93 174 81 165C67 153 60 136 60 102C60 66 78 38 120 38Z',
    heart: 'M120 38C164 38 181 68 179 104C177 139 150 168 120 179C90 168 63 139 61 104C59 68 76 38 120 38Z',
    long: 'M120 34C158 34 175 64 175 104C175 150 150 182 120 182C90 182 65 150 65 104C65 64 82 34 120 34Z'
  };
  // [eye-white outline, upper-lid line, iris radius], drawn around 0,0 for the left eye.
  const EYE = {
    almond: ['M-18 0Q0-16 18 0Q0 14-18 0Z', 'M-18 0Q0-16 18 0', 'M-17 1Q0 14 17 1', 9.8],
    round: ['M-16 0A16 14 0 1 0 16 0A16 14 0 1 0-16 0Z', 'M-16 0A16 14 0 0 1 16 0', 'M-15 2A16 14 0 0 0 15 2', 10.2],
    soft: ['M-17 1Q0-13 17 1Q0 11-17 1Z', 'M-17 1Q0-13 17 1', 'M-16 2Q0 11 16 2', 9.2],
    sharp: ['M-19 2Q-2-14 18-3Q3 11-19 2Z', 'M-19 2Q-2-14 18-3', 'M-18 3Q3 11 17-2', 9.2],
    wide: ['M-17 0A17 14.5 0 1 0 17 0A17 14.5 0 1 0-17 0Z', 'M-17 0A17 14.5 0 0 1 17 0', 'M-16 2A17 14.5 0 0 0 16 2', 10.4]
  };
  const EY = 112, EL = 96, ER = 144; // eye row and eye centres
  const BROW = {
    natural: ['M-16 4Q-2-6 16-1', 4.6], straight: ['M-16 1L16-1', 4.8], bold: ['M-17 4Q-2-7 17-1', 7.2],
    arched: ['M-16 6Q-4-9 16 1', 4.2], thin: ['M-15 3Q-1-5 15 0', 2.8]
  };
  const HAIR = {
    quiff: {
      front: 'M58 104C49 58 77 18 125 17C153 16 180 30 189 57C195 76 189 93 182 105C178 86 170 74 157 70C150 58 134 52 117 58C103 50 87 56 80 67C70 72 62 86 58 104Z',
      strands: ['M84 46Q112 26 152 36', 'M97 58Q126 41 166 53', 'M70 78Q78 60 96 55', 'M120 30Q150 30 176 50']
    },
    short: {
      front: 'M59 106C53 60 80 27 120 26C163 25 190 59 181 106C177 89 172 78 162 72C150 82 128 82 112 74C98 82 82 82 74 74C67 82 63 93 59 106Z',
      strands: ['M84 48Q110 36 142 40', 'M122 42Q148 42 168 60', 'M74 66Q86 50 104 46']
    },
    sidepart: {
      front: 'M59 104C55 58 84 28 124 28C165 28 186 60 181 104C175 81 164 67 150 63C128 58 104 64 92 56C82 66 67 79 59 104Z',
      strands: ['M92 56Q100 40 118 34', 'M110 47Q140 38 168 62', 'M126 40Q156 40 176 70']
    },
    curls: { cap: 'M60 102C56 55 86 28 120 28C154 28 184 55 180 102C171 85 151 75 120 75C89 75 69 85 60 102Z', curls: true },
    coily: { cap: 'M57 102C51 60 79 24 120 24C161 24 189 60 183 102C177 85 166 74 154 70C138 64 102 64 86 70C74 74 63 85 57 102Z', coils: true },
    buzz: { front: 'M63 98C61 58 88 34 120 34C152 34 179 58 177 98C167 77 148 67 120 67C92 67 73 77 63 98Z', buzz: true },
    long: {
      back: 'M59 102C57 58 84 26 120 26C156 26 183 58 181 102C185 152 191 192 198 234L150 234C146 206 144 186 140 174L100 174C96 186 94 206 90 234L42 234C49 192 55 152 59 102Z',
      front: 'M61 106C55 60 84 28 122 28C161 28 187 62 179 108C173 85 160 71 144 65C128 73 106 77 88 71C77 81 67 93 61 106Z',
      extra: 'M61 100C54 128 56 158 70 184C72 160 70 132 76 108Z M179 100C186 128 184 158 170 184C168 160 170 132 164 108Z',
      strands: ['M96 44Q124 32 158 50', 'M66 130Q64 160 70 176', 'M174 130Q176 160 170 176']
    },
    waves: {
      back: 'M57 102C55 56 84 24 120 24C156 24 185 56 183 102C191 132 181 152 193 178C201 198 187 216 197 236L148 236C150 216 140 198 146 182L94 182C100 198 90 216 92 236L43 236C53 216 39 198 47 178C59 152 49 132 57 102Z',
      front: 'M61 108C53 60 86 26 124 28C163 28 189 62 181 110C173 87 158 71 136 67C118 79 94 83 75 77C69 87 65 97 61 108Z',
      extra: 'M61 102C51 132 66 154 56 184C70 176 74 150 68 128C66 118 70 110 76 106Z M179 104C189 132 174 156 184 184C170 176 166 150 172 128C174 118 170 110 164 108Z',
      strands: ['M92 48Q120 34 152 46', 'M52 192Q62 178 54 162', 'M188 192Q178 178 186 162', 'M140 40Q166 52 176 80']
    },
    bun: {
      back: 'M97 22A23 23 0 1 0 143 22A23 23 0 1 0 97 22Z',
      front: 'M61 102C59 58 86 32 120 32C154 32 181 58 179 102C169 79 150 67 120 67C90 67 71 79 61 102Z',
      strands: ['M88 50Q120 34 152 50', 'M100 18Q120 8 140 18']
    },
    bald: {}
  };

  /* ---------- renderer: soft-lit "3D" look (SVG lighting filters, no WebGL) ---------- */
  function render(state, opts) {
    const s = clampState(state);
    const o = opts || {};
    const p = 'm' + (o.prefix || 'x') + '-';
    const id = n => p + n, url = n => `url(#${p}${n})`;
    const skin = O.skin[s.skin], hc = O.hairColor[s.hairColor], ec = O.eyeColor[s.eyeColor];
    const oc = O.outfitColor[s.outfitColor], bgc = BG[O.bg[s.bg]];
    const face = FACE[O.face[s.face]], hairKey = O.hair[s.hair], hair = HAIR[hairKey] || {};
    const skinD = darken(skin, .2), skinDD = darken(skin, .38), skinL = lighten(skin, .3);
    const warm = mix(skin, '#c2413a', .28);           // subsurface red in the shadows
    const lip = mix(skin, '#b8424f', .42), lipD = darken(lip, .3), lipL = lighten(lip, .35);
    const hcL = lighten(hc, hc === '#141010' ? .32 : .3), hcD = darken(hc, .4);
    const rim = lighten(bgc[0], .35);
    const w = { slim: 80, classic: 94, broad: 108 }[O.build[s.build]];
    const [eyeShape, eyeLid, eyeLow, irisR] = EYE[O.eyes[s.eyes]];
    const V = o.lite ? '' : ` filter="${url('vol')}"`;   // volume shading on big shapes
    const Vs = o.lite ? '' : ` filter="${url('vols')}"`; // volume shading on small shapes
    const out = [];

    out.push(`<defs>
<radialGradient id="${id('bg')}" cx=".5" cy=".36" r=".78"><stop offset="0" stop-color="${bgc[0]}"/><stop offset=".52" stop-color="${bgc[1]}"/><stop offset="1" stop-color="${bgc[2]}"/></radialGradient>
<radialGradient id="${id('sk')}" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="${skinL}"/><stop offset=".45" stop-color="${skin}"/><stop offset=".82" stop-color="${mix(skinD, warm, .35)}"/><stop offset="1" stop-color="${skinDD}"/></radialGradient>
<linearGradient id="${id('rim')}" x1="0" y1="0" x2="1" y2="0"><stop offset=".55" stop-color="${rim}" stop-opacity="0"/><stop offset="1" stop-color="${rim}" stop-opacity=".85"/></linearGradient>
<linearGradient id="${id('hr')}" x1=".2" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${hcL}"/><stop offset=".45" stop-color="${hc}"/><stop offset="1" stop-color="${hcD}"/></linearGradient>
<linearGradient id="${id('of')}" x1=".3" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="${lighten(oc, .22)}"/><stop offset=".6" stop-color="${oc}"/><stop offset="1" stop-color="${darken(oc, .45)}"/></linearGradient>
<radialGradient id="${id('sc')}" cx=".5" cy=".6" r=".7"><stop offset=".55" stop-color="#fdfbfa"/><stop offset="1" stop-color="#d9cfd6"/></radialGradient>
<radialGradient id="${id('ir')}" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="${lighten(ec, .55)}"/><stop offset=".35" stop-color="${lighten(ec, .2)}"/><stop offset=".78" stop-color="${ec}"/><stop offset="1" stop-color="${darken(ec, .7)}"/></radialGradient>
<linearGradient id="${id('lp')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lipL}"/><stop offset="1" stop-color="${lipD}"/></linearGradient>
<radialGradient id="${id('ck')}"><stop offset="0" stop-color="#ff5a6e" stop-opacity=".32"/><stop offset="1" stop-color="#ff5a6e" stop-opacity="0"/></radialGradient>
<filter id="${id('vol')}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceAlpha" stdDeviation="9" result="b"/>
<feDiffuseLighting in="b" surfaceScale="6" diffuseConstant="1" lighting-color="#fff" result="d0"><feDistantLight azimuth="225" elevation="46"/></feDiffuseLighting>
<feGaussianBlur in="d0" stdDeviation="2" result="d"/>
<feComponentTransfer in="d" result="d2"><feFuncR type="linear" slope=".62" intercept=".48"/><feFuncG type="linear" slope=".62" intercept=".48"/><feFuncB type="linear" slope=".62" intercept=".48"/></feComponentTransfer>
<feBlend in="SourceGraphic" in2="d2" mode="multiply" result="m"/>
<feSpecularLighting in="b" surfaceScale="6" specularConstant=".32" specularExponent="14" lighting-color="#fff4e6" result="sp0"><fePointLight x="78" y="24" z="190"/></feSpecularLighting>
<feGaussianBlur in="sp0" stdDeviation="2.5" result="sp"/>
<feComposite in="sp" in2="SourceAlpha" operator="in" result="sp2"/>
<feComposite in="m" in2="sp2" operator="arithmetic" k2="1" k3=".5" result="lit"/>
<feComposite in="lit" in2="SourceAlpha" operator="in"/>
</filter>
<filter id="${id('vols')}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="b"/>
<feDiffuseLighting in="b" surfaceScale="3" diffuseConstant="1" lighting-color="#fff" result="d0"><feDistantLight azimuth="225" elevation="50"/></feDiffuseLighting>
<feGaussianBlur in="d0" stdDeviation=".8" result="d"/>
<feComponentTransfer in="d" result="d2"><feFuncR type="linear" slope=".6" intercept=".5"/><feFuncG type="linear" slope=".6" intercept=".5"/><feFuncB type="linear" slope=".6" intercept=".5"/></feComponentTransfer>
<feBlend in="SourceGraphic" in2="d2" mode="multiply" result="m"/>
<feSpecularLighting in="b" surfaceScale="3" specularConstant=".4" specularExponent="18" lighting-color="#fff4e6" result="sp0"><fePointLight x="78" y="24" z="160"/></feSpecularLighting>
<feGaussianBlur in="sp0" stdDeviation="1" result="sp"/>
<feComposite in="sp" in2="SourceAlpha" operator="in" result="sp2"/>
<feComposite in="m" in2="sp2" operator="arithmetic" k2="1" k3=".5" result="lit"/>
<feComposite in="lit" in2="SourceAlpha" operator="in"/>
</filter>
<filter id="${id('b1')}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.2"/></filter>
<filter id="${id('b3')}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="${id('b6')}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
<clipPath id="${id('fc')}"><path d="${face}"/></clipPath>
<clipPath id="${id('el')}"><path d="${eyeShape}" transform="translate(${EL} ${EY})"/></clipPath>
<clipPath id="${id('er')}"><path d="${eyeShape}" transform="translate(${ER} ${EY}) scale(-1 1)"/></clipPath>
${hair.front || hair.cap ? `<clipPath id="${id('hc')}"><path d="${hair.front || hair.cap}"/></clipPath>` : ''}
</defs>`);

    /* studio background */
    out.push(`<rect width="240" height="240" fill="${url('bg')}"/>`);
    out.push(`<ellipse cx="120" cy="96" rx="92" ry="86" fill="#fff" opacity=".07" data-s="1" filter="${url('b6')}"/>`);
    if (O.bg[s.bg] === 'stars') out.push('<g fill="#fff"><circle cx="30" cy="40" r="1.4" opacity=".8"/><circle cx="200" cy="30" r="1.8" opacity=".9"/><circle cx="214" cy="120" r="1.2" opacity=".6"/><circle cx="24" cy="140" r="1.6" opacity=".7"/><circle cx="60" cy="18" r="1" opacity=".6"/><circle cx="176" cy="66" r="1" opacity=".6"/></g>');
    if (O.bg[s.bg] === 'cinema') out.push('<g fill="#000" opacity=".25"><rect width="16" height="240"/><rect x="224" width="16" height="240"/><rect x="30" width="10" height="240"/><rect x="200" width="10" height="240"/></g>');
    out.push(`<g opacity=".16" fill="#fff" data-s="1" filter="${url('b3')}"><circle cx="38" cy="60" r="9"/><circle cx="206" cy="84" r="12"/><circle cx="196" cy="182" r="7"/></g>`);

    /* body */
    const L = 120 - w, R = 120 + w;
    const body = `M${L} 242C${L} 214 ${120 - w * .8} 196 95 187L145 187C${120 + w * .8} 196 ${R} 214 ${R} 242Z`;
    out.push(`<path d="${body}" fill="${url('of')}"${V}/>`);
    if (hair.back) out.push(`<path d="${hair.back}" fill="${url('hr')}"${V}/>`);

    /* neck with chin shadow */
    out.push(`<path d="M102 150L102 190Q120 203 138 190L138 150Z" fill="${mix(skinD, warm, .3)}"/>`);
    out.push(`<ellipse cx="120" cy="170" rx="26" ry="14" fill="${skinDD}" opacity=".65" data-s="1" filter="${url('b3')}"/>`);

    /* outfit details */
    const outfit = O.outfit[s.outfit];
    const trim = oc === '#e5c158' ? '#241400' : '#e5c158';
    if (outfit === 'hoodie') {
      out.push(`<path d="M80 192C84 170 100 165 105 176L120 199L135 176C140 165 156 170 160 192C152 207 137 213 120 213C103 213 88 207 80 192Z" fill="${darken(oc, .12)}"${Vs}/>`);
      out.push(`<path d="M104 178L120 200L136 178" fill="none" stroke="${darken(oc, .55)}" stroke-width="3" opacity=".6" data-s="1" filter="${url('b1')}"/>`);
      out.push(`<path d="M112 206L110 229M128 206L130 229" stroke="${lighten(oc, .5)}" stroke-width="2.6" stroke-linecap="round"/><circle cx="110" cy="230" r="2.2" fill="${lighten(oc, .6)}"/><circle cx="130" cy="230" r="2.2" fill="${lighten(oc, .6)}"/>`);
      out.push(`<g transform="translate(152 219)"><circle r="8.5" fill="none" stroke="${trim}" stroke-width="2"/><path d="M-2.6-4.4L4.6 0-2.6 4.4Z" fill="${trim}"/></g>`);
    } else if (outfit === 'jacket') {
      out.push(`<path d="M100 187L120 242L140 187Z" fill="#141119"${Vs}/>`);
      out.push(`<path d="M95 187L114 228L103 242M145 187L126 228L137 242" fill="none" stroke="${trim}" stroke-width="2.6" stroke-linejoin="round"/>`);
      out.push(`<path d="M95 187L114 228L103 242" fill="none" stroke="#000" stroke-width="5" opacity=".25" data-s="1" filter="${url('b3')}" transform="translate(3 2)"/>`);
      out.push(`<circle cx="160" cy="215" r="5.5" fill="none" stroke="${trim}" stroke-width="2.2"/>`);
    } else if (outfit === 'tee') {
      out.push(`<path d="M99 187Q120 207 141 187" fill="none" stroke="${darken(oc, .35)}" stroke-width="5"${Vs}/>`);
    } else if (outfit === 'smart') {
      out.push(`<path d="M100 187L120 214L140 187Z" fill="#f4f1ea"${Vs}/><path d="M116 208L120 214L124 208L127 242L113 242Z" fill="${oc === '#e9e4d8' ? '#26324f' : darken(oc, .5)}"${Vs}/>`);
      out.push(`<path d="M95 187L118 240M145 187L122 240" stroke="${darken(oc, .45)}" stroke-width="3"/>`);
    } else if (outfit === 'turtleneck') {
      out.push(`<path d="M98 166H142V196Q120 205 98 196Z" fill="${darken(oc, .08)}"${Vs}/><path d="M105 170V198M112 170V200M120 170V201M128 170V200M135 170V198" stroke="${darken(oc, .4)}" stroke-width="1.4" opacity=".6"/>`);
    }

    /* ears */
    const ear = (x, flip) => `<g transform="translate(${x} 112)${flip ? ' scale(-1 1)' : ''}"><ellipse rx="10" ry="15" fill="${skin}"${Vs}/><path d="M1-8Q-5 0 1 9" fill="none" stroke="${skinDD}" stroke-width="2.4" stroke-linecap="round" opacity=".7"/></g>`;
    out.push(ear(61, false), ear(179, true));

    /* head: lit volume, subsurface warmth, rim light */
    out.push(`<path d="${face}" fill="${url('sk')}"${V}/>`);
    out.push(`<g clip-path="${url('fc')}">`);
    out.push(`<path d="${face}" fill="none" stroke="${url('rim')}" stroke-width="7" opacity=".55" data-s="1" filter="${url('b3')}"/>`);
    out.push(`<ellipse cx="97" cy="138" rx="15" ry="10" fill="${url('ck')}"/><ellipse cx="143" cy="138" rx="15" ry="10" fill="${url('ck')}"/>`);
    // eye sockets
    out.push(`<g fill="${skinDD}" opacity=".22" data-s="1" filter="${url('b3')}"><ellipse cx="${EL}" cy="${EY - 6}" rx="17" ry="9"/><ellipse cx="${ER}" cy="${EY - 6}" rx="17" ry="9"/></g>`);
    // hair casts a soft shadow on the forehead
    if (hair.front || hair.cap) out.push(`<path d="${hair.front || hair.cap}" fill="#1a0a06" opacity=".32" transform="translate(2 6)" data-s="1" filter="${url('b3')}"/>`);
    // facial hair
    const facial = O.facial[s.facial];
    const jaw = 'M59 118C61 154 90 183 120 185C150 183 179 154 181 118C173 143 155 154 141 154C133 146 107 146 99 154C85 154 67 143 59 118Z';
    const stache = 'M101 146Q110 137 120 142Q130 137 139 146Q129 150 120 147Q111 150 101 146Z';
    if (facial === 'stubble') out.push(`<path d="${jaw}" fill="${hc}" opacity=".24" filter="${url('b1')}"/><path d="${stache}" fill="${hc}" opacity=".3" filter="${url('b1')}"/>`);
    if (facial === 'beard') out.push(`<path d="${jaw}" fill="${url('hr')}"${Vs}/><path d="${stache}" fill="${hc}"${Vs}/>`);
    if (facial === 'goatee') out.push(`<path d="M105 158Q120 186 135 158Q127 166 120 166Q113 166 105 158Z" fill="${url('hr')}"${Vs}/><path d="${stache}" fill="${hc}"${Vs}/>`);
    if (facial === 'mustache') out.push(`<path d="${stache}" fill="${hc}"${Vs}/>`);
    out.push('</g>');

    /* eyes: glossy sclera, layered iris, lid shadow, catch-lights */
    const lashes = O.lashes[s.lashes];
    const eye = (x, flip, clip) => {
      const tf = `translate(${x} ${EY})${flip ? ' scale(-1 1)' : ''}`;
      let e = `<path d="${eyeShape}" transform="${tf}" fill="${url('sc')}"/>`;
      e += `<g clip-path="${url(clip)}">`;
      e += `<circle cx="${x}" cy="${EY + 1}" r="${irisR}" fill="${url('ir')}"/>`;
      e += `<circle cx="${x}" cy="${EY + 1}" r="${(irisR * .62).toFixed(1)}" fill="none" stroke="${lighten(ec, .5)}" stroke-width="2.4" stroke-dasharray="1 1.7" opacity=".35"/>`;
      e += `<circle cx="${x}" cy="${EY + 1}" r="${(irisR * .44).toFixed(1)}" fill="#0b0707"/>`;
      e += `<rect x="${x - 20}" y="${EY - 16}" width="40" height="10" fill="#2a1410" opacity=".38" data-s="1" filter="${url('b3')}"/>`;
      e += `<path d="M${x - irisR * .8} ${EY + irisR * .55}Q${x} ${EY + irisR * 1.1} ${x + irisR * .8} ${EY + irisR * .55}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".28"/>`;
      e += '</g>';
      e += `<ellipse cx="${x - irisR * .34}" cy="${EY - irisR * .3}" rx="${(irisR * .3).toFixed(1)}" ry="${(irisR * .26).toFixed(1)}" fill="#fff"/><circle cx="${x + irisR * .38}" cy="${EY + irisR * .42}" r="${(irisR * .12).toFixed(1)}" fill="#fff" opacity=".9"/>`;
      e += `<path d="${eyeLid}" transform="${tf}" fill="none" stroke="#1b100c" stroke-width="3" stroke-linecap="round"/>`;
      if (lashes !== 'none') {
        const n = lashes === 'bold' ? 1.4 : 1;
        e += `<g transform="${tf}" stroke="#1b100c" stroke-width="${(1.8 * n).toFixed(1)}" stroke-linecap="round" fill="none"><path d="M-10-8l-${(3 * n).toFixed(1)}-${(4 * n).toFixed(1)}"/><path d="M-14.5-4.5l-${(4 * n).toFixed(1)}-${(3 * n).toFixed(1)}"/><path d="M-17.5-0.5l-${(4.5 * n).toFixed(1)}-${(1.4 * n).toFixed(1)}"/></g>`;
      }
      e += `<path d="${eyeLow}" transform="${tf}" fill="none" stroke="${skinDD}" stroke-width="1.6" opacity=".4" stroke-linecap="round"/>`;
      return e;
    };
    out.push(eye(EL, false, 'el'), eye(ER, true, 'er'));

    /* brows */
    const [bp, bw] = BROW[O.brows[s.brows]];
    const bc = darken(hc, hc === '#d8b06a' || hc === '#b9b6b2' ? .25 : .12);
    out.push(`<path d="${bp}" transform="translate(${EL} 88)" fill="none" stroke="${bc}" stroke-width="${bw}" stroke-linecap="round"/>`);
    out.push(`<path d="${bp}" transform="translate(${ER} 88) scale(-1 1)" fill="none" stroke="${bc}" stroke-width="${bw}" stroke-linecap="round"/>`);

    /* nose: soft form shadow, highlight, nostrils */
    out.push(`<ellipse cx="121" cy="136" rx="11" ry="6" fill="${skinDD}" opacity=".42" data-s="1" filter="${url('b3')}"/>`);
    out.push(`<path d="M123 108Q116 124 118 131" fill="none" stroke="${skinDD}" stroke-width="3" opacity=".3" data-s="1" filter="${url('b1')}"/>`);
    out.push(`<ellipse cx="120" cy="131" rx="8.5" ry="6.5" fill="${skin}"${Vs}/>`);
    out.push(`<ellipse cx="117.5" cy="128.5" rx="3.4" ry="2.4" fill="#fff" opacity=".42" data-s="1" filter="${url('b1')}"/>`);
    out.push(`<g fill="${darken(skin, .5)}" opacity=".5"><ellipse cx="114.5" cy="134.5" rx="2.2" ry="1.3"/><ellipse cx="125.5" cy="134.5" rx="2.2" ry="1.3"/></g>`);

    /* mouth */
    const mouth = O.mouth[s.mouth];
    if (mouth === 'grin') {
      out.push(`<path d="M100 150Q120 177 140 150Q120 157 100 150Z" fill="#3c0f14"/>`);
      out.push(`<path d="M103 151.5Q120 157 137 151.5L136 156Q120 160 104 156Z" fill="#fbf7f2"/>`);
      out.push(`<ellipse cx="120" cy="165" rx="9" ry="4.5" fill="#d0616d" opacity=".9"/>`);
      out.push(`<path d="M100 150Q120 157 140 150Q120 152 100 150Z" fill="${lipD}" opacity=".7"/><path d="M101 151Q120 180 139 151" fill="none" stroke="${lip}" stroke-width="2.6" stroke-linecap="round" opacity=".75"/>`);
      out.push(`<path d="M110 170Q120 173 130 170" fill="none" stroke="#fff" stroke-width="1.6" opacity=".35" stroke-linecap="round"/>`);
    } else {
      const line = { smile: 'M102 152Q120 166 138 152', soft: 'M106 154Q120 162 134 154', neutral: 'M107 156Q120 158 133 156', smirk: 'M104 157Q122 161 138 149' }[mouth];
      const lower = { smile: 'M107 157Q120 167 133 157Q120 172 107 157Z', soft: 'M109 157Q120 164 131 157Q120 169 109 157Z', neutral: 'M109 158Q120 160 131 158Q120 166 109 158Z', smirk: 'M110 160Q124 163 134 155Q124 170 110 160Z' }[mouth];
      out.push(`<path d="${lower}" fill="${url('lp')}"${Vs}/>`);
      out.push(`<path d="${line}" fill="none" stroke="#5a1c20" stroke-width="3.2" stroke-linecap="round"/>`);
      out.push(`<path d="${line}" fill="none" stroke="${lipD}" stroke-width="7" opacity=".25" stroke-linecap="round" data-s="1" filter="${url('b1')}" transform="translate(0 -2)"/>`);
    }

    /* hair in front */
    if (hair.front) {
      out.push(`<path d="${hair.front}" fill="${url('hr')}"${V}/>`);
      if (hair.extra) out.push(`<path d="${hair.extra}" fill="${url('hr')}"${Vs}/>`);
    }
    if (hair.cap) out.push(`<path d="${hair.cap}" fill="${url('hr')}"${V}/>`);
    if (hair.curls) {
      let c = '';
      for (let i = 0; i <= 13; i++) {
        const a = Math.PI * (1.03 + i * 0.072);
        c += `<circle cx="${(120 + Math.cos(a) * 58).toFixed(1)}" cy="${(86 + Math.sin(a) * 50).toFixed(1)}" r="${i % 2 ? 12 : 14}"/>`;
      }
      for (let i = 0; i <= 7; i++) c += `<circle cx="${82 + i * 11}" cy="${46 + (i % 2) * 7}" r="11"/>`;
      out.push(`<g fill="${url('hr')}"${Vs}>${c}</g>`);
    }
    if (hair.coils) {
      let c = '';
      for (let r = 0; r < 6; r++) for (let i = 0; i < 12; i++) {
        const x = 60 + i * 11 + (r % 2) * 5.5, y = 30 + r * 10;
        c += `<circle cx="${x}" cy="${y}" r="6.4"/>`;
      }
      out.push(`<g clip-path="${url('hc')}"><g fill="${hc}"${Vs}>${c}</g></g>`);
    }
    if (hair.buzz) {
      out.push(`<path d="${hair.front}" fill="${url('hr')}" opacity=".95"${V}/>`);
      out.push(`<path d="${hair.front}" fill="none" stroke="${hcD}" stroke-width="1.2" stroke-dasharray="1 2" opacity=".5"/>`);
    }
    if (hair.front || hair.cap) {
      // strand clumps + a glossy sheen band, kept inside the hair shape
      out.push(`<g clip-path="${url('hc')}" fill="none" stroke-linecap="round">`);
      (hair.strands || []).forEach(l => out.push(`<path d="${l}" stroke="${hcD}" stroke-width="3.2" opacity=".45" transform="translate(1.5 2)"/><path d="${l}" stroke="${hcL}" stroke-width="2.4" opacity=".55"/>`));
      out.push(`<path d="M74 70Q112 34 170 58" stroke="#fff" stroke-width="7" opacity=".16" data-s="1" filter="${url('b3')}"/>`);
      out.push('</g>');
    }
    if (hairKey === 'bald') out.push(`<ellipse cx="104" cy="58" rx="18" ry="9" fill="#fff" opacity=".22" data-s="1" filter="${url('b3')}"/>`);

    /* accessories */
    const eyewear = O.eyewear[s.eyewear];
    const lensShadow = `<g opacity=".25" data-s="1" filter="${url('b3')}" transform="translate(2 5)">`;
    if (eyewear === 'round') out.push(`${lensShadow}<circle cx="${EL}" cy="${EY}" r="17" fill="none" stroke="#000" stroke-width="3"/><circle cx="${ER}" cy="${EY}" r="17" fill="none" stroke="#000" stroke-width="3"/></g><g fill="#ffffff1a" stroke="#2a2330" stroke-width="3.2"><circle cx="${EL}" cy="${EY}" r="17"/><circle cx="${ER}" cy="${EY}" r="17"/><path d="M114 108Q120 104 126 108" fill="none"/></g><path d="M86 102Q92 96 100 96M132 102Q138 96 146 96" stroke="#fff" stroke-width="2" opacity=".4" fill="none" stroke-linecap="round"/>`);
    if (eyewear === 'square') out.push(`${lensShadow}<rect x="78" y="98" width="38" height="27" rx="8" fill="none" stroke="#000" stroke-width="3"/><rect x="124" y="98" width="38" height="27" rx="8" fill="none" stroke="#000" stroke-width="3"/></g><g fill="#ffffff1a" stroke="#15121b" stroke-width="3.6"><rect x="78" y="98" width="38" height="27" rx="8"/><rect x="124" y="98" width="38" height="27" rx="8"/><path d="M116 106H124" fill="none"/></g><path d="M84 104L94 101M130 104L140 101" stroke="#fff" stroke-width="2" opacity=".4" stroke-linecap="round"/>`);
    if (eyewear === 'aviator') out.push(`<g fill="#f3cf6a2e" stroke="#e5c158" stroke-width="2.8"><path d="M77 100H117Q119 126 97 128Q77 126 77 100Z"/><path d="M123 100H163Q163 126 143 128Q121 126 123 100Z"/><path d="M117 103H123" fill="none"/></g><path d="M84 106L96 103M130 106L142 103" stroke="#fff" stroke-width="2" opacity=".45" stroke-linecap="round"/>`);
    if (eyewear === 'shades') out.push(`${lensShadow}<rect x="76" y="98" width="41" height="28" rx="12"/><rect x="123" y="98" width="41" height="28" rx="12"/></g><g stroke="#e5c158" stroke-width="2.4"><rect x="76" y="98" width="41" height="28" rx="12" fill="#120e17"/><rect x="123" y="98" width="41" height="28" rx="12" fill="#120e17"/><path d="M117 106H123"/></g><path d="M82 105L98 102M129 105L145 102" stroke="#fff" stroke-width="2.4" opacity=".35" stroke-linecap="round"/>`);
    const earring = O.earrings[s.earrings];
    if (earring === 'studs') out.push(`<circle cx="60" cy="127" r="3.8" fill="#f3d27a"${Vs}/><circle cx="180" cy="127" r="3.8" fill="#f3d27a"${Vs}/>`);
    if (earring === 'hoops') out.push(`<g fill="none" stroke="#f3d27a" stroke-width="2.8"${Vs}><circle cx="59" cy="135" r="8"/><circle cx="181" cy="135" r="8"/></g>`);
    const head = O.headwear[s.headwear];
    const knit = oc === '#141217' ? '#5b3794' : oc;
    if (head === 'headphones') out.push(`<path d="M58 112C50 34 190 34 182 112" fill="none" stroke="#000" stroke-width="10" opacity=".25" data-s="1" filter="${url('b3')}" transform="translate(0 4)"/><path d="M58 112C50 34 190 34 182 112" fill="none" stroke="#1d1922" stroke-width="10" stroke-linecap="round"${Vs}/><path d="M60 100C56 42 184 42 180 100" fill="none" stroke="#e5c158" stroke-width="1.6" opacity=".75"/><rect x="44" y="94" width="24" height="38" rx="11" fill="#1d1922" stroke="#e5c158" stroke-width="2"${Vs}/><rect x="172" y="94" width="24" height="38" rx="11" fill="#1d1922" stroke="#e5c158" stroke-width="2"${Vs}/>`);
    if (head === 'beanie') out.push(`<path d="M57 94C55 48 84 20 120 20C156 20 185 48 183 94Z" fill="${darken(knit, .05)}"${V}/><rect x="53" y="83" width="134" height="21" rx="10.5" fill="${darken(knit, .25)}"${Vs}/><circle cx="120" cy="17" r="10" fill="${lighten(knit, .3)}"${Vs}/>`);
    if (head === 'cap') out.push(`<path d="M59 88C59 44 88 27 120 27C152 27 181 44 181 88Z" fill="#1a1720"${V}/><path d="M117 81C150 77 193 83 210 95C184 100 150 98 117 93Z" fill="#100e14"${Vs}/><g transform="translate(120 57)"><circle r="9.5" fill="none" stroke="#e5c158" stroke-width="2.2"/><path d="M-3-4.8L5.2 0-3 4.8Z" fill="#e5c158"/></g>`);

    const meta = `<metadata>${JSON.stringify({ v: 3, s })}</metadata>`;
    const vb = o.crop === 'eye' ? '76 92 44 34' : o.crop === 'head' ? '34 6 172 178' : '0 0 240 240';
    let svgBody = out.join('');
    if (o.lite) {
      // Thumbnails: drop the soft-light decorations and every filter. Same
      // shapes and gradients, a fraction of the paint cost.
      svgBody = svgBody.replace(/<g [^>]*data-s="1"[^>]*>.*?<\/g>/g, '').replace(/<(?:path|ellipse|rect|circle)\b[^>]*data-s="1"[^>]*\/>/g, '').replace(/ filter="url\(#[^)]*\)"/g, '');
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="240" height="240">${meta}${svgBody}</svg>`;
  }
  const uri = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  /* Options embedded in the saved avatar, so another device can keep editing it. */
  function stateFromSaved() {
    try {
      const own = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (own) return clampState(own);
      let svg = localStorage.getItem(SVGKEY) || localStorage.getItem('match_user_avatar') || '';
      if (svg.startsWith('data:image/svg+xml')) svg = decodeURIComponent(svg.split(',').slice(1).join(','));
      const m = svg.match(/<metadata>(\{.*?\})<\/metadata>/);
      if (m) { const j = JSON.parse(m[1]); if (j && j.v === 3) return clampState(j.s); }
    } catch (_) {}
    return null;
  }
  const hasAvatar = () => {
    try { return !!(localStorage.getItem(SVGKEY) || localStorage.getItem('match_user_avatar')); } catch (_) { return false; }
  };

  /* ---------- icons ---------- */
  const ICON = {
    appearance: '<path d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM3.8 21c.6-4.4 4-6.8 8.2-6.8s7.6 2.4 8.2 6.8Z" fill="currentColor"/>',
    style: '<path d="M8 3 4 5.5 2.5 10l3 1.2V21h13v-9.8l3-1.2L20 5.5 16 3c-.6 1.6-2.2 2.6-4 2.6S8.6 4.6 8 3Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    accessories: '<path d="M3 15.5C3 10 7 6.5 12 6.5s9 3.5 9 9M1.8 15.5h20.4M8.5 6.9 12 3l3.5 3.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    background: '<rect x="3" y="4.5" width="18" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m5.5 17 4.5-5 3.5 3.5 2.5-2.5 3 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="16" cy="8.6" r="1.6" fill="currentColor"/>',
    skin: '<circle cx="12" cy="12" r="8.5" fill="#f1c7a4"/><circle cx="9" cy="11" r="1" fill="#3a2a22"/><circle cx="15" cy="11" r="1" fill="#3a2a22"/><path d="M9.5 15q2.5 1.8 5 0" fill="none" stroke="#3a2a22" stroke-width="1.2" stroke-linecap="round"/>',
    face: '<path d="M12 3c4 0 6.5 3 6.5 7.5 0 5.5-3.3 10.5-6.5 10.5S5.5 16 5.5 10.5C5.5 6 8 3 12 3Z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    hair: '<path d="M3.5 14C3 7 7 3 12 3s9 4 8.5 11c-.8-2.6-2-4-3.6-4.6-1.8 1-5.5 1.3-8.6-.6C6.4 10.4 4.6 11.6 3.5 14Z" fill="currentColor"/>',
    hairColor: '<path d="M12 2.8s-6 7-6 11.2a6 6 0 0 0 12 0C18 9.8 12 2.8 12 2.8Z" fill="currentColor"/>',
    eyeColor: '<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/>',
    eyes: '<path d="M3 12q9-8 18 0-9 6-18 0Z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    lashes: '<path d="M3 14q9-8 18 0M7 10 5 6M12 8.5V4M17 10l2-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    brows: '<path d="M3 10q4-4 8-1M13 9q4-3 8 1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    mouth: '<path d="M5 11q7 8 14 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    facial: '<path d="M5 9c0 7 3 11 7 11s7-4 7-11c-2 3-4 4-7 4S7 12 5 9Z" fill="currentColor"/>',
    outfit: '<path d="M8 3 4 5.5 2.5 10l3 1.2V21h13v-9.8l3-1.2L20 5.5 16 3c-.6 1.6-2.2 2.6-4 2.6S8.6 4.6 8 3Z" fill="currentColor"/>',
    outfitColor: '<circle cx="8" cy="9" r="4" fill="currentColor"/><circle cx="16" cy="9" r="4" fill="currentColor" opacity=".6"/><circle cx="12" cy="16" r="4" fill="currentColor" opacity=".35"/>',
    build: '<circle cx="12" cy="6" r="3" fill="currentColor"/><path d="M5 21v-5c0-3 3-5 7-5s7 2 7 5v5Z" fill="currentColor"/>',
    eyewear: '<circle cx="7" cy="13" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="13" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M11 12.5h2" stroke="currentColor" stroke-width="1.8"/>',
    headwear: '<path d="M4 15C4 9 7.5 5 12 5s8 4 8 10M2 15h20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    earrings: '<circle cx="12" cy="14" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 4v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    bg: '<rect x="3" y="4.5" width="18" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m5.5 17 4.5-5 3.5 3.5 2.5-2.5 3 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>'
  };
  const svgIcon = (k, cls) => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[k] || ''}</svg>`;

  /* ---------- state ---------- */
  let S = stateFromSaved() || { ...DEFAULT };
  let saved = { ...S };
  let tab = 'appearance';
  let presetIndex = PRESETS.findIndex(pr => same(pr, S));
  let dlg = null, raf = 0, fillGen = 0;
  const $ = sel => dlg && dlg.querySelector(sel);
  const cropFor = k => EYEROW.has(k) ? 'eye' : BODYROW.has(k) ? null : 'head';
  const thumbSrc = (k, i) => uri(render({ ...S, [k]: i }, { crop: cropFor(k), prefix: 't', lite: true }));

  function thumbFor(k, i) {
    if (SWATCH.has(k)) return `<i class="ma-av-swatch" style="background:${O[k][i]}"></i>`;
    if (k === 'bg') { const c = BG[O.bg[i]]; return `<i class="ma-av-swatch" style="background:radial-gradient(circle at 50% 38%,${c[0]},${c[1]} 55%,${c[2]})"></i>`; }
    return '<img alt="" decoding="async">'; // filled progressively by fillThumbs()
  }
  function label(k, i) {
    const v = String(O[k][i]);
    return v.startsWith('#') ? `${T.rows[k]} ${i + 1}` : v.replace(/^\w/, c => c.toUpperCase());
  }
  /* Thumbnail images are painted a few per frame, newest request wins, so a
     burst of taps never queues up work and no single frame gets heavy. */
  function fillThumbs(skipKey) {
    const gen = ++fillGen;
    const jobs = [...dlg.querySelectorAll('#avatar-controls .ma-av-choice img')]
      .map(img => ({ img, b: img.parentElement }))
      .filter(j => j.b.dataset.k !== skipKey || !j.img.getAttribute('src'));
    let n = 0;
    const step = () => {
      if (gen !== fillGen || !dlg.open) return;
      for (let c = 0; c < 3 && n < jobs.length; c++, n++) {
        const { img, b } = jobs[n];
        img.src = thumbSrc(b.dataset.k, Number(b.dataset.i));
      }
      if (n < jobs.length) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function renderRows() {
    const root = $('#avatar-controls');
    if (!root) return;
    root.innerHTML = TABS[tab].map(k => {
      const cls = SWATCH.has(k) || k === 'bg' ? 'is-swatch' : EYEROW.has(k) ? 'is-eye' : 'is-thumb';
      const choices = O[k].map((_, i) => `<button type="button" class="ma-av-choice ${cls}${S[k] === i ? ' is-selected' : ''}" data-k="${k}" data-i="${i}" aria-pressed="${S[k] === i}" aria-label="${label(k, i)}" title="${label(k, i)}">${thumbFor(k, i)}</button>`).join('');
      return `<section class="ma-av-row"><h3>${svgIcon(k, 'ma-av-rowicon')}<span>${T.rows[k]}</span></h3><div class="ma-av-choices" role="group" aria-label="${T.rows[k]}">${choices}</div></section>`;
    }).join('');
    fillThumbs(null);
  }
  function markSelected() {
    dlg.querySelectorAll('#avatar-controls .ma-av-choice').forEach(b => {
      const on = S[b.dataset.k] === Number(b.dataset.i);
      b.classList.toggle('is-selected', on); b.setAttribute('aria-pressed', String(on));
    });
    dlg.querySelectorAll('.ma-av-preset').forEach((b, i) => {
      const on = i === presetIndex; b.classList.toggle('is-selected', on); b.setAttribute('aria-pressed', String(on));
    });
  }
  function renderPreview() {
    const img = $('#avatar-live-img');
    if (img) img.src = uri(render(S, { prefix: 'p' }));
  }
  function update(changedKey) {
    markSelected();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { renderPreview(); pop(); fillThumbs(changedKey || null); });
  }
  function pop() {
    const f = $('.ma-av-stage-circle');
    if (!f || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    f.classList.remove('is-pop'); void f.offsetWidth; f.classList.add('is-pop');
  }
  function setTab(next) {
    tab = next;
    dlg.querySelectorAll('.ma-av-tab').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    renderRows();
  }
  function applyPreset(i) {
    presetIndex = (i + PRESETS.length) % PRESETS.length;
    S = { ...PRESETS[presetIndex] };
    update(null);
  }
  function fillPresets() {
    // Full-quality look thumbnails, one per frame, after the dialog is up.
    const btns = [...dlg.querySelectorAll('.ma-av-preset img')];
    let n = 0;
    const step = () => {
      if (n >= btns.length || !dlg.open) return;
      if (!btns[n].getAttribute('src')) btns[n].src = uri(render(PRESETS[n], { crop: 'head', prefix: 'r' + n }));
      n++; requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- dialog ---------- */
  function build() {
    dlg = document.createElement('dialog');
    dlg.id = 'avatar-maker-dialog';
    dlg.className = 'ma-av-dialog';
    dlg.setAttribute('aria-labelledby', 'avatar-maker-title');
    const presets = PRESETS.map((_, i) => `<button type="button" class="ma-av-preset" data-preset="${i}" aria-pressed="false" aria-label="${T.look} ${i + 1}"><img alt="" decoding="async"></button>`).join('');
    const tabs = Object.keys(TABS).map(k => `<button type="button" role="tab" class="ma-av-tab" data-tab="${k}" aria-selected="false">${svgIcon(k, 'ma-av-tabicon')}<span>${T.tabs[k]}</span></button>`).join('');
    dlg.innerHTML = `<div class="ma-av-sheet" tabindex="-1" autofocus>
  <header class="ma-av-head">
    <div class="ma-av-brand"><img class="ma-av-orb" src="/assets/brand/matchapp-home-orb-transparent.webp?v=20260920-homebrand4" alt="" width="52" height="52" decoding="async"><div><img class="ma-av-wordmark" src="/assets/brand/matchapp-tv-ai-v2.svg" alt="MatchApp TV Ai" width="184" height="33" decoding="async"><span>${T.tagline}</span></div></div>
    <button type="button" class="ma-av-close" data-av="cancel" aria-label="${T.close}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
  </header>
  <div class="ma-av-intro">
    <h2 id="avatar-maker-title">${T.title}</h2>
    <p class="ma-av-sub">${T.sub}</p>
    <p class="ma-av-desc">${T.desc}</p>
    <p class="ma-av-script" aria-hidden="true">${T.script.map(x => `<span>${x}</span>`).join('')}<b>✦</b></p>
  </div>
  <div class="ma-av-stage">
    <div class="ma-av-nav"><button type="button" class="ma-av-arrow" data-av="prev" aria-label="${T.prev}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button type="button" class="ma-av-arrow" data-av="next" aria-label="${T.next}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
    <div class="ma-av-stage-circle"><img id="avatar-live-img" alt="" width="240" height="240"><button type="button" class="ma-av-edit" data-av="edit" aria-label="${T.edit}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16Zm9.5-13.5 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button></div>
    <div class="ma-av-side"><button type="button" class="ma-av-random" data-av="random"><span class="ma-av-spark" aria-hidden="true">✦</span><span class="ma-av-random-label">${T.randomize}</span></button></div>
  </div>
  <div class="ma-av-presets" role="group">${presets}</div>
  <div class="ma-av-tabs" role="tablist">${tabs}</div>
  <div class="ma-av-controls" id="avatar-controls"></div>
  <footer class="ma-av-foot">
    <button type="button" class="ma-av-reset" data-av="reset"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${T.reset}</span></button>
    <button type="button" class="ma-av-save" id="avatar-save" data-av="save"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${T.save}</span></button>
    <button type="button" class="ma-av-cancel" data-av="cancel">${T.cancel}</button>
  </footer>
  <p class="ma-av-privacy"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Z" fill="currentColor"/></svg>${T.privacy}</p>
</div>`;
    document.body.appendChild(dlg);

    dlg.addEventListener('click', e => {
      const choice = e.target.closest('.ma-av-choice');
      if (choice) { const k = choice.dataset.k; S[k] = Number(choice.dataset.i); presetIndex = PRESETS.findIndex(pr => same(pr, S)); update(k); return; }
      const preset = e.target.closest('.ma-av-preset');
      if (preset) { applyPreset(Number(preset.dataset.preset)); return; }
      const t = e.target.closest('.ma-av-tab');
      if (t) { setTab(t.dataset.tab); return; }
      const act = e.target.closest('[data-av]');
      if (!act) { if (e.target === dlg) close(false); return; }
      const a = act.dataset.av;
      if (a === 'prev') applyPreset(presetIndex < 0 ? 0 : presetIndex - 1);
      else if (a === 'next') applyPreset(presetIndex < 0 ? 0 : presetIndex + 1);
      else if (a === 'random') {
        const bg = S.bg;
        Object.keys(O).forEach(k => { S[k] = Math.floor(Math.random() * O[k].length); });
        S.bg = bg; S.eyewear = Math.random() < .7 ? 0 : S.eyewear; S.headwear = Math.random() < .75 ? 0 : S.headwear;
        presetIndex = -1; update(null);
      }
      else if (a === 'reset') { S = { ...DEFAULT }; presetIndex = 0; update(null); }
      else if (a === 'edit') { const tl = $('.ma-av-tabs'); tl?.scrollIntoView({ behavior: 'smooth', block: 'start' }); tl?.querySelector('.is-active')?.focus({ preventScroll: true }); }
      else if (a === 'cancel') close(false);
      else if (a === 'save') save();
    });
    dlg.addEventListener('keydown', e => {
      if (!e.target.classList?.contains('ma-av-tab') || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const keys = Object.keys(TABS), i = keys.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1);
      setTab(keys[(i + keys.length) % keys.length]); $('.ma-av-tab.is-active')?.focus();
    });
    // Esc / Android back closes without saving.
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(false); });
  }

  function open() {
    try {
      if (!dlg) build();
      S = stateFromSaved() || { ...S };
      saved = { ...S };
      presetIndex = PRESETS.findIndex(pr => same(pr, S));
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      dlg.querySelector('.ma-av-sheet').focus({ preventScroll: true });
      renderPreview();
      setTab('appearance');
      markSelected();
      fillPresets();
      document.documentElement.classList.add('ma-av-open');
      dlg.querySelector('.ma-av-sheet').scrollTop = 0;
      try { window.track?.('avatar_studio_open'); } catch (_) {}
    } catch (e) {
      console.warn('Avatar Studio could not open:', e);
      window.showToast?.('Avatar Studio could not open. Please refresh and try again.', true);
    }
  }
  function close(keep) {
    if (!keep) S = { ...saved };
    document.documentElement.classList.remove('ma-av-open');
    try { dlg.close(); } catch (_) { dlg.removeAttribute('open'); }
  }

  async function save() {
    const btn = $('#avatar-save');
    if (btn) btn.disabled = true;
    const svg = render(S, { prefix: 'a' });
    const encoded = uri(svg);
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
      localStorage.setItem(SVGKEY, svg);
      localStorage.setItem('match_user_avatar', encoded);
      ['match_custom_avatar', 'match_preset_avatar', 'match_avatar_character_v2'].forEach(k => localStorage.removeItem(k));
    } catch (e) { console.warn('Avatar local save failed:', e); }
    let synced = false;
    try {
      const sb = window.supabaseClient;
      if (sb) {
        const { data, error } = await sb.auth.getUser();
        if (error) throw error;
        if (data?.user) {
          const { error: saveError } = await sb.from('profiles').update({ avatar_url: encoded }).eq('id', data.user.id);
          if (saveError) throw saveError;
          synced = true;
        }
      }
    } catch (e) { console.warn('Avatar cloud sync unavailable:', e?.message || e); }
    saved = { ...S };
    if (btn) btn.disabled = false;
    try { window.renderUserAvatar?.(); } catch (_) {}
    document.dispatchEvent(new CustomEvent('matchapp:avatarchange'));
    close(true);
    paintEntry();
    window.showToast?.(synced ? T.saved : T.local);
    try { window.track?.('avatar_changed', { source: 'studio' }); } catch (_) {}
  }

  /* ---------- profile-page entry card ---------- */
  function paintEntry() {
    const host = document.getElementById('avatar-studio');
    if (!host) return;
    const has = hasAvatar();
    let src = '';
    try { src = (has && window.resolveUserAvatar?.()) || ''; } catch (_) {}
    if (!src) src = uri(render(S, { prefix: 'e' }));
    host.innerHTML = `<div class="ma-av-entry${has ? '' : ' is-new'}">
  <button type="button" class="ma-av-entry-circle" data-av-open aria-label="${has ? T.entryBtnEdit : T.entryBtn}"><img alt="" src="${src}"></button>
  <div class="ma-av-entry-copy"><span>${T.entryKicker}</span><h2>${has ? T.entryEdit : T.entryTitle}</h2><p>${T.entryText}</p></div>
  <button type="button" class="ma-av-entry-btn" id="avatar-preview-button" data-av-open>${has ? T.entryBtnEdit : T.entryBtn}</button>
</div>`;
    host.querySelectorAll('[data-av-open]').forEach(b => b.addEventListener('click', open));
    const img = host.querySelector('img');
    if (img) img.onerror = () => { img.onerror = null; img.src = uri(render(S, { prefix: 'e' })); };
  }

  function init() {
    paintEntry();
    // Arriving from the Home avatar circle before any avatar exists: open the
    // studio straight away — the user tapped the "create your avatar" invite.
    if (location.hash === '#avatar-studio' && !hasAvatar() && document.getElementById('avatar-studio')) open();
  }
  document.addEventListener('matchapp:avatarchange', () => { if (!dlg || !dlg.open) paintEntry(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();

  window.MatchAvatarStudio = Object.freeze({ open, render: st => render(st || S, { prefix: 'x' }) });
  window.matchAvatarSVG = () => { try { return localStorage.getItem(SVGKEY) || render(S, { prefix: 'x' }); } catch (_) { return render(S, { prefix: 'x' }); } };
})();
