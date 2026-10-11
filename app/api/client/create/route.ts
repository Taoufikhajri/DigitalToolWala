import {session,sameOrigin,reply,clientKey,origin} from '@/lib/clients';
import {parseLinks} from '@/lib/links';
import delivery from '@/lib/delivery';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({message:'Request not allowed. The provider must check PUBLIC_ORIGIN matches the portal domain.'},403);
 const c=await session(request);if(!c)return reply({message:'Please sign in again'},401);
 let base:string|undefined,key:string;
 try{base=origin(c);}catch{return reply({message:'The provider must set a valid HTTPS PUBLIC_ORIGIN or client origin, without a path.'},503);}
 if(!base)return reply({message:'The provider must set PUBLIC_ORIGIN'},503);
 try{key=clientKey(c);}catch{return reply({message:'The provider must set LINK_KEY to exactly 64 hexadecimal characters (0–9 and a–f) in Vercel, then redeploy. Keep the existing encryption key if links were already issued.'},503);}
 let text:string;
 try{const raw=await request.text();if(raw.length>600000)return reply({message:'Batch too large'},413);const body=JSON.parse(raw);if(typeof body.text!=='string')throw Error();text=body.text;}catch{return reply({message:'Paste your activation links in a valid request'},400);}
 const {rows,duplicates}=parseLinks(text);if(rows.length<1||rows.length>100||rows.some(r=>r.status==='invalid'))return reply({message:'Provide 1–100 activation links containing one AQCpiI token each, or raw tokens. Links with no token or multiple different tokens cannot be imported.'},400);
 try{
 const env={...process.env,LINK_KEY:key,PUBLIC_ORIGIN:base,CREATE_SECRET:process.env.SESSION_SECRET};
 const response=await delivery.fetch(new Request(new URL('/api/create',base),{method:'POST',headers:{authorization:'Bearer '+process.env.SESSION_SECRET},body:JSON.stringify({tokens:rows.map(r=>r.token)})}),env);
 let data;try{data=await response.json();}catch{console.error('Client link creation: unexpected delivery response',{status:response.status});return reply({message:'The link service returned an unexpected response. Ask your provider to update the portal code.'},502);}
 if(!response.ok)return reply(data,response.status);
 return reply({links:data.links.map((link:{url:string;expiresAt:string},i:number)=>({...link,url:link.url.replace('/subscription/new/','/b/'+c.slug+'/subscription/new/'),original:rows[i].original})),duplicates});
 }catch(error){console.error('Client link creation failed',{name:error instanceof Error?error.name:'Unknown'});return reply({message:'Link creation failed. The provider should check Vercel runtime logs for Client link creation failed.'},503);}
}
