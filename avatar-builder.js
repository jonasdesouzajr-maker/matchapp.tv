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
        eyes: 'Eye Shape', brows: 'Brows', mouth: 'Expression', facial: 'Facial Hair', outfit: 'Outfit',
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
        eyes: 'Formato dos Olhos', brows: 'Sobrancelhas', mouth: 'Expressão', facial: 'Barba', outfit: 'Roupa',
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
  const EYEROW = new Set(['eyeColor', 'eyes', 'brows']);
  const BODYROW = new Set(['outfit', 'outfitColor', 'build']);
  const TABS = {
    appearance: ['skin', 'face', 'hair', 'hairColor', 'eyeColor', 'eyes', 'brows', 'mouth', 'facial'],
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
    { skin: 2, face: 0, hair: 0, hairColor: 1, eyeColor: 0, eyes: 0, brows: 2, mouth: 0, facial: 2, outfit: 0, outfitColor: 0, build: 1, eyewear: 0, headwear: 0, earrings: 0, bg: 0 },
    { skin: 2, face: 3, hair: 7, hairColor: 1, eyeColor: 0, eyes: 4, brows: 3, mouth: 0, facial: 0, outfit: 1, outfitColor: 0, build: 0, eyewear: 0, headwear: 0, earrings: 1, bg: 0 },
    { skin: 5, face: 2, hair: 4, hairColor: 0, eyeColor: 0, eyes: 0, brows: 2, mouth: 1, facial: 2, outfit: 0, outfitColor: 0, build: 2, eyewear: 0, headwear: 0, earrings: 0, bg: 0 },
    { skin: 0, face: 0, hair: 7, hairColor: 4, eyeColor: 3, eyes: 4, brows: 3, mouth: 1, facial: 0, outfit: 1, outfitColor: 0, build: 0, eyewear: 0, headwear: 0, earrings: 2, bg: 0 },
    { skin: 1, face: 1, hair: 6, hairColor: 0, eyeColor: 0, eyes: 2, brows: 4, mouth: 1, facial: 0, outfit: 2, outfitColor: 0, build: 0, eyewear: 0, headwear: 1, earrings: 0, bg: 0 }
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

  /* ---------- geometry (240 × 240 canvas, head centred at 120,105) ---------- */
  const FACE = {
    oval: 'M120 40C159 40 178 68 178 104C178 145 152 172 120 172C88 172 62 145 62 104C62 68 81 40 120 40Z',
    round: 'M120 42C163 42 181 72 181 108C181 145 156 168 120 168C84 168 59 145 59 108C59 72 77 42 120 42Z',
    square: 'M120 40C161 40 178 66 178 100C178 133 172 150 158 162C146 171 134 174 120 174C106 174 94 171 82 162C68 150 62 133 62 100C62 66 79 40 120 40Z',
    heart: 'M120 40C163 40 180 68 178 102C176 136 150 165 120 176C90 165 64 136 62 102C60 68 77 40 120 40Z',
    long: 'M120 36C157 36 174 64 174 102C174 146 150 179 120 179C90 179 66 146 66 102C66 64 83 36 120 36Z'
  };
  // [eye-white outline, upper-lid line], drawn around 0,0 for the left eye.
  const EYE = {
    almond: ['M-14 0Q0-11 14 0Q0 9-14 0Z', 'M-14 0Q0-11 14 0'],
    round: ['M-12 0A12 10.5 0 1 0 12 0A12 10.5 0 1 0-12 0Z', 'M-12-1Q0-13 12-1'],
    soft: ['M-13 1Q0-9 13 1Q0 7-13 1Z', 'M-13 1Q0-9 13 1'],
    sharp: ['M-15 2Q-2-9 14-3Q3 8-15 2Z', 'M-15 2Q-2-9 14-3'],
    wide: ['M-14 0A14 11.5 0 1 0 14 0A14 11.5 0 1 0-14 0Z', 'M-14-1Q0-14 14-1']
  };
  const BROW = {
    natural: ['M-15 4Q-2-5 15-1', 4.4], straight: ['M-15 1L15-1', 4.6], bold: ['M-16 4Q-2-6 16-1', 7],
    arched: ['M-15 5Q-4-8 15 1', 4], thin: ['M-14 3Q-1-4 14 0', 2.6]
  };
  const MOUTH = {
    smile: '<path d="M103 146Q120 160 137 146" fill="none" stroke="#7a2e2c" stroke-width="3.4" stroke-linecap="round"/><path d="M110 156Q120 160 130 156" fill="none" stroke="#c9736b" stroke-width="2" stroke-linecap="round" opacity=".55"/>',
    grin: '<path d="M101 142Q120 168 139 142Q120 149 101 142Z" fill="#4a1518"/><path d="M104 143.5Q120 149 136 143.5L135 147Q120 151 105 147Z" fill="#fff"/><path d="M110 157Q120 161 130 157" fill="none" stroke="#e07d86" stroke-width="3" stroke-linecap="round" opacity=".8"/>',
    soft: '<path d="M107 147Q120 155 133 147" fill="none" stroke="#7a2e2c" stroke-width="3.2" stroke-linecap="round"/>',
    neutral: '<path d="M108 149Q120 151 132 149" fill="none" stroke="#7a2e2c" stroke-width="3.2" stroke-linecap="round"/>',
    smirk: '<path d="M105 150Q122 154 137 142" fill="none" stroke="#7a2e2c" stroke-width="3.2" stroke-linecap="round"/>'
  };
  const HAIR = {
    quiff: {
      front: 'M59 102C50 58 78 20 125 19C152 18 178 31 187 57C193 75 187 92 181 103C177 85 169 73 156 69C149 58 134 52 117 58C103 50 87 56 81 67C71 71 63 84 59 102Z',
      lines: ['M86 46Q113 28 150 37', 'M98 58Q126 43 164 53', 'M72 76Q80 60 96 56']
    },
    short: {
      front: 'M60 104C54 60 80 29 120 28C162 27 188 59 180 104C176 88 172 77 162 71C150 81 128 81 112 73C98 81 82 81 74 73C68 81 64 91 60 104Z',
      lines: ['M84 50Q110 38 140 42', 'M122 44Q146 44 166 60']
    },
    sidepart: {
      front: 'M60 102C56 58 84 30 124 30C164 30 184 60 180 102C174 80 164 66 150 62C128 58 104 64 92 56C82 66 68 78 60 102Z',
      lines: ['M92 56Q100 42 116 36', 'M110 48Q138 40 166 62']
    },
    curls: { front: 'M62 100C58 56 86 30 120 30C154 30 182 56 178 100C170 84 150 74 120 74C90 74 70 84 62 100Z', curls: 58 },
    coily: {
      front: 'M58 100C52 60 80 26 120 26C160 26 188 60 182 100C176 84 166 74 154 70C138 64 102 64 86 70C74 74 64 84 58 100Z',
      dots: true
    },
    buzz: { front: 'M64 96C62 58 88 36 120 36C152 36 178 58 176 96C166 76 148 66 120 66C92 66 74 76 64 96Z', dots: true, fade: .92 },
    long: {
      back: 'M60 100C58 58 84 28 120 28C156 28 182 58 180 100C184 150 190 190 197 232L150 232C146 204 144 184 140 172L100 172C96 184 94 204 90 232L43 232C50 190 56 150 60 100Z',
      front: 'M62 104C56 60 84 30 122 30C160 30 186 62 178 106C172 84 160 70 144 64C128 72 106 76 88 70C78 80 68 92 62 104Z',
      extra: 'M62 100C57 128 58 152 66 176L75 176C70 150 70 126 73 104Z M178 100C183 128 182 152 174 176L165 176C170 150 170 126 167 104Z',
      lines: ['M96 44Q124 34 156 50']
    },
    waves: {
      back: 'M58 100C56 56 84 26 120 26C156 26 184 56 182 100C190 130 180 150 192 176C200 196 186 214 196 234L148 234C150 214 140 196 146 180L94 180C100 196 90 214 92 234L44 234C54 214 40 196 48 176C60 150 50 130 58 100Z',
      front: 'M62 106C54 60 86 28 124 30C162 30 188 62 180 108C172 86 158 70 136 66C118 78 94 82 76 76C70 86 66 96 62 106Z',
      extra: 'M62 102C54 130 66 150 58 178L70 180C76 152 66 128 74 106Z M178 104C186 130 174 152 182 178L170 180C164 152 174 128 166 106Z',
      lines: ['M92 48Q120 36 150 46', 'M52 190Q62 176 54 160', 'M188 190Q178 176 186 160']
    },
    bun: {
      back: 'M98 22A22 22 0 1 0 142 22A22 22 0 1 0 98 22Z',
      front: 'M62 100C60 58 86 34 120 34C154 34 180 58 178 100C168 78 150 66 120 66C90 66 72 78 62 100Z',
      lines: ['M88 50Q120 36 152 50']
    },
    bald: {}
  };

  /* ---------- renderer ---------- */
  function render(state, opts) {
    const s = clampState(state);
    const o = opts || {};
    const p = 'm' + (o.prefix || 'x') + '-';
    const id = n => p + n;
    const skin = O.skin[s.skin], hc = O.hairColor[s.hairColor], ec = O.eyeColor[s.eyeColor];
    const oc = O.outfitColor[s.outfitColor], bgc = BG[O.bg[s.bg]];
    const face = FACE[O.face[s.face]], hairKey = O.hair[s.hair], hair = HAIR[hairKey] || {};
    const skinD = darken(skin, .22), skinL = lighten(skin, .22), hcL = lighten(hc, .28), hcD = darken(hc, .35);
    const w = { slim: 78, classic: 92, broad: 106 }[O.build[s.build]];
    const [eyeShape, eyeLid] = EYE[O.eyes[s.eyes]];
    const out = [];

    out.push(`<defs>
<radialGradient id="${id('bg')}" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="${bgc[0]}"/><stop offset=".55" stop-color="${bgc[1]}"/><stop offset="1" stop-color="${bgc[2]}"/></radialGradient>
<radialGradient id="${id('sk')}" cx=".42" cy=".34" r=".75"><stop offset="0" stop-color="${skinL}"/><stop offset=".55" stop-color="${skin}"/><stop offset="1" stop-color="${skinD}"/></radialGradient>
<linearGradient id="${id('hr')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hcL}"/><stop offset=".55" stop-color="${hc}"/><stop offset="1" stop-color="${hcD}"/></linearGradient>
<linearGradient id="${id('of')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lighten(oc, .16)}"/><stop offset="1" stop-color="${darken(oc, .35)}"/></linearGradient>
<radialGradient id="${id('ir')}" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="${lighten(ec, .45)}"/><stop offset=".6" stop-color="${ec}"/><stop offset="1" stop-color="${darken(ec, .55)}"/></radialGradient>
<clipPath id="${id('fc')}"><path d="${face}"/></clipPath>
<clipPath id="${id('el')}"><path d="${eyeShape}" transform="translate(98 108)"/></clipPath>
<clipPath id="${id('er')}"><path d="${eyeShape}" transform="translate(142 108) scale(-1 1)"/></clipPath>
</defs>`);

    // background
    out.push(`<rect width="240" height="240" fill="url(#${id('bg')})"/>`);
    if (O.bg[s.bg] === 'stars') out.push('<g fill="#fff" opacity=".7"><circle cx="30" cy="40" r="1.4"/><circle cx="200" cy="30" r="1.8"/><circle cx="214" cy="120" r="1.2"/><circle cx="24" cy="140" r="1.6"/><circle cx="60" cy="18" r="1"/><circle cx="176" cy="70" r="1"/></g>');
    if (O.bg[s.bg] === 'cinema') out.push('<g fill="#000" opacity=".22"><rect width="16" height="240"/><rect x="224" width="16" height="240"/><rect x="30" width="10" height="240"/><rect x="200" width="10" height="240"/></g>');
    out.push('<circle cx="120" cy="104" r="96" fill="#fff" opacity=".05"/>');

    // outfit body
    const L = 120 - w, R = 120 + w;
    out.push(`<path d="M${L} 240C${L} 214 ${120 - w * .78} 196 96 186L144 186C${120 + w * .78} 196 ${R} 214 ${R} 240Z" fill="url(#${id('of')})"/>`);

    // hair behind the head
    if (hair.back) out.push(`<path d="${hair.back}" fill="url(#${id('hr')})"/>`);

    // neck
    out.push(`<path d="M103 150L103 188Q120 200 137 188L137 150Z" fill="${skinD}"/>`);
    out.push(`<path d="M103 158Q120 176 137 158L137 170Q120 184 103 170Z" fill="${darken(skin, .38)}" opacity=".45"/>`);

    // outfit details (collars sit over the neck)
    const outfit = O.outfit[s.outfit];
    const trim = oc === '#e5c158' ? '#241400' : '#e5c158';
    if (outfit === 'hoodie') {
      out.push(`<path d="M82 190C86 170 100 166 105 176L120 198L135 176C140 166 154 170 158 190C150 204 136 210 120 210C104 210 90 204 82 190Z" fill="${darken(oc, .18)}"/>`);
      out.push(`<path d="M112 204L110 228M128 204L130 228" stroke="${lighten(oc, .45)}" stroke-width="2.4" stroke-linecap="round"/>`);
      out.push(`<g transform="translate(150 218)"><circle r="8" fill="none" stroke="${trim}" stroke-width="1.8"/><path d="M-2.5-4L4 0-2.5 4Z" fill="${trim}"/></g>`);
    } else if (outfit === 'jacket') {
      out.push('<path d="M100 186L120 240L140 186Z" fill="#0f0d14"/>');
      out.push(`<path d="M96 186L114 226L104 240M144 186L126 226L136 240" fill="none" stroke="${trim}" stroke-width="2.4" stroke-linejoin="round"/>`);
      out.push(`<circle cx="158" cy="214" r="5" fill="none" stroke="${trim}" stroke-width="2"/>`);
    } else if (outfit === 'tee') {
      out.push(`<path d="M100 186Q120 204 140 186" fill="none" stroke="${darken(oc, .3)}" stroke-width="4"/>`);
    } else if (outfit === 'smart') {
      out.push(`<path d="M100 186L120 212L140 186Z" fill="#f4f1ea"/><path d="M116 206L120 212L124 206L126 240L114 240Z" fill="${oc === '#e9e4d8' ? '#26324f' : darken(oc, .45)}"/>`);
      out.push(`<path d="M96 186L118 238M144 186L122 238" stroke="${darken(oc, .4)}" stroke-width="3"/>`);
    } else if (outfit === 'turtleneck') {
      out.push(`<path d="M99 168H141V194Q120 202 99 194Z" fill="${darken(oc, .12)}"/><path d="M106 172V196M113 172V198M120 172V199M127 172V198M134 172V196" stroke="${darken(oc, .35)}" stroke-width="1.4" opacity=".7"/>`);
    }

    // ears
    out.push(`<ellipse cx="63" cy="110" rx="9" ry="14" fill="${skin}"/><ellipse cx="177" cy="110" rx="9" ry="14" fill="${skin}"/>`);
    out.push(`<path d="M63 102Q58 110 64 118M177 102Q182 110 176 118" fill="none" stroke="${skinD}" stroke-width="2" stroke-linecap="round"/>`);

    // head + cheeks + facial hair (clipped to the head shape)
    out.push(`<path d="${face}" fill="url(#${id('sk')})"/>`);
    out.push(`<g clip-path="url(#${id('fc')})"><ellipse cx="96" cy="130" rx="11" ry="7" fill="#ff6b6b" opacity=".13"/><ellipse cx="144" cy="130" rx="11" ry="7" fill="#ff6b6b" opacity=".13"/>`);
    const facial = O.facial[s.facial];
    const jaw = 'M60 116C62 150 90 180 120 182C150 180 178 150 180 116C172 140 154 150 140 150C132 141 108 141 100 150C86 150 68 140 60 116Z';
    const stache = 'M103 141Q111 134 120 138Q129 134 137 141Q128 144 120 142Q112 144 103 141Z';
    if (facial === 'stubble') out.push(`<path d="${jaw}" fill="${hc}" opacity=".22"/><path d="${stache}" fill="${hc}" opacity=".25"/>`);
    if (facial === 'beard') out.push(`<path d="${jaw}" fill="url(#${id('hr')})" opacity=".92"/><path d="${stache}" fill="${hc}"/>`);
    if (facial === 'goatee') out.push(`<path d="M106 154Q120 180 134 154Q127 161 120 161Q113 161 106 154Z" fill="${hc}"/><path d="${stache}" fill="${hc}"/>`);
    if (facial === 'mustache') out.push(`<path d="${stache}" fill="${hc}"/>`);
    out.push('</g>');

    // eyes
    const eye = (x, flip, clip) => {
      const tf = `translate(${x} 108)${flip ? ' scale(-1 1)' : ''}`;
      return `<path d="${eyeShape}" transform="${tf}" fill="#fbf8f4"/>` +
        `<g clip-path="url(#${clip})"><circle cx="${x}" cy="108.5" r="7.6" fill="url(#${id('ir')})"/><circle cx="${x}" cy="108.5" r="3.5" fill="#120c0c"/><rect x="${x - 16}" y="94" width="32" height="8" fill="#000" opacity=".12"/></g>` +
        `<circle cx="${x - 2.8}" cy="105.6" r="2.1" fill="#fff"/><circle cx="${x + 2.6}" cy="110.6" r=".9" fill="#fff" opacity=".85"/>` +
        `<path d="${eyeLid}" transform="${tf}" fill="none" stroke="#1a100c" stroke-width="2.6" stroke-linecap="round"/>`;
    };
    out.push(eye(98, false, id('el')), eye(142, true, id('er')));

    // brows
    const [bp, bw] = BROW[O.brows[s.brows]];
    const bc = darken(hc, .15);
    out.push(`<path d="${bp}" transform="translate(98 89)" fill="none" stroke="${bc}" stroke-width="${bw}" stroke-linecap="round"/>`);
    out.push(`<path d="${bp}" transform="translate(142 89) scale(-1 1)" fill="none" stroke="${bc}" stroke-width="${bw}" stroke-linecap="round"/>`);

    // nose + mouth
    out.push(`<path d="M121 112Q114 128 117 132Q121 135 127 131" fill="none" stroke="${darken(skin, .3)}" stroke-width="2.3" stroke-linecap="round"/><ellipse cx="118" cy="126" rx="4" ry="2.5" fill="#fff" opacity=".18"/>`);
    out.push(MOUTH[O.mouth[s.mouth]]);

    // hair in front
    if (hair.front) {
      out.push(`<path d="${hair.front}" fill="url(#${id('hr')})"${hair.fade ? ` opacity="${hair.fade}"` : ''}/>`);
      if (hair.extra) out.push(`<path d="${hair.extra}" fill="url(#${id('hr')})"/>`);
      if (hair.curls) {
        let c = '';
        for (let i = 0; i <= 12; i++) {
          const a = Math.PI * (1.05 + i * 0.075);
          c += `<circle cx="${(120 + Math.cos(a) * hair.curls).toFixed(1)}" cy="${(84 + Math.sin(a) * hair.curls * .82).toFixed(1)}" r="${i % 2 ? 12 : 14}"/>`;
        }
        out.push(`<g fill="url(#${id('hr')})">${c}</g>`);
      }
      if (hair.dots) {
        let d = '';
        for (let i = 0; i < 26; i++) d += `<circle cx="${70 + (i * 37) % 100}" cy="${38 + (i * 13) % 34}" r="2.2"/>`;
        out.push(`<g fill="${hcD}" opacity=".45">${d}</g>`);
      }
      (hair.lines || []).forEach(l => out.push(`<path d="${l}" fill="none" stroke="${hcL}" stroke-width="3" stroke-linecap="round" opacity=".45"/>`));
    } else if (hairKey === 'bald') {
      out.push('<ellipse cx="104" cy="60" rx="16" ry="8" fill="#fff" opacity=".16"/>');
    }

    // accessories
    const eyewear = O.eyewear[s.eyewear];
    if (eyewear === 'round') out.push('<g fill="#ffffff14" stroke="#2a2330" stroke-width="3"><circle cx="98" cy="108" r="15"/><circle cx="142" cy="108" r="15"/><path d="M113 106Q120 102 127 106" fill="none"/></g>');
    if (eyewear === 'square') out.push('<g fill="#ffffff14" stroke="#15121b" stroke-width="3.4"><rect x="80" y="96" width="36" height="25" rx="7"/><rect x="124" y="96" width="36" height="25" rx="7"/><path d="M116 104H124" fill="none"/></g>');
    if (eyewear === 'aviator') out.push('<g fill="#e5c15833" stroke="#e5c158" stroke-width="2.6"><path d="M80 98H116Q118 122 98 124Q80 122 80 98Z"/><path d="M124 98H160Q160 122 142 124Q122 122 124 98Z"/><path d="M116 101H124" fill="none"/></g>');
    if (eyewear === 'shades') out.push('<g stroke="#e5c158" stroke-width="2.4"><rect x="78" y="96" width="39" height="26" rx="11" fill="#141019"/><rect x="123" y="96" width="39" height="26" rx="11" fill="#141019"/><path d="M117 104H123"/></g><path d="M84 102L96 100M129 102L141 100" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/>');
    const ear = O.earrings[s.earrings];
    if (ear === 'studs') out.push('<circle cx="62" cy="124" r="3.6" fill="#f3d27a"/><circle cx="178" cy="124" r="3.6" fill="#f3d27a"/>');
    if (ear === 'hoops') out.push('<circle cx="61" cy="131" r="7.5" fill="none" stroke="#f3d27a" stroke-width="2.6"/><circle cx="179" cy="131" r="7.5" fill="none" stroke="#f3d27a" stroke-width="2.6"/>');
    const head = O.headwear[s.headwear];
    const knit = oc === '#141217' ? '#5b3794' : oc;
    if (head === 'headphones') out.push('<path d="M60 110C52 38 188 38 180 110" fill="none" stroke="#1b1720" stroke-width="10" stroke-linecap="round"/><path d="M60 110C52 38 188 38 180 110" fill="none" stroke="#e5c158" stroke-width="1.6" opacity=".7"/><rect x="47" y="94" width="22" height="36" rx="10" fill="#1b1720" stroke="#e5c158" stroke-width="2"/><rect x="171" y="94" width="22" height="36" rx="10" fill="#1b1720" stroke="#e5c158" stroke-width="2"/>');
    if (head === 'beanie') out.push(`<path d="M58 92C56 48 84 22 120 22C156 22 184 48 182 92Z" fill="${darken(knit, .05)}"/><rect x="54" y="82" width="132" height="20" rx="10" fill="${darken(knit, .25)}"/><circle cx="120" cy="18" r="9" fill="${lighten(knit, .3)}"/>`);
    if (head === 'cap') out.push('<path d="M60 86C60 44 88 28 120 28C152 28 180 44 180 86Z" fill="#17141c"/><path d="M118 80C150 76 192 82 208 94C182 98 150 96 118 92Z" fill="#0e0c12"/><g transform="translate(120 58)"><circle r="9" fill="none" stroke="#e5c158" stroke-width="2"/><path d="M-3-4.5L5 0-3 4.5Z" fill="#e5c158"/></g>');

    const meta = `<metadata>${JSON.stringify({ v: 3, s })}</metadata>`;
    const vb = o.crop === 'eye' ? '78 90 40 32' : o.crop === 'head' ? '36 8 168 176' : '0 0 240 240';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="240" height="240">${meta}${out.join('')}</svg>`;
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
  let dlg = null, raf = 0;
  const $ = sel => dlg && dlg.querySelector(sel);

  function thumbFor(k, i) {
    if (SWATCH.has(k)) return `<i class="ma-av-swatch" style="background:${O[k][i]}"></i>`;
    if (k === 'bg') { const c = BG[O.bg[i]]; return `<i class="ma-av-swatch" style="background:radial-gradient(circle at 50% 38%,${c[0]},${c[1]} 55%,${c[2]})"></i>`; }
    const crop = EYEROW.has(k) ? 'eye' : BODYROW.has(k) ? null : 'head';
    return `<img alt="" decoding="async" src="${uri(render({ ...S, [k]: i }, { crop, prefix: 't' }))}">`;
  }
  function label(k, i) {
    const v = String(O[k][i]);
    return v.startsWith('#') ? `${T.rows[k]} ${i + 1}` : v.replace(/^\w/, c => c.toUpperCase());
  }
  function renderRows() {
    const root = $('#avatar-controls');
    if (!root) return;
    root.innerHTML = TABS[tab].map(k => {
      const cls = SWATCH.has(k) || k === 'bg' ? 'is-swatch' : EYEROW.has(k) ? 'is-eye' : 'is-thumb';
      const choices = O[k].map((_, i) => `<button type="button" class="ma-av-choice ${cls}${S[k] === i ? ' is-selected' : ''}" data-k="${k}" data-i="${i}" aria-pressed="${S[k] === i}" aria-label="${label(k, i)}" title="${label(k, i)}">${thumbFor(k, i)}</button>`).join('');
      return `<section class="ma-av-row"><h3>${svgIcon(k, 'ma-av-rowicon')}<span>${T.rows[k]}</span></h3><div class="ma-av-choices" role="group" aria-label="${T.rows[k]}">${choices}</div></section>`;
    }).join('');
  }
  function renderPreview() {
    const img = $('#avatar-live-img');
    if (img) img.src = uri(render(S, { prefix: 'p' }));
    dlg.querySelectorAll('.ma-av-preset').forEach((b, i) => {
      const on = i === presetIndex; b.classList.toggle('is-selected', on); b.setAttribute('aria-pressed', String(on));
    });
  }
  function update() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      // Keep the horizontal scroll of each row while its thumbnails refresh.
      const scroll = [...dlg.querySelectorAll('.ma-av-choices')].map(x => x.scrollLeft);
      renderPreview(); renderRows();
      dlg.querySelectorAll('.ma-av-choices').forEach((x, i) => { x.scrollLeft = scroll[i] || 0; });
      pop();
    });
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
    update();
  }

  /* ---------- dialog ---------- */
  function build() {
    dlg = document.createElement('dialog');
    dlg.id = 'avatar-maker-dialog';
    dlg.className = 'ma-av-dialog';
    dlg.setAttribute('aria-labelledby', 'avatar-maker-title');
    const presets = PRESETS.map((pr, i) => `<button type="button" class="ma-av-preset" data-preset="${i}" aria-pressed="false" aria-label="${T.look} ${i + 1}"><img alt="" decoding="async" src="${uri(render(pr, { crop: 'head', prefix: 'r' + i }))}"></button>`).join('');
    const tabs = Object.keys(TABS).map(k => `<button type="button" role="tab" class="ma-av-tab" data-tab="${k}" aria-selected="false">${svgIcon(k, 'ma-av-tabicon')}<span>${T.tabs[k]}</span></button>`).join('');
    dlg.innerHTML = `<div class="ma-av-sheet">
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
      if (choice) { S[choice.dataset.k] = Number(choice.dataset.i); presetIndex = PRESETS.findIndex(pr => same(pr, S)); update(); return; }
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
        presetIndex = -1; update();
      }
      else if (a === 'reset') { S = { ...DEFAULT }; presetIndex = 0; update(); }
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
      setTab('appearance');
      renderPreview();
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
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
