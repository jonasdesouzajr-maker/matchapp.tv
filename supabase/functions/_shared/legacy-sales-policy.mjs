// Only the six superseded Match plans/packs retire under the effective policy.
// Independent ad-free, Ask AI, Kids and Jonas purchases keep their existing paths.
export const RETIRED_ADULT_PRODUCTS=Object.freeze([
  'vip_monthly','vip_annual','business',
  'matches_5','matches_25','matches_50'
]);
const retired=new Set(RETIRED_ADULT_PRODUCTS);
export function isRetiredAdultProduct(product){return typeof product==='string'&&retired.has(product);}
/** @param {any} [ownedClient] Authenticated Supabase client; absent for public availability. */
export async function adultSalesPolicy(admin,requested,ownedClient=undefined){
  if(!requested.some(isRetiredAdultProduct))return {known:true,retired:false};
  try{
    // Public availability uses global policy. A purchase uses the authenticated
    // wallet so private QA and already verified Pro cannot buy a competing plan.
    const {data,error}=ownedClient
      ? await ownedClient.rpc('match_token_status')
      : await admin.rpc('get_matchapp_monetization_config');
    if(error||data?.ok!==true||typeof data.enabled!=='boolean'||data.policy_version!=='match-tokens-v1'||
      (ownedClient&&data.authenticated!==true))
      return {known:false,retired:true};
    return {known:true,retired:data.enabled===true};
  }catch(_){return {known:false,retired:true};}
}
export function legacySaleAllowed(product,policy){return !isRetiredAdultProduct(product)||policy.retired!==true;}
export async function adFreePurchaseState(admin,userId){
  try{
    const {data,error}=await admin.from('profiles').select('ad_free_purchased').eq('id',userId).maybeSingle();
    if(error||typeof data?.ad_free_purchased!=='boolean')return {known:false,owned:false};
    return {known:true,owned:data.ad_free_purchased};
  }catch(_){return {known:false,owned:false};}
}
