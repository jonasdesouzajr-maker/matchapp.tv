/* Motion runtime. Honors the site reduce-motion setting and the OS setting. */
const reduced=()=>document.documentElement.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduced()){
  import('https://cdn.jsdelivr.net/npm/motion@11.18.1/+esm').then(({animate})=>{
    if(reduced())return;
    document.querySelectorAll('#ma-first-screen, #trending-rail, #awareness-spotlight').forEach((el,i)=>{
      animate(el,{opacity:[0,1],y:[12,0]},{duration:0.45,delay:i*0.08,ease:'easeOut'});
    });
  }).catch(()=>{});
}
