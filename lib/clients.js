import {redis,storageReady,USERS,SLUGS} from './redis.js';
import {createHmac,randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
export const COOKIE='dn_session';
export function hashPassword(password,salt=randomBytes(16).toString('hex')){return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function verifyPassword(password,hash){try{const [salt,key]=hash.split(':');const expected=Buffer.from(key,'hex');const actual=scryptSync(password,salt,64);return expected.length===actual.length&&timingSafeEqual(expected,actual);}catch{return false;}}
export function clients(){const list=JSON.parse(process.env.CLIENTS_JSON||'[]');if(!Array.isArray(list))throw Error('Invalid client configuration');const names=new Set(),slugs=new Set();for(const c of list){if(!/^[a-z0-9-]{2,50}$/.test(c.slug)||!c.username||typeof c.brand!=='string'||c.brand.length>80||!c.passwordHash||names.has(c.username)||slugs.has(c.slug))throw Error('Invalid client configuration');names.add(c.username);slugs.add(c.slug);if(c.origin){const u=new URL(c.origin);if(u.protocol!=='https:'||u.origin!==c.origin)throw Error('Invalid client origin');}}return list;}
function secret(){if(!/^[a-f0-9]{64}$/.test(process.env.SESSION_SECRET||''))throw Error('Set SESSION_SECRET');return process.env.SESSION_SECRET;}
function fingerprint(c){return createHash('sha256').update(JSON.stringify(c)).digest('hex');}
export function signSession(c){const data=Buffer.from(JSON.stringify({u:c.username,f:fingerprint(c),e:Date.now()+8*3600000})).toString('base64url');return data+'.'+createHmac('sha256',secret()).update(data).digest('base64url');}
export async function session(request){try{const raw=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';const [data,sig]=raw.split('.');const expected=createHmac('sha256',secret()).update(data).digest();const actual=Buffer.from(sig,'base64url');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;const p=JSON.parse(Buffer.from(data,'base64url').toString());const c=await account(p.u);return c&&p.e>Date.now()&&p.f===fingerprint(c)?c:null;}catch{return null;}}
export function clientKey(c){const key=(process.env.LINK_KEY||'').trim().toLowerCase();if(!/^[a-f0-9]{64}$/.test(key))throw Error('Set LINK_KEY');return createHmac('sha256',Buffer.from(key,'hex')).update('client:'+c.slug).digest('hex');}
export function origin(c){const value=(c.origin||process.env.PUBLIC_ORIGIN||'').trim();if(!value)return undefined;const u=new URL(value);if(u.username||u.password||u.search||u.hash||u.pathname!=='/'||!(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))))throw Error('Invalid origin');return u.origin;}
export function sameOrigin(request){try{return request.headers.get('origin')===new URL((process.env.PUBLIC_ORIGIN||request.url).trim()).origin;}catch{return false;}}
export const publicClient=c=>({username:c.username,brand:c.brand,slug:c.slug,origin:origin(c),canManageSubclients:!c.parentUsername&&c.reseller!==false});
export const reply=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});

export async function account(username){
 const roots=clients();const root=roots.find(c=>c.username===username);if(root)return root.enabled!==false?root:null;
 if(!storageReady())return null;const raw=await redis('HGET',USERS,username);if(!raw)return null;
 const c=JSON.parse(raw);const parent=roots.find(p=>p.username===c.parentUsername&&p.enabled!==false&&p.reseller!==false);
 return parent&&c.enabled!==false?c:null;
}
export async function accountBySlug(slug){
 const roots=clients();const root=roots.find(c=>c.slug===slug);if(root)return root.enabled!==false?root:null;
 if(!storageReady())return null;const username=await redis('HGET',SLUGS,slug);return username?account(username):null;
}
