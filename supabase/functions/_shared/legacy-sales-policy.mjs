// This gate only retires new adult sales. Existing receipts, benefits, Kids
// products and Jonas billing continue through their original delivery paths.
export const RETIRED_ADULT_PRODUCTS=Object.freeze([
  'ad_free','vip_monthly','vip_annual','business',
  'credits_25','credits_75','credits_200','credits_500',
  'matches_5','matches_25','matches_50'
]);
const retired=new Set(RETIRED_ADULT_PRODUCTS);
export function isRetiredAdultProduct(product){return typeof product==='string'&&retired.has(product);}
export async function adultSalesPolicy(admin,requested){
  if(!requested.some(isRetiredAdultProduct))return {known:true,retired:false};
  try{
    const {data,error}=await admin.rpc('get_matchapp_monetization_config');
    if(error||data?.ok!==true||typeof data.enabled!=='boolean'||data.policy_version!=='match-tokens-v1')
      return {known:false,retired:true};
    return {known:true,retired:data.enabled===true};
  }catch(_){return {known:false,retired:true};}
}
export function legacySaleAllowed(product,policy){return !isRetiredAdultProduct(product)||policy.retired!==true;}
