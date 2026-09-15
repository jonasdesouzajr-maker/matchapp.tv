/* MatchApp ambient background — emergency stability edition.
   Keep the branded atmosphere, but never run a full-viewport animation loop.
   The canvas is rendered once at a capped internal resolution and refreshed
   only after a real viewport resize. */
(function(){
  'use strict';
  const canvas=document.getElementById('ambient-bg');
  if(!canvas||!canvas.getContext)return;
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return;

  let resizeTimer=0;
  function render(){
    const cssW=Math.max(1,window.innerWidth||1);
    const cssH=Math.max(1,window.innerHeight||1);
    const scale=Math.min(1,1920/cssW,1080/cssH);
    const W=Math.max(1,Math.round(cssW*scale));
    const H=Math.max(1,Math.round(cssH*scale));
    if(canvas.width!==W)canvas.width=W;
    if(canvas.height!==H)canvas.height=H;
    canvas.style.width=cssW+'px';
    canvas.style.height=cssH+'px';
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,W,H);

    const base=ctx.createLinearGradient(0,0,W,H);
    base.addColorStop(0,'rgba(64,37,98,.18)');
    base.addColorStop(.55,'rgba(19,7,52,.08)');
    base.addColorStop(1,'rgba(229,193,88,.05)');
    ctx.fillStyle=base;
    ctx.fillRect(0,0,W,H);

    const glow=ctx.createRadialGradient(W*.16,H*.1,0,W*.16,H*.1,Math.max(W,H)*.72);
    glow.addColorStop(0,'rgba(229,193,88,.075)');
    glow.addColorStop(.42,'rgba(107,63,160,.055)');
    glow.addColorStop(1,'rgba(19,7,52,0)');
    ctx.fillStyle=glow;
    ctx.fillRect(0,0,W,H);
  }

  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(render,220);
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
  render();
})();
