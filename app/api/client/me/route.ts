import {session,reply,publicClient} from '@/lib/clients';
export const dynamic='force-dynamic';
export async function GET(request:Request){const c=await session(request);return c?reply({client:publicClient(c)}):reply({message:'Please sign in'},401);}
