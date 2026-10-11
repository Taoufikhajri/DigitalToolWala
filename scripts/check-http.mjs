import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {hashPassword} from '../lib/clients.js';
const base='http://127.0.0.1:3002';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3002'],{env:{...process.env,PUBLIC_ORIGIN:base+'/',LINK_KEY:' '+ 'B'.repeat(64)+' ',SESSION_SECRET:'a'.repeat(64),GVL_AUTH:'',CLIENTS_JSON:JSON.stringify([{username:'test-client',brand:'Test Store',slug:'test-store',passwordHash:hashPassword('test-password-for-qa')}])},stdio:['ignore','pipe','pipe']});
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(d.toString().includes('Ready'))resolve();});server.on('exit',code=>reject(Error('Server exited '+code)));setTimeout(()=>reject(Error('Startup timeout')),10000).unref();});
 const login=await fetch(base+'/api/client/login',{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:'test-client',password:'test-password-for-qa'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')?.split(';')[0];
 const create=await fetch(base+'/api/client/create',{method:'POST',headers:{origin:base,cookie,'Content-Type':'application/json'},body:JSON.stringify({text:'https://reseller.example/redirect?url=https%3A%2F%2Fother.example%2Foffer%2FAQCpiIexample_valid%3D%3D\nhttps://serviceactivation.google.com/subscription/new/AQCpiIexample_valid=='})});const data=await create.json();assert.equal(create.status,200);assert.equal(data.links.length,1);assert.equal(data.duplicates,1);
 const page=await fetch(data.links[0].url);assert.equal(page.status,200);assert.ok((await page.text()).includes('Test Store'));
 const post=await fetch(data.links[0].url,{method:'POST',headers:{origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal(post.status,503);assert.match(await post.text(),/not configured/);
 const unauthorized=await fetch(base+'/api/client/create',{method:'POST',headers:{origin:base},body:'{}'});assert.equal(unauthorized.status,401);
 const csrf=await fetch(base+'/api/client/create',{method:'POST',headers:{origin:'https://wrong.test',cookie},body:'{}'});assert.equal(csrf.status,403);
 console.log('HTTP integration checks passed: login, creation, deduplication, branded page, POST forwarding, authorization and origin rejection.');
}finally{server.kill('SIGTERM');}
