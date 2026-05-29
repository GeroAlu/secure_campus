import pool, { getEncryptionKey } from '../../lib/db';
import { addStudentSchema } from '../../lib/validation';

export class AddStudentHandler {
    async handle(command: AddStudentCommand): Promise<void> {
        const parsed = addStudentSchema.safeParse(command);
        if (!parsed.success) {
            throw new Error(`Invalid student data: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
        }

        const role = 'Estudiante';
        const key = getEncryptionKey();

        try {
            await pool.query(
                `INSERT INTO public.users (clerk_id, clerk_id_hash, first_name, last_name, email, email_hash, role) 
                 VALUES (
                   pgp_sym_encrypt($1::text, $6::text),
                   encode(digest($1::text, 'sha256'), 'hex'),
                   $2, $3,
                   pgp_sym_encrypt($4::text, $6::text),
                   encode(digest($4::text, 'sha256'), 'hex'),
                   $5
                 )
                 ON CONFLICT (email_hash) DO UPDATE SET 
                   clerk_id = pgp_sym_encrypt($1::text, $6::text),
                   clerk_id_hash = encode(digest($1::text, 'sha256'), 'hex'),
                   first_name = $2,
                   last_name = $3,
                   email = pgp_sym_encrypt($4::text, $6::text),
                   email_hash = encode(digest($4::text, 'sha256'), 'hex'),
                   role = $5;`,
                [parsed.data.clerkId, parsed.data.firstName, parsed.data.lastName, parsed.data.email, role, key]
            );
            console.log(`[AddStudentHandler] Estudiante guardado en Supabase: ${parsed.data.email}`);
        } catch (error) {
            console.error('[AddStudentHandler] Error al guardar en Supabase:', error);
            throw error;
        }
    }
}

export interface AddStudentCommand {
    clerkId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
}
