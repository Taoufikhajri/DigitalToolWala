const tokenPattern=/^AQCpiI[A-Za-z0-9_\-=]+$/;
const validToken=value=>tokenPattern.test(value)&&value.length<=4096;
// Import any HTTP(S) domain without fetching it. The supplier receives only
// an unambiguous activation token. Redirect destinations use a separate validator.
export function extractActivationToken(input){
 if(typeof input!=='string'||input.length>32768)return null;
 let value=input.trim();
 const markdown=value.match(/^\[[^\]]*\]\((https?:\/\/[^\s]+)\)$/i);if(markdown)value=markdown[1];
 if(value.startsWith('<')&&value.endsWith('>'))value=value.slice(1,-1);
 const tokens=new Set();let visited=0;
 function visit(text,depth){
  if(depth>6||++visited>256||!text||text.length>32768)return;
  if(validToken(text)){tokens.add(text);return;}
  let decoded=text;for(let i=0;i<3;i++){
   try{const next=decodeURIComponent(decoded);if(next===decoded)break;decoded=next;}catch{break;}
   if(validToken(decoded)){tokens.add(decoded);return;}
  }
  if(decoded!==text){visit(decoded,depth+1);return;}
  if(text.startsWith('/')){for(const part of text.split('/').filter(Boolean))visit(part,depth+1);return;}
  if(text.includes('=')&&!/^https?:/i.test(text)){for(const part of new URLSearchParams(text).values())visit(part,depth+1);return;}
  try{
   const u=new URL(text);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return;
   for(const part of u.pathname.split('/').filter(Boolean))visit(part,depth+1);
   for(const part of u.searchParams.values())visit(part,depth+1);
   if(u.hash)visit(u.hash.slice(1),depth+1);
  }catch{}
 }
 visit(value,0);return tokens.size===1?[...tokens][0]:null;
}
