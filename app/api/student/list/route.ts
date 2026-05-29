import { NextRequest, NextResponse } from 'next/server'
import { GetStudentsListHandler, GetStudentsListQuery } from '@/application/query/GetStudentsListHandler'
import { getPermissionsForRole } from '@/app/utils/permissions'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { paginationSchema } from '@/lib/validation'

const getStudentsListQueryHandler = async (request: NextRequest): Promise<NextResponse> => {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 })
        }

        const client = await clerkClient()
        const user = await client.users.getUser(userId)
        const role = user.publicMetadata?.role as string | null
        const permissions = getPermissionsForRole(role)

        const handler = new GetStudentsListHandler()
        
        const url = new URL(request.url)
        const params = Object.fromEntries(url.searchParams.entries())
        const parsed = paginationSchema.safeParse(params)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }
        
        const query: GetStudentsListQuery = { page: parsed.data.page, limit: parsed.data.limit }
        const response = await handler.handle(query)

        // Si no tiene permiso de ver detalles, ofuscar u ocultar emails
        if (!permissions.includes('view:student_details') && !permissions.includes('*')) {
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