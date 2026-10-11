import {createHash,timingSafeEqual} from 'node:crypto';
function equal(a:string,b:string){return timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());}
export function adminGuard(headers:Headers):Response|null{
 const username=process.env.ADMIN_USERNAME||'admin',password=process.env.ADMIN_PASSWORD;
 if(!password||password.length<16||password.startsWith('replace-'))return Response.json({message:'Set ADMIN_PASSWORD to a strong password of at least 16 characters in your environment settings.'},{status:503,headers:{'Cache-Control':'no-store'}});
 const value=headers.get('authorization')||'';let user='',pass='';
 try{if(value.startsWith('Basic ')){const decoded=Buffer.from(value.slice(6),'base64').toString('utf8');const at=decoded.indexOf(':');if(at>=0){user=decoded.slice(0,at);pass=decoded.slice(at+1);}}}catch{}
 const validUser=equal(user,username),validPassword=equal(pass,password);
 if(validUser&&validPassword)return null;
 return Response.json({message:'Admin login required'},{status:401,headers:{'WWW-Authenticate':'Basic realm="DigitalToolWala Admin", charset="UTF-8"','Cache-Control':'no-store'}});
}
