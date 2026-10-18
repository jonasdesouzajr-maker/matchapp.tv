import { matchesCriteria } from './matching-policy.mjs';

export const LANGUAGES=Object.freeze(['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']);
// Country validation follows registration; countryOptions independently verifies availability.
export const COUNTRIES=Object.freeze('AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI KH CM CA CV KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR XK KW KG LA LV LB LS LR LY LI LT LU MO MK MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SZ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(' '));
export const MOODS=Object.freeze(['any','funny','intense and thrilling','cozy comfort watch','mind-bending','romantic']);
export const RATINGS=Object.freeze(['all ages family friendly','tween PG','teen PG-13']);
export const MAX_SOURCE_AGE=72*60*60*1000;
const ACCESS={stream:'subscription',rent:'rental',buy:'purchase',free:'free',ads:'free_with_ads'};
const ALIASES={disneyplus:'disney',disney:'disney',amazonprimevideo:'primevideo',amazonprimevideowithads:'primevideo',primevideo:'primevideo',appletvplus:'appletv',appletv:'appletv',hbomax:'max',max:'max',paramountplus:'paramount',paramount:'paramount',netflixstandardwithads:'netflix',netflix:'netflix'};
export const titleKey=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export const metadataKey=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function providerKey(value){const k=metadataKey(value);return ALIASES[k]||k;}
export function validatePrefs(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('invalid_prefs');
  const cat=input.cat||'any',mood=input.mood||'any',rating=input.rating||RATINGS[0];
  if(!['any','movie','series'].includes(cat)||!MOODS.includes(mood)||!RATINGS.includes(rating))throw new Error('invalid_prefs');
  const country=String(input.country||'').trim().toUpperCase();
  if(!COUNTRIES.includes(country))throw new Error('country_required');
  const providers=input.providers===undefined?[]:input.providers;
  if(!Array.isArray(providers)||providers.length>12||providers.some(p=>typeof p!=='string'||!p.trim()||p.length>100))throw new Error('invalid_prefs');
  const maxMinutes=Number(input.maxMinutes||0);
  if(![0,30,60,120].includes(maxMinutes))throw new Error('invalid_prefs');
  return {cat,mood,vibe:'any',plat:'any',rating,country,providers:[...new Set(providers.map(p=>p.trim()))],maxMinutes,includeRentals:input.includeRentals===true,viewingMode:input.viewingMode==='separate'?'separate':'shared'};
}
export function cleanExclusions(value){
  if(!Array.isArray(value)||value.length>1000)throw new Error('invalid_exclusions');
  return [...new Set(value.filter(v=>typeof v==='string'&&v.length<=300).map(v=>/^tmdb:(?:movie|tv):[1-9]\d*$/.test(v)?v:titleKey(v)).filter(Boolean))];
}
function validTime(value,now){const n=typeof value==='string'?Date.parse(value):NaN;return Number.isFinite(n)&&n<=now+300000&&now-n<=MAX_SOURCE_AGE;}
function sourceLink(value,id,kind,country){
  try {
    const u=new URL(value);
    if(u.protocol!=='https:'||u.username||u.password||!['www.themoviedb.org','themoviedb.org'].includes(u.hostname))return '';
    const expected=new RegExp('^/'+kind+'/'+id+'(?:-[^/]+)?/watch$');
    if(!expected.test(u.pathname)||u.searchParams.get('locale')!==country)return '';
    return u.href;
  }catch{return '';}
}
function identity(entry,info){
  const kind=(entry.cats||[]).includes('movie')?'movie':'tv';
  return info&&['movie','tv'].includes(info.kind)&&info.kind===kind&&Number.isSafeInteger(Number(info.tmdbId))&&Number(info.tmdbId)>0&&(!entry.year||Number(entry.year)===Number(info.year));
}
function exactMetadata(entry,metadata){
  return metadata&&metadataKey(metadata.title)===metadataKey(entry.title)&&identity(entry,metadata);
}
export function sourceFor(entry,metadata,snapshot,now){
  const fromSnapshot=snapshot?.titles?.[entry.title];
  const sources=[];
  if(identity(entry,fromSnapshot))sources.push({...fromSnapshot,checkedAt:fromSnapshot.checkedAt||snapshot.generated,source:'TMDB / JustWatch'});
  if(exactMetadata(entry,metadata))sources.push({tmdbId:Number(metadata.tmdbId),kind:metadata.kind,year:metadata.year,regions:metadata.availability||{},checkedAt:metadata.checkedAt,source:'TMDB / JustWatch'});
  // Prefer the most recent actual source timestamp. A failed refresh does not
  // outrank the last observation merely because its attempt happened later.
  return sources.sort((a,b)=>(Date.parse(b.checkedAt)||0)-(Date.parse(a.checkedAt)||0));
}
export function countryOptions(sources,prefs,now){
  for(const info of sources){
    const row=info.regions?.[prefs.country];
    if(!row||row.status==='unknown'||row.refreshStatus==='failed'||info.refreshStatus==='failed')continue;
    const checkedAt=row.checkedAt||info.checkedAt;
    if(!validTime(checkedAt,now))continue;
    const wanted=new Set(prefs.providers.map(providerKey));
    const offers=Object.entries(ACCESS).flatMap(([field,access])=>{
      if((field==='rent'||field==='buy')&&!prefs.includeRentals)return [];
      return (Array.isArray(row[field])?row[field]:[]).filter(p=>typeof p==='string'&&p.trim()).filter(p=>!wanted.size||wanted.has(providerKey(p))).map(provider=>({provider,access}));
    });
    if(!offers.length)continue;
    const url=sourceLink(row.link,Number(info.tmdbId),info.kind,prefs.country);
    if(!url)continue;
    return {country:prefs.country,checkedAt:new Date(checkedAt).toISOString(),source:'TMDB / JustWatch',sourceUrl:url,offers:offers.slice(0,30),tmdbId:Number(info.tmdbId),kind:info.kind};
  }
  return null;
}
function sourceRatingFits(metadata,prefs){
  const value=String(metadata?.contentRating||'').toUpperCase().replace(/\s/g,'');
  // The curated catalog remains required. A contradictory higher source
  // classification can only reject a candidate, never broaden it.
  const ages={'G':0,'TV-Y':0,'TV-G':0,'TV-Y7':7,'PG':10,'TV-PG':10,'PG-13':13,'TV-14':14,'R':17,'NC-17':18,'TV-MA':18,'18':18,'16':16,'15':15,'14':14,'12':12,'10':10,'L':0,'U':0};
  const ceiling=prefs.rating===RATINGS[0]?10:prefs.rating===RATINGS[1]?12:14;
  return !Object.hasOwn(ages,value)||ages[value]<=ceiling;
}
function runtimeFits(entry,metadata,prefs){
  if(!prefs.maxMinutes)return true;
  return exactMetadata(entry,metadata)&&Number.isInteger(metadata.runtime)&&metadata.runtime>0&&metadata.runtime<prefs.maxMinutes;
}
function cleanPoster(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='image.tmdb.org'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function selectResult({candidates,metadataRows,hostPrefs,guestPrefs,snapshot,now=Date.now(),random=Math.random}){
  const metadata=new Map((metadataRows||[]).map(row=>[row.key,row.metadata]));
  const eligible=[];
  let policyEligible=0,sourceEligible=0;
  for(const item of candidates||[]){
    const entry=item.entry;
    if(!entry||!entry.title||!(entry.cats||[]).some(c=>['movie','series'].includes(c)))continue;
    if(!matchesCriteria(entry,{...hostPrefs,plat:'any'})||!matchesCriteria(entry,{...guestPrefs,plat:'any'}))continue;
    policyEligible++;
    const meta=metadata.get(item.key);
    const verifiedMeta=exactMetadata(entry,meta)?meta:null;
    if(!sourceRatingFits(verifiedMeta,hostPrefs)||!sourceRatingFits(verifiedMeta,guestPrefs))continue;
    if(!runtimeFits(entry,verifiedMeta,hostPrefs)||!runtimeFits(entry,verifiedMeta,guestPrefs))continue;
    const sources=sourceFor(entry,verifiedMeta,snapshot,now);
    const hostOptions=countryOptions(sources,hostPrefs,now);
    if(!hostOptions)continue;
    const guestOptions=hostPrefs.viewingMode==='shared'?hostOptions:countryOptions(sources,guestPrefs,now);
    if(!guestOptions||guestOptions.tmdbId!==hostOptions.tmdbId||guestOptions.kind!==hostOptions.kind)continue;
    sourceEligible++;
    const result={schemaVersion:1,title:entry.title,year:Number(entry.year)||null,kind:hostOptions.kind,tmdbId:hostOptions.tmdbId,
      synopsis:String(verifiedMeta?.synopsis||entry.synopsis||'').slice(0,4000),sourceLanguage:'en',
      posterUrl:verifiedMeta&&Number(verifiedMeta.tmdbId)===hostOptions.tmdbId?cleanPoster(verifiedMeta.posterUrl):'',
      runtime:verifiedMeta?.runtime||null,runtimeKind:hostOptions.kind==='movie'?'movie':'episode',contentRating:verifiedMeta?.contentRating||null,
      genres:Array.isArray(verifiedMeta?.genres)?verifiedMeta.genres.slice(0,12):[],
      cast:Array.isArray(verifiedMeta?.cast)?verifiedMeta.cast.slice(0,8):[],
      originCountries:Array.isArray(verifiedMeta?.countries)?verifiedMeta.countries.slice(0,8):[],
      viewingMode:hostPrefs.viewingMode,
      viewing:hostPrefs.viewingMode==='shared'?[{role:'shared',...hostOptions}]:[{role:'host',...hostOptions},{role:'guest',...guestOptions}],
      common:{mood:hostPrefs.mood===guestPrefs.mood&&hostPrefs.mood!=='any'?hostPrefs.mood:null,cat:hostPrefs.cat===guestPrefs.cat&&hostPrefs.cat!=='any'?hostPrefs.cat:null},
      matchedAt:new Date(now).toISOString()};
    eligible.push({key:item.key,result});
  }
  if(!eligible.length)return {outcome:policyEligible>0&&sourceEligible===0?'no_verified_match':'no_match'};
  const index=Math.min(eligible.length-1,Math.max(0,Math.floor(Number(random())*eligible.length)||0));
  return {...eligible[index],outcome:'matched'};
}
