import {randomBytes} from 'node:crypto';
import {clients,hashPassword,origin} from './clients.js';
import {redis,USERS,SLUGS,ownerKey} from './redis.js';
export function canManage(c){return Boolean(c&&!c.parentUsername&&c.reseller!==false);}
const safe=c=>({username:c.username,brand:c.brand,slug:c.slug,enabled:c.enabled!==false,createdAt:c.createdAt});
export async function listSubclients(parent){
 if(!canManage(parent))throw Error('Forbidden');const users=await redis('SMEMBERS',ownerKey(parent.username));if(!users.length)return [];
 const raw=await redis('HMGET',USERS,...users);return raw.filter(Boolean).map(s=>JSON.parse(s)).filter(c=>c.parentUsername===parent.username).map(safe).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export async function addSubclient(parent,{username,brand}){
 if(!canManage(parent))throw Error('Forbidden');
 if(typeof username!=='string'||! /^[a-z0-9-]{2,24}$/.test(username)||typeof brand!=='string'||!brand.trim()||brand.trim().length>80)throw Error('Use 2–24 lowercase letters, numbers or hyphens for the username, and a brand of 1–80 characters.');
 const actualUsername=parent.slug+'_'+username;const slug=parent.slug.slice(0,25)+'-'+randomBytes(8).toString('hex');
 if(clients().some(c=>c.username===actualUsername||c.slug===slug))throw Error('That username is unavailable.');
 const password=randomBytes(18).toString('base64url');
 const c={username:actualUsername,brand:brand.trim(),slug,parentUsername:parent.username,passwordHash:hashPassword(password),enabled:true,createdAt:new Date().toISOString(),origin:origin(parent)};
 const script=`if redis.call('HEXISTS',KEYS[1],ARGV[1]) == 1 or redis.call('HEXISTS',KEYS[2],ARGV[2]) == 1 then return 0 end redis.call('HSET',KEYS[1],ARGV[1],ARGV[3]) redis.call('HSET',KEYS[2],ARGV[2],ARGV[1]) redis.call('SADD',KEYS[3],ARGV[1]) return 1`;
 const result=await redis('EVAL',script,'3',USERS,SLUGS,ownerKey(parent.username),c.username,c.slug,JSON.stringify(c));
 if(result!==1)throw Error('That username is already used. Choose another one.');return {...safe(c),password};
}
export async function updateSubclient(parent,{username,action}){
 if(!canManage(parent))throw Error('Forbidden');if(typeof username!=='string'||!['enable','disable','reset-password'].includes(action))throw Error('Invalid update');
 const password=action==='reset-password'?randomBytes(18).toString('base64url'):null;
 const value=password?hashPassword(password):'';
 // Ownership and update run atomically, including concurrent password resets and status changes.
 const script=`local raw=redis.call('HGET',KEYS[1],ARGV[1]) if not raw then return false end local c=cjson.decode(raw) if c.parentUsername ~= ARGV[2] then return false end if ARGV[3] == 'reset-password' then c.passwordHash=ARGV[4] else c.enabled=ARGV[3] == 'enable' end local updated=cjson.encode(c) redis.call('HSET',KEYS[1],ARGV[1],updated) return updated`;
 const raw=await redis('EVAL',script,'1',USERS,username,parent.username,action,value);if(!raw)throw Error('Subclient not found');const c=JSON.parse(raw);return {...safe(c),...password?{password}:{}};
}
