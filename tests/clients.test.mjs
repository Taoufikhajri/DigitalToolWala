import test from 'node:test';
import assert from 'node:assert/strict';
import {clients,hashPassword,verifyPassword,signSession,session,clientKey,COOKIE} from '../lib/clients.js';
import delivery from '../lib/delivery.js';
test('sessions reject tampering, expired sessions, disabled accounts and password changes',async()=>{
 process.env.SESSION_SECRET='a'.repeat(64);process.env.LINK_KEY='b'.repeat(64);
 const c={username:'alice',brand:'Alice Store',slug:'alice-store',passwordHash:hashPassword('very-long-password')};process.env.CLIENTS_JSON=JSON.stringify([c]);
 assert.equal(verifyPassword('wrong',c.passwordHash),false);assert.equal(verifyPassword('very-long-password',c.passwordHash),true);
 const token=signSession(c);const req=(v=token)=>new Request('https://portal.test',{headers:{cookie:COOKIE+'='+v}});
 assert.equal((await session(req())).username,'alice');assert.equal(await session(req(token+'x')),null);
 const now=Date.now;try{Date.now=()=>now()+9*3600000;assert.equal(await session(req()),null);}finally{Date.now=now;}
 process.env.CLIENTS_JSON=JSON.stringify([{...c,enabled:false}]);assert.equal(await session(req()),null);
 process.env.CLIENTS_JSON=JSON.stringify([{...c,passwordHash:hashPassword('another-password')}]);assert.equal(await session(req()),null);
 process.env.CLIENTS_JSON=JSON.stringify([c,c]);assert.throws(()=>clients());
});
test('a client cannot open another brand encrypted link, and branding is HTML escaped',async()=>{
 process.env.LINK_KEY='b'.repeat(64);const c={slug:'alice'};const env={LINK_KEY:clientKey(c),PUBLIC_ORIGIN:'https://portal.test',CREATE_SECRET:'secret',BRAND:'Alice <script>Store</script>'};
 const r=await delivery.fetch(new Request('https://portal.test/api/create',{method:'POST',headers:{authorization:'Bearer secret'},body:JSON.stringify({tokens:['AQCpiIexample_valid==']})}),env);const {links}=await r.json();
 const page=await delivery.fetch(new Request(links[0].url),env);const html=await page.text();assert.ok(html.includes('Alice &lt;script&gt;Store&lt;/script&gt;'));
 assert.equal((await delivery.fetch(new Request(links[0].url),{...env,LINK_KEY:clientKey({slug:'bob'})})).status,404);
});
test('origins are normalized and encryption keys accept surrounding whitespace and uppercase hex',async()=>{
 const {origin,sameOrigin}=await import('../lib/clients.js');
 process.env.PUBLIC_ORIGIN=' https://portal.test/ ';
 assert.equal(origin({}),'https://portal.test');
 assert.equal(sameOrigin(new Request('https://portal.test/api/client/create',{headers:{origin:'https://portal.test'}})),true);
 assert.throws(()=>origin({origin:'https://portal.test/unwanted-path'}));
 process.env.LINK_KEY='B'.repeat(64);const key=clientKey({slug:'alice'});
 process.env.LINK_KEY=' '+ 'b'.repeat(64)+'\n';assert.equal(clientKey({slug:'alice'}),key);
 process.env.LINK_KEY='placeholder';assert.throws(()=>clientKey({slug:'alice'}));
});
