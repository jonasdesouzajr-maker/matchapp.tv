// Official public API verification. Only public original posts containing
// a fresh challenge and MatchApp domain count; never inspect DMs/private posts.
// This pure module is directly tested by Node and imported by the Deno worker.
const codePattern=/^MAI-[A-F0-9]{24}$/;
function exactProof(body,code){
 if(!codePattern.test(code))return false;
 const text=String(body||'');
 return new RegExp('(?:^|[^A-Z0-9])'+code+'(?:$|[^A-Z0-9])','i').test(text)
   && /(?:https?:\/\/)?(?:www\.)?matchapp\.tv\b/i.test(text);
}
export function parsePublicSocialUrl(platform,input){
 if(typeof input!=='string'||input.length>700)throw new Error('invalid_post_url');
 let url;try{url=new URL(input);}catch(_){throw new Error('invalid_post_url');}
 if(url.protocol!=='https:'||url.username||url.password||url.port)throw new Error('invalid_post_url');
 const host=url.hostname.toLowerCase();
 if(platform==='tiktok'){
   if(!['www.tiktok.com','tiktok.com'].includes(host))throw new Error('invalid_post_url');
   const match=url.pathname.match(/^\/@([\w.]{2,30})\/video\/(\d{10,22})\/?$/);
   if(!match)throw new Error('invalid_post_url');
   return {platform,id:match[2],url:'https://www.tiktok.com/@'+match[1]+'/video/'+match[2]};
 }
 if(platform==='bluesky'){
   if(host!=='bsky.app')throw new Error('invalid_post_url');
   const match=url.pathname.match(/^\/profile\/([a-z0-9.:-]{3,255})\/post\/([a-z0-9]{8,24})\/?$/i);
   if(!match||(!match[1].startsWith('did:')&&!match[1].includes('.')))throw new Error('invalid_post_url');
   return {platform,actor:match[1],rkey:match[2],url:'https://bsky.app/profile/'+match[1]+'/post/'+match[2]};
 }
 throw new Error('unsupported_platform');
}
async function checkedJson(fetcher,url,init){
 const response=await fetcher(url,{...init,signal:AbortSignal.timeout(9500)});
 if(!response.ok){const error=new Error('provider_unavailable');error.status=response.status;throw error;}
 const data=await response.json();
 if(!data||typeof data!=='object')throw new Error('provider_unavailable');
 return data;
}
export async function verifyPublicSocialPost({platform,postUrl,challenge,issuedAt,fetcher=fetch}){
 const post=parsePublicSocialUrl(platform,postUrl);
 if(!codePattern.test(String(challenge||'')))throw new Error('invalid_challenge');
 if(platform==='tiktok'){
  const u='https://www.tiktok.com/oembed?url='+encodeURIComponent(post.url);
  const data=await checkedJson(fetcher,u);
  // TikTok publishes its video's creator and public caption in official
  // oEmbed metadata. It doesn't expose private drafts, stories or DMs.
  const html=String(data.html||'');
  if(data.provider_name!=='TikTok'||data.type!=='video'||
    !html.includes('data-video-id="'+post.id+'"'))return {verified:false,reason:'post_not_verified'};
  if(!exactProof(data.title,challenge))return {verified:false,reason:'proof_not_found'};
  return {verified:true,platform,id:post.id,url:post.url};
 }
 const profile=await checkedJson(fetcher,'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor='+encodeURIComponent(post.actor));
 const did=String(profile.did||'');
 if(!/^did:(plc|web):[a-z0-9.:_-]{8,200}$/i.test(did))return {verified:false,reason:'post_not_verified'};
 const uri='at://'+did+'/app.bsky.feed.post/'+post.rkey;
 const thread=await checkedJson(fetcher,'https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?depth=0&uri='+encodeURIComponent(uri));
 const record=thread?.thread?.post?.record;
 const author=thread?.thread?.post?.author;
 const receivedUri=thread?.thread?.post?.uri;
 if(receivedUri!==uri||author?.did!==did||!record||!exactProof(record.text,challenge)){
  return {verified:false,reason:'proof_not_found'};
 }
 const created=Date.parse(record.createdAt||'');
 if(!Number.isFinite(created)||created<Date.parse(issuedAt)-300000||created>Date.now()+300000){
  return {verified:false,reason:'post_timing_invalid'};
 }
 return {verified:true,platform,id:uri,url:post.url};
}
