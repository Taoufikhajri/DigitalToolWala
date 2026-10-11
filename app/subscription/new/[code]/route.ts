import delivery from '@/lib/delivery';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
const handle=(request:Request)=>delivery.fetch(request,process.env);
export const GET=handle;
export const POST=handle;
export const HEAD=handle;
