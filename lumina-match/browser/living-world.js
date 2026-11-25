/* Presentation-only living scenery and articulated card artwork. No game rules or storage. */
(function () {
  'use strict';
  const app = document.getElementById('app');
  if (!app) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const world = document.createElement('canvas');
  world.className = 'lm-living-world'; world.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(world, app);
  const ctx = world.getContext('2d', { alpha: false });
  if (!ctx) { world.remove(); return; }
  let faces = [], raf = 0, previous = 0, time = 0, width = 0, height = 0;
  let stopped = false, dirty = true;
  const cache = new Map();
  function imageFor(url) {
    if (cache.has(url)) return cache.get(url);
    const image = new Image();
    image.onload = () => { dirty = true; wake(); };
    image.onerror = () => { dirty = true; wake(); };
    image.src = url; cache.set(url, image); return image;
  }
  function paused() {
    return document.hidden || app.inert || app.hasAttribute('inert') ||
      !!app.querySelector('.board-area.is-paused, .audio-dialog[open], .register-dialog[open]');
  }
  function motionOff() { return reduced.matches || document.documentElement.classList.contains('reduce-motion'); }
  function scan() {
    faces = Array.from(app.querySelectorAll('.card .front')).map(face => {
      let canvas = face.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas'); canvas.className = 'lm-living-face';
        canvas.setAttribute('aria-hidden', 'true'); face.appendChild(canvas);
      }
      const url = face.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
      return { face, canvas, image: url ? imageFor(url) : null, name: url || '' };
    });
    // Wrap existing eyes as a separate articulated group; preserve the authored face.
    app.querySelectorAll('.lm-head > g[fill="#302442"], .lm-bell > g[fill="#302442"]').forEach(eyes => eyes.classList.add('lm-living-eyes'));
    dirty = true; wake();
  }
  function sizeWorld() {
    width = Math.max(1, innerWidth); height = Math.max(1, innerHeight);
    // One capped scenery surface, independent of the card layout and hit targets.
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    world.width = Math.round(width*dpr); world.height = Math.round(height*dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dirty = true; wake();
  }
  function scenery(t) {
    const w=width,h=height;
    const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#071422');sky.addColorStop(.6,'#173e44');sky.addColorStop(1,'#061d25');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    const moon=ctx.createRadialGradient(w*.68,h*.19,2,w*.68,h*.19,w*.4);moon.addColorStop(0,'#e6d4a13b');moon.addColorStop(1,'#a7e2d000');ctx.fillStyle=moon;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#f4dfac';ctx.beginPath();ctx.arc(w*.68,h*.19,Math.min(w,h)*.027,0,Math.PI*2);ctx.fill();
    for(let layer=0;layer<3;layer++)for(let i=0;i<9;i++){
      const x=w*(i-.5)/8,base=h*(.72+layer*.1),len=h*(.42+(i*3%5)*.05),sway=Math.sin(t*.5+i+layer)*w*(.002+layer*.0015);
      ctx.strokeStyle=['#255059','#15373c','#0a272d'][layer];ctx.lineCap='round';ctx.lineWidth=(7+layer*5)*w/700;
      ctx.beginPath();ctx.moveTo(x,base);ctx.bezierCurveTo(x-sway*.2,base-len*.4,x+sway,base-len*.8,x+sway,base-len);ctx.stroke();
      for(let j=0;j<5;j++)for(const sign of [-1,1]){
        const v=.28+j*.13,y=base-len*v,tipx=x+sway*v+sign*len*(.16-j*.018),tipy=y-len*.12;
        ctx.lineWidth=Math.max(1,(6-j)*w/700);ctx.beginPath();ctx.moveTo(x+sway*v*v,y);ctx.quadraticCurveTo(tipx,y,tipx,tipy);ctx.stroke();
        for(let k=1;k<5;k++){
          const q=k/4,px=x+(tipx-x)*q,py=y+(tipy-y)*q,rx=len*(.032-j*.002);
          ctx.save();ctx.translate(px,py);ctx.rotate(sign*-.6+Math.sin(t*.5+i+j)*.05);ctx.fillStyle=['#27535c','#1e494b','#17423e'][layer];ctx.beginPath();ctx.ellipse(0,0,rx,rx*.42,0,0,Math.PI*2);ctx.fill();ctx.restore();
        }
      }
    }
    ctx.save();ctx.beginPath();ctx.moveTo(w*.51,h*.58);ctx.bezierCurveTo(w*.25,h*.77,w*.8,h*.8,w*.3,h);ctx.lineTo(w*.82,h);ctx.bezierCurveTo(w*1.03,h*.81,w*.4,h*.74,w*.56,h*.58);ctx.closePath();ctx.fillStyle='#16434a';ctx.fill();ctx.clip();
    for(let i=0;i<26;i++){
      const p=i/26,y=h*(.58+p*.44),x=w*(.53+Math.sin(p*8+t*.4)*p*.17),len=w*(.02+p*.26);
      ctx.strokeStyle=`rgba(179,223,202,${.04+.07*(.5+.5*Math.sin(t+i))})`;ctx.lineWidth=1+p;ctx.beginPath();ctx.moveTo(x-len/2,y);ctx.lineTo(x+len/2,y+Math.sin(t+i)*2);ctx.stroke();
    }ctx.restore();
    for(let i=0;i<24;i++){
      const x=w*((i*37%101)/100+Math.sin(t*.4+i)*.025),y=h*(.2+(i*23%73)/100+Math.cos(t*.6+i)*.018),r=1+i%3,alpha=.32+.25*Math.sin(t+i);
      const halo=ctx.createRadialGradient(x,y,0,x,y,r*5);halo.addColorStop(0,`rgba(232,219,150,${alpha})`);halo.addColorStop(1,'#e8db9600');ctx.fillStyle=halo;ctx.fillRect(x-r*5,y-r*5,r*10,r*10);
    }
    const veil=ctx.createLinearGradient(0,0,0,h);veil.addColorStop(0,'#030a1730');veil.addColorStop(.5,'#030a1740');veil.addColorStop(1,'#030a1790');ctx.fillStyle=veil;ctx.fillRect(0,0,w,h);
  }
  function paintFace(item,t) {
    const {face,canvas,image,name}=item;
    const card=face.parentElement;
    if(!card.classList.contains('flipped')&&!card.classList.contains('matched')) return;
    if(!image?.complete||!image.naturalWidth) return;
    const box=face.getBoundingClientRect();
    const density=Math.min(1.5,320/Math.max(1,face.clientWidth),480/Math.max(1,face.clientHeight));
    const w=Math.max(1,Math.round(face.clientWidth*density)),h=Math.max(1,Math.round(face.clientHeight*density));
    if(box.width<1||box.height<1)return;
    if(canvas.width!==Math.round(w)||canvas.height!==Math.round(h)){canvas.width=Math.round(w);canvas.height=Math.round(h);}
    const c=canvas.getContext('2d');if(!c)return;
    c.clearRect(0,0,canvas.width,canvas.height);
    const fit=Math.max(w/image.naturalWidth,h/image.naturalHeight);
    const iw=image.naturalWidth*fit,ih=image.naturalHeight*fit,left=(w-iw)/2,top=(h-ih)/2;
    const wing=/butterfly|firefly/.test(name),water=/ocean/.test(name),plant=/flower|fern|coral/.test(name);
    for(let j=0;j<24;j++){
      const v=j/24,sh=image.naturalHeight/24,env=Math.sin(Math.PI*v);
      const dx=(motionOff()?0:Math.sin(t*(water?2:1.1)+v*4)*iw*(water?.022:plant?.018:.008)*env);
      const squeeze=wing&&!motionOff()?1-(.10+.09*Math.sin(t*6))*env:1;
      // Pin both outer edges. Only interior bands deform, so motion cannot expose a dark gutter.
      const cuts=[0,1/3,2/3,1];
      const edge=u=>left+iw*u+(u===0||u===1?0:dx+(u-.5)*iw*(squeeze-1));
      for(let k=0;k<3;k++){
        const x1=edge(cuts[k]),x2=edge(cuts[k+1]);
        c.drawImage(image,cuts[k]*image.naturalWidth,j*sh,image.naturalWidth/3,
          Math.min(sh+.7,image.naturalHeight-j*sh),x1,top+v*ih,x2-x1+.5,ih/24+.8);
      }
    }
    if(!face.classList.contains('lm-art-ready'))face.classList.add('lm-art-ready');
  }
  function draw(now) {
    raf=0;if(stopped||document.hidden)return;
    const still=motionOff()||paused();
    if(!still&&previous)time+=Math.min(100,now-previous)/1000;
    if(dirty||!still){scenery(time);faces.forEach(f=>paintFace(f,time));dirty=false;}
    previous=now;
    if(!still) raf=requestAnimationFrame(tick);
  }
  function tick(now){if(now-previous<40){raf=requestAnimationFrame(tick);return;}draw(now);}
  function wake(){if(!stopped&&!raf&&!document.hidden)raf=requestAnimationFrame(draw);}
  function visibility(){previous=0;dirty=true;const p=paused();if(document.documentElement.classList.contains('lm-world-paused')!==p)document.documentElement.classList.toggle('lm-world-paused',p);wake();}
  let scheduled=false;
  const observer=new MutationObserver(records=>{
    if(records.some(r=>r.type==='childList'&&Array.from(r.addedNodes).some(n=>n.nodeType===1&&!n.matches?.('canvas')))){
      if(!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;scan();});}
    }
    dirty=true;visibility();
  });
  observer.observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','inert','data-screen']});
  const rootObserver=new MutationObserver(visibility);rootObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',visibility);addEventListener('resize',sizeWorld);reduced.addEventListener('change',visibility);
  addEventListener('pagehide',()=>{stopped=true;cancelAnimationFrame(raf);raf=0;observer.disconnect();rootObserver.disconnect();});
  addEventListener('pageshow',e=>{if(e.persisted){stopped=false;observer.observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','inert','data-screen']});rootObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});scan();visibility();}});
  sizeWorld();scan();
})();
