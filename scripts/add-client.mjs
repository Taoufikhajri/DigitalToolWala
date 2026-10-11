import {randomBytes} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {hashPassword} from '../lib/clients.js';
const [username,brand,slug,origin]=process.argv.slice(2);
if(!username||!brand||!/^[a-z0-9-]{2,50}$/.test(slug||'')){console.error('Usage: npm run add-client -- username "Brand Name" brand-slug [https://custom-domain.com]');process.exit(1);}
if(origin){const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin)throw Error('Use an HTTPS origin without a path or trailing slash');}
const file='clients.private.json';const list=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[];
if(list.some(c=>c.username===username||c.slug===slug))throw Error('Username or brand slug already exists');
const password=randomBytes(18).toString('base64url');list.push({username,brand,slug,passwordHash:hashPassword(password),enabled:true,...origin?{origin}:{}});writeFileSync(file,JSON.stringify(list,null,2),{mode:0o600});writeFileSync('clients-env.private.txt',JSON.stringify(list),{mode:0o600});
console.log(`Client created: ${username}\nTemporary client password: ${password}\nCopy clients-env.private.txt into Vercel CLIENTS_JSON and redeploy. Keep these private files outside Git.`);
