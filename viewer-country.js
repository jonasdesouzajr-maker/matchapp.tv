/* Shared adult viewing/reading country. The profile country and explicit
 * legacy viewing choice are independent of interface language and title origin.
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
    en:'Choose your country in your profile to check local availability.',
    'pt-BR':'Escolha seu país no perfil para consultar a disponibilidade na sua região.',
    es:'Elige tu país en el perfil para consultar la disponibilidad en tu región.',
    fr:'Choisissez votre pays dans votre profil pour consulter la disponibilité locale.',
    de:'Wähle dein Land im Profil, um die Verfügbarkeit vor Ort zu prüfen.',
    it:'Scegli il tuo paese nel profilo per verificare la disponibilità locale.',
    tr:'Yerel erişilebilirliği kontrol etmek için profilinizde ülkenizi seçin.',
    ru:'Выберите страну в профиле, чтобы проверить доступность в вашем регионе.',
    ar:'اختر بلدك في ملفك الشخصي للتحقق من التوفر في منطقتك.',
    hi:'अपने क्षेत्र में उपलब्धता जाँचने के लिए प्रोफ़ाइल में अपना देश चुनें।',
    id:'Pilih negara di profil untuk memeriksa ketersediaan di wilayah Anda.',
    ja:'お住まいの地域での利用可否を確認するには、プロフィールで国を選択してください。',
    ko:'지역별 이용 가능 여부를 확인하려면 프로필에서 국가를 선택하세요.',
    zh:'请在个人资料中选择国家，以查看当地的可用情况。'
  });
  function chooseCountryMessage(language){
    const base=String(language||'en').toLowerCase().split(/[-_]/)[0];
    return COUNTRY_GUIDANCE[base==='pt'?'pt-BR':base]||COUNTRY_GUIDANCE.en;
  }
  function resolveCountryCode(value){
    const raw=String(value||'').trim(),code=raw.toUpperCase();
    if(VIEWING_COUNTRY_IDS.has(code))return code;
    const key=normalise(raw);
    return VIEWING_COUNTRY_CODES.get(key)||VIEWING_COUNTRY_ALIASES[key]||'';
  }
  function regionCode(storage){
    let saved='',preferred='';
    try{
      const source=storage||root?.localStorage;
      saved=String(source?.getItem('match_user_country')||'').trim();
      preferred=String(source?.getItem('match_user_region')||'').trim();
    }catch(_){return '';}
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
  return Object.freeze({resolveCountryCode,regionCode,chooseCountryMessage});
});
