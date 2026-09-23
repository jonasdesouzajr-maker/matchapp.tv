/* The OS controls installation and icon placement. Remember only a confirmed
   install/app launch; reconcile with browser detection when it is available. */
(function(){
  'use strict';
  const KIDS=location.pathname==='/kids'||location.pathname.startsWith('/kids/');
  const KEY=KIDS?'match_kids_app_installed':'match_app_installed',BUILD=KIDS?'match_kids_app_installed_build':'match_app_installed_build';
  const read=k=>{try{return localStorage.getItem(k);}catch(_){return null;}};
  const write=(k,v)=>{try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(_){}};
  const standalone=()=>navigator.standalone===true||!!window.matchMedia?.('(display-mode: standalone)').matches;
  let known=standalone()||read(KEY)==='true';
  function notify(){window.dispatchEvent(new Event('matchapp:installstate'));}
  function remember(event){known=true;write(KEY,'true');if((!read(BUILD)||event?.type==='appinstalled')&&/^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(window.MATCHAPP_BUILD||''))write(BUILD,window.MATCHAPP_BUILD);notify();}
  function forget(){known=false;write(KEY,null);write(BUILD,null);notify();}
  async function refresh(){
    if(standalone()){remember();return true;}
    if(typeof navigator.getInstalledRelatedApps==='function')try{
      const apps=await navigator.getInstalledRelatedApps();
      const own=apps.some(app=>{
        if(app.platform!=='webapp')return false;
        if(KIDS&&app.id==='https://matchapp.tv/kids/')return true;
        if(!KIDS&&app.id==='https://matchapp.tv/')return true;
        try{
          const u=new URL(app.url,location.origin);
          return u.origin===location.origin&&(KIDS?u.pathname==='/kids/manifest.json':(u.pathname==='/manifest.json'||u.pathname==='/manifest-pt-br.json'));
        }catch(_){return false;}
      });
      known=own;write(KEY,own?'true':null);if(!own)write(BUILD,null);notify();
    }catch(_){/* Unsupported OS or unavailable manifest: retain confirmed hint. */}
    return known;
  }
  // Only an installed window that loaded the explicitly requested release can
  // acknowledge it. An ordinary website visit cannot dismiss the app update.
  function confirmUpdate(version){if(!standalone()||version!==window.MATCHAPP_BUILD)return false;write(BUILD,version);notify();return true;}
  window.matchAppInstallState=Object.freeze({isInstalled:()=>known||standalone(),isStandalone:standalone,installedBuild:()=>read(BUILD),refresh,remember,forget,confirmUpdate});
  window.addEventListener('appinstalled',remember);
  window.addEventListener('beforeinstallprompt',forget);
  window.addEventListener('storage',event=>{if(event.key===KEY||event.key===BUILD){known=standalone()||read(KEY)==='true';notify();}});
  if(standalone())remember();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();
})();
