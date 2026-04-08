import { NextRequest, NextResponse } from 'next/server'
import { GetStudentsListHandler, GetStudentsListQuery } from '@/application/query/GetStudentsListHandler'
import { auth } from '@clerk/nextjs/server'

const getStudentsListQueryHandler = async (request: NextRequest): Promise<NextResponse> => {
    try {
        const sessionClaims = await auth()
        if (!sessionClaims.userId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 })
        }

        const role = (sessionClaims.sessionClaims?.publicMetadata as any)?.role as string | undefined || 'Estudiante'

        const handler = new GetStudentsListHandler()
        
        const query: GetStudentsListQuery = {}
        const response = await handler.handle(query)

        // Si el rol es Estudiante, ofuscar u ocultar emails y otros datos sensibles
        if (role === 'Estudiante') {
            response.list = response.list.map(student => ({
                ...student,
                email: '' // Ocultamos el mail
            }))
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error("Error procesando el mensaje:", error)
        return NextResponse.json(
            { error: "Ocurrió un error al procesar la solicitud" },
            { status: 500 }
        )
    }
}

export const GET = getStudentsListQueryHandler