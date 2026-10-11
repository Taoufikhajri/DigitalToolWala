import {extractActivationToken} from './import-links.js';
export const isValidToken=(token:string)=>/^AQCpiI[A-Za-z0-9_\-=]+$/.test(token)&&token.length<=4096;
export type Row = {id:number; original:string; token:string; status:'queued'|'refreshing'|'success'|'invalid'|'error'; url?:string; message?:string};
export function parseLinks(text:string) {
 const seen=new Set<string>(); let duplicates=0;
 const rows:Row[]=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map((original,id)=>{
  const token=extractActivationToken(original)||'';
  const valid=isValidToken(token);
  return {id:id+1,original,token,status:valid?'queued':'invalid',message:valid?undefined:'No unique activation token found. Use a link containing one AQCpiI token, or paste the raw token.'} as Row;
 }).filter(row=>{if(row.token&&seen.has(row.token)){duplicates++;return false;}if(row.token)seen.add(row.token);return true;});
 return {rows,duplicates};
}
