/* Authored support invitations. Presentation only: existing controls, payment
 * configuration, privacy notices and language owners keep their behavior. */
(function(root,factory){
 'use strict';const copy=factory();
 if(typeof module==='object'&&module.exports)module.exports=copy;
 if(!root||!root.document||root.MatchAppSupportPresentation)return;
 const doc=root.document;
 if(/^\/(kids|private-voice|oauth|android-studio)(\/|$)/.test(root.location.pathname))return;
 const founder=doc.querySelector('body.ma-founder-page'),sponsor=doc.querySelector('[data-mp-page="sponsor"]'),donate=doc.getElementById('ma-donate-support');
 if(!founder&&!sponsor&&!donate)return;
 function language(){let saved='';try{saved=root.localStorage.getItem('match_lang')||'';}catch(_){}return String(root.MATCH_LANG||saved||doc.documentElement.lang||'en').toLowerCase().split('-')[0];}
 function write(node,value){if(!node||node.textContent===value)return;if(node.childNodes.length===1&&node.firstChild.nodeType===3)node.firstChild.nodeValue=value;else node.textContent=value;}
 function paint(){
  const lang=language();if(lang!=='en'&&lang!=='pt')return;
  for(const [host,name,attribute]of[[founder,'founder','data-founder'],[sponsor,'sponsor','data-mp']]){
   if(!host)continue;for(const [key,value]of Object.entries(copy[name][lang]))host.querySelectorAll('['+attribute+'="'+key+'"]').forEach(node=>write(node,value));
  }
  if(donate)for(const [id,value]of Object.entries(copy.donate[lang]))write(doc.getElementById(id),value);
 }
 let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;paint();});}
 root.MatchAppSupportPresentation=Object.freeze({paint,copy});
 for(const event of['matchapp:langchange','matchapp:languagechange','languagechange']){doc.addEventListener(event,schedule);root.addEventListener(event,schedule);}
 root.addEventListener('pageshow',schedule);
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',paint,{once:true});else paint();
})(typeof window==='undefined'?null:window,function(){return{
 founder:{
  en:{kicker:'Independent by design. Human at heart.',lede:'MatchApp Ai began with a familiar question: what should we watch tonight? Jonas Junior turned that moment into an independent app for discovering more of what you love.',helpHeading:'Create the next chapter together',helpIntro:'Bring a fresh perspective. Share what works, suggest what could be better, or support the next improvements. Each is a meaningful way to take part.',testHeading:'Shape a better experience',testText:'Use MatchApp Ai in a real moment of discovery. Your honest observations help make the details clearer, the choices easier and the experience more useful.',supportHeading:'Keep the next chapter moving',supportText:'MatchApp Ai is built independently, with care for the people who use it. Optional contributions help sustain its operation and development. Sharing the app or thoughtful feedback is equally welcome. Every contribution is optional and does not change your account’s features.',supportButton:'Explore voluntary support'},
  pt:{kicker:'Independente na criação. Humano na essência.',lede:'Uma pergunta comum deu início a tudo: o que vamos assistir hoje? Jonas Junior transformou esse momento em um aplicativo independente para descobrir mais do que você gosta.',helpHeading:'Vamos criar o próximo capítulo',helpIntro:'Traga um novo olhar. Conte o que funciona, sugira o que pode melhorar ou apoie os próximos passos. Há diferentes maneiras de participar.',testHeading:'Ajude a criar uma experiência melhor',testText:'Use o MatchApp Ai em um momento real de descoberta. Suas observações ajudam a deixar os detalhes mais claros, as escolhas mais simples e a experiência mais útil.',supportHeading:'Impulsione o próximo capítulo',supportText:'O MatchApp Ai é criado de forma independente, com cuidado por quem o utiliza. Contribuições opcionais ajudam a manter a operação e o desenvolvimento. Compartilhar o aplicativo ou enviar sugestões também é muito bem-vindo. Toda contribuição é opcional e não altera os recursos da sua conta.',supportButton:'Conheça as formas de apoiar'}
 },
 sponsor:{
  en:{kicker:'Meaningful partnerships',title:'Your brand. Part of a great discovery.',intro:'Meet people in a moment of curiosity. Build a clearly disclosed campaign around entertainment discovery, with agreed placements, original creative and an official destination for your brand.',options:'A clear place for your story',placement:'A considered brand presence',placementText:'A distinct, clearly labelled sponsor card that brings your message into the experience. We agree the creative, destination, placements, dates, countries and devices before anything goes live.',editorial:'Useful stories, openly supported',editorialText:'Support a thoughtful entertainment theme with prominent sponsorship disclosure. Paid support never buys a favourable review or changes personal matching.',process:'A thoughtful plan, agreed together',brief:'Let’s make something worth discovering'},
  pt:{kicker:'Parcerias com propósito',title:'Sua marca. Parte de uma boa descoberta.',intro:'Encontre pessoas em um momento de curiosidade. Crie uma campanha de descoberta de entretenimento identificada com clareza, com espaços combinados, criação original e um destino oficial da sua marca.',options:'Um espaço claro para a sua história',placement:'Presença de marca com contexto',placementText:'Um cartão de patrocínio distinto e identificado com clareza para apresentar sua mensagem. Criação, destino, espaços, datas, países e dispositivos são combinados antes da publicação.',editorial:'Histórias úteis, apoio transparente',editorialText:'Apoie um tema de entretenimento com identificação destacada do patrocínio. O apoio pago não compra uma avaliação favorável nem altera recomendações pessoais.',process:'Um plano claro, construído em conjunto',brief:'Vamos criar algo que vale descobrir'}
 },
 donate:{
  en:{'ma-donate-kicker':'Independent ideas. Shared possibilities.','ma-donate-title':'Be part of what comes next','ma-donate-desc':'Built independently. Made for your everyday discoveries. Voluntary support helps keep MatchApp Ai reliable and makes room for thoughtful improvements.','ma-donate-pill':'Support'},
  pt:{'ma-donate-kicker':'Ideias independentes. Novas possibilidades.','ma-donate-title':'Faça parte do próximo capítulo','ma-donate-desc':'Um projeto independente, feito para as suas descobertas do dia a dia. O apoio voluntário ajuda a manter o MatchApp Ai confiável e abre espaço para novas melhorias.','ma-donate-pill':'Apoiar'}
 }
};});
