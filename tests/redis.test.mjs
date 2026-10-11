import test from 'node:test';import assert from 'node:assert/strict';
import {redis,StorageError} from '../lib/redis.js';
test('storage errors identify wrong URLs, credentials and read-only tokens without exposing upstream details',async()=>{
 const oldFetch=globalThis.fetch;const saved={UPSTASH_REDIS_REST_URL:process.env.UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN:process.env.UPSTASH_REDIS_REST_TOKEN};
 try{process.env.UPSTASH_REDIS_REST_URL='redis://wrong.test';process.env.UPSTASH_REDIS_REST_TOKEN=' private-token ';
 await assert.rejects(()=>redis('SMEMBERS','example'),e=>e instanceof StorageError&&e.code==='invalid-url');
 process.env.UPSTASH_REDIS_REST_URL=' https://redis.test/ ';
 globalThis.fetch=async(url,options)=>{assert.equal(options.headers.authorization,'Bearer private-token');return Response.json({error:'WRONGPASS private-sensitive-details'},{status:401});};
 await assert.rejects(()=>redis('SMEMBERS','example'),e=>e.code==='authentication'&&!e.message.includes('private-sensitive-details'));
 globalThis.fetch=async()=>Response.json({error:'NOPERM readonly credentials'});
 await assert.rejects(()=>redis('EVAL','example'),e=>e.code==='permissions');
 globalThis.fetch=async()=>Response.json({result:[]});assert.deepEqual(await redis('SMEMBERS','example'),[]);
 globalThis.fetch=async()=>{throw Error('Network credentials must not be echoed');};
 await assert.rejects(()=>redis('SMEMBERS','example'),e=>e.code==='network'&&!e.message.includes('credentials must'));
 const pattern='[a-z0-9\\-]{2,24}';assert.equal(new RegExp('^(?:'+pattern+')$','v').test('diginest'),true);assert.equal(new RegExp('^(?:'+pattern+')$','v').test('my-customer'),true);assert.equal(new RegExp('^(?:'+pattern+')$','v').test('bad name'),false);
 }finally{globalThis.fetch=oldFetch;for(const [k,v] of Object.entries(saved)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
