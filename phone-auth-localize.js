/* Completes phone-auth localization without changing the auth flow itself. */
(function(){
'use strict';
const supportedNative=new Set(['en','pt-BR','es']);
const byId=id=>document.getElementById(id);
const rawLang=()=>String(window.MATCH_LANG||document.documentElement.lang||'en');
const getStrings=()=>{
  const raw=rawLang();
  if(supportedNative.has(raw)||supportedNative.has(raw.split('-')[0])) return null;
  const all=window.MATCH_PHONE_AUTH_STRINGS||{};
  return all[raw]||all[raw.split('-')[0]]||null;
};
function apply(){
  const t=getStrings(); if(!t)return;
  const entry=byId('phone-auth-entry');
  const span=entry?.querySelector('span'); if(span)span.textContent=t.entry;
  if(byId('phone-auth-title'))byId('phone-auth-title').textContent=t.title;
  if(byId('phone-auth-help'))byId('phone-auth-help').textContent=t.help;
  if(byId('phone-auth-send'))byId('phone-auth-send').textContent=t.send;
  if(byId('phone-auth-code-help'))byId('phone-auth-code-help').textContent=t.sent;
  if(byId('phone-auth-code'))byId('phone-auth-code').placeholder=t.code;
  if(byId('phone-auth-verify'))byId('phone-auth-verify').textContent=t.verify;
  if(byId('phone-auth-change'))byId('phone-auth-change').textContent=t.change;
  localizeResend();
  localizeStatus();
}
function localizeResend(){
  const t=getStrings(),btn=byId('phone-auth-resend'); if(!t||!btn)return;
  const m=String(btn.textContent||'').match(/Resend in (\d+)s/i);
  if(m){const next=t.wait(Number(m[1]));if(btn.textContent!==next)btn.textContent=next;return;}
  if(!btn.disabled&&btn.textContent!==t.resend)btn.textContent=t.resend;
}
function localizeStatus(){
  const t=getStrings(),node=byId('phone-auth-status');if(!t||!node||node.hidden)return;
  const current=String(node.textContent||'');
  const exact={
    'Sending code…':t.sending,
    'We sent a 6-digit code by SMS.':t.sent,
    'Checking code…':t.verifying,
    'Phone verified. You’re signed in.':t.success,
    'Enter a valid mobile number with country code, starting with +.':t.badPhone,
    'Enter the 6-digit code from the SMS.':t.badCode
  };
  const next=exact[current];if(next&&next!==current)node.textContent=next;
}
function observe(){
  const status=byId('phone-auth-status'),resend=byId('phone-auth-resend');
  if(status)new MutationObserver(localizeStatus).observe(status,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden','data-state']});
  if(resend)new MutationObserver(localizeResend).observe(resend,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['disabled']});
}
function init(){apply();observe();}
document.addEventListener('matchapp:langchange',apply);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
