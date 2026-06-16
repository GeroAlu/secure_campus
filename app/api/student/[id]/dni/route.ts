import { NextRequest, NextResponse } from 'next/server'
import { withPermission, UserInfo } from '@/app/lib/withPermission'
import { GetStudentDniHandler } from '@/application/query/GetStudentDniHandler'
import { PERMISSION } from '@/domain/identity/permissions'

const getStudentDniHandler = async (
    request: NextRequest,
    _userInfo: UserInfo,
    context: unknown
): Promise<NextResponse> => {
    const typedContext = context as { params: Promise<{ id: string }> }
    const params = await typedContext?.params
    const id = params?.id
    if (!id) {
        return NextResponse.json({ error: 'ID de estudiante requerido.' }, { status: 400 })
    }

    try {
        const handler = new GetStudentDniHandler()
        const response = await handler.handle({ studentId: id })

        if (!response.dni) {
            return NextResponse.json({ error: 'Estudiante no encontrado o DNI no configurado.' }, { status: 404 })
        }

        return NextResponse.json({ dni: response.dni })
    } catch (error) {
        console.error('Error in GET /api/student/[id]/dni:', error)
        return NextResponse.json(
            { error: 'Ocurrió un error al procesar la solicitud.' },
            { status: 500 }
        )
    }
}

export const GET = withPermission(PERMISSION.STUDENT_DNI_VIEW, getStudentDniHandler)
