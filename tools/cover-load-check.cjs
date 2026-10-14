'use strict';
// Serialized into the browser by Playwright: keep this function self-contained.
// A failed first image request is not final while verified providers fall back.
async function waitForUsableCover(image, timeoutMs=28000) {
  return new Promise(resolve=>{
    const started=Date.now();
    const check=()=>{
      if(image.isConnected===false){resolve(false);return;}
      if(image.complete&&image.naturalWidth>0&&!image.hidden){resolve(true);return;}
      if(Date.now()-started>=timeoutMs){resolve(false);return;}
      setTimeout(check,50);
    };
    check();
  });
}
module.exports={waitForUsableCover};
