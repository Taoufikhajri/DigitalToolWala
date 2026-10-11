import test from 'node:test';import assert from 'node:assert/strict';
import {parseLinks} from '../lib/links.ts';import {parseGoogleActivationUrl} from '../lib/google-links.js';import delivery from '../lib/delivery.js';
test('Google One URLs extract only tokens and deduplicate with legacy URLs and raw tokens',()=>{
 const token='AQCpiIexample_valid==';const one=`https://one.google.com/activate-plan/subscription/new/${token}?g1_landing_page=5#fragment`;
 assert.equal(parseGoogleActivationUrl(one),token);
 assert.equal(parseGoogleActivationUrl('https://one.google.com/activate-plan/subscription/new/'+encodeURIComponent(token)+'?g1_landing_page=5'),token);
 const result=parseLinks(one+'\nhttps://serviceactivation.google.com/subscription/new/'+token+'\n'+token);assert.equal(result.rows.length,1);assert.equal(result.rows[0].token,token);assert.equal(result.rows[0].status,'queued');assert.equal(result.duplicates,2);
 for(const value of ['https://one.google.com.evil.test/activate-plan/subscription/new/'+token,'http://one.google.com/activate-plan/subscription/new/'+token,'https://one.google.com/subscription/new/'+token,'https://user:pass@one.google.com/activate-plan/subscription/new/'+token,'https://one.google.com:8443/activate-plan/subscription/new/'+token,'https://one.google.com/activate-plan/subscription/new/'+token+'/other'])assert.equal(parseGoogleActivationUrl(value),null);
});
test('supplier Google One success is accepted and its query parameters are preserved',async()=>{
 const env={LINK_KEY:'b'.repeat(64),CREATE_SECRET:'test',PUBLIC_ORIGIN:'https://portal.test',GVL_AUTH:'mock'};const token='AQCpiIexample_valid==';
 const created=await (await delivery.fetch(new Request(env.PUBLIC_ORIGIN+'/api/create',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({tokens:[token]})}),env)).json();const url=created.links[0].url;
 const html=await (await delivery.fetch(new Request(url),env)).text();assert.ok(html.includes('one.google.com'));const old=globalThis.fetch;
 try{const fresh='https://one.google.com/activate-plan/subscription/new/AQCpiIfresh==?g1_landing_page=5';globalThis.fetch=async(u)=>{assert.equal(new URL(u).searchParams.get('token'),token);return Response.json({status:'success',url:fresh});};
 const response=await delivery.fetch(new Request(url,{method:'POST',headers:{origin:env.PUBLIC_ORIGIN}}),env);assert.equal(response.status,200);assert.equal((await response.json()).url,fresh);
 globalThis.fetch=async()=>Response.json({status:'success',url:'https://one.google.com.evil.test/activate-plan/subscription/new/AQCpiIfresh=='});assert.equal((await delivery.fetch(new Request(url,{method:'POST',headers:{origin:env.PUBLIC_ORIGIN}}),env)).status,502);
 }finally{globalThis.fetch=old;}
});
