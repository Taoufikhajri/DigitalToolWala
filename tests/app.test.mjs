import test from 'node:test';
import assert from 'node:assert/strict';
import delivery from '../lib/delivery.js';
import {adminGuard} from '../lib/admin.ts';
import {parseLinks} from '../lib/links.ts';

test('admin access requires configured credentials and rejects incorrect passwords',()=>{
 const saved={ADMIN_USERNAME:process.env.ADMIN_USERNAME,ADMIN_PASSWORD:process.env.ADMIN_PASSWORD};
 try{delete process.env.ADMIN_PASSWORD;assert.equal(adminGuard(new Headers()).status,503);process.env.ADMIN_USERNAME='admin';process.env.ADMIN_PASSWORD='test-password-with-24-chars';assert.equal(adminGuard(new Headers()).status,401);assert.equal(adminGuard(new Headers({authorization:'Basic '+Buffer.from('admin:wrong').toString('base64')})).status,401);assert.equal(adminGuard(new Headers({authorization:'Basic '+Buffer.from('admin:'+process.env.ADMIN_PASSWORD).toString('base64')})),null);}finally{for(const [k,v]of Object.entries(saved)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
test('link import extracts tokens, removes duplicates, and marks malformed links',()=>{
 const token='AQCpiITest_valid==';const result=parseLinks(`https://serviceactivation.google.com/subscription/new/${token}\r\n${token}\nbad`);assert.equal(result.rows.length,2);assert.equal(result.duplicates,1);assert.equal(result.rows[0].token,token);assert.equal(result.rows[1].status,'invalid');
});
test('customer links encrypt tokens, survive server restarts, expire, and refresh only on POST',async()=>{
 const env={LINK_KEY:'b'.repeat(64),CREATE_SECRET:'test-admin',PUBLIC_ORIGIN:'https://example.test',GVL_AUTH:'test-supplier-secret'};const token='AQCpiITest_valid_token==';
 const create=(authorization='Bearer test-admin')=>new Request(env.PUBLIC_ORIGIN+'/api/create',{method:'POST',headers:{authorization},body:JSON.stringify({tokens:[token]})});
 assert.equal((await delivery.fetch(create('bad'),env)).status,401);
 const created=await (await delivery.fetch(create(),env)).json();const url=created.links[0].url;assert.ok(!url.includes(token));assert.ok(Date.parse(created.links[0].expiresAt)-Date.now()>6.99*86400000);
 const oldFetch=globalThis.fetch;let called=0;
 try{globalThis.fetch=async(u,options)=>{called++;assert.equal(options.redirect,'manual');assert.equal(options.headers.auth,env.GVL_AUTH);assert.equal(new URL(u).searchParams.get('token'),token);return Response.json({status:'success',url:'https://serviceactivation.google.com/subscription/new/AQCpiIRefreshed=='});};
 const get=await delivery.fetch(new Request(url),{...env});assert.equal(get.status,200);assert.match(await get.text(),/location.replace/);assert.equal(called,0);
 assert.equal((await delivery.fetch(new Request(url,{method:'HEAD'}),env)).status,200);assert.equal(called,0);
 assert.equal((await delivery.fetch(new Request(url,{method:'POST',headers:{origin:'https://wrong.test'}}),env)).status,403);assert.equal(called,0);
 const post=()=>new Request(url,{method:'POST',headers:{origin:env.PUBLIC_ORIGIN}});assert.equal((await (await delivery.fetch(post(),env)).json()).status,'success');assert.equal(called,1);
 for(const status of [404,429]){globalThis.fetch=async()=>new Response('',{status});assert.equal((await delivery.fetch(post(),env)).status,status);}
 globalThis.fetch=async()=>Response.json({status:'success',url:'https://malicious.test/'});assert.equal((await delivery.fetch(post(),env)).status,502);
 assert.equal((await delivery.fetch(new Request(url+'A'),env)).status,404);
 const now=Date.now;try{Date.now=()=>now()+8*86400000;assert.equal((await delivery.fetch(new Request(url),env)).status,410);}finally{Date.now=now;}
 }finally{globalThis.fetch=oldFetch;}
});
