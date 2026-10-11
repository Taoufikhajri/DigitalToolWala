import {account,verifyPassword,signSession,COOKIE,sameOrigin,reply,publicClient,hashPassword} from '@/lib/clients';
export const runtime='nodejs';
const attempts=new Map<string,{n:number;reset:number}>();
const dummy=hashPassword('dummy-password-not-a-client');
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({message:'Request not allowed'},403);
 if(attempts.size>10000)attempts.clear();
 try{if(Number(request.headers.get('content-length'))>4000)return reply({message:'Request too large'},413);const raw=await request.text();if(raw.length>4000)return reply({message:'Request too large'},413);const {username,password}=JSON.parse(raw);if(typeof username!=='string'||typeof password!=='string'||username.length>100||password.length>256)return reply({message:'Invalid login'},400);
 const key=username.toLowerCase();const previous=attempts.get(key);const now=Date.now();const entry=previous&&previous.reset>now?previous:{n:0,reset:now+60000};entry.n++;attempts.set(key,entry);if(entry.n>10)return reply({message:'Wait a minute before trying again'},429,{'Retry-After':'60'});
 const c=await account(username);const valid=verifyPassword(password,c?.passwordHash||dummy);if(!c||!valid)return reply({message:'Incorrect username or password'},401);
 const token=signSession(c);attempts.delete(key);return reply({client:publicClient(c)},200,{'Set-Cookie':`${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${new URL(request.url).protocol==='https:'?'; Secure':''}`});
 }catch{return reply({message:'Login is unavailable. Contact your provider.'},503);}
}
