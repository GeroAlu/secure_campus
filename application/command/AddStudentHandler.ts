import { HARDCODED_LIST } from "../query/GetStudentsListHandler"

export class AddStudentHandler {
    async handle(command: AddStudentCommand): Promise<void> {
        // Guardamos en la variable en memoria.
        const newId = HARDCODED_LIST.length > 0 ? Math.max(...HARDCODED_LIST.map((s: { id: number }) => s.id)) + 1 : 1;
        
        HARDCODED_LIST.push({
            id: newId,
            name: `${command.firstName || ''} ${command.lastName || ''}`.trim() || 'Nuevo Estudiante',
            email: command.email,
            active: true
        })
    }
}

export interface AddStudentCommand {
    clerkId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
}
