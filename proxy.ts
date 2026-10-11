import {NextRequest,NextResponse} from 'next/server';
import {adminGuard} from './lib/admin';
export function proxy(request:NextRequest){return adminGuard(request.headers)||NextResponse.next();}
export const config={matcher:['/admin','/api/direct','/api/refresh']};
