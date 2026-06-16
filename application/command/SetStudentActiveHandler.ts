import pool from '../../lib/db';
import { setStudentActiveSchema } from '../../lib/validation';

export class SetStudentActiveHandler {
    async handle(command: { studentId: string; active: boolean }): Promise<void> {
        const parsed = setStudentActiveSchema.safeParse(command);
        if (!parsed.success) {
            throw new Error(`Datos inválidos para actualizar estado activo: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
        }

        const { studentId, active } = parsed.data;

        // Soporta búsqueda por id o clerk_id_hash encriptado
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
        if (isUuid) {
            await pool.query(
                `UPDATE public.users SET active = $1 WHERE id = $2::uuid`,
                [active, studentId]
            );
        } else {
            await pool.query(
                `UPDATE public.users SET active = $1 WHERE clerk_id_hash = encode(digest($2::text, 'sha256'), 'hex')`,
                [active, studentId]
            );
        }
    }
}
