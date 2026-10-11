import {resolveShortLink} from '@/lib/short-links';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
async function handle(request:Request,context:{params:Promise<{id:string}>}){
 try{const {id}=await context.params;const link=await resolveShortLink(id);if(!link||request.headers.get('host')!==new URL(link.origin).host)return new Response('This link is unavailable or expired. Contact your seller.',{status:404,headers});
 return new Response(null,{status:302,headers:{...headers,Location:link.url}});
 }catch{return new Response('The link service is temporarily unavailable. Please try again.',{status:503,headers});}
}
export const GET=handle;export const HEAD=handle;
