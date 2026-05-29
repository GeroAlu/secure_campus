import { NextRequest, NextResponse } from 'next/server'
import { AddMessageHandler, AddMessageCommand } from '@/application/command/AddMessageHandler'
import { chatMessageSchema } from '@/lib/validation'

const addMessageCommandHandler = async (request: NextRequest): Promise<NextResponse> => {
    try {
        const handler = new AddMessageHandler()
        
        const body = await request.json()
        const parsed = chatMessageSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Mensaje inválido", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }
        
        const command: AddMessageCommand = { message: parsed.data.message }
        const response = await handler.handle(command)

        return NextResponse.json(response)
    } catch (error) {
        console.error("Error procesando el mensaje:", error)
        return NextResponse.json(
            { error: "Ocurrió un error al procesar la solicitud" },
            { status: 500 }
        )
    }
}

export const POST = addMessageCommandHandler