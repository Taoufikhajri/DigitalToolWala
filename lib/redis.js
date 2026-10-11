export function storageReady(){return Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim()&&process.env.UPSTASH_REDIS_REST_TOKEN?.trim());}
export const USERS='diginest:v1:subclients';
export const SLUGS='diginest:v1:subclient-slugs';
export const ownerKey=username=>'diginest:v1:owner:'+username;
export class StorageError extends Error{
 constructor(code,message){super(message);this.name='StorageError';this.code=code;}
}
export async function redis(...command){
 if(!storageReady())throw new StorageError('not-configured','Your provider must connect subclient storage before adding accounts.');
 let url;try{url=new URL(process.env.UPSTASH_REDIS_REST_URL.trim());if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error();}catch{throw new StorageError('invalid-url','The storage address is invalid. Your provider must use the HTTPS REST URL from the Redis database, not a redis:// address.');}
 let response;try{response=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+process.env.UPSTASH_REDIS_REST_TOKEN.trim(),'Content-Type':'application/json'},body:JSON.stringify(command),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});}catch(error){throw new StorageError(error?.name==='TimeoutError'?'timeout':'network','The storage connection failed. Your provider must check the Redis database address and availability.');}
 let data;try{data=await response.json();}catch{throw new StorageError('invalid-response','The storage address did not return a Redis response. Your provider must check the HTTPS REST URL.');}
 const upstream=typeof data.error==='string'?data.error:'';
 if(response.status===401||/WRONGPASS|unauthorized|invalid.*token/i.test(upstream))throw new StorageError('authentication','Storage rejected the access token. Your provider must copy the REST token from the same Redis database as the REST URL, then redeploy.');
 if(response.status===403||/read.?only|NOPERM|permission|forbidden/i.test(upstream))throw new StorageError('permissions','Storage denied this operation. Your provider must use the full-access REST token, not the read-only token.');
 if(response.status===429||/quota|limit.*exceed/i.test(upstream))throw new StorageError('rate-limit','The storage usage limit was reached. Your provider must check the Redis database limits.');
 if(data.error)throw new StorageError('command','Storage could not run the account operation. Your provider should check the Vercel runtime logs for the storage error code.');
 if(!response.ok)throw new StorageError('http-'+response.status,'The storage service is unavailable. Your provider must check the Redis database status.');
 if(!Object.prototype.hasOwnProperty.call(data,'result'))throw new StorageError('invalid-response','Storage returned an unexpected response. Your provider must check the HTTPS REST URL.');
 return data.result;
}
