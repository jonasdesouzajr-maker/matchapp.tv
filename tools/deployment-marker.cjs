'use strict';
// The live deployment marker is served through multiple caches. A bare URL can
// retain an old cached 404 even after the exact SHA succeeds with a query key.
// Keep the marker a hard prerequisite while avoiding false release failures.
async function fetchDeploymentMarker(base, {attempts=3, timeoutMs=20000, retryDelayMs=750, fetcher=globalThis.fetch}={}) {
  let problem='no successful response';
  for(let attempt=0;attempt<attempts;attempt++) {
    const url=new URL('/deployment-sha.txt',base);
    url.searchParams.set('smoke',String(process.env.GITHUB_SHA||'manual')+'-'+Date.now()+'-'+attempt);
    try {
      const response=await fetcher(url.toString(),{cache:'no-store',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(timeoutMs)});
      if(response.ok) {
        const sha=(await response.text()).trim();
        if(/^[0-9a-f]{40}$/i.test(sha)) return sha;
        problem='invalid marker content';
      } else problem='HTTP '+response.status;
    } catch(error) { problem=String(error&&error.message||error); }
    if(attempt<attempts-1&&retryDelayMs>0)
      await new Promise(resolve=>setTimeout(resolve,retryDelayMs));
  }
  throw new Error('production deployment marker unavailable: '+problem);
}
module.exports={fetchDeploymentMarker};
