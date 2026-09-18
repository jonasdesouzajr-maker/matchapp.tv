/* MatchApp phone-number signup + login.
   Uses Supabase Phone OTP. The control stays hidden unless Auth settings report phone=true. */
(function(){
'use strict';

const RESEND_SECONDS=60;
let activePhone='';
let resendTimer=null;
let resendLeft=0;

const strings={
  en:{entry:'Sign up / log in with phone',title:'Continue with your phone',help:'Enter your mobile number including the country code, for example +55 21 99999 9999.',send:'Send code',sent:'We sent a 6-digit code by SMS.',code:'6-digit code',verify:'Verify & continue',change:'Use a different number',resend:'Resend code',wait:n=>`Resend in ${n}s`,badPhone:'Enter a valid mobile number with country code, starting with +.',badCode:'Enter the 6-digit code from the SMS.',sending:'Sending code…',verifying:'Checking code…',success:'Phone verified. You’re signed in.'},
  'pt-BR':{entry:'Cadastrar / entrar com telefone',title:'Continue com seu telefone',help:'Digite seu celular com código do país, por exemplo +55 21 99999 9999.',send:'Enviar código',sent:'Enviamos um código de 6 dígitos por SMS.',code:'Código de 6 dígitos',verify:'Verificar e continuar',change:'Usar outro número',resend:'Reenviar código',wait:n=>`Reenviar em ${n}s`,badPhone:'Digite um celular válido com código do país, começando com +.',badCode:'Digite o código de 6 dígitos recebido por SMS.',sending:'Enviando código…',verifying:'Verificando código…',success:'Telefone verificado. Você entrou na conta.'},
  es:{entry:'Registrarse / entrar con teléfono',title:'Continúa con tu teléfono',help:'Introduce tu número móvil con código de país, por ejemplo +34 612 345 678.',send:'Enviar código',sent:'Te enviamos un código de 6 dígitos por SMS.',code:'Código de 6 dígitos',verify:'Verificar y continuar',change:'Usar otro número',resend:'Reenviar código',wait:n=>`Reenviar en ${n}s`,badPhone:'Introduce un móvil válido con código de país, empezando por +.',badCode:'Introduce el código de 6 dígitos del SMS.',sending:'Enviando código…',verifying:'Verificando código…',success:'Teléfono verificado. Sesión iniciada.'}
};

function lang(){
  const raw=window.MATCH_LANG||document.documentElement.lang||'en';
  return strings[raw]||strings[raw.split('-')[0]]||strings.en;
}
function client(){return window.supabaseClient||null;}
function el(id){return document.getElementById(id);}
function setStatus(text,state='info'){
  const node=el('phone-auth-status');
  if(!node)return;
  node.textContent=text||'';
  node.dataset.state=state;
  node.hidden=!text;
}
function normalizePhone(value){
  let v=String(value||'').trim().replace(/[\s().-]/g,'');
  if(v.startsWith('00'))v='+'+v.slice(2);
  return /^\+[1-9]\d{7,14}$/.test(v)?v:'';
}
function setStep(step){
  const number=el('phone-auth-number-step');
  const code=el('phone-auth-code-step');
  if(number)number.hidden=step!=='number';
  if(code)code.hidden=step!=='code';
}
function applyText(){
  const t=lang();
  const entry=el('phone-auth-entry');
  if(entry)entry.querySelector('span').textContent=t.entry;
  if(el('phone-auth-title'))el('phone-auth-title').textContent=t.title;
  if(el('phone-auth-help'))el('phone-auth-help').textContent=t.help;
  if(el('phone-auth-send'))el('phone-auth-send').textContent=t.send;
  if(el('phone-auth-code-help'))el('phone-auth-code-help').textContent=t.sent;
  if(el('phone-auth-code'))el('phone-auth-code').placeholder=t.code;
  if(el('phone-auth-verify'))el('phone-auth-verify').textContent=t.verify;
  if(el('phone-auth-change'))el('phone-auth-change').textContent=t.change;
  if(el('phone-auth-resend'))el('phone-auth-resend').textContent=t.resend;
}
function togglePanel(show){
  const panel=el('phone-auth-panel');
  if(!panel)return;
  panel.hidden=!show;
  if(show){
    setStep(activePhone?'code':'number');
    setStatus('');
    setTimeout(()=>el(activePhone?'phone-auth-code':'phone-auth-number')?.focus(),30);
  }
}
function startCountdown(){
  clearInterval(resendTimer);
  resendLeft=RESEND_SECONDS;
  const btn=el('phone-auth-resend');
  const t=lang();
  const tick=()=>{
    if(!btn)return;
    btn.disabled=resendLeft>0;
    btn.textContent=resendLeft>0?t.wait(resendLeft):t.resend;
    if(resendLeft<=0){clearInterval(resendTimer);return;}
    resendLeft--;
  };
  tick();
  resendTimer=setInterval(tick,1000);
}
async function sendCode(){
  const t=lang(),sb=client();
  if(!sb)return;
  const phone=normalizePhone(el('phone-auth-number')?.value);
  if(!phone){setStatus(t.badPhone,'error');el('phone-auth-number')?.focus();return;}

  const btn=el('phone-auth-send');
  if(btn)btn.disabled=true;
  setStatus(t.sending,'info');
  try{
    const {error}=await sb.auth.signInWithOtp({
      phone,
      options:{
        shouldCreateUser:true,
        channel:'sms',
        data:{matchapp_first_time_onboarding_v1:true}
      }
    });
    if(error)throw error;
    activePhone=phone;
    setStep('code');
    setStatus(t.sent,'ok');
    const code=el('phone-auth-code');
    if(code){code.value='';setTimeout(()=>code.focus(),40);}
    startCountdown();
  }catch(error){
    setStatus(error?.message||'Could not send the SMS code.','error');
  }finally{
    if(btn)btn.disabled=false;
  }
}
async function verifyCode(){
  const t=lang(),sb=client();
  if(!sb||!activePhone)return;
  const token=String(el('phone-auth-code')?.value||'').replace(/\D/g,'');
  if(!/^\d{6,10}$/.test(token)){setStatus(t.badCode,'error');el('phone-auth-code')?.focus();return;}

  const btn=el('phone-auth-verify');
  if(btn)btn.disabled=true;
  setStatus(t.verifying,'info');
  try{
    const {data,error}=await sb.auth.verifyOtp({phone:activePhone,token,type:'sms'});
    if(error)throw error;
    if(!data?.session)throw new Error('Phone verification did not create a session.');
    setStatus(t.success,'ok');
    document.dispatchEvent(new CustomEvent('matchapp:phoneauthsuccess',{detail:{phone:activePhone}}));
    setTimeout(()=>window.location.reload(),650);
  }catch(error){
    setStatus(error?.message||'That code could not be verified.','error');
  }finally{
    if(btn)btn.disabled=false;
  }
}
async function resendCode(){
  if(resendLeft>0||!activePhone)return;
  const field=el('phone-auth-number');
  if(field)field.value=activePhone;
  await sendCode();
}
function resetPhone(){
  activePhone='';
  clearInterval(resendTimer);
  setStep('number');
  setStatus('');
  if(el('phone-auth-code'))el('phone-auth-code').value='';
  setTimeout(()=>el('phone-auth-number')?.focus(),30);
}
async function providerEnabled(){
  const sb=client();
  if(!sb)return false;
  try{
    const url=String(sb.supabaseUrl||'').replace(/\/$/,'')+'/auth/v1/settings';
    const key=sb.supabaseKey;
    if(!url||!key)return false;
    const res=await fetch(url,{headers:{apikey:key},cache:'no-store'});
    if(!res.ok)return false;
    const data=await res.json();
    return data?.external?.phone===true;
  }catch(_){return false;}
}
async function syncAvailability(){
  const entry=el('phone-auth-entry');
  const panel=el('phone-auth-panel');
  if(!entry||!panel)return;
  const enabled=await providerEnabled();
  entry.hidden=!enabled;
  if(!enabled)panel.hidden=true;
}
function init(){
  applyText();
  el('phone-auth-entry')?.addEventListener('click',()=>togglePanel(el('phone-auth-panel')?.hidden!==false));
  el('phone-auth-send')?.addEventListener('click',sendCode);
  el('phone-auth-verify')?.addEventListener('click',verifyCode);
  el('phone-auth-change')?.addEventListener('click',resetPhone);
  el('phone-auth-resend')?.addEventListener('click',resendCode);
  el('phone-auth-number')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendCode();}});
  el('phone-auth-code')?.addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,10);});
  el('phone-auth-code')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();verifyCode();}});
  syncAvailability();
  document.addEventListener('matchapp:languagechange',applyText);
  window.addEventListener('focus',syncAvailability);
}
window.MatchAppPhoneAuth={syncAvailability,sendCode,verifyCode};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();