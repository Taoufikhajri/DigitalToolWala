import {COOKIE,sameOrigin,reply} from '@/lib/clients';
export async function POST(request:Request){if(!sameOrigin(request))return reply({message:'Request not allowed'},403);return reply({ok:true},200,{'Set-Cookie':`${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0; Secure`});}
