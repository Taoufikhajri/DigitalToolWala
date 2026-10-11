import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import assert from 'node:assert/strict';
import {addSubclient,listSubclients,updateSubclient,canManage} from '../lib/subclients.js';
import {hashPassword,account,accountBySlug,signSession,session,COOKIE,verifyPassword} from '../lib/clients.js';
const py=spawn('python3',['-u','-c',`import sys,json,fakeredis
r=fakeredis.FakeRedis(decode_responses=True)
for line in sys.stdin:
 try:
  result=r.execute_command(*json.loads(line))
  if isinstance(result,set):result=list(result)
  print(json.dumps({'result':result}),flush=True)
 except Exception as e:print(json.dumps({'error':str(e)}),flush=True)
`],{stdio:['pipe','pipe','inherit']});
const waiting=[];const lines=createInterface({input:py.stdout});lines.on('line',line=>waiting.shift()?.(JSON.parse(line)));
const oldFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{assert.equal(String(url),'https://redis.test/');const data=await new Promise(resolve=>{waiting.push(resolve);py.stdin.write(options.body+'\n');});return Response.json(data);};
try{
 process.env.UPSTASH_REDIS_REST_URL='https://redis.test';process.env.UPSTASH_REDIS_REST_TOKEN='test';process.env.SESSION_SECRET='a'.repeat(64);process.env.PUBLIC_ORIGIN='https://portal.test';
 const alice={username:'alice',brand:'Alice',slug:'alice',passwordHash:hashPassword('alice-test')};const bob={username:'bob',brand:'Bob',slug:'bob',passwordHash:hashPassword('bob-test')};process.env.CLIENTS_JSON=JSON.stringify([alice,bob]);
 const c=await addSubclient(alice,{username:'customer',brand:'Customer Store'});assert.equal(c.username,'alice_customer');assert.ok(c.password);assert.equal((await listSubclients(alice)).length,1);assert.equal((await listSubclients(bob)).length,0);
 const child=await account(c.username);assert.ok(verifyPassword(c.password,child.passwordHash));assert.equal(child.parentUsername,'alice');assert.equal((await accountBySlug(c.slug)).username,c.username);assert.equal(canManage(child),false);
 await assert.rejects(()=>addSubclient(child,{username:'nested',brand:'Nested'}),/Forbidden/);
 await assert.rejects(()=>updateSubclient(bob,{username:c.username,action:'disable'}),/not found/);
 const results=await Promise.allSettled([addSubclient(alice,{username:'duplicate',brand:'D'}),addSubclient(alice,{username:'duplicate',brand:'D'})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const req=token=>new Request('https://portal.test',{headers:{cookie:COOKIE+'='+token}});const signed=signSession(child);assert.ok(await session(req(signed)));
 const reset=await updateSubclient(alice,{username:c.username,action:'reset-password'});assert.ok(reset.password);assert.equal(await session(req(signed)),null);assert.ok(verifyPassword(reset.password,(await account(c.username)).passwordHash));
 await updateSubclient(alice,{username:c.username,action:'disable'});assert.equal(await account(c.username),null);assert.equal(await accountBySlug(c.slug),null);
 await updateSubclient(alice,{username:c.username,action:'enable'});assert.ok(await account(c.username));
 process.env.CLIENTS_JSON=JSON.stringify([{...alice,enabled:false},bob]);assert.equal(await account(c.username),null);assert.equal(await accountBySlug(c.slug),null);
 console.log('Redis command and Lua interpreter checks passed: isolation, child permissions, atomic duplicate prevention, password reset, session revocation, disable/enable, disabled reseller cascade.');
}finally{globalThis.fetch=oldFetch;py.stdin.end();py.kill();}
