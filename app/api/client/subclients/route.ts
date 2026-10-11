import {session,reply,sameOrigin} from '@/lib/clients';
import {storageReady,StorageError} from '@/lib/redis';
import {canManage,listSubclients,addSubclient,updateSubclient} from '@/lib/subclients';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request:Request){
 if(request.method!=='GET'&&!sameOrigin(request))return reply({message:'Request not allowed'},403);
 const parent=await session(request);if(!parent)return reply({message:'Please sign in again'},401);
 if(!canManage(parent))return reply({message:'Only reseller accounts can manage subclients'},403);
 if(!storageReady())return reply({message:'Your provider must connect subclient storage before you can add accounts.'},503);
 try{
 if(request.method==='GET')return reply({subclients:await listSubclients(parent)});
 const text=await request.text();if(text.length>4000)return reply({message:'Request too large'},413);
 let body;try{body=JSON.parse(text);}catch{return reply({message:'Invalid request'},400);}
 const subclient=request.method==='POST'?await addSubclient(parent,body):await updateSubclient(parent,body);
 return reply({subclient},request.method==='POST'?201:200);
 }catch(error){if(error instanceof StorageError){console.error('Subclient storage failed',{code:error.code});return reply({message:error.message,code:error.code},503);}const message=error instanceof Error?error.message:'';if(/^(Use |That username|Subclient not found|Invalid update)/.test(message))return reply({message},400);console.error('Subclient management failed',{name:error instanceof Error?error.name:'Unknown'});return reply({message:'Subclient storage is unavailable. Contact your provider.'},503);}
}
export const GET=handle;export const POST=handle;export const PATCH=handle;
