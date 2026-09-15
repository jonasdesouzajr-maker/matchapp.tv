(function(){
  'use strict';

  const copy={
    en:{start:'I’d start with {title} — it feels like the strongest fit for what you’re asking for.'},
    'pt-BR':{start:'Eu começaria por {title} — parece a melhor combinação para o que você está procurando.'},
    es:{start:'Yo empezaría con {title} — parece la opción que mejor encaja con lo que buscas.'},
    fr:{start:'Je commencerais par {title} — c’est celui qui correspond le mieux à ce que tu cherches.'},
    de:{start:'Ich würde mit {title} anfangen — das passt am stärksten zu dem, was du suchst.'},
    it:{start:'Io inizierei da {title} — mi sembra la scelta più adatta a quello che stai cercando.'},
    tr:{start:'Ben {title} ile başlardım — aradığın şeye en iyi uyan seçenek gibi görünüyor.'},
    ru:{start:'Я бы начал с {title} — похоже, это лучше всего подходит под твой запрос.'},
    ar:{start:'سأبدأ بـ {title} — يبدو الأقرب فعلًا لما تبحث عنه.'},
    hi:{start:'मैं {title} से शुरू करूँगा — यह आपकी पसंद के सबसे करीब लगता है।'},
    id:{start:'Aku akan mulai dari {title} — ini terasa paling cocok dengan yang kamu cari.'},
    ja:{start:'まずは「{title}」から観るのがおすすめです。今の希望にはこれがいちばん合いそうです。'},
    ko:{start:'저라면 {title}부터 볼 것 같아요. 지금 찾는 분위기에 가장 잘 맞습니다.'},
    zh:{start:'我会先从《{title}》开始——它最符合你现在想找的感觉。'}
  };

  function lang(){return window.MATCH_LANG||document.documentElement.lang||'en'}
  function text(k){const l=lang();return(copy[l]||copy[String(l).split('-')[0]]||copy.en)[k]}
  function nickname(){try{return String(localStorage.getItem('match_user_nickname')||'').trim().slice(0,40)}catch(_){return''}}
  function cleanGeneric(answer){
    return String(answer||'')
      .replace(/^\s*(?:based on (?:your|the) (?:request|query)[,.:]?|here are (?:some|a few) (?:recommendations|options)[,.:]?|as an ai[,.:]?)[\s-]*/i,'')
      .replace(/\s{2,}/g,' ')
      .trim();
  }
  function humanize(payload,history){
    if(!payload||typeof payload.answer!=='string')return payload;
    let answer=cleanGeneric(payload.answer);
    const name=nickname();
    const firstTurn=!Array.isArray(history)||history.length===0;
    if(firstTurn&&name&&!answer.toLocaleLowerCase().startsWith(name.toLocaleLowerCase()))answer=`${name}, ${answer.charAt(0).toLocaleLowerCase()}${answer.slice(1)}`;
    const firstTitle=payload.results?.[0]?.title;
    if(firstTitle&&answer.length<155&&!answer.toLocaleLowerCase().includes(String(firstTitle).toLocaleLowerCase())){
      answer += ` ${text('start').replace('{title}',firstTitle)}`;
    }
    payload.answer=answer;
    return payload;
  }

  function patchConversation(){
    if(typeof window.askAIConversational!=='function'||window.askAIConversational.__humanPatched)return false;
    const original=window.askAIConversational;
    const wrapped=async function(question,history){return humanize(await original.call(this,question,history),history)};
    wrapped.__humanPatched=true;
    wrapped.__original=original;
    window.askAIConversational=wrapped;
    return true;
  }

  async function speakHuman(textValue,btn){
    if(!('speechSynthesis'in window)){
      window.showToast?.(typeof window.t==='function'?window.t('discover.noTts'):'Voice playback is not supported in this browser.',true);
      return;
    }
    if(btn?.classList.contains('speaking')){
      speechSynthesis.cancel();btn.classList.remove('speaking');return;
    }
    speechSynthesis.cancel();
    const S=window.MatchSettings;
    let voices=[];
    try{voices=S?.listVoices?await S.listVoices():speechSynthesis.getVoices()}catch(_){voices=speechSynthesis.getVoices()}
    const utter=new SpeechSynthesisUtterance(String(textValue||''));
    const v=S?.resolveVoice?S.resolveVoice(voices,lang()):null;
    if(v){utter.voice=v;utter.lang=v.lang}else utter.lang=lang();
    const configuredRate=Number(S?.get?.('voiceRate'));
    const configuredPitch=Number(S?.get?.('voicePitch'));
    utter.rate=Number.isFinite(configuredRate)&&configuredRate>0?configuredRate:.96;
    utter.pitch=Number.isFinite(configuredPitch)&&configuredPitch>0?configuredPitch:.98;
    utter.volume=1;
    document.querySelectorAll('.discover-speak.speaking').forEach(b=>b.classList.remove('speaking'));
    if(btn)btn.classList.add('speaking');
    utter.onend=()=>btn?.classList.remove('speaking');
    utter.onerror=()=>btn?.classList.remove('speaking');
    speechSynthesis.speak(utter);
  }

  function patchReadAloud(){
    if(typeof window.readAloud!=='function'||window.readAloud.__humanPatched)return false;
    speakHuman.__humanPatched=true;
    speakHuman.__original=window.readAloud;
    window.readAloud=speakHuman;
    return true;
  }

  let tries=0;
  function patch(){
    const a=patchConversation(),b=patchReadAloud();
    if((a||window.askAIConversational?.__humanPatched)&&(b||window.readAloud?.__humanPatched))return;
    if(++tries<80)setTimeout(patch,125);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch,{once:true});else patch();
  document.addEventListener('matchapp:langchange',()=>{try{speechSynthesis.cancel()}catch(_){}});
})();
