"use strict";
// First-party remotely maintained Android avatar runtime; keep JWTs private.
const $ = id => document.getElementById(id);
const face=$("face"),canvas=face.getContext("2d",{alpha:false}),img=new Image();img.src="created-avatar.jpg";
const wave=[...$("wave").children];let jwt="",pc=null,dc=null,mic=null,audio=null,ctx=null,inMeter=null,outMeter=null,frame=0,mode="ready",muted=false,connectingTimer=0;
let mouth=0,speech=0,blinkAt=performance.now()+3100,blink=0,blinkStart=-2000,prevTime=0,missingImage=false;
let visemes=[],currentViseme="a",lastVisemeAt=0;
const minimal=matchMedia("(prefers-reduced-motion:reduce)").matches;
const sessionReady=new Promise(resolve=>{window.MatchAppAvatar={init:token=>{jwt=String(token||"");resolve(jwt)}};const pending=window.__matchappAvatarPendingToken;if(pending){window.__matchappAvatarPendingToken="";window.MatchAppAvatar.init(pending)}setTimeout(()=>resolve(jwt),5000)});
const setStatus=(state,title,description)=>{
  mode=state;document.body.dataset.mode=state;$("title").textContent=title;$("description").textContent=description;
  const live=["connected","listening","speaking"].includes(state);
  $("primary").textContent=live?"End conversation":state==="connecting"?"Connecting…":state==="error"?"Try again":"Start conversation";
  $("primary").classList.toggle("end",live);$("primary").disabled=state==="connecting";
  $("secondary").hidden=!live;$("secondary").textContent=muted?"Unmute microphone":"Mute microphone";
};
function analyser(stream){if(!ctx||!stream)return null;const a=ctx.createAnalyser();a.fftSize=256;ctx.createMediaStreamSource(stream).connect(a);return a}
function amplitude(a){if(!a)return 0;let sum=0;const v=new Uint8Array(a.fftSize);a.getByteTimeDomainData(v);for(let i=0;i<v.length;i++){const d=(v[i]-128)/128;sum+=d*d}return Math.sqrt(sum/v.length)}
function faceFrame(t){
 if(!img.complete||!img.naturalWidth){if(!missingImage){canvas.fillStyle="#23172f";canvas.fillRect(0,0,face.width,face.height)}return}
 const w=face.width,h=face.height,iw=img.naturalWidth,ih=img.naturalHeight;
 canvas.clearRect(0,0,w,h);
 canvas.save();
 canvas.beginPath();
 canvas.arc(w/2,h/2,Math.min(w,h)/2-1,0,Math.PI*2);
 canvas.clip();
 const scale=Math.max(w/iw,h/ih)*(1+Math.max(0,mouth)*.035);
 const dw=iw*scale,dh=ih*scale;
 canvas.drawImage(img,(w-dw)/2,(h-dh)/2-h*.03,dw,dh);
 if(!minimal && blink>.08){
   canvas.fillStyle="rgba(10,7,16,"+(blink*.42)+")";
   canvas.fillRect(w*.2,h*.33,w*.6,Math.max(2,h*.055*blink));
 }
 canvas.restore();
}
function draw(t){
 const dt=Math.min(60,Math.max(0,t-prevTime||16));prevTime=t;
 const micLvl=muted?0:amplitude(inMeter)*6,voiceLvl=amplitude(outMeter)*7;
 const output=Math.min(1,voiceLvl),input=Math.min(1,micLvl);
 speech+=(output-speech)*Math.min(1,dt/120);
 mouth+=(output>0.055?output:0-mouth)*Math.min(1,dt/92);
 document.documentElement.style.setProperty("--volume",String(Math.min(1,speech)));
 const hasCall=pc&&pc.connectionState==="connected";
 if(hasCall){const next=output>.055?"speaking":input>.055?"listening":"connected";if(next!==mode){
  setStatus(next,next==="speaking"?"Speaking…":next==="listening"?"Listening…":"Connected",next==="speaking"?"Live reply · interrupt any time":next==="listening"?"Go ahead, I'm listening":"I'm here. Say anything.");}}
 if(output>.045 && t>lastVisemeAt+95){lastVisemeAt=t;currentViseme=visemes.shift()||"a"}
 if(!minimal){
  if(t>blinkAt){blinkAt=t+2600+Math.random()*3300;blinkStart=t}
  const blinkProgress=(t-blinkStart)/190;
  blink=blinkProgress>=0&&blinkProgress<=1?Math.sin(Math.PI*blinkProgress):0;
  // Tiny anchored head movement and breathing; no continuous spinning/bobbing.
  const sway=Math.sin(t/3400)*.52,breath=Math.sin(t/2300)*.004;
  face.style.transform="translateX("+sway+"px) rotate("+(sway*.25)+"deg) scale("+(1+breath)+")";
 }
 if(img.complete&&img.naturalWidth)faceFrame(t);
 wave.forEach((el,i)=>{const v=Math.min(1,output*.9+input*.4);const p=.55+(.4+.3*Math.sin(i*1.4+t/155))*(v*3);el.style.transform="scaleY("+Math.max(.48,p)+")"});
 frame=requestAnimationFrame(draw);
}
img.onload=()=>{face.width=640;face.height=640;faceFrame(0)};
img.onerror=()=>{missingImage=true;setStatus("error","Avatar portrait unavailable","Reinstall the latest Android build.");};
frame=requestAnimationFrame(draw);
async function waitForIce(peer){
 if(peer.iceGatheringState==="complete")return;
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error("Voice network negotiation timed out.")),12000);
  const done=()=>{if(peer.iceGatheringState==="complete"){clearTimeout(timer);peer.removeEventListener("icegatheringstatechange",done);resolve()}};
  peer.addEventListener("icegatheringstatechange",done);done();
 });
}
function stop(){clearTimeout(connectingTimer);connectingTimer=0;
 if(dc){try{dc.close()}catch{}dc=null}
 if(pc){try{pc.close()}catch{}pc=null}
 if(mic){mic.getTracks().forEach(t=>t.stop());mic=null}
 if(audio){audio.pause();audio.srcObject=null;audio.remove();audio=null}
 if(ctx){ctx.close().catch(()=>{});ctx=null}
 inMeter=outMeter=null;mouth=0;speech=0;muted=false;
}
async function start(){
 if(!jwt){setStatus("error","Sign in required","Sign in to MatchApp Ai in the app, then return here.");return}
 setStatus("connecting","Preparing your call…","Connecting securely to MatchApp Ai.");
 try{
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw Error("Microphone unavailable on this Android device.");
  mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  ctx=new (window.AudioContext||window.webkitAudioContext)();await ctx.resume();
  inMeter=analyser(mic);pc=new RTCPeerConnection();mic.getTracks().forEach(track=>pc.addTrack(track,mic));
  audio=document.createElement("audio");audio.autoplay=true;audio.playsInline=true;audio.style.display="none";document.body.appendChild(audio);
  pc.ontrack=e=>{const stream=e.streams&&e.streams[0];if(!stream)return;audio.srcObject=stream;audio.play().catch(()=>{});outMeter=analyser(stream)};
  dc=pc.createDataChannel("oai-events");
  dc.onopen=()=>dc.send(JSON.stringify({type:"response.create",response:{instructions:"Greet the listener in one natural sentence and invite them to speak."}}));
  dc.onmessage=e=>{try{const event=JSON.parse(e.data);
   if(event.type==="response.output_audio_transcript.delta"||event.type==="response.audio_transcript.delta"){
    const chunk=String(event.delta||"").toLowerCase().replace(/[^a-zà-ÿ]/g,"");
    for(const ch of chunk){if(visemes.length<220)visemes.push(ch)}
   }
   if(event.type==="error")setStatus("error","Voice response interrupted","Retry the call if the problem continues.");
  }catch{}};
  pc.onconnectionstatechange=()=>{if(!pc)return;if(pc.connectionState==="connected"){clearTimeout(connectingTimer);setStatus("connected","Connected","I'm here. Say anything.")}
    else if(["failed","disconnected"].includes(pc.connectionState)){stop();setStatus("error","Connection ended","Check your internet connection and try again.")}};
  const offer=await pc.createOffer();await pc.setLocalDescription(offer);await waitForIce(pc);
  const sdp=pc.localDescription&&pc.localDescription.sdp;
  if(!sdp)throw Error("Voice offer unavailable.");
  const res=await fetch("https://zkymvqrmbabngsqblyye.supabase.co/functions/v1/private-voice-call",{
   method:"POST",headers:{"Authorization":"Bearer "+jwt,"apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpreW12cXJtYmFibmdzcWJseXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDUyNDIsImV4cCI6MjEwMjM4MTI0Mn0._yEVFMfwVU6GBqQ8m3ljfOgA0HSLEDiKMOfYae6ZD8Q","Content-Type":"application/json"},
   body:JSON.stringify({sdp})
  });
  if(!res.ok){if(res.status===401)throw Error("Your login expired. Sign in again.");if(res.status===403)throw Error("Avatar voice beta is not enabled on this account yet.");throw Error("Voice could not connect (HTTP "+res.status+").")}
  const answer=await res.text();await pc.setRemoteDescription({type:"answer",sdp:answer});
  connectingTimer=setTimeout(()=>{if(pc&&pc.connectionState!=="connected"){stop();setStatus("error","Connection timed out","Try again with a stable internet connection.")}},17000)
 }catch(err){stop();const msg=err&&err.name==="NotAllowedError"?"Allow microphone permission in Android Settings, then try again.":String(err?.message||"Voice connection failed.");
  setStatus("error","Could not start the avatar",msg)}
}
$("primary").addEventListener("click",()=>{if(["connected","listening","speaking"].includes(mode)){stop();setStatus("ready","Call finished","You can start another conversation.");}else if(mode!=="connecting")start()});
$("secondary").addEventListener("click",()=>{if(!mic)return;muted=!muted;mic.getAudioTracks().forEach(t=>t.enabled=!muted);$("secondary").textContent=muted?"Unmute microphone":"Mute microphone"});
$("back").addEventListener("click",()=>{stop();window.location.href="matchapp-avatar://close"});
document.addEventListener("visibilitychange",()=>{if(document.hidden){stop();setStatus("ready","Call paused","Return to the app to start another conversation.")}});
window.addEventListener("pagehide",stop);
sessionReady.then(t=>{if(!t)setStatus("error","Sign in required","Open MatchApp Ai, sign in, then start the avatar again.")});
