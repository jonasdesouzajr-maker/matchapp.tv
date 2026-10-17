(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MatchAppGrowthCore=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const LANGS=Object.freeze(['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']);
const TOKEN=/^[a-f0-9]{64}$/;
function safeSource(value,id,kind,country){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||!['themoviedb.org','www.themoviedb.org'].includes(u.hostname))return '';if(!['movie','tv'].includes(kind)||!Number.isSafeInteger(Number(id))||Number(id)<=0||!/^[A-Z]{2}$/.test(country))return '';if(!new RegExp('^/'+kind+'/'+Number(id)+'(?:-[^/]+)?/watch$').test(u.pathname)||u.searchParams.get('locale')!==country)return '';return u.href;}catch(_){return '';}}
function poster(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='image.tmdb.org'&&!u.username&&!u.password?u.href:'';}catch(_){return '';}}
function titlePath(path){if(typeof path!=='string'||path.endsWith('/availability-methodology/'))return '';const legacy=/^\/where-to-watch\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;const regional=/^\/(?:en\/(?:br|us|gb|pt)|pt\/br)\/watch\/(?:movie|series)\/[a-z0-9]+(?:-[a-z0-9]+)*-[1-9][0-9]*\/$/;return legacy.test(path)||regional.test(path)?path:'';}
function playUrl(context){
 const url=new URL('https://play.google.com/store/apps/details');url.searchParams.set('id','com.jonas.papercup');
 const ref=new URLSearchParams({utm_source:'matchapp_tv',utm_medium:'web_to_app'});
 if(context.resume){if(!TOKEN.test(context.resume))throw Error('invalid_context');ref.set('utm_campaign','together_after_aha');ref.set('resume',context.resume);}
 else{const path=titlePath(context.path);if(!path)throw Error('invalid_context');ref.set('utm_campaign','title_after_aha');ref.set('path',path);if(/^[A-Z]{2}$/.test(context.country||''))ref.set('country',context.country);}
 if(LANGS.includes(context.language))ref.set('lang',context.language);
 url.searchParams.set('referrer',ref.toString());return url.href;
}
function appUrl(context){
 const url=new URL('https://matchapp.tv/');
 if(context.resume){if(!TOKEN.test(context.resume))throw Error('invalid_context');url.pathname='/together.html';url.hash='resume='+context.resume;}
 else{const path=titlePath(context.path);if(!path)throw Error('invalid_context');url.pathname=path;if(/^[A-Z]{2}$/.test(context.country||''))url.hash='availability-'+context.country.toLowerCase();}
 if(LANGS.includes(context.language))url.searchParams.set('lang',context.language);
 // A different query makes the safe browser fallback a document navigation,
 // so its early bootstrap consumes the private fragment before analytics.
 url.searchParams.set('app_resume','1');return url.href;
}
function androidIntent(context){const url=appUrl(context);return 'intent:'+url.slice('https:'.length)+'#Intent;scheme=https;package=com.jonas.papercup;S.browser_fallback_url='+encodeURIComponent(url)+';end';}
function resultValid(result){return !!(result&&typeof result.title==='string'&&result.title.length<=300&&['movie','tv'].includes(result.kind)&&Number.isSafeInteger(result.tmdbId)&&result.tmdbId>0&&Array.isArray(result.viewing)&&result.viewing.length>0&&result.viewing.length<=2&&result.viewing.every(v=>['shared','host','guest'].includes(v.role)&&safeSource(v.sourceUrl,result.tmdbId,result.kind,v.country)&&Number.isFinite(Date.parse(v.checkedAt))&&Array.isArray(v.offers)&&v.offers.length>0&&v.offers.length<=30&&v.offers.every(o=>typeof o.provider==='string'&&o.provider.length<=120&&['subscription','rental','purchase','free','free_with_ads'].includes(o.access))));}
function randomToken(cryptoObject){const bytes=new Uint8Array(32);cryptoObject.getRandomValues(bytes);return Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');}
function androidBrowser(w){const ua=w.navigator.userAgent||'';return /Android/i.test(ua)&&!/;\s*wv\)|MatchApp|Papercup/i.test(ua)&&!w.MatchAppNative&&!w.MatchAppNativeAuth&&!w.Android&&!w.matchMedia('(display-mode: standalone)').matches&&!w.navigator.standalone&&!/^\/kids(?:\/|$)/.test(w.location.pathname);}
function analyticsAllowed(w){
 try{if(w.localStorage.getItem('match_cookie_choice')==='essential')return false;}catch(_){}
 let status='denied';for(const item of Array.from(w.dataLayer||[]).slice(-500)){if(item&&item[0]==='consent'&&['default','update'].includes(item[1])&&item[2]&&['granted','denied'].includes(item[2].analytics_storage))status=item[2].analytics_storage;}
 return status==='granted';
}
const eventNames=new Set(['quiz_started','quiz_completed','invite_created','shared_result_revealed','viewing_options_selected','shared_match_saved','shared_match_accepted','app_prompt_viewed','app_store_clicked','open_app_clicked','app_prompt_dismissed']);
function track(w,name,surface){if(!eventNames.has(name)||!['together','title'].includes(surface)||!analyticsAllowed(w)||typeof w.gtag!=='function')return false;try{w.gtag('event',name,{growth_surface:surface,page_location:w.location.origin+w.location.pathname,transport_type:'beacon'});return true;}catch(_){return false;}}
return Object.freeze({LANGS,TOKEN,safeSource,poster,titlePath,playUrl,appUrl,androidIntent,resultValid,randomToken,androidBrowser,analyticsAllowed,track});
});
