import {parseGoogleActivationUrl} from '@/lib/google-links';
import {adminGuard} from '@/lib/admin';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function POST(request:Request) {
 const denied=adminGuard(request.headers);if(denied)return denied;
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(request.headers.get('origin')!==new URL(process.env.PUBLIC_ORIGIN||request.url).origin) return reply({message:'Request not allowed'},403);
 if(Number(request.headers.get('content-length')||0)>8000) return reply({message:'Request too large'},413);
 let token:string;try {const body=await request.json() as {token:string};token=body.token;if(typeof token!=='string'||!/^AQCpiI[A-Za-z0-9_\-=]+$/.test(token)||token.length>4096)throw Error();}catch{return reply({message:'Invalid token'},400);}
 const auth=process.env.GVL_AUTH;
 if(!auth)return reply({message:'API credential is not configured'},503);
 const url=new URL('https://prod.38742386.top/api/v1/getvalidlink/43734638/');url.searchParams.set('token',token);
 try {
 const upstream=await fetch(url,{method:'GET',headers:{auth},signal:AbortSignal.timeout(55000),redirect:'manual'});
 if(upstream.status>=300&&upstream.status<400)return reply({message:`Supplier returned a redirect (HTTP ${upstream.status}). Ask your supplier for the direct API endpoint.`},502);
 if(upstream.status===401)return reply({message:'API authorization failed. Check with your supplier.'},401);
 if(upstream.status===404)return reply({status:'invalid',message:'Token not found in the supplier system'},404);
 if(upstream.status===429)return reply({message:'Rate limit reached. Waiting before retrying.'},429);
 if(!upstream.ok)return reply({message:`Supplier returned HTTP ${upstream.status}`},502);
 const data=await upstream.json() as {status?:string;url?:string};
 if(data.status==='success'&&typeof data.url==='string'){const fresh=new URL(data.url);if(parseGoogleActivationUrl(fresh.href))return reply({status:'success',url:data.url});}
 return reply({message:'Supplier returned an unexpected response'},502);
 }catch(error){const e=error as Error;console.error('Supplier request failed',{name:e.name,message:e.message});return reply({message:e.name==='TimeoutError'||e.name==='AbortError'?'Supplier did not respond within 55 seconds. Retry or contact your supplier.':'Supplier connection failed: '+(e.message||'network error')},502);}
}
