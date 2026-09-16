/* Locked identity (no star sign) + multiple-choice taste questionnaire.
   Taste steers Match results only — Ask AI is left alone. */
(function () {
  'use strict';
  const KEY = 'match_taste';
  const SEEN_KEY = 'match_seenList';
  const Q = [
    { id: 'afterglow', q: 'When the credits roll, you want to feel…', map: 'mood', choices: [
      { id: 'light', label: 'Lighter than I started', moods: ['light and feel-good', 'cozy comfort watch'] },
      { id: 'moved', label: 'A little wrecked, in a good way', moods: ['heartbreaking', 'inspiring'] },
      { id: 'wired', label: 'Heart still racing', moods: ['intense and thrilling', 'epic and adventurous'] },
      { id: 'thinking', label: 'Turning it over in my head', moods: ['mind-bending', 'dark and gritty'] }
    ]},
    { id: 'pace', q: 'Your ideal night-in pace is…', map: 'vibe', choices: [
      { id: 'one', label: 'One complete film', vibes: ['prestige and critically acclaimed'] },
      { id: 'binge', label: 'Three tight episodes, then stop', vibes: ['fast-paced binge-worthy'] },
      { id: 'background', label: 'On while I do something else', vibes: ['easy background watch'] },
      { id: 'slow', label: 'Slow burn I can live in', vibes: ['slow burn', 'long running series'] }
    ]},
    { id: 'heat', q: 'How sharp can the content be?', map: 'rating', choices: [
      { id: 'family', label: 'Keep it family-safe', ratings: ['all ages family friendly', 'kids'] },
      { id: 'teen', label: 'Teen / PG-13 is the ceiling', ratings: ['teen PG-13', 'any'] },
      { id: 'adult', label: 'Adult is fine when it earns it', ratings: ['mature adults only R rated', 'teen PG-13', 'any'] },
      { id: 'any', label: 'No ceiling — surprise me', ratings: ['any'] }
    ]},
    { id: 'world', q: 'Which worlds do you walk into first?', map: 'mood', choices: [
      { id: 'real', label: 'Real rooms, real stakes', moods: ['dark and gritty', 'inspiring'] },
      { id: 'heightened', label: 'A little larger than life', moods: ['epic and adventurous', 'funny'] },
      { id: 'spec', label: 'Sci-fi, fantasy, other rules', moods: ['mind-bending', 'epic and adventurous'] },
      { id: 'past', label: 'Another century', moods: ['nostalgic', 'romantic'] }
    ]},
    { id: 'laugh', q: 'Humor you actually trust…', map: 'mood', choices: [
      { id: 'none', label: 'I do not need jokes', moods: ['intense and thrilling'] },
      { id: 'warm', label: 'Warm and human', moods: ['funny', 'light and feel-good'] },
      { id: 'sharp', label: 'Sharp satire', moods: ['funny', 'dark and gritty'] },
      { id: 'dark', label: 'Dark enough to sting', moods: ['funny', 'dark and gritty'] }
    ]},
    { id: 'tension', q: 'How do you like tension?', map: 'mood', choices: [
      { id: 'comfort', label: 'Almost none — comfort only', moods: ['cozy comfort watch', 'light and feel-good'] },
      { id: 'dread', label: 'Slow dread', moods: ['scary', 'dark and gritty'] },
      { id: 'twist', label: 'Twists I did not see', moods: ['mind-bending', 'intense and thrilling'] },
      { id: 'nonstop', label: 'Non-stop set pieces', moods: ['intense and thrilling', 'epic and adventurous'] }
    ]},
    { id: 'company', q: 'Who is usually on the sofa?', map: 'meta', choices: [
      { id: 'solo', label: 'Just me' },
      { id: 'partner', label: 'Partner' },
      { id: 'family', label: 'Family, mixed ages', ratings: ['all ages family friendly', 'teen PG-13'] },
      { id: 'friends', label: 'Friends who talk through it' }
    ]},
    { id: 'format', q: 'Formats you want in the mix…', map: 'cat', multi: true, max: 4, choices: [
      { id: 'film', label: 'Films', cats: ['movie'] },
      { id: 'series', label: 'Series', cats: ['series'] },
      { id: 'limited', label: 'Limited series', cats: ['limited series'] },
      { id: 'kdrama', label: 'K-drama', cats: ['K-drama'] },
      { id: 'anime', label: 'Anime', cats: ['anime'] },
      { id: 'novela', label: 'Novela', cats: ['novela brasileira'] },
      { id: 'docs', label: 'Documentaries', cats: ['documentary'] },
      { id: 'audio', label: 'Music / podcasts', cats: ['music album', 'podcast'] }
    ]},
    { id: 'avoid', q: 'Leave these off my Match results', map: 'avoid', multi: true, max: 4, choices: [
      { id: 'horror', label: 'Horror', moods: ['scary'] },
      { id: 'reality', label: 'Reality TV', cats: ['reality show'] },
      { id: 'sport', label: 'Sports broadcasts', cats: ['sports'] },
      { id: 'news', label: 'News / current affairs', cats: ['news'] },
      { id: 'kids', label: 'Kids titles', cats: ['kids'] },
      { id: 'romance', label: 'Romance-first', moods: ['romantic'] }
    ]},
    { id: 'seen', q: 'Worlds you already know by heart (they skip Match, saved as Seen)', map: 'seen', multi: true, max: 3, choices: [
      { id: 'stranger', label: 'Stranger Things', titles: ['Stranger Things'] },
      { id: 'got', label: 'Game of Thrones / House of the Dragon', titles: ['Game of Thrones', 'House of the Dragon'] },
      { id: 'office', label: 'The Office', titles: ['The Office'] },
      { id: 'friends', label: 'Friends', titles: ['Friends'] },
      { id: 'mandalorian', label: 'The Mandalorian', titles: ['The Mandalorian'] },
      { id: 'last-of-us', label: 'The Last of Us', titles: ['The Last of Us'] },
      { id: 'squid', label: 'Squid Game', titles: ['Squid Game'] },
      { id: 'bridgerton', label: 'Bridgerton', titles: ['Bridgerton'] },
      { id: 'harry', label: 'Harry Potter films', titles: ["Harry Potter and the Sorcerer's Stone", 'Harry Potter and the Chamber of Secrets'] },
      { id: 'none', label: 'None of these', titles: [] }
    ]}
  ];
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')||{answers:{},done:false};}catch(_){return{answers:{},done:false};}}
  function save(state){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}
    window.MATCH_TASTE=compile(state);document.dispatchEvent(new CustomEvent('matchapp:tastechange',{detail:window.MATCH_TASTE}));}
  function compile(state){const moods=[],vibes=[],cats=[],ratings=[],avoidMoods=[],avoidCats=[],exclude=[];
    Q.forEach(q=>{const picked=state.answers[q.id];if(!picked)return;const ids=Array.isArray(picked)?picked:[picked];
      ids.forEach(id=>{const c=q.choices.find(x=>x.id===id);if(!c)return;
        (c.moods||[]).forEach(v=>(q.map==='avoid'?avoidMoods:moods).push(v));
        (c.vibes||[]).forEach(v=>vibes.push(v));(c.cats||[]).forEach(v=>(q.map==='avoid'?avoidCats:cats).push(v));
        (c.ratings||[]).forEach(v=>ratings.push(v));(c.titles||[]).forEach(v=>exclude.push(v));});});
    return{done:!!state.done,moods:[...new Set(moods)],vibes:[...new Set(vibes)],cats:[...new Set(cats)],ratings:[...new Set(ratings)],avoidMoods:[...new Set(avoidMoods)],avoidCats:[...new Set(avoidCats)],exclude:[...new Set(exclude)]};}
  function applySeen(exclude){if(!exclude.length)return;let seen=[];try{seen=JSON.parse(localStorage.getItem(SEEN_KEY)||'[]');}catch(_){seen=[];}if(!Array.isArray(seen))seen=[];
    const have=new Set(seen.map(x=>String(x.title||x).toLowerCase()));
    exclude.forEach(title=>{if(have.has(title.toLowerCase()))return;seen.push({title,platform:'',at:Date.now(),source:'taste'});have.add(title.toLowerCase());window.SESSION_SHOWN?.add?.(title);});
    try{localStorage.setItem(SEEN_KEY,JSON.stringify(seen));}catch(_){}}
  window.MATCH_TASTE=compile(load());
  window.tasteAllowsEntry=function(entry){const t=window.MATCH_TASTE;if(!t||!entry)return true;const title=String(entry.title||'');
    if(t.exclude.some(x=>title.toLowerCase()===x.toLowerCase()||title.toLowerCase().includes(x.toLowerCase())))return false;
    const em=entry.moods||[],ec=entry.cats||[],er=entry.ratings||[];
    if(t.avoidMoods.length&&em.some(m=>t.avoidMoods.includes(m)))return false;
    if(t.avoidCats.length&&ec.some(c=>t.avoidCats.includes(c)))return false;
    if(t.cats.length&&ec.length&&!ec.some(c=>t.cats.includes(c)))return false;
    if(t.ratings.length&&!t.ratings.includes('any')&&er.length&&!er.some(r=>t.ratings.includes(r)))return false;return true;};
  const prevBlocked=window.isBlockedEntry;
  window.isBlockedEntry=function(entry){if(prevBlocked&&prevBlocked(entry))return true;return !window.tasteAllowsEntry(entry);};
  function hideStarSign(){['profile-starsign','lock-val-sign','lock-val-sign-trait'].forEach(id=>{const el=document.getElementById(id);if(!el)return;const wrap=el.closest('.input-group, .identity-tile')||el;wrap.style.display='none';wrap.setAttribute('hidden','');});
    const sel=document.getElementById('profile-starsign');if(sel&&!sel.value){const opt=document.createElement('option');opt.value='None';opt.textContent='None';sel.appendChild(opt);sel.value='None';}}
  function wrapSave(){const orig=window.saveProfileData;if(!orig||orig.__tasteWrapped)return;const wrapped=async function(){const sel=document.getElementById('profile-starsign');if(sel&&!sel.value)sel.value='None';return orig.apply(this,arguments);};wrapped.__tasteWrapped=true;window.saveProfileData=wrapped;}
  async function persistRemote(state){const sb=window.supabaseClient;if(!sb)return;try{const {data:{user}}=await sb.auth.getUser();if(!user)return;await sb.from('user_taste').upsert({user_id:user.id,answers:state.answers,exclude_titles:window.MATCH_TASTE.exclude,moods:window.MATCH_TASTE.moods,vibes:window.MATCH_TASTE.vibes,cats:window.MATCH_TASTE.cats,ratings:window.MATCH_TASTE.ratings,completed_at:state.done?new Date().toISOString():null,updated_at:new Date().toISOString()});}catch(_){}}
  function renderQuiz(){if(!location.pathname.includes('/profile/'))return;if(document.getElementById('taste-quiz'))return;
    const host=document.getElementById('save-profile-btn')?.parentElement||document.querySelector('.premium-card')||document.body;
    const box=document.createElement('section');box.id='taste-quiz';box.className='taste-quiz premium-card';const state=load();
    box.innerHTML='<h2>Taste questionnaire</h2><p class="taste-lead">These answers steer Match only. Ask AI stays a free conversation. Required identity stays locked after you save it. Pick one unless the question says otherwise.</p><form id="taste-form"></form><p class="taste-status" hidden></p><button type="button" class="gold-btn" id="taste-save">Save taste profile</button>';
    host.appendChild(box);const form=box.querySelector('#taste-form');
    Q.forEach(q=>{const fs=document.createElement('fieldset');fs.className='taste-q';fs.innerHTML='<legend>'+q.q+(q.multi?' <span class="taste-multi">up to '+q.max+'</span>':'')+'</legend>';
      q.choices.forEach(c=>{const id='taste-'+q.id+'-'+c.id;const lab=document.createElement('label');lab.className='taste-choice';lab.setAttribute('for',id);
        const input=document.createElement('input');input.type=q.multi?'checkbox':'radio';input.name=q.id;input.id=id;input.value=c.id;
        const picked=state.answers[q.id];if(q.multi&&Array.isArray(picked))input.checked=picked.includes(c.id);else if(picked===c.id)input.checked=true;
        lab.append(input,document.createTextNode(' '+c.label));fs.appendChild(lab);});form.appendChild(fs);});
    box.querySelector('#taste-save').addEventListener('click',async()=>{const next={answers:{},done:false};let missing=false;
      Q.forEach(q=>{const nodes=[...form.querySelectorAll('[name="'+q.id+'"]:checked')].map(n=>n.value);if(!nodes.length)missing=true;if(q.multi&&nodes.length>(q.max||3))nodes.length=q.max;next.answers[q.id]=q.multi?nodes:nodes[0];});
      const status=box.querySelector('.taste-status');if(missing){status.hidden=false;status.textContent='Answer every question to lock your taste.';return;}
      next.done=true;save(next);applySeen(window.MATCH_TASTE.exclude);await persistRemote(next);status.hidden=false;status.textContent='Taste saved. Match will skip titles you already know and lean toward your pace, heat and formats.';});}
  function boot(){hideStarSign();wrapSave();renderQuiz();applySeen(window.MATCH_TASTE.exclude||[]);document.addEventListener('matchapp:profilehydrated',()=>{hideStarSign();wrapSave();renderQuiz();});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
