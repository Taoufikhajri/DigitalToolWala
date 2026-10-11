// Exact Google hosts and paths only. Keep this function self-contained:
// the same validator is embedded in the customer redirect page.
export function parseGoogleActivationUrl(value){
 try{
  const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return null;
  let prefix;
  if(u.origin==='https://serviceactivation.google.com')prefix='/subscription/new/';
  else if(u.origin==='https://one.google.com')prefix='/activate-plan/subscription/new/';
  else return null;
  if(!u.pathname.startsWith(prefix))return null;
  const token=decodeURIComponent(u.pathname.slice(prefix.length));
  return /^AQCpiI[A-Za-z0-9_\-=]+$/.test(token)&&token.length<=4096?token:null;
 }catch{return null;}
}
