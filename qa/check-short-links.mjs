import {spawn} from 'node:child_process';import {createInterface} from 'node:readline';import assert from 'node:assert/strict';
import {shortenLinks,resolveShortLink} from '../lib/short-links.js';import {hashPassword,clientKey} from '../lib/clients.js';import delivery from '../lib/delivery.js';
const py=spawn('python3',['-u','-c',`import sys,json,fakeredis
r=fakeredis.FakeRedis(decode_responses=True)
for line in sys.stdin:
 try:print(json.dumps({'result':r.execute_command(*json.loads(line))}),flush=True)
 except Exception as e:print(json.dumps({'error':str(e)}),flush=True)
`],{stdio:['pipe','pipe','inherit']});const queue=[];createInterface({input:py.stdout}).on('line',line=>queue.shift()?.(JSON.parse(line)));const oldFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>Response.json(await new Promise(resolve=>{queue.push(resolve);py.stdin.write(options.body+'\n');}));
try{
 process.env.UPSTASH_REDIS_REST_URL='https://redis.test';process.env.UPSTASH_REDIS_REST_TOKEN='test';process.env.PUBLIC_ORIGIN='https://portal.test';process.env.LINK_KEY='b'.repeat(64);
 const alice={username:'alice',slug:'alice',brand:'Alice',passwordHash:hashPassword('alice-test')};const bob={username:'bob',slug:'bob',brand:'Bob',passwordHash:hashPassword('bob-test')};process.env.CLIENTS_JSON=JSON.stringify([alice,bob]);
 const env={LINK_KEY:clientKey(alice),PUBLIC_ORIGIN:process.env.PUBLIC_ORIGIN,CREATE_SECRET:'test'};
 const generated=await (await delivery.fetch(new Request(env.PUBLIC_ORIGIN+'/api/create',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({tokens:['AQCpiIshort_test==']})}),env)).json();const long=generated.links[0].url.replace('/subscription/new/','/b/alice/subscription/new/');
 const short=await shortenLinks(alice,[long]);assert.equal(short[0].expiresAt,generated.links[0].expiresAt);assert.equal(short[0].longUrl,long);assert.match(short[0].url,/^https:\/\/portal\.test\/s\/[A-Za-z0-9_-]{12}$/);const id=short[0].url.split('/').at(-1);
 assert.equal((await resolveShortLink(id)).url,long);assert.equal(await resolveShortLink('not-valid'),null);
 await assert.rejects(()=>shortenLinks(bob,[long]),/own account/);
 await assert.rejects(()=>shortenLinks(alice,['https://evil.test/b/alice/subscription/new/'+long.split('/').at(-1)]),/own account/);
 await assert.rejects(()=>shortenLinks(alice,[long+'broken']),/own account/);
 process.env.CLIENTS_JSON=JSON.stringify([{...alice,enabled:false},bob]);assert.equal(await resolveShortLink(id),null);process.env.CLIENTS_JSON=JSON.stringify([alice,bob]);assert.ok(await resolveShortLink(id));
 const oldKey=process.env.LINK_KEY;process.env.LINK_KEY='c'.repeat(64);assert.equal(await resolveShortLink(id),null);process.env.LINK_KEY=oldKey;
 const now=Date.now;try{Date.now=()=>now()+8*86400000;assert.equal(await resolveShortLink(id),null);await assert.rejects(()=>shortenLinks(alice,[long]),/own account/);}finally{Date.now=now;}
 console.log('Short-link tests passed: Lua storage, resolution, original expiry, ownership, domain validation, tampering, disabled accounts, key changes and expiry.');
}finally{globalThis.fetch=oldFetch;py.stdin.end();py.kill();}
