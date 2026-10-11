import {session,sameOrigin,reply} from '@/lib/clients';
import {storageReady,StorageError} from '@/lib/redis';
import {shortenLinks} from '@/lib/short-links';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({message:'Request not allowed'},403);
 const c=await session(request);if(!c)return reply({message:'Please sign in again'},401);
 if(!storageReady())return reply({message:'Your provider must connect Redis storage before shortening links.'},503);
 try{const raw=await request.text();if(raw.length>900000)return reply({message:'Batch too large'},413);let body;try{body=JSON.parse(raw);}catch{return reply({message:'Invalid request'},400);}
 return reply({links:await shortenLinks(c,body.urls)});
 }catch(error){if(error instanceof StorageError)return reply({message:error.message,code:error.code},503);
 const message=error instanceof Error?error.message:'';if(/^(Provide |Use active |A customer link)/.test(message))return reply({message},400);
 console.error('Short link creation failed',{name:error instanceof Error?error.name:'Unknown'});return reply({message:'Short links could not be created. Check your account and storage settings.'},503);}
}
