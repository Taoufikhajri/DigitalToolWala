import {randomBytes} from 'node:crypto';
console.log('LINK_KEY='+randomBytes(32).toString('hex'));
console.log('ADMIN_USERNAME=admin');
console.log('ADMIN_PASSWORD='+randomBytes(24).toString('base64url'));
console.log('\nCopy these into Vercel Environment Variables or your local .env.local. Keep them private.');

console.log('SESSION_SECRET='+randomBytes(32).toString('hex'));
