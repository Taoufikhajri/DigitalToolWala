import {adminGuard} from '@/lib/admin';
import delivery from '@/lib/delivery';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const denied=adminGuard(request.headers);if(denied)return denied;
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(request.headers.get('origin')!==new URL(process.env.PUBLIC_ORIGIN||request.url).origin)return reply({message:'Request not allowed'},403);
 if(!process.env.PUBLIC_ORIGIN||!process.env.LINK_KEY)return reply({message:'Set PUBLIC_ORIGIN and LINK_KEY in your environment settings.'},503);
 const origin=process.env.PUBLIC_ORIGIN.replace(/\/$/,'');
 try{const raw=await request.text();if(raw.length>600000)return reply({message:'Batch is too large'},413);
 return delivery.fetch(new Request(origin+'/api/create',{method:'POST',headers:{authorization:'Bearer '+process.env.ADMIN_PASSWORD},body:raw}),{...process.env,PUBLIC_ORIGIN:origin,CREATE_SECRET:process.env.ADMIN_PASSWORD});
 }catch{return reply({message:'Could not create customer links. Check your environment settings.'},503);}
}
