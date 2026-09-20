/* MatchApp premium UI runtime — presentation only. */
(function(){'use strict';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function svgFallback(title,platform){
 const t=String(title||'MatchApp pick').replace(/[<>&"]/g,'').slice(0,42),p=String(platform||'MATCHAPP TV').replace(/[<>&"]/g,'').slice(0,24);
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#2b1643"/><stop offset="1" stop-color="#080916"/></linearGradient></defs><rect width="600" height="900" rx="36" fill="url(#g)"/><circle cx="300" cy="315" r="88" fill="none" stroke="#E5C158" stroke-width="10" opacity=".7"/><path d="M277 264l92 51-92 51z" fill="#E5C158"/><text x="300" y="505" text-anchor="middle" fill="#fff" font-family="Inter,Arial,sans-serif" font-size="40" font-weight="800">'+t+'</text><text x="300" y="565" text-anchor="middle" fill="#E5C158" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="3">'+p+'</text></svg>');
}
function titleFor(img){const card=img.closest('[data-title],article,.marquee-item,.ma-news-card,.global-event,.spotlight-card');return card?.dataset?.title||card?.querySelector('h2,h3,h4,.marquee-title,.spotlight-title')?.textContent||img.alt||'MatchApp pick'}
function enhanceMedia(){
 document.querySelectorAll('img').forEach(img=>{if(img.dataset.maMedia==='1')return;img.dataset.maMedia='1';const shell=img.parentElement;if(shell){shell.classList.add('ma-media-shell');if(!img.complete)shell.classList.add('is-loading')}
 const done=()=>shell?.classList.remove('is-loading');img.addEventListener('load',done,{once:true});img.addEventListener('error',()=>{if(img.dataset.maFallback==='1')return;img.dataset.maFallback='1';img.alt='';img.src=svgFallback(titleFor(img),img.closest('[data-platform]')?.dataset?.platform||'MATCHAPP TV');done()},{once:true});if(img.complete)done();
 });
 document.querySelectorAll('iframe').forEach(f=>{if(f.dataset.maMedia==='1')return;f.dataset.maMedia='1';const shell=f.parentElement;shell?.classList.add('ma-media-shell','is-loading');f.addEventListener('load',()=>shell?.classList.remove('is-loading'),{once:true})});
}
function ripples(){document.addEventListener('pointerdown',e=>{const b=e.target.closest('.gold-btn,.ma-primary,button[data-i18n="q.submit"]');if(!b||reduced())return;const r=b.getBoundingClientRect(),s=document.createElement('span');s.className='ma-ripple';s.style.left=(e.clientX-r.left)+'px';s.style.top=(e.clientY-r.top)+'px';s.style.width=s.style.height=Math.max(r.width,r.height)/3+'px';b.appendChild(s);setTimeout(()=>s.remove(),650)},{passive:true})}
function reveal(){if(reduced())return;const els=[...document.querySelectorAll('body.page-home main>section,body.page-home main>details,body.page-home .premium-card,body.page-home .tg-entry')];els.forEach((el,i)=>{el.classList.add('ma-reveal');el.style.transitionDelay=Math.min(i%6,5)*45+'ms'});const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('ma-visible');io.unobserve(x.target)}}),{rootMargin:'80px 0px'});els.forEach(x=>io.observe(x))}
function tilt(){if(reduced()||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;document.addEventListener('pointermove',e=>{const c=e.target.closest('.marquee-item,.ma-news-card,.global-event,.spotlight-card');if(!c)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform='perspective(800px) rotateX('+(-y*4)+'deg) rotateY('+(x*5)+'deg) translateY(-2px)'},{passive:true});document.addEventListener('pointerout',e=>{const c=e.target.closest('.marquee-item,.ma-news-card,.global-event,.spotlight-card');if(c)c.style.transform=''},{passive:true})}
function fit(){document.documentElement.style.overflowX='clip';document.body.style.overflowX='clip'}
function orderHome(){
 if(!document.body.classList.contains('page-home'))return;
 const hero=document.querySelector('.home-hero');
 const nodes=[
  document.getElementById('ma-concierge')||document.getElementById('questionnaire-box'),
  document.getElementById('trending-rail'),
  document.getElementById('premiere-disclosure'),
  document.getElementById('weekly-pick-disclosure'),
  document.getElementById('latest-news'),
  document.getElementById('swifties-spotify')
 ].filter(Boolean);
 if(!hero||nodes.length<5)return;
 const parent=hero.parentElement;
 if(!parent||nodes.some(n=>n.parentElement!==parent))return;
 let anchor=hero;
 nodes.forEach(n=>{if(anchor.nextElementSibling!==n)anchor.insertAdjacentElement('afterend',n);anchor=n});
}
function init(){fit();orderHome();enhanceMedia();ripples();reveal();tilt();new MutationObserver(()=>enhanceMedia()).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();