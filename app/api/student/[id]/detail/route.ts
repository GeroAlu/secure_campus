import { NextRequest, NextResponse } from 'next/server'
import { withPermission, UserInfo } from '@/app/lib/withPermission'
import { UpdateStudentDetailHandler } from '@/application/command/UpdateStudentDetailHandler'
import { PERMISSION } from '@/domain/identity/permissions'
import { updateStudentDetailSchema } from '@/lib/validation'

const patchStudentDetailHandler = async (
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
        const body = await request.json()
        const parsed = updateStudentDetailSchema.safeParse({ studentId: id, detail: body.detail })
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Parámetros inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const handler = new UpdateStudentDetailHandler()
        await handler.handle({ studentId: parsed.data.studentId, detail: parsed.data.detail })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in PATCH /api/student/[id]/detail:', error)
        return NextResponse.json(
            { error: 'Ocurrió un error al procesar la solicitud.' },
            { status: 500 }
        )
    }
}

export const PATCH = withPermission(PERMISSION.STUDENT_DETAIL_EDIT, patchStudentDetailHandler)
