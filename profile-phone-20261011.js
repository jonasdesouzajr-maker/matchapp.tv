/* Account-bound phone verification. Never creates or signs in a second account.
   Phone stays pending until Supabase phone_change OTP confirms it. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const auth=()=>window.supabaseClient?.auth;
const sb=()=>window.supabaseClient;
const tel=()=>window.libphonenumber;
const locale=()=>String(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en').toLowerCase();
const text={
 en:{title:'Phone & SMS preferences',intro:'Add your mobile number to this signed-in account. Choose its country: you do not need to type + or the international prefix.',country:'Country',number:'Mobile number',send:'Send verification SMS',verify:'Confirm number',code:'6-digit SMS code',resend:'Resend SMS',waiting:'Checking your account…',signIn:'Sign in to link your phone to your existing account.',ready:'Enter a mobile number to receive a verification code.',sending:'Requesting a verification code…',sent:'Check your messages and enter the SMS code. Your number is not saved until verified.',verifying:'Checking your code…',verified:'Phone verified and linked to this account.',already:'Verified number',invalid:'Enter a valid mobile number for the selected country.',wrong:'We could not confirm this phone on your original account. No change was accepted.',failed:'Unable to verify this number. Please try again.',consent:'Allow optional SMS communications from MatchApp Ai',consentHelp:'Optional. This does not affect verification messages. You can turn it off any time. No marketing messages are sent just by saving a number.',saving:'Saving preference…',saved:'SMS preference saved to your account.',unavailable:'Phone validation is loading. Try again shortly.',wait:'Please wait before requesting another SMS.'},
 'pt-br':{title:'Telefone e preferências de SMS',intro:'Adicione seu celular à mesma conta conectada. Escolha o país: não é necessário digitar + nem o DDI.',country:'País',number:'Número do celular',send:'Enviar SMS de verificação',verify:'Confirmar número',code:'Código SMS de 6 dígitos',resend:'Reenviar SMS',waiting:'Verificando sua conta…',signIn:'Entre na sua conta para vincular o celular.',ready:'Informe seu celular para receber o código.',sending:'Solicitando o código…',sent:'Digite o código recebido por SMS. Seu telefone só será vinculado depois da confirmação.',verifying:'Verificando o código…',verified:'Celular confirmado e vinculado a esta conta.',already:'Número confirmado',invalid:'Digite um celular válido para o país escolhido.',wrong:'Não foi possível confirmar este telefone na sua conta original. Nenhuma alteração foi aceita.',failed:'Não foi possível verificar. Tente novamente.',consent:'Autorizar comunicações opcionais por SMS da MatchApp Ai',consentHelp:'Opcional. Não afeta o SMS de verificação. Você pode desativar quando quiser. Salvar seu celular não ativa mensagens promocionais.',saving:'Salvando preferência…',saved:'Preferência salva na sua conta.',unavailable:'A validação está carregando. Tente novamente.',wait:'Aguarde antes de solicitar outro SMS.'},
 es:{title:'Teléfono y preferencias SMS',intro:'Vincula un móvil a tu misma cuenta. Selecciona el país, sin escribir + ni prefijo.',country:'País',number:'Número de móvil',send:'Enviar SMS',verify:'Confirmar número',code:'Código SMS de 6 dígitos',resend:'Reenviar SMS',waiting:'Comprobando tu cuenta…',signIn:'Inicia sesión para vincular el móvil.',ready:'Introduce el móvil para recibir un código.',sending:'Solicitando código…',sent:'Introduce el código SMS. El número no se vincula hasta que lo verifiques.',verifying:'Comprobando código…',verified:'Móvil verificado y vinculado a tu cuenta.',already:'Número verificado',invalid:'Introduce un móvil válido para el país.',wrong:'No se pudo verificar el móvil en tu cuenta original.',failed:'No se pudo verificar. Inténtalo de nuevo.',consent:'Permitir comunicaciones SMS opcionales de MatchApp Ai',consentHelp:'Opcional. No afecta al SMS de verificación. Puedes desactivarlo cuando quieras.',saving:'Guardando…',saved:'Preferencia guardada.',unavailable:'Cargando validación. Inténtalo de nuevo.',wait:'Espera antes de reenviar el código.'}
};
const t=k=>(text[locale()]||text[locale().split('-')[0]]||text.en)[k]||text.en[k];
let uid=null,verified=null,pending=null,busy=false,epoch=0,lastSent=0;
const status=(k,bad=false)=>{const x=$('pf-phone-status');if(x){x.textContent=t(k);x.dataset.state=bad?'error':'info';}};
const masked=p=>p?String(p).slice(0,Math.max(0,p.length-4)).replace(/\d/g,'•')+String(p).slice(-4):'';
function resetPending(){pending=null;$('pf-phone-code-row').hidden=true;}
function render(){
 const logged=!!uid,hasPhone=!!verified;
 $('pf-phone-entry').hidden=!logged;
 $('pf-phone-signedout').hidden=logged;
 $('pf-phone-signedout').textContent=t('signIn');
 $('pf-phone-current').hidden=!hasPhone;
 if(hasPhone)$('pf-phone-current').textContent=t('already')+': '+masked(verified);
 $('pf-phone-send').disabled=busy||!logged||!tel();
 $('pf-phone-verify').disabled=busy||!pending||!logged;
 $('pf-phone-resend').disabled=busy||!pending||Date.now()-lastSent<60000;
 $('pf-sms-consent').disabled=busy||!hasPhone;
 $('pf-phone-sms-label').textContent=t('consent');
 $('pf-phone-sms-help').textContent=t('consentHelp');
 for(const field of ['title','intro','country','number','send','verify','resend']){
  const node=$('pf-phone-'+field+'-label') || $('pf-phone-'+field);
  if(node && ['title','intro'].includes(field))node.textContent=t(field);
 }
 $('pf-phone-country-label').textContent=t('country');
 $('pf-phone-number-label').textContent=t('number');
 $('pf-phone-send').textContent=t('send');
 $('pf-phone-verify').textContent=t('verify');
 $('pf-phone-resend').textContent=t('resend');
 $('pf-phone-code').placeholder=t('code');
}
function chooseCountry(){
 const select=$('pf-phone-country');if(!select||!tel())return;
 const country=String(window.matchProfileState?.country||localStorage.getItem('match_user_country')||'').toUpperCase().trim();
 const navigatorRegion=String(navigator.language||'').split('-')[1]?.toUpperCase();
 const preferred=[country,navigatorRegion,'BR','US'].find(v=>v&&[...select.options].some(o=>o.value===v));
 if(preferred)select.value=preferred;
}
function countries(){
 if(!tel()?.getCountries)return false;
 const select=$('pf-phone-country');
 const current=select.value;
 const names=typeof Intl.DisplayNames==='function'?new Intl.DisplayNames([locale()],{type:'region'}):null;
 select.replaceChildren();
 const codes=tel().getCountries().map(c=>({code:c,name:names?.of(c)||c,dial:tel().getCountryCallingCode(c)}));
 codes.sort((a,b)=>a.name.localeCompare(b.name,locale()));
 for(const c of codes){const o=document.createElement('option');o.value=c.code;o.textContent=c.name+' (+'+c.dial+')';select.appendChild(o);}
 if(current&&codes.some(c=>c.code===current))select.value=current;else chooseCountry();
 return true;
}
function parse(){
 const lib=tel();if(!lib)return null;
 const country=$('pf-phone-country').value;
 const digits=$('pf-phone-number').value.replace(/\D/g,'');
 const number=lib.parsePhoneNumberFromString(digits,country);
 if(!number?.isValid() || number.countryCallingCode!==lib.getCountryCallingCode(country))return null;
 const kind=number.getType?.();
 if(kind && kind!=='MOBILE' && kind!=='FIXED_LINE_OR_MOBILE')return null;
 return number.number;
}
async function refresh(){
 const stamp=++epoch;
 try {
  const {data,error}=await auth()?.getUser?.()||{};
  if(stamp!==epoch)return;
  const user=!error?data?.user:null;
  const next=user?.id||null;
  if(uid!==next)resetPending();
  uid=next;
  verified=(uid && user.phone_confirmed_at && user.phone)?user.phone:null;
  $('pf-sms-consent').checked=false;
  if(uid){
   const result=await sb().from('profiles').select('sms_communications_opt_in').eq('id',uid).maybeSingle();
   if(stamp!==epoch)return;
   if(!result.error&&result.data)$('pf-sms-consent').checked=verified?result.data.sms_communications_opt_in===true:false;
  }
  render();
  if(!pending) {
    if(uid) status(verified?'verified':'ready');
    else { const node=$('pf-phone-status');if(node)node.textContent=''; }
  }
 }catch(_){if(stamp===epoch){uid=null;verified=null;render();status('signIn');}}
}
async function request(){
 if(busy||!uid)return;
 const number=parse();
 if(!number){status('invalid',true);return;}
 const original=uid;
 busy=true;render();status('sending');
 try{
  const before=await auth().getUser();
  if(before.error||before.data?.user?.id!==original)throw Error('account');
  // Fail closed if another account already has this verified or pending number.
  // GoTrue phone_change OTP uses a non-unique pending number for lookup.
  const allowed=await sb().rpc('can_link_phone_for_profile',{candidate_phone:number});
  if(allowed.error||allowed.data!==true)throw Error('account');
  const {error}=await auth().updateUser({phone:number});
  if(error)throw error;
  pending={uid:original,phone:number};lastSent=Date.now();
  $('pf-phone-code').value='';
  $('pf-phone-code-row').hidden=false;
  status('sent');
 }catch(error){status(error.message==='account'?'wrong':'failed',true);}
 finally{busy=false;render();}
}
async function confirm(){
 if(busy||!pending||pending.uid!==uid)return;
 const token=$('pf-phone-code').value.replace(/\D/g,'');
 if(!/^\d{6}$/.test(token)){status('failed',true);return;}
 const saved={...pending};busy=true;render();status('verifying');
 try{
  const before=await auth().getUser();
  if(before.error||before.data?.user?.id!==saved.uid)throw Error('account');
  const allowed=await sb().rpc('can_link_phone_for_profile',{candidate_phone:saved.phone});
  if(allowed.error||allowed.data!==true)throw Error('account');
  const {data,error}=await auth().verifyOtp({phone:saved.phone,token,type:'phone_change'});
  if(error)throw error;
  if(data?.user && data.user.id!==saved.uid)throw Error('account');
  const checked=await auth().getUser();
  if(checked.error||checked.data?.user?.id!==saved.uid ||checked.data.user.phone!==saved.phone||!checked.data.user.phone_confirmed_at)throw Error('account');
  verified=saved.phone;resetPending();status('verified');
 }catch(error){status(error.message==='account'?'wrong':'failed',true);}
 finally{busy=false;render();}
}
async function resend(){
 if(busy||!pending||Date.now()-lastSent<60000)return;
 const saved={...pending};busy=true;render();status('sending');
 try {
  const current=await auth().getUser();
  if(current.error||current.data?.user?.id!==saved.uid)throw Error('account');
  const {error}=await auth().resend({type:'phone_change',phone:saved.phone});
  if(error)throw error;
  lastSent=Date.now();status('sent');
 } catch(error){status(error.message==='account'?'wrong':'failed',true);}
 finally{busy=false;render();}
}
async function consent(){
 if(!uid||!verified||busy)return;
 const checked=$('pf-sms-consent').checked;
 busy=true;render();status('saving');
 try {
  const current=await auth().getUser();
  if(current.error||current.data?.user?.id!==uid||current.data.user.phone!==verified||!current.data.user.phone_confirmed_at)throw Error('account');
  const {data,error}=await sb().from('profiles').update({sms_communications_opt_in:checked,sms_communications_updated_at:new Date().toISOString()}).eq('id',uid).select('id').maybeSingle();
  if(error||!data?.id)throw Error('failed');
  status('saved');
 }catch(_){$('pf-sms-consent').checked=!checked;status('failed',true);}
 finally{busy=false;render();}
}
function boot(){
 if(!$('pf-phone-entry'))return;
 countries();
 $('pf-phone-country').addEventListener('change',()=>{resetPending();render();});
 $('pf-phone-number').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,18);resetPending();render();});
 $('pf-phone-code').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,6)});
 $('pf-phone-send').addEventListener('click',request);
 $('pf-phone-verify').addEventListener('click',confirm);
 $('pf-phone-resend').addEventListener('click',resend);
 $('pf-sms-consent').addEventListener('change',consent);
 sb()?.auth?.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){++epoch;uid=null;verified=null;resetPending();render();return;}setTimeout(refresh,0);});
 document.addEventListener('matchapp:authchange',()=>setTimeout(refresh,0));
 document.addEventListener('matchapp:profilehydrated',()=>setTimeout(refresh,0));
 window.addEventListener('focus',refresh);
 document.addEventListener('matchapp:langchange',()=>{countries();render();});
 setTimeout(()=>{if(!countries())status('unavailable',true);render();refresh();},0);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.MatchAppProfilePhone={refresh,parse};
})();