import {accountBySlug,clientKey,origin,reply} from '@/lib/clients';
import delivery from '@/lib/delivery';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{brand:string;code:string}>}){
 try{const {brand,code}=await context.params;const c=await accountBySlug(brand);if(!c)return reply({message:'This brand is unavailable. Contact your seller.'},404);
 const base=origin(c);if(!base||request.headers.get('host')!==new URL(base).host)return reply({message:'Open this link on the domain provided by your seller.'},404);
 const target=new URL('/subscription/new/'+code,base);return delivery.fetch(new Request(target,request),{...process.env,LINK_KEY:clientKey(c),PUBLIC_ORIGIN:base,BRAND:c.brand});
 }catch{return reply({message:'Activation unavailable. Contact your seller.'},503);}
}
export const GET=handle;export const POST=handle;export const HEAD=handle;
