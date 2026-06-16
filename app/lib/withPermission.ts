import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { PERMISSION, PERMISSIONS_BY_ROLE, PermissionMapping } from '../../domain/identity/permissions';

export interface UserInfo {
    userId: string
    role: string
    email: string | null
    jwt: string | null
}

type PermissionedHandler = (request: NextRequest, userInfo: UserInfo, context: unknown) => Promise<NextResponse> | NextResponse;

export function withPermission(permission: PERMISSION, handler: PermissionedHandler) {
    return async (request: NextRequest, context: unknown): Promise<NextResponse> => {
        try {
            const { userId } = await auth();
            if (!userId) {
                return NextResponse.json(
                    { error: 'No autorizado. Inicia sesión para continuar.' },
                    { status: 401 }
                );
            }

            const user = await currentUser();
            let role = (user?.publicMetadata?.role as string) ?? null;
            const rawRole = role;

            // Normalizar roles de Clerk a los del dominio (admin, student)
            if (role === 'Administrador' || role === 'Docente' || role === 'Auxiliar docente') {
                role = 'admin';
            } else if (role === 'Estudiante') {
                role = 'student';
            }

            let hasPermission = !!role && PERMISSIONS_BY_ROLE.some(
                (p: PermissionMapping) => p.role === role && p.permission === permission
            );
            if (permission === PERMISSION.STUDENT_DEACTIVATE && rawRole === 'Auxiliar docente') {
                hasPermission = false;
            }
            if (!hasPermission) {
                return NextResponse.json(
                    { error: 'No tenés permiso para realizar esta acción.' },
                    { status: 403 }
                );
            }

            const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
            const { getToken } = await auth();
            const jwt = await getToken();
            const userInfo: UserInfo = { userId, role, email, jwt }

            return await handler(request, userInfo, context);
        } catch (error) {
            console.error(`[API Error] ${request.method} ${request.nextUrl.pathname}:`, error);
            return NextResponse.json(
                { error: 'Ocurrió un error al procesar la solicitud.' },
                { status: 500 }
            );
        }
    };
}
