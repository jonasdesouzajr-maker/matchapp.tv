/* MatchApp Ai Jonas: fail-closed speech policy.
 * Web Speech exposes names and language, NOT reliable gender information.
 * Never pass an unspecified/default voice into speechSynthesis.
 * Unrecognized devices are text + microphone, not female-sounding TTS.
 */
(function(global){
 'use strict';
 var maleNames={
  en:[/^(?:Google UK English Male)$/i,/^(?:Microsoft )?(?:David|Mark|Guy|Ryan|George|Andrew|Christopher|Brian)(?: Online \(Natural\))?(?: - English \([^)]*\))?$/i,/^(?:Alex|Daniel|Fred|Aaron|Arthur|Oliver|Rishi|Tom|Thomas|Lee|Nathan|Matthew)$/i],
  pt:[/^(?:Microsoft )?(?:Antonio|Thiago|Paulo|Daniel|Ricardo)(?: Online \(Natural\))?(?: - Portuguese \([^)]*\))?$/i,/^(?:Felipe|Luciano|Jorge|João|Paulo|Ricardo|Thiago)$/i],
  es:[/^(?:Microsoft )?(?:Pablo|Jorge|Diego|Alvaro|Antonio)(?: Online \(Natural\))?(?: - Spanish \([^)]*\))?$/i,/^(?:Jorge|Diego|Juan|Carlos|Pablo)$/i],
  fr:[/^(?:Microsoft )?(?:Henri|Paul|Remy)(?: Online \(Natural\))?(?: - French \([^)]*\))?$/i,/^(?:Thomas|Henri|Nicolas|Paul)$/i],
  de:[/^(?:Microsoft )?(?:Conrad|Killian|Stefan)(?: Online \(Natural\))?(?: - German \([^)]*\))?$/i,/^(?:Annaeus|Markus|Stefan|Daniel)$/i],
  it:[/^(?:Microsoft )?(?:Diego|Giuseppe)(?: Online \(Natural\))?(?: - Italian \([^)]*\))?$/i,/^(?:Luca|Giorgio|Diego)$/i],
  tr:[/^(?:Microsoft )?(?:Ahmet)(?: Online \(Natural\))?(?: - Turkish \([^)]*\))?$/i],
  ru:[/^(?:Microsoft )?(?:Dmitry|Pavel)(?: Online \(Natural\))?(?: - Russian \([^)]*\))?$/i,/^(?:Yuri|Dmitry|Pavel)$/i],
  ar:[/^(?:Microsoft )?(?:Hamed|Bassel)(?: Online \(Natural\))?(?: - Arabic \([^)]*\))?$/i],
  hi:[/^(?:Microsoft )?(?:Madhur|Hemant)(?: Online \(Natural\))?(?: - Hindi \([^)]*\))?$/i],
  id:[/^(?:Microsoft )?(?:Ardi)(?: Online \(Natural\))?(?: - Indonesian \([^)]*\))?$/i],
  ja:[/^(?:Microsoft )?(?:Keita|Ichiro)(?: Online \(Natural\))?(?: - Japanese \([^)]*\))?$/i],
  ko:[/^(?:Microsoft )?(?:InJoon|Hyunsu)(?: Online \(Natural\))?(?: - Korean \([^)]*\))?$/i],
  zh:[/^(?:Microsoft )?(?:Yunxi|Yunyang)(?: Online \(Natural\))?(?: - Chinese \([^)]*\))?$/i]
 };
 var reject=/(?:^|[^a-z])(female|woman|girl|samantha|jenny|aria|zira|susan|ava|karen|helena|luciana|joana)(?:[^a-z]|$)|\-f\d|x-sfg|x-tpf|x-iog/i;
 function language(tag){return String(tag||'').toLowerCase().split(/[-_]/)[0]}
 function approved(v,tag){
  if(!v||!v.name||!v.lang)return false;
  var name=String(v.name).trim(),lang=language(tag),actual=language(v.lang);
  if(!lang||lang!==actual||reject.test(name)||v.localService!==true)return false;
  // An explicitly marked male system voice is acceptable only for this language.
  if(/(?:^|[\s(\[_-])male(?:$|[\s)\]_-])/i.test(name))return true;
  return (maleNames[lang]||[]).some(function(pattern){return pattern.test(name)});
 }
 function select(voices,tag){
  if(!Array.isArray(voices))return null;
  var ok=voices.filter(function(v){return approved(v,tag)});
  ok.sort(function(a,b){
   var exactA=String(a.lang).toLowerCase()===String(tag).toLowerCase()?1:0;
   var exactB=String(b.lang).toLowerCase()===String(tag).toLowerCase()?1:0;
   return exactB-exactA || Number(!!b.localService)-Number(!!a.localService);
  });
  return ok[0]||null;
 }
 global.MatchAppJonasVoicePolicy=Object.freeze({approved:approved,select:select});
})(typeof window!=='undefined'?window:globalThis);
