// Only new adult promotional issuance is retired. Existing proof verification
// and earned balances never call this gate and keep their original contract.
export async function adultPromotionPolicy(admin){
 try{
  const {data,error}=await admin.rpc('get_matchapp_monetization_config');
  if(error||data?.ok!==true||typeof data.enabled!=='boolean'||data.policy_version!=='match-tokens-v1')
   return {known:false,retired:true};
  return {known:true,retired:data.enabled===true};
 }catch(_){return {known:false,retired:true};}
}
