export class AddStudentHandler {
    async handle(command: AddStudentCommand): Promise<void> {
        // En esta versión, los estudiantes se obtienen directamente de Clerk
        // por lo que no es necesario guardar en una lista en memoria o base de datos local aún.
        // Se mantiene el handler por si en el futuro se desea persistir en Prisma u otra BD.
    }
}

export interface AddStudentCommand {
    clerkId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
}
