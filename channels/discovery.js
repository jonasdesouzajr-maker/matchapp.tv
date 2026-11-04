/* Same-origin editorial destinations. Chat text is never used as a URL. */
(function () {
  'use strict';
  const labels = window.MatchAppChannelLabels;
  const topics = /(?:\btech(?:nology|nologies|nological)?\b|\bAI\b|\bGit\b|DevOps|CS50|Scratch|JavaScript|programming|coding|computer science|neural network|tecnolog|tecnolog[ií]a|tecnologia|programa[çc]|programm|technique|technik|technolog|teknoloji|yapay zek[aâ]|технолог|программирован|нейросет|تقنية|تقني|تكنولوجيا|برمجة|टेक|तकनीक|प्रोग्रामिंग|teknologi|pemrograman|テクノロジー|技術|プログラミング|기술|테크|프로그래밍|科技|技术|编程)/iu;
  const formats = {
    audiobook:/audi[o -]?(?:book|livr|libr)|livres? audio|hörbüch|hörbuch|sesli kitap|аудиокниг|كتب صوتية|كتاب صوتي|ऑडियोबुक|buku audio|オーディオブック|오디오북|有声书/iu,
    press:/magazine|revista|presse|périodique|zeitschrift|rivist|dergi|журнал|مجلة|पत्रिका|majalah|雑誌|잡지|期刊|杂志/iu,
    podcast:/podcast|pódcast|подкаст|بودكاست|पॉडकास्ट|ポッドキャスト|팟캐스트|播客/iu,
    book:/\bbooks?\b|e-?books?|livr[eo]|libro|bücher|buch|kitap|книг|كتاب|كتب|किताब|पुस्तक|buku|書籍|本|책|书籍|书/iu,
    video:/video|vid[eé]o|YouTube|vídeo|видео|فيديو|वीडियो|動画|동영상|영상|视频/iu
  };
  function language(code) {
    const short = String(code||'en').toLowerCase().split(/[-_]/)[0];
    return short === 'pt' ? 'pt-BR' : Object.hasOwn(labels,short) ? short : 'en';
  }
  function destination(key,lang) {
    const group = key === 'trail' || key === 'shop' ? 'catalog-trails' : 'tech';
    return '/'+group+'/'+(lang === 'en'?'':lang.toLowerCase()+'/')+(key==='shop' || Object.hasOwn(formats,key)?'#'+key:'');
  }
  const merchant = /(?:amazon|mercado li[vb]re|mercado livre|アマゾン|아마존|亚马逊|أمازون|अमेज़न)/iu;
  const shopping = /(?:shop|buy|purchase|search|find|look for|comprar?|buscar?|pesquis|procure|acheter|cherch|kauf|such|acquist|cerca|satın|ara\b|купить|найти|поищи|شراء|ابحث|खरीद|खोज|beli|cari|購入|探|検索|구매|검색|찾|购买|买|搜索|查找)/iu;
  function shopQuery(question) {
    const text=String(question||'').trim();
    if(!merchant.test(text)||/prime video|amazon prime|prime gaming|prime music|amazon music|web services|kindle unlimited/iu.test(text))return '';
    const at=text.match(merchant);
    const before=text.slice(0,at.index).trim(),after=text.slice(at.index+at[0].length).trim();
    if(!shopping.test(text))return '';
    // Hand off only the product phrase from explicit retail commands.
    if(/^(?:search|look on|browse|buscar?|pesquis(?:ar|e)|procure|cherche[rz]?|cerca|busca|suche|cari|ابحث)(?:\s+(?:on|in|no|na|en|sur|auf|di|في))?$/iu.test(before)){
      return after.replace(/^(?:for|por|pour|per|nach|untuk|عن)\s+/iu,'').replace(/[.!?。！]+$/u,'').trim().slice(0,120);
    }
    if(!after && shopping.test(before)){
      const command=before.match(/^(?:search(?: for)?|find|buy|look for|buscar?|comprar?|pesquis(?:ar|e)|procure|acheter|cerca|compra|cari|beli|найти|купить|ابحث عن)\s+(.+?)\s+(?:on|in|at|no|na|en|sur|su|di|на|في)$/iu);
      return command?.[1]?.slice(0,120)||'';
    }
    return '';
  }
  function retailerIntent(question) {
    return merchant.test(question) && shopping.test(question) && !/prime video|amazon prime|prime gaming|prime music|amazon music|web services|kindle unlimited/iu.test(question);
  }
  function selection(question) {
    if(retailerIntent(question)||Object.values(labels).some(t=>t.shop.toLocaleLowerCase()===question.trim().toLocaleLowerCase()))return 'shop';
    if(!topics.test(question)) return '';
    for(const [key,re] of Object.entries(formats)) if(re.test(question)) return key;
    return /channel|studio|canal|estúdio|estudio|chaîne|kanal|studio|kanal[ıi]|канал|استوديو|قناة|स्टूडियो|चैनल|saluran|スタジオ|チャンネル|채널|스튜디오|频道|工作室/iu.test(question) ? 'tech' : '';
  }
  function linkForKey(key,lang,query) {
    if(key !== 'tech' && key !== 'shop' && !Object.hasOwn(formats,key)) return null;
    lang = language(lang);
    const link = document.createElement('a');
    link.className = 'gold-btn channel-answer-link';
    link.href = destination(key,lang);
    link.textContent = key==='shop' ? labels[lang].shop : labels[lang].tech + (key==='tech'?'':' · '+labels[lang][key]);
    if(key==='shop')link.addEventListener('click',()=>{
      try {
        if(query) sessionStorage.setItem('matchapp_shop_query',String(query).slice(0,120));
        else sessionStorage.removeItem('matchapp_shop_query');
      } catch {}
    });
    if(window.top !== window) link.target='_top';
    return link;
  }
  function paint() {
    let preferred;
    try { preferred=localStorage.getItem('match_lang'); } catch {}
    const lang = language(preferred || window.MATCH_LANG || document.documentElement.lang);
    for(const a of document.querySelectorAll('a[data-channel]')) {
      const key=a.dataset.channel;
      if(key!=='tech'&&key!=='trail'&&key!=='shop') continue;
      a.href=destination(key,lang);
      (a.querySelector('[data-channel-label]')||a).textContent=labels[lang][key];
    }
  }
  window.MatchAppChannels = {selection,linkForKey,shopQuery,
    linkFor(question,lang) { return linkForKey(selection(question),lang,shopQuery(question)); },
    // Exact destination commands are navigation. Recommendations still use the metered chat.
    isNavigation(question) {
      const value = question.trim().toLocaleLowerCase().replace(/[.!?。！？，،]+$/u,'').trim();
      const names=Object.values(labels).map(t=>t.tech.toLocaleLowerCase());
      if(names.includes(value) || Object.values(labels).some(t=>t.shop.toLocaleLowerCase()===value) || shopQuery(question)) return true;
      return /^(?:(?:please )?(?:open|show|take me to) (?:the )?tech (?:channel|studio)|(?:abra|abrir|mostre) (?:o )?(?:canal de tecnologia|estúdio de tecnologia)|(?:abre|abrir) (?:el )?(?:canal de tecnología|estudio de tecnología))$/iu.test(value);
    }
  };
  paint();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',paint,{once:true});
  for(const evt of ['matchapp:langchange','matchapp:languagechange','matchapp:language-changed']) {
    document.addEventListener(evt,paint);
    window.addEventListener(evt,paint);
  }
  window.addEventListener('storage', e=>{if(e.key==='match_lang')paint();});
})();
