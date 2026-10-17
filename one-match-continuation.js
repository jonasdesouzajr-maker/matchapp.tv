/* Optional, bounded web-to-Android continuation. Existing matcher APIs own all state. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.MatchAppMatchContinuation = api; api.boot(root); }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const fields = Object.freeze({category:'cat',mood:'mood',platform:'plat',genre:'genre',vibe:'vibe',decade:'decade',rating:'rating'});
  const languages = ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
  const rows = {
    en:['Take these choices with you.','Continue in the Android app with these filters. Your web match stays here.','Get the Android app','Open app','Stay on the web','Your choices are ready.','Restore your filters, then choose when to find another match.','Restore choices','Your choices are restored. Find your next match when you are ready.','Some choices are unavailable. Your current filters are unchanged.'],
    'pt-BR':['Leve suas escolhas com você.','Continue no app Android com estes filtros. Seu match continua aqui na web.','Obter o app Android','Abrir app','Continuar na web','Suas escolhas estão prontas.','Restaure seus filtros e escolha quando buscar outro match.','Restaurar escolhas','Suas escolhas foram restauradas. Busque seu próximo match quando quiser.','Algumas escolhas estão indisponíveis. Seus filtros atuais não foram alterados.'],
    es:['Lleva tus elecciones contigo.','Continúa en la app Android con estos filtros. Tu match sigue aquí en la web.','Obtener la app Android','Abrir app','Seguir en la web','Tus elecciones están listas.','Restaura tus filtros y decide cuándo buscar otro match.','Restaurar elecciones','Tus elecciones se han restaurado. Busca tu próximo match cuando quieras.','Algunas elecciones no están disponibles. Tus filtros actuales no han cambiado.'],
    fr:['Emportez vos choix avec vous.','Continuez dans l’application Android avec ces filtres. Votre match reste ici sur le web.','Obtenir l’application Android','Ouvrir l’application','Rester sur le web','Vos choix sont prêts.','Restaurez vos filtres, puis choisissez quand chercher un autre match.','Restaurer mes choix','Vos choix sont restaurés. Cherchez votre prochain match quand vous le souhaitez.','Certains choix ne sont pas disponibles. Vos filtres actuels restent inchangés.'],
    de:['Nimm deine Auswahl mit.','Nutze diese Filter in der Android-App weiter. Dein Match bleibt hier im Web.','Android-App herunterladen','App öffnen','Im Web bleiben','Deine Auswahl ist bereit.','Stelle deine Filter wieder her und entscheide, wann du ein neues Match suchst.','Auswahl wiederherstellen','Deine Auswahl wurde wiederhergestellt. Suche dein nächstes Match, wenn du bereit bist.','Einige Optionen sind nicht verfügbar. Deine aktuellen Filter bleiben unverändert.'],
    it:['Porta le tue scelte con te.','Continua nell’app Android con questi filtri. Il tuo match resta qui sul web.','Scarica l’app Android','Apri l’app','Resta sul web','Le tue scelte sono pronte.','Ripristina i filtri e decidi quando cercare un altro match.','Ripristina le scelte','Le tue scelte sono state ripristinate. Cerca il prossimo match quando vuoi.','Alcune scelte non sono disponibili. I filtri attuali restano invariati.'],
    tr:['Seçimlerini yanında götür.','Bu filtrelerle Android uygulamasında devam et. Webdeki eşleşmen burada kalır.','Android uygulamasını edin','Uygulamayı aç','Webde kal','Seçimlerin hazır.','Filtrelerini geri yükle ve yeni bir eşleşmeyi ne zaman arayacağına karar ver.','Seçimleri geri yükle','Seçimlerin geri yüklendi. Hazır olduğunda sonraki eşleşmeni bul.','Bazı seçimler kullanılamıyor. Mevcut filtrelerin değişmedi.'],
    ru:['Возьмите свой выбор с собой.','Продолжите с этими фильтрами в приложении Android. Ваша веб-подборка останется здесь.','Скачать приложение Android','Открыть приложение','Остаться в браузере','Ваш выбор готов.','Восстановите фильтры и решите, когда искать новую рекомендацию.','Восстановить выбор','Ваш выбор восстановлен. Найдите следующую рекомендацию, когда будете готовы.','Некоторые варианты недоступны. Текущие фильтры не изменены.'],
    ar:['اصطحب اختياراتك معك.','تابع بهذه الفلاتر في تطبيق Android. تبقى توصيتك هنا على الويب.','تنزيل تطبيق Android','فتح التطبيق','البقاء على الويب','اختياراتك جاهزة.','استعد فلاترك ثم اختر متى تبحث عن توصية أخرى.','استعادة الاختيارات','تمت استعادة اختياراتك. ابحث عن توصيتك التالية عندما تكون مستعدًا.','بعض الخيارات غير متاحة. لم تتغير فلاترك الحالية.'],
    hi:['अपने चुनाव साथ ले जाएँ।','इन्हीं फ़िल्टर के साथ Android ऐप में जारी रखें। आपका वेब मैच यहीं रहेगा।','Android ऐप पाएँ','ऐप खोलें','वेब पर रहें','आपके चुनाव तैयार हैं।','अपने फ़िल्टर बहाल करें और तय करें कि अगला मैच कब खोजना है।','चुनाव बहाल करें','आपके चुनाव बहाल हो गए हैं। जब तैयार हों तब अगला मैच खोजें।','कुछ विकल्प उपलब्ध नहीं हैं। आपके मौजूदा फ़िल्टर नहीं बदले गए हैं।'],
    id:['Bawa pilihanmu bersama.','Lanjutkan dengan filter ini di aplikasi Android. Match webmu tetap di sini.','Dapatkan aplikasi Android','Buka aplikasi','Tetap di web','Pilihanmu sudah siap.','Pulihkan filter, lalu tentukan kapan mencari match berikutnya.','Pulihkan pilihan','Pilihanmu telah dipulihkan. Cari match berikutnya saat kamu siap.','Beberapa pilihan tidak tersedia. Filter saat ini tidak berubah.'],
    ja:['選んだ条件をアプリへ。','この条件でAndroidアプリを続けられます。ウェブの結果はここに残ります。','Androidアプリを入手','アプリを開く','ウェブを続ける','選んだ条件を引き継げます。','条件を復元してから、次の作品を探すタイミングを選べます。','条件を復元','条件を復元しました。準備ができたら次の作品を探せます。','一部の条件は利用できません。現在の条件は変更していません。'],
    ko:['선택한 조건을 가져가세요.','이 조건으로 Android 앱에서 계속하세요. 웹 추천 결과는 여기에 남습니다.','Android 앱 받기','앱 열기','웹에서 계속','선택한 조건이 준비됐어요.','필터를 복원한 뒤 다음 추천을 찾을 때를 선택하세요.','선택 복원','선택한 조건을 복원했어요. 준비되면 다음 추천을 찾아보세요.','일부 선택을 사용할 수 없어요. 현재 필터는 변경하지 않았어요.'],
    zh:['把你的选择带到应用中。','使用这些筛选条件在 Android 应用中继续。网页推荐结果会保留在这里。','获取 Android 应用','打开应用','留在网页','你的选择已准备好。','恢复筛选条件，再决定何时寻找下一个推荐。','恢复选择','已恢复你的选择。准备好后即可寻找下一个推荐。','部分选项暂不可用。当前筛选条件未更改。']
  };
  function parse(raw) {
    if (typeof raw !== 'string' || !raw || raw.length > 2400 || /%(?![\da-f]{2})/i.test(raw)) return null;
    const params = new URLSearchParams(raw), result = Object.create(null), seen = new Set();
    for (const [key, value] of params) {
      if (!Object.prototype.hasOwnProperty.call(fields,key) || seen.has(key) || seen.size >= 7) return null;
      seen.add(key);
      const choices = value ? value.split('|') : [];
      if (choices.length > 40 || new Set(choices).size !== choices.length || choices.some(v => !/^[A-Za-z0-9 &+./_-]{1,64}$/.test(v) || v.trim() !== v || v.includes('//'))) return null;
      result[fields[key]] = choices;
    }
    return seen.size ? result : null;
  }
  function serialize(criteria) {
    const params = new URLSearchParams();
    for (const [field,key] of Object.entries(fields)) {
      const value = criteria && criteria[key];
      if (!Array.isArray(value) || value.some(choice => typeof choice !== 'string')) return '';
      params.set(field,value.join('|'));
    }
    const raw = params.toString();
    return parse(raw) ? raw : '';
  }
  function appUrl(raw,language) {
    if (!parse(raw)) throw Error('invalid_criteria');
    const url = new URL('https://matchapp.tv/');
    if (languages.includes(language)) url.searchParams.set('lang',language);
    url.searchParams.set('app_resume','1');
    url.hash = 'ma-continue=' + encodeURIComponent(raw);
    return url.href;
  }
  function playUrl(raw,language) {
    if (!parse(raw)) throw Error('invalid_criteria');
    const ref = new URLSearchParams({utm_source:'matchapp_tv',utm_medium:'web_to_app',utm_campaign:'one_match_after_aha',criteria:raw});
    if (languages.includes(language)) ref.set('lang',language);
    if (ref.toString().length > 4096) throw Error('criteria_too_long');
    const url = new URL('https://play.google.com/store/apps/details');
    url.searchParams.set('id','com.jonas.papercup');url.searchParams.set('referrer',ref.toString());
    return url.href;
  }
  function intentUrl(raw,language) {
    const url = appUrl(raw,language);
    return 'intent:' + url.slice(6) + '#Intent;scheme=https;package=com.jonas.papercup;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
  }
  function locale(w) {
    let saved='';try { saved=w.localStorage.getItem('match_lang')||''; } catch (_) {}
    const value=String(w.MATCH_LANG||saved||w.document.documentElement.lang||'en');
    const lang=/^pt(?:-|$)/i.test(value)?'pt-BR':value.toLowerCase().split('-')[0];
    return languages.includes(lang)?lang:'en';
  }
  function boot(w) {
    const d=w.document;
    if (!d || !['/','/index.html'].includes(w.location.pathname) || d.documentElement.dataset.matchappMode === 'kids' || w.__matchContinuationReady) return;
    w.__matchContinuationReady=true;
    let pending=null, restored=false, restoreError=false, invitation='', stayed=false;
    // Consume only our explicit continuation fragment before analytics sees it.
    if (w.location.hash.startsWith('#ma-continue=')) {
      try { pending=parse(decodeURIComponent(w.location.hash.slice(13))); } catch (_) {}
      try { w.history.replaceState(w.history.state,'',w.location.pathname+w.location.search); } catch (_) { pending=null; }
    }
    function node(tag,text,cls) { const n=d.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n; }
    function copy() { return rows[locale(w)]; }
    function eligible() {
      try { return !!w.MatchAppGrowthCore?.androidBrowser(w) && Number(w.localStorage.getItem('matchapp_growth_install_dismissed_v1')||0)<=Date.now(); } catch (_) { return false; }
    }
    function reveal() {
      const slot=d.getElementById('one-match-app-slot');
      if (!slot || !invitation || (!stayed && !eligible())) return;
      const c=copy(),card=node('section',null,'ma-match-continuation');card.lang=locale(w);card.dir=card.lang==='ar'?'rtl':'ltr';
      if (stayed) { card.append(node('p',c[4]));slot.replaceChildren(card);return; }
      let store;
      try { store=playUrl(invitation,locale(w)); } catch (_) { return; }
      const title=node('h3',c[0]),body=node('p',c[1]),actions=node('div',null,'ma-continuation-actions');
      const install=node('a',c[2],'ma-continuation-primary no-depth');install.href=store;
      const open=node('a',c[3],'no-depth');open.href=intentUrl(invitation,locale(w));
      const stay=node('button',c[4],'no-depth');stay.type='button';
      stay.addEventListener('click',()=>{try { w.localStorage.setItem('matchapp_growth_install_dismissed_v1',String(Date.now()+7*86400000)); } catch (_) {}stayed=true;reveal();});
      actions.append(install,open,stay);card.append(title,body,actions);slot.replaceChildren(card);slot.hidden=false;
    }
    function restorePrompt() {
      if (!pending && !restored) return;
      const slot=d.getElementById('one-match-restore-slot');if (!slot) return;
      const c=copy(),card=node('section',null,'ma-match-continuation');card.lang=locale(w);card.dir=card.lang==='ar'?'rtl':'ltr';
      const title=node('h3',c[5]),body=node('p',c[6]),restore=node('button',c[7],'ma-continuation-primary no-depth'),status=node('p',restored?c[8]:restoreError?c[9]:'');restore.type='button';restore.disabled=restored;status.setAttribute('role','status');
      restore.addEventListener('click',()=>{
        if (!pending || restored) return;
        const available=Object.entries(fields).every(([field,key])=>!pending[key]||pending[key].every(value=>Array.from(d.getElementById('q-'+field)?.options||[]).some(option=>option.value===value&&!option.disabled&&!option.closest('optgroup')?.disabled)));
        if (!available || typeof w.setMatchCriteria!=='function' || typeof w.getMatchCriteria!=='function') { restoreError=true;status.textContent=c[9];return; }
        // The existing public setter remains the only state writer. Reject an
        // incompatible handoff rather than reporting a silently pruned filter as restored.
        const previous=w.getMatchCriteria();
        try {
          w.setMatchCriteria(pending);
          const actual=w.getMatchCriteria();
          if (!Object.keys(pending).every(key=>JSON.stringify(actual[key])===JSON.stringify(pending[key]))) throw Error('unavailable_choices');
          pending=null;restored=true;restoreError=false;restore.disabled=true;status.textContent=c[8];
        } catch (_) { try { w.setMatchCriteria(previous); } catch (_) {}restoreError=true;status.textContent=c[9]; }
      });
      card.append(title,body,restore,status);slot.replaceChildren(card);slot.hidden=false;
    }
    const start=()=>{
      if (d.body?.classList.contains('kids-mode') || d.documentElement.dataset.matchappMode==='kids') return;
      restorePrompt();
      // Reserve the invitation before the hidden result is first revealed.
      const slot=d.getElementById('one-match-app-slot');if(slot&&eligible())slot.hidden=false;
      d.addEventListener('matchapp:newmatch',()=>{
        if (!eligible() || typeof w.getMatchCriteria!=='function') return;
        invitation=serialize(w.getMatchCriteria());stayed=false;reveal();
      });
      d.addEventListener('matchapp:langchange',()=>{restorePrompt();reveal();});
    };
    if (d.readyState==='loading') d.addEventListener('DOMContentLoaded',start,{once:true});else start();
  }
  return Object.freeze({fields,languages,rows,parse,serialize,appUrl,playUrl,intentUrl,boot});
});
