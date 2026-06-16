import { NextRequest, NextResponse } from 'next/server'
import { GetStudentsListHandler, GetStudentsListQuery } from '@/application/query/GetStudentsListHandler'
import { withPermission, UserInfo } from '@/app/lib/withPermission'
import { PERMISSION } from '@/domain/identity/permissions'
import { paginationSchema } from '@/lib/validation'

const getStudentsListQueryHandler = async (request: NextRequest, userInfo: UserInfo): Promise<NextResponse> => {
    try {
        const url = new URL(request.url)
        const params = Object.fromEntries(url.searchParams.entries())
        const parsed = paginationSchema.safeParse(params)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const handler = new GetStudentsListHandler()
        const query: GetStudentsListQuery = { page: parsed.data.page, limit: parsed.data.limit }
        const response = await handler.handle(query)

        // Si no tiene rol admin (Administrador, Docente, Auxiliar), ofuscar emails y detalles ajenos
        if (userInfo.role !== 'admin') {
            response.list = response.list.map(student => ({
                ...student,
                email: '', // Ocultamos el mail
                detail: student.id === userInfo.userId ? student.detail : null // Permitimos ver solo comentarios propios
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

export const GET = withPermission(PERMISSION.STUDENTS_LIST, getStudentsListQueryHandler)