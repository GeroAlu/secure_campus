import { NextRequest, NextResponse } from 'next/server'
import { withPermission, UserInfo } from '@/app/lib/withPermission'
import { SetStudentActiveHandler } from '@/application/command/SetStudentActiveHandler'
import { PERMISSION } from '@/domain/identity/permissions'
import { setStudentActiveSchema } from '@/lib/validation'

const patchStudentActiveHandler = async (
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
        const parsed = setStudentActiveSchema.safeParse({ studentId: id, active: body.active })
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Parámetros inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const handler = new SetStudentActiveHandler()
        await handler.handle({ studentId: parsed.data.studentId, active: parsed.data.active })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in PATCH /api/student/[id]/active:', error)
        return NextResponse.json(
            { error: 'Ocurrió un error al procesar la solicitud.' },
            { status: 500 }
        )
    }
}

export const PATCH = withPermission(PERMISSION.STUDENT_DEACTIVATE, patchStudentActiveHandler)
