/* MatchApp Ai · Jonas Chat Plus · subscriber-only chat.
   No client-side subscription assertions: the Supabase endpoint checks Stripe entitlements. */
(function(){
'use strict';
if(!/^(www\.)?matchapp\.tv$/.test(location.host)||/^\/kids(?:\/|$)/.test(location.pathname))return;
if(window.MatchAppJonasPlus)return;
var $=id=>document.getElementById(id);
var pt=()=>/^pt/i.test(window.MATCH_LANG||document.documentElement.lang||navigator.language||'en');
var t=(en,br)=>pt()?br:en;
var play=()=>!!window.MatchAppNativeVoice||document.documentElement.classList.contains('matchapp-ai-android')||/;\s*wv[);]/i.test(navigator.userAgent||'');
var usage=null,active=false,loading=false,history=[],box=null,lastFocus=null;
function el(tag,cls,id){var x=document.createElement(tag);if(cls)x.className=cls;if(id)x.id=id;return x}
function label(tag,text,cls,id){var x=el(tag,cls,id);x.textContent=text;return x}
function notify(text){var x=$('jonas-plus-status');if(x)x.textContent=text}
function css(){
 if($('jonas-plus-css'))return;
 var style=el('style','','jonas-plus-css');
 style.textContent=[
 '.jp-card{margin:18px auto 25px;max-width:950px;padding:19px;border:1px solid #d7b873;',
 'border-radius:23px;background:linear-gradient(130deg,#281632,#110a1d);color:white;text-align:left;',
 'box-shadow:0 15px 36px #0005}.jp-card h2{color:#ffe3a5;margin:7px 0;font:800 25px system-ui}',
 '.jp-card p,.jp-card li{font:400 13px/1.6 system-ui;color:#dfd5e9}.jp-card ul{padding-left:20px}',
 '.jp-card .jp-price{font:800 29px system-ui;color:white}.jp-card .jp-price small{font:400 12px system-ui}',
 '.jp-row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:center}',
 '.jp-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:15px}',
 '.jp-btn{border:1px solid #e9d49c;border-radius:99px;background:linear-gradient(120deg,#ecd69b,#d4ae66);',
 'color:#291729;min-height:44px;padding:10px 18px;font:750 13px system-ui;cursor:pointer}',
 '.jp-btn.secondary{background:#39234a;color:#fff;border-color:#9a7ec2}',
 '.jp-btn:disabled{opacity:.58;cursor:not-allowed}',
 '#jonas-plus-shade{position:fixed;inset:0;background:#07040bcc;z-index:2147482498}',
 '#jonas-plus-box{position:fixed;inset:4vh max(10px,calc((100vw - 520px)/2));',
 'border:1px solid #e4c47e;border-radius:23px;display:flex;flex-direction:column;z-index:2147482499;',
 'background:linear-gradient(135deg,#2b1839,#100b1b);color:white;overflow:hidden;max-height:92dvh}',
 '#jonas-plus-shade[hidden],#jonas-plus-box[hidden]{display:none!important}',
 '#jonas-plus-head{padding:13px;display:flex;justify-content:space-between;align-items:center;',
 'border-bottom:1px solid #dec18555;color:#ffe4a2;font:800 17px system-ui}',
 '#jonas-plus-messages{padding:13px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;min-height:0}',
 '.jp-msg{align-self:start;max-width:94%;border:1px solid #ffffff22;border-radius:15px;',
 'background:#ffffff13;padding:11px 13px;font:400 14px/1.6 system-ui;white-space:pre-wrap;overflow-wrap:anywhere}',
 '.jp-msg.self{align-self:end;background:#8a56d744;border-color:#aa82cc}',
 '#jonas-plus-form{padding:12px;display:flex;gap:7px;border-top:1px solid #dcc07855}',
 '#jonas-plus-input{flex:1;resize:vertical;max-height:110px;min-height:48px;',
 'background:#1b1229;border:1px solid #bba3c3;border-radius:12px;color:white;padding:10px;font:400 14px system-ui}',
 '#jonas-plus-remaining{color:#d6c0df;font:500 11px system-ui;padding:8px 12px}',
 '@media(max-width:520px){.jp-card{padding:15px}.jp-card .jp-price{font-size:23px}',
 '#jonas-plus-box{inset:1vh 7px;border-radius:19px;max-height:98dvh}}',
 '@media(prefers-reduced-motion:reduce){#jonas-plus-box *{animation:none!important;transition:none!important}}'
 ].join('');
 (document.head||document.documentElement).appendChild(style);
}
async function session(){try{return(await window.supabaseClient?.auth?.getSession())?.data?.session||null}catch(e){return null}}
async function call(payload){
 var sb=window.supabaseClient;
 if(!sb?.functions?.invoke)throw Error(t('Sign-in is loading. Try again.','A sessão está carregando. Tente novamente.'));
 if(!(await session()))throw Error(t('Sign in to use Jonas Chat Plus.','Entre na sua conta para usar Jonas Chat Plus.'));
 var x=await sb.functions.invoke('jonas-chat',{body:payload});
 if(x.error){
  var msg=x.data?.error;
  try{var d=await x.error.context?.json?.();msg=d?.error||msg}catch(e){}
  throw Error(msg||t('Jonas cannot reply right now.','Jonas não pode responder agora.'));
 }
 if(x.data?.error)throw Error(x.data.error);
 return x.data;
}
function allowances(){
 if(!usage)return t('Sign in to see your available chats.','Entre para consultar suas mensagens.');
 var r=usage.remaining;
 return active&&r?t('Remaining: ','Restantes: ')+r.day+t(' today · ',' hoje · ')+r.week+
  t(' this week · ',' nesta semana · ')+r.cycle+t(' this billing cycle',' neste ciclo'):
  t('No active Jonas Plus subscription','Sem assinatura Jonas Plus ativa');
}
function display(){
 notify(allowances());
 var b=$('jonas-plus-buy');if(b){b.hidden=active;b.disabled=play();b.textContent=play()?
   t('Purchase in Android coming soon','Compra pelo Android em breve'):t('Subscribe to Jonas Plus','Assinar Jonas Plus');}
 var m=$('jonas-plus-manage');if(m)m.hidden=!active||play();
 var q=$('jonas-plus-start');if(q)q.disabled=!active;
 var remain=$('jonas-plus-remaining');if(remain)remain.textContent=allowances();
}
async function refresh(){
 if(!(await session())){usage=null;active=false;display();return false}
 try{usage=await call({action:'status'});active=usage?.active===true;display();return active}
 catch(e){usage=null;active=false;notify(e.message);display();return false}
}
function isPricing(){return /^\/pricing(?:\/pricing\.html|\/)?$/.test(location.pathname)}
function brazil(){return window.MatchBillingMarket?.market==='BR'||pt()}
async function checkout(){
 if(play())return;
 if(typeof window.startVerifiedCheckout==='function')return window.startVerifiedCheckout('jonas_chat_monthly',$('jonas-plus-buy'));
 try{
  var body={product:'jonas_chat_monthly',lang:window.MATCH_LANG||'en',
   ...(brazil()?{market:'BR',currency:'brl'}:{})};
  var x=await window.supabaseClient.functions.invoke('stripe-checkout',{body});
  if(x.error||!x.data?.url?.startsWith('https://checkout.stripe.com/'))throw Error();
  location.assign(x.data.url);
 }catch(e){notify(t('Secure checkout unavailable. Try again later.','Checkout seguro indisponível. Tente mais tarde.'))}
}
async function manage(){
 if(play())return;
 try{
  var x=await window.supabaseClient.functions.invoke('stripe-checkout',{body:{action:'portal'}});
  if(x.error||!x.data?.url?.startsWith('https://billing.stripe.com/'))throw Error();
  location.assign(x.data.url);
 }catch(e){notify(t('Billing management unavailable.','Gerenciamento de assinatura indisponível.'))}
}
function pricing(){
 if(!isPricing()||$('jonas-plus-card'))return;
 var parent=document.querySelector('main .container')||document.querySelector('main');
 if(!parent)return;
 var card=el('section','jp-card','jonas-plus-card');
 card.setAttribute('aria-label','Jonas Chat Plus subscription');
 var row=el('div','jp-row'),group=el('div');
 group.append(label('small','MATCHAPP AI · JONAS'),label('h2','Jonas Chat Plus'));
 var price=label('div',brazil()?'R$ 39,90':'$9.99','jp-price','jonas-plus-price');
 price.append(label('small',t(' / month',' / mês')));row.append(group,price);
 var desc=label('p',t('Your Jonas AI chat subscription, separate from VIP and Business.',
 'Sua assinatura de chat com Jonas, separada de VIP e Business.'));
 var limits=el('ul');
 var lines=pt()?[
  '30 chats a cada 24 horas · 150 a cada 7 dias · 450 por período mensal pago',
  'Converse sobre entretenimento e qualquer assunto permitido, com respostas em seu idioma',
  'Sem créditos extras de Matches ou Kids; conta e limite sincronizados no Android',
  'Voz de leitura do dispositivo quando disponível; sem chamadas de voz ilimitadas'
 ]:[
  '30 chats per 24 hours · 150 per seven days · 450 per paid monthly cycle',
  'Entertainment and everyday questions in your language, subject to safety requirements',
  'No extra Matches or Kids credits; account and usage shared with Android',
  'Device read-aloud when available; unlimited live voice calls not included'
 ];
 lines.forEach(x=>limits.append(label('li',x)));
 var actions=el('div','jp-actions');
 var buy=label('button',t('Subscribe to Jonas Plus','Assinar Jonas Plus'),'jp-btn','jonas-plus-buy');
 var chat=label('button',t('Chat with Jonas','Conversar com Jonas'),'jp-btn secondary','jonas-plus-start');
 var portal=label('button',t('Manage / cancel','Gerenciar / cancelar'),'jp-btn secondary','jonas-plus-manage');
 for(var b of [buy,chat,portal])b.type='button';
 buy.onclick=checkout;chat.onclick=open;portal.onclick=manage;
 actions.append(buy,chat,portal);
 var status=label('p',t('Sign in to see your allowance.','Entre para ver o saldo.'),'','jonas-plus-status');
 status.setAttribute('role','status');
 var fine=label('p',t('Billed monthly. Cancel any time. Access lasts until the paid period ends. Taxes may apply.',
 'Cobrança mensal. Cancele a qualquer momento. Acesso até o fim do período pago. Tributos podem incidir.'));
 card.append(row,desc,limits,actions,status,fine);
 parent.parentNode?.insertBefore(card,parent);
 display();void refresh();
 if(window.MatchBillingMarket?.ready?.then)window.MatchBillingMarket.ready.then(()=>{
  price.firstChild.textContent=brazil()?'R$ 39,90':'$9.99';
 }).catch(()=>{});
}
function message(who,text){
 var log=$('jonas-plus-messages');if(!log)return;
 log.append(label('div',text,'jp-msg'+(who==='user'?' self':'')));
 log.scrollTop=log.scrollHeight;
}
async function send(text){
 var question=String(text||'').trim();
 if(!question||loading)return;
 if(question.length>600){message('assistant',t('Please shorten your question.','Reduza sua pergunta.'));return}
 if(!active && !(await refresh())){message('assistant',t('An active Jonas Chat Plus subscription is required.','Assinatura Jonas Chat Plus ativa necessária.'));return}
 loading=true;
 var button=$('jonas-plus-send');if(button)button.disabled=true;
 message('user',question);
 try{
  var result=await call({action:'ask',question,history:history.slice(-8),
   lang:window.MATCH_LANG||navigator.language||'en',country:String(window.MATCH_COUNTRY||'').slice(0,2)});
  var answer=String(result.answer||'').trim();
  if(!answer)throw Error(t('Jonas could not finish.','Jonas não conseguiu concluir.'));
  message('assistant',answer);
  history.push({role:'user',content:question},{role:'assistant',content:answer});
  history=history.slice(-8);
  if(result.remaining){
   usage=usage||{};usage.remaining=result.remaining;display();
  }
  if($('jonas-plus-voice')?.checked&&window.speechSynthesis){
   try{speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(answer.slice(0,1100));
    u.lang=window.MATCH_LANG||navigator.language;speechSynthesis.speak(u);}catch(e){}
  }
 }catch(e){message('assistant',e.message||t('Try again later.','Tente mais tarde.'));
  if(/limit|subscription|allowance|assinatura/i.test(e.message||''))void refresh();
 }finally{loading=false;if(button)button.disabled=false}
}
function buildDialog(){
 if(box)return;
 var shade=el('div','','jonas-plus-shade');shade.hidden=true;
 box=el('section','','jonas-plus-box');box.hidden=true;
 box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
 box.setAttribute('aria-label',t('Jonas Chat Plus conversation','Conversa Jonas Chat Plus'));
 var header=el('header','','jonas-plus-head'),title=label('strong','✦ Jonas Chat Plus');
 var close=label('button','×','jp-btn secondary','jonas-plus-close');close.type='button';close.onclick=hide;
 header.append(title,close);
 var log=el('div','','jonas-plus-messages');log.setAttribute('role','log');log.setAttribute('aria-live','polite');
 log.append(label('div',t('Hi! I’m Jonas. What can I help you with today?',
 'Oi! Sou Jonas. Como posso ajudar hoje?'),'jp-msg'));
 var remaining=el('div','','jonas-plus-remaining');
 var voice=el('label');voice.style.cssText='font:400 11px system-ui;padding:6px 13px';
 var checkbox=el('input','','jonas-plus-voice');checkbox.type='checkbox';
 voice.append(checkbox,document.createTextNode(t(' Read answers aloud',' Ler respostas em voz alta')));
 var form=el('form','','jonas-plus-form');
 var input=el('textarea','','jonas-plus-input');input.maxLength=600;input.rows=2;
 input.placeholder=t('Ask Jonas anything…','Pergunte ao Jonas…');input.setAttribute('aria-label',t('Your message','Sua mensagem'));
 var button=label('button',t('Send','Enviar'),'jp-btn','jonas-plus-send');button.type='submit';
 form.onsubmit=e=>{e.preventDefault();var q=input.value;input.value='';void send(q)};
 form.append(input,button);box.append(header,log,remaining,voice,form);
 shade.onclick=hide;document.body.append(shade,box);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!box.hidden)hide()});
}
function open(){css();buildDialog();lastFocus=document.activeElement;box.hidden=false;$('jonas-plus-shade').hidden=false;
 $('jonas-plus-close').focus({preventScroll:true});void refresh();}
function hide(){if(!box)return;box.hidden=true;$('jonas-plus-shade').hidden=true;
 if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
function entry(){
 if(play()||!/^\/(?:index\.html|discover\.html)?$/.test(location.pathname)||$('jonas-plus-entry'))return;
 var base=$('ma-ai-entry')||document.querySelector('.home-ask-composer,.newsearch-row');
 if(!base)return;
 var button=label('button','✦ Jonas Chat Plus','jp-btn secondary','jonas-plus-entry');
 button.type='button';button.onclick=open;
 base.parentNode?.insertBefore(button,base.nextSibling);
}
function init(){css();pricing();entry();}
window.MatchAppJonasPlus={open,refresh,isActive:()=>active,checkout,manage};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();