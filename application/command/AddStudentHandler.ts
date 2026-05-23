import pool from '../../lib/db';

export class AddStudentHandler {
    async handle(command: AddStudentCommand): Promise<void> {
        // Guardar el estudiante en Supabase DB
        const role = 'Estudiante'; // Por defecto, es estudiante si pasa por este handler

        try {
            await pool.query(
                `INSERT INTO public.users (clerk_id, first_name, last_name, email, role) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (email) DO UPDATE SET 
                   clerk_id = EXCLUDED.clerk_id,
                   first_name = EXCLUDED.first_name,
                   last_name = EXCLUDED.last_name,
                   role = EXCLUDED.role;`,
                [command.clerkId, command.firstName, command.lastName, command.email, role]
            );
            console.log(`[AddStudentHandler] Estudiante guardado en Supabase: ${command.email}`);
        } catch (error) {
            console.error('[AddStudentHandler] Error al guardar en Supabase:', error);
            throw error; // Lanzar para que el webhook de Clerk reintente o registre el fallo
        }
    }
}

export interface AddStudentCommand {
    clerkId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
}
