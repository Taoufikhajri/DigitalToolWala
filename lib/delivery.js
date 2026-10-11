import {parseGoogleActivationUrl} from './google-links.js';
const BASE_HEADERS={"Cache-Control":"no-store, private","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow, noarchive","X-Content-Type-Options":"nosniff"};
const encoder=new TextEncoder();
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
function unbase(value){if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Invalid link');const s=value.replaceAll('-','+').replaceAll('_','/');return Uint8Array.from(atob(s+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));}
async function encryptionKey(env){if(!/^[0-9a-f]{64}$/.test(env.LINK_KEY||''))throw Error('Service not configured');return crypto.subtle.importKey('raw',Uint8Array.from(env.LINK_KEY.match(/../g),s=>parseInt(s,16)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
async function encode(token,env,expiresAt){const iv=crypto.getRandomValues(new Uint8Array(12));const payload=encoder.encode(JSON.stringify({v:1,t:token,e:expiresAt}));const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await encryptionKey(env),payload));const out=new Uint8Array(iv.length+encrypted.length);out.set(iv);out.set(encrypted,iv.length);return b64url(out);}
export async function decode(cap,env){const bytes=unbase(cap);if(bytes.length<29)throw Error('Invalid link');const decoded=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},await encryptionKey(env),bytes.slice(12));const payload=JSON.parse(new TextDecoder().decode(decoded));if(payload.v!==1||typeof payload.t!=='string'||!/^AQCpiI[A-Za-z0-9_\-=]+$/.test(payload.t)||payload.t.length>4096||!Number.isSafeInteger(payload.e))throw Error('Invalid link');return payload;}
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{...BASE_HEADERS,...headers}});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function html(title,message,activate=false,status=200,brand="Please wait..."){
 const nonce=b64url(crypto.getRandomValues(new Uint8Array(16)));
 const svg=encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#2459dd"/><path d="M11 18l7-7m-6 1 2-2a5 5 0 0 1 7 7l-2 2m1 1-2 2a5 5 0 0 1-7-7l2-2" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>');
 const page=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(title)}</title><link rel="icon" href="data:image/svg+xml,${svg}"><style nonce="${nonce}">*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;background:#f3f6fa;color:#172338;margin:0;display:grid;min-height:100svh;place-items:center;padding:24px}main{background:#fff;border:1px solid #dfe6f0;border-radius:18px;max-width:460px;width:100%;padding:42px 32px;text-align:center} .brand{color:#2459dd;font-weight:750;font-size:18px;margin-bottom:30px}h1{font-size:25px;line-height:1.25;letter-spacing:-.5px;margin:0 0 15px}p{color:#66768c;font-size:16px;line-height:1.7;margin:0}button{font:inherit;background:#2459dd;color:#fff;border:0;border-radius:8px;padding:12px 24px;cursor:pointer;margin-top:22px}button:disabled{opacity:.5}.spinner{width:34px;height:34px;margin:0 auto 24px;border:3px solid #e8eef9;border-top-color:#2459dd;border-radius:50%;animation:spin .9s linear infinite}.note{font-size:12px;margin-top:28px;color:#8a97aa}@keyframes spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.spinner{animation:none}}</style></head><body><main><div class="brand">${escape(brand)}</div>${activate?'<div class="spinner" id="spinner" aria-hidden="true"></div>':''}<h1 id="title">${escape(title)}</h1><p id="message" role="status">${escape(message)}</p>${activate?'<button id="retry" hidden>Try again</button><noscript><p>Enable JavaScript to open your activation link.</p></noscript>':''}<p class="note">Activation continues on Google’s website.</p></main>${activate?`<script nonce="${nonce}">
 const parseGoogleActivationUrl=${parseGoogleActivationUrl.toString()};
 const retry=document.getElementById('retry'),spinner=document.getElementById('spinner'),heading=document.getElementById('title'),message=document.getElementById('message');let active=false;
 async function openLink(){if(active)return;active=true;retry.hidden=true;spinner.hidden=false;heading.textContent='Opening your activation';message.textContent='Refreshing your link. You will be taken to Google automatically.';
 try{const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(70000)});let data;try{data=await r.json()}catch{throw Error('The service could not respond. Please try again.')}
 if(!r.ok||data.status!=='success')throw Error(data.message||'Unable to refresh this link.');const target=new URL(data.url);if(!parseGoogleActivationUrl(target.href))throw Error('Unexpected activation page. Contact your seller.');location.replace(target.href);
 }catch(e){spinner.hidden=true;heading.textContent='Activation unavailable';message.textContent=e.name==='TimeoutError'?'The supplier is taking too long. Please try again.':e.message;retry.hidden=false;active=false;}}
 retry.addEventListener('click',openLink);openLink();</script>`:''}</body></html>`;
 return new Response(page,{status,headers:{...BASE_HEADERS,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; img-src data:; base-uri 'none'; frame-ancestors 'none'`}});
}
async function refresh(token,env){
 if(!env.GVL_AUTH)return json({message:'Activation service is not configured. Contact your seller.'},503);
 const url=new URL('https://prod.38742386.top/api/v1/getvalidlink/43734638/');url.searchParams.set('token',token);
 try{const result=await fetch(url,{method:'GET',headers:{auth:env.GVL_AUTH},redirect:'manual',signal:AbortSignal.timeout(55000)});
 if(result.status===404)return json({message:'This link is not available in the supplier system. Contact your seller.'},404);
 if(result.status===401)return json({message:'Supplier access is unavailable. Contact your seller.'},503);
 if(result.status===429)return json({message:'The supplier is busy. Wait one minute and try again.'},429,{'Retry-After':'60'});
 if(!result.ok)return json({message:'The supplier could not refresh this link. Please try again or contact your seller.'},502);
 const data=await result.json();const target=new URL(data.url);if(data.status!=='success'||!parseGoogleActivationUrl(target.href))throw Error('Unexpected response');
 return json({status:'success',url:target.href});
 }catch(error){console.error('Activation refresh failed',{name:error.name});return json({message:'The supplier is not responding. Please try again or contact your seller.'},502);}
}
export default {async fetch(request,env){
 try{
 const url=new URL(request.url);
 if(url.pathname==='/api/create'){
  if(request.method!=='POST')return json({message:'Method not allowed'},405,{Allow:'POST'});
  if(!env.CREATE_SECRET||request.headers.get('authorization')!=='Bearer '+env.CREATE_SECRET)return json({message:'Unauthorized'},401);
  const raw=await request.text();if(raw.length>600000)return json({message:'Batch is too large'},413);
  let data;try{data=JSON.parse(raw)}catch{return json({message:'Invalid request'},400)};
  if(!Array.isArray(data.tokens)||data.tokens.length<1||data.tokens.length>100||data.tokens.some(t=>typeof t!=='string'||!/^AQCpiI[A-Za-z0-9_\-=]+$/.test(t)||t.length>4096))return json({message:'Provide up to 100 valid tokens'},400);
  const expiresAt=Date.now()+7*24*60*60*1000;const origin=env.PUBLIC_ORIGIN;if(!origin||!(['https:'].includes(new URL(origin).protocol)||(['localhost','127.0.0.1'].includes(new URL(origin).hostname)&&new URL(origin).protocol==='http:')))return json({message:'Service not configured'},503);
  const links=await Promise.all(data.tokens.map(async token=>({url:origin+'/subscription/new/'+await encode(token,env,expiresAt),expiresAt:new Date(expiresAt).toISOString()})));
  return json({status:'success',links});
 }
 const match=url.pathname.match(/^\/subscription\/new\/([A-Za-z0-9_-]{30,7000})$/);
 if(match){
  if(request.method==='HEAD')return new Response(null,{headers:BASE_HEADERS});
  if(!['GET','POST'].includes(request.method))return json({message:'Method not allowed'},405);
  let payload;try{payload=await decode(match[1],env)}catch{return request.method==='POST'?json({message:'This link is invalid. Contact your seller.'},404):html('Link unavailable','This link is invalid. Contact your seller.',false,404)}
  if(payload.e<Date.now())return request.method==='POST'?json({message:'This link’s 7-day opening window has ended. Contact your seller.'},410):html('Link expired','This link’s 7-day opening window has ended. Contact your seller.',false,410);
  if(request.method==='GET')return html('Opening your activation','Refreshing your link. You will be taken to Google automatically.',true,200,env.BRAND||'Please wait...');
  if(request.headers.get('origin')!==new URL(env.PUBLIC_ORIGIN||url.origin).origin)return json({message:'Request not allowed'},403);
  return refresh(payload.t,env);
 }
 if(url.pathname==='/'&&request.method==='GET')return html('Activation links','Open the complete link provided by your seller to continue.');
 return html('Link unavailable','Check the link or contact your seller.',false,404);
 }catch(error){console.error('Delivery request failed',{name:error.name});return json({message:'Activation service is temporarily unavailable. Please try again.'},503);}
}};
