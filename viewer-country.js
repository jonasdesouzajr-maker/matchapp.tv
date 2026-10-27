/* Shared adult viewing/reading country. An explicit guest-friendly choice,
 * profile country and legacy viewing choice are independent of UI language.
 * The compact country names/codes come from profile-geography.js (249 entries;
 * its country-region-data MIT attribution is retained in that source file).
 * This helper never requests location, changes profile data, or guesses a
 * country from a browser language. Unknown country is the empty string. */
(function(root,build){
  'use strict';
  const api=build(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MatchAppCountry=api;
})(typeof window!=='undefined'?window:null,function(root){
  'use strict';
  const normalise=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  const VIEWING_COUNTRIES=Object.freeze([
    ["Afghanistan","AF"],["Åland Islands","AX"],["Albania","AL"],["Algeria","DZ"],["American Samoa","AS"],
    ["Andorra","AD"],["Angola","AO"],["Anguilla","AI"],["Antarctica","AQ"],["Antigua and Barbuda","AG"],
    ["Argentina","AR"],["Armenia","AM"],["Aruba","AW"],["Australia","AU"],["Austria","AT"],
    ["Azerbaijan","AZ"],["Bahamas","BS"],["Bahrain","BH"],["Bangladesh","BD"],["Barbados","BB"],
    ["Belarus","BY"],["Belgium","BE"],["Belize","BZ"],["Benin","BJ"],["Bermuda","BM"],
    ["Bhutan","BT"],["Bolivia","BO"],["Bonaire, Sint Eustatius and Saba","BQ"],["Bosnia and Herzegovina","BA"],["Botswana","BW"],
    ["Bouvet Island","BV"],["Brazil","BR"],["British Indian Ocean Territory","IO"],["Brunei Darussalam","BN"],["Bulgaria","BG"],
    ["Burkina Faso","BF"],["Burundi","BI"],["Cambodia","KH"],["Cameroon","CM"],["Canada","CA"],
    ["Cape Verde","CV"],["Cayman Islands","KY"],["Central African Republic","CF"],["Chad","TD"],["Chile","CL"],
    ["China","CN"],["Christmas Island","CX"],["Cocos (Keeling) Islands","CC"],["Colombia","CO"],["Comoros","KM"],
    ["Congo, Republic of the (Brazzaville)","CG"],["Congo, the Democratic Republic of the (Kinshasa)","CD"],["Cook Islands","CK"],["Costa Rica","CR"],["Côte d'Ivoire, Republic of","CI"],
    ["Croatia","HR"],["Cuba","CU"],["Curaçao","CW"],["Cyprus","CY"],["Czech Republic","CZ"],
    ["Denmark","DK"],["Djibouti","DJ"],["Dominica","DM"],["Dominican Republic","DO"],["Ecuador","EC"],
    ["Egypt","EG"],["El Salvador","SV"],["Equatorial Guinea","GQ"],["Eritrea","ER"],["Estonia","EE"],
    ["Ethiopia","ET"],["Falkland Islands (Islas Malvinas)","FK"],["Faroe Islands","FO"],["Fiji","FJ"],["Finland","FI"],
    ["France","FR"],["French Guiana","GF"],["French Polynesia","PF"],["French Southern and Antarctic Lands","TF"],["Gabon","GA"],
    ["Gambia, The","GM"],["Georgia","GE"],["Germany","DE"],["Ghana","GH"],["Gibraltar","GI"],
    ["Greece","GR"],["Greenland","GL"],["Grenada","GD"],["Guadeloupe","GP"],["Guam","GU"],
    ["Guatemala","GT"],["Guernsey","GG"],["Guinea","GN"],["Guinea-Bissau","GW"],["Guyana","GY"],
    ["Haiti","HT"],["Heard Island and McDonald Islands","HM"],["Holy See (Vatican City)","VA"],["Honduras","HN"],["Hong Kong","HK"],
    ["Hungary","HU"],["Iceland","IS"],["India","IN"],["Indonesia","ID"],["Iran, Islamic Republic of","IR"],
    ["Iraq","IQ"],["Ireland","IE"],["Isle of Man","IM"],["Israel","IL"],["Italy","IT"],
    ["Jamaica","JM"],["Japan","JP"],["Jersey","JE"],["Jordan","JO"],["Kazakhstan","KZ"],
    ["Kenya","KE"],["Kiribati","KI"],["Korea, Democratic People's Republic of","KP"],["Korea, Republic of","KR"],["Kosovo","XK"],
    ["Kuwait","KW"],["Kyrgyzstan","KG"],["Laos","LA"],["Latvia","LV"],["Lebanon","LB"],
    ["Lesotho","LS"],["Liberia","LR"],["Libya","LY"],["Liechtenstein","LI"],["Lithuania","LT"],
    ["Luxembourg","LU"],["Macao","MO"],["Macedonia, Republic of","MK"],["Madagascar","MG"],["Malawi","MW"],
    ["Malaysia","MY"],["Maldives","MV"],["Mali","ML"],["Malta","MT"],["Marshall Islands","MH"],
    ["Martinique","MQ"],["Mauritania","MR"],["Mauritius","MU"],["Mayotte","YT"],["Mexico","MX"],
    ["Micronesia, Federated States of","FM"],["Moldova","MD"],["Monaco","MC"],["Mongolia","MN"],["Montenegro","ME"],
    ["Montserrat","MS"],["Morocco","MA"],["Mozambique","MZ"],["Myanmar","MM"],["Namibia","NA"],
    ["Nauru","NR"],["Nepal","NP"],["Netherlands","NL"],["New Caledonia","NC"],["New Zealand","NZ"],
    ["Nicaragua","NI"],["Niger","NE"],["Nigeria","NG"],["Niue","NU"],["Norfolk Island","NF"],
    ["Northern Mariana Islands","MP"],["Norway","NO"],["Oman","OM"],["Pakistan","PK"],["Palau","PW"],
    ["Palestine","PS"],["Panama","PA"],["Papua New Guinea","PG"],["Paraguay","PY"],["Peru","PE"],
    ["Philippines","PH"],["Pitcairn","PN"],["Poland","PL"],["Portugal","PT"],["Puerto Rico","PR"],
    ["Qatar","QA"],["Réunion","RE"],["Romania","RO"],["Russian Federation","RU"],["Rwanda","RW"],
    ["Saint Barthélemy","BL"],["Saint Helena, Ascension and Tristan da Cunha","SH"],["Saint Kitts and Nevis","KN"],["Saint Lucia","LC"],["Saint Martin","MF"],
    ["Saint Pierre and Miquelon","PM"],["Saint Vincent and the Grenadines","VC"],["Samoa","WS"],["San Marino","SM"],["Sao Tome and Principe","ST"],
    ["Saudi Arabia","SA"],["Senegal","SN"],["Serbia","RS"],["Seychelles","SC"],["Sierra Leone","SL"],
    ["Singapore","SG"],["Sint Maarten (Dutch part)","SX"],["Slovakia","SK"],["Slovenia","SI"],["Solomon Islands","SB"],
    ["Somalia","SO"],["South Africa","ZA"],["South Georgia and South Sandwich Islands","GS"],["South Sudan","SS"],["Spain","ES"],
    ["Sri Lanka","LK"],["Sudan","SD"],["Suriname","SR"],["Eswatini","SZ"],["Sweden","SE"],
    ["Switzerland","CH"],["Syrian Arab Republic","SY"],["Taiwan","TW"],["Tajikistan","TJ"],["Tanzania, United Republic of","TZ"],
    ["Thailand","TH"],["Timor-Leste","TL"],["Togo","TG"],["Tokelau","TK"],["Tonga","TO"],
    ["Trinidad and Tobago","TT"],["Tunisia","TN"],["Turkey","TR"],["Turkmenistan","TM"],["Turks and Caicos Islands","TC"],
    ["Tuvalu","TV"],["Uganda","UG"],["Ukraine","UA"],["United Arab Emirates","AE"],["United Kingdom","GB"],
    ["United States","US"],["United States Minor Outlying Islands","UM"],["Uruguay","UY"],["Uzbekistan","UZ"],["Vanuatu","VU"],
    ["Venezuela, Bolivarian Republic of","VE"],["Vietnam","VN"],["Virgin Islands, British","VG"],["Virgin Islands, U.S.","VI"],["Wallis and Futuna","WF"],
    ["Western Sahara","EH"],["Yemen","YE"],["Zambia","ZM"],["Zimbabwe","ZW"]
  ]);
  const VIEWING_COUNTRY_CODES=new Map(VIEWING_COUNTRIES.map(([name,code])=>[normalise(name),code]));
  const VIEWING_COUNTRY_IDS=new Set(VIEWING_COUNTRIES.map(([,code])=>code));
  const VIEWING_COUNTRY_ALIASES=Object.freeze({
    brasil:'BR',usa:'US',uk:'GB',unitedstatesofamerica:'US',greatbritain:'GB',
    southkorea:'KR',korea:'KR',northkorea:'KP',russia:'RU',taiwan:'TW',
    vietnam:'VN',turkey:'TR',turkiye:'TR',czechia:'CZ',bolivia:'BO',
    venezuela:'VE',tanzania:'TZ',iran:'IR',laos:'LA',moldova:'MD',
    syria:'SY',palestine:'PS',brunei:'BN',micronesia:'FM',macau:'MO',
    ivorycoast:'CI',cotedivoire:'CI',capeverde:'CV',eswatini:'SZ'
  });
  const COUNTRY_GUIDANCE=Object.freeze({
    en:'Choose your viewing country at the top of the app to check local availability.',
    'pt-BR':'Escolha no topo do app o país onde você assiste para consultar a disponibilidade local.',
    es:'Elige en la parte superior de la app el país donde ves contenido para consultar la disponibilidad local.',
    fr:'Choisissez votre pays de visionnage en haut de l’application pour consulter la disponibilité locale.',
    de:'Wähle oben in der App dein Wiedergabeland, um die Verfügbarkeit vor Ort zu prüfen.',
    it:'Scegli in alto nell’app il paese in cui guardi per verificare la disponibilità locale.',
    tr:'Yerel erişilebilirliği kontrol etmek için uygulamanın üst kısmından izlediğiniz ülkeyi seçin.',
    ru:'Выберите страну просмотра вверху приложения, чтобы проверить доступность в вашем регионе.',
    ar:'اختر بلد المشاهدة في أعلى التطبيق للتحقق من التوفر في منطقتك.',
    hi:'अपने क्षेत्र में उपलब्धता जाँचने के लिए ऐप के ऊपर देखने का देश चुनें।',
    id:'Pilih negara tempat menonton di bagian atas aplikasi untuk memeriksa ketersediaan lokal.',
    ja:'地域での利用可否を確認するには、アプリ上部で視聴する国を選択してください。',
    ko:'지역별 이용 가능 여부를 확인하려면 앱 상단에서 시청 국가를 선택하세요.',
    zh:'请在应用顶部选择观看所在国家，以查看当地的可用情况。'
  });
  const COUNTRY_LABELS=Object.freeze({
    en:['Viewing country','Choose country'], 'pt-BR':['País onde você assiste','Escolha o país'],
    es:['País donde ves contenido','Elige el país'], fr:['Pays de visionnage','Choisir le pays'],
    de:['Wiedergabeland','Land wählen'], it:['Paese di visione','Scegli il paese'],
    tr:['İzlediğiniz ülke','Ülke seçin'], ru:['Страна просмотра','Выберите страну'],
    ar:['بلد المشاهدة','اختر البلد'], hi:['देखने का देश','देश चुनें'],
    id:['Negara tempat menonton','Pilih negara'], ja:['視聴する国','国を選択'],
    ko:['시청 국가','국가 선택'], zh:['观看所在国家','选择国家']
  });
  const preferenceKey='matchapp_viewer_country';
  let sessionCountry='',lastCountry='',picker=null;
  function languageKey(language){
    const base=String(language||'en').toLowerCase().split(/[-_]/)[0];
    return base==='pt'?'pt-BR':base;
  }
  function chooseCountryMessage(language){
    return COUNTRY_GUIDANCE[languageKey(language)]||COUNTRY_GUIDANCE.en;
  }
  function resolveCountryCode(value){
    const raw=String(value||'').trim(),code=raw.toUpperCase();
    if(VIEWING_COUNTRY_IDS.has(code))return code;
    const key=normalise(raw);
    return VIEWING_COUNTRY_CODES.get(key)||VIEWING_COUNTRY_ALIASES[key]||'';
  }
  function regionCode(storage){
    // A failed write must still beat an older persisted country on this page.
    if(!storage&&sessionCountry)return sessionCountry;
    let saved='',preferred='';
    try{
      const source=storage||root?.localStorage;
      const explicit=resolveCountryCode(source?.getItem(preferenceKey));
      if(explicit)return explicit;
      saved=String(source?.getItem('match_user_country')||'').trim();
      preferred=String(source?.getItem('match_user_region')||'').trim();
    }catch(_){return !storage?sessionCountry:'';}
    const country=resolveCountryCode(saved);
    // Current registration stores a subdivision in this legacy key. Honor
    // previously explicit viewing-country codes, never Fiji's Ba/Ra or
    // Slovenia's Ig subdivision names that happen to have two letters.
    const subdivision=(country==='FJ'&&/^(?:ba|ra)$/i.test(preferred))||
      (country==='SI'&&/^ig$/i.test(preferred));
    if(/^[A-Za-z]{2}$/.test(preferred)&&!subdivision){
      const explicit=resolveCountryCode(preferred);
      if(explicit)return explicit;
    }
    return country;
  }
  function setCountry(value){
    const country=resolveCountryCode(value);
    if(!country||!root)return false;
    const previous=regionCode();
    sessionCountry=country;
    try{root.localStorage.setItem(preferenceKey,country);sessionCountry='';}catch(_){}
    publishChange(previous);
    return true;
  }
  function publishChange(previous=lastCountry){
    const country=regionCode();lastCountry=country;
    syncPicker();
    if(country!==previous)root?.document?.dispatchEvent(new root.CustomEvent('matchapp:countrychange',{
      detail:{country,previousCountry:previous}
    }));
  }
  function currentLanguage(){
    let selected='';try{selected=root.localStorage.getItem('match_lang')||'';}catch(_){}
    return languageKey(selected||root.MATCH_LANG||root.document.documentElement.lang||'en');
  }
  function syncPicker(){
    if(!picker?.isConnected)return;
    const language=currentLanguage(),copy=COUNTRY_LABELS[language]||COUNTRY_LABELS.en;
    picker.setAttribute('aria-label',copy[0]);picker.title=copy[0];
    picker.lang=language;picker.dir=language==='ar'?'rtl':'ltr';
    if(picker.dataset.language!==language){
      let names;try{names=new root.Intl.DisplayNames([language],{type:'region'});}catch(_){}
      const options=VIEWING_COUNTRIES.map(([name,code])=>{
        let label=name;try{label=names?.of(code)||name;}catch(_){}
        return {code,label};
      }).sort((a,b)=>a.label.localeCompare(b.label,language));
      const placeholder=root.document.createElement('option');
      placeholder.value='';placeholder.textContent=copy[1];placeholder.disabled=true;
      picker.replaceChildren(placeholder);
      options.forEach(({code,label})=>{const option=root.document.createElement('option');
        option.value=code;option.textContent=label;picker.appendChild(option);});
      picker.dataset.language=language;
    }
    picker.value=regionCode();
  }
  function adultPage(){
    return !!root?.document&&!/^\/(kids|private-voice|oauth|android-studio)(\/|$)/.test(root.location?.pathname||'')&&
      !root.document.documentElement.classList.contains('kids-mode');
  }
  function mountPicker(){
    if(!adultPage())return false;
    const doc=root.document;
    // The navigation deck is inside a closed app-controls menu on phones.
    // Keep this small row visible beside Jonas, after the existing masthead.
    const target=doc.querySelector('#ma-reference-header .ma-reference-header-chrome')||
      doc.querySelector('#mh-topbox,header.app-header,header.ebook-page-top,header.hub-header');
    if(!target)return false;
    let row=doc.getElementById('matchapp-viewer-country-control');
    if(!row){
      row=doc.createElement('div');row.id='matchapp-viewer-country-control';
      row.setAttribute('data-ma-pill-exclude','');
      picker=doc.createElement('select');picker.id='matchapp-viewer-country';
      picker.setAttribute('data-ma-pill-exclude','');
      picker.addEventListener('change',()=>setCountry(picker.value));
      row.appendChild(picker);
    }else picker=row.querySelector('select');
    if(row.parentElement!==target)target.appendChild(row);
    if(!doc.getElementById('matchapp-viewer-country-style')){
      const style=doc.createElement('style');style.id='matchapp-viewer-country-style';
      style.textContent=`
        html body #matchapp-viewer-country-control{display:block!important;box-sizing:border-box!important;inline-size:min(100%,18rem)!important;min-inline-size:0!important;max-inline-size:100%!important;margin:4px 0 0!important;padding:0!important;}
        html body #matchapp-viewer-country-control #matchapp-viewer-country{display:block!important;box-sizing:border-box!important;inline-size:100%!important;min-inline-size:0!important;max-inline-size:100%!important;min-block-size:44px!important;margin:0!important;padding:8px 12px!important;border:0!important;border-radius:999px!important;background:linear-gradient(135deg,rgba(216,156,72,.17),rgba(120,80,180,.17))!important;color:var(--cinema-gold,#e6c36a)!important;font:600 max(14px,.875rem)/1.3 var(--font-family,system-ui,sans-serif)!important;letter-spacing:normal!important;text-transform:none!important;text-overflow:ellipsis!important;cursor:pointer!important;appearance:auto!important;}
        html body #matchapp-viewer-country-control #matchapp-viewer-country:focus-visible{outline:2px solid var(--cinema-gold,#e6c36a)!important;outline-offset:2px!important;}
        #matchapp-viewer-country option{background:#180f1e;color:#f4f0e9;}
        @media(forced-colors:active){html body #matchapp-viewer-country-control #matchapp-viewer-country{border:1px solid ButtonText!important;color:ButtonText!important;background:Canvas!important;}}
      `;doc.head.appendChild(style);
    }
    syncPicker();return true;
  }
  function openPicker(){
    if(!mountPicker())return false;
    picker.focus({preventScroll:true});
    picker.scrollIntoView?.({block:'nearest',behavior:'auto'});
    // Async preflight may no longer have transient activation. Focus remains
    // useful when a browser cannot open its native select programmatically.
    try{picker.showPicker?.();}catch(_){}
    return true;
  }
  if(adultPage()){
    lastCountry=regionCode();
    const doc=root.document;
    function start(){
      mountPicker();
      if(root.location.hash==='#matchapp-viewer-country')openPicker();
      // Header owners may hydrate just after this script. Observe only that
      // startup window; never leave a full-page observer running indefinitely.
      if(root.MutationObserver&&doc.body){
        const observer=new root.MutationObserver(()=>{
          if(!picker?.isConnected||(!picker.closest('.ma-reference-header-chrome')&&doc.querySelector('.ma-reference-header-chrome')))mountPicker();
        });
        observer.observe(doc.body,{childList:true,subtree:true});
        root.setTimeout(()=>observer.disconnect(),12000);
      }
    }
    if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',start,{once:true});else start();
    doc.addEventListener('matchapp:langchange',()=>{mountPicker();syncPicker();});
    ['matchapp:profilehydrated','matchapp:authchange'].forEach(event=>doc.addEventListener(event,()=>{mountPicker();publishChange();}));
    root.addEventListener('pageshow',()=>{mountPicker();publishChange();});
    root.addEventListener('storage',event=>{
      if(event.key!==null&&![preferenceKey,'match_user_country','match_user_region','match_lang'].includes(event.key))return;
      if(event.key===preferenceKey||event.key===null)sessionCountry='';
      publishChange();
    });
    // Old result/settings links remain recoverable while cached page shells
    // update. The new choice belongs to viewing, never account registration.
    doc.addEventListener('click',event=>{
      const link=event.target.closest?.('a[data-viewing-country],a[href="#matchapp-viewer-country"],a[href="/#matchapp-viewer-country"],.ma-menu a[href="/profile/profile.html#country"]');
      if(link&&openPicker())event.preventDefault();
    });
  }
  return Object.freeze({resolveCountryCode,regionCode,chooseCountryMessage,setCountry,mountPicker,openPicker});
});
