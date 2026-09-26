/* Adult-only independent public social verification. Post approval comes
   ONLY from match_private verified ledger after official TikTok/Bluesky APIs
   report a matching newly issued proof. No self-asserted or native-handoff
   bonus. Private Instagram/WhatsApp posts cannot be checked. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const guestKey='match_guestProofBrowser_v1';
const pt=()=>/^pt/i.test(String(window.MATCH_LANG||document.documentElement.lang||'en'));
const uuid=()=>{
 if(crypto.randomUUID)return crypto.randomUUID();
 const a=crypto.getRandomValues(new Uint8Array(16));a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;
 return Array.from(a,(n,i)=>(n<16?'0':'')+n.toString(16)).join('').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5');
};
function browserId(){
 let id;try{id=localStorage.getItem(guestKey);}catch(_){}
 if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id||'')){
  id=uuid();try{localStorage.setItem(guestKey,id);}catch(_){}
 }
 return id;
}
async function request(body){
 const client=window.supabaseClient;
 if(!client?.functions?.invoke)throw new Error('service_unavailable');
 const {data,error}=await client.functions.invoke('guest-social-proof',{body:{...body,guest_id:browserId()}});
 if(error){
  let reason='service_unavailable';
  try{const details=await error.context?.json?.();if(details?.reason)reason=details.reason;}catch(_){}
  throw new Error(reason);
 }
 if(!data?.ok)throw new Error(data?.reason||'verification_failed');
 return data;
}
function create(){
 let modal=$('#ma-official-social-proof');
 if(modal)return modal;
 modal=document.createElement('div');modal.id='ma-official-social-proof';
 modal.className='ma-guest-social-backdrop';modal.hidden=true;
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 modal.setAttribute('aria-label','Verify a public social post and unlock your free reward');
 modal.innerHTML=[
 '<div class="premium-card ma-guest-social-card ma-public-proof-card">',
 '<button class="ma-guest-social-close" type="button" data-proof-close aria-label="Close">✕</button>',
 '<h3 data-proof-heading>Share publicly · unlock +1</h3>',
 '<p class="ma-public-proof-lead">We will check the actual public post before awarding your bonus. No passwords or social account access required.</p>',
 '<label for="ma-proof-caption">Your unique sharing caption</label>',
 '<textarea id="ma-proof-caption" class="ma-guest-social-preview" readonly rows="4" aria-describedby="ma-proof-instructions"></textarea>',
 '<button type="button" class="gold-btn ma-proof-copy" data-proof-copy>Copy caption and code</button>',
 '<p id="ma-proof-instructions" class="ma-guest-social-note">Create a public TikTok video or Bluesky post using this caption. Private messages, drafts and screenshots cannot be verified.</p>',
 '<div class="ma-guest-social-options ma-public-proof-platforms">',
 '<button type="button" data-proof-platform="tiktok">TikTok ↗</button>',
 '<button type="button" data-proof-platform="bluesky">Bluesky ↗</button>',
 '</div>',
 '<label for="ma-proof-platform">Where did you publish?</label>',
 '<select class="ma-public-proof-select" id="ma-proof-platform">',
 '<option value="tiktok">Public TikTok video</option><option value="bluesky">Public Bluesky post</option>',
 '</select>',
 '<label for="ma-proof-url">Paste your published public post link</label>',
 '<input id="ma-proof-url" class="ma-public-proof-input" type="url" maxlength="700" autocomplete="off" inputmode="url" placeholder="https://www.tiktok.com/@.../video/...">',
 '<button class="gold-btn ma-proof-verify" type="button" data-proof-verify>Verify post & unlock my bonus</button>',
 '<p class="ma-public-proof-limit">Instagram personal accounts, private posts, WhatsApp and direct messages cannot currently be independently verified. You may still share there, but they do not unlock this verified bonus.</p>',
 '<p class="ma-guest-social-feedback" data-proof-feedback role="status" aria-live="polite"></p>',
 '</div>'
 ].join('');
 document.body.appendChild(modal);
 modal.querySelector('[data-proof-close]').onclick=()=>{modal.hidden=true;};
 modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true;});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)modal.hidden=true;});
 return modal;
}
let current=null;
function explanation(reason){
 const en={
  proof_not_found:'That public post does not contain this exact unique code and matchapp.tv yet. Confirm it is published publicly with the caption shown above.',
  post_not_verified:'The platform did not return that public post as verifiable. Private or unavailable posts do not qualify.',
  post_timing_invalid:'This post predates your verification request. Please create a new post with the unique code.',
  post_already_used:'That post has already been used for a MatchApp bonus. A new public post is needed.',
  limit_reached:'Both of your guest share rewards have already been claimed.',
  challenge_expired:'Your code has expired. Close this panel and request a fresh code.',
  expired:'Your code has expired. Close this panel and request a fresh code.',
  provider_unavailable:'The social network could not be reached right now. Your bonus has NOT been used. Try again later.',
  invalid_post_url:'Paste the full public TikTok video link or Bluesky post link.',
  rate_limited:'Too many proof requests. Please try again later.'
 };
 const br={
  proof_not_found:'Essa publicação pública ainda não contém o código exato e matchapp.tv. Publique a legenda acima e tente novamente.',
  post_not_verified:'A plataforma não confirmou essa publicação como pública e verificável.',
  post_timing_invalid:'Esta publicação é anterior ao código. Crie uma nova com a legenda indicada.',
  post_already_used:'Esta publicação já foi usada para um bônus. É preciso publicar outra.',
  limit_reached:'Os seus dois bônus já foram utilizados.',
  challenge_expired:'Seu código expirou. Feche e solicite um novo código.',
  expired:'Seu código expirou. Feche e solicite um novo código.',
  provider_unavailable:'A rede social não respondeu. Nenhum bônus foi usado. Tente novamente.',
  invalid_post_url:'Cole o link público completo do vídeo do TikTok ou da publicação do Bluesky.',
  rate_limited:'Muitas tentativas. Aguarde e tente novamente.'
 };
 return (pt()?br:en)[reason]||(pt()?'Não foi possível verificar esta publicação. Nenhum bônus foi concedido.':'Could not verify that post. No bonus has been granted.');
}
function open({kind,title,token,message,url,onNext}){
 if(window.isUserLoggedIn)return;
 if(window.MatchAppGuestShare?.remainingShares?.()===0)return window.MatchAppRegistrationWelcome?.openOffer?.()||window.location.assign('/?registrationOffer=1');
 const modal=create();modal.hidden=false;
 const copy=modal.querySelector('[data-proof-copy]'),verify=modal.querySelector('[data-proof-verify]');
 const caption=modal.querySelector('#ma-proof-caption'),feedback=modal.querySelector('[data-proof-feedback]');
 const link=modal.querySelector('#ma-proof-url'),platform=modal.querySelector('#ma-proof-platform');
 const heading=modal.querySelector('[data-proof-heading]');
 heading.textContent=kind==='ask_ai'
  ?(pt()?'Compartilhe a resposta e ganhe +1 pergunta de IA':'Share your AI answer · earn +1 AI prompt')
  :(pt()?'Compartilhe o resultado e ganhe +1 Match':'Share your result · earn +1 Match');
 feedback.textContent=pt()?'Criando seu código de verificação…':'Generating your private verification code…';
 copy.disabled=true;verify.disabled=true;caption.value='';link.value='';
 const thisOpen=Symbol();current={id:thisOpen,kind,title,token,onNext,proof:null,done:false};
 request({action:'start',kind}).then(data=>{
  if(current?.id!==thisOpen)return;
  current.proof=data;
  // Keep the challenge first; TikTok captions can be truncated in previews.
  const core=String(message||('MatchApp Ai matched me with '+title)).replace(/\s+/g,' ').slice(0,350);
  caption.value=data.challenge+' · https://matchapp.tv\n'+core;
  copy.disabled=false;verify.disabled=false;
  feedback.textContent=pt()?'Pronto. Publique uma nova postagem pública contendo esta legenda.':'Ready. Publish a NEW PUBLIC post containing the exact caption above, then paste its URL.';
 }).catch(e=>{if(current?.id!==thisOpen)return;feedback.textContent=explanation(e.message);});
 copy.onclick=async()=>{
  if(!current?.proof||current.id!==thisOpen)return;
  try{await navigator.clipboard.writeText(caption.value);
    feedback.textContent=pt()?'Legenda copiada. Publique publicamente e cole o link depois.':'Caption copied. Publish it publicly, then return with the post link.';
  }catch(_){caption.focus();caption.select();feedback.textContent='Select and copy the caption above.';}
 };
 modal.querySelectorAll('[data-proof-platform]').forEach(button=>{
  button.onclick=()=>{
   const provider=button.dataset.proofPlatform;
   platform.value=provider;
   link.placeholder=provider==='tiktok'
    ?'https://www.tiktok.com/@creator/video/1234567890123456789'
    :'https://bsky.app/profile/creator.bsky.social/post/xxxxxxxxxxxxx';
   window.open(provider==='tiktok'?'https://www.tiktok.com/upload':'https://bsky.app/','_blank','noopener,noreferrer');
  };
 });
 platform.onchange=()=>{link.placeholder=platform.value==='tiktok'
  ?'https://www.tiktok.com/@creator/video/1234567890123456789'
  :'https://bsky.app/profile/creator.bsky.social/post/xxxxxxxxxxxxx';};
 verify.onclick=async()=>{
  if(verify.disabled||!current?.proof||current.id!==thisOpen||current.done)return;
  if(!/^https:\/\//i.test(link.value.trim())){
   feedback.textContent=explanation('invalid_post_url');return;
  }
  verify.disabled=true;feedback.textContent=pt()?'Verificando a publicação com a rede social…':'Checking the published post through the social network…';
  try{
   const data=await request({
    action:'verify',proof_id:current.proof.proof_id,
    platform:platform.value,post_url:link.value.trim()
   });
   if(current?.id!==thisOpen||current.done)return;
   if(!data.verified||data.proof_id!==current.proof.proof_id||data.kind!==kind)throw new Error('verification_failed');
   current.done=true;
   const accepted=window.MatchAppGuestShare?.finalizeVerified?.({
     kind,token,proof:data,onNext
   });
   if(!accepted)throw new Error('verification_failed');
   modal.hidden=true;
  }catch(e){
   if(current?.id===thisOpen)feedback.textContent=explanation(e.message);
  }finally{verify.disabled=false;}
 };
}
window.MatchAppVerifiedGuestPublicShare=Object.freeze({open});
})();
